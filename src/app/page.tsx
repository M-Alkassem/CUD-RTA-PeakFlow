'use client';

import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  Compass,
  Train,
  Sliders,
  Zap,
  Activity,
  History
} from 'lucide-react';

import { useTheme } from './hooks/useTheme';
import { useTrafficData } from './hooks/useTrafficData';
import { useMapPanZoom } from './hooks/useMapPanZoom';
import { useWhatIfSimulator } from './hooks/useWhatIfSimulator';
import { useMistralBriefing } from './hooks/useMistralBriefing';
import { useOperatorDecision } from './hooks/useOperatorDecision';

import { Header } from './components/Header';
import { ControlSidebar } from './components/ControlSidebar';
import { WorkflowStepper } from './components/WorkflowStepper';
import { DashboardTabs } from './components/DashboardTabs';
import { KpiCards } from './components/KpiCards';
import { TrafficRiskTable } from './components/TrafficRiskTable';
import { RoadNetworkMap } from './components/RoadNetworkMap';
import { CorridorDetails } from './components/CorridorDetails';
import { AiBriefingPanel } from './components/AiBriefingPanel';
import { PreventionImpactSummary } from './components/PreventionImpactSummary';
import { OperatorDecisionLog } from './components/OperatorDecisionLog';

import { formatBriefField } from './lib/briefingFormatters';
import { buildSafeSituationSummary } from './lib/risk';
import { ActiveTab } from './lib/types';

