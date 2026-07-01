import React from 'react';
import { Cpu, Shield, AlertTriangle, CheckCircle, Database, Lock, Eye } from 'lucide-react';
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

  // New workflow props
  workflowResponse?: any;
  isWorkflowLoading?: boolean;
  handleTriggerWorkflow?: () => void;
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
  mitigatedData,
  workflowResponse,
  isWorkflowLoading,
  handleTriggerWorkflow
}) => {
  // Empty state check
  if (!selectedCorridor) {
    return (
      <div className="detail-card" style={{ padding: '40px 24px', textAlign: 'center', borderStyle: 'dashed' }}>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          Select a hotspot from the Overview table or Live Map to generate an operator briefing.
        </p>
      </div>
    );
  }

  // Helper for severity colors
  const getSeverityColor = (sev: string) => {
    const s = (sev || '').toLowerCase();
    if (s === 'critical') return 'var(--color-critical)';
    if (s === 'high') return 'var(--color-high)';
    if (s === 'medium') return 'var(--color-medium)';
    return 'var(--color-low)';
  };

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
    <div className="detail-card animate-fade-in" id="panel-briefing" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
      
      {/* Active Hotspot Card */}
      <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px' }}>
        <h4 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-title)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '12px', lineHeight: 1.3 }}>
          Active Hotspot: {selectedCorridor.road_name} ({selectedCorridor.direction})
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '15px', lineHeight: 1.4 }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Risk Status:</span>{' '}
            <strong style={{ color: selectedCorridor.congestion_pressure_score >= 80 ? 'var(--color-critical)' : selectedCorridor.congestion_pressure_score >= 60 ? 'var(--color-high)' : selectedCorridor.congestion_pressure_score >= 40 ? 'var(--color-medium)' : 'var(--color-low)' }}>
              {selectedCorridor.congestion_pressure_score} / {selectedCorridor.risk_level}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Selected Action:</span>{' '}
            <strong style={{ color: 'var(--text-title)' }}>{mitigationText}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Expected Impact:</span>{' '}
            <strong style={{ color: activeMitigationKey === 'monitor' ? 'var(--text-primary)' : 'var(--color-low)' }}>{expectedImpactSummary}</strong>
          </div>
        </div>
      </div>

      {/* Badges Bar (rendered if workflow is loading or loaded) */}
      {(isWorkflowLoading || workflowResponse) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
          {isWorkflowLoading && (
            <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
              Running Mistral Workflow…
            </span>
          )}
          {workflowResponse && (
            <>
              {workflowResponse.isFallback ? (
                <span style={{ fontSize: '11px', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Fallback briefing active
                </span>
              ) : (
                <span style={{ fontSize: '11px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Generated by Mistral Workflow
                </span>
              )}
              {workflowResponse.safetyCheck?.passed && (
                <span style={{ fontSize: '11px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Safety checked
                </span>
              )}
              {workflowResponse.recommendedActions?.some((a: any) => a.requiresHumanApproval) && (
                <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Human approval required
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Main Workflow vs Standard Panel View */}
      {isWorkflowLoading ? (
        <div style={{ padding: '40px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="loader-ring" style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--rta-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: 0 }}>
            Calling PeakFlow Congestion Prevention Workflow...
          </p>
        </div>
      ) : workflowResponse ? (
        // RENDER RICH WORKFLOW OUTPUT
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 1. Headline & Situation Summary */}
          <div>
            <h4 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-title)', marginBottom: '8px', lineHeight: 1.3 }}>
              {workflowResponse.operatorBriefing?.headline || "Workflow Congestion Analysis"}
            </h4>
            <p style={{ color: 'var(--text-primary)', fontSize: '14.5px', lineHeight: 1.5, margin: 0 }}>
              {workflowResponse.summary}
            </p>
          </div>

          {/* 2. Next Steps */}
          {workflowResponse.operatorBriefing?.recommendedNextSteps?.length > 0 && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recommended Steps</div>
              <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {workflowResponse.operatorBriefing.recommendedNextSteps.map((step: string, idx: number) => (
                  <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 3. Top Risks Section */}
          {workflowResponse.topRisks?.length > 0 && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Risks Analyzed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {workflowResponse.topRisks.map((risk: any, idx: number) => (
                  <div key={idx} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-title)' }}>{risk.corridor}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'white', padding: '3px 8px', borderRadius: '4px', background: getSeverityColor(risk.severity) }}>
                        {risk.severity.toUpperCase()} ({risk.riskScore}/100)
                      </span>
                    </div>
                    <div style={{ fontSize: '13.5px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Cause:</span> {risk.mainCause}
                    </div>
                    {risk.evidence?.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                        {risk.evidence.map((ev: string, evIdx: number) => (
                          <div key={evIdx} style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--rta-blue)' }}>•</span> {ev}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Recommended Actions Section */}
          {workflowResponse.recommendedActions?.length > 0 && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recommended Prevention Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {workflowResponse.recommendedActions.map((action: any, idx: number) => (
                  <div key={idx} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '8px', borderLeft: '4px solid var(--rta-blue)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-title)' }}>{action.type}</span>
                      <span style={{ fontSize: '12px', color: 'var(--color-low)', fontWeight: 600 }}>
                        Confidence: {Math.round(action.confidence * 100)}%
                      </span>
                    </div>
                    <div style={{ fontSize: '13.5px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Target:</span> {action.target}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {action.explanation}
                    </div>
                    {action.requiresHumanApproval && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-medium)', marginTop: '8px', fontWeight: 600 }}>
                        <Lock size={12} /> HUMAN APPROVAL REQUIRED
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Roadside Board Board (Directly matches selected corridor) */}
          <RoadsideAdvisoryBoard text={getRoadsideAdvisoryText()} />

          {/* 6. Data Evidence Details */}
          {workflowResponse.dataEvidence && (
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Database size={14} /> Datasets & Telemetry Sources
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Datasets Checked:</span> {workflowResponse.dataEvidence.datasetsUsed?.join(', ')}
              </div>
              {workflowResponse.dataEvidence.keySignals?.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Key Signals:</span> {workflowResponse.dataEvidence.keySignals.join('; ')}
                </div>
              )}
            </div>
          )}

          {/* 7. Safety Logs Output */}
          {workflowResponse.safetyCheck && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#22c55e' }}>
                <CheckCircle size={15} /> Safety Verification Logs
              </div>
              {workflowResponse.safetyCheck.notes?.map((note: string, nIdx: number) => (
                <div key={nIdx} style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.35 }}>
                  {note}
                </div>
              ))}
              {workflowResponse.safetyCheck.blockedTermsFound?.length > 0 && (
                <div style={{ fontSize: '11px', color: 'var(--color-medium)', fontStyle: 'italic' }}>
                  * Replaced prohibited auto-control actions: {workflowResponse.safetyCheck.blockedTermsFound.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Human Reminder */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--color-medium)', padding: '14px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)', lineHeight: 1.45 }}>
            <Shield size={18} style={{ flexShrink: 0 }} />
            <span>{workflowResponse.operatorBriefing?.humanOversightReminder || "All actions require operator review and approval before implementation."}</span>
          </div>

          {/* Approval Buttons */}
          <div className="approval-bar" style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => handleOperatorDecision('approve')} 
              className="btn-action approve"
              id="btn-approve"
              style={{ flex: 1, padding: '14px 20px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', borderRadius: '8px', height: '48px' }}
            >
              Approve Action
            </button>
            <button 
              onClick={() => handleOperatorDecision('reject')} 
              className="btn-action reject"
              id="btn-reject"
              style={{ flex: 1, padding: '14px 20px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', borderRadius: '8px', height: '48px' }}
            >
              Dismiss
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => handleOperatorDecision('review')} 
              className="btn-action secondary"
              id="btn-escalate"
              style={{ flex: 1, padding: '12px 16px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-primary)', height: '44px' }}
            >
              Request More Analysis
            </button>
            <button 
              onClick={handleTriggerWorkflow} 
              className="btn-action secondary"
              id="btn-regenerate"
              style={{ flex: 1, padding: '12px 16px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-primary)', height: '44px' }}
            >
              Run Mistral Workflow
            </button>
          </div>
        </div>
      ) : briefing ? (
        // RENDER STANDARD BRIEFING
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div className="brief-section-title" style={{ fontSize: '19px', fontWeight: 700, marginBottom: '6px', lineHeight: 1.3 }}>Situation Summary</div>
            <p style={{ color: 'var(--text-primary)', fontSize: '16px', lineHeight: 1.5, margin: 0 }}>
              {formatBriefField(buildSafeSituationSummary(selectedCorridor))}
            </p>
          </div>

          <div>
            <div className="brief-section-title" style={{ fontSize: '19px', fontWeight: 700, marginBottom: '6px', lineHeight: 1.3 }}>Cause Explanation</div>
            <p style={{ color: 'var(--text-primary)', fontSize: '16px', lineHeight: 1.5, margin: 0 }}>
              {formatBriefField(briefing.causeExplanation)}
            </p>
          </div>

          <div>
            <div className="brief-section-title" style={{ fontSize: '19px', fontWeight: 700, marginBottom: '6px', lineHeight: 1.3 }}>Recommended Action</div>
            <p style={{ fontWeight: 600, color: 'var(--text-title)', fontSize: '16px', lineHeight: 1.5, margin: 0 }}>
              {formatBriefField(briefing.recommendedAction)}
            </p>
          </div>

          <RoadsideAdvisoryBoard text={getRoadsideAdvisoryText()} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--color-medium)', padding: '14px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)', lineHeight: 1.45 }}>
            <Shield size={18} style={{ flexShrink: 0 }} />
            <span>Human operator review and explicit approval required. System will NOT trigger signals or direct vehicles.</span>
          </div>

          <div className="approval-bar" style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => handleOperatorDecision('approve')} 
              className="btn-action approve"
              id="btn-approve"
              style={{ flex: 1, padding: '14px 20px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', borderRadius: '8px', height: '48px' }}
            >
              Approve Action
            </button>
            <button 
              onClick={() => handleOperatorDecision('reject')} 
              className="btn-action reject"
              id="btn-reject"
              style={{ flex: 1, padding: '14px 20px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', borderRadius: '8px', height: '48px' }}
            >
              Dismiss
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => handleOperatorDecision('review')} 
              className="btn-action secondary"
              id="btn-escalate"
              style={{ flex: 1, padding: '12px 16px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-primary)', height: '44px' }}
            >
              Request More Analysis
            </button>
            <button 
              onClick={handleTriggerWorkflow} 
              className="btn-action secondary"
              id="btn-regenerate"
              style={{ flex: 1, padding: '12px 16px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-primary)', height: '44px' }}
            >
              Run Mistral Workflow
            </button>
          </div>
        </div>
      ) : (
        // INITIAL EMPTY STATE
        <div style={{ padding: '36px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, textAlign: 'center' }}>
            Trigger either a basic operator briefing draft, or run the full **PeakFlow Congestion Prevention Workflow** for real-time analysis.
          </p>
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button
              onClick={handleGenerateBriefing}
              disabled={isGeneratingBrief}
              className="btn-action secondary"
              style={{ flex: 1, padding: '12px 16px', fontSize: '14.5px', fontWeight: 700, cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
            >
              {isGeneratingBrief ? 'Generating...' : 'Basic Briefing Draft'}
            </button>
            <button
              onClick={handleTriggerWorkflow}
              disabled={isWorkflowLoading}
              className="btn-action approve"
              style={{ flex: 1, padding: '12px 16px', fontSize: '14.5px', fontWeight: 700, cursor: 'pointer', border: 'none', borderRadius: '8px', background: 'var(--rta-blue)' }}
            >
              {isWorkflowLoading ? 'Running...' : 'Run Mistral Workflow'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default AiBriefingPanel;
