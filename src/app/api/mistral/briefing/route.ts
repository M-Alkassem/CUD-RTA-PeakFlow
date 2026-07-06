import { NextRequest, NextResponse } from 'next/server';
import { callMistralAgent, cleanAndParseJson, validateOperatorBriefing } from '@/lib/mistral/agents';

const briefingSystemPrompt = `
Your role is to turn a PeakFlow optimizer result into a short, clear operator briefing for a Dubai RTA human traffic operator.

You do not create a new strategy.
You do not invent new actions.
You do not control traffic systems.
You do not publish public messages.
You do not reroute drivers.
You only summarize the provided recommendation for human review.

Safety rules:
- safetyStatement: Must say: "Operator approval is required. No direct system action or forced rerouting is enabled."
- demoNarration: Write one short sentence suitable for the live demo. Mention that this is decision support and human review is required.

Return strictly a JSON object with this shape:
{
  "briefingHeadline": "A concise 1-sentence high-impact headline alert.",
  "operatorSummary": "A concise 2-sentence summary of the traffic state using only provided metrics.",
  "currentCondition": "An explanation of the congestion causes based strictly on the active triggers.",
  "recommendedDecision": "A summary of the recommended campaign action.",
  "expectedImpact": "A brief explanation of expected impact (e.g. estimated time saved).",
  "whyNow": "A brief sentence explaining why this intervention is needed at this time window.",
  "approvalChecklist": [
    "Confirm target corridor selection",
    "Verify commuter pricing and transit capacity triggers",
    "Obtain operator authorization signature"
  ],
  "riskNotes": "Operator approval is required. No direct system action or forced rerouting is enabled."
}
Return valid JSON only. No markdown. No extra text.
`;

export async function POST(request: NextRequest) {
  let body: any = {};
  let locationName = 'Unknown Corridor';
  let recommended_action = 'No demand-shift campaign needed';
  let expectedImpact = 'Traffic remains normal.';

  try {
    body = await request.json();

    const {
      locationId,
      locationName: locName,
      date,
      hour,
      avgSpeed,
      freeFlowSpeed,
      vcRatio,
      levelOfService,
      demandVph,
      capacityVph,
      riskScore,
      riskLevel,
      activeIncidents,
      calendarContext,
      recommended_action: recAction,
      doNothingRisk,
      congestionReducingAction,
      expectedImpact: expImpact,
      dataEvidence,
      operatorApprovalRequired,
      actionType,
      causes
    } = body;

    locationName = locName || locationId || 'Unknown Corridor';
    recommended_action = recAction || actionType || 'No demand-shift campaign needed';
    expectedImpact = expImpact || 'Traffic remains normal.';

    // Structured context payload for the briefing agent
    const userPayload = {
      scenario: calendarContext 
        ? `Date: ${date}, Weekend: ${calendarContext.is_weekend}, Ramadan: ${calendarContext.is_ramadan}, Holiday: ${calendarContext.is_public_holiday}, School: ${calendarContext.school_status}, Rain Severity: ${calendarContext.rain_severity}` 
        : `Date: ${date}, Hour: ${hour}`,
      timeLocation: `${String(hour).padStart(2, '0')}:00 at ${locationName} (${locationId})`,
      congestionState: {
        riskScore,
        riskLevel,
        avgSpeedKph: avgSpeed,
        freeFlowSpeedKph: freeFlowSpeed,
        vcRatio,
        levelOfService,
        demandVph,
        capacityVph,
        activeIncidentsCount: activeIncidents ? activeIncidents.length : 0,
        causes: causes || []
      },
      campaignRecommendation: {
        action: recommended_action,
        doNothingRisk,
        congestionReducingAction,
        dataEvidence
      },
      expectedImpact,
      confidence: 0.9,
      humanApprovalRequired: operatorApprovalRequired === "Yes" || true
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Briefing Route] Querying Briefing Agent for location: ${locationId}`);
    }

    const prompt = `
${briefingSystemPrompt}

Structured Input Context Data (JSON):
${JSON.stringify(userPayload, null, 2)}
`;

    const responseText = await callMistralAgent("operatorBriefing", prompt);
    const parsedBrief = cleanAndParseJson(responseText);

    // Validate structured response
    const validated = validateOperatorBriefing(parsedBrief);

    return NextResponse.json({
      ...validated,
      // legacy compat fields for safety
      situationSummary: validated.operatorSummary,
      causeExplanation: validated.currentCondition,
      recommendedAction: validated.recommendedDecision,
      publicAdvisory: validated.briefingHeadline,
      humanApprovalNote: validated.riskNotes,
      isFallback: false
    });

  } catch (error: any) {
    console.error('[Briefing Route] Error generating briefing:', error);

    // Dynamic, scenario-aware deterministic fallback text for live demo safety
    const fallbackOperatorBriefing = {
      briefingHeadline: `RTA Alert: Congestion pressure rising at ${locationName}.`,
      operatorSummary: `Elevated traffic density detected on the selected corridor. Immediate mitigation advisory is active.`,
      currentCondition: `Telemetry indicates traffic demand is exceeding safe limits on the selected road sector.`,
      recommendedDecision: recommended_action,
      expectedImpact: expectedImpact,
      whyNow: `Active peak commute window requires traffic demand smoothing to prevent gridlock.`,
      approvalChecklist: [
        "Operator review and authorization",
        "Verify public transit options are on standby",
        "Trigger roadside message alerts"
      ],
      riskNotes: `Operator approval is required. No direct system action or forced rerouting is enabled.`
    };

    return NextResponse.json({
      ...fallbackOperatorBriefing,
      situationSummary: fallbackOperatorBriefing.operatorSummary,
      causeExplanation: fallbackOperatorBriefing.currentCondition,
      recommendedAction: fallbackOperatorBriefing.recommendedDecision,
      publicAdvisory: fallbackOperatorBriefing.briefingHeadline,
      humanApprovalNote: fallbackOperatorBriefing.riskNotes,
      isFallback: true
    });
  }
}
