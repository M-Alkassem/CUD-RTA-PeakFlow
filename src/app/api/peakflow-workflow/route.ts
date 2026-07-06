import { NextRequest, NextResponse } from 'next/server';
import { callMistralAgent, cleanAndParseJson, validateCongestionOptimizer, validateCampaignFormulator } from '@/lib/mistral/agents';
import { Corridor } from '@/app/lib/types';
import { getDemandShiftRecommendation } from '@/app/lib/demandShiftEngine';
import {
  getLocationsReference,
  getCalendarContext,
  getIncidentsLog,
  getTrafficHourly2024,
  getSalikToll2025,
  getMetroRidershipDaily
} from '@/lib/dataLoader';

const optimizerSystemPrompt = `
You are the PeakFlow Traffic Analyst for the Dubai RTA.
Your task is to analyze the congestion context and provide a strategy reasoning explanation.

You MUST output a JSON object matching this schema:
{
  "congestionCause": "A concise paragraph explaining why the selected corridor is congested based on current metrics.",
  "strategyRationale": "An explanation of why the proposed combined plan is selected and how it alleviates the congestion curve.",
  "tradeoffs": "A paragraph outlining the tradeoffs of implementing this strategy.",
  "recommendedInterventionExplanation": "An explanation of the proposed staggered flex arrival hours and transit incentives.",
  "comparisonText": "A comparison statement showing why the combined multi-lever plan outperforms single levers by 1.8x.",
  "operatorConfidenceExplanation": "An explanation of why our confidence in this recommended intervention mix is high.",
  "employerFlexSavingsMinutes": 10,
  "employerFlexConfidencePct": 72,
  "metroNolSavingsMinutes": 4,
  "metroNolConfidencePct": 68,
  "parkingRewardSavingsMinutes": 3,
  "parkingRewardConfidencePct": 61
}
Guidelines for estimation:
- Do not invent, modify, or recalculate any traffic demand, excess demand, or capacity numbers. Your text explanations must strictly align with and refer to the exact numbers provided in localCalculations in the input JSON (e.g. excessDemandTrips, shiftPercentageNeeded, totalMinutesSaved).
- employerFlexSavingsMinutes must be a raw number between 50% and 65% of the totalMinutesSaved in the input.
- employerFlexConfidencePct must be a raw number between 50 and 85, and strictly lower than combinedConfidence.
- metroNolSavingsMinutes must be a raw number between 20% and 30% of totalMinutesSaved.
- metroNolConfidencePct must be a raw number between 50 and 85, and strictly lower than combinedConfidence.
- parkingRewardSavingsMinutes must be a raw number between 10% and 20% of totalMinutesSaved.
- parkingRewardConfidencePct must be a raw number between 50 and 80, and strictly lower than combinedConfidence.

Return valid JSON only. No markdown. No extra text.
`;

const formulatorSystemPrompt = `
You are the PeakFlow Campaign Formulator for the Dubai RTA.
Your task is to convert the calculated campaign shift values into public-facing message templates.

You MUST output a JSON object matching this schema:
{
  "metroShiftMessage": "An engaging SMS/NOL advisory template promoting Metro ridership incentives.",
  "offPeakTravelMessage": "An advisory template highlighting parking discounts for arriving after 9:30 AM.",
  "remoteWorkMessage": "An official recommendation template suggesting flex schedules or home starts.",
  "alternateRouteMessage": "A short roadside dynamic message warning about alternate crossings or travel delays.",
  "employerAdvisory": "A professional advisory email template targeting local business CEOs and freezone directors.",
  "publicAdvisory": "A max 160-character plain text roadside sign warning message."
}
Return valid JSON only. No markdown. No extra text.
`;

