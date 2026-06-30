import React from 'react';
import { HelpCircle, Info, ChevronRight } from 'lucide-react';
import { Corridor } from '../lib/types';

interface TrafficRiskTableProps {
  sortedCorridors: Corridor[];
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string) => void;
  activeScenarioId: string;
  showTooltip: boolean;
  setShowTooltip: (show: boolean) => void;
  getRecommendedActionForCorridor: (cor: Corridor) => { action: string; reason: string };
  showInfoFooter?: boolean;
}

export const TrafficRiskTable: React.FC<TrafficRiskTableProps> = ({
  sortedCorridors,
  selectedLocationId,
  setSelectedLocationId,
  activeScenarioId,
  showTooltip,
  setShowTooltip,
  getRecommendedActionForCorridor,
  showInfoFooter = true
}) => {
  return (
    <div className="detail-card" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }} id="section-c-ranking-table">
      
      {/* Title & Help tooltip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <span className="kpi-title" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-title)' }}>
          Top Congestion Risks (Current Hour)
        </span>
        <div className="helper-text" style={{ cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-secondary)' }} onClick={() => setShowTooltip(!showTooltip)}>
          <HelpCircle size={15} /> Congestion Weight Factors
          {showTooltip && (
            <div style={{ position: 'absolute', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', zIndex: 10, width: '260px', boxShadow: 'var(--shadow-focus)', top: '28px', right: '0px', textTransform: 'none', color: 'var(--text-primary)', fontWeight: 'normal', lineHeight: 1.5 }}>
              <strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Weighted Components:</strong>
              <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>• 35% Volume-to-Capacity ratio</div>
                <div>• 20% Speed drop vs limit</div>
                <div>• 15% Travel time index scaling</div>
                <div>• 10% Raw vehicle demand volume</div>
                <div>• 8% Active incident blockages</div>
                <div>• 7% Nearby junction saturation</div>
                <div>• 5% Calendar holiday multipliers</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scenario Context Badge */}
      <div>
        {activeScenarioId === 'creek-crossing-demo' && (
          <div className="recommend-badge" style={{ fontSize: '14px', padding: '6px 12px' }}>
            Comparing Creek crossings: Garhoud, Maktoum, Business Bay
          </div>
        )}
        {activeScenarioId === 'pm-peak-demo' && (
          <div className="recommend-badge" style={{ fontSize: '14px', padding: '6px 12px' }}>
            Focus Corridor: SZR Commuter Egress
          </div>
        )}
        {activeScenarioId === 'signal-delay-demo' && (
          <div className="recommend-badge" style={{ fontSize: '14px', padding: '6px 12px' }}>
            Focus: Deira Junction Optimization
          </div>
        )}
      </div>

      {/* List Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sortedCorridors.map(cor => {
          const isSelected = selectedLocationId === cor.location_id;
          const isIncident = cor.incident_affected;
          const isCapacity = cor.vc_ratio > 0.9;
          const mainCause = isIncident ? 'Incident blockages' : isCapacity ? 'Volume near capacity' : 'PM Peak Commute';
          const rec = getRecommendedActionForCorridor(cor);
          
          // Estimate delay seconds from TTI realistically
          const estimatedDelaySec = cor.junction_performance?.average_delay_seconds 
            ? Math.round(cor.junction_performance.average_delay_seconds) 
            : Math.max(0, Math.round((cor.travel_time_index - 1.0) * 120));

          let riskColor = 'var(--color-low)';
          if (cor.congestion_pressure_score >= 80) riskColor = 'var(--color-critical)';
          else if (cor.congestion_pressure_score >= 60) riskColor = 'var(--color-high)';
          else if (cor.congestion_pressure_score >= 40) riskColor = 'var(--color-medium)';

          return (
            <div
              key={cor.location_id}
              onClick={() => setSelectedLocationId(cor.location_id)}
              className="hotspot-row-card animate-fade-in"
              id={`ranking-row-${cor.location_id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: '12px',
                background: isSelected ? 'rgba(14, 165, 233, 0.05)' : 'var(--bg-main)',
                border: isSelected ? '2px solid var(--rta-blue)' : '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Corridor Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '16px', color: 'var(--text-title)' }}>
                    {cor.road_name} ({cor.direction})
                  </strong>
                  <span style={{ fontSize: '12px', padding: '2px 6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                    {cor.location_id}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Area: {cor.area} · Cause: <span style={{ fontWeight: 600 }}>{mainCause}</span>
                </div>
              </div>

              {/* Volume & Delays */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: '1', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>VOLUME</span>
                  <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{cor.volume_vph} vph</strong>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>DELAY</span>
                  <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{estimatedDelaySec}s</strong>
                </div>
              </div>

              {/* Action Recommendation */}
              <div style={{ flex: '1.5', paddingLeft: '12px' }}>
                <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>RECOMMENDED ACTION</span>
                <span style={{ color: 'var(--rta-blue)', fontWeight: 700, fontSize: '15px' }}>{rec.action}</span>
              </div>

              {/* Risk Score Pill & Chevron */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: '15px', 
                    fontWeight: 800, 
                    color: 'white', 
                    background: riskColor,
                    padding: '6px 12px',
                    borderRadius: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {cor.congestion_pressure_score}
                  </span>
                </div>
                <ChevronRight size={18} style={{ color: isSelected ? 'var(--rta-blue)' : 'var(--text-muted)' }} />
              </div>

            </div>
          );
        })}
      </div>

      {showInfoFooter && (
        <div style={{ padding: '8px 0 0 0', borderTop: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info size={14} /> <span>Click any corridor card row to load detailed predictive metrics on the Map or Forecast tabs.</span>
        </div>
      )}
    </div>
  );
};
export default TrafficRiskTable;
