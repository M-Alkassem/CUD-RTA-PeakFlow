import React from 'react';
import { Info, Gauge, Zap, Navigation, Clock } from 'lucide-react';
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

  const currentRisk = appliedActions[selectedLocationId] && mitigatedData ? mitigatedData.score : selectedCorridor.congestion_pressure_score;
  const currentRiskLevel = appliedActions[selectedLocationId] && mitigatedData ? mitigatedData.level : selectedCorridor.risk_level;
  
  const formattedSpeedDrop = Math.max(0, 80 - selectedCorridor.avg_speed_kph).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* 2x2 Consolidated Live Telemetry Grid */}
      <div className="hotspot-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        
        {/* Risk Index Tile */}
        <div className="detail-card" style={{ padding: '16px', minHeight: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Congestion Risk</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: currentRisk >= 80 ? 'var(--color-critical)' : currentRisk >= 60 ? 'var(--color-high)' : currentRisk >= 40 ? 'var(--color-medium)' : 'var(--color-low)' }}>
            {currentRisk} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>/ 100</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Status: <strong style={{ color: 'var(--text-primary)' }}>{currentRiskLevel}</strong>
          </div>
        </div>

        {/* Corridor Speed Tile */}
        <div className="detail-card" style={{ padding: '16px', minHeight: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Corridor Speed</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-title)' }}>
            {selectedCorridor.avg_speed_kph} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>kph</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Speed Drop: <span style={{ color: 'var(--color-critical)', fontWeight: 600 }}>{formattedSpeedDrop} kph</span>
          </div>
        </div>

        {/* V/C Ratio Tile */}
        <div className="detail-card" style={{ padding: '16px', minHeight: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Volume / Capacity (V/C)</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-title)' }}>
            {selectedCorridor.vc_ratio.toFixed(2)}
          </div>
          <div style={{ width: '100%' }}>
            <div style={{ height: '4px', background: 'var(--bg-main)', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' }}>
              <div style={{ height: '100%', width: `${Math.min(100, selectedCorridor.vc_ratio * 100)}%`, background: selectedCorridor.vc_ratio > 0.8 ? 'var(--color-critical)' : 'var(--color-medium)' }} />
            </div>
          </div>
        </div>

        {/* Travel Time Index Tile */}
        <div className="detail-card" style={{ padding: '16px', minHeight: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Travel Time Index</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-title)' }}>
            {selectedCorridor.travel_time_index.toFixed(2)}x
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Trip takes <strong>{((selectedCorridor.travel_time_index - 1) * 100).toFixed(0)}% longer</strong>
          </div>
        </div>

      </div>

      {/* Nearby Intersection Telemetry (Clean Dark Mode Badges) */}
      {junctionPerformance && (
        <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-title)' }}>Intersection Diagnostics</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {junctionPerformance.junction_id} · {junctionPerformance.control_type}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
            
            <div style={{ background: 'var(--bg-main)', padding: '10px 8px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '64px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Avg Delay</span>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                {appliedActions[selectedLocationId] && mitigatedData && mitigatedData.delay !== null ? mitigatedData.delay : Math.round(junctionPerformance.avg_delay_s_per_veh)}s
              </strong>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '10px 8px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '64px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Saturation</span>
              <strong style={{ fontSize: '14px', color: junctionPerformance.degree_of_saturation > 0.85 ? 'var(--color-critical)' : 'var(--text-primary)' }}>
                {Math.round(junctionPerformance.degree_of_saturation * 100)}%
              </strong>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '10px 8px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '64px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Queue</span>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                {junctionPerformance.avg_queue_veh} veh
              </strong>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '10px 8px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '64px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Phase Fails</span>
              <strong style={{ fontSize: '14px', color: junctionPerformance.phase_failures > 0 ? 'var(--color-critical)' : 'var(--text-primary)' }}>
                {junctionPerformance.phase_failures}
              </strong>
            </div>

          </div>
        </div>
      )}

      {/* Creek Crossing comparison card */}
      {activeScenarioId === 'creek-crossing-demo' && (
        <div className="detail-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(14, 165, 233, 0.03)', borderLeft: '4px solid var(--rta-blue)' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-title)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
            Creek Crossing Comparison
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
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
                    padding: '8px', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    border: isCurrent ? '2px solid var(--rta-blue)' : '1px solid var(--border-color)',
                    textAlign: 'center',
                    position: 'relative'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-title)' }}>
                    {locId === 'GAR_N1' ? 'Garhoud' : locId === 'MAK_N1' ? 'Maktoum' : 'B. Bay'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {corRow.avg_speed_kph} kph
                  </div>
                  <span className={`badge-risk ${corRow.risk_level.toLowerCase()}`} style={{ fontSize: '10px', padding: '1px 4px', borderRadius: '3px', display: 'inline-block', marginTop: '4px' }}>
                    {corRow.congestion_pressure_score} Risk
                  </span>
                  {isLowest && (
                    <div style={{ position: 'absolute', top: '-8px', right: '4px', background: 'var(--color-low)', color: 'white', fontSize: '8px', fontWeight: 'bold', padding: '1px 4px', borderRadius: '3px' }}>
                      BEST
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Adjacent crossing alternatives */}
      {alternatives && activeScenarioId !== 'creek-crossing-demo' && (
        <div className="detail-card" style={{ background: 'var(--bg-panel)', borderLeft: '4px solid var(--rta-blue)', padding: '12px 16px' }}>
          <span style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--rta-blue)', fontWeight: 700 }}>
            Adjacent Alternatives
          </span>
          <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4, margin: 0 }}>
            Divert to alternative crossings: <strong>{alternatives}</strong>.
          </p>
        </div>
      )}

    </div>
  );
};

export default CorridorDetails;