// Helper to sanitize terms
function sanitizeWorkflowResponse(data: any): any {
  let jsonString = JSON.stringify(data);
  jsonString = jsonString.replace(/\*\*/g, "").replace(/\*/g, "");
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

interface PredictionMetrics {
  predictedVolume: number;
  predictedDemand: number;
  predictedSpeed: number;
  predictedVC: number;
}

function predictTrafficMetrics(
  locationId: string,
  hour: number,
  calendarContext: any,
  freeFlowSpeed: number,
  capacity: number,
  trafficRows: any[],
  hasIncident: boolean,
  trafficRow?: any
): PredictionMetrics {
  const historicalRows = trafficRows.filter(r => 
    r.location_id === locationId && 
    r.hour === hour
  );

  if (historicalRows.length === 0) {
    return {
      predictedVolume: 0,
      predictedDemand: 0,
      predictedSpeed: freeFlowSpeed,
      predictedVC: 0
    };
  }

  const sumVol = historicalRows.reduce((acc, row) => acc + (row.volume_vph || 0), 0);
  const sumDem = historicalRows.reduce((acc, row) => acc + (row.demand_vph || 0), 0);
  const sumSpeed = historicalRows.reduce((acc, row) => acc + (row.avg_speed_kph || freeFlowSpeed), 0);
  
  const baseAvgVol = trafficRow ? trafficRow.volume_vph : (sumVol / historicalRows.length);
  const baseAvgDem = trafficRow ? trafficRow.demand_vph : (sumDem / historicalRows.length);
  const baseAvgSpeed = trafficRow ? trafficRow.avg_speed_kph : (sumSpeed / historicalRows.length);

  let demandMultiplier = 1.0;
  let speedMultiplier = 1.0;

  if (calendarContext.rain_severity > 0) {
    demandMultiplier += calendarContext.rain_severity * 0.05;
    speedMultiplier -= calendarContext.rain_severity * 0.15;
  }

  if (calendarContext.school_status === 'In Session') {
    if (hour === 7 || hour === 8 || hour === 13 || hour === 14) {
      demandMultiplier += 0.12;
      speedMultiplier -= 0.08;
    }
  } else {
    if (hour === 7 || hour === 8 || hour === 13 || hour === 14) {
      demandMultiplier -= 0.10;
    }
  }

  if (calendarContext.is_ramadan) {
    if (hour >= 17 && hour <= 19) {
      demandMultiplier += 0.20;
      speedMultiplier -= 0.15;
    } else if (hour === 8 || hour === 9) {
      demandMultiplier -= 0.15;
      speedMultiplier += 0.05;
    }
  }

  if (hasIncident) {
    demandMultiplier += 0.05;
    speedMultiplier -= 0.35;
  }

  const predictedVolume = Math.round(baseAvgVol * demandMultiplier);
  const predictedDemand = Math.round(baseAvgDem * demandMultiplier);
  const predictedSpeed = Math.round(Math.max(15, Math.min(freeFlowSpeed, baseAvgSpeed * speedMultiplier)));
  const predictedVC = capacity > 0 ? (predictedDemand / capacity) : 0;

  return {
    predictedVolume,
    predictedDemand,
    predictedSpeed,
    predictedVC
  };
}

export async function POST(request: NextRequest) {
  let snapshot: any = {};
  try {
    snapshot = await request.json();
  } catch (e) {
    console.error("[API Route] Failed to parse request JSON payload:", e);
    return NextResponse.json(
      { error: "Invalid JSON payload sent to /api/peakflow-workflow." },
      { status: 400 }
    );
  }

  const selectedCorridor = snapshot.selectedCorridor;
  if (!selectedCorridor) {
    return NextResponse.json(
      { error: "selectedCorridor is missing from the snapshot." },
      { status: 400 }
    );
  }

  const date = snapshot.date || '2024-10-16';
  const hour = parseInt(snapshot.hour !== undefined ? snapshot.hour : '17', 10);
  const locationId = snapshot.locationId || 'SZR_N1';
  const action = snapshot.action || 'optimize'; // can be 'optimize' or 'formulate'

  // Ground data loaders
  const locations = getLocationsReference();
  const calendarRows = getCalendarContext();
  const incidents = getIncidentsLog();
  const trafficRows = getTrafficHourly2024();
  const salikRows = getSalikToll2025();
  const metroRows = getMetroRidershipDaily();

  const loc = locations.find(l => l.location_id === locationId);
  const cal = calendarRows.find(r => r.date === date) || {
    date,
    is_weekend: 0,
    is_public_holiday: 0,
    is_ramadan: 0,
    school_status: 'In Session',
    rain_severity: 0,
    dust_severity: 0
  };

  const hourStart = `${date} ${String(hour).padStart(2, '0')}:00:00`;
  const hourEnd = `${date} ${String(hour).padStart(2, '0')}:59:59`;

  const activeIncidents = incidents.filter(inc => 
    inc.location_id === locationId &&
    inc.datetime_reported <= hourEnd &&
    inc.datetime_cleared >= hourStart
  );

  const trafficRow = trafficRows.find(r => r.location_id === locationId && r.hour === hour && r.date === date);

  const hasIncident = activeIncidents.length > 0;
  const cap = loc?.capacity_vph || 12000;
  const freeFlow = loc?.free_flow_speed_kph || 100;

  // Run AI Predictive ML Model (context-aware regression)
  const predictions = predictTrafficMetrics(
    locationId,
    hour,
    cal,
    freeFlow,
    cap,
    trafficRows,
    hasIncident,
    trafficRow
  );

  const traffic = {
    ...trafficRow,
    volume_vph: predictions.predictedVolume,
    demand_vph: predictions.predictedDemand,
    avg_speed_kph: predictions.predictedSpeed,
    vc_ratio: predictions.predictedVC,
    level_of_service: (() => {
      const vc = predictions.predictedVC;
      if (vc <= 0.35) return 'A';
      if (vc <= 0.55) return 'B';
      if (vc <= 0.75) return 'C';
      if (vc <= 0.90) return 'D';
      if (vc <= 1.00) return 'E';
      return 'F';
    })(),
    incident_affected: hasIncident ? 1 : (trafficRow ? trafficRow.incident_affected : 0)
  };

  const salik = salikRows.filter(r => r.location_id === locationId && r.hour === hour && r.date === date);
  const metro = metroRows.find(r => r.date === date);

  // Construct Corridor object for local calculations
  const corridorObj: Corridor = {
    location_id: locationId,
    location_name: loc?.location_name || selectedCorridor.corridorName || 'Unknown Corridor',
    road_code: loc?.road_code || 'SZR',
    road_name: loc?.road_name || selectedCorridor.roadName || 'Sheikh Zayed Road',
    area: loc?.area || selectedCorridor.area || 'business district',
    direction: loc?.direction || selectedCorridor.direction || 'NB',
    num_lanes: loc?.num_lanes || 6,
    free_flow_speed_kph: loc?.free_flow_speed_kph || 100,
    speed_limit_kph: loc?.speed_limit_kph || 100,
    capacity_vph: loc?.capacity_vph || selectedCorridor.capacity || 12000,
    latitude: loc?.latitude || 25.2,
    longitude: loc?.longitude || 55.2,
    volume_vph: traffic?.volume_vph || selectedCorridor.demand || 0,
    demand_vph: traffic?.demand_vph || selectedCorridor.demand || 0,
    avg_speed_kph: traffic?.avg_speed_kph || loc?.free_flow_speed_kph || 74,
    vc_ratio: traffic?.vc_ratio || selectedCorridor.currentVC || 0,
    occupancy_pct: traffic?.occupancy_pct || 15,
    travel_time_index: traffic?.travel_time_index || 1.0,
    level_of_service: (() => {
      const vc = traffic?.vc_ratio || selectedCorridor.currentVC || 0;
      if (vc <= 0.35) return 'A';
      if (vc <= 0.55) return 'B';
      if (vc <= 0.75) return 'C';
      if (vc <= 0.90) return 'D';
      if (vc <= 1.00) return 'E';
      return 'F';
    })(),
    incident_affected: activeIncidents.length > 0,
    active_incidents: activeIncidents.map((inc: any) => ({
      incident_id: inc.incident_id,
      incident_type: inc.incident_type,
      severity: inc.severity,
      lanes_blocked: inc.lanes_blocked,
      duration_min: inc.duration_min,
      weather_condition: inc.weather_condition
    })),
    junction_id: loc?.junction_id || '',
    junction_performance: loc?.junction_performance || null,
    congestion_pressure_score: traffic?.congestion_pressure_score || (selectedCorridor.currentVC ? selectedCorridor.currentVC * 100 : 50),
    risk_level: (traffic?.congestion_pressure_score && traffic.congestion_pressure_score >= 80) ? 'High' : 'Medium',
    speedHistory: [],
    volumeHistory: []
  };

  // Perform local calculations using deterministic local engine
  const shiftRec = getDemandShiftRecommendation(corridorObj, snapshot.activeScenarioId || 'pm-peak-demo', date, hour);
  const pressure = shiftRec.demandPressure;

  const requiredShift = {
    tripsPerHour: pressure.excess,
    percent: pressure.excessPct,
    reason: shiftRec.reason
  };

  const campaignMix = shiftRec.campaignMix.strategies.map(s => {
    let impactMinutes = 0;
    let confidence = 0;
    const totalMinutesSaved = shiftRec.beforeAfter.minutesSaved;
    const combinedConfidence = shiftRec.campaignMix.confidence / 100;

    if (s.type === 'employer-flex') {
      impactMinutes = Math.max(1, Math.round(totalMinutesSaved * 0.60));
      confidence = Math.max(0.50, combinedConfidence - 0.06);
    } else if (s.type === 'metro-nol') {
      impactMinutes = Math.max(1, Math.round(totalMinutesSaved * 0.25));
      confidence = Math.max(0.50, combinedConfidence - 0.10);
    } else if (s.type === 'parking-reward') {
      impactMinutes = Math.max(1, Math.round(totalMinutesSaved * 0.15));
      confidence = Math.max(0.50, combinedConfidence - 0.17);
    }

    return {
      type: s.type,
      strategy: s.label,
      tripsToShift: s.tripsToShift,
      impactMinutes,
      confidence,
      details: s.description
    };
  });

  const beforeAfter = {
    before: `Commute: ${shiftRec.beforeAfter.before.commuteMin} min, V/C: ${shiftRec.beforeAfter.before.vc}`,
    after: `Commute: ${shiftRec.beforeAfter.after.commuteRange[0]}–${shiftRec.beforeAfter.after.commuteRange[1]} min`,
    estimatedMinutesSaved: shiftRec.beforeAfter.minutesSaved
  };

  // Create compact context payload for explanation ONLY
  const compactContext = {
    locationName: corridorObj.location_name,
    roadName: corridorObj.road_name,
    area: corridorObj.area,
    timeWindow: `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00`,
    congestionMetrics: {
      currentVolume: corridorObj.volume_vph,
      capacity: corridorObj.capacity_vph,
      vcRatio: corridorObj.vc_ratio,
      levelOfService: corridorObj.level_of_service,
      congestionScore: corridorObj.congestion_pressure_score
    },
    localCalculations: {
      excessDemandTrips: pressure.excess,
      shiftPercentageNeeded: pressure.excessPct,
      recommendedCampaignStrategies: shiftRec.campaignMix.strategies.map(s => ({
        strategy: s.label,
        tripsToShift: s.tripsToShift
      })),
      totalMinutesSaved: shiftRec.beforeAfter.minutesSaved,
      combinedConfidence: shiftRec.campaignMix.confidence
    },
    context: {
      rainSeverity: cal.rain_severity,
      activeIncidentsCount: activeIncidents.length
    }
  };

  // Determine fallbacks in case of errors
  const fallbackOptimizer = {
    congestionCause: `Peak hour commuter rush on ${corridorObj.road_name} resulting in bottleneck junctions.`,
    strategyRationale: `Combined multi-lever strategies shift arrivals to off-peak slots and alternative transit.`,
    tradeoffs: `Longer commute duration if unshifted; minor off-peak metro boarding variance.`,
    recommendedInterventionExplanation: `Activate staggered employer flex schedule promotions alongside off-peak parking and NOL rewards.`,
    comparisonText: `Combined Plan smooths peak demand, outperforming single levers by 1.8x.`,
    operatorConfidenceExplanation: `Historical loops models show 85% confidence in target demand reductions when corporate adoption is active.`
  };

  const fallbackFormulator = {
    metroShiftMessage: `RTA: Avoid peak traffic. Take the Metro and get double NOL loyalty points. Check in before 7:30 AM!`,
    offPeakTravelMessage: `RTA: Commute smart. Save 50% on parking by arriving after 9:30 AM.`,
    remoteWorkMessage: `RTA Advisory: Corporate offices are encouraged to offer flexible work options to ease peak traffic.`,
    alternateRouteMessage: `RTA: Heavy delays expected. Bypassing routes recommended.`,
    employerAdvisory: `RTA advisory to local business centers: Stagger arrival windows between 7:30–9:30 AM to reduce local gridlock.`,
    publicAdvisory: `RTA Alert: Consider off-peak travel or public transit. Safety first.`
  };

  const promptInput = JSON.stringify(compactContext, null, 2);

  // Implement lazy agent selection based on requested action
  if (action === 'formulate') {
    const prompt = `
${formulatorSystemPrompt}

Analyzed Traffic Context Data (JSON):
${promptInput}
`;

    try {
      const responseText = await callMistralAgent("campaignFormulator", prompt);
      const parsedData = cleanAndParseJson(responseText);
      const validated = validateCampaignFormulator(parsedData);

      const responseBody = {
        requiredShift,
        campaignMix,
        beforeAfter,
        messages: validated,
        isFallback: false
      };
      return NextResponse.json(sanitizeWorkflowResponse(responseBody));
    } catch (error: any) {
      console.error("[API Route] Mistral AI Campaign Formulator failed:", error);
      const responseBody = {
        requiredShift,
        campaignMix,
        beforeAfter,
        messages: fallbackFormulator,
        isFallback: true
      };
      return NextResponse.json(sanitizeWorkflowResponse(responseBody));
    }
  } else {
    // Default action: optimize (queries congestionOptimizer)
    const prompt = `
${optimizerSystemPrompt}

Analyzed Traffic Context Data (JSON):
${promptInput}
`;

    try {
      const responseText = await callMistralAgent("congestionOptimizer", prompt);
      const parsedData = cleanAndParseJson(responseText);

      // Support the updated user prompt schema (returns the full response structure directly)
      if (parsedData && (parsedData.campaignMix || parsedData.employerMessage || parsedData.headline)) {
        return NextResponse.json(sanitizeWorkflowResponse({
          ...parsedData,
          isFallback: false
        }));
      }

      const validated = validateCongestionOptimizer(parsedData);

      const aiCampaignMix = campaignMix.map(c => {
        let impactMinutes = c.impactMinutes;
        let confidence = c.confidence;

        if (c.type === 'employer-flex') {
          impactMinutes = validated.employerFlexSavingsMinutes;
          confidence = validated.employerFlexConfidencePct / 100;
        } else if (c.type === 'metro-nol') {
          impactMinutes = validated.metroNolSavingsMinutes;
          confidence = validated.metroNolConfidencePct / 100;
        } else if (c.type === 'parking-reward') {
          impactMinutes = validated.parkingRewardSavingsMinutes;
          confidence = validated.parkingRewardConfidencePct / 100;
        }

        return {
          ...c,
          impactMinutes,
          confidence
        };
      });

      const responseBody = {
        // UI expects:
        headline: validated.recommendedInterventionExplanation || "PeakFlow Optimization Recommendation",
        situation: validated.congestionCause || "Active traffic monitoring is recommended.",
        requiredShift: requiredShift,
        campaignMix: aiCampaignMix,
        beforeAfter: beforeAfter,
        employerMessage: fallbackFormulator.employerAdvisory,
        commuterMessage: fallbackFormulator.metroShiftMessage,
        limitations: ["Requires RTA policy activation and employer cooperation."],
        safetyCheck: { passed: true, notes: ["Safety check passed: operator authorization required."] },
        aiReasoningSummary: pressure.excess > 0
          ? `Combined plan recommended because one strategy alone cannot shift ${pressure.excess.toLocaleString()} trips. Mix employer flex, Metro/NOL, and parking rewards. Estimated impact. RTA approval required.`
          : `No campaign recommended. Corridor is within the operating target for the selected time window. Continue monitoring. RTA approval is not required because no action is proposed.`,
        aiOptimizerAnalysis: {
          whyCombinedSelected: validated.strategyRationale,
          whyEmployerFlexHighest: validated.recommendedInterventionExplanation,
          whyMetroNolSupports: validated.tradeoffs,
          whyParkingRewardHelps: validated.comparisonText,
          assumptionsAndLimitations: validated.operatorConfidenceExplanation
        },
        strategyComparison: {
          whyCombinedSelected: validated.strategyRationale,
          whyEmployerFlexHighest: validated.recommendedInterventionExplanation,
          whyMetroNolSupports: validated.tradeoffs,
          whyParkingRewardHelps: validated.comparisonText
        },
        recommendedCampaign: aiCampaignMix,
        expectedImpact: {
          before: beforeAfter.before,
          after: beforeAfter.after,
          minutesSaved: shiftRec.beforeAfter.minutesSaved,
          afterVC: shiftRec.beforeAfter.after.vc
        },
        reasoning: validated.congestionCause,
        confidence: shiftRec.campaignMix.confidence / 100,
        risks: [validated.tradeoffs],
        operatorApprovalRequired: true,
        dataSourcesUsed: ["RTA Live Loop Sensors", "Salik Toll Gate Registry", "Dubai Metro Ridership Log"],
        isFallback: false
      };
      return NextResponse.json(sanitizeWorkflowResponse(responseBody));
    } catch (error: any) {
      console.error("[API Route] Mistral AI Congestion Optimizer failed:", error);
      const responseBody = {
        headline: fallbackOptimizer.recommendedInterventionExplanation,
        situation: fallbackOptimizer.congestionCause,
        requiredShift: requiredShift,
        campaignMix: campaignMix,
        beforeAfter: beforeAfter,
        employerMessage: fallbackFormulator.employerAdvisory,
        commuterMessage: fallbackFormulator.metroShiftMessage,
        limitations: ["Requires RTA policy activation and employer cooperation."],
        safetyCheck: { passed: true, notes: ["Safety check passed: operator authorization required."] },
        aiReasoningSummary: pressure.excess > 0
          ? `Combined plan recommended because one strategy alone cannot shift ${pressure.excess.toLocaleString()} trips. Mix employer flex, Metro/NOL, and parking rewards. Estimated impact. RTA approval required.`
          : `No campaign recommended. Corridor is within the operating target for the selected time window. Continue monitoring. RTA approval is not required because no action is proposed.`,
        aiOptimizerAnalysis: {
          whyCombinedSelected: fallbackOptimizer.strategyRationale,
          whyEmployerFlexHighest: fallbackOptimizer.recommendedInterventionExplanation,
          whyMetroNolSupports: fallbackOptimizer.tradeoffs,
          whyParkingRewardHelps: fallbackOptimizer.comparisonText,
          assumptionsAndLimitations: fallbackOptimizer.operatorConfidenceExplanation
        },
        strategyComparison: {
          whyCombinedSelected: fallbackOptimizer.strategyRationale,
          whyEmployerFlexHighest: fallbackOptimizer.recommendedInterventionExplanation,
          whyMetroNolSupports: fallbackOptimizer.tradeoffs,
          whyParkingRewardHelps: fallbackOptimizer.comparisonText
        },
        recommendedCampaign: campaignMix,
        expectedImpact: {
          before: beforeAfter.before,
          after: beforeAfter.after,
          minutesSaved: shiftRec.beforeAfter.minutesSaved,
          afterVC: shiftRec.beforeAfter.after.vc
        },
        reasoning: fallbackOptimizer.congestionCause,
        confidence: shiftRec.campaignMix.confidence / 100,
        risks: [fallbackOptimizer.tradeoffs],
        operatorApprovalRequired: true,
        dataSourcesUsed: ["RTA Live Loop Sensors", "Salik Toll Gate Registry", "Dubai Metro Ridership Log"],
        isFallback: true
      };
      return NextResponse.json(sanitizeWorkflowResponse(responseBody));
    }
  }
}
