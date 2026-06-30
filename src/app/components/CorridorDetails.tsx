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
  junctionPerformance
}) => {
  if (!selectedLocationId || !selectedCorridor) {
    return (
      <div className="detail-card" style={{ padding: '30px 20px', textAlign: 'center', borderStyle: 'dashed' }} id="details-placeholder">
        <Info size={24} className="text-muted" style={{ margin: '0 auto 10px' }} />
        <h3 style={{ fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
          No Corridor Selected
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Select a road row from the Control Room Sidebar or Overview to review diagnostic speed charts and inspect adaptive signal splits.
        </p>
      </div>
    );
  }

  return (
    <div className="hotspot-detail-grid animate-fade-in" id="section-d-details" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
      
      {/* Risk Gauge Circle */}
      <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span className="kpi-title" style={{ display: 'block', textAlign: 'center', marginBottom: '4px' }}>
          Congestion Pressure Score
        </span>
        <div className="risk-gauge-container">
          <svg className="risk-circle-svg">
            <circle className="risk-circle-bg" cx="35" cy="35" r="30" />
            <circle
              className="risk-circle-val"
              cx="35"
              cy="35"
              r="30"
              stroke={
                appliedActions[selectedLocationId] && mitigatedData
                  ? (mitigatedData.score >= 80 ? 'var(--color-critical)' : mitigatedData.score >= 60 ? 'var(--color-high)' : mitigatedData.score >= 40 ? 'var(--color-medium)' : 'var(--color-low)')
                  : (selectedCorridor.congestion_pressure_score >= 80 ? 'var(--color-critical)' : selectedCorridor.congestion_pressure_score >= 60 ? 'var(--color-high)' : selectedCorridor.congestion_pressure_score >= 40 ? 'var(--color-medium)' : 'var(--color-low)')
              }
              strokeDasharray="188.5"
              strokeDashoffset={
                188.5 - (188.5 * (appliedActions[selectedLocationId] && mitigatedData ? mitigatedData.score : selectedCorridor.congestion_pressure_score)) / 100
              }
            />
          </svg>
          <div className="risk-value-text">
            {appliedActions[selectedLocationId] && mitigatedData ? mitigatedData.score : selectedCorridor.congestion_pressure_score}
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '9.5px', color: 'var(--text-secondary)', marginTop: '6px' }}>
          Risk Category: <strong style={{ color: 'var(--text-title)' }}>
            {appliedActions[selectedLocationId] && mitigatedData ? mitigatedData.level : selectedCorridor.risk_level}
          </strong>
        </div>
      </div>

      {/* Avg Speed detail-card */}
      <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span className="kpi-title">Average Corridor Speed</span>
        <div style={{ fontSize: '22px', fontWeight: 800, margin: '8px 0 2px 0', color: 'var(--text-title)' }}>
          {selectedCorridor.avg_speed_kph} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>kph</span>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
          Free-flow baseline: 80 kph
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Speed drop: <span style={{ color: 'var(--color-critical)', fontWeight: 700 }}>
            {Math.max(0, 80 - selectedCorridor.avg_speed_kph)} kph
          </span>
        </div>
      </div>

      {/* V/C ratio & volume */}
      <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span className="kpi-title">Volume / Capacity Ratio</span>
        <div style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0 2px 0', color: 'var(--text-title)' }}>
          {selectedCorridor.vc_ratio.toFixed(2)}
        </div>
        <div className="telemetry-progress-container">
          <div className="telemetry-progress-bar-bg">
            <div 
              className="telemetry-progress-bar-val" 
              style={{ 
                width: `${Math.min(100, selectedCorridor.vc_ratio * 100)}%`,
                background: selectedCorridor.vc_ratio > 0.9 ? 'var(--color-critical)' : selectedCorridor.vc_ratio > 0.7 ? 'var(--color-medium)' : 'var(--color-low)'
              }} 
            />
          </div>
        </div>
        <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Demand: {selectedCorridor.volume_vph} / {selectedCorridor.capacity_vph} vph
        </span>
      </div>

      {/* Travel Time Index */}
      <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span className="kpi-title">Travel Time Index (TTI)</span>
        <div style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0 2px 0', color: 'var(--text-title)' }}>
          {selectedCorridor.travel_time_index.toFixed(2)}x
        </div>
        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
          Trip takes {((selectedCorridor.travel_time_index - 1) * 100).toFixed(0)}% longer than off-peak.
        </span>
      </div>

      {/* Explainable AI Forecast details */}
      {selectedCorridor.forecast && (
        <div className="detail-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="kpi-title" style={{ fontSize: '10px' }}>Explainable AI Forecast Profile</span>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>AI Window: Next 30–60 Minutes</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Model Confidence Level:</span>
              <span style={{ fontWeight: 700, color: 'var(--rta-blue)' }}>{selectedCorridor.forecast?.forecast_confidence}%</span>
            </div>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Top Contributing factors:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {selectedCorridor.forecast?.topContributingFeatures?.map((f: string, idx: number) => (
                <span key={idx} className="cause-tag" style={{ background: 'var(--rta-blue-bg)', color: 'var(--rta-blue)', border: '1px solid var(--rta-blue-border)', fontSize: '8.5px', padding: '2px 6px' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Creek Crossing side-by-side comparison card */}
      {activeScenarioId === 'creek-crossing-demo' && (
        <div className="detail-card animate-fade-in" style={{ gridColumn: 'span 2', background: 'var(--rta-blue-bg)', borderLeft: '4px solid var(--rta-blue)', padding: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="kpi-title" style={{ fontSize: '9.5px' }}>
              Creek Crossing Corridor Performance Comparison
            </span>
            <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Click to select target crossing</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
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
                    padding: '10px', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    border: isCurrent ? '2px solid var(--rta-blue)' : '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-card)',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  className="kpi-card"
                >
                  <div style={{ fontWeight: 700, fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-title)' }}>
                    <span>{locId === 'GAR_N1' ? 'Garhoud Bridge' : locId === 'MAK_N1' ? 'Maktoum Bridge' : 'Business Bay'}</span>
                    {isCurrent && <span style={{ color: 'var(--rta-blue)', fontSize: '8px', fontWeight: 'bold' }}>SELECTED</span>}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Speed: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{corRow.avg_speed_kph} kph</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <span>Risk Score:</span> 
                    <span className={`badge-risk ${corRow.risk_level.toLowerCase()}`} style={{ fontSize: '8px', padding: '1px 4px' }}>
                      {corRow.congestion_pressure_score}
                    </span>
                  </div>

                  <div className="telemetry-progress-container" style={{ marginTop: '6px' }}>
                    <div className="telemetry-progress-bar-bg" style={{ height: '3px' }}>
                      <div 
                        className="telemetry-progress-bar-val" 
                        style={{ 
                          width: `${corRow.congestion_pressure_score}%`,
                          background: corRow.congestion_pressure_score >= 80 ? 'var(--color-critical)' : corRow.congestion_pressure_score >= 60 ? 'var(--color-high)' : corRow.congestion_pressure_score >= 40 ? 'var(--color-medium)' : 'var(--color-low)'
                        }} 
                      />
                    </div>
                  </div>

                  {isLowest && (
                    <div style={{ position: 'absolute', top: '-6px', right: '6px', background: 'var(--color-low)', color: 'white', fontSize: '7px', fontWeight: 'bold', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase' }}>
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
        <div className="detail-card" style={{ gridColumn: 'span 2', background: 'var(--bg-panel)', borderLeft: '3px solid var(--rta-blue)' }}>
          <span className="kpi-title" style={{ display: 'block', fontSize: '9px', marginBottom: '2px', color: 'var(--rta-blue)' }}>
            Adjacent Crossing Alternatives
          </span>
          <p style={{ fontSize: '11px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
            Divert flow to adjacent bridge routes: <strong>{alternatives}</strong>. Alternate bridges currently have free capacities.
          </p>
        </div>
      )}

      {/* Nearby junction parameters */}
      {junctionPerformance && (
        <div className="detail-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span className="kpi-title">Nearby Intersection Telemetry</span>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>
              {junctionPerformance.junction_id} · {junctionPerformance.control_type}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            <div className="telemetry-item">
              <div className="telemetry-label">Avg delay</div>
              <div className="telemetry-val">
                {appliedActions[selectedLocationId] && mitigatedData && mitigatedData.delay !== null ? mitigatedData.delay : Math.round(junctionPerformance.avg_delay_s_per_veh)}s
              </div>
              <div className="telemetry-progress-container">
                <div className="telemetry-progress-bar-bg">
                  <div 
                    className="telemetry-progress-bar-val" 
                    style={{ 
                      width: `${Math.min(100, ((appliedActions[selectedLocationId] && mitigatedData && mitigatedData.delay !== null ? mitigatedData.delay : junctionPerformance.avg_delay_s_per_veh) / 80) * 100)}%`,
                      background: 'var(--rta-blue)'
                    }} 
                  />
                </div>
              </div>
            </div>
            <div className="telemetry-item">
              <div className="telemetry-label">Saturation</div>
              <div className="telemetry-val">{Math.round(junctionPerformance.degree_of_saturation * 100)}%</div>
              <div className="telemetry-progress-container">
                <div className="telemetry-progress-bar-bg">
                  <div 
                    className="telemetry-progress-bar-val" 
                    style={{ 
                      width: `${Math.min(100, junctionPerformance.degree_of_saturation * 100)}%`,
                      background: junctionPerformance.degree_of_saturation > 0.85 ? 'var(--color-critical)' : junctionPerformance.degree_of_saturation > 0.7 ? 'var(--color-medium)' : 'var(--color-low)'
                    }} 
                  />
                </div>
              </div>
            </div>
            <div className="telemetry-item">
              <div className="telemetry-label">Queue Size</div>
              <div className="telemetry-val">{junctionPerformance.avg_queue_veh} <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>veh</span></div>
              <div className="telemetry-progress-container">
                <div className="telemetry-progress-bar-bg">
                  <div 
                    className="telemetry-progress-bar-val" 
                    style={{ 
                      width: `${Math.min(100, (junctionPerformance.avg_queue_veh / 35) * 100)}%`,
                      background: 'var(--text-secondary)'
                    }} 
                  />
                </div>
              </div>
            </div>
            <div className="telemetry-item">
              <div className="telemetry-label">Phase Failures</div>
              <div className="telemetry-val" style={{ color: junctionPerformance.phase_failures > 0 ? 'var(--color-critical)' : 'inherit' }}>
                {junctionPerformance.phase_failures}
              </div>
              <div className="telemetry-progress-container">
                <div className="telemetry-progress-bar-bg">
                  <div 
                    className="telemetry-progress-bar-val" 
                    style={{ 
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
