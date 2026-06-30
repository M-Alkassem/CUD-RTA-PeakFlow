import { Corridor, Scenario, WhatIfImpact } from './types';

export const calculateWhatIfImpact = (params: {
  selectedCorridor: Corridor;
  selectedAction: string;
  scenario: Scenario | null;
  forecast: any;
  crossingAlternatives: string | null;
  signalTelemetry: any;
  hour: number;
  date: string;
  corridors: Corridor[];
}): WhatIfImpact => {
  const { selectedCorridor: cor, selectedAction, scenario, hour, date, corridors } = params;
  const beforeRisk = cor.congestion_pressure_score;
  const beforeLevel = cor.risk_level;
  let afterRisk = beforeRisk;
  let afterLevel = beforeLevel;
  let speedDeltaKph = 0;
  let delayDeltaSeconds = 0;
  let volumeDeltaVph = 0;
  let confidence = 85;
  let reason = '';
  let applicable = true;
  const assumptions: string[] = [];

  const currentRisk = cor.congestion_pressure_score;
  const vcRatio = cor.vc_ratio || 0;
  const avgSpeed = cor.avg_speed_kph || 80;
  const incidentAffected = cor.incident_affected;
  
  // Estimate demand
  let currentDemand = cor.demand_vph || 0;
  if (!currentDemand && cor.volume_vph) {
    currentDemand = Math.round(cor.volume_vph / (vcRatio || 0.8));
    assumptions.push("Estimated baseline demand from volume and volume-to-capacity ratio.");
  }

  const peakHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);
  const isStorm = date === '2024-04-16';

  const clampVal = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  const getRiskLevel = (score: number) => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  let riskReduction = 0;

  switch (selectedAction) {
    case 'route-advisory': {
      const isBridge = ['GAR_N1', 'MAK_N1', 'BBC_S1'].includes(cor.location_id);
      if (isBridge) {
        const otherBridges = corridors.filter(c => ['GAR_N1', 'MAK_N1', 'BBC_S1'].includes(c.location_id) && c.location_id !== cor.location_id);
        const lowestAlternativeRisk = otherBridges.length > 0 
          ? Math.min(...otherBridges.map(b => b.congestion_pressure_score)) 
          : 100;
        
        const alternativeGap = currentRisk - lowestAlternativeRisk;
        
        if (alternativeGap > 0) {
          riskReduction = clampVal(4 + alternativeGap * 0.35 + Math.max(0, vcRatio - 0.85) * 30, 2, 18);
          speedDeltaKph = Math.round(clampVal(3 + alternativeGap * 0.25, 2, 14));
          reason = `Alternative creek crossings have lower pressure (gap of ${Math.round(alternativeGap)} points). Rerouting has high efficacy.`;
        } else {
          riskReduction = 2;
          speedDeltaKph = 2;
          applicable = false;
          reason = "Adjacent creek crossings are equally or more congested. Rerouting offers limited relief.";
        }
      } else {
        riskReduction = clampVal(2 + vcRatio * 4, 1, 6);
        speedDeltaKph = 2;
        applicable = false;
        reason = "No dynamic alternate crossing routes defined for this corridor. Limited impact.";
      }
      volumeDeltaVph = -Math.round(currentDemand * 0.05);
      break;
    }

    case 'signal-timing': {
      const hasSignal = !!cor.junction_performance;
      if (hasSignal && cor.junction_performance) {
        const delaySeconds = cor.junction_performance.avg_delay_s_per_veh || 10;
        const saturation = (cor.junction_performance.degree_of_saturation || 0) * 100;
        const queueSize = cor.junction_performance.avg_queue_veh || 0;

        if (saturation > 80 || delaySeconds > 30 || queueSize > 15) {
          riskReduction = clampVal((delaySeconds / 10) + Math.max(0, saturation - 80) * 0.4 + queueSize * 1.5, 2, 18);
          delayDeltaSeconds = -Math.round(clampVal(delaySeconds * 0.25, 5, 25));
          speedDeltaKph = Math.round(clampVal(delayDeltaSeconds * -0.3, 2, 10));
          reason = `Active saturation (${Math.round(saturation)}%) and queue delay detected. Optimization will clear approach queues.`;
        } else {
          riskReduction = 2;
          delayDeltaSeconds = -2;
          applicable = false;
          reason = "Degree of saturation and delay are already within acceptable service thresholds.";
        }
      } else {
        riskReduction = 1;
        applicable = false;
        reason = "No adaptive signal junctions mapped to this corridor hotspot.";
      }
      break;
    }

    case 'metro-riders': {
      if (peakHour) {
        riskReduction = clampVal(5 + currentRisk * 0.08, 3, 14);
        volumeDeltaVph = -Math.round(clampVal(currentDemand * 0.04, 80, 400));
        reason = "High peak-hour commuter volume. Public transit advisory leverages nearby stations for passenger modal shift.";
      } else {
        riskReduction = clampVal(2 + currentRisk * 0.04, 1, 7);
        volumeDeltaVph = -Math.round(clampVal(currentDemand * 0.02, 30, 150));
        reason = "Off-peak hours limit the potential volume shift to transit channels.";
      }
      speedDeltaKph = Math.round(clampVal(volumeDeltaVph * -0.02, 1, 5));
      break;
    }

    case 'salik-shift': {
      const isPeakCommute = scenario?.id === 'pm-peak-demo' || peakHour;
      if (isPeakCommute) {
        riskReduction = clampVal(4 + currentRisk * 0.06, 3, 12);
        volumeDeltaVph = -Math.round(clampVal(currentDemand * 0.05, 100, 450));
        reason = "Commuter corridor under peak Salik pressure. Off-peak pricing incentives redirect discretionary trips.";
      } else {
        riskReduction = clampVal(1 + currentRisk * 0.03, 1, 5);
        volumeDeltaVph = -Math.round(clampVal(currentDemand * 0.015, 20, 120));
        reason = "Non-peak conditions limit the price-elastic response of commuter shifting.";
      }
      speedDeltaKph = Math.round(clampVal(volumeDeltaVph * -0.02, 1, 6));
      break;
    }

    case 'route-advisory-incident':
    case 'incident-response':
    case 'Official roadside advisory + incident response': {
      const incidentOrWeather = incidentAffected || isStorm;
      if (incidentOrWeather) {
        riskReduction = clampVal(8 + currentRisk * 0.12, 6, 20);
        speedDeltaKph = Math.round(clampVal(4 + currentRisk * 0.08, 3, 12));
        reason = isStorm 
          ? "Severe weather disruption. Dynamic alerts redirect traffic and coordinate emergency responses to flooded blockages." 
          : "Active incident blocking lanes. Dispatching response unit and roadside sign warnings provides rapid clearing and recovery.";
      } else {
        riskReduction = clampVal(2 + currentRisk * 0.04, 1, 8);
        speedDeltaKph = 2;
        applicable = false;
        reason = "No active incident or severe weather disruption detected on this corridor.";
      }
      break;
    }

    case 'monitor':
    default: {
      riskReduction = 0;
      reason = "No operational intervention selected; conditions continue to be monitored.";
      break;
    }
  }

  afterRisk = Math.round(Math.max(15, Math.min(100, currentRisk - riskReduction)));
  afterLevel = getRiskLevel(afterRisk);

  const actionName = {
    'route-advisory': 'Route Advisory',
    'signal-timing': 'Signal Timing Review',
    'metro-riders': 'Public Transport Advisory',
    'salik-shift': 'Off-Peak Demand Shift',
    'incident-response': 'Incident Response',
    'monitor': 'Monitor Only'
  }[selectedAction] || 'Monitor Only';

  return {
    actionName,
    beforeRisk,
    afterRisk,
    beforeLevel,
    afterLevel,
    speedDeltaKph,
    delayDeltaSeconds,
    volumeDeltaVph,
    confidence,
    reason,
    applicable,
    assumptions
  };
};

export const getMitigatedMetrics = (params: {
  corridor: Corridor;
  optionKey: string;
  activeScenario: Scenario | null;
  date: string;
  hour: number;
  corridors: Corridor[];
  crossingAlternatives: string | null;
  junctionPerformance: any;
}) => {
  const { corridor, optionKey, activeScenario, date, hour, corridors, crossingAlternatives, junctionPerformance } = params;
  if (!corridor) return null;
  const impact = calculateWhatIfImpact({
    selectedCorridor: corridor,
    selectedAction: optionKey,
    scenario: activeScenario,
    forecast: corridor.forecast,
    crossingAlternatives,
    signalTelemetry: junctionPerformance,
    hour,
    date,
    corridors
  });
  return {
    score: impact.afterRisk,
    level: impact.afterLevel,
    speed: Math.round(Math.min(corridor.speed_limit_kph, corridor.avg_speed_kph + impact.speedDeltaKph)),
    volume: Math.round(Math.max(100, corridor.volume_vph + impact.volumeDeltaVph)),
    delay: junctionPerformance ? Math.max(5, Math.round(junctionPerformance.avg_delay_s_per_veh + impact.delayDeltaSeconds)) : null
  };
};
