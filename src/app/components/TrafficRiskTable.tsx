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
  getRecommendedActionForCorridor: (cor: Corridor) => {
    action: string;
    congestionReducingAction: string;
    expectedImpact: string;
    doNothingRisk: string;
    dataEvidence: string;
    operatorApprovalRequired: string;
  };
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
    <div className="detail-card" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }} id="section-c-ranking-table">
      
      {/* Title & Help tooltip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <span className="kpi-title" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-title)' }}>
          Corridor Demand Pressure Ranking
        </span>
        <div className="helper-text" style={{ cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', color: 'var(--text-secondary)' }} onClick={() => setShowTooltip(!showTooltip)}>
          <HelpCircle size={16} /> Demand Pressure Factors
          {showTooltip && (
            <div style={{ position: 'absolute', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', zIndex: 10, width: '260px', boxShadow: 'var(--shadow-focus)', top: '30px', right: '0px', textTransform: 'none', color: 'var(--text-primary)', fontWeight: 'normal', lineHeight: 1.5 }}>
              <strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Demand Pressure Inputs:</strong>
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
          <div className="recommend-badge" style={{ fontSize: '15px', padding: '8px 14px' }}>
            Comparing Creek crossings: Garhoud, Maktoum, Business Bay
          </div>
        )}
        {activeScenarioId === 'pm-peak-demo' && (
          <div className="recommend-badge" style={{ fontSize: '15px', padding: '8px 14px' }}>
            Focus: SZR → DIFC / Business Bay — AM Peak 08:00–09:00
          </div>
        )}
        {activeScenarioId === 'signal-delay-demo' && (
          <div className="recommend-badge" style={{ fontSize: '15px', padding: '8px 14px' }}>
            Focus: Deira Junction Optimization
          </div>
        )}
      </div>

      {/* List Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sortedCorridors.map(cor => {
          const isSelected = selectedLocationId === cor.location_id;
          const isIncident = cor.incident_affected;
          const isCapacity = cor.vc_ratio > 0.8;
          const mainCause = isIncident ? 'Incident blockages' : isCapacity ? 'Demand above capacity' : 'AM peak commute pressure';
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
                padding: '20px 24px',
                borderRadius: '12px',
                background: isSelected ? 'rgba(14, 165, 233, 0.05)' : 'var(--bg-main)',
                border: isSelected ? '2px solid var(--rta-blue)' : '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Corridor Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '2.5', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '18px', color: 'var(--text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cor.road_name} ({cor.direction})
                  </strong>
                  <span style={{ fontSize: '13px', padding: '2px 6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                    {cor.location_id}
                  </span>
                </div>
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                  Area: {cor.area} · Cause: <span style={{ fontWeight: 600 }}>{mainCause}</span>
                </div>
              </div>

              {/* Volume & Delays */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: '1.5', justifyContent: 'center', minWidth: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>DEMAND</span>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{cor.demand_vph || cor.volume_vph} vph</strong>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '12px', color: cor.vc_ratio > 0.8 ? 'var(--color-critical)' : 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>EXCESS</span>
                  <strong style={{ fontSize: '16px', color: cor.vc_ratio > 0.8 ? 'var(--color-critical)' : 'var(--color-low)' }}>{Math.max(0, (cor.demand_vph || cor.volume_vph) - Math.round((cor.capacity_vph || 12000) * 0.80)).toLocaleString()}</strong>
                </div>
              </div>

              {/* Action Recommendation */}
              <div style={{ flex: '2', paddingLeft: '24px', minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>SHIFT PLAN</span>
                <span style={{ color: 'var(--rta-blue)', fontWeight: 700, fontSize: '15px' }}>{cor.vc_ratio > 0.8 ? 'Employer Flex + Metro + Parking' : cor.vc_ratio > 0.75 ? 'Light Advisory' : 'No shift needed'}</span>
              </div>

              {/* Demand Pressure Indicator & Chevron */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1', justifyContent: 'flex-end', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 800, 
                    color: 'white', 
                    background: riskColor,
                    padding: '6px 14px',
                    borderRadius: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    V/C {cor.vc_ratio.toFixed(2)}
                  </span>
                </div>
                <ChevronRight size={20} style={{ color: isSelected ? 'var(--rta-blue)' : 'var(--text-muted)' }} />
              </div>

            </div>
          );
        })}
      </div>

      {showInfoFooter && (
        <div style={{ padding: '12px 0 0 0', borderTop: '1px solid var(--border-color)', fontSize: '14px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info size={15} /> <span>Click any corridor to view demand shift analysis on the Shift Planner tab.</span>
        </div>
      )}
    </div>
  );
};
export default TrafficRiskTable;
