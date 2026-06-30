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
      background: 'rgba(16, 185, 129, 0.08)', 
      border: '1px solid rgba(16, 185, 129, 0.25)', 
      padding: '10px 12px', 
      borderRadius: '6px' 
    }} id="prevention-impact-summary">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-low)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle size={12} /> Prevention Impact Summary
        </span>
        <span className="badge-risk low" style={{ fontSize: '8px', padding: '1px 5px', color: 'var(--color-low)', border: '1px solid var(--color-low)', background: 'transparent' }}>
          {approvedImpact.status}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '9.5px', color: 'var(--text-primary)' }}>
        <div>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Before Risk Score:</span> {approvedImpact.beforeScore} / {approvedImpact.beforeLevel}
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Approved Action:</span> {approvedImpact.approvedAction}
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Expected Impact:</span> {approvedImpact.expectedImpact}
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Main Reason:</span> {approvedImpact.mainReason}
        </div>
      </div>
    </div>
  );
};

export default PreventionImpactSummary;
