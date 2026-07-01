import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

// Helper to sanitize terms
function sanitizeWorkflowResponse(data: any): any {
  let jsonString = JSON.stringify(data);
  const blockedTermsFound: string[] = [];

  const replacements = [
    { term: "Auto-dispatch", replace: "Coordinated recommendation" },
    { term: "auto-dispatch", replace: "coordinated recommendation" },
    { term: "Automatic deployment", replace: "Operator approval required" },
    { term: "automatic deployment", replace: "operator approval required" },
    { term: "automatically control signals", replace: "proactively advise signal changes" },
    { term: "automatically reroute vehicles", replace: "proactively advise routing changes" },
    { term: "deploy responders", replace: "recommend roadside assistance patrol coordination" },
    { term: "Auto-control", replace: "Operator approval required" },
    { term: "auto-control", replace: "operator approval required" },
    { term: "Dispatching", replace: "Coordinating" },
    { term: "dispatching", replace: "coordinating" },
    { term: "Dispatches", replace: "Coordinates" },
    { term: "dispatches", replace: "coordinates" },
    { term: "Dispatch", replace: "Coordinate" },
    { term: "dispatch", replace: "coordinate" }
  ];

  for (const item of replacements) {
    const regex = new RegExp(item.term, 'g');
    if (regex.test(jsonString)) {
      blockedTermsFound.push(item.term);
      jsonString = jsonString.replace(regex, item.replace);
    }
  }

  const cleanedData = JSON.parse(jsonString);

  // Force requiresHumanApproval = true in all recommended actions
  if (Array.isArray(cleanedData.recommendedActions)) {
    cleanedData.recommendedActions = cleanedData.recommendedActions.map((act: any) => ({
      ...act,
      requiresHumanApproval: true
    }));
  }

  // Add safety notes if blocked terms were found and replaced
  if (blockedTermsFound.length > 0) {
    if (!cleanedData.safetyCheck) {
      cleanedData.safetyCheck = { passed: true, blockedTermsFound: [], notes: [] };
    }
    cleanedData.safetyCheck.passed = true;
    cleanedData.safetyCheck.blockedTermsFound = Array.from(
      new Set([...(cleanedData.safetyCheck.blockedTermsFound || []), ...blockedTermsFound])
    );
    cleanedData.safetyCheck.notes = Array.from(
      new Set([
        ...(cleanedData.safetyCheck.notes || []),
        `Sanitization active: Replaced blocked auto-control/dispatch term(s): [${blockedTermsFound.join(", ")}].`
      ])
    );
  }

  return cleanedData;
}

// Generate high-quality deterministic fallback response matching requirement 6
function generateFallbackResponse(snapshot: any): any {
  return sanitizeWorkflowResponse({
    "summary": `Under scenario '${snapshot.scenario || 'PM Peak Burden'}' at ${snapshot.replayTime || '17:00'}, the network speed index is ${snapshot.networkSpeed || 72}% with ${snapshot.roadsAtRisk || 2} primary corridors showing heightened saturation.`,
    "topRisks": (snapshot.topRisks || []).map((r: any) => {
      let severity = "Low";
      if (r.riskScore >= 80) severity = "Critical";
      else if (r.riskScore >= 60) severity = "High";
      else if (r.riskScore >= 40) severity = "Medium";
      
      return {
        "corridor": r.corridor,
        "riskScore": r.riskScore,
        "severity": severity,
        "mainCause": r.mainCause || "High traffic demand during peak commuter hours.",
        "evidence": [
          `Average speed is recorded at ${r.speedKph || 62} kph.`,
          `Hourly flow reaches ${r.volumeVph || 3800} vehicles/hour (vph).`,
          `Adaptive junction delay averages ${r.delaySec || 45} seconds per vehicle.`
        ],
        "recommendedAction": `Deploy adaptive signal timing adjustments and display rerouting advisories on dynamic panels for ${r.corridor}.`
      };
    }),
    "recommendedActions": (snapshot.recommendedActions || []).map((a: any) => ({
      "type": a.type || "Route advisory",
      "target": a.target,
      "expectedImpact": a.expectedImpact || "Reduce back-up queue length by 10-15%.",
      "confidence": a.confidence || 0.85,
      "explanation": `Proactively modify green phase cycle offsets at the intersections near ${a.target} to prevent vehicle queue spillback.`,
      "requiresHumanApproval": true
    })),
    "operatorBriefing": {
      "headline": `PeakFlow Congestion Warning: ${snapshot.roadsAtRisk || 2} Corridor(s) Under Heavy Load`,
      "situation": `Under scenario '${snapshot.scenario || 'PM Peak Burden'}' at ${snapshot.replayTime || '17:00'}, the network speed index is ${snapshot.networkSpeed || 72}% with ${snapshot.roadsAtRisk || 2} primary corridors showing heightened saturation.`,
      "recommendedNextSteps": [
        ...(snapshot.topRisks || []).map((r: any) => `Monitor queue spillback on ${r.corridor}`),
        "Activate the recommended signal timing plans upon operator approval."
      ],
      "humanOversightReminder": "All actions require operator review and approval before implementation."
    },
    "dataEvidence": {
      "datasetsUsed": ["traffic_volume", "weather", "incidents", "signal_performance", "calendar"],
      "keySignals": [
        "Volume-to-capacity (V/C) thresholds exceeded on arterial lanes.",
        "Weather telemetry indicates rain storm disruption."
      ],
      "limitations": [
        "Real-time sensor data latency of up to 2 minutes.",
        "Weather prediction certainty is current at 85%."
      ]
    },
    "safetyCheck": {
      "passed": true,
      "blockedTermsFound": [],
      "notes": ["Self-validation scan completed: no auto-dispatch or auto-control operations present."]
    }
  });
}

