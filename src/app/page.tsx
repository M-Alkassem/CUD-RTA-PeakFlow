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
  Activity
} from 'lucide-react';

import { useTheme } from './hooks/useTheme';
import { useTrafficData } from './hooks/useTrafficData';
import { useMapPanZoom } from './hooks/useMapPanZoom';
import { useWhatIfSimulator } from './hooks/useWhatIfSimulator';
import { useMistralBriefing } from './hooks/useMistralBriefing';
import { useOperatorDecision } from './hooks/useOperatorDecision';

import { ControlSidebar } from './components/ControlSidebar';
import { DashboardTabs } from './components/DashboardTabs';
import { KpiCards } from './components/KpiCards';
import { TrafficRiskTable } from './components/TrafficRiskTable';
import { LiveMapTab } from './components/LiveMapTab';
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
      <main className="dashboard-grid" style={{ height: '100vh', display: 'grid', gridTemplateColumns: '320px 1fr' }}>
        {/* Left Sidebar only for scenario selection */}
        <ControlSidebar 
          scenarios={scenarios} 
          activeScenarioId={activeScenarioId} 
          handleLaunchScenario={handleLaunchScenario} 
          realTime={realTime}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        {/* Content Pane */}
        <section className="panel" style={{ overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }} id="main-telemetry-content">
          <div className="alert-bar" id="story-banner" style={{ fontSize: '16px', padding: '12px 16px', fontWeight: 500 }}>
            Analyze traffic data, identify congestion before it becomes critical, compare prevention options, and generate an AI operator briefing.
          </div>

          <DashboardTabs 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedLocationId={selectedLocationId}
          />

          <div style={{ background: '#EBF5FF', borderLeft: '4px solid var(--rta-blue)', padding: '16px', borderRadius: '6px', fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
            <strong>Operational View Active:</strong> {activeScenarioId === 'pm-peak-demo' 
              ? 'PM peak pressure is building. The system ranks the highest-risk roads and recommends prevention actions before congestion becomes critical.' 
              : activeScenarioId === 'creek-crossing-demo'
              ? 'Garhoud Bridge is heavily congested. The system compares crossing risks and recommends rerouting to lower-risk bridges.'
              : activeScenarioId === 'signal-delay-demo'
              ? 'Adaptive signal reviews active. Review fixed-time signal programs at Deira to adjust splits and clear approaches.'
              : 'Stress testing city-wide response. Massive volume shifts from flooded roads to Metro transit routes.'}
          </div>

          <div className="panel-content" style={{ overflowY: 'visible', paddingTop: 0, flex: 1 }}>
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Clock Replay Controls */}
                <div className="detail-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)} 
                      className={`btn-action ${isPlaying ? 'reject' : 'approve'}`}
                      style={{ padding: '8px 16px', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                      {isPlaying ? 'Pause Feed' : 'Start Feed'}
                    </button>
                    <button 
                      onClick={() => setHour(h => h >= 23 ? 0 : h + 1)}
                      className="btn-action secondary"
                      style={{ padding: '8px 16px', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <SkipForward size={14} /> +1 Hr Tick
                    </button>
                    <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                      Speed: <span style={{ fontWeight: 600 }}>{playSpeed}s/sim-hour</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={playSpeed}
                    onChange={(e) => setPlaySpeed(Number(e.target.value))}
                    title="Playback Speed"
                    style={{ width: '120px', cursor: 'pointer' }}
                  />
                </div>

                {/* KPI Metrics Group */}
                <KpiCards kpis={kpis} hour={hour} />

                {/* Hotspot Ranking Table */}
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
              <LiveMapTab 
                corridors={corridors}
                selectedLocationId={selectedLocationId}
                setSelectedLocationId={setSelectedLocationId}
                setActiveTab={setActiveTab}
                theme={theme}
                appliedActions={appliedActions}
              />
            )}

            {activeTab === 'forecast' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="demo-forecast-actions-grid">
                {/* Left side: Telemetry details */}
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-title)' }}>
                    Corridor Live Metrics
                  </div>
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

                {/* Right side: AI Forecast + Simulator */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Explainable AI Forecast details */}
                  {selectedLocationId && selectedCorridor?.forecast && (
                    <div className="detail-card animate-fade-in" style={{ padding: '20px' }}>
                      <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-title)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px' }}>
                        Explainable AI Forecast
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Predictive Window:</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Next 30–60 Minutes</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>AI Confidence Level:</span>
                          <span style={{ fontWeight: 700, color: 'var(--rta-blue)' }}>{selectedCorridor.forecast.forecast_confidence}%</span>
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Top Contributing Factors:</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {selectedCorridor.forecast.topContributingFeatures.map((f: string, idx: number) => (
                              <span key={idx} className="cause-tag" style={{ background: 'var(--rta-blue-bg)', color: 'var(--rta-blue)', border: '1px solid var(--rta-blue-border)', fontSize: '13px', padding: '4px 10px', borderRadius: '4px' }}>
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* What-If Simulator */}
                  {selectedLocationId && selectedCorridor ? (
                    <div className="detail-card" id="section-e-whatif" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="kpi-title" style={{ fontSize: '18px', fontWeight: 700 }}>What-If Prevention Simulator</span>
                        {appliedActions[selectedLocationId] && (
                          <span className="badge-risk low" style={{ fontSize: '12px', padding: '2px 8px' }}>Action split active</span>
                        )}
                      </div>

                      <div className="recommend-badge" style={{ marginBottom: '4px', fontSize: '14px', padding: '6px 12px' }}>
                        Recommended Option: {selectedRecommendation.action}
                      </div>
                      <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '8px' }}>
                        {selectedRecommendation.reason}
                      </p>

                      <div className="mitigation-stack" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Option 1: Route Advisory */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'route-advisory' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'route-advisory' ? 'active' : ''} ${recommendedSimKey === 'route-advisory' ? 'recommended-row' : ''}`}
                          style={{ padding: '12px', cursor: 'pointer', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="radio"
                              name="mitigation"
                              checked={activeMitigationKey === 'route-advisory'}
                              onChange={() => {}}
                              style={{ width: '16px', height: '16px' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-title)', fontSize: '15px' }}>
                                <Compass size={14} className="text-primary" /> Route Advisory
                                {recommendedSimKey === 'route-advisory' && <span className="recommend-badge" style={{ fontSize: '11px', margin: 0, padding: '2px 6px' }}>Recommended</span>}
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Diverts incoming volume to alternative bridges using signs.
                              </div>
                            </div>
                          </div>
                          {activeMitigationKey === 'route-advisory' && routeImpact && (
                            <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Projection Impact: <strong style={{ color: routeImpact.applicable ? 'var(--color-low)' : 'var(--text-primary)' }}>{routeImpact.reason}</strong>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13px', marginTop: '4px' }}>
                                <div className="telemetry-item" style={{ padding: '6px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '11px' }}>After Score</div>
                                  <div className="telemetry-val" style={{ fontSize: '14px', fontWeight: 700 }}>{routeImpact.afterRisk} ({routeImpact.afterLevel})</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '6px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '11px' }}>Speed delta</div>
                                  <div className="telemetry-val" style={{ fontSize: '14px', color: 'var(--color-low)', fontWeight: 700 }}>+{routeImpact.speedDeltaKph} kph</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '6px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '11px' }}>Demand shift</div>
                                  <div className="telemetry-val" style={{ fontSize: '14px', color: 'var(--color-low)', fontWeight: 700 }}>{routeImpact.volumeDeltaVph} vph</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Option 2: Signal Split */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'signal-timing' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'signal-timing' ? 'active' : ''} ${recommendedSimKey === 'signal-timing' ? 'recommended-row' : ''}`}
                          style={{ padding: '12px', cursor: 'pointer', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="radio"
                              name="mitigation"
                              checked={activeMitigationKey === 'signal-timing'}
                              onChange={() => {}}
                              style={{ width: '16px', height: '16px' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-title)', fontSize: '15px' }}>
                                <Sliders size={14} className="text-primary" /> Signal Timing Review
                                {recommendedSimKey === 'signal-timing' && <span className="recommend-badge" style={{ fontSize: '11px', margin: 0, padding: '2px 6px' }}>Recommended</span>}
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Alters green timing split profiles at Defence intersection approaches.
                              </div>
                            </div>
                          </div>
                          {activeMitigationKey === 'signal-timing' && signalImpact && (
                            <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Projection Impact: <strong style={{ color: signalImpact.applicable ? 'var(--color-low)' : 'var(--text-primary)' }}>{signalImpact.reason}</strong>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13px', marginTop: '4px' }}>
                                <div className="telemetry-item" style={{ padding: '6px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '11px' }}>After Score</div>
                                  <div className="telemetry-val" style={{ fontSize: '14px', fontWeight: 700 }}>{signalImpact.afterRisk} ({signalImpact.afterLevel})</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '6px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '11px' }}>Delay delta</div>
                                  <div className="telemetry-val" style={{ fontSize: '14px', color: 'var(--color-low)', fontWeight: 700 }}>{signalImpact.delayDeltaSeconds}s / veh</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '6px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '11px' }}>Approach speed</div>
                                  <div className="telemetry-val" style={{ fontSize: '14px', color: 'var(--color-low)', fontWeight: 700 }}>+{signalImpact.speedDeltaKph} kph</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Option 3: Metro riders */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'metro-riders' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'metro-riders' ? 'active' : ''} ${recommendedSimKey === 'metro-riders' ? 'recommended-row' : ''}`}
                          style={{ padding: '12px', cursor: 'pointer', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="radio"
                              name="mitigation"
                              checked={activeMitigationKey === 'metro-riders'}
                              onChange={() => {}}
                              style={{ width: '16px', height: '16px' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-title)', fontSize: '15px' }}>
                                <Train size={14} className="text-primary" /> Public Transport Advisory
                                {recommendedSimKey === 'metro-riders' && <span className="recommend-badge" style={{ fontSize: '11px', margin: 0, padding: '2px 6px' }}>Recommended</span>}
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Publishes app alerts advising metro ridership split updates.
                              </div>
                            </div>
                          </div>
                          {activeMitigationKey === 'metro-riders' && metroImpact && (
                            <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Projection Impact: <strong style={{ color: 'var(--color-low)' }}>{metroImpact.reason}</strong>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13px', marginTop: '4px' }}>
                                <div className="telemetry-item" style={{ padding: '6px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '11px' }}>After Score</div>
                                  <div className="telemetry-val" style={{ fontSize: '14px', fontWeight: 700 }}>{metroImpact.afterRisk} ({metroImpact.afterLevel})</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '6px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '11px' }}>Speed delta</div>
                                  <div className="telemetry-val" style={{ fontSize: '14px', color: 'var(--color-low)', fontWeight: 700 }}>+{metroImpact.speedDeltaKph} kph</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '6px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '11px' }}>Volume shift</div>
                                  <div className="telemetry-val" style={{ fontSize: '14px', color: 'var(--color-low)', fontWeight: 700 }}>{metroImpact.volumeDeltaVph} vph</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Option 4: Salik pricing dynamic pricing shift */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'salik-shift' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'salik-shift' ? 'active' : ''} ${recommendedSimKey === 'salik-shift' ? 'recommended-row' : ''}`}
                          style={{ padding: '12px', cursor: 'pointer', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="radio"
                              name="mitigation"
                              checked={activeMitigationKey === 'salik-shift'}
                              onChange={() => {}}
                              style={{ width: '16px', height: '16px' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-title)', fontSize: '15px' }}>
                                <Sliders size={14} className="text-primary" /> Off-Peak Demand Shift
                                {recommendedSimKey === 'salik-shift' && <span className="recommend-badge" style={{ fontSize: '11px', margin: 0, padding: '2px 6px' }}>Recommended</span>}
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Advertises dynamic pricing shifts to clear congestion timings.
                              </div>
                            </div>
                          </div>
                          {activeMitigationKey === 'salik-shift' && salikImpact && (
                            <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Projection Impact: <strong style={{ color: 'var(--color-low)' }}>{salikImpact.reason}</strong>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13px', marginTop: '4px' }}>
                                <div className="telemetry-item" style={{ padding: '6px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '11px' }}>After Score</div>
                                  <div className="telemetry-val" style={{ fontSize: '14px', fontWeight: 700 }}>{salikImpact.afterRisk} ({salikImpact.afterLevel})</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '6px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '11px' }}>Speed delta</div>
                                  <div className="telemetry-val" style={{ fontSize: '14px', color: 'var(--color-low)', fontWeight: 700 }}>+{salikImpact.speedDeltaKph} kph</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '6px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '11px' }}>Volume shift</div>
                                  <div className="telemetry-val" style={{ fontSize: '14px', color: 'var(--color-low)', fontWeight: 700 }}>{salikImpact.volumeDeltaVph} vph</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Option 5: Incident emergency responders */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'incident-response' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'incident-response' ? 'active' : ''} ${recommendedSimKey === 'incident-response' ? 'recommended-row' : ''}`}
                          style={{ padding: '12px', cursor: 'pointer', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="radio"
                              name="mitigation"
                              checked={activeMitigationKey === 'incident-response'}
                              onChange={() => {}}
                              style={{ width: '16px', height: '16px' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-title)', fontSize: '15px' }}>
                                <Zap size={14} className="text-primary" /> Incident Response
                                {recommendedSimKey === 'incident-response' && <span className="recommend-badge" style={{ fontSize: '11px', margin: 0, padding: '2px 6px' }}>Recommended</span>}
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Dispatches RTA emergency patrol units to clear blocked lanes.
                              </div>
                            </div>
                          </div>
                          {activeMitigationKey === 'incident-response' && incidentImpact && (
                            <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Projection Impact: <strong style={{ color: incidentImpact.applicable ? 'var(--color-low)' : 'var(--text-primary)' }}>{incidentImpact.reason}</strong>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13px', marginTop: '4px' }}>
                                <div className="telemetry-item" style={{ padding: '6px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '11px' }}>After Score</div>
                                  <div className="telemetry-val" style={{ fontSize: '14px', fontWeight: 700 }}>{incidentImpact.afterRisk} ({incidentImpact.afterLevel})</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '6px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '11px' }}>Speed delta</div>
                                  <div className="telemetry-val" style={{ fontSize: '14px', color: 'var(--color-low)', fontWeight: 700 }}>+{incidentImpact.speedDeltaKph} kph</div>
                                </div>
                                <div className="telemetry-item" style={{ padding: '6px' }}>
                                  <div className="telemetry-label" style={{ fontSize: '11px' }}>Road status</div>
                                  <div className="telemetry-val" style={{ fontSize: '14px', color: 'var(--color-low)', fontWeight: 700 }}>Quick clear</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Option 6: Monitor Only */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'monitor' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'monitor' ? 'active' : ''} ${recommendedSimKey === 'monitor' ? 'recommended-row' : ''}`}
                          style={{ padding: '12px', cursor: 'pointer', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="radio"
                              name="mitigation"
                              checked={activeMitigationKey === 'monitor'}
                              onChange={() => {}}
                              style={{ width: '16px', height: '16px' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-title)', fontSize: '15px' }}>
                                <Activity size={14} className="text-primary" /> Monitor Only
                                {recommendedSimKey === 'monitor' && <span className="recommend-badge" style={{ fontSize: '11px', margin: 0, padding: '2px 6px' }}>Recommended</span>}
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                No dynamic actions are deployed at this time.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Mitigated Scenario Target Projection (Expected Impact Preview) */}
                      {mitigatedData && (
                        <div className="detail-card animate-fade-in" style={{ padding: '16px', background: 'var(--rta-blue-bg)', border: '1px solid var(--rta-blue-border)', borderLeft: '4px solid var(--rta-blue)', marginTop: '10px' }}>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-title)', marginBottom: '6px' }}>
                            Mitigated Scenario Target Projection
                          </div>
                          <div style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                            Applying <strong>{activeMitigationKey === 'route-advisory' ? 'Route Advisory' : activeMitigationKey === 'signal-timing' ? 'Signal Timing split overrides' : activeMitigationKey === 'metro-riders' ? 'Metro transit shifts' : activeMitigationKey === 'salik-shift' ? 'Salik pricing discounts' : activeMitigationKey === 'incident-response' ? 'Emergency responder dispatches' : 'Monitor Mode'}</strong> is projected to reduce corridor congestion score to <span style={{ color: 'var(--color-low)', fontWeight: 700 }}>{mitigatedData.score} ({mitigatedData.level})</span>.
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      No corridor selected.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'briefing' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="demo-briefing-grid">
                <div>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <PreventionImpactSummary approvedImpact={approvedImpact} />
                  <OperatorDecisionLog decisionLog={decisionLog} />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
