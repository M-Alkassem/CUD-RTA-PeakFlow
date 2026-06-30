import React from 'react';
import { Info } from 'lucide-react';
import { Corridor } from '../lib/types';

interface CorridorDetailsProps {
  selectedCorridor: Corridor | null;
  selectedLocationId: string | null;
  appliedActions: Record<string, boolean>;
  mitigatedData: any;
  activeScenarioId: string;
  corridors: Corridor[];
  setSelectedLocationId: (id: string) => void;
  alternatives: string | null;
  junctionPerformance: any;
  showForecastCard?: boolean;
}

export const CorridorDetails: React.FC<CorridorDetailsProps> = ({
  selectedCorridor,
  selectedLocationId,
  appliedActions,
  mitigatedData,
  activeScenarioId,
  corridors,
  setSelectedLocationId,
  alternatives,
  junctionPerformance,
  showForecastCard = false
}) => {
  if (!selectedLocationId || !selectedCorridor) {
    return (
      <div className="detail-card" style={{ padding: '32px 24px', textAlign: 'center', borderStyle: 'dashed' }} id="details-placeholder">
        <Info size={28} className="text-muted" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 700 }}>
          No Corridor Selected
        </h3>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Select a road row from the Control Room Sidebar or Overview to review diagnostic speed charts and inspect adaptive signal splits.
        </p>
      </div>
    );
  }

  return (
    <div className="hotspot-detail-grid animate-fade-in" id="section-d-details" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
      
      {/* Risk Gauge Circle */}
      <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
        <span className="kpi-title" style={{ display: 'block', textAlign: 'center', fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>
          Congestion Risk Score
        </span>
        <div className="risk-gauge-container" style={{ margin: '12px auto' }}>
          <svg className="risk-circle-svg" style={{ width: '80px', height: '80px' }}>
            <circle className="risk-circle-bg" cx="40" cy="40" r="34" style={{ fill: 'none', stroke: 'var(--border-color)', strokeWidth: 6 }} />
            <circle
              className="risk-circle-val"
              cx="40"
              cy="40"
              r="34"
              style={{
                fill: 'none',
                strokeWidth: 6,
                strokeLinecap: 'round',
                transition: 'stroke-dashoffset 0.35s'
              }}
              stroke={
                appliedActions[selectedLocationId] && mitigatedData
                  ? (mitigatedData.score >= 80 ? 'var(--color-critical)' : mitigatedData.score >= 60 ? 'var(--color-high)' : mitigatedData.score >= 40 ? 'var(--color-medium)' : 'var(--color-low)')
                  : (selectedCorridor.congestion_pressure_score >= 80 ? 'var(--color-critical)' : selectedCorridor.congestion_pressure_score >= 60 ? 'var(--color-high)' : selectedCorridor.congestion_pressure_score >= 40 ? 'var(--color-medium)' : 'var(--color-low)')
              }
              strokeDasharray="213.6"
              strokeDashoffset={
                213.6 - (213.6 * (appliedActions[selectedLocationId] && mitigatedData ? mitigatedData.score : selectedCorridor.congestion_pressure_score)) / 100
              }
            />
          </svg>
          <div className="risk-value-text" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-title)' }}>
            {appliedActions[selectedLocationId] && mitigatedData ? mitigatedData.score : selectedCorridor.congestion_pressure_score}
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Risk Category: <strong style={{ color: 'var(--text-title)', fontWeight: 700 }}>
            {appliedActions[selectedLocationId] && mitigatedData ? mitigatedData.level : selectedCorridor.risk_level}
          </strong>
        </div>
      </div>

      {/* Avg Speed Detail */}
      <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
        <span className="kpi-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>
          Average Corridor Speed
        </span>
        <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-title)', margin: '8px 0' }}>
          {selectedCorridor.avg_speed_kph} <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>kph</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Free-flow speed limit: 80 kph
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Corridor Speed drop: <span style={{ color: 'var(--color-critical)', fontWeight: 700 }}>
              {Math.max(0, 80 - selectedCorridor.avg_speed_kph)} kph
            </span>
          </div>
        </div>
      </div>

      {/* V/C ratio & Volume progress */}
      <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
        <span className="kpi-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>
          Volume / Capacity Ratio
        </span>
        <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-title)', margin: '8px 0' }}>
          {selectedCorridor.vc_ratio.toFixed(2)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          <div className="telemetry-progress-container" style={{ margin: 0 }}>
            <div className="telemetry-progress-bar-bg" style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
              <div 
                className="telemetry-progress-bar-val" 
                style={{ 
                  height: '100%',
                  width: `${Math.min(100, selectedCorridor.vc_ratio * 100)}%`,
                  background: selectedCorridor.vc_ratio > 0.9 ? 'var(--color-critical)' : selectedCorridor.vc_ratio > 0.7 ? 'var(--color-medium)' : 'var(--color-low)'
                }} 
              />
            </div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Demand flow: {selectedCorridor.volume_vph} / {selectedCorridor.capacity_vph} vph
          </div>
        </div>
      </div>

      {/* Travel Time Index */}
      <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
        <span className="kpi-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>
          Travel Time Index (TTI)
        </span>
        <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-title)', margin: '8px 0' }}>
          {selectedCorridor.travel_time_index.toFixed(2)}x
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Trip takes <strong style={{ color: 'var(--text-title)' }}>{((selectedCorridor.travel_time_index - 1) * 100).toFixed(0)}% longer</strong> than free-flow limits.
        </span>
      </div>

      {/* Explainable AI Forecast details */}
      {showForecastCard && selectedCorridor.forecast && (
        <div className="detail-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <span className="kpi-title" style={{ fontSize: '16px' }}>Explainable AI Forecast Profile</span>
            <span style={{ fontSize: '13px', color: 'var(--rta-blue)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>AI Window: Next 30–60 Mins</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Model Confidence Level:</span>
              <span style={{ fontWeight: 700, color: 'var(--rta-blue)' }}>{selectedCorridor.forecast?.forecast_confidence}%</span>
            </div>
            <div style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>Top Contributing factors:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {selectedCorridor.forecast?.topContributingFeatures?.map((f: string, idx: number) => (
                <span key={idx} className="cause-tag" style={{ background: 'var(--rta-blue-bg)', color: 'var(--rta-blue)', border: '1px solid var(--rta-blue-border)', fontSize: '12px', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Creek Crossing side-by-side comparison card */}
      {activeScenarioId === 'creek-crossing-demo' && (
        <div className="detail-card animate-fade-in" style={{ gridColumn: 'span 2', background: 'rgba(14, 165, 233, 0.04)', borderLeft: '4px solid var(--rta-blue)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <span className="kpi-title" style={{ fontSize: '16px' }}>
              Creek Crossing Corridor Performance comparison
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Select target crossing</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {['GAR_N1', 'MAK_N1', 'BBC_S1'].map(locId => {
              const corRow = corridors.find(c => c.location_id === locId);
              if (!corRow) return null;
              const isCurrent = selectedLocationId === locId;
              const crossings = corridors.filter(c => ['GAR_N1', 'MAK_N1', 'BBC_S1'].includes(c.location_id));
              const lowestRiskVal = Math.min(...crossings.map(c => c.congestion_pressure_score));
              const isLowest = corRow.congestion_pressure_score === lowestRiskVal;

              return (
                <div 
                  key={locId} 
                  onClick={() => setSelectedLocationId(locId)}
                  style={{ 
                    background: 'var(--bg-card)', 
                    padding: '14px', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    border: isCurrent ? '2px solid var(--rta-blue)' : '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-card)',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  className="kpi-card"
                >
                  <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-title)' }}>
                    <span>{locId === 'GAR_N1' ? 'Garhoud Br.' : locId === 'MAK_N1' ? 'Maktoum Br.' : 'Business Bay'}</span>
                    {isCurrent && <span style={{ color: 'var(--rta-blue)', fontSize: '11px', fontWeight: 'bold' }}>ACTIVE</span>}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    Speed: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{corRow.avg_speed_kph} kph</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span>Risk:</span> 
                    <span className={`badge-risk ${corRow.risk_level.toLowerCase()}`} style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '3px' }}>
                      {corRow.congestion_pressure_score}
                    </span>
                  </div>

                  <div className="telemetry-progress-container" style={{ marginTop: '8px' }}>
                    <div className="telemetry-progress-bar-bg" style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div 
                        className="telemetry-progress-bar-val" 
                        style={{ 
                          height: '100%',
                          width: `${corRow.congestion_pressure_score}%`,
                          background: corRow.congestion_pressure_score >= 80 ? 'var(--color-critical)' : corRow.congestion_pressure_score >= 60 ? 'var(--color-high)' : corRow.congestion_pressure_score >= 40 ? 'var(--color-medium)' : 'var(--color-low)'
                        }} 
                      />
                    </div>
                  </div>

                  {isLowest && (
                    <div style={{ position: 'absolute', top: '-10px', right: '10px', background: 'var(--color-low)', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      Best Route
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Adjacent crossing alternatives if creek crossings */}
      {alternatives && activeScenarioId !== 'creek-crossing-demo' && (
        <div className="detail-card" style={{ gridColumn: 'span 2', background: 'var(--bg-panel)', borderLeft: '4px solid var(--rta-blue)', padding: '20px' }}>
          <span className="kpi-title" style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--rta-blue)', fontWeight: 700 }}>
            Adjacent Crossing Alternatives
          </span>
          <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
            Divert flow to adjacent bridge routes: <strong>{alternatives}</strong>. Alternate bridges currently have free capacities.
          </p>
        </div>
      )}

      {/* Nearby junction performance parameters */}
      {junctionPerformance && (
        <div className="detail-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <span className="kpi-title">Nearby Intersection Telemetry</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>
              {junctionPerformance.junction_id} · {junctionPerformance.control_type}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            
            <div className="telemetry-item" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '4px' }}>
              <div className="telemetry-label" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Avg delay</div>
              <div className="telemetry-val" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-title)' }}>
                {appliedActions[selectedLocationId] && mitigatedData && mitigatedData.delay !== null ? mitigatedData.delay : Math.round(junctionPerformance.avg_delay_s_per_veh)}s
              </div>
              <div className="telemetry-progress-container" style={{ margin: 0 }}>
                <div className="telemetry-progress-bar-bg" style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div 
                    className="telemetry-progress-bar-val" 
                    style={{ 
                      height: '100%',
                      width: `${Math.min(100, ((appliedActions[selectedLocationId] && mitigatedData && mitigatedData.delay !== null ? mitigatedData.delay : junctionPerformance.avg_delay_s_per_veh) / 80) * 100)}%`,
                      background: 'var(--rta-blue)'
                    }} 
                  />
                </div>
              </div>
            </div>

            <div className="telemetry-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'space-between' }}>
              <div className="telemetry-label" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Saturation</div>
              <div className="telemetry-val" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-title)' }}>{Math.round(junctionPerformance.degree_of_saturation * 100)}%</div>
              <div className="telemetry-progress-container" style={{ margin: 0 }}>
                <div className="telemetry-progress-bar-bg" style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div 
                    className="telemetry-progress-bar-val" 
                    style={{ 
                      height: '100%',
                      width: `${Math.min(100, junctionPerformance.degree_of_saturation * 100)}%`,
                      background: junctionPerformance.degree_of_saturation > 0.85 ? 'var(--color-critical)' : junctionPerformance.degree_of_saturation > 0.7 ? 'var(--color-medium)' : 'var(--color-low)'
                    }} 
                  />
                </div>
              </div>
            </div>

            <div className="telemetry-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'space-between' }}>
              <div className="telemetry-label" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Queue Size</div>
              <div className="telemetry-val" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-title)' }}>{junctionPerformance.avg_queue_veh} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>veh</span></div>
              <div className="telemetry-progress-container" style={{ margin: 0 }}>
                <div className="telemetry-progress-bar-bg" style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div 
                    className="telemetry-progress-bar-val" 
                    style={{ 
                      height: '100%',
                      width: `${Math.min(100, (junctionPerformance.avg_queue_veh / 35) * 100)}%`,
                      background: 'var(--text-secondary)'
                    }} 
                  />
                </div>
              </div>
            </div>

            <div className="telemetry-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'space-between' }}>
              <div className="telemetry-label" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Phase Fails</div>
              <div className="telemetry-val" style={{ fontSize: '18px', fontWeight: 800, color: junctionPerformance.phase_failures > 0 ? 'var(--color-critical)' : 'var(--text-title)' }}>
                {junctionPerformance.phase_failures}
              </div>
              <div className="telemetry-progress-container" style={{ margin: 0 }}>
                <div className="telemetry-progress-bar-bg" style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div 
                    className="telemetry-progress-bar-val" 
                    style={{ 
                      height: '100%',
                      width: `${Math.min(100, (junctionPerformance.phase_failures / 5) * 100)}%`,
                      background: 'var(--color-critical)'
                    }} 
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default CorridorDetails;
