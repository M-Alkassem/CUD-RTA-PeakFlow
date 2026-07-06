'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  Compass,
  Train,
  Sliders,
  Zap,
  Activity
} from 'lucide-react';

import { useTheme } from './hooks/useTheme';
import { useTrafficData } from './hooks/useTrafficData';
import { useMapPanZoom } from './hooks/useMapPanZoom';
import { useWhatIfSimulator } from './hooks/useWhatIfSimulator';
import { useMistralBriefing } from './hooks/useMistralBriefing';
import { useOperatorDecision } from './hooks/useOperatorDecision';

// import { ControlSidebar } from './components/ControlSidebar';
import { DashboardTabs } from './components/DashboardTabs';
import { KpiCards } from './components/KpiCards';
import { TrafficRiskTable } from './components/TrafficRiskTable';
import { LiveMapTab } from './components/LiveMapTab';
import { CorridorDetails } from './components/CorridorDetails';
import { AiBriefingPanel } from './components/AiBriefingPanel';
import { PreventionImpactSummary } from './components/PreventionImpactSummary';
import { OperatorDecisionLog } from './components/OperatorDecisionLog';
import { DemandShiftHero } from './components/DemandShiftHero';
import { DemandShiftDecisionScreen } from './components/DemandShiftDecisionScreen';
import { DemandCampaignPlanner } from './components/DemandCampaignPlanner';

import { formatBriefField } from './lib/briefingFormatters';
import { buildSafeSituationSummary } from './lib/risk';
import { ActiveTab } from './lib/types';
import { getDemandShiftRecommendation } from './lib/demandShiftEngine';

