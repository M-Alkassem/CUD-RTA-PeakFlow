'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { 
  Briefcase, 
  Train, 
  Car, 
  Shield, 
  CheckCircle, 
  Clock, 
  Cpu,
  Layers,
  Sparkles,
  FileText
} from 'lucide-react';
import { Corridor } from '../lib/types';

// Dynamically load the Leaflet map (client-side only)
const DubaiLeafletMap = dynamic(
  () => import('./DubaiLeafletMap'),
  { 
    ssr: false, 
    loading: () => (
      <div style={{ height: '100%', minHeight: '400px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', justifyContent: 'center', fontSize: '15px', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ border: '3px solid var(--border-color)', borderTop: '3px solid var(--rta-blue)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
        <span>Loading Dubai Traffic Replay Map...</span>
      </div>
    )
  }
);
import {
  calcDemandPressure,
  calcCommuteEstimate,
  calcRequiredShift,
  generateCampaignMix,
  simulateBeforeAfter
} from '../lib/demandShiftEngine';


interface DemandShiftDecisionScreenProps {
  corridor: Corridor | null;
  corridors: Corridor[];
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string) => void;
  onApprove: () => void;
  onReview: () => void;
  onDismiss: () => void;
  appliedActions: Record<string, boolean>;
  theme: 'dark' | 'light';
  workflowResponse: any;
  isWorkflowLoading: boolean;
  workflowError?: string | null;
  handleTriggerWorkflow: () => void;
  activeScenarioId?: string;
  hour?: number;
}

export const DemandShiftDecisionScreen: React.FC<DemandShiftDecisionScreenProps> = ({
  corridor,
  corridors,
  selectedLocationId,
  setSelectedLocationId,
  onApprove,
  onReview,
  onDismiss,
  appliedActions,
  theme,
  workflowResponse,
  isWorkflowLoading,
  workflowError,
  handleTriggerWorkflow,
  activeScenarioId,
  hour,
}) => {
  const [approved, setApproved] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);
  
  const [showEmployerModal, setShowEmployerModal] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');


  // Safe fallback if selected corridor doesn't exist
  const activeCorridor = corridor || corridors.find(c => c.location_id === selectedLocationId) || corridors[0];

  const handleApprove = () => {
    setApproved(true);
    setReviewSent(false);
    onApprove();
  };

  const handleReview = () => {
    setReviewSent(true);
    setApproved(false);
    onReview();
  };

  // Run dynamic calculation engine
  const activeScenId = activeScenarioId || 'pm-peak-demo';
  const pressure = activeCorridor ? calcDemandPressure(activeCorridor, activeScenId, hour) : { excess: 0, excessPct: 0, vcRatio: 0 };
  const commute = activeCorridor ? calcCommuteEstimate(activeCorridor, activeScenId, hour) : null;
  const plan = activeCorridor ? generateCampaignMix(activeCorridor, activeScenId, hour) : null;
  const ba = activeCorridor ? simulateBeforeAfter(activeCorridor, activeScenId, hour) : { minutesSaved: 0, after: { vc: 0 } };

  const excess = pressure.excess; // cars above safe level
  const shiftPct = pressure.excessPct;
  const isAboveSafe = excess > 0;
  const minutesSaved = ba.minutesSaved;

  // Extract dynamic values for bottom bar, utilizing AI-driven economicImpact when available
  const tripsShifted = workflowResponse?.economicImpact?.tripsShifted ?? 
                       ((isAboveSafe && workflowResponse) ? excess : 0);
  const hoursSaved = workflowResponse?.economicImpact?.hoursSaved ?? 
                     ((isAboveSafe && workflowResponse) ? Math.round((tripsShifted * minutesSaved) / 60) : 0);
  const aedSaved = workflowResponse?.economicImpact?.valueOfTimeSavedAED ?? 
                   (hoursSaved * 75);
  const campaignsCount = !isAboveSafe ? '0' : approved ? '3 Approved' : (workflowResponse ? '3 Drafted' : '0 Pending');

  const employerCampaign = workflowResponse?.campaignMix?.find((c: any) => c.type === 'employer-flex');
  const metroCampaign = workflowResponse?.campaignMix?.find((c: any) => c.type === 'metro-nol');
  const parkingCampaign = workflowResponse?.campaignMix?.find((c: any) => c.type === 'parking-reward');

  const employerTripsVal = workflowResponse ? (employerCampaign?.tripsPerHour ?? employerCampaign?.tripsToShift ?? 0) : null;
  const employerConfidence = workflowResponse ? (employerCampaign?.confidence ? (employerCampaign.confidence > 1 ? `${employerCampaign.confidence}%` : `${Math.round(employerCampaign.confidence * 100)}%`) : '72%') : '--';

  const metroTripsVal = workflowResponse ? (metroCampaign?.tripsPerHour ?? metroCampaign?.tripsToShift ?? 0) : null;
  const metroConfidence = workflowResponse ? (metroCampaign?.confidence ? (metroCampaign.confidence > 1 ? `${metroCampaign.confidence}%` : `${Math.round(metroCampaign.confidence * 100)}%`) : '68%') : '--';

  const parkingTripsVal = workflowResponse ? (parkingCampaign?.tripsPerHour ?? parkingCampaign?.tripsToShift ?? 0) : null;
  const parkingConfidence = workflowResponse ? (parkingCampaign?.confidence ? (parkingCampaign.confidence > 1 ? `${parkingCampaign.confidence}%` : `${Math.round(parkingCampaign.confidence * 100)}%`) : '61%') : '--';

  const minutesSavedVal = workflowResponse 
    ? (workflowResponse.expectedImpact?.minutesSaved ?? workflowResponse.beforeAfter?.estimatedMinutesSaved ?? minutesSaved)
    : null;

  const afterVCVal = workflowResponse 
    ? (workflowResponse.expectedImpact?.afterVC ?? workflowResponse.expectedImpact?.vcAfter ?? ba.after.vc)
    : null;

  const valueOfTimeSavedVal = workflowResponse 
    ? (workflowResponse.expectedImpact?.valueOfTimeSaved ?? Math.round(((excess * Number(minutesSavedVal || 0)) / 60) * 75))
    : null;

  const employerMinsVal = workflowResponse ? (employerCampaign?.impactMinutes ?? Math.max(1, Math.round(Number(minutesSavedVal || 0) * 0.60))) : '--';
  const metroMinsVal = workflowResponse ? (metroCampaign?.impactMinutes ?? Math.max(1, Math.round(Number(minutesSavedVal || 0) * 0.25))) : '--';
  const parkingMinsVal = workflowResponse ? (parkingCampaign?.impactMinutes ?? Math.max(1, Math.round(Number(minutesSavedVal || 0) * 0.15))) : '--';

  const combinedConfidence = workflowResponse?.confidence !== undefined
    ? (workflowResponse.confidence > 1 ? `${workflowResponse.confidence}%` : `${Math.round(workflowResponse.confidence * 100)}%`)
    : '82%';

  React.useEffect(() => {
    if (!activeCorridor) return;
    const timeWindowStr = hour !== undefined ? `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00` : 'peak hours';
    const defaultMsg = `RTA mobility advisory for offices along ${activeCorridor?.road_name || 'Sheikh Zayed Road'} (${activeCorridor?.direction || 'NB'} direction):\n\nCommute demand exceeds safe thresholds by ${excess.toLocaleString()} trips/hr during ${timeWindowStr}. RTA recommends coordinating flexible shift offsets (60% work-from-home or 9:30 AM arrival) for corporate entities today to reduce travel times by an estimated ${minutesSavedVal || '15'} minutes. RTA approval status: prepared for review.`;
    
    if (workflowResponse) {
      setEditedMessage(workflowResponse.employerMessage || workflowResponse.messages?.employerAdvisory || defaultMsg);
    } else {
      setEditedMessage(defaultMsg);
    }
  }, [workflowResponse, activeCorridor, hour, excess, minutesSavedVal]);

  // Early Return Check AFTER Hook Declarations
  if (!activeCorridor) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Cpu size={48} style={{ marginBottom: '16px', opacity: 0.3, animation: 'pulse 1.5s infinite', color: 'var(--rta-blue)' }} />
          <p style={{ fontSize: '16px', fontWeight: 600 }}>Loading RTA Corridor Telemetry Grid…</p>
        </div>
      </div>
    );
  }

  const strategyIcons: Record<string, React.ReactNode> = {
    'employer-flex': <Briefcase size={14} />,
    'metro-nol': <Train size={14} />,
    'parking-reward': <Car size={14} />,
  };
  // Get active aiReasoningSummary using a hard UI guard:
  let finalReasoningSummary = '';
  if (isAboveSafe) {
    const rawSummary = workflowResponse?.aiReasoningSummary;
    if (rawSummary && rawSummary.length <= 220) {
      finalReasoningSummary = rawSummary;
    } else {
      finalReasoningSummary = `Combined plan recommended because one strategy alone cannot shift ${excess.toLocaleString()} trips. Mix employer flex, Metro/NOL, and parking rewards. Estimated impact. RTA approval required.`;
    }
  } else {
    const rawSummary = workflowResponse?.aiReasoningSummary;
    if (rawSummary && rawSummary.length <= 220) {
      finalReasoningSummary = rawSummary;
    } else {
      finalReasoningSummary = `No campaign recommended. Corridor is within the operating target for the selected time window. Continue monitoring. RTA approval is not required because no action is proposed.`;
    }
  }
  const formatTimeWindow = (h: number) => {
    const start = h % 12 === 0 ? 12 : h % 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const end = (h + 1) % 12 === 0 ? 12 : (h + 1) % 12;
    const endAmpm = (h + 1) >= 12 ? 'PM' : 'AM';
    return `${start}:00 ${ampm} – ${end}:00 ${endAmpm}`;
  };
  const timeWindow = formatTimeWindow(hour || 17);

  return (
    <div className="demo-screen" style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 160px)',
      minHeight: '650px',
      gap: '16px',
      color: 'var(--text-primary)',
      background: 'transparent',
      animation: 'fadeIn 0.25s ease-out'
    }}>

      {/* ━━━ TOP ROW: THREE PANELS (LEFT SIDEBAR, CENTER PANEL, RIGHT CAMPAIGN CARD) ━━━ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr 340px',
        gap: '16px',
        flex: 1,
        minHeight: 0
      }} className="demo-decision-grid">
        
        {/* PANEL 1: LEFT NETWORK / CORRIDOR STATUS (SECONDARY CONTEXT ONLY) */}
        <div style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '16px', 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: 0,
          minWidth: 0,
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ 
            padding: '12px 16px', 
            borderBottom: '1px solid var(--border-color)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={14} style={{ color: 'var(--rta-blue)' }} />
              <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-title)' }}>
                Road Watchlist
              </span>
            </div>
          </div>

          {/* Scrollable Corridor Status List */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '10px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px' 
          }}>
            {(() => {
              // Rank corridors by real demand pressure (most overloaded first)
              const sortedDemoCorridors = [...corridors].sort(
                (a, b) => calcDemandPressure(b, activeScenId, hour).excess - calcDemandPressure(a, activeScenId, hour).excess
                  || b.congestion_pressure_score - a.congestion_pressure_score
              );

              return sortedDemoCorridors.map((c) => {
                const isSelected = c.location_id === selectedLocationId;
                const cPressureCalc = calcDemandPressure(c, activeScenId, hour);
                const cExcess = cPressureCalc.excess;
                const cShiftPct = cPressureCalc.excessPct;

                let cPressureLabel = '';
                let riskColor = '';
                if (cExcess <= 0) {
                  cPressureLabel = "Within target";
                  riskColor = "var(--color-low)"; // green
                } else if (cShiftPct > 0 && cShiftPct < 15) {
                  cPressureLabel = "Elevated";
                  riskColor = "var(--color-medium)"; // orange
                } else {
                  cPressureLabel = "High";
                  riskColor = "var(--color-critical)"; // red
                }

                // Compute consistent LOS from vc_ratio
                let cLos = 'A';
                const cVc = c.vc_ratio || 0;
                if (cVc <= 0.35) cLos = 'A';
                else if (cVc <= 0.55) cLos = 'B';
                else if (cVc <= 0.75) cLos = 'C';
                else if (cVc <= 0.90) cLos = 'D';
                else if (cVc <= 1.00) cLos = 'E';
                else cLos = 'F';

                return (
                  <div
                    key={c.location_id}
                    onClick={() => {
                      setSelectedLocationId(c.location_id);
                    }}
                    style={{
                      background: isSelected ? 'rgba(14, 165, 233, 0.08)' : 'var(--bg-panel)',
                      border: isSelected ? '2px solid var(--rta-blue)' : '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: isSelected ? 'var(--text-title)' : 'var(--text-primary)' }}>
                        {`${c.road_name} (${c.direction})`}
                      </span>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isSelected ? riskColor : 'rgba(0,0,0,0.02)',
                        color: isSelected ? 'white' : riskColor,
                        border: `1px solid ${riskColor}`
                      }}>
                        {cPressureLabel}
                      </span>
                    </div>

                    {isSelected && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px' }}>
                          <span>V/C: <strong style={{ color: 'var(--text-title)' }}>{c.vc_ratio.toFixed(2)}</strong></span>
                          <span>LOS: <strong style={{ color: 'var(--text-title)' }}>{cLos}</strong></span>
                        </div>
                        {cExcess > 0 && (
                          <div style={{ fontSize: '11px', color: 'var(--color-critical)', fontWeight: 700, marginTop: '2px' }}>
                            Excess demand above operating target: +{cExcess.toLocaleString()} trips/hr
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
        {/* PANEL 2: CENTER PANEL (MAP) */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          minHeight: 0,
          height: '100%',
          minWidth: 0
        }}>
          {/* TOP: Map Panel */}
          <div style={{ 
            flex: 1, 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '16px', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            boxShadow: 'var(--shadow-card)',
            position: 'relative'
          }}>
            <DubaiLeafletMap 
              corridors={corridors}
              selectedLocationId={selectedLocationId}
              setSelectedLocationId={setSelectedLocationId}
              theme={theme}
              activeTab="map"
              workflowResponse={workflowResponse}
              isLiveDemo={true}
            />
        </div>
        </div>

        {/* PANEL 3: RIGHT AI RECOMMENDATION CARD */}
        <div style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '16px', 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: 0,
          minWidth: 0,
          boxShadow: 'var(--shadow-card)',
          overflowY: 'auto'
        }}>
          {/* Header section */}
          <div style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid var(--border-color)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px'
          }}>
            <Cpu size={16} style={{ color: 'var(--rta-blue)' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-title)' }}>
              AI Demand Shift Campaign
            </span>
          </div>

          {isWorkflowLoading ? (
            <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', flex: 1, minHeight: '300px' }}>
              <div className="loader-ring" style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--rta-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-title)', margin: '0 0 4px 0' }}>
                  Running Mistral AI Analysis...
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                  Generating safety-checked staggered mix.
                </p>
              </div>
            </div>
          ) : workflowError ? (
            <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', flex: 1, textAlign: 'center', minHeight: '300px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444', margin: '0 0 4px 0' }}>
                  Mistral Workflow Failed
                </p>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  {workflowError}
                </p>
              </div>
              <button
                onClick={handleTriggerWorkflow}
                style={{
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  background: 'var(--rta-blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Retry Analysis
              </button>
            </div>
          ) : (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Recommendation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 850, letterSpacing: '0.5px' }}>
                  Recommendation:
                </span>
                <div style={{ fontSize: '14.5px', fontWeight: 800, color: workflowResponse ? (isAboveSafe ? 'var(--rta-blue)' : 'var(--color-low)') : 'var(--text-muted)' }}>
                  {workflowResponse 
                    ? (isAboveSafe ? 'Prepare combined demand-shift campaign' : 'No demand-shift campaign needed')
                    : 'Awaiting AI Analysis'}
                </div>
              </div>

              {/* Why */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 850, letterSpacing: '0.5px' }}>
                  Why:
                </span>
                <div style={{ fontSize: '13px', color: workflowResponse ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.4 }}>
                  {workflowResponse ? (
                    isAboveSafe 
                      ? `Selected corridor exceeds the operating target by ${excess.toLocaleString()} trips/hr during ${timeWindow}.`
                      : 'Corridor is within the operating target for the selected time window.'
                  ) : (
                    'Click "Run AI Analysis" to evaluate the optimal demand-shift allocation and preview traffic impacts.'
                  )}
                </div>
              </div>

              {/* Campaign Mix */}
              {isAboveSafe && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 850, letterSpacing: '0.5px' }}>
                    Campaign mix:
                  </span>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '6px', 
                    background: 'var(--bg-panel)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    padding: '10px 12px' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>• Employer Flex:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {workflowResponse && employerTripsVal !== null && (
                          <button
                            onClick={() => {
                              setBroadcastSuccess(false);
                              setIsBroadcasting(false);
                              setShowEmployerModal(true);
                            }}
                            title="Draft and Send Alert to Corridor Companies"
                            style={{
                              padding: '2px 6px',
                              fontSize: '10px',
                              fontWeight: 600,
                              background: 'rgba(14, 165, 233, 0.08)',
                              border: '1px solid rgba(14, 165, 233, 0.2)',
                              borderRadius: '4px',
                              color: 'var(--rta-blue)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            ✉️ Draft Alert
                          </button>
                        )}
                        <strong style={{ color: 'var(--text-title)' }}>
                          {employerTripsVal !== null ? `${employerTripsVal.toLocaleString()} trips/hr` : '-- trips/hr'}
                        </strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>• Metro / NOL Incentive:</span>
                      <strong style={{ color: 'var(--text-title)' }}>
                        {metroTripsVal !== null ? `${metroTripsVal.toLocaleString()} trips/hr` : '-- trips/hr'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>• Off-Peak Parking Reward:</span>
                      <strong style={{ color: 'var(--text-title)' }}>
                        {parkingTripsVal !== null ? `${parkingTripsVal.toLocaleString()} trips/hr` : '-- trips/hr'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>• RTA Flow Support:</span>
                      <strong style={{ color: 'var(--text-muted)' }}>support only</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Expected Impact */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 850, letterSpacing: '0.5px' }}>
                  Expected impact:
                </span>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px', 
                  background: 'var(--bg-panel)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  padding: '10px 12px' 
                }}>
                  {isAboveSafe ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>• Shift:</span>
                        <strong style={{ color: 'var(--text-title)' }}>
                          {workflowResponse ? `${excess.toLocaleString()} trips/hr` : '-- trips/hr'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>• V/C Ratio:</span>
                        <strong style={{ color: 'var(--text-title)' }}>
                          {pressure.vcRatio.toFixed(2)} → {workflowResponse ? (typeof afterVCVal === 'number' ? afterVCVal.toFixed(2) : afterVCVal) : '--'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>• Estimated saving:</span>
                        <strong style={{ color: 'var(--text-title)' }}>
                          {workflowResponse ? `${minutesSavedVal} min` : '-- min'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>• Estimated value:</span>
                        <strong style={{ color: 'var(--color-low)' }}>
                          {workflowResponse ? `AED ${Number(valueOfTimeSavedVal).toLocaleString()}` : 'AED --'}
                        </strong>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      0 trips shifted, 0 hours saved, AED 0.
                    </div>
                  )}
                </div>
              </div>

              {/* Human Approval */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 850, letterSpacing: '0.5px' }}>
                  Human approval:
                </span>
                <div style={{ 
                  fontSize: '12.5px', 
                  color: '#f59e0b', 
                  fontWeight: 650, 
                  background: 'rgba(245, 158, 11, 0.04)', 
                  border: '1px solid rgba(245, 158, 11, 0.15)', 
                  borderRadius: '8px', 
                  padding: '8px 10px' 
                }}>
                  {isAboveSafe ? 'Prepared for RTA operator review. No automatic implementation.' : 'No action proposed.'}
                </div>
              </div>

              {/* AI Analysis trigger (if draft) or Collapsible detailed reasoning */}
              {!workflowResponse ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', paddingBottom: '4px', paddingLeft: '0px', paddingRight: '0px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                    AI reasoning summary and strategy evaluation mix are in draft mode. Click below to analyze road pressure with Mistral AI.
                  </p>
                  <button
                    onClick={handleTriggerWorkflow}
                    style={{
                      marginTop: '4px',
                      padding: '6px 12px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, var(--rta-blue), #0284c7)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(14, 165, 233, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Sparkles size={12} />
                    Run AI Analysis
                  </button>
                </div>
              ) : (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <details style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--rta-blue)', outline: 'none', userSelect: 'none' }}>
                      View detailed reasoning
                    </summary>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', lineHeight: 1.45 }}>
                      {finalReasoningSummary && (
                        <div>
                          <strong>AI Reasoning Summary:</strong> {finalReasoningSummary}
                        </div>
                      )}
                      
                      {/* AI Strategy Comparison Matrix inside collapsible details */}
                      <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-title)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>
                          AI Strategy Comparison Matrix
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>• Employer Flex only:</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                              {isAboveSafe ? `${employerTripsVal.toLocaleString()} trips/hr (${employerMinsVal}m saved)` : 'Not needed'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>• Metro / NOL only:</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                              {isAboveSafe ? `${metroTripsVal.toLocaleString()} trips/hr (${metroMinsVal}m saved)` : 'Not needed'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>• Parking Reward only:</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                              {isAboveSafe ? `${parkingTripsVal.toLocaleString()} trips/hr (${parkingMinsVal}m saved)` : 'Not needed'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed var(--border-color)', marginTop: '2px', fontWeight: 700 }}>
                            <span style={{ color: 'var(--rta-blue)' }}>• Combined Plan (AI Recom.):</span>
                            <span style={{ color: 'var(--rta-blue)' }}>
                              {isAboveSafe ? `${excess.toLocaleString()} trips/hr (${minutesSaved}m saved)` : 'No action required'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {workflowResponse.situation && (
                        <div>
                          <strong>Congestion Situation:</strong> {workflowResponse.situation}
                        </div>
                      )}
                      {workflowResponse.aiOptimizerAnalysis?.whyCombinedSelected && (
                        <div>
                          <strong>Combined Rationale:</strong> {workflowResponse.aiOptimizerAnalysis.whyCombinedSelected}
                        </div>
                      )}
                      {workflowResponse.aiOptimizerAnalysis?.whyEmployerFlexHighest && (
                        <div>
                          <strong>Employer Flex Rationale:</strong> {workflowResponse.aiOptimizerAnalysis.whyEmployerFlexHighest}
                        </div>
                      )}
                      {workflowResponse.aiOptimizerAnalysis?.whyMetroNolSupports && (
                        <div>
                          <strong>Metro / NOL Rationale:</strong> {workflowResponse.aiOptimizerAnalysis.whyMetroNolSupports}
                        </div>
                      )}
                      {workflowResponse.aiOptimizerAnalysis?.whyParkingRewardHelps && (
                        <div>
                          <strong>Parking Rewards Rationale:</strong> {workflowResponse.aiOptimizerAnalysis.whyParkingRewardHelps}
                        </div>
                      )}
                      {workflowResponse.aiOptimizerAnalysis?.assumptionsAndLimitations && (
                        <div>
                          <strong>Confidence Assumptions:</strong> {workflowResponse.aiOptimizerAnalysis.assumptionsAndLimitations}
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}
              {/* Operator Decision Actions */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {approved ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '10px 12px', 
                    background: 'rgba(34, 197, 94, 0.08)', 
                    borderRadius: '8px', 
                    border: '1px solid rgba(34, 197, 94, 0.25)', 
                    color: '#22c55e', 
                    fontWeight: 700, 
                    fontSize: '13.5px' 
                  }}>
                    <CheckCircle size={16} /> {isAboveSafe ? 'Campaign Draft Approved' : 'No-Action Decision Logged'}
                  </div>
                ) : reviewSent ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '10px 12px', 
                    background: 'rgba(245, 158, 11, 0.08)', 
                    borderRadius: '8px', 
                    border: '1px solid rgba(245, 158, 11, 0.25)', 
                    color: '#f59e0b', 
                    fontWeight: 700, 
                    fontSize: '13.5px' 
                  }}>
                    <Clock size={16} /> Submitted for RTA Review
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {!isAboveSafe ? (
                      <>
                        <button
                          onClick={onDismiss}
                          style={{ 
                            width: '100%', 
                            padding: '12px', 
                            fontSize: '14px', 
                            fontWeight: 700, 
                            color: 'white', 
                            background: 'linear-gradient(135deg, #22c55e, #16a34a)', 
                            border: 'none', 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(34,197,94,0.2)'
                          }}
                        >
                          Continue Monitoring
                        </button>
                        <button
                          onClick={handleApprove}
                          style={{ 
                            width: '100%', 
                            padding: '8px', 
                            fontSize: '12.5px', 
                            fontWeight: 600, 
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-color)', 
                            borderRadius: '6px', 
                            cursor: 'pointer' 
                          }}
                        >
                          Log No-Action Decision
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleApprove}
                          style={{ 
                            width: '100%', 
                            padding: '12px', 
                            fontSize: '14px', 
                            fontWeight: 700, 
                            color: 'white', 
                            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', 
                            border: 'none', 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(14,165,233,0.2)'
                          }}
                        >
                          Prepare Campaign Draft
                        </button>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={handleReview}
                            style={{ 
                              flex: 1, 
                              padding: '8px', 
                              fontSize: '12.5px', 
                              fontWeight: 600, 
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-panel)',
                              border: '1px solid var(--border-color)', 
                              borderRadius: '6px', 
                              cursor: 'pointer' 
                            }}
                          >
                            Submit for RTA Review
                          </button>
                          <button
                            onClick={onDismiss}
                            style={{ 
                              padding: '8px 12px', 
                              fontSize: '12.5px', 
                              fontWeight: 500, 
                              color: 'var(--text-muted)', 
                              background: 'transparent', 
                              border: 'none', 
                              cursor: 'pointer' 
                            }}
                          >
                            Dismiss
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Safety Warning Label */}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.35, marginTop: '4px' }}>
                  Scenario-based estimate. Actual impact depends on employer participation, Metro capacity, parking incentive uptake, and RTA approval.
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* ━━━ BOTTOM ROW: LIVE IMPACT BAR (FLOWIQ STYLE) ━━━ */}
      <div className="impact-bar" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '14px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '24px',
        boxShadow: 'var(--shadow-card)'
      }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '8px', 
            background: 'rgba(34, 197, 94, 0.08)', color: '#22c55e',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Clock size={20} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              Estimated Hours Saved
            </span>
            <strong style={{ display: 'block', fontSize: '18px', color: 'var(--text-title)', marginTop: '2px' }}>
              {hoursSaved.toLocaleString()} hrs
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '8px', 
            background: 'rgba(14, 165, 233, 0.08)', color: 'var(--rta-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              Trips Shifted
            </span>
            <strong style={{ display: 'block', fontSize: '18px', color: 'var(--text-title)', marginTop: '2px' }}>
              {tripsShifted.toLocaleString()} trips/hr
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '8px', 
            background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FileText size={20} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              Campaigns Prepared
            </span>
            <strong style={{ display: 'block', fontSize: '18px', color: 'var(--text-title)', marginTop: '2px' }}>
              {campaignsCount}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '8px', 
            background: 'rgba(16, 185, 129, 0.08)', color: '#10b981',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <strong style={{ fontSize: '16px' }}>AED</strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              Estimated Value of Time Saved
            </span>
            <strong style={{ display: 'block', fontSize: '18px', color: '#10b981', marginTop: '2px' }}>
              AED {aedSaved.toLocaleString()}
            </strong>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.15 }}>
              Estimated value uses assumed 75 AED/hour commuter time value.
            </div>
          </div>
        </div>


      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
        Scenario-based estimate. Actual impact depends on employer participation, Metro capacity, parking incentive uptake, and RTA approval.
      </div>

      {/* ━━━ EMPLOYER ALERT BROADCAST MODAL ━━━ */}
      {showEmployerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowEmployerModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ×
            </button>

            {/* Modal Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(14, 165, 233, 0.08)', color: 'var(--rta-blue)' }}>
                <Briefcase size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-title)' }}>
                  Employer Mobility Alert (Draft)
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Target: registered corporate offices along {activeCorridor?.road_name || 'Sheikh Zayed Road'}
                </span>
              </div>
            </div>

            {/* Modal Content */}
            {!broadcastSuccess ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Recipients Network
                  </label>
                  <div style={{ fontSize: '12.5px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px', color: 'var(--text-primary)', fontWeight: 550 }}>
                    🌐 Freezone mobility portals, SZR office parks & local registered companies ({activeCorridor.area || 'Business District'})
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Edit Message Template (Mistral AI Drafted)
                  </label>
                  <textarea
                    value={editedMessage}
                    onChange={(e) => setEditedMessage(e.target.value)}
                    disabled={isBroadcasting}
                    style={{
                      width: '100%',
                      height: '140px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-panel)',
                      color: 'var(--text-title)',
                      padding: '12px',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      fontFamily: 'inherit',
                      resize: 'none',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Modal Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                  <button
                    onClick={() => setShowEmployerModal(false)}
                    disabled={isBroadcasting}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      fontWeight: 600
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setIsBroadcasting(true);
                      setTimeout(() => {
                        setIsBroadcasting(false);
                        setBroadcastSuccess(true);
                      }, 1200);
                    }}
                    disabled={isBroadcasting}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'var(--rta-blue)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: isBroadcasting ? 0.75 : 1
                    }}
                  >
                    {isBroadcasting ? (
                      <>
                        <div className="spinner" style={{ border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid white', borderRadius: '50%', width: '12px', height: '12px', animation: 'spin 0.6s linear infinite' }} />
                        Broadcasting...
                      </>
                    ) : (
                      <>
                        Broadcast Alert
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '54px', height: '54px', borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  ✓
                </div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-title)' }}>
                  Mobility Alert Broadcasted Successfully
                </h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', maxWidth: '380px', lineHeight: 1.45 }}>
                  Advisory was successfully sent to the corporate networks. Freezone databases along SZR have been notified to alert commuters.
                </p>
                <button
                  onClick={() => setShowEmployerModal(false)}
                  style={{
                    marginTop: '10px',
                    padding: '8px 20px',
                    borderRadius: '6px',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    fontWeight: 600
                  }}
                >
                  Close Panel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
    </div>
  );
};

export default DemandShiftDecisionScreen;
