import React from 'react';
import { CheckCircle } from 'lucide-react';
import { ApprovedImpact } from '../lib/types';

interface PreventionImpactSummaryProps {
  approvedImpact: ApprovedImpact | null;
}

export const PreventionImpactSummary: React.FC<PreventionImpactSummaryProps> = ({ approvedImpact }) => {
  if (!approvedImpact) return null;

  return (
    <div className="animate-fade-in" style={{ 
      background: 'rgba(40, 167, 69, 0.08)', 
      border: '1px solid rgba(40, 167, 69, 0.25)', 
      padding: '16px 20px', 
      borderRadius: '8px' 
    }} id="prevention-impact-summary">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-low)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={16} /> Prevention Impact Summary
        </span>
        <span className="badge-risk low" style={{ fontSize: '13px', padding: '2px 8px', color: 'var(--color-low)', border: '1px solid var(--color-low)', background: 'transparent' }}>
          {approvedImpact.status}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '15px', color: 'var(--text-primary)' }}>
        <div>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Before Demand Pressure:</span>{' '}
          <strong>{approvedImpact.beforeScore} / {approvedImpact.beforeLevel}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Approved Action:</span>{' '}
          <strong>{approvedImpact.approvedAction}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Expected Impact:</span>{' '}
          <strong>{approvedImpact.expectedImpact}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Main Reason:</span>{' '}
          <strong>{approvedImpact.mainReason}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Decision Status:</span>{' '}
          <strong style={{ color: 'var(--color-low)' }}>{approvedImpact.status}</strong>
        </div>
      </div>
    </div>
  );
};

export default PreventionImpactSummary;
