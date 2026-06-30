import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Resilient manual env parser to bypass Next.js hot-reload env caching limitations
const getEnvVariable = (key: string): string | undefined => {
  if (process.env[key]) {
    const val = process.env[key]?.trim();
    if (val && val !== 'undefined') return val;
  }
  try {
    let envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      envPath = path.join(process.cwd(), 'rta-peakflow-copilot', '.env.local');
    }
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const [k, ...vParts] = trimmed.split('=');
        if (k.trim() === key) {
          const val = vParts.join('=').trim();
          if (val && val !== 'undefined') return val;
        }
      }
    }
  } catch (err) {
    console.error('Error manually reading .env.local:', err);
  }
  return undefined;
};

// 2. Dedicated normalizeForecastWindow function
function normalizeForecastWindow(value: any): string {
  const text = String(value || "30–60 minutes");

  if (/3060/i.test(text)) return "30–60 minutes";
  if (/30\s*60/i.test(text)) return "30–60 minutes";
  if (/30\s*[-–—]\s*60/i.test(text)) return "30–60 minutes";

  return text;
}

export async function POST(request: NextRequest) {
  let selectedPath = 'Fallback';
  let agentCalled = false;
  let parseSucceeded = false;
  let fallbackReason = '';

  try {
    const body = await request.json();

    // Normalize request body
    const normalized = {
      location: body.location ?? body.hotspot?.locationName ?? body.hotspot?.location_name ?? body.locationName ?? "Selected corridor",
      risk_score: body.risk_score ?? body.riskScore ?? body.hotspot?.riskScore ?? body.hotspot?.risk_score ?? 0,
      risk_level: body.risk_level ?? body.riskLevel ?? body.hotspot?.riskLevel ?? body.hotspot?.risk_level ?? "Unknown",
      forecast_window: body.forecast_window ?? body.forecastWindow ?? "30–60 minutes",
      causes: body.causes ?? body.hotspot?.causes ?? body.hotspot?.causeTags ?? [],
      recommended_action: body.recommended_action ?? body.recommendedAction ?? body.bestAction ?? "Monitor conditions",
      human_approval_required: body.human_approval_required ?? true,
      avg_speed_kph: body.avg_speed_kph ?? body.hotspot?.avg_speed_kph ?? body.hotspot?.avgSpeed ?? null,
      vc_ratio: body.vc_ratio ?? body.hotspot?.vc_ratio ?? body.hotspot?.vcRatio ?? null,
      travel_time_index: body.travel_time_index ?? body.hotspot?.travel_time_index ?? body.hotspot?.travelTimeIndex ?? null,
      junction_performance: body.junction_performance ?? body.hotspot?.junction_performance ?? null
    };

    const apiKey = getEnvVariable('MISTRAL_API_KEY');
    const agentId = getEnvVariable('MISTRAL_AGENT_ID');
    const agentVersion = getEnvVariable('MISTRAL_AGENT_VERSION') || "0";

    // 1. Create sanitizeFinalBrief that runs AFTER parsing Mistral and BEFORE returning response
    const sanitizeFinalBrief = (brief: any, norm: any) => {
      const forecastWindow = normalizeForecastWindow(norm.forecast_window || "30–60 minutes");

      const cleanText = (txt: string): string => {
        if (!txt) return '';
        // 3. Sanitize every returned string using strict rules
        let clean = txt
          .replace(/3060\s*minutes/gi, "30–60 minutes")
          .replace(/30\s*60\s*minutes/gi, "30–60 minutes")
          .replace(/30\s*[-–—]\s*60\s*minutes/gi, "30–60 minutes")
          .replace(/\*\*/g, '')
          .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2600-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '')
          .trim();

        // Safety replacement for phone instructions
        clean = clean
          .replace(/Check app while driving/gi, 'Follow official road signs and navigation guidance.')
          .replace(/Message drivers/gi, 'Follow official road signs and navigation guidance.')
          .replace(/Send SMS/gi, 'Follow official road signs and navigation guidance.')
          .replace(/Phone notification/gi, 'Follow official road signs and navigation guidance.');

        // 4. Remove dramatic wording
        clean = clean.replace(/imminent gridlock/gi, 'critical congestion risk');
        if (norm.risk_score < 95) {
          clean = clean.replace(/gridlock/gi, 'congestion delays');
        }

        return clean;
      };

      // 4. Force finalBrief.recommendedAction = normalized.recommended_action
      const recommendedAction = cleanText(norm.recommended_action);

      // 5. Force finalBrief.humanApprovalNote
      const humanApprovalNote = "Human approval is required before publishing to official roadside advisory channels.";

      // 9. Public advisory: Keep under 160 characters. No SMS. No phone. Use safe template.
      let publicAdvisory = `RTA Alert: Delays expected at ${norm.location}. Follow official road signs and navigation guidance.`;
      if (publicAdvisory.length > 157) {
        publicAdvisory = publicAdvisory.substring(0, 157) + '...';
      }

      // Clean explanation
      let causeExplanation = cleanText(brief.causeExplanation || '');
      const causesStr = norm.causes && norm.causes.length > 0 ? norm.causes.join(', ') : 'typical peak commute flow limits';
      const hasMultiple = norm.causes && norm.causes.length > 1;
      const targetCausePhrase = hasMultiple 
        ? `This congestion pressure is primarily driven by: ${causesStr}.`
        : `This congestion pressure is primarily driven by ${causesStr}.`;

      if (causeExplanation.toLowerCase().includes('primarily driven by') || !causeExplanation) {
        causeExplanation = targetCausePhrase;
      } else {
        causeExplanation = causeExplanation
          .replace(/This congestion delays is primarily driven by active triggers:\s*/gi, hasMultiple ? "This congestion pressure is primarily driven by: " : "This congestion pressure is primarily driven by ")
          .replace(/This critical congestion risk is primarily driven by active triggers:\s*/gi, hasMultiple ? "This congestion pressure is primarily driven by: " : "This congestion pressure is primarily driven by ")
          .replace(/This imminent gridlock is primarily driven by active triggers:\s*/gi, hasMultiple ? "This congestion pressure is primarily driven by: " : "This congestion pressure is primarily driven by ");
      }

      // 1. ALWAYS override finalBrief.situationSummary with deterministic backend text
      const riskScore = Number(norm.risk_score || 0);
      const riskWording =
        riskScore >= 80 ? "critical congestion risk" :
        riskScore >= 60 ? "high congestion risk" :
        riskScore >= 40 ? "moderate congestion pressure" :
        "low congestion pressure";

      const situationSummary = `Congestion pressure is rising at ${norm.location}. Current Risk Score is ${riskScore}/100, indicating ${riskWording} for the next ${forecastWindow}.`;

      const finalBrief = {
        situationSummary,
        causeExplanation,
        recommendedAction,
        publicAdvisory,
        humanApprovalNote
      };

      // 10. Test log in development
      if (process.env.NODE_ENV !== 'production') {
        console.log("Final sanitized briefing:", finalBrief);
      }

      return finalBrief;
    };

    // Helper to safely extract balanced JSON block from free-form text
    const extractBalancedJson = (text: string): string => {
      const trimmed = text.trim();
      const firstBrace = trimmed.indexOf('{');
      if (firstBrace === -1) {
        throw new Error('No opening JSON brace found in output.');
      }
      let braceCount = 0;
      for (let i = firstBrace; i < trimmed.length; i++) {
        if (trimmed[i] === '{') braceCount++;
        if (trimmed[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            return trimmed.substring(firstBrace, i + 1);
          }
        }
      }
      throw new Error('Unbalanced JSON braces in output.');
    };

    // Helper to safely parse and normalize any JSON block into flat string outputs with wording rules
    const cleanAndNormalizeBrief = (jsonText: string) => {
      const extracted = extractBalancedJson(jsonText);
      const brief = JSON.parse(extracted);

      const cleanWording = (txt: string) => {
        if (!txt) return '';
        let clean = txt
          .replace(/30\s*[-–—]\s*60\s*minutes/gi, '30–60 minutes')
          .replace(/\*\*/g, '')
          .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2600-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '')
          .trim();

        // Safety replacement for phone instructions
        clean = clean
          .replace(/Check app while driving/gi, 'Follow official road signs and navigation guidance.')
          .replace(/Message drivers/gi, 'Follow official road signs and navigation guidance.')
          .replace(/Send SMS/gi, 'Follow official road signs and navigation guidance.')
          .replace(/Phone notification/gi, 'Follow official road signs and navigation guidance.');

        // Gridlock demotion logic
        if (normalized.risk_score < 95) {
          clean = clean.replace(/imminent gridlock/gi, 'critical congestion risk');
          clean = clean.replace(/gridlock/gi, 'congestion delays');
        }

        return clean;
      };

      // Enforce max 160 characters on publicAdvisory
      let publicAdvisory = typeof brief.publicAdvisory === 'object' 
        ? (brief.publicAdvisory?.advisory ?? JSON.stringify(brief.publicAdvisory)) 
        : String(brief.publicAdvisory || '');
      publicAdvisory = cleanWording(publicAdvisory);
      if (publicAdvisory.length > 157) {
        publicAdvisory = publicAdvisory.substring(0, 157) + '...';
      }

      // Convert nested recommendedAction object into plain string
      let recommendedAction = '';
      if (typeof brief.recommendedAction === 'object') {
        recommendedAction = brief.recommendedAction?.action ?? brief.recommendedAction?.recommendation ?? JSON.stringify(brief.recommendedAction);
      } else {
        recommendedAction = String(brief.recommendedAction || normalized.recommended_action);
      }
      recommendedAction = cleanWording(recommendedAction);

      return {
        situationSummary: cleanWording(typeof brief.situationSummary === 'object' ? (brief.situationSummary?.summary ?? JSON.stringify(brief.situationSummary)) : String(brief.situationSummary || '')),
        causeExplanation: cleanWording(typeof brief.causeExplanation === 'object' ? (brief.causeExplanation?.explanation ?? JSON.stringify(brief.causeExplanation)) : String(brief.causeExplanation || '')),
        recommendedAction,
        publicAdvisory,
        humanApprovalNote: cleanWording(typeof brief.humanApprovalNote === 'object' ? JSON.stringify(brief.humanApprovalNote) : String(brief.humanApprovalNote || 'This recommendation requires human approval before publishing to official roadside advisory channels.'))
      };
    };

    // 1. If API key AND Agent ID exist, call Conversations API (Mistral Studio Agent)
    if (apiKey && agentId) {
      selectedPath = 'Mistral Studio Agent';
      agentCalled = true;
      try {
        const payload = {
          "agent_id": agentId,
          "agent_version": Number(agentVersion),
          "inputs": [
            {
              "role": "user",
              "content": JSON.stringify({
                location: normalized.location,
                risk_score: normalized.risk_score,
                risk_level: normalized.risk_level,
                forecast_window: normalized.forecast_window,
                causes: normalized.causes,
                recommended_action: normalized.recommended_action,
                human_approval_required: normalized.human_approval_required,
                avg_speed_kph: normalized.avg_speed_kph,
                vc_ratio: normalized.vc_ratio,
                travel_time_index: normalized.travel_time_index
              }) + `\nReturn ONLY valid JSON matching this schema: {"situationSummary": "A concise 2-sentence summary of the traffic state using only provided metrics.", "causeExplanation": "An explanation of the congestion causes based strictly on the active triggers.", "recommendedAction": "${normalized.recommended_action}", "publicAdvisory": "Max 160 characters plain text warning suitable for roadside signs.", "humanApprovalNote": "This recommendation requires human approval before publishing to official roadside advisory channels."}. No markdown, no headings, no code fences, no explanation.`
            }
          ],
          "completion_args": {
            "temperature": 0.2,
            "max_tokens": 450
          }
        };

        let response = await fetch('https://api.mistral.ai/v1/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        });

        // Graceful retry: If completion_args triggers a validation error (status 400 or 422), strip and retry
        if (!response.ok && (response.status === 400 || response.status === 422)) {
          const retryPayload = { ...payload } as any;
          delete retryPayload.completion_args;
          response = await fetch('https://api.mistral.ai/v1/conversations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(retryPayload)
          });
        }

        if (response.ok) {
          const result = await response.json();
          const assistantText = result.outputs?.[0]?.content?.trim() || "";
          if (assistantText) {
            try {
              const formattedBrief = cleanAndNormalizeBrief(assistantText);
              const sanitizedBrief = sanitizeFinalBrief(formattedBrief, normalized);
              parseSucceeded = true;
              return NextResponse.json({
                ...sanitizedBrief,
                model: 'Mistral Studio Agent',
                ...(process.env.NODE_ENV !== 'production' && {
                  debugPath: { selectedPath, agentCalled, parseSucceeded, fallbackReason }
                })
              });
            } catch (parseErr: any) {
              console.error('Failed to parse Mistral Agent JSON response:', parseErr);
              fallbackReason = 'Agent JSON parsing failed: ' + parseErr.message;
            }
          } else {
            fallbackReason = 'Agent conversations output is empty';
          }
        } else {
          const bodyErr = await response.text();
          fallbackReason = `Agent Conversations endpoint failed with status ${response.status}: ${bodyErr}`;
        }
      } catch (agentErr: any) {
        console.error('Mistral Agent API connection error:', agentErr);
        fallbackReason = 'Agent API connection exception: ' + agentErr.message;
      }
    }

    // 2. If API Key exists but Agent ID is missing, call Chat Completions API
    if (apiKey) {
      if (selectedPath === 'Fallback') {
        selectedPath = 'Mistral AI API';
      }
      try {
        const prompt = `
You are the RTA PeakFlow Copilot AI agent, helping a human RTA traffic command-center operator mitigate congestion in Dubai.
A human operator is currently monitoring:
- Location: ${normalized.location}
- Forecast Window: ${normalized.forecast_window}
- Telemetry: 
  * Speed: ${normalized.avg_speed_kph !== null ? `${normalized.avg_speed_kph} kph` : 'Not provided'}
  * V/C Ratio: ${normalized.vc_ratio !== null ? normalized.vc_ratio : 'Not provided'}
  * Travel Time Index: ${normalized.travel_time_index !== null ? normalized.travel_time_index : 'Not provided'}
- Current Congestion Pressure Score: ${normalized.risk_score}/100 (Risk Level: ${normalized.risk_level})
- Active Triggers/Causes: ${normalized.causes.join(', ')}
- Recommended Action: ${normalized.recommended_action}

IMPORTANT RULES:
1. You must use ONLY the provided facts. Do not invent road names, road codes, station names, dynamic lane controls, or public transport options unless explicitly included in the active input above.
2. The recommendedAction field MUST be exactly: "${normalized.recommended_action}". Do not replace "Monitor conditions" with another action, and do not invent actions.
3. Do not recommend signal timing unless Recommended Action includes "signal timing".
4. Do not recommend Metro unless Recommended Action includes "Metro".
5. Do not recommend route diversion unless Recommended Action includes "route advisory" or "Route advisory".
6. Do not include markdown bold (**), headers (##), emojis, bullet points, nested objects, or long paragraphs in any text field.
7. SAFETY RULES:
   * Do not imply that the system sends phone messages or SMS to drivers.
   * Do not encourage drivers to check phones while driving.
   * Public-facing text (publicAdvisory) must be suitable for roadside signs, navigation systems, or official pre-trip channels.
   * Keep the advisory short and safe.
   * Avoid terms like "Check app while driving", "Message drivers", "Send SMS", or "Phone notification". Use "Follow official road signs and navigation guidance." instead.
8. Return strictly a JSON object with this shape:
{
  "situationSummary": "A concise 2-sentence summary of the traffic state using only provided metrics.",
  "causeExplanation": "An explanation of the congestion causes based strictly on the active triggers.",
  "recommendedAction": "${normalized.recommended_action}",
  "publicAdvisory": "Max 160 characters plain text warning suitable for roadside signs. Example: 'RTA Alert: Delays expected at Al Garhoud Bridge. Consider Business Bay Crossing. Follow official road signs and navigation guidance.'",
  "humanApprovalNote": "This recommendation requires human approval before publishing to official roadside advisory channels."
}
Return only raw JSON. Do not write markdown markers or any text before or after the JSON.
`;

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'open-mistral-7b',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.1
          })
        });

        if (response.ok) {
          const result = await response.json();
          const jsonText = result.choices[0].message.content.trim();
          try {
            const formattedBrief = cleanAndNormalizeBrief(jsonText);
            const sanitizedBrief = sanitizeFinalBrief(formattedBrief, normalized);
            parseSucceeded = true;
            return NextResponse.json({
              ...sanitizedBrief,
              model: 'Mistral AI API',
              ...(process.env.NODE_ENV !== 'production' && {
                debugPath: { selectedPath, agentCalled, parseSucceeded, fallbackReason }
              })
            });
          } catch (jsonErr: any) {
            console.error('Failed to parse Mistral completions response, falling back:', jsonErr);
            fallbackReason = (fallbackReason ? fallbackReason + ' | ' : '') + 'Completions JSON parsing failed: ' + jsonErr.message;
          }
        } else {
          fallbackReason = (fallbackReason ? fallbackReason + ' | ' : '') + `Completions API endpoint failed with status ${response.status}`;
        }
      } catch (chatErr: any) {
        console.error('Mistral Direct API connection error, falling back:', chatErr);
        fallbackReason = (fallbackReason ? fallbackReason + ' | ' : '') + 'Completions API exception: ' + chatErr.message;
      }
    }

    // 3. Fallback to smart deterministic mock
    selectedPath = 'Smart Fallback';
    const brief = generateMockBriefing(normalized);
    const sanitizedBrief = sanitizeFinalBrief(brief, normalized);
    return NextResponse.json({
      ...sanitizedBrief,
      model: 'Smart Fallback',
      ...(process.env.NODE_ENV !== 'production' && {
        debugPath: { selectedPath, agentCalled, parseSucceeded, fallbackReason }
      })
    });

  } catch (error: any) {
    console.error('API Error in briefing generator:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate briefing: ' + error.message,
        ...(process.env.NODE_ENV !== 'production' && {
          debugPath: { selectedPath, agentCalled, parseSucceeded, fallbackReason: error.message }
        })
      },
      { status: 500 }
    );
  }
}

