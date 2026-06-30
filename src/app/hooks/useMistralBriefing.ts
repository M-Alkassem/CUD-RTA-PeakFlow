import { useState } from 'react';
import { Corridor } from '../lib/types';

export function useMistralBriefing(params: {
  selectedCorridor: Corridor | null;
  date: string;
  hour: number;
  calendarContext: any;
  selectedRecommendation: { action: string; reason: string };
}) {
  const { selectedCorridor, date, hour, calendarContext, selectedRecommendation } = params;
  const [briefing, setBriefing] = useState<any>(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

  const handleGenerateBriefing = async () => {
    if (!selectedCorridor) return;
    setIsGeneratingBrief(true);
    setBriefing(null);

    const isStorm = date === '2024-04-16';
    const isMainCauseIncident = selectedCorridor.incident_affected;
    const isMainCauseCapacity = selectedCorridor.vc_ratio > 0.9;
    const hasSignalPressure = !!selectedCorridor.junction_performance && 
      ((selectedCorridor.junction_performance.degree_of_saturation || 0) > 0.8 || 
       (selectedCorridor.junction_performance.avg_delay_s_per_veh || 0) > 30);
    
    const causesArray = [];
    if (isStorm) {
      causesArray.push('weather disruption and flooding');
    }
    if (isMainCauseIncident) {
      causesArray.push('Incident blockages');
    }
    if (hasSignalPressure) {
      causesArray.push('signal saturation and queue delays');
    }
    if (isMainCauseCapacity) {
      causesArray.push('volume near capacity');
    }
    if (causesArray.length === 0) {
      causesArray.push('PM Peak Commute');
    }

    const payload = {
      locationId: selectedCorridor.location_id,
      locationName: selectedCorridor.location_name,
      date,
      hour,
      avgSpeed: selectedCorridor.avg_speed_kph,
      freeFlowSpeed: selectedCorridor.free_flow_speed_kph,
      vcRatio: selectedCorridor.vc_ratio,
      levelOfService: selectedCorridor.level_of_service,
      demandVph: selectedCorridor.demand_vph,
      capacityVph: selectedCorridor.capacity_vph,
      riskScore: selectedCorridor.congestion_pressure_score,
      riskLevel: selectedCorridor.risk_level,
      activeIncidents: selectedCorridor.active_incidents,
      calendarContext,
      junctionPerformance: selectedCorridor.junction_performance,
      recommended_action: selectedRecommendation.action,
      causes: causesArray
    };

    try {
      const res = await fetch('/api/mistral/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setBriefing(data);
    } catch (err) {
      console.error('Error generating brief', err);
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  return {
    briefing,
    setBriefing,
    isGeneratingBrief,
    handleGenerateBriefing
  };
}