export default function Page() {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>('SZR_N1');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [activeSidebarNav, setActiveSidebarNav] = useState('Demand Pressure');
  const [showTooltip, setShowTooltip] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [viewMode, setViewMode] = useState<'demo' | 'planner'>('demo');
  const [timeSelectionMode, setTimeSelectionMode] = useState<'manual' | 'auto'>('manual');

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'overview') {
      setActiveSidebarNav('Demand Pressure');
    } else if (activeTab === 'map') {
      setActiveSidebarNav('Live Map');
    } else if (activeTab === 'briefing') {
      setActiveSidebarNav('Shift Briefing');
    } else if (activeTab === 'forecast') {
      if (!['Demand Campaign Planner', 'Incidents', 'Signal Timing'].includes(activeSidebarNav)) {
        setActiveSidebarNav('Demand Campaign Planner');
      }
    }
  }, [activeTab]);

  const { theme, realTime, toggleTheme } = useTheme();
  const {
    scenarios,
    activeScenarioId,
    date,
    hour,
    setHour,
    isPlaying,
    setIsPlaying,
    playSpeed,
    setPlaySpeed,
    corridors,
    kpis,
    calendarContext,
    activeScenario: currentScenario,
    sortedCorridors,
    handleLaunchScenario
  } = useTrafficData(selectedLocationId, (newId) => {
    setSelectedLocationId(newId);
  });

  const selectedCorridor = corridors.find(c => c.location_id === selectedLocationId) || null;
  const junctionPerformance = selectedCorridor?.junction_performance;

  const getRecommendedActionForCorridor = (cor: any) => {
    if (!cor) {
      return {
        action: 'Low Risk — No Intervention Needed',
        congestionReducingAction: 'No intervention needed. Corridor conditions are within safe limits.',
        expectedImpact: 'Traffic remains normal and free-flowing.',
        doNothingRisk: 'No immediate congestion risk expected.',
        dataEvidence: 'All speed and volume readings are normal.',
        operatorApprovalRequired: 'No operator action required.',
        reason: 'Monitor corridor conditions. No intervention needed.',
        beforeScore: 0,
        afterScore: 0
      };
    }

    const isStorm = date === '2024-04-16';
    const hasIncident = cor.incident_affected;
    const junction = cor.junction_performance;
    const dos = junction?.degree_of_saturation || 0;
    const delay = junction?.avg_delay_s_per_veh || 0;
    const queue = junction?.avg_queue_veh || 0;
    const pf = junction?.phase_failures || 0;
    const score = cor.congestion_pressure_score;
    const vc = cor.vc_ratio || 0;

    // A. Full demand shift campaign:
    // Storm, flooding, major disruption, or extreme peak pressure (score >= 80)
    const matchFullCampaign = isStorm || score >= 80 || activeScenarioId === 'stress-test-demo';

    // B. Incident flow support:
    // Incident exists, lanes blocked
    const matchIncident = hasIncident;

    // C. Junction congestion amplification:
    // degree_of_saturation is high, delay is high, queue is high, phase failures exist
    const matchJunction = junction && (dos >= 0.70 || delay >= 20 || queue >= 2 || pf > 0);

    // D. Standard demand pressure:
    // Corridor pressure is above normal
    const matchDemandPressure = score >= 40 || activeScenarioId === 'creek-crossing-demo';

    // Build the dynamic, scenario-specific evidence
    const buildEvidence = () => {
      if (date === '2024-04-16') {
        return `Weather telemetry shows active rain and flooding. Roadway visibility is low, triggering multiple incidents. Metro daily ridership shows a significant shift (+18%).`;
      }
      if (activeScenarioId === 'creek-crossing-demo') {
        const altText = cor.location_id === 'GAR_N1' ? "Metro/park-and-ride available. Al Maktoum Bridge lower load." : "Alternate crossings available with lower demand.";
        return `Al Garhoud Bridge demand at ${score}% of safe capacity. ${altText}`;
      }
      if (activeScenarioId === 'signal-delay-demo' || matchJunction) {
        return `Junction ${junction?.junction_id || 'JCT_DEIRA'} degree of saturation is ${(dos * 100).toFixed(0)}%, average delay is ${delay.toFixed(1)}s per vehicle, and queue count reaches ${queue.toFixed(0)} vehicles. Phase failures are active (${pf} detected) under ${junction?.control_type || 'fixed-time'} control.`;
      }
      // AM Peak default
      return `AM peak commute pressure at ${cor.volume_vph} vph. Speed dropped to ${cor.avg_speed_kph} kph (limit: ${cor.speed_limit_kph} kph). V/C ratio: ${vc.toFixed(2)}, travel time index: ${cor.travel_time_index.toFixed(2)}x.`;
    };

    const evidenceText = buildEvidence();

    if (matchFullCampaign) {
      const after = Math.max(15, Math.round(score * 0.85));
      return {
        action: 'Employer Flex + Metro/NOL + Parking Reward Campaign',
        congestionReducingAction: 'Launch employer flex timing, Metro/NOL incentive, and off-peak parking reward to shift demand out of the worst peak window.',
        expectedImpact: `Estimated to shift 8–12% of peak demand to off-peak windows and Metro, reducing commute time by 15–20 minutes.`,
        doNothingRisk: 'Demand will exceed safe capacity, causing severe delays and gridlock.',
        dataEvidence: evidenceText,
        operatorApprovalRequired: 'RTA operator approval required to launch campaign.',
        reason: 'Employer flex campaign with Metro and parking incentives.',
        beforeScore: score,
        afterScore: after
      };
    } else if (matchIncident) {
      const after = Math.max(15, Math.round(score * 0.75));
      return {
        action: 'Incident Flow Support + Metro Shift Incentive',
        congestionReducingAction: 'Coordinate flow support for blocked lanes and incentivize Metro shift during clearance.',
        expectedImpact: `Expected to restore flow within 30 minutes and shift 5–8% of demand to Metro during incident clearance.`,
        doNothingRisk: 'Blocked lanes will cause queues to extend by over 1.5 km and double delay.',
        dataEvidence: evidenceText,
        operatorApprovalRequired: 'RTA operator approval required to coordinate flow support.',
        reason: 'Coordinate flow support and Metro shift incentive.',
        beforeScore: score,
        afterScore: after
      };
    } else if (matchJunction) {
      const after = Math.max(15, Math.round(score * 0.8));
      return {
        action: 'Employer Flex + RTA Flow Support',
        congestionReducingAction: 'Launch employer flex campaign for staggered arrivals and review junction flow support.',
        expectedImpact: `Estimated to reduce junction queue buildup by 10–15% and shift 5–8% of demand to off-peak.`,
        doNothingRisk: 'Junction queues will spill back and amplify demand backup on the corridor.',
        dataEvidence: evidenceText,
        operatorApprovalRequired: 'RTA operator approval required to launch campaign and review flow support.',
        reason: 'Employer flex campaign with junction flow support.',
        beforeScore: score,
        afterScore: after
      };
    } else if (matchDemandPressure) {
      const after = Math.max(15, Math.round(score * 0.8));
      return {
        action: 'Metro/NOL Incentive + Parking Reward',
        congestionReducingAction: 'Incentivize Metro/park-and-ride shift with NOL rewards and off-peak parking discount.',
        expectedImpact: `Estimated to shift 3–5% of demand to Metro and flatten peak by 8–12%.`,
        doNothingRisk: 'Corridor pressure continues to build above safe capacity.',
        dataEvidence: evidenceText,
        operatorApprovalRequired: 'RTA operator approval required to activate incentive campaigns.',
        reason: 'Metro/NOL incentive with parking reward.',
        beforeScore: score,
        afterScore: after
      };
    }

    return {
      action: 'No Shift Needed — Within Operating Target',
      congestionReducingAction: 'Demand is within operating target capacity. No campaign needed.',
      expectedImpact: 'Traffic remains within acceptable levels.',
      doNothingRisk: 'No immediate demand pressure expected.',
      dataEvidence: evidenceText,
      operatorApprovalRequired: 'No operator action required.',
      reason: 'Demand within safe limits.',
      beforeScore: score,
      afterScore: score
    };
  };

  const selectedRecommendation = selectedCorridor 
    ? getRecommendedActionForCorridor(selectedCorridor) 
    : {
        action: 'Low Risk — No Intervention Needed',
        congestionReducingAction: 'No intervention needed. Corridor conditions are within safe limits.',
        expectedImpact: 'Traffic remains normal and free-flowing.',
        doNothingRisk: 'No immediate congestion risk expected.',
        dataEvidence: 'All parameters normal.',
        operatorApprovalRequired: 'No operator action required.',
        reason: 'Monitor corridor conditions. No intervention needed.',
        beforeScore: 0,
        afterScore: 0
      };

  const {
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
  } = useWhatIfSimulator({
    selectedCorridor,
    corridors,
    activeScenario: currentScenario,
    date,
    hour,
    selectedRecommendation
  });

  const {
    briefing,
    setBriefing,
    isGeneratingBrief,
    handleGenerateBriefing
  } = useMistralBriefing({
    selectedCorridor,
    date,
    hour,
    calendarContext,
    selectedRecommendation
  });

  const {
    decisionLog,
    setDecisionLog,
    approvedImpact,
    setApprovedImpact,
    handleOperatorDecision
  } = useOperatorDecision({
    selectedCorridor,
    activeMitigationKey,
    activeScenario: currentScenario,
    date,
    hour,
    corridors,
    alternatives,
    mitigatedData
  });

  const [workflowResponse, setWorkflowResponse] = React.useState<any>(null);
  const [isWorkflowLoading, setIsWorkflowLoading] = React.useState<boolean>(false);
  const [workflowError, setWorkflowError] = React.useState<string | null>(null);

  const handleTriggerWorkflow = async () => {
    if (!selectedCorridor) return;
    setIsWorkflowLoading(true);
    setWorkflowResponse(null);
    setWorkflowError(null);

    const snapshotRisks = sortedCorridors.slice(0, 3).map(c => {
      const rec = getRecommendedActionForCorridor(c);
      return {
        corridor: c.location_name,
        riskScore: c.congestion_pressure_score,
        speedKph: c.avg_speed_kph,
        volumeVph: c.demand_vph,
        delaySec: c.junction_performance?.avg_delay_s_per_veh || 0,
        mainCause: c.incident_affected ? 'Active lane-blocking traffic collision' : 'Peak commuter rush hour volume',
        doNothingRisk: rec.doNothingRisk,
        congestionReducingAction: rec.congestionReducingAction,
        expectedImpact: rec.expectedImpact,
        dataEvidence: rec.dataEvidence,
        operatorApprovalRequired: rec.operatorApprovalRequired,
        actionType: rec.action
      };
    });

    const snapshotActions = sortedCorridors.slice(0, 3).filter(c => c.congestion_pressure_score >= 40).map(c => {
      const rec = getRecommendedActionForCorridor(c);
      return {
        type: rec.action,
        target: c.location_name,
        expectedImpact: rec.expectedImpact,
        confidence: 0.88,
        explanation: rec.congestionReducingAction,
        requiresHumanApproval: true
      };
    });

    if (snapshotActions.length === 0) {
      snapshotActions.push({
        type: 'Operator alert',
        target: 'All sectors',
        expectedImpact: 'Maintain current green timings',
        confidence: 0.95,
        explanation: 'Monitor conditions only. No dynamic prevention overrides active.',
        requiresHumanApproval: true
      });
    }

    const shiftRec = getDemandShiftRecommendation(selectedCorridor, activeScenarioId || '', date, hour);
    const pressure = shiftRec.demandPressure;
    const mixByType: Record<string, number> = {};
    shiftRec.campaignMix.strategies.forEach(s => { mixByType[s.type] = s.tripsToShift; });

    const payload = {
      scenario: currentScenario?.title || 'Peak Congestion Window',
      replayTime: `${String(hour).padStart(2, '0')}:00`,
      networkSpeed: kpis.avgSpeed || 74,
      roadsAtRisk: kpis.highRiskRoads || 0,
      topRisks: snapshotRisks,
      recommendedActions: snapshotActions,
      date,
      hour,
      locationId: selectedLocationId,
      viewMode,
      selectedCorridor: {
        corridorName: selectedCorridor.location_name || `${selectedCorridor.road_name} (${selectedCorridor.direction})`,
        roadName: selectedCorridor.road_name,
        area: selectedCorridor.area || 'business district',
        hour: `${String(hour).padStart(2, '0')}:00`,
        demand: pressure.currentDemand,
        capacity: pressure.capacity,
        safeTarget: pressure.safeTarget,
        excessDemand: pressure.excess,
        requiredShiftPct: pressure.excessPct,
        currentVC: Math.round(pressure.vcRatio * 100) / 100,
        afterVC: shiftRec.beforeAfter.after.vc,
        currentCommuteEstimate: shiftRec.commuteEstimate.currentMin,
        estimatedSaving: shiftRec.beforeAfter.minutesSaved,
        campaignMixValues: {
          employerFlex: mixByType['employer-flex'] || 0,
          metroNol: mixByType['metro-nol'] || 0,
          parkingReward: mixByType['parking-reward'] || 0
        }
      }
    };

    try {
      const res = await fetch('/api/peakflow-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Workflow request failed with status code ${res.status}`);
      }
      const data = await res.json();
      setWorkflowResponse(data);
      showToast("PeakFlow Demand Shift Workflow ran successfully!", "success");
    } catch (err: any) {
      console.error("Error triggering peakflow workflow:", err);
      setWorkflowError(err.message || "Mistral AI Workflow failed.");
      setWorkflowResponse(null);
      showToast(err.message || "Error executing workflow.", "warning");
    } finally {
      setIsWorkflowLoading(false);
    }
  };

  React.useEffect(() => {
    if (timeSelectionMode === 'auto' && selectedCorridor && selectedCorridor.volumeHistory) {
      const candidateHours = [7, 8, 9, 17, 18, 19];
      let maxVol = -1;
      let peakH = 8;
      candidateHours.forEach(h => {
        const vol = selectedCorridor.volumeHistory[h] || 0;
        if (vol > maxVol) {
          maxVol = vol;
          peakH = h;
        }
      });
      if (hour !== peakH) {
        setHour(peakH);
      }
    }
  }, [timeSelectionMode, selectedLocationId, selectedCorridor, hour, setHour]);

  // Re-run the AI workflow only when the selected corridor's *data* is in —
  // depending on hour alone would fire with stale corridor values while the
  // new hour's traffic snapshot is still being fetched.
  React.useEffect(() => {
    setWorkflowResponse(null);
    setWorkflowError(null);
    setBriefing(null);
  }, [selectedLocationId, hour]);

  const triggerDecision = (action: 'approve' | 'reject' | 'review') => {
    handleOperatorDecision(action, setAppliedActions);
    if (selectedCorridor) {
      if (action === 'review') {
        showToast(`Engineering Escalation: Manual review requested for ${selectedCorridor.road_name} (${selectedCorridor.direction}). The operations team has been notified.`, 'warning');
      } else if (action === 'reject') {
        showToast(`Recommendation dismissed for ${selectedCorridor.road_name} (${selectedCorridor.direction}).`, 'info');
      } else if (action === 'approve') {
        showToast(`Campaign draft approved for review on ${selectedCorridor.road_name}. Message packages prepared.`, 'success');
      }
    }
  };

  const triggerCustomDecision = (logText: string) => {
    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      location: selectedLocationId || 'SZR_N1',
      description: logText,
      status: 'APPROVED',
      operator: 'OP-402'
    };
    setDecisionLog(prev => [logEntry, ...prev]);
    if (selectedCorridor) {
      setApprovedImpact({
        beforeScore: selectedCorridor.congestion_pressure_score,
        beforeLevel: selectedCorridor.risk_level,
        approvedAction: 'Custom Demand Campaign',
        expectedImpact: 'Custom campaign intensity applied to corridor.',
        mainReason: 'Operator customized campaign mix.',
        status: 'APPROVED'
      });
    }
  };




  return (
    <div className="app-container">
      <main style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Content Pane */}
        <section className="panel" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-main)' }} id="main-telemetry-content">
          
          {/* View Mode Toggle — always visible */}
          <div className="top-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setViewMode('demo')}
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: viewMode === 'demo' ? '2px solid var(--rta-blue)' : '1px solid var(--border-color)',
                  background: viewMode === 'demo' ? 'rgba(14, 165, 233, 0.1)' : 'var(--bg-card)',
                  color: viewMode === 'demo' ? 'var(--rta-blue)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Live Demo
              </button>
              <button
                onClick={() => setViewMode('planner')}
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: viewMode === 'planner' ? '2px solid var(--rta-blue)' : '1px solid var(--border-color)',
                  background: viewMode === 'planner' ? 'rgba(14, 165, 233, 0.1)' : 'var(--bg-card)',
                  color: viewMode === 'planner' ? 'var(--rta-blue)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Detailed Planner
              </button>

              {/* Time Window Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px', borderLeft: '1px solid var(--border-color)', paddingLeft: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Time Window:</span>
                <select
                  value={timeSelectionMode === 'auto' ? 'auto' : String(hour)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'auto') {
                      setTimeSelectionMode('auto');
                      showToast("Auto mode activated: Selecting highest pressure hour.", "info");
                    } else {
                      setTimeSelectionMode('manual');
                      setHour(parseInt(val, 10));
                      showToast(`Selected peak hour: ${val.padStart(2, '0')}:00`, "info");
                    }
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: 650,
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-title)',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="7">07:00–08:00</option>
                  <option value="8">08:00–09:00</option>
                  <option value="9">09:00–10:00</option>
                  <option value="17">17:00–18:00</option>
                  <option value="18">18:00–19:00</option>
                  <option value="19">19:00–20:00</option>
                  <option value="auto">Auto: Highest Pressure Hour</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

              {/* Dynamic Scenario Time Badge */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '13px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>Scenario Time:</span>{' '}
                <strong style={{ color: 'var(--text-title)', fontWeight: 700 }}>
                  {String(hour % 12 || 12).padStart(2, '0')}:00 {hour >= 12 ? 'PM' : 'AM'}
                </strong>
              </div>
            </div>
          </div>

          {viewMode === 'demo' ? (
            <DemandShiftDecisionScreen
              corridor={selectedCorridor}
              corridors={corridors}
              selectedLocationId={selectedLocationId}
              setSelectedLocationId={setSelectedLocationId}
              onApprove={() => triggerDecision('approve')}
              onReview={() => triggerDecision('review')}
              onDismiss={() => triggerDecision('reject')}
              appliedActions={appliedActions}
              theme={theme}
              workflowResponse={workflowResponse}
              isWorkflowLoading={isWorkflowLoading}
              workflowError={workflowError}
              handleTriggerWorkflow={handleTriggerWorkflow}
              activeScenarioId={activeScenarioId}
              hour={hour}
            />
          ) : (
          <>

          {/* Old Planner Header — only in detailed mode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-title)', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.15 }}>
                  PeakFlow Demand Shift & Flow Support Engine
                </h2>
                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                  AI engine that calculates peak demand pressure and recommends campaigns to flatten congestion.
                </p>
              </div>
            </div>
            
            {/* Simulation Controller Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: 'var(--bg-panel)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>System Simulator Controls</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="status-badge" style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', padding: '0 14px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 600, height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Replay Time: {String(hour).padStart(2, '0')}:00
                </div>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)} 
                  className={`btn-action ${isPlaying ? 'reject' : 'approve'}`}
                  style={{ padding: '0 16px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', borderRadius: '8px', height: '38px', border: 'none' }}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {isPlaying ? 'Pause Feed' : 'Start Feed'}
                </button>
                <button 
                  onClick={() => setHour(h => h >= 23 ? 0 : h + 1)}
                  className="btn-action secondary"
                  style={{ padding: '0 16px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', height: '38px' }}
                >
                  <SkipForward size={14} /> +1 Hr Tick
                </button>
                
                {/* Play Speed selector dropdown */}
                <select 
                  value={playSpeed} 
                  onChange={(e) => setPlaySpeed(Number(e.target.value))}
                  style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0 12px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', height: '38px', display: 'flex', alignItems: 'center' }}
                >
                  <option value={8}>Speed: 8s</option>
                  <option value={4}>Speed: 4s</option>
                  <option value={2}>Speed: 2s</option>
                  <option value={1}>Speed: 1s</option>
                </select>
              </div>
            </div>
          </div>



          <DashboardTabs 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedLocationId={selectedLocationId}
            showToast={showToast}
          />
          <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', borderLeft: '4px solid var(--rta-blue)', padding: '16px 20px', borderRadius: '8px', fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            <strong>Scenario Active:</strong> {activeScenarioId === 'pm-peak-demo' 
              ? `AM peak demand exceeds safe road capacity on ${selectedCorridor ? selectedCorridor.road_name : 'SZR → DIFC / Business Bay'}. PeakFlow calculates the employer flex and incentive mix to flatten the 08:00–09:00 peak.` 
              : activeScenarioId === 'creek-crossing-demo'
              ? `${selectedCorridor ? selectedCorridor.road_name : 'Al Garhoud Bridge'} demand at capacity limit. PeakFlow recommends Metro incentive shift and flow support.`
              : activeScenarioId === 'signal-delay-demo'
              ? `${selectedCorridor ? selectedCorridor.road_name : 'Junction bottleneck'} amplifying demand backup. PeakFlow recommends employer flex and signal flow support.`
              : `Rain event increasing road pressure on ${selectedCorridor ? selectedCorridor.road_name : 'corridors'}. PeakFlow recommends Metro shift incentive and off-peak parking reward.`}
          </div>

          <div className="panel-content" style={{ overflowY: 'visible', paddingTop: 0, flex: 1 }}>
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Demand-Focused KPI Cards */}
                <KpiCards kpis={kpis} hour={hour} selectedCorridor={selectedCorridor} activeScenarioId={activeScenarioId} />

                {/* Before vs After Hero Card */}
                <DemandShiftHero 
                  corridor={selectedCorridor}
                  activeScenarioId={activeScenarioId}
                  onApprove={() => triggerDecision('approve')}
                  onReview={() => triggerDecision('review')}
                  onDismiss={() => triggerDecision('reject')}
                />

                {/* Corridor Demand Pressure Ranking */}
                <TrafficRiskTable 
                  sortedCorridors={sortedCorridors}
                  selectedLocationId={selectedLocationId}
                  setSelectedLocationId={setSelectedLocationId}
                  activeScenarioId={activeScenarioId}
                  showTooltip={showTooltip}
                  setShowTooltip={setShowTooltip}
                  getRecommendedActionForCorridor={getRecommendedActionForCorridor}
                />
              </div>
            )}

            <div style={{ display: activeTab === 'map' ? 'block' : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <LiveMapTab 
                  corridors={corridors}
                  selectedLocationId={selectedLocationId}
                  setSelectedLocationId={setSelectedLocationId}
                  setActiveTab={setActiveTab}
                  theme={theme}
                  appliedActions={appliedActions}
                  activeTab={activeTab}
                />
              </div>
            </div>

            {activeTab === 'forecast' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <DemandCampaignPlanner
                  corridor={selectedCorridor}
                  activeScenarioId={activeScenarioId}
                  onApprove={triggerCustomDecision}
                  showToast={showToast}
                  workflowResponse={workflowResponse}
                  isWorkflowLoading={isWorkflowLoading}
                  handleTriggerWorkflow={handleTriggerWorkflow}
                />
              </div>
            )}

            {activeTab === 'briefing' && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: (approvedImpact || decisionLog.length > 0) ? '1.2fr 0.8fr' : '1fr', 
                gap: '20px' 
              }} className="demo-briefing-grid">
                <div>
                  <AiBriefingPanel 
                    briefing={briefing}
                    isGeneratingBrief={isGeneratingBrief}
                    handleGenerateBriefing={handleGenerateBriefing}
                    selectedCorridor={selectedCorridor}
                    activeScenarioId={activeScenarioId}
                    handleOperatorDecision={triggerDecision}
                    formatBriefField={formatBriefField}
                    buildSafeSituationSummary={buildSafeSituationSummary}
                    activeMitigationKey={activeMitigationKey}
                    mitigatedData={mitigatedData}
                    workflowResponse={workflowResponse}
                    isWorkflowLoading={isWorkflowLoading}
                    workflowError={workflowError}
                    handleTriggerWorkflow={handleTriggerWorkflow}
                    selectedRecommendation={selectedRecommendation}
                    hour={hour}
                  />
                </div>
                {(approvedImpact || decisionLog.length > 0) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <PreventionImpactSummary approvedImpact={approvedImpact} />
                    <OperatorDecisionLog decisionLog={decisionLog} />
                  </div>
                )}
              </div>
            )}
          </div>
          </>
          )}
        </section>
      </main>

      {/* Custom Toast Notification */}
      {toast && (
        <div 
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'var(--bg-card)',
            backdropFilter: 'blur(8px)',
            borderLeft: toast.type === 'success' ? '4px solid #22c55e' : toast.type === 'warning' ? '4px solid #f59e0b' : '4px solid var(--rta-blue)',
            borderTop: '1px solid var(--border-color)',
            borderRight: '1px solid var(--border-color)',
            borderBottom: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '16px 20px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            maxWidth: '420px',
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{ flex: 1, fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {toast.message}
          </div>
          <button 
            onClick={() => setToast(null)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-secondary)', 
              cursor: 'pointer', 
              fontSize: '18px',
              fontWeight: 700,
              padding: '0 4px',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
