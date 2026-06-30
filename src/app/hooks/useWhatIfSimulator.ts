import { useState } from 'react';
import { Corridor, Scenario } from '../lib/types';
import { calculateWhatIfImpact, getMitigatedMetrics } from '../lib/whatIfImpact';
import { getDefaultMitigationKey } from '../lib/briefingFormatters';

export function useWhatIfSimulator(params: {
  selectedCorridor: Corridor | null;
  corridors: Corridor[];
  activeScenario: Scenario | null;
  date: string;
  hour: number;
  selectedRecommendation: { action: string; reason: string };
}) {
  const { selectedCorridor, corridors, activeScenario, date, hour, selectedRecommendation } = params;

  const [mitigations, setMitigations] = useState<Record<string, string>>({});
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({});

  const getCreekAlternatives = () => {
    if (!selectedCorridor) return null;
    const id = selectedCorridor.location_id;
    if (id === 'GAR_N1') return 'Al Maktoum Bridge (MAK_N1) or Business Bay Crossing (BBC_S1)';
    if (id === 'MAK_N1') return 'Business Bay Crossing (BBC_S1) or Al Garhoud Bridge (GAR_N1)';
    if (id === 'BBC_S1') return 'Al Garhoud Bridge (GAR_N1) or Al Maktoum Bridge (MAK_N1)';
    return null;
  };
  const alternatives = getCreekAlternatives();

  const defaultKey = selectedRecommendation ? getDefaultMitigationKey(selectedRecommendation.action) : 'monitor';
  const activeMitigationKey = selectedCorridor ? (mitigations[selectedCorridor.location_id] || defaultKey) : 'monitor';
  
  const junctionPerformance = selectedCorridor?.junction_performance;

  const mitigatedData = selectedCorridor ? getMitigatedMetrics({
    corridor: selectedCorridor,
    optionKey: activeMitigationKey,
    activeScenario,
    date,
    hour,
    corridors,
    crossingAlternatives: alternatives,
    junctionPerformance
  }) : null;

  const routeImpact = selectedCorridor ? calculateWhatIfImpact({
    selectedCorridor,
    selectedAction: 'route-advisory',
    scenario: activeScenario,
    forecast: selectedCorridor.forecast,
    crossingAlternatives: alternatives,
    signalTelemetry: junctionPerformance,
    hour,
    date,
    corridors
  }) : null;

  const signalImpact = selectedCorridor ? calculateWhatIfImpact({
    selectedCorridor,
    selectedAction: 'signal-timing',
    scenario: activeScenario,
    forecast: selectedCorridor.forecast,
    crossingAlternatives: alternatives,
    signalTelemetry: junctionPerformance,
    hour,
    date,
    corridors
  }) : null;

  const metroImpact = selectedCorridor ? calculateWhatIfImpact({
    selectedCorridor,
    selectedAction: 'metro-riders',
    scenario: activeScenario,
    forecast: selectedCorridor.forecast,
    crossingAlternatives: alternatives,
    signalTelemetry: junctionPerformance,
    hour,
    date,
    corridors
  }) : null;

  const salikImpact = selectedCorridor ? calculateWhatIfImpact({
    selectedCorridor,
    selectedAction: 'salik-shift',
    scenario: activeScenario,
    forecast: selectedCorridor.forecast,
    crossingAlternatives: alternatives,
    signalTelemetry: junctionPerformance,
    hour,
    date,
    corridors
  }) : null;

  const incidentImpact = selectedCorridor ? calculateWhatIfImpact({
    selectedCorridor,
    selectedAction: 'incident-response',
    scenario: activeScenario,
    forecast: selectedCorridor.forecast,
    crossingAlternatives: alternatives,
    signalTelemetry: junctionPerformance,
    hour,
    date,
    corridors
  }) : null;

  const recommendedSimKey = selectedRecommendation.action.toLowerCase().includes('incident response') ? 'incident-response' :
                             selectedRecommendation.action.toLowerCase().includes('route advisory') ? 'route-advisory' : 
                             selectedRecommendation.action.toLowerCase().includes('signal timing') ? 'signal-timing' :
                             selectedRecommendation.action.toLowerCase().includes('metro') || selectedRecommendation.action.toLowerCase().includes('public transport') ? 'metro-riders' :
                             selectedRecommendation.action.toLowerCase().includes('salik') || selectedRecommendation.action.toLowerCase().includes('off-peak') ? 'salik-shift' : 
                             selectedRecommendation.action.toLowerCase().includes('official roadside advisory') ? 'route-advisory' : 'monitor';

  return {
    mitigations,
    setMitigations,
    appliedActions,
    setAppliedActions,
    activeMitigationKey,
    mitigatedData,
    recommendedSimKey,
    routeImpact,
    signalImpact,
    metroImpact,
    salikImpact,
    incidentImpact,
    alternatives
  };
}
