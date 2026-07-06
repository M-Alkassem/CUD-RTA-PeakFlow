import { useState } from 'react';
import { Corridor, Scenario, DecisionLogEntry, ApprovedImpact } from '../lib/types';
import { calculateWhatIfImpact } from '../lib/whatIfImpact';

export function useOperatorDecision(params: {
  selectedCorridor: Corridor | null;
  activeMitigationKey: string;
  activeScenario: Scenario | null;
  date: string;
  hour: number;
  corridors: Corridor[];
  alternatives: string | null;
  mitigatedData: any;
}) {
  const { selectedCorridor, activeMitigationKey, activeScenario, date, hour, corridors, alternatives, mitigatedData } = params;

  const [decisionLog, setDecisionLog] = useState<DecisionLogEntry[]>([]);
  const [approvedImpact, setApprovedImpact] = useState<ApprovedImpact | null>(null);

  const handleOperatorDecision = (
    action: 'approve' | 'reject' | 'review',
    setAppliedActions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  ) => {
    if (!selectedCorridor) return;

    let desc = '';
    let statusText = '';
    const mitigationText = {
      'route-advisory': 'Route Advisory',
      'signal-timing': 'Signal Timing Review',
      'metro-riders': 'Public Transport Advisory',
      'salik-shift': 'Off-Peak Demand Shift',
      'incident-response': 'Incident Response',
      'monitor': 'Baseline Monitoring'
    }[activeMitigationKey] || 'Baseline Monitoring';

    if (action === 'approve') {
      desc = `Operator approved recommendation: ${mitigationText}`;
      statusText = 'APPROVED';
      setAppliedActions(prev => ({ ...prev, [selectedCorridor.location_id]: true }));

      const impact = calculateWhatIfImpact({
        selectedCorridor,
        selectedAction: activeMitigationKey,
        scenario: activeScenario,
        forecast: selectedCorridor.forecast,
        crossingAlternatives: alternatives,
        signalTelemetry: selectedCorridor.junction_performance,
        hour,
        date,
        corridors
      });

      let expectedImpactStr = '';
      if (activeMitigationKey === 'monitor') {
        expectedImpactStr = `No change. Risk remains at ${selectedCorridor.congestion_pressure_score} / ${selectedCorridor.risk_level}.`;
      } else if (mitigatedData) {
        if (activeMitigationKey === 'signal-timing') {
          expectedImpactStr = `Reduces risk to ${mitigatedData.score} / ${mitigatedData.level}, expected delay reduction ${Math.abs(impact.delayDeltaSeconds)}s`;
        } else {
          expectedImpactStr = `Reduces risk to ${mitigatedData.score} / ${mitigatedData.level}, expected speed +${impact.speedDeltaKph} kph`;
        }
      } else {
        expectedImpactStr = `Risk remains at ${selectedCorridor.congestion_pressure_score} / ${selectedCorridor.risk_level}`;
      }

      const mainReasonStr = selectedCorridor.forecast?.topContributingFeatures.join(', ') || 'Peak commute flow limits';

      setApprovedImpact({
        beforeScore: selectedCorridor.congestion_pressure_score,
        beforeLevel: selectedCorridor.risk_level,
        approvedAction: mitigationText,
        expectedImpact: expectedImpactStr,
        mainReason: mainReasonStr,
        status: 'APPROVED'
      });
    } else if (action === 'reject') {
      desc = `Operator dismissed recommendation: ${mitigationText}`;
      statusText = 'DISMISSED';
      setAppliedActions(prev => ({ ...prev, [selectedCorridor.location_id]: false }));
      setApprovedImpact(null);
    } else {
      desc = `Requested manual engineering review for ${selectedCorridor.road_name || selectedCorridor.location_name}`;
      statusText = 'ESCALATED';
      setAppliedActions(prev => ({ ...prev, [selectedCorridor.location_id]: false }));
      setApprovedImpact(null);
    }

    const logEntry: DecisionLogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      location: selectedCorridor.location_id,
      description: desc,
      status: statusText,
      operator: 'OP-402'
    };

    setDecisionLog(prev => [logEntry, ...prev]);
  };

  return {
    decisionLog,
    setDecisionLog,
    approvedImpact,
    setApprovedImpact,
    handleOperatorDecision
  };
}
