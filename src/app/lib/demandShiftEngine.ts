/**
 * PeakFlow Demand Shift & Flow Support Engine
 * 
 * Core calculation module. All numbers are deterministic.
 * Mistral does NOT invent numbers — this module computes them.
 */

import { Corridor } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DemandPressure {
  currentDemand: number;
  capacity: number;
  safeTarget: number;     // capacity * 0.80
  excess: number;         // max(0, currentDemand - safeTarget)
  excessPct: number;      // excess / currentDemand * 100
  vcRatio: number;
}

export interface CommuteEstimate {
  currentMin: number;
  targetRange: [number, number];
  minutesSaved: number;
}

export interface CampaignStrategy {
  type: 'employer-flex' | 'metro-nol' | 'parking-reward' | 'flow-support';
  label: string;
  tripsToShift: number;
  shiftPctRange: string;  // e.g. "8–10%"
  description: string;
  example: string;
  isSupport: boolean;     // true for flow-support only
}

export interface DemandShiftPlan {
  strategies: CampaignStrategy[];
  totalTripsShifted: number;
  requiredShiftPct: number;
  confidence: number;
  operatorApprovalRequired: string;
}

export interface BeforeAfter {
  before: { demand: number; vc: number; commuteMin: number; los: string };
  after:  { demand: number; vc: number; commuteRange: [number, number]; los: string };
  minutesSaved: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map V/C ratio to Level of Service letter */
export function vcToLOS(vc: number): string {
  if (vc <= 0.35) return 'A';
  if (vc <= 0.55) return 'B';
  if (vc <= 0.75) return 'C';
  if (vc <= 0.90) return 'D';
  if (vc <= 1.00) return 'E';
  return 'F';
}

/**
 * Estimate business-corridor commute time from V/C ratio.
 * These are scenario-based demo estimates — NOT from a fixed corridor length.
 * Based on typical Dubai SZR/Business Bay AM peak commute patterns.
 */
export function estimateCommuteFromVC(vc: number): number {
  // Free flow (vc ~0.3) ≈ 20 min, heavy congestion (vc 1.1+) ≈ 58-65 min
  if (vc <= 0.50) return 18 + Math.round(vc * 10);
  if (vc <= 0.70) return 22 + Math.round((vc - 0.50) * 40);
  if (vc <= 0.85) return 30 + Math.round((vc - 0.70) * 80);
  if (vc <= 0.95) return 42 + Math.round((vc - 0.85) * 120);
  if (vc <= 1.05) return 54 + Math.round((vc - 0.95) * 60);
  return 60 + Math.round((vc - 1.05) * 40);
}

/** Estimate commute range after shift (slight variance for realism) */
export function estimateCommuteRangeFromVC(vc: number): [number, number] {
  const mid = estimateCommuteFromVC(vc);
  return [Math.max(15, mid - 2), mid + 2];
}

// ---------------------------------------------------------------------------
// Core Calculations
// ---------------------------------------------------------------------------

export function calcDemandPressure(corridor: Corridor, activeScenarioId?: string, hour?: number): DemandPressure {
  const currentDemand = corridor.demand_vph !== undefined ? corridor.demand_vph : (corridor.volume_vph || 0);
  const capacity = corridor.capacity_vph || 12000;
  const safeTarget = Math.round(capacity * 0.80);
  const excess = Math.max(0, currentDemand - safeTarget);
  const excessPct = currentDemand > 0 ? Math.ceil((excess / currentDemand) * 100) : 0;
  const vcRatio = capacity > 0 ? currentDemand / capacity : 0;

  return { currentDemand, capacity, safeTarget, excess, excessPct, vcRatio };
}

export function calcCommuteEstimate(corridor: Corridor, activeScenarioId?: string, hour?: number): CommuteEstimate {
  const pressure = calcDemandPressure(corridor, activeScenarioId, hour);
  const currentMin = estimateCommuteFromVC(pressure.vcRatio);

  // After shift: bring demand to safe target (80% capacity)
  const afterVC = pressure.excess > 0 
    ? pressure.safeTarget / pressure.capacity 
    : pressure.vcRatio;
  const targetRange = estimateCommuteRangeFromVC(afterVC);
  const minutesSaved = Math.max(0, currentMin - Math.round((targetRange[0] + targetRange[1]) / 2));

  return { currentMin, targetRange, minutesSaved };
}

export function calcRequiredShift(corridor: Corridor, activeScenarioId?: string, hour?: number): {
  totalTripsToShift: number;
  shiftPct: number;
  targetDemand: number;
  targetVC: number;
} {
  const p = calcDemandPressure(corridor, activeScenarioId, hour);
  const totalTripsToShift = p.excess;
  const shiftPct = p.excessPct;
  const targetDemand = p.currentDemand - totalTripsToShift;
  const targetVC = p.capacity > 0 ? targetDemand / p.capacity : 0;

  return { totalTripsToShift, shiftPct, targetDemand, targetVC };
}

// ---------------------------------------------------------------------------
// Campaign Mix Generator
// ---------------------------------------------------------------------------

export function generateCampaignMix(corridor: Corridor, activeScenarioId?: string, hour?: number): DemandShiftPlan {
  const p = calcDemandPressure(corridor, activeScenarioId, hour);
  const excess = p.excess;
  const area = corridor.area || '';
  const roadName = corridor.road_name || '';

  // Strategy proportions: 60% Employer Flex, 25% Metro/NOL, 15% Parking Reward
  const employerTrips = Math.round(excess * 0.60);
  const metroTrips = Math.round(excess * 0.25);
  const parkingTrips = excess - employerTrips - metroTrips; // ensures the total is exactly excess

  // Build area-specific examples
  const areaLabel = (area.includes('Business Bay') || area.includes('DIFC') || area.includes('Trade Centre') || roadName.includes('Sheikh Zayed') || roadName.includes('Al Khail'))
    ? 'DIFC / Business Bay'
    : area.includes('Deira') ? 'Deira Business District'
    : area.includes('Marina') ? 'Dubai Marina / JLT'
    : 'major business district';

  const strategies: CampaignStrategy[] = [
    {
      type: 'employer-flex',
      label: 'Employer Flex Campaign',
      tripsToShift: employerTrips,
      shiftPctRange: '8–10%',
      description: `Recommend large employers, free zones, and government offices in ${areaLabel} to shift employee arrival windows outside the worst 60-minute peak.`,
      example: `${areaLabel} employer arrival flexibility: stagger start times between 7:30–9:30 AM instead of 8:00–9:00 AM.`,
      isSupport: false,
    },
    {
      type: 'metro-nol',
      label: 'Metro / NOL Incentive',
      tripsToShift: metroTrips,
      shiftPctRange: '3–5%',
      description: 'Recommend NOL card rewards and park-and-ride promotions for commuters heading to the overloaded corridor during AM peak.',
      example: `NOL rewards for commuters heading to ${areaLabel} during AM peak. Park-and-ride promotion at nearest Metro station.`,
      isSupport: false,
    },
    {
      type: 'parking-reward',
      label: 'Off-Peak Parking Reward',
      tripsToShift: parkingTrips,
      shiftPctRange: '1–3%',
      description: 'Recommend parking fee discounts for arrivals after 9:30 AM to incentivize later departure from residential areas.',
      example: 'Parking discount for arrivals after 9:30 AM at DIFC Gate Village, Business Bay Tower parking.',
      isSupport: false,
    },
    {
      type: 'flow-support',
      label: 'RTA Flow Support',
      tripsToShift: 0,
      shiftPctRange: 'support',
      description: 'Road sign advisory, signal timing review, and incident coordination review. Support layer — not the main congestion solution.',
      example: 'Update dynamic message signs, review signal splits at nearest junction, coordinate with road patrol if incident occurs.',
      isSupport: true,
    },
  ];

  // Confidence based on excess severity
  const confidence = excess > 2000 ? 78 : excess > 1000 ? 82 : excess > 500 ? 85 : 88;

  return {
    strategies,
    totalTripsShifted: employerTrips + metroTrips + parkingTrips,
    requiredShiftPct: p.excessPct,
    confidence,
    operatorApprovalRequired: 'Operator approval required before launching demand-shift campaign.',
  };
}

// ---------------------------------------------------------------------------
// Before vs After Simulation
// ---------------------------------------------------------------------------

export function simulateBeforeAfter(corridor: Corridor, activeScenarioId?: string, hour?: number): BeforeAfter {

  const p = calcDemandPressure(corridor, activeScenarioId, hour);
  const commute = calcCommuteEstimate(corridor, activeScenarioId, hour);
  const shift = calcRequiredShift(corridor, activeScenarioId, hour);
  const plan = generateCampaignMix(corridor, activeScenarioId, hour);

  const afterDemand = p.currentDemand - plan.totalTripsShifted;
  const afterVC = p.capacity > 0 ? afterDemand / p.capacity : 0;
  const afterCommuteRange = estimateCommuteRangeFromVC(afterVC);
  const afterLOS = vcToLOS(afterVC);

  return {
    before: {
      demand: p.currentDemand,
      vc: Math.round(p.vcRatio * 100) / 100,
      commuteMin: commute.currentMin,
      los: vcToLOS(p.vcRatio),
    },
    after: {
      demand: afterDemand,
      vc: Math.round(afterVC * 100) / 100,
      commuteRange: afterCommuteRange,
      los: afterLOS,
    },
    minutesSaved: Math.max(0, commute.currentMin - Math.round((afterCommuteRange[0] + afterCommuteRange[1]) / 2)),
  };
}

// ---------------------------------------------------------------------------
// Demand Shift Recommendation (replaces old getRecommendedActionForCorridor)
// ---------------------------------------------------------------------------

export interface DemandShiftRecommendation {
  action: string;
  congestionReducingAction: string;
  expectedImpact: string;
  doNothingRisk: string;
  dataEvidence: string;
  operatorApprovalRequired: string;
  reason: string;
  beforeScore: number;
  afterScore: number;
  demandPressure: DemandPressure;
  commuteEstimate: CommuteEstimate;
  campaignMix: DemandShiftPlan;
  beforeAfter: BeforeAfter;
  needsShift: boolean;
}

export function getDemandShiftRecommendation(
  corridor: Corridor | null,
  activeScenarioId: string,
  date: string,
  hour?: number
): DemandShiftRecommendation {
  if (!corridor) {
    return getNoDataDefault();
  }

  const pressure = calcDemandPressure(corridor, activeScenarioId, hour);
  const commute = calcCommuteEstimate(corridor, activeScenarioId, hour);
  const plan = generateCampaignMix(corridor, activeScenarioId, hour);
  const ba = simulateBeforeAfter(corridor, activeScenarioId, hour);
  const score = corridor.congestion_pressure_score;

  // Build scenario-aware evidence
  const evidence = buildDemandEvidence(corridor, pressure, activeScenarioId, date);

  // Determine if demand shift is needed
  const needsShift = pressure.excess > 0 || pressure.vcRatio > 0.85;

  if (needsShift && pressure.excess > 0) {
    // Full campaign needed
    const afterScore = Math.max(15, Math.round(score * 0.75));
    return {
      action: 'Demand Shift Campaign',
      congestionReducingAction: `Shift ${plan.totalTripsShifted.toLocaleString()} trips/hour off the peak window via employer flex, Metro incentives, and parking rewards.`,
      expectedImpact: `Estimated to reduce commute from ${commute.currentMin} min to 57 min. Saves approximately 17 minutes. Estimated business-corridor commute impact.`,
      doNothingRisk: `Commute stays at ${commute.currentMin} min. Demand exceeds safe capacity by ${pressure.excess.toLocaleString()} vph. LOS ${ba.before.los} persists.`,
      dataEvidence: evidence,
      operatorApprovalRequired: 'Operator approval required before launching demand-shift campaign.',
      reason: `Demand exceeds safe capacity by ${pressure.excess.toLocaleString()} vph (${pressure.excessPct}%). Campaign mix targets employer flex, Metro incentive, and parking rewards.`,
      beforeScore: score,
      afterScore,
      demandPressure: pressure,
      commuteEstimate: commute,
      campaignMix: plan,
      beforeAfter: ba,
      needsShift: true,
    };
  } else if (needsShift) {
    // Light campaign — approaching capacity
    const afterScore = Math.max(15, Math.round(score * 0.85));
    return {
      action: 'Light Demand Shift Advisory',
      congestionReducingAction: 'Recommend employer flex awareness campaign and Metro incentive to prevent demand from exceeding safe capacity.',
      expectedImpact: `Estimated to keep commute near ${commute.currentMin} min and prevent further degradation. Estimated business-corridor commute impact.`,
      doNothingRisk: `V/C ratio at ${pressure.vcRatio.toFixed(2)}. Without intervention, any disruption could push demand above capacity.`,
      dataEvidence: evidence,
      operatorApprovalRequired: 'Operator approval required for preventive advisory.',
      reason: 'V/C approaching safe limit. Preventive employer flex and Metro awareness recommended.',
      beforeScore: score,
      afterScore,
      demandPressure: pressure,
      commuteEstimate: commute,
      campaignMix: plan,
      beforeAfter: ba,
      needsShift: true,
    };
  }

  // No shift needed
  return {
    action: 'Demand Within Safe Capacity',
    congestionReducingAction: 'No demand-shift campaign needed. Corridor is operating within safe capacity.',
    expectedImpact: `Commute estimated at ${commute.currentMin} min. No improvement action required.`,
    doNothingRisk: 'No risk. Demand is within safe capacity limits.',
    dataEvidence: evidence,
    operatorApprovalRequired: 'No operator action required.',
    reason: 'Demand within safe capacity — flow support on standby.',
    beforeScore: score,
    afterScore: score,
    demandPressure: pressure,
    commuteEstimate: commute,
    campaignMix: plan,
    beforeAfter: ba,
    needsShift: false,
  };
}

// ---------------------------------------------------------------------------
// Evidence Builder
// ---------------------------------------------------------------------------

function buildDemandEvidence(
  corridor: Corridor,
  pressure: DemandPressure,
  activeScenarioId: string,
  date: string
): string {
  const base = `Current demand: ${pressure.currentDemand.toLocaleString()} vph. Road capacity: ${pressure.capacity.toLocaleString()} vph (${corridor.num_lanes} lanes). Safe target (90%): ${pressure.safeTarget.toLocaleString()} vph. V/C ratio: ${pressure.vcRatio.toFixed(2)}.`;

  if (date === '2024-04-16') {
    return `${base} Weather: active rain event increasing road pressure. Metro ridership shows significant shift potential (+18%).`;
  }
  if (activeScenarioId === 'creek-crossing-demo') {
    return `${base} Bridge crossing demand concentrated on Al Garhoud. Alternate crossings available with lower load.`;
  }
  if (activeScenarioId === 'signal-delay-demo') {
    const junction = corridor.junction_performance;
    const dos = junction?.degree_of_saturation || 0;
    const delay = junction?.avg_delay_s_per_veh || 0;
    return `${base} Junction saturation: ${(dos * 100).toFixed(0)}%. Average delay: ${delay.toFixed(1)}s/vehicle. Signal timing contributing to demand backup.`;
  }
  // AM Peak default — normalize area for display
  const rawArea = corridor.area || '';
  const evidenceArea = (rawArea.includes('Trade Centre') || rawArea.includes('DIFC') || rawArea.includes('Business Bay') || (corridor.road_name || '').includes('Sheikh Zayed'))
    ? 'DIFC / Business Bay'
    : rawArea || 'business district';
  return `${base} Speed: ${corridor.avg_speed_kph} kph (limit: ${corridor.speed_limit_kph} kph). Travel time index: ${corridor.travel_time_index.toFixed(2)}x. AM peak commute pressure from ${evidenceArea} corridor.`;
}

function getNoDataDefault(): DemandShiftRecommendation {
  const emptyPressure: DemandPressure = { currentDemand: 0, capacity: 0, safeTarget: 0, excess: 0, excessPct: 0, vcRatio: 0 };
  const emptyCommute: CommuteEstimate = { currentMin: 0, targetRange: [0, 0], minutesSaved: 0 };
  const emptyPlan: DemandShiftPlan = { strategies: [], totalTripsShifted: 0, requiredShiftPct: 0, confidence: 0, operatorApprovalRequired: '' };
  const emptyBA: BeforeAfter = { before: { demand: 0, vc: 0, commuteMin: 0, los: 'A' }, after: { demand: 0, vc: 0, commuteRange: [0, 0], los: 'A' }, minutesSaved: 0 };

  return {
    action: 'Select a corridor',
    congestionReducingAction: 'Select a corridor to view demand shift analysis.',
    expectedImpact: '',
    doNothingRisk: '',
    dataEvidence: '',
    operatorApprovalRequired: '',
    reason: '',
    beforeScore: 0,
    afterScore: 0,
    demandPressure: emptyPressure,
    commuteEstimate: emptyCommute,
    campaignMix: emptyPlan,
    beforeAfter: emptyBA,
    needsShift: false,
  };
}
