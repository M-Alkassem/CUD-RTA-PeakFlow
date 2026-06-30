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
}

export const AiBriefingPanel: React.FC<AiBriefingPanelProps> = ({
  briefing,
  isGeneratingBrief,
  handleGenerateBriefing,
  selectedCorridor,
  handleOperatorDecision,
  formatBriefField,
  buildSafeSituationSummary
}) => {
  if (!selectedCorridor) return null;

  return (
    <div className="detail-card animate-fade-in" id="panel-briefing" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
        <span className="kpi-title" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Cpu size={12} className="text-primary" /> Copilot Engineering Brief
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="ai-badge">AI Source: Mistral Studio Agent</span>
        </div>
      </div>

      <div className="recommend-badge" style={{ fontSize: '8.5px', padding: '3px 6px' }}>
        Active Hotspot Target: <strong>{selectedCorridor.location_id}</strong> ({selectedCorridor.location_name})
      </div>

      {!briefing ? (
        <div style={{ padding: '24px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            AI-generated briefs and official roadside advisory text drafts will display here once generated.
          </p>
          <button
            onClick={handleGenerateBriefing}
            disabled={isGeneratingBrief}
            className="btn-action approve"
            style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 700 }}
          >
            {isGeneratingBrief ? 'Generating Draft via Mistral...' : 'Generate Operator Briefing'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <div className="brief-section-title">Situation Summary</div>
            <p style={{ color: 'var(--text-primary)', fontSize: '11px', lineHeight: 1.4 }}>
              {formatBriefField(buildSafeSituationSummary(selectedCorridor))}
            </p>
          </div>

          <div>
            <div className="brief-section-title">Cause Explanation</div>
            <p style={{ color: 'var(--text-primary)', fontSize: '11px', lineHeight: 1.4 }}>
              {formatBriefField(briefing.causeExplanation)}
            </p>
          </div>

          <div>
            <div className="brief-section-title">Recommended Action</div>
            <p style={{ fontWeight: 600, color: 'var(--text-title)', fontSize: '11px', lineHeight: 1.4 }}>
              {formatBriefField(briefing.recommendedAction)}
            </p>
          </div>

          <RoadsideAdvisoryBoard 
            text={briefing.publicAdvisory 
              ? formatBriefField(briefing.publicAdvisory).replace(/^Roadside [aA]dvisory [dD]raft:?\s*/i, '').replace(/['"]/g, '') 
              : 'RTA ROADSIDE PREVIEW'} 
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', color: 'var(--color-medium)', padding: '8px', background: 'var(--bg-main)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
            <Shield size={12} />
            <span>Human operator review and explicit approval required. System will NOT trigger signals or direct vehicles.</span>
          </div>

          <div className="approval-bar" style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => handleOperatorDecision('approve')} 
              className="btn-action approve"
              id="btn-approve"
              style={{ flex: 1, padding: '10px' }}
            >
              <ThumbsUp size={12} /> Approve Action
            </button>
            <button 
              onClick={() => handleOperatorDecision('reject')} 
              className="btn-action reject"
              id="btn-reject"
              style={{ flex: 1, padding: '10px' }}
            >
              <ThumbsDown size={12} /> Reject recommendation
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => handleOperatorDecision('review')} 
              className="btn-action secondary"
              id="btn-escalate"
              style={{ flex: 1, padding: '6px 8px', fontSize: '9.5px' }}
            >
              Request Engineering Review
            </button>
            <button 
              onClick={handleGenerateBriefing} 
              className="btn-action secondary"
              id="btn-regenerate"
              style={{ flex: 1, padding: '6px 8px', fontSize: '9.5px' }}
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