export default function Page() {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>('SZR_S1');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [showTooltip, setShowTooltip] = useState(false);

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
    activeScenario,
    sortedCorridors,
    handleLaunchScenario
  } = useTrafficData((newId) => {
    setSelectedLocationId(newId);
  });

  const selectedCorridor = corridors.find(c => c.location_id === selectedLocationId) || null;
  const junctionPerformance = selectedCorridor?.junction_performance;

  const getRecommendedActionForCorridor = (cor: any) => {
    if (!cor) return { action: 'Monitor conditions', reason: 'Normal flow detected.' };

    const isStorm = date === '2024-04-16';
    const hasIncident = cor.incident_affected;
    const hasSignalSaturation = cor.junction_performance?.degree_of_saturation > 0.9;
    const isFixedSignal = cor.junction_performance?.control_type === 'Fixed-time';

    if (isStorm) {
      return {
        action: 'Official roadside advisory + incident response',
        reason: 'Severe rain and flooding event. Deploy active emergency responders to flooded exits and advise public transport shift.'
      };
    }

    if (activeScenarioId === 'creek-crossing-demo' && cor.location_id === 'GAR_N1') {
      const mak = corridors.find(c => c.location_id === 'MAK_N1');
      const bbc = corridors.find(c => c.location_id === 'BBC_S1');
      const makRisk = mak ? mak.congestion_pressure_score : 100;
      const bbcRisk = bbc ? bbc.congestion_pressure_score : 100;
      
      if (cor.congestion_pressure_score > makRisk || cor.congestion_pressure_score > bbcRisk) {
        const targetCrossing = bbcRisk <= makRisk ? 'Business Bay Crossing' : 'Al Maktoum Bridge';
        return {
          action: `Route advisory to ${targetCrossing}`,
          reason: `Al Garhoud Bridge is congested (${cor.congestion_pressure_score}/100). Divert outbound flow to the lower-risk crossing: ${targetCrossing}.`
        };
      }
    }

    if (hasIncident) {
      if (hasSignalSaturation) {
        return {
          action: 'Signal timing review',
          reason: 'Active collision causing approach delays and signal saturation. Modify green timings at adjacent Defence intersection.'
        };
      }
      return {
        action: 'Incident response + route advisory',
        reason: 'Incident lanes blocked. Deploy emergency road patrol team and publish dynamic route rerouting via official roadside signs.'
      };
    }

    if (hasSignalSaturation || (isFixedSignal && cor.congestion_pressure_score >= 65)) {
      return {
        action: 'Signal timing review',
        reason: 'Intersection approach saturated. Revise static plans and add green timing splits to clear approach bottlenecks.'
      };
    }

    if (cor.vc_ratio > 0.9) {
      return {
        action: 'Route advisory',
        reason: 'Corridor demand exceeds 90% of structural capacity. Reroute outbound flow to adjacent expressways.'
      };
    }

    if (cor.congestion_pressure_score >= 60 && hour >= 17 && hour <= 19) {
      return {
        action: 'Public transport advisory',
        reason: 'Saturated PM outbound commuter flow. Advise public transport modal shift via official pre-trip mobility updates.'
      };
    }

    return {
      action: 'Monitor conditions',
      reason: 'Traffic parameters remain within normal design thresholds.'
    };
  };

  const selectedRecommendation = selectedCorridor 
    ? getRecommendedActionForCorridor(selectedCorridor) 
    : { action: 'Monitor conditions', reason: 'Normal flow detected.' };

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
    activeScenario,
    date,
    hour,
    selectedRecommendation
  });

  const {
    briefing,
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
    approvedImpact,
    handleOperatorDecision
  } = useOperatorDecision({
    selectedCorridor,
    activeMitigationKey,
    activeScenario,
    date,
    hour,
    corridors,
    alternatives,
    mitigatedData
  });

  const mapPanZoom = useMapPanZoom({
    selectedLocationId,
    activeScenario
  });

  const triggerDecision = (action: 'approve' | 'reject' | 'review') => {
    handleOperatorDecision(action, setAppliedActions);
  };

  return (
    <div className="app-container">
      <Header 
        realTime={realTime} 
        activeScenario={activeScenario} 
        theme={theme} 
        toggleTheme={toggleTheme} 
      />

      <main className="dashboard-grid">
        <ControlSidebar 
          scenarios={scenarios} 
          activeScenarioId={activeScenarioId} 
          handleLaunchScenario={handleLaunchScenario} 
        />

        <section className="panel" style={{ overflowY: 'auto' }} id="main-telemetry-content">
          <div className="alert-bar" id="story-banner">
            Analyze traffic data, identify congestion before it becomes critical, compare prevention options, and generate an AI operator briefing.
          </div>

          <WorkflowStepper 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedLocationId={selectedLocationId}
            mitigations={mitigations}
            briefing={briefing}
          />

          <DashboardTabs 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedLocationId={selectedLocationId}
          />

          <div style={{ background: '#EBF5FF', borderLeft: '4px solid var(--rta-blue)', padding: '12px', borderRadius: '4px', margin: '0 14px 12px 14px', fontSize: '11.5px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
            <strong>Operational View Active:</strong> {activeScenarioId === 'pm-peak-demo' 
              ? 'PM peak pressure is building. The system ranks the highest-risk roads and recommends prevention actions before congestion becomes critical.' 
              : activeScenarioId === 'creek-crossing-demo'
              ? 'Garhoud Bridge is heavily congested. The system compares crossing risks and recommends rerouting to lower-risk bridges.'
              : activeScenarioId === 'signal-delay-demo'
              ? 'Adaptive signal reviews active. Review fixed-time signal programs at Deira to adjust splits and clear approaches.'
              : 'Stress testing city-wide response. Massive volume shifts from flooded roads to Metro transit routes.'}
          </div>

          <div className="panel-content" style={{ overflowY: 'visible', paddingTop: 0 }}>
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                <div className="detail-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)} 
                      className={`btn-action ${isPlaying ? 'reject' : 'approve'}`}
                      style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                      {isPlaying ? 'Pause Feed' : 'Start Feed'}
                    </button>
                    <button 
                      onClick={() => setHour(h => h >= 23 ? 0 : h + 1)}
                      className="btn-action secondary"
                      style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <SkipForward size={12} /> +1 Hr Tick
                    </button>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Speed: <span style={{ fontWeight: 600 }}>{playSpeed}s/sim-hour</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={playSpeed}
                    onChange={(e) => setPlaySpeed(Number(e.target.value))}
                    title="Playback Interval Speed"
                    style={{ width: '100px', cursor: 'pointer' }}
                  />
                </div>

                <KpiCards kpis={kpis} hour={hour} />

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

            {activeTab === 'map' && (
              <div style={{ marginTop: '10px' }}>
                <RoadNetworkMap 
                  {...mapPanZoom}
                  corridors={corridors}
                  selectedLocationId={selectedLocationId}
                  setSelectedLocationId={setSelectedLocationId}
                />
              </div>
            )}

            {activeTab === 'forecast' && (
              <div style={{ marginTop: '10px' }}>
                <CorridorDetails 
                  selectedCorridor={selectedCorridor}
                  selectedLocationId={selectedLocationId}
                  appliedActions={appliedActions}
                  mitigatedData={mitigatedData}
                  activeScenarioId={activeScenarioId}
                  corridors={corridors}
                  setSelectedLocationId={setSelectedLocationId}
                  alternatives={alternatives}
                  junctionPerformance={junctionPerformance}
                />
              </div>
            )}

            {activeTab === 'whatif' && (
              <div style={{ marginTop: '10px' }}>
                {selectedLocationId && selectedCorridor ? (
                  <div className="hotspot-detail-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    <div className="detail-card" id="section-e-whatif" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="kpi-title">What-If Prevention Simulator</span>
                        {appliedActions[selectedLocationId] && (
                          <span className="badge-risk low" style={{ fontSize: '8px' }}>Action split active</span>
                        )}
                      </div>

                      <div className="recommend-badge" style={{ marginBottom: '2px' }}>
                        Recommended Option: {selectedRecommendation.action}
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.35, marginBottom: '6px' }}>
                        {selectedRecommendation.reason}
                      </p>

                      <div className="mitigation-stack">
                        {/* Option 1: Route Advisory */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'route-advisory' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'route-advisory' ? 'active' : ''} ${recommendedSimKey === 'route-advisory' ? 'recommended-row' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="radio"
                                name="mitigation"
                                checked={activeMitigationKey === 'route-advisory'}
                                onChange={() => {}}
                              />
                              <div>
                                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-title)' }}>
                                  <Compass size={12} className="text-primary" /> Route Advisory
                                  {recommendedSimKey === 'route-advisory' && <span className="recommend-badge" style={{ fontSize: '7px', margin: 0 }}>Recommended</span>}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Diverts incoming volume to alternative bridges using signs.
                                </div>
                              </div>
                            </div>
                          </div>
                          {activeMitigationKey === 'route-advisory' && routeImpact && (
                            <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                                Projection Impact: <strong style={{ color: routeImpact.applicable ? 'var(--color-low)' : 'var(--text-primary)' }}>{routeImpact.reason}</strong>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', fontSize: '9.5px', marginTop: '2px' }}>
                                <div className="telemetry-item" style={{ padding: '4px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '8px' }}>After Score</div>
                                  <div className="telemetry-val" style={{ fontSize: '10.5px' }}>{routeImpact.afterRisk} ({routeImpact.afterLevel})</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '4px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '8px' }}>Speed delta</div>
                                  <div className="telemetry-val" style={{ fontSize: '10.5px', color: 'var(--color-low)' }}>+{routeImpact.speedDeltaKph} kph</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '4px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '8px' }}>Demand shift</div>
                                  <div className="telemetry-val" style={{ fontSize: '10.5px', color: 'var(--color-low)' }}>{routeImpact.volumeDeltaVph} vph</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Option 2: Signal Split */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'signal-timing' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'signal-timing' ? 'active' : ''} ${recommendedSimKey === 'signal-timing' ? 'recommended-row' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="radio"
                                name="mitigation"
                                checked={activeMitigationKey === 'signal-timing'}
                                onChange={() => {}}
                              />
                              <div>
                                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-title)' }}>
                                  <Sliders size={12} className="text-primary" /> Signal Timing Review
                                  {recommendedSimKey === 'signal-timing' && <span className="recommend-badge" style={{ fontSize: '7px', margin: 0 }}>Recommended</span>}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Alters green timing split profiles at Defence intersection approaches.
                                </div>
                              </div>
                            </div>
                          </div>
                          {activeMitigationKey === 'signal-timing' && signalImpact && (
                            <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                                Projection Impact: <strong style={{ color: signalImpact.applicable ? 'var(--color-low)' : 'var(--text-primary)' }}>{signalImpact.reason}</strong>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', fontSize: '9.5px', marginTop: '2px' }}>
                                <div className="telemetry-item" style={{ padding: '4px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '8px' }}>After Score</div>
                                  <div className="telemetry-val" style={{ fontSize: '10.5px' }}>{signalImpact.afterRisk} ({signalImpact.afterLevel})</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '4px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '8px' }}>Delay delta</div>
                                  <div className="telemetry-val" style={{ fontSize: '10.5px', color: 'var(--color-low)' }}>{signalImpact.delayDeltaSeconds}s / veh</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '4px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '8px' }}>Approach speed</div>
                                  <div className="telemetry-val" style={{ fontSize: '10.5px', color: 'var(--color-low)' }}>+{signalImpact.speedDeltaKph} kph</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Option 3: Public Transport */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'metro-riders' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'metro-riders' ? 'active' : ''} ${recommendedSimKey === 'metro-riders' ? 'recommended-row' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="radio"
                                name="mitigation"
                                checked={activeMitigationKey === 'metro-riders'}
                                onChange={() => {}}
                              />
                              <div>
                                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-title)' }}>
                                  <Train size={12} className="text-primary" /> Public Transport Advisory
                                  {recommendedSimKey === 'metro-riders' && <span className="recommend-badge" style={{ fontSize: '7px', margin: 0 }}>Recommended</span>}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Publishes app alerts advising metro ridership split updates.
                                </div>
                              </div>
                            </div>
                          </div>
                          {activeMitigationKey === 'metro-riders' && metroImpact && (
                            <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                                Projection Impact: <strong style={{ color: 'var(--color-low)' }}>{metroImpact.reason}</strong>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', fontSize: '9.5px', marginTop: '2px' }}>
                                <div className="telemetry-item" style={{ padding: '4px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '8px' }}>After Score</div>
                                  <div className="telemetry-val" style={{ fontSize: '10.5px' }}>{metroImpact.afterRisk} ({metroImpact.afterLevel})</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '4px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '8px' }}>Speed delta</div>
                                  <div className="telemetry-val" style={{ fontSize: '10.5px', color: 'var(--color-low)' }}>+{metroImpact.speedDeltaKph} kph</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '4px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '8px' }}>Volume shift</div>
                                  <div className="telemetry-val" style={{ fontSize: '10.5px', color: 'var(--color-low)' }}>{metroImpact.volumeDeltaVph} vph</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Option 4: Salik pricing shift */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'salik-shift' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'salik-shift' ? 'active' : ''} ${recommendedSimKey === 'salik-shift' ? 'recommended-row' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="radio"
                                name="mitigation"
                                checked={activeMitigationKey === 'salik-shift'}
                                onChange={() => {}}
                              />
                              <div>
                                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-title)' }}>
                                  <Sliders size={12} className="text-primary" /> Off-Peak Demand Shift
                                  {recommendedSimKey === 'salik-shift' && <span className="recommend-badge" style={{ fontSize: '7px', margin: 0 }}>Recommended</span>}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Advertises dynamic pricing shifts to clear congestion timings.
                                </div>
                              </div>
                            </div>
                          </div>
                          {activeMitigationKey === 'salik-shift' && salikImpact && (
                            <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                                Projection Impact: <strong style={{ color: 'var(--color-low)' }}>{salikImpact.reason}</strong>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', fontSize: '9.5px', marginTop: '2px' }}>
                                <div className="telemetry-item" style={{ padding: '4px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '8px' }}>After Score</div>
                                  <div className="telemetry-val" style={{ fontSize: '10.5px' }}>{salikImpact.afterRisk} ({salikImpact.afterLevel})</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '4px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '8px' }}>Speed delta</div>
                                  <div className="telemetry-val" style={{ fontSize: '10.5px', color: 'var(--color-low)' }}>+{salikImpact.speedDeltaKph} kph</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '4px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '8px' }}>Volume shift</div>
                                  <div className="telemetry-val" style={{ fontSize: '10.5px', color: 'var(--color-low)' }}>{salikImpact.volumeDeltaVph} vph</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Option 5: Incident patrol responders */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'incident-response' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'incident-response' ? 'active' : ''} ${recommendedSimKey === 'incident-response' ? 'recommended-row' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="radio"
                                name="mitigation"
                                checked={activeMitigationKey === 'incident-response'}
                                onChange={() => {}}
                              />
                              <div>
                                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-title)' }}>
                                  <Zap size={12} className="text-primary" /> Incident Response
                                  {recommendedSimKey === 'incident-response' && <span className="recommend-badge" style={{ fontSize: '7px', margin: 0 }}>Recommended</span>}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Dispatches RTA emergency patrol units to clear blocked lanes.
                                </div>
                              </div>
                            </div>
                          </div>
                          {activeMitigationKey === 'incident-response' && incidentImpact && (
                            <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                                Projection Impact: <strong style={{ color: incidentImpact.applicable ? 'var(--color-low)' : 'var(--text-primary)' }}>{incidentImpact.reason}</strong>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', fontSize: '9.5px', marginTop: '2px' }}>
                                <div className="telemetry-item" style={{ padding: '4px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '8px' }}>After Score</div>
                                  <div className="telemetry-val" style={{ fontSize: '10.5px' }}>{incidentImpact.afterRisk} ({incidentImpact.afterLevel})</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '4px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '8px' }}>Speed delta</div>
                                  <div className="telemetry-val" style={{ fontSize: '10.5px', color: 'var(--color-low)' }}>+{incidentImpact.speedDeltaKph} kph</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '4px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '8px' }}>Road status</div>
                                  <div className="telemetry-val" style={{ fontSize: '10.5px', color: 'var(--color-low)' }}>Quick clear</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Option 6: Monitor Only */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'monitor' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'monitor' ? 'active' : ''} ${recommendedSimKey === 'monitor' ? 'recommended-row' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="radio"
                                name="mitigation"
                                checked={activeMitigationKey === 'monitor'}
                                onChange={() => {}}
                              />
                              <div>
                                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-title)' }}>
                                  <Activity size={12} className="text-primary" /> Monitor Only
                                  {recommendedSimKey === 'monitor' && <span className="recommend-badge" style={{ fontSize: '7px', margin: 0 }}>Recommended</span>}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  No dynamic actions are deployed at this time.
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    No corridor selected.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'briefing' && (
              <div style={{ marginTop: '10px' }}>
                <AiBriefingPanel 
                  briefing={briefing}
                  isGeneratingBrief={isGeneratingBrief}
                  handleGenerateBriefing={handleGenerateBriefing}
                  selectedCorridor={selectedCorridor}
                  handleOperatorDecision={triggerDecision}
                  formatBriefField={formatBriefField}
                  buildSafeSituationSummary={buildSafeSituationSummary}
                />
              </div>
            )}
          </div>
        </section>

        {/* Column 3: Copilot Briefings & Approval (Width Adjusted) */}
        <section className="panel" id="panel-briefing-outer" style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
          <div className="panel-header">
            <h2 className="panel-title">
              <History size={14} className="text-muted" /> Operations Room Logs
            </h2>
          </div>
          <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {activeTab === 'overview' && (
              <OperatorDecisionLog decisionLog={decisionLog} />
            )}

            {activeTab === 'map' && (
              <TrafficRiskTable 
                sortedCorridors={sortedCorridors}
                selectedLocationId={selectedLocationId}
                setSelectedLocationId={setSelectedLocationId}
                activeScenarioId={activeScenarioId}
                showTooltip={showTooltip}
                setShowTooltip={setShowTooltip}
                getRecommendedActionForCorridor={getRecommendedActionForCorridor}
                showInfoFooter={false}
              />
            )}

            {activeTab === 'forecast' && (
              <>
                {selectedLocationId && selectedCorridor ? (
                  <div className="detail-card animate-fade-in" style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-title)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '8px' }}>
                      Explainable AI Forecast
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Predictive Window:</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>Next 30–60 Minutes</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>AI Confidence Level:</div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--rta-blue)' }}>{selectedCorridor.forecast?.forecast_confidence}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Contributing Factors:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {selectedCorridor.forecast?.topContributingFeatures?.map((f: string, idx: number) => (
                            <span key={idx} className="cause-tag" style={{ background: 'var(--rta-blue-bg)', color: 'var(--rta-blue)', border: '1px solid var(--rta-blue-border)', fontSize: '8.5px', padding: '2px 6px' }}>
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    No corridor selected.
                  </div>
                )}
              </>
            )}

            {activeTab === 'whatif' && (
              <>
                {mitigatedData && (
                  <div className="detail-card animate-fade-in" style={{ padding: '12px', background: 'var(--rta-blue-bg)', border: '1px solid var(--rta-blue-border)', borderLeft: '3px solid var(--rta-blue)', borderLeftWidth: '3px' }}>
                    <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-title)', marginBottom: '4px' }}>
                      Mitigated Scenario Target
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      Applying **{activeMitigationKey}** is projected to reduce the corridor congestion score to <span style={{ color: 'var(--color-low)', fontWeight: 700 }}>{mitigatedData.score} ({mitigatedData.level})</span>.
                    </div>
                  </div>
                )}
                <OperatorDecisionLog decisionLog={decisionLog} />
              </>
            )}

            {activeTab === 'briefing' && (
              <>
                <PreventionImpactSummary approvedImpact={approvedImpact} />
                <OperatorDecisionLog decisionLog={decisionLog} />
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
