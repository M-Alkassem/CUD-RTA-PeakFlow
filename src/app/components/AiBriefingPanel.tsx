import React from 'react';
import { Cpu, Shield, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Corridor } from '../lib/types';
import { RoadsideAdvisoryBoard } from './RoadsideAdvisoryBoard';

interface AiBriefingPanelProps {
  briefing: any;
  isGeneratingBrief: boolean;
  handleGenerateBriefing: () => void;
  selectedCorridor: Corridor | null;
  handleOperatorDecision: (action: 'approve' | 'reject' | 'review') => void;
  formatBriefField: (field: any) => string;
  buildSafeSituationSummary: (corridor: any) => string;
  activeMitigationKey: string;
  mitigatedData: any;
}

export const AiBriefingPanel: React.FC<AiBriefingPanelProps> = ({
  briefing,
  isGeneratingBrief,
  handleGenerateBriefing,
  selectedCorridor,
  handleOperatorDecision,
  formatBriefField,
  buildSafeSituationSummary,
  activeMitigationKey,
  mitigatedData
}) => {
  // Empty state handling
  if (!selectedCorridor) {
    return (
      <div className="detail-card" style={{ padding: '40px 20px', textAlign: 'center', borderStyle: 'dashed' }}>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
          Select a hotspot from the Overview table or Live Map to generate an operator briefing.
        </p>
      </div>
    );
  }

  // Map option keys to display names
  const mitigationText = {
    'route-advisory': 'Route Advisory',
    'signal-timing': 'Signal Timing Review',
    'metro-riders': 'Public Transport Advisory',
    'salik-shift': 'Off-Peak Demand Shift',
    'incident-response': 'Incident Response',
    'monitor': 'Monitor Only'
  }[activeMitigationKey] || 'Monitor Only';

  const expectedImpactSummary = activeMitigationKey === 'monitor'
    ? `No change; risk remains ${selectedCorridor.congestion_pressure_score} / ${selectedCorridor.risk_level}`
    : mitigatedData
    ? `Reduces risk to ${mitigatedData.score} / ${mitigatedData.level}`
    : `Risk remains ${selectedCorridor.congestion_pressure_score} / ${selectedCorridor.risk_level}`;

  // Consistent Roadside Advisory Text based on Risk Level & Incidents
  const getRoadsideAdvisoryText = () => {
    const isStorm = selectedCorridor.location_id === 'SZR_N1' || 
                    selectedCorridor.active_incidents?.some(inc => inc.weather_condition === 'Rain' || inc.weather_condition === 'Storm');
    const hasIncident = selectedCorridor.incident_affected;

    if (hasIncident || isStorm) {
      return 'Incident disruption ahead. Use official alternate routes and follow roadside signs.';
    }

    const score = selectedCorridor.congestion_pressure_score;
    if (score >= 60) {
      return 'Delays expected ahead. Consider alternate official routes and follow roadside signs.';
    } else if (score >= 40) {
      return 'Moderate delays possible ahead. Consider alternate official routes where available.';
    } else {
      return 'Traffic operating normally. Continue monitoring official roadside guidance.';
    }
  };

  return (
    <div className="detail-card animate-fade-in" id="panel-briefing" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
      
      {/* 1. Active Hotspot Card */}
      <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-title)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '10px' }}>
          Active Hotspot: {selectedCorridor.road_name} ({selectedCorridor.direction})
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '15px' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Risk:</span>{' '}
            <strong style={{ color: selectedCorridor.congestion_pressure_score >= 80 ? 'var(--color-critical)' : selectedCorridor.congestion_pressure_score >= 60 ? 'var(--color-high)' : selectedCorridor.congestion_pressure_score >= 40 ? 'var(--color-medium)' : 'var(--color-low)' }}>
              {selectedCorridor.congestion_pressure_score} / {selectedCorridor.risk_level}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Selected Action:</span>{' '}
            <strong>{mitigationText}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Expected Impact:</span>{' '}
            <strong style={{ color: activeMitigationKey === 'monitor' ? 'var(--text-primary)' : 'var(--color-low)' }}>{expectedImpactSummary}</strong>
          </div>
          <div style={{ marginTop: '6px' }}>
            <span className="ai-badge" style={{ fontSize: '13px', background: 'var(--rta-blue-bg)', color: 'var(--rta-blue)', border: '1px solid var(--rta-blue-border)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
              AI Source: Mistral Studio Agent
            </span>
          </div>
        </div>
      </div>

      {/* 2. Generate Operator Briefing Card & Trigger Button */}
      {!briefing ? (
        <div style={{ padding: '30px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
            AI-generated operator briefs and official roadside advisory text drafts will display here once generated.
          </p>
          <button
            onClick={handleGenerateBriefing}
            disabled={isGeneratingBrief}
            className="btn-action approve"
            style={{ padding: '12px 24px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}
          >
            {isGeneratingBrief ? 'Generating Draft via Mistral...' : 'Generate Operator Briefing'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 3. Briefing Result Layout in Exact Sequence */}
          <div>
            <div className="brief-section-title" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Situation Summary</div>
            <p style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: 1.5 }}>
              {formatBriefField(buildSafeSituationSummary(selectedCorridor))}
            </p>
          </div>

          <div>
            <div className="brief-section-title" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Cause Explanation</div>
            <p style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: 1.5 }}>
              {formatBriefField(briefing.causeExplanation)}
            </p>
          </div>

          <div>
            <div className="brief-section-title" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Recommended Action</div>
            <p style={{ fontWeight: 600, color: 'var(--text-title)', fontSize: '15px', lineHeight: 1.5 }}>
              {formatBriefField(briefing.recommendedAction)}
            </p>
          </div>

          {/* 4. Official Roadside Advisory Board */}
          <RoadsideAdvisoryBoard 
            text={getRoadsideAdvisoryText()} 
          />

          {/* 5. Human Approval Note Warning */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--color-medium)', padding: '12px', background: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)', lineHeight: 1.4 }}>
            <Shield size={16} />
            <span>Human operator review and explicit approval required. System will NOT trigger signals or direct vehicles.</span>
          </div>

          {/* 6. Approval Buttons (Approve Action, Dismiss, Request More Analysis) */}
          <div className="approval-bar" style={{ marginTop: '8px', display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => handleOperatorDecision('approve')} 
              className="btn-action approve"
              id="btn-approve"
              style={{ flex: 1, padding: '12px 16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              Approve Action
            </button>
            <button 
              onClick={() => handleOperatorDecision('reject')} 
              className="btn-action reject"
              id="btn-reject"
              style={{ flex: 1, padding: '12px 16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              Dismiss
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => handleOperatorDecision('review')} 
              className="btn-action secondary"
              id="btn-escalate"
              style={{ flex: 1, padding: '10px 12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Request More Analysis
            </button>
            <button 
              onClick={handleGenerateBriefing} 
              className="btn-action secondary"
              id="btn-regenerate"
              style={{ flex: 1, padding: '10px 12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Regenerate Briefing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiBriefingPanel;
