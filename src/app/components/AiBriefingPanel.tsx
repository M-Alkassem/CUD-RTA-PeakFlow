'use client';

import React from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  ArrowRight, 
  Clock, 
  Cpu,
  LayoutDashboard
} from 'lucide-react';
import { Corridor } from '../lib/types';
import { 
  calcDemandPressure, 
  calcCommuteEstimate, 
  simulateBeforeAfter,
  vcToLOS
} from '../lib/demandShiftEngine';

interface AiBriefingPanelProps {
  briefing: any;
  isGeneratingBrief: boolean;
  handleGenerateBriefing: () => void;
  selectedCorridor: Corridor | null;
  activeScenarioId?: string;
  handleOperatorDecision: (action: 'approve' | 'reject' | 'review') => void;
  formatBriefField?: (field: any) => string;
  buildSafeSituationSummary?: (corridor: any) => string;
  activeMitigationKey?: string;
  mitigatedData?: any;
  workflowResponse?: any;
  isWorkflowLoading?: boolean;
  workflowError?: string | null;
  handleTriggerWorkflow?: () => void;
  selectedRecommendation: any;
  hour?: number;
}

export const AiBriefingPanel: React.FC<AiBriefingPanelProps> = ({
  briefing,
  isGeneratingBrief,
  handleGenerateBriefing,
  selectedCorridor,
  activeScenarioId,
  handleOperatorDecision,
  selectedRecommendation,
  hour = 17
}) => {

  // Trigger briefing generation automatically on mount / corridor change
  React.useEffect(() => {
    if (!briefing && !isGeneratingBrief && selectedCorridor) {
      handleGenerateBriefing();
    }
  }, [selectedCorridor, briefing, isGeneratingBrief, handleGenerateBriefing]);

  if (!selectedCorridor) {
    return (
      <div className="detail-card" style={{ padding: '40px 24px', textAlign: 'center', borderStyle: 'dashed' }}>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          Select a corridor from the Demand Pressure tab to view shift briefing.
        </p>
      </div>
    );
  }

  // Calculate demand shift metrics for local grounding
  const pressure = calcDemandPressure(selectedCorridor, activeScenarioId, hour);
  const commute = calcCommuteEstimate(selectedCorridor, activeScenarioId, hour);
  const ba = simulateBeforeAfter(selectedCorridor, activeScenarioId, hour);
  const beforeCommute = commute.currentMin;
  const minutesSaved = ba.minutesSaved;
  const afterLOS = ba.after.los;

  // Wording validation checks for safety compliance
  const hasAutoControlWording = (text: string) => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return lower.includes('dispatch') || lower.includes('auto-control') || lower.includes('automatically control') || lower.includes('force reroute') || lower.includes('execute signal');
  };

  const isWordingUnsafe = briefing && (
    hasAutoControlWording(briefing.situationSummary) ||
    hasAutoControlWording(briefing.causeExplanation) ||
    hasAutoControlWording(briefing.recommendedAction) ||
    hasAutoControlWording(briefing.publicAdvisory)
  );

  return (
    <div className="detail-card animate-fade-in" id="panel-briefing" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
      
      {/* Title & Metadata */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-title)', margin: '0 0 4px 0', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={22} style={{ color: 'var(--rta-blue)' }} />
            PeakFlow Shift Briefing
          </h2>
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            {selectedCorridor.road_name} ({selectedCorridor.direction}) · Hour {String(hour).padStart(2, '0')}:00–{String(hour + 1).padStart(2, '0')}:00
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/mistral/test?agent=operatorBriefing');
                  const data = await res.json();
                  if (data.success) {
                    alert(`Mistral Connection Success: Agent returned: "${data.response}"`);
                  } else {
                    alert(`Mistral Connection Failed: ${data.error}`);
                  }
                } catch (e: any) {
                  alert(`Mistral Test Request failed: ${e.message}`);
                }
              }}
              style={{
                fontSize: '11.5px',
                background: 'rgba(14, 165, 233, 0.1)',
                color: 'var(--rta-blue)',
                border: '1px solid rgba(14, 165, 233, 0.3)',
                padding: '4px 10px',
                borderRadius: '4px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Test Agent
            </button>
          )}
          {isGeneratingBrief ? (
            <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '4px 10px', borderRadius: '4px', fontWeight: 700 }}>
              Agent Loading...
            </span>
          ) : briefing && !briefing.error ? (
            <span style={{ fontSize: '11px', background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '4px 10px', borderRadius: '4px', fontWeight: 700 }}>
              Generated by Mistral Studio Agent
            </span>
          ) : (
            <span style={{ fontSize: '11px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '4px', fontWeight: 600 }}>
              Awaiting Briefing
            </span>
          )}
        </div>
      </div>

      {/* Error State */}
      {briefing?.error ? (
        <div style={{ 
          padding: '40px 12px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '16px',
          background: 'rgba(239, 68, 68, 0.04)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <AlertTriangle size={32} style={{ color: '#ef4444' }} />
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#ef4444', margin: '0 0 4px 0' }}>
              Briefing Unavailable
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
              AI analysis unavailable. Please retry or check Mistral Agent configuration.
            </p>
          </div>
          <button 
            onClick={handleGenerateBriefing}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              background: 'var(--rta-blue)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry Briefing
          </button>
        </div>
      ) : isGeneratingBrief ? (
        /* Loading State */
        <div style={{ padding: '40px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div className="loader-ring" style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--rta-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-title)', margin: '0 0 4px 0' }}>
              Generating operator briefing…
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Querying PeakFlow Operator Briefing Agent in Mistral Studio.
            </p>
          </div>
        </div>
      ) : briefing ? (
        /* Render Agent Briefing Output */
        <>
          {/* Fallback Warning Alert in Dev only */}
          {briefing.isFallback && process.env.NODE_ENV === 'development' && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', padding: '12px 16px', borderRadius: '8px' }}>
              <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div style={{ fontSize: '13.5px', color: '#ef4444', fontWeight: 700 }}>
                AI Wording Unavailable: Running in Fallback Mode (Dev Only)
              </div>
            </div>
          )}

          {/* Prominent Headline */}
          {briefing.briefingHeadline && (
            <div style={{ 
              background: 'rgba(14, 165, 233, 0.08)', 
              borderLeft: '4px solid var(--rta-blue)', 
              padding: '16px', 
              borderRadius: '8px' 
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-title)', margin: 0 }}>
                📢 {briefing.briefingHeadline}
              </h3>
            </div>
          )}

          {/* Operator Summary */}
          <div style={{ 
            background: 'rgba(14, 165, 233, 0.02)', 
            border: '1px solid var(--border-color)', 
            padding: '16px', 
            borderRadius: '10px' 
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '13px', 
              fontWeight: 800, 
              color: 'var(--rta-blue)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.04em', 
              marginBottom: '6px' 
            }}>
              <LayoutDashboard size={16} /> 1. Operator Summary
            </div>
            <p style={{ fontSize: '14.5px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
              {briefing.operatorSummary || briefing.situationSummary}
            </p>
          </div>

          {/* Current Condition */}
          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              2. Current Conditions &amp; Causes
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
              {briefing.currentCondition || briefing.causeExplanation}
            </p>
          </div>

          {/* Recommended Decision */}
          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              3. Recommended Decision
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5, fontWeight: 650 }}>
              {briefing.recommendedDecision || briefing.recommendedAction}
            </p>
          </div>

          {/* Why Now */}
          {(briefing.whyNow || briefing.causeExplanation) && (
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                4. Why Now
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                {briefing.whyNow || briefing.causeExplanation}
              </p>
            </div>
          )}

          {/* Operator Checklist */}
          {briefing.approvalChecklist && Array.isArray(briefing.approvalChecklist) && (
            <div style={{ background: 'rgba(14, 165, 233, 0.03)', border: '1px solid rgba(14, 165, 233, 0.15)', padding: '16px', borderRadius: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--rta-blue)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                5. Operator Approval Checklist
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13.5px' }}>
                {briefing.approvalChecklist.map((item: string, idx: number) => (
                  <li key={idx} style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Simulated Impact Estimates */}
          <div style={{ background: 'rgba(34, 197, 94, 0.03)', border: '1px solid rgba(34, 197, 94, 0.15)', padding: '16px', borderRadius: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
              6. Simulated Corridor Impact Estimate
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Commute Travel Time:</span>
                <strong>
                  {pressure.excess > 0 ? (
                    <span>{beforeCommute} min <ArrowRight size={12} style={{ display: 'inline', margin: '0 4px' }} /> {ba.after.commuteRange[0]}–{ba.after.commuteRange[1]} min <span style={{ color: '#22c55e' }}>(-{minutesSaved}m)</span></span>
                  ) : (
                    <span>{beforeCommute} min (No change)</span>
                  )}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>V/C Ratio Improvement:</span>
                <strong>
                  {pressure.excess > 0 ? (
                    <span>{pressure.vcRatio.toFixed(2)} <ArrowRight size={12} style={{ display: 'inline', margin: '0 4px' }} /> {ba.after.vc.toFixed(2)}</span>
                  ) : (
                    <span>{pressure.vcRatio.toFixed(2)} (No change)</span>
                  )}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>LOS Level Improvement:</span>
                <strong>
                  {pressure.excess > 0 ? (
                    <span>{vcToLOS(pressure.vcRatio)} <ArrowRight size={12} style={{ display: 'inline', margin: '0 4px' }} /> {afterLOS}</span>
                  ) : (
                    <span>{vcToLOS(pressure.vcRatio)} (No change)</span>
                  )}
                </strong>
              </div>
            </div>
          </div>

          {/* Operator Sign-off & Human Approval Note */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '12px 16px', borderRadius: '8px' }}>
            <Shield size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: 700 }}>
              Operator Sign-Off Required: {briefing.riskNotes || briefing.humanApprovalNote || "All campaigns require human operator authorization before publish."}
            </div>
          </div>

          {isWordingUnsafe && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', padding: '12px 16px', borderRadius: '8px' }}>
              <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: 700 }}>
                Safety Warning: Response contains auto-control or direct dispatch terms. Manual verification is required.
              </div>
            </div>
          )}

          {/* Operator Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button 
              onClick={() => handleOperatorDecision('approve')} 
              className="btn-action approve"
              style={{ flex: 1, padding: '12px', fontSize: '14.5px', fontWeight: 700, cursor: 'pointer', border: 'none', borderRadius: '8px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', height: '42px', opacity: pressure.excess > 0 ? 1 : 0.5 }}
              disabled={pressure.excess === 0}
            >
              ✓ Approve Campaign Draft
            </button>
            <button 
              onClick={() => handleOperatorDecision('review')} 
              className="btn-action secondary"
              style={{ flex: 1, padding: '12px', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-primary)', height: '42px', opacity: pressure.excess > 0 ? 1 : 0.5 }}
              disabled={pressure.excess === 0}
            >
              Request Engineering Review
            </button>
          </div>

          {/* advanced details */}
          <details style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px' }}>
            <summary style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Database size={14} /> View Grounding &amp; Agent Details
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', fontSize: '13px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Grounding Sources:</strong>
                {briefing.dataDisclaimer || "RTA Sensor loop telemetry logs."}
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>System Wording Guidance:</strong>
                Campaigns suggest demand-shifting strategies. No automatic dispatcher loops are run.
              </div>
            </div>
          </details>
        </>
      ) : (
        <div style={{ padding: '40px 12px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            Awaiting briefing generation trigger.
          </p>
        </div>
      )}
    </div>
  );
};

export default AiBriefingPanel;