function generateMockBriefing(normalized: any) {
  const locName = normalized.location;
  const riskVal = normalized.risk_score;
  const causesList = normalized.causes && normalized.causes.length > 0 ? normalized.causes.join(', ') : '';
  const recAction = normalized.recommended_action;
  const windowStr = normalized.forecast_window.replace(/3060 minutes/g, '30–60 minutes');

  const speedStr = normalized.avg_speed_kph !== null ? `${normalized.avg_speed_kph} kph` : null;
  const vcStr = normalized.vc_ratio !== null ? `${Math.round(normalized.vc_ratio * 100)}%` : null;
  const ttiStr = normalized.travel_time_index !== null ? `${normalized.travel_time_index}x` : null;

  // Enforce risk description guidelines
  let riskDesc = 'low congestion risk';
  if (riskVal >= 80) riskDesc = 'critical congestion risk';
  else if (riskVal >= 60) riskDesc = 'high congestion risk';
  else if (riskVal >= 40) riskDesc = 'moderate congestion pressure';

  let situationSummary = `Congestion pressure is rising at ${locName}. Current Risk Score is ${riskVal}/100, indicating ${riskDesc} forecasted for the next ${windowStr}.`;
  if (speedStr) {
    situationSummary += ` Average speed is currently running at ${speedStr}.`;
  }

  // Ensure imminent gridlock is only used for high score (>=95)
  let gridlockWording = riskVal >= 95 ? 'imminent gridlock' : 'congestion delays';
  let causeExplanation = `This ${gridlockWording} is primarily driven by active triggers: ${causesList || 'typical peak commute flow limits'}.`;
  if (vcStr) {
    causeExplanation += ` Traffic volume has reached ${vcStr} capacity.`;
  }
  if (ttiStr) {
    causeExplanation += ` Travel times are currently inflated by ${ttiStr}.`;
  }

  const recommendedAction = recAction;

  // Enforce under 160 characters on publicAdvisory
  let publicAdvisory = `RTA Alert: Delays expected at ${locName}. Follow official road signs and navigation guidance.`;
  if (publicAdvisory.length > 157) {
    publicAdvisory = publicAdvisory.substring(0, 157) + '...';
  }

  return {
    situationSummary,
    causeExplanation,
    recommendedAction,
    publicAdvisory,
    humanApprovalNote: "This recommendation requires human approval before publishing to official roadside advisory channels."
  };
}
