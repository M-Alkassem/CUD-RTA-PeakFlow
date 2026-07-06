'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Briefcase, 
  Train, 
  Car, 
  Shield, 
  ArrowRight, 
  Clock, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Corridor } from '../lib/types';
import { 
  calcDemandPressure, 
  calcCommuteEstimate, 
  vcToLOS, 
  estimateCommuteFromVC, 
  estimateCommuteRangeFromVC 
} from '../lib/demandShiftEngine';

interface DemandCampaignPlannerProps {
  corridor: Corridor | null;
  activeScenarioId?: string;
  onApprove?: (logText: string) => void;
  showToast?: (msg: string, type?: 'success' | 'info' | 'warning') => void;
  workflowResponse?: any;
  isWorkflowLoading?: boolean;
  handleTriggerWorkflow?: () => void;
}

export const DemandCampaignPlanner: React.FC<DemandCampaignPlannerProps> = ({
  corridor,
  activeScenarioId,
  onApprove,
  showToast,
  workflowResponse,
  isWorkflowLoading = false,
  handleTriggerWorkflow
}) => {
  // Campaign slider values (percentages of total current demand)
  const [empFlexPct, setEmpFlexPct] = useState(10);
  const [metroPct, setMetroPct] = useState(5);
  const [parkingPct, setParkingPct] = useState(2.5);
  const [approved, setApproved] = useState(false);

  const handleLoadAIRecommendations = () => {
    if (!workflowResponse || !workflowResponse.campaignMix) return;
    
    // Baseline calculations
    const pressure = calcDemandPressure(corridor!, activeScenarioId);
    const currentDemand = pressure.currentDemand;

    const empCampaign = workflowResponse.campaignMix.find((c: any) => c.type === 'employer-flex');
    const metroCampaign = workflowResponse.campaignMix.find((c: any) => c.type === 'metro-nol');
    const parkingCampaign = workflowResponse.campaignMix.find((c: any) => c.type === 'parking-reward');

    const empTrips = empCampaign ? (empCampaign.tripsPerHour ?? empCampaign.tripsToShift ?? 0) : 0;
    const metroTrips = metroCampaign ? (metroCampaign.tripsPerHour ?? metroCampaign.tripsToShift ?? 0) : 0;
    const parkingTrips = parkingCampaign ? (parkingCampaign.tripsPerHour ?? parkingCampaign.tripsToShift ?? 0) : 0;

    // Convert trips back to slider percentages (empTrips / currentDemand * 100)
    const empPct = currentDemand > 0 ? (empTrips / currentDemand) * 100 : 0;
    const metPct = currentDemand > 0 ? (metroTrips / currentDemand) * 100 : 0;
    const parkPct = currentDemand > 0 ? (parkingTrips / currentDemand) * 100 : 0;

    // Set slider states (fixed to 1 decimal place or rounded to nearest step of 0.5)
    setEmpFlexPct(Math.round(empPct * 2) / 2);
    setMetroPct(Math.round(metPct * 2) / 2);
    setParkingPct(Math.round(parkPct * 2) / 2);
    setApproved(false);

    if (showToast) {
      showToast('Successfully loaded Mistral AI recommendations into sliders!', 'success');
    }
  };

  // Reset approval when corridor changes
  useEffect(() => {
    setApproved(false);
  }, [corridor]);

  if (!corridor) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <TrendingDown size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Select a corridor to open Campaign Planner</div>
      </div>
    );
  }

  // Baseline calculations
  const pressure = calcDemandPressure(corridor, activeScenarioId);
  const currentDemand = pressure.currentDemand;
  const capacity = pressure.capacity || 12000;
  const safeTarget = pressure.safeTarget; // 90% of capacity
  const requiredShift = pressure.excess; // trips exceeding 90% capacity
  const requiredShiftPct = pressure.excessPct;

  // Calculate dynamic trips shifted based on slider percentages
  const empFlexShifted = Math.round(currentDemand * (empFlexPct / 100));
  const metroShifted = Math.round(currentDemand * (metroPct / 100));
  const parkingShifted = Math.round(currentDemand * (parkingPct / 100));
  const totalShifted = empFlexShifted + metroShifted + parkingShifted;

  // Contribution percentages of the total campaign shifted volume
  const totalCampaignVolume = totalShifted || 1;
  const empFlexContrib = Math.round((empFlexShifted / totalCampaignVolume) * 100);
  const metroContrib = Math.round((metroShifted / totalCampaignVolume) * 100);
  const parkingContrib = Math.round((parkingShifted / totalCampaignVolume) * 100);

  // After campaign simulation values
  const afterDemand = Math.max(0, currentDemand - totalShifted);
  const afterVC = afterDemand / capacity;
  const afterLOS = vcToLOS(afterVC);
  const beforeCommute = estimateCommuteFromVC(pressure.vcRatio);
  const afterCommuteRange = estimateCommuteRangeFromVC(afterVC);
  const afterCommuteMid = Math.round((afterCommuteRange[0] + afterCommuteRange[1]) / 2);
  const minutesSaved = Math.max(0, beforeCommute - afterCommuteMid);

  // Normalize display area to the demo story
  const getDisplayArea = (): string => {
    const road = corridor.road_name || '';
    const area = corridor.area || '';
    if (road.includes('Sheikh Zayed') || road.includes('Al Khail') || area.includes('DIFC') || area.includes('Business Bay') || area.includes('Trade Centre')) {
      return 'DIFC / Business Bay';
    }
    return area;
  };
  const displayArea = getDisplayArea();

  const handleApproveCampaign = () => {
    setApproved(true);
    if (showToast) {
      showToast('Custom Demand Campaign Plan draft approved!', 'success');
    }
    if (onApprove) {
      onApprove(`Approved Custom Demand Shift Campaign Draft: Flex Start (${empFlexPct}%), Metro Incentives (${metroPct}%), Off-Peak Parking Reward (${parkingPct}%). Estimated travel time saved: ${minutesSaved} mins.`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.2s ease' }}>
      
      {/* ━━━ TITLE & HEADER ━━━ */}
      <div className="detail-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-title)', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              Demand Campaign Planner
            </h2>
            <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', margin: 0 }}>
              Adjust campaign targets to simulate trip shifting off the peak window on <strong style={{ color: 'var(--text-title)' }}>{corridor.road_name} ({corridor.direction}) → {displayArea}</strong>.
            </p>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--rta-blue)', background: 'var(--rta-blue-bg)', padding: '5px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Interactive Sandbox
          </span>
        </div>
      </div>

      {/* ━━━ MISTRAL AI AGENT INTEGRATION ━━━ */}
      {requiredShift > 0 && (
        <div className="detail-card animate-fade-in" style={{ 
          padding: '16px 20px', 
          background: 'rgba(14, 165, 233, 0.04)', 
          border: '1.5px solid var(--rta-blue)', 
          borderRadius: '12px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              background: 'var(--rta-blue)', 
              color: 'white', 
              padding: '6px', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Sparkles size={18} />
            </span>
            <div>
              <strong style={{ fontSize: '14.5px', color: 'var(--text-title)', display: 'block' }}>
                Mistral AI Campaign Formulator
              </strong>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                {isWorkflowLoading 
                  ? 'Mistral AI is formulating optimized campaign targets for this congestion level...'
                  : workflowResponse 
                  ? 'Mistral AI recommendation is ready. Pre-populate your sliders with the optimized mix.'
                  : 'Let Mistral AI formulate the optimal target mix based on live loop sensors & ridership.'}
              </span>
            </div>
          </div>
          <div>
            {isWorkflowLoading ? (
              <span style={{ 
                fontSize: '13px', 
                color: 'var(--text-muted)', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}>
                <div className="loader-ring" style={{ border: '2px solid var(--border-color)', borderTopColor: 'var(--rta-blue)', borderRadius: '50%', width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                AI Formulating...
              </span>
            ) : workflowResponse ? (
              <button 
                onClick={handleLoadAIRecommendations}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: 'var(--rta-blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Apply AI Recommendation
              </button>
            ) : (
              <button 
                onClick={handleTriggerWorkflow}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🤖 Ask Mistral AI
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }} className="demo-briefing-grid">
        
        {/* Left Column: Sliders & Campaign Mix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* ━━━ SECTION 1: REQUIRED SHIFT ━━━ */}
          <div className="detail-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-title)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              1. Required Shift Target
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>Trips to Shift</span>
                <strong style={{ fontSize: '20px', color: '#ef4444' }}>{requiredShift.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 500 }}>vph</span></strong>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>Required Shift %</span>
                <strong style={{ fontSize: '20px', color: 'var(--rta-blue)' }}>{requiredShiftPct}%</strong>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>Safe Target Demand</span>
                <strong style={{ fontSize: '20px', color: '#22c55e' }}>{safeTarget.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 500 }}>vph</span></strong>
              </div>
            </div>
          </div>

          {/* ━━━ SECTION 3: ADJUSTABLE CAMPAIGN SLIDERS ━━━ */}
          <div className="detail-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-title)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              2. Campaign Intensity Adjuster
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Slider 1: Employer Flex */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                  <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Briefcase size={16} style={{ color: '#3b82f6' }} /> Employer Flex Campaign
                  </span>
                  <strong style={{ color: '#3b82f6' }}>{empFlexPct}% shift ({empFlexShifted.toLocaleString()} trips/hr)</strong>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="25"
                  step="0.5"
                  value={empFlexPct}
                  onChange={(e) => { setEmpFlexPct(Number(e.target.value)); setApproved(false); }}
                  style={{ width: '100%', accentColor: '#3b82f6', height: '6px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                  Encourages DIFC/Business Bay employers to stagger arrival windows between 7:30–9:30 AM.
                </span>
              </div>

              {/* Slider 2: Metro / NOL */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                  <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Train size={16} style={{ color: '#8b5cf6' }} /> Metro / NOL Incentive
                  </span>
                  <strong style={{ color: '#8b5cf6' }}>{metroPct}% shift ({metroShifted.toLocaleString()} trips/hr)</strong>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={metroPct}
                  onChange={(e) => { setMetroPct(Number(e.target.value)); setApproved(false); }}
                  style={{ width: '100%', accentColor: '#8b5cf6', height: '6px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                  NOL card points and free park-and-ride incentives for off-peak Metro commutes.
                </span>
              </div>

              {/* Slider 3: Parking Reward */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                  <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Car size={16} style={{ color: '#f59e0b' }} /> Off-Peak Parking Reward
                  </span>
                  <strong style={{ color: '#f59e0b' }}>{parkingPct}% shift ({parkingShifted.toLocaleString()} trips/hr)</strong>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={parkingPct}
                  onChange={(e) => { setParkingPct(Number(e.target.value)); setApproved(false); }}
                  style={{ width: '100%', accentColor: '#f59e0b', height: '6px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                  Discounted public parking rates for arrivals outside the 08:00–09:00 peak.
                </span>
              </div>

            </div>
          </div>

          {/* ━━━ SECTION 2: CAMPAIGN MIX DETAILS ━━━ */}
          <div className="detail-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-title)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              3. Campaign Deployment Preview
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <Briefcase size={18} style={{ color: '#3b82f6', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-title)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Employer Flex Campaign</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Shift: <strong>{empFlexShifted.toLocaleString()}</strong> trips/hr ({empFlexContrib}%)</span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    Deploy Staggered Arrival Campaign to large business towers in the {displayArea} corridor.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <Train size={18} style={{ color: '#8b5cf6', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-title)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Metro / NOL Incentive</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Shift: <strong>{metroShifted.toLocaleString()}</strong> trips/hr ({metroContrib}%)</span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    Increase NOL card loyalty multipliers and free parking at peripheral metro stations serving the {displayArea} corridor.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <Car size={18} style={{ color: '#f59e0b', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-title)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Off-Peak Parking Reward</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Shift: <strong>{parkingShifted.toLocaleString()}</strong> trips/hr ({parkingContrib}%)</span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    Activate 50% discount on public parking zones in the {displayArea} corridor for off-peak check-ins.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', background: 'rgba(100, 116, 139, 0.04)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                <Shield size={18} style={{ color: '#64748b', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-title)' }}>
                    RTA Flow Support
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    Road sign advisories and junction monitoring splits.
                  </p>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Support layer only — not the main congestion solution.
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Before vs After Sim Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Before vs After Sim Card */}
          <div className="detail-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ 
              padding: '16px 20px', 
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(99, 102, 241, 0.06))',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-title)' }}>
                Live Scenario Simulation
              </span>
            </div>

            <div style={{ padding: '20px' }}>
              
              {/* Before Column */}
              <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px dashed var(--border-color)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Before Campaign
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Demand:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{currentDemand.toLocaleString()} vph</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>V/C Ratio:</span>
                    <strong style={{ color: pressure.vcRatio > 0.95 ? '#ef4444' : 'var(--text-primary)' }}>{pressure.vcRatio.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Commute Time:</span>
                    <strong style={{ color: '#ef4444' }}>{beforeCommute} min</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>LOS:</span>
                    <strong style={{ color: '#ef4444' }}>{pressure.vcRatio > 0.95 ? 'F' : 'E'}</strong>
                  </div>
                </div>
              </div>

              {/* After Column */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  After Custom Campaign
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Demand:</span>
                    <strong style={{ color: '#22c55e' }}>{afterDemand.toLocaleString()} vph</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>V/C Ratio:</span>
                    <strong style={{ color: '#22c55e' }}>{afterVC.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Commute Range:</span>
                    <strong style={{ color: '#22c55e' }}>{afterCommuteRange[0]}–{afterCommuteRange[1]} min</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>LOS:</span>
                    <strong style={{ color: '#22c55e' }}>{afterLOS}</strong>
                  </div>
                </div>
              </div>

              {/* Saved Highlight Banner */}
              {minutesSaved > 0 ? (
                <div style={{ 
                  background: 'rgba(34, 197, 94, 0.08)', 
                  border: '1px solid rgba(34, 197, 94, 0.2)', 
                  borderRadius: '8px', 
                  padding: '12px', 
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Estimated Minutes Saved
                  </div>
                  <strong style={{ fontSize: '32px', color: '#22c55e', display: 'block', margin: '4px 0' }}>
                    {minutesSaved} <span style={{ fontSize: '16px', fontWeight: 500 }}>min</span>
                  </strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                    Estimated business-corridor impact — not guaranteed
                  </span>
                </div>
              ) : (
                <div style={{ 
                  background: 'var(--bg-main)', 
                  border: '1px dashed var(--border-color)', 
                  borderRadius: '8px', 
                  padding: '12px', 
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  marginBottom: '20px'
                }}>
                  Adjust sliders to increase campaign shift and see savings.
                </div>
              )}

              {/* Approval Action */}
              {approved ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'rgba(34, 197, 94, 0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  fontSize: '14px',
                  color: '#22c55e',
                  fontWeight: 700
                }}>
                  <CheckCircle size={18} /> Approved for RTA Review
                </div>
              ) : (
                <button
                  onClick={handleApproveCampaign}
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
                  }}
                >
                  ✓ Approve Campaign Draft
                </button>
              )}

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default DemandCampaignPlanner;
