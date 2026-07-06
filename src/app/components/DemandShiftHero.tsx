import React from 'react';
import { TrendingDown, Users, Train, Car, Shield, CheckCircle, AlertTriangle, Search } from 'lucide-react';
import { Corridor } from '../lib/types';
import { 
  DemandShiftPlan, 
  BeforeAfter, 
  DemandPressure, 
  CommuteEstimate,
  simulateBeforeAfter,
  generateCampaignMix,
  calcDemandPressure,
  calcCommuteEstimate
} from '../lib/demandShiftEngine';

interface DemandShiftHeroProps {
  corridor: Corridor | null;
  activeScenarioId?: string;
  onApprove: () => void;
  onReview: () => void;
  onDismiss: () => void;
}

export const DemandShiftHero: React.FC<DemandShiftHeroProps> = ({
  corridor,
  activeScenarioId,
  onApprove,
  onReview,
  onDismiss
}) => {
  if (!corridor) {
    return (
      <div className="detail-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <TrendingDown size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Select a corridor to view demand shift analysis</div>
      </div>
    );
  }

  const pressure: DemandPressure = calcDemandPressure(corridor, activeScenarioId);
  const commute: CommuteEstimate = calcCommuteEstimate(corridor, activeScenarioId);
  const plan: DemandShiftPlan = generateCampaignMix(corridor, activeScenarioId);
  const ba: BeforeAfter = simulateBeforeAfter(corridor, activeScenarioId);
  const needsShift = pressure.excess > 0 || pressure.vcRatio > 0.85;

  const strategyIcons: Record<string, React.ReactNode> = {
    'employer-flex': <Users size={16} />,
    'metro-nol': <Train size={16} />,
    'parking-reward': <Car size={16} />,
    'flow-support': <Shield size={16} />,
  };

  return (
    <div className="detail-card animate-fade-in" style={{ padding: '0', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ 
        padding: '20px 24px', 
        background: needsShift ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(251, 146, 60, 0.06))' : 'rgba(34, 197, 94, 0.05)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingDown size={22} style={{ color: needsShift ? 'var(--color-critical)' : 'var(--color-low)' }} />
            Before vs After — Demand Shift Impact
          </h3>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {corridor.road_name} ({corridor.direction}) · {corridor.area}
          </div>
        </div>
        {needsShift && (
          <span style={{ 
            fontSize: '11px', fontWeight: 800, color: 'white', 
            background: 'var(--color-critical)', padding: '4px 12px', borderRadius: '4px',
            textTransform: 'uppercase', letterSpacing: '0.5px'
          }}>
            Shift Required
          </span>
        )}
      </div>

      {/* Before / After Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0' }}>
        
        {/* BEFORE */}
        <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border-color)', background: 'rgba(239, 68, 68, 0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-critical)', marginBottom: '16px' }}>
            Before (Current Peak)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <MetricRow label="Demand" value={`${ba.before.demand.toLocaleString()} vph`} color="var(--text-primary)" />
            <MetricRow label="V/C Ratio" value={`${ba.before.vc.toFixed(2)}`} color={ba.before.vc > 0.95 ? 'var(--color-critical)' : 'var(--text-primary)'} />
            <MetricRow label="Commute" value={`${ba.before.commuteMin} min`} color={ba.before.commuteMin > 45 ? 'var(--color-critical)' : 'var(--text-primary)'} bold />
            <MetricRow label="LOS" value={ba.before.los} color={ba.before.los === 'F' ? 'var(--color-critical)' : ba.before.los === 'E' ? 'var(--color-high)' : 'var(--text-primary)'} />
          </div>
        </div>

        {/* AFTER */}
        <div style={{ padding: '20px 24px', background: 'rgba(34, 197, 94, 0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-low)', marginBottom: '16px' }}>
            After (Shift Plan Applied)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <MetricRow label="Demand" value={`${ba.after.demand.toLocaleString()} vph`} color="var(--color-low)" />
            <MetricRow label="V/C Ratio" value={`${ba.after.vc.toFixed(2)}`} color="var(--color-low)" />
            <MetricRow label="Commute" value={`${ba.after.commuteRange[0]}–${ba.after.commuteRange[1]} min`} color="var(--color-low)" bold />
            <MetricRow label="LOS" value={ba.after.los} color="var(--color-low)" />
          </div>
        </div>
      </div>

      {/* Minutes Saved Banner */}
      {ba.minutesSaved > 0 && (
        <div style={{ 
          padding: '14px 24px', 
          background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.1), rgba(14, 165, 233, 0.08))',
          borderTop: '1px solid var(--border-color)',
          borderBottom: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-low)' }}>
            ≈ {ba.minutesSaved} minutes saved
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '10px' }}>
            per peak-hour commute
          </span>
        </div>
      )}

      {/* AI Recommended Campaign Mix */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--rta-blue)', marginBottom: '14px' }}>
          AI Recommended Campaign Mix
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {plan.strategies.map((s, idx) => (
            <div key={s.type} style={{ 
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 14px', borderRadius: '8px',
              background: s.isSupport ? 'var(--bg-main)' : 'var(--bg-card)',
              border: `1px solid ${s.isSupport ? 'var(--border-color)' : 'rgba(14, 165, 233, 0.2)'}`,
              opacity: s.isSupport ? 0.85 : 1
            }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '8px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: s.isSupport ? 'var(--border-color)' : 'var(--rta-blue-bg)',
                color: s.isSupport ? 'var(--text-secondary)' : 'var(--rta-blue)',
                flexShrink: 0
              }}>
                {strategyIcons[s.type]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-title)' }}>
                  {idx + 1}. {s.label}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {s.isSupport ? s.description : s.example}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {s.isSupport ? (
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Support
                  </span>
                ) : (
                  <>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--rta-blue)' }}>
                      {s.tripsToShift.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      trips/hr ({s.shiftPctRange})
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Confidence + Approval */}
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Confidence: <strong style={{ color: 'var(--rta-blue)' }}>{plan.confidence}%</strong>
            </span>
            <span style={{ fontSize: '13px', color: 'var(--color-medium)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={13} /> Operator Approval Required
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {needsShift && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
            <button
              onClick={onApprove}
              className="btn-action approve"
              style={{ 
                flex: 1, padding: '12px', fontSize: '14px', fontWeight: 700,
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <CheckCircle size={16} /> Approve Campaign
            </button>
            <button
              onClick={onReview}
              className="btn-action secondary"
              style={{ 
                flex: 0.6, padding: '12px', fontSize: '14px', fontWeight: 700,
                border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer',
                background: 'var(--bg-card)', color: 'var(--text-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Search size={16} /> Request More Analysis
            </button>
            <button
              onClick={onDismiss}
              style={{ 
                flex: 0.4, padding: '12px', fontSize: '14px', fontWeight: 600,
                border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer',
                background: 'transparent', color: 'var(--text-secondary)'
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '12px', lineHeight: 1.4 }}>
          Estimated business-corridor commute impact. Results based on historical traffic patterns and scenario simulation.
        </div>
      </div>
    </div>
  );
};

/** Small helper component for metric rows */
const MetricRow: React.FC<{ label: string; value: string; color: string; bold?: boolean }> = ({ label, value, color, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontSize: bold ? '20px' : '16px', fontWeight: bold ? 800 : 700, color }}>{value}</span>
  </div>
);

export default DemandShiftHero;