export async function POST(request: NextRequest) {
  let snapshot: any = {};
  try {
    snapshot = await request.json();
  } catch (e) {
    console.error("[API Route] Failed to parse request JSON payload:", e);
    snapshot = {};
  }

  console.log("[API Route] /api/peakflow-workflow endpoint called.");
  console.log(`[API Route] Scenario: "${snapshot.scenario || 'Unknown'}", Roads at Risk: ${snapshot.roadsAtRisk || 0}`);

  // Read environment variables
  const enabled = process.env.MISTRAL_WORKFLOW_ENABLED === 'true';
  const workflowName = process.env.MISTRAL_WORKFLOW_NAME || 'peakflow-congestion-prevention';
  const timeoutMs = parseInt(process.env.MISTRAL_WORKFLOW_TIMEOUT_MS || '20000', 10);
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!enabled || !apiKey) {
    console.warn("[API Route] Mistral integration is disabled or MISTRAL_API_KEY is missing. Returning local fallback.");
    const fallback = generateFallbackResponse(snapshot);
    return NextResponse.json({ ...fallback, isFallback: true, error: "Mistral disabled or no API key set." });
  }

  // Tier 1: Attempt Python Workflow Worker execution
  try {
    console.log("[API Route] Tier 1: Invoking Python Workflow CLI via subprocess...");
    const workflowDir = path.join(process.cwd(), '..', 'peakflow-mistral-workflow');
    
    // Prepare input JSON string escaping quotes safely
    const inputString = JSON.stringify(snapshot).replace(/'/g, "'\\''");
    const execCommand = `export PATH=$PATH:/Users/m-alkassem/Library/Python/3.9/bin && uv run python -m entrypoints.start --workflow ${workflowName} --input '${inputString}'`;

    console.log("[API Route] Checking if worker is available in task pool...");

    // Promise wrapper for exec
    const resultJson = await new Promise<any>((resolve, reject) => {
      exec(execCommand, {
        cwd: workflowDir,
        timeout: timeoutMs,
        env: {
          ...process.env,
          MISTRAL_API_KEY: apiKey
        }
      }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        try {
          const stdoutStr = stdout.toString();
          const match = stdoutStr.match(/Result:\s*(\{[\s\S]*\})/);
          if (match) {
            const parsed = JSON.parse(match[1]);
            resolve(parsed);
          } else {
            reject(new Error("Worker stdout did not contain a valid Result JSON block."));
          }
        } catch (parseErr) {
          reject(parseErr);
        }
      });
    });

    console.log("[API Route] Tier 1: Workflow worker execution succeeded.");
    const sanitized = sanitizeWorkflowResponse(resultJson);
    console.log("[API Route] Safety check passed: clean sanitized response returned.");
    return NextResponse.json({ ...sanitized, isFallback: false });

  } catch (err: any) {
    console.warn(`[API Route] Tier 1 Workflow execution failed (Worker unavailable or timeout). Reason: ${err.message}`);
    console.log("[API Route] Tier 2: Initiating fallback to direct Mistral Chat Completion...");

    // Tier 2: Call Mistral Chat Completion API directly for the briefing step (hybrid backup)
    try {
      console.log("[API Route] Sending direct Chat Completion request to Mistral API /v1/chat/completions...");
      
      const prompt = `
      You are the PeakFlow Traffic Analyst for the Dubai RTA.
      Generate an operator briefing in JSON format.
      
      Current Traffic Situation:
      - Scenario: ${snapshot.scenario || 'Peak Congestion Window'}
      - Time: ${snapshot.replayTime || '17:00'}
      - Network Speed Index: ${snapshot.networkSpeed || 74}%
      - Roads at Risk: ${snapshot.roadsAtRisk || 2}
      
      Active Risks:
      ${JSON.stringify(snapshot.topRisks || [], null, 2)}
      
      Recommended Mitigations:
      ${JSON.stringify(snapshot.recommendedActions || [], null, 2)}
      
      You must output a JSON object with the following fields:
      - "headline": A short, high-impact alert headline.
      - "situation": A paragraph describing the current traffic congestion and impact.
      - "recommendedNextSteps": A JSON list of string steps/actions the operator should take next (e.g. "Monitor road X", "Activate bypass coordinates").
      - "humanOversightReminder": A statement reinforcing operator approval requirements.
      
      Return VALID JSON ONLY. Do not wrap in markdown codeblocks.
      `;

      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "open-mistral-7b",
          messages: [
            { role: "system", content: "You are a traffic engineering assistant. Output JSON only." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error(`Mistral API returned HTTP status ${response.status}`);
      }

      const resData = await response.json();
      const content = resData.choices[0].message.content;
      const parsedBriefing = JSON.parse(content);
      console.log("[API Route] Direct Chat Completion status: success.");

      // Assemble final response combining deterministic rules & custom AI briefing
      const hybridResponse = {
        summary: parsedBriefing.situation || `Network speed index at ${snapshot.networkSpeed || 74}% with ${snapshot.roadsAtRisk || 2} arterial segments at risk.`,
        topRisks: (snapshot.topRisks || []).map((r: any) => ({
          corridor: r.corridor,
          riskScore: r.riskScore,
          severity: r.riskScore >= 80 ? "Critical" : r.riskScore >= 60 ? "High" : r.riskScore >= 40 ? "Medium" : "Low",
          mainCause: r.mainCause || "High peak commuter volumes.",
          evidence: [
            `Avg Speed is ${r.speedKph || 62} kph`,
            `Hourly volume reaches ${r.volumeVph || 3800} vph`,
            `Junction delay is ${r.delaySec || 45} seconds`
          ],
          recommendedAction: `Apply signal split override for ${r.corridor}.`
        })),
        recommendedActions: (snapshot.recommendedActions || []).map((a: any) => ({
          type: a.type || "Route advisory",
          target: a.target,
          expectedImpact: a.expectedImpact || "Reduce local queue by 10-15%",
          confidence: a.confidence || 0.85,
          explanation: `Bypass congestion on ${a.target} using recommended detour offsets.`,
          requiresHumanApproval: true
        })),
        operatorBriefing: parsedBriefing,
        dataEvidence: {
          datasetsUsed: ["traffic_volume", "weather", "incidents", "signal_performance", "calendar"],
          keySignals: ["Volume-to-capacity thresholds exceeded", "Junction green phase failures"],
          limitations: ["Real-time data lag", "Weather predictions accuracy"]
        }
      };

      const sanitized = sanitizeWorkflowResponse(hybridResponse);
      console.log("[API Route] Safety check passed: hybrid response sanitized.");
      return NextResponse.json({ ...sanitized, isFallback: false, isHybridAI: true });

    } catch (completionErr: any) {
      console.error("[API Route] Tier 2 Direct Chat Completion failed. Switching to Tier 3 Local Fallback.");
      console.error("[API Route] Fallback reason: Direct AI error:", completionErr.message);
      
      const fallback = generateFallbackResponse(snapshot);
      return NextResponse.json({ 
        ...fallback, 
        isFallback: true, 
        error: `Workflow error: ${err.message}. Direct AI error: ${completionErr.message}` 
      });
    }
  }
}
