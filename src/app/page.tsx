'use client';

import React, { useState, useEffect } from 'react';
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
  const [activeSidebarNav, setActiveSidebarNav] = useState('Dashboard');
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (activeTab === 'overview') {
      setActiveSidebarNav('Dashboard');
    } else if (activeTab === 'map') {
      setActiveSidebarNav('Live Map');
    } else if (activeTab === 'briefing') {
      setActiveSidebarNav('AI Briefing');
    } else if (activeTab === 'forecast') {
      if (!['AI Predictions', 'Incidents', 'Signal Timing'].includes(activeSidebarNav)) {
        setActiveSidebarNav('AI Predictions');
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
    if (!cor) return { action: 'Monitor conditions', reason: 'Normal flow detected.' };

    const isStorm = date === '2024-04-16';
    const hasIncident = cor.incident_affected;
    const hasSignalSaturation = cor.junction_performance?.degree_of_saturation > 0.9;
    const isFixedSignal = cor.junction_performance?.control_type === 'Fixed-time';

    if (isStorm) {
      return {
        action: 'Official roadside advisory + incident response',
        reason: 'Severe rain and flooding event. Coordinate active emergency responses to flooded exits and advise public transport shift.'
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
        reason: 'Incident lanes blocked. Coordinate emergency road patrol response and publish dynamic route rerouting via official roadside signs.'
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
    activeScenario: currentScenario,
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
    activeScenario: currentScenario,
    date,
    hour,
    corridors,
    alternatives,
    mitigatedData
  });

  const triggerDecision = (action: 'approve' | 'reject' | 'review') => {
    handleOperatorDecision(action, setAppliedActions);
  };

  // Build the What-If Options mapped to their impact variables
  const simulatorOptions = [
    {
      key: 'route-advisory',
      title: 'Route Advisory',
      desc: 'Diverts incoming volume to alternative bridges using official roadside signs.',
      impact: routeImpact,
      icon: <Compass size={15} />
    },
    {
      key: 'signal-timing',
      title: 'Signal Timing Review',
      desc: 'Alters green timing split profiles at Defence intersection approaches.',
      impact: signalImpact,
      icon: <Sliders size={15} />
    },
    {
      key: 'metro-riders',
      title: 'Public Transport Advisory',
      desc: 'Publishes app alerts advising metro ridership shifts to clear roadway volume.',
      impact: metroImpact,
      icon: <Train size={15} />
    },
    {
      key: 'salik-shift',
      title: 'Off-Peak Demand Shift',
      desc: 'Advertises dynamic pricing shifts to redirect non-essential commute timings.',
      impact: salikImpact,
      icon: <Sliders size={15} />
    },
    {
      key: 'incident-response',
      title: 'Incident Response',
      desc: 'Coordinates RTA emergency patrol response to clear blocked lanes.',
      impact: incidentImpact,
      icon: <Zap size={15} />
    },
    {
      key: 'monitor',
      title: 'Monitor Only',
      desc: 'No dynamic prevention overrides active; conditions continue to be monitored.',
      impact: null,
      icon: <Activity size={15} />
    }
  ];

  return (
    <div className="app-container">
      <main className="dashboard-grid" style={{ height: '100vh', display: 'grid', gridTemplateColumns: '280px 1fr' }}>
        {/* Left Sidebar only for scenario selection */}
        <ControlSidebar 
          scenarios={scenarios} 
          activeScenarioId={activeScenarioId} 
          handleLaunchScenario={handleLaunchScenario} 
          realTime={realTime}
          theme={theme}
          toggleTheme={toggleTheme}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedLocationId={selectedLocationId}
          activeSidebarNav={activeSidebarNav}
          setActiveSidebarNav={setActiveSidebarNav}
        />

        {/* Content Pane */}
        <section className="panel" style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-main)' }} id="main-telemetry-content">
          
          {/* 1. Page Header with Title, Subtitle, and Clock controllers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-title)', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.15 }}>
                  PeakFlow Operations Dashboard
                </h2>
                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                  Predict congestion, compare prevention options, and prepare AI-assisted operator briefings.
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

          <div className="alert-bar" id="story-banner" style={{ fontSize: '15px', padding: '12px 16px', fontWeight: 500 }}>
            Analyze traffic data, identify congestion before it becomes critical, compare prevention options, and generate an AI operator briefing.
          </div>

          <DashboardTabs 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedLocationId={selectedLocationId}
          />

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--rta-blue)', padding: '16px 20px', borderRadius: '8px', fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="demo-forecast-actions-grid">
                
                {/* Left side: Hotspot Summary & Telemetry/24-Hr Speed Profile */}
                <div>
                  {selectedCorridor ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      {/* 1. Hotspot Summary Card */}
                      <div className="detail-card" style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '12px', color: 'var(--text-title)' }}>
                          Selected Corridor Summary
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Location</div>
                            <strong style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{selectedCorridor.road_name} ({selectedCorridor.direction})</strong>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Area: {selectedCorridor.area} · {selectedCorridor.num_lanes} Lanes</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Current Risk Level</div>
                            <span style={{ fontSize: '18px', fontWeight: 800, color: selectedCorridor.congestion_pressure_score >= 80 ? 'var(--color-critical)' : selectedCorridor.congestion_pressure_score >= 60 ? 'var(--color-high)' : selectedCorridor.congestion_pressure_score >= 40 ? 'var(--color-medium)' : 'var(--color-low)' }}>
                              {selectedCorridor.congestion_pressure_score} / 100 ({selectedCorridor.risk_level})
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                          <div>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Avg Speed:</span>
                            <strong style={{ fontSize: '15px', display: 'block', color: 'var(--text-primary)' }}>{selectedCorridor.avg_speed_kph} kph</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>V/C Ratio:</span>
                            <strong style={{ fontSize: '15px', display: 'block', color: 'var(--text-primary)' }}>{selectedCorridor.vc_ratio.toFixed(2)}x</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Travel Time Index:</span>
                            <strong style={{ fontSize: '15px', display: 'block', color: 'var(--text-primary)' }}>{selectedCorridor.travel_time_index.toFixed(2)}x</strong>
                          </div>
                        </div>

                        <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '14px' }}>
                          <div><strong>Main Cause:</strong> {selectedCorridor.incident_affected ? 'Active lane-blocking traffic collision' : 'Peak commuter rush hour volume'}</div>
                          <div style={{ marginTop: '4px' }}><strong>Recommended:</strong> <span style={{ color: 'var(--rta-blue)', fontWeight: 700 }}>{selectedRecommendation.action}</span></div>
                        </div>
                      </div>

                      {/* 2. 24-Hour Speed Profile Line Chart */}
                      {selectedCorridor.speedHistory && selectedCorridor.speedHistory.length > 0 && (
                        <div className="detail-card" style={{ padding: '20px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-title)', fontSize: '18px', display: 'block', marginBottom: '12px' }}>
                            24-Hour Speed Profile (kph)
                          </span>
                          <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                            <svg viewBox="0 0 500 120" style={{ width: '100%', height: '120px' }}>
                              {/* Grid lines */}
                              <line x1="0" y1="20" x2="500" y2="20" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />
                              <line x1="0" y1="60" x2="500" y2="60" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />
                              <line x1="0" y1="100" x2="500" y2="100" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />
                              
                              <path
                                d={selectedCorridor.speedHistory.map((s, idx) => {
                                  const x = (idx / (selectedCorridor.speedHistory.length - 1)) * 500;
                                  const y = 110 - (s / 100) * 90;
                                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                                }).join(' ')}
                                fill="none"
                                stroke="var(--rta-blue)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              {/* Simulation Current Hour dot */}
                              {(() => {
                                const h = hour % selectedCorridor.speedHistory.length;
                                const x = (h / (selectedCorridor.speedHistory.length - 1)) * 500;
                                const s = selectedCorridor.speedHistory[h] || 60;
                                const y = 110 - (s / 100) * 90;
                                return (
                                  <g>
                                    <circle cx={x} cy={y} r="6" fill="var(--rta-red)" />
                                    <circle cx={x} cy={y} r="12" fill="none" stroke="var(--rta-red)" strokeWidth="1.5" style={{ opacity: 0.5 }} />
                                  </g>
                                );
                              })()}
                            </svg>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                              <span>00:00</span>
                              <span style={{ color: 'var(--rta-red)', fontWeight: 600 }}>TOC Hour ({String(hour).padStart(2, '0')}:00)</span>
                              <span>23:00</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. Nearby intersection telemetry */}
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-title)' }}>
                          Junction & Alternate Route Telemetry
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

                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No corridor selected. Please select a hotspot.
                    </div>
                  )}
                </div>

                {/* Right side: AI Forecast & What-If Simulator */}
                {selectedCorridor && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Explainable AI Forecast details */}
                    {selectedCorridor.forecast && (
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
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '6px' }}>
                            * Simulation estimate based on current corridor telemetry and sandbox data.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* What-If Simulator Options Stack */}
                    <div className="detail-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="kpi-title" style={{ fontSize: '18px', fontWeight: 700 }}>What-If Prevention Simulator</span>
                        {appliedActions[selectedLocationId || ''] && (
                          <span className="badge-risk low" style={{ fontSize: '12px', padding: '2px 8px' }}>Action split active</span>
                        )}
                      </div>

                      <div className="recommend-badge" style={{ marginBottom: '4px', fontSize: '14px', padding: '6px 12px' }}>
                        Recommended Option: {selectedRecommendation.action}
                      </div>
                      <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '8px' }}>
                        {selectedRecommendation.reason}
                      </p>

                      {/* Compare Mitigation list */}
                      <div className="mitigation-stack" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {simulatorOptions.map(opt => {
                          const isSelected = activeMitigationKey === opt.key;
                          const isRecommended = opt.key === recommendedSimKey;
                          const isMonitor = opt.key === 'monitor';
                          
                          let labelText = 'Useful';
                          let labelColor = 'var(--rta-blue)';
                          let labelBg = 'var(--rta-blue-bg)';
                          
                          if (isRecommended) {
                            labelText = 'Recommended';
                            labelColor = 'var(--color-low)';
                            labelBg = 'rgba(34, 197, 94, 0.1)';
                          } else if (isMonitor) {
                            labelText = 'Baseline';
                            labelColor = 'var(--text-secondary)';
                            labelBg = 'var(--border-color)';
                          } else if (opt.impact && !opt.impact.applicable) {
                            labelText = 'Limited Impact';
                            labelColor = '#fd7e14';
                            labelBg = 'rgba(253, 126, 20, 0.1)';
                          }

                          return (
                            <div 
                              key={opt.key}
                              onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId || '']: opt.key }))}
                              className={`mitigation-action-card ${isSelected ? 'active' : ''} ${isRecommended ? 'recommended-row' : ''}`}
                              style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '12px', border: '1px solid var(--border-color)', transition: 'all 0.2s ease', position: 'relative' }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                                  <input
                                    type="radio"
                                    name="mitigation"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0 }}
                                  />
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      {opt.icon} {opt.title}
                                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: labelBg, color: labelColor, fontWeight: 700 }}>
                                        {labelText}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                                      {opt.desc}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Render impact projections if not monitor */}
                              {!isMonitor && opt.impact && (
                                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                    <strong>Efficacy Analysis:</strong> {opt.impact.reason}
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '14px', marginTop: '8px' }}>
                                    <div style={{ background: 'var(--bg-main)', padding: '8px 10px', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 750, letterSpacing: '0.02em', marginBottom: '2px' }}>Projected Risk</span>
                                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                                        {opt.impact.afterRisk} ({opt.impact.afterLevel})
                                      </strong>
                                    </div>
                                    <div style={{ background: 'var(--bg-main)', padding: '8px 10px', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 750, letterSpacing: '0.02em', marginBottom: '2px' }}>Speed Delta</span>
                                      <strong style={{ fontSize: '14px', color: 'var(--color-low)' }}>
                                        {opt.impact.speedDeltaKph > 0 ? `+${opt.impact.speedDeltaKph}` : '0'} kph
                                      </strong>
                                    </div>
                                    <div style={{ background: 'var(--bg-main)', padding: '8px 10px', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 750, letterSpacing: '0.02em', marginBottom: '2px' }}>Volume Delta</span>
                                      <strong style={{ fontSize: '14px', color: opt.impact.volumeDeltaVph < 0 ? 'var(--color-low)' : 'var(--text-primary)' }}>
                                        {opt.impact.volumeDeltaVph} vph
                                      </strong>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Mitigated Scenario Target Projection (Expected Impact Preview) */}
                      {mitigatedData && (
                        <div className="detail-card animate-fade-in" style={{ padding: '20px', background: 'var(--rta-blue-bg)', border: '1px solid var(--rta-blue-border)', borderLeft: '4px solid var(--rta-blue)', marginTop: '16px' }}>
                          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-title)', marginBottom: '8px' }}>
                            Mitigated Scenario Target Projection
                          </div>
                          <div style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                            Applying <strong>{activeMitigationKey === 'route-advisory' ? 'Route Advisory' : activeMitigationKey === 'signal-timing' ? 'Signal Timing split overrides' : activeMitigationKey === 'metro-riders' ? 'Metro transit shifts' : activeMitigationKey === 'salik-shift' ? 'Salik pricing discounts' : activeMitigationKey === 'incident-response' ? 'Emergency responder coordination' : 'Monitor Mode'}</strong> is projected to reduce corridor congestion score to <span style={{ color: 'var(--color-low)', fontWeight: 700 }}>{mitigatedData.score} ({mitigatedData.level})</span>.
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}

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
                    activeMitigationKey={activeMitigationKey}
                    mitigatedData={mitigatedData}
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
