import React from 'react';
import { Clock, TrendingDown, BarChart3, Timer } from 'lucide-react';
import { Corridor } from '../lib/types';
import { calcDemandPressure, calcCommuteEstimate, calcRequiredShift, simulateBeforeAfter } from '../lib/demandShiftEngine';

interface KpiCardsProps {
  kpis: { criticalHotspots: number; highRiskRoads: number; avgSpeed: number };
  hour: number;
  selectedCorridor: Corridor | null;
  activeScenarioId?: string;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, hour, selectedCorridor, activeScenarioId }) => {
  // Calculate demand metrics from the selected (or top) corridor
  const pressure = selectedCorridor ? calcDemandPressure(selectedCorridor, activeScenarioId) : null;
  const commute = selectedCorridor ? calcCommuteEstimate(selectedCorridor, activeScenarioId) : null;
  const shift = selectedCorridor ? calcRequiredShift(selectedCorridor, activeScenarioId) : null;
  const ba = selectedCorridor ? simulateBeforeAfter(selectedCorridor, activeScenarioId) : null;

  const cardStyle = (borderColor: string) => ({
    borderLeft: `4px solid ${borderColor}`,
    borderTop: '1px solid var(--border-color)',
    borderRight: '1px solid var(--border-color)',
    borderBottom: '1px solid var(--border-color)',
    background: 'var(--bg-card)',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-card)',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    justifyContent: 'space-between' as const,
    minHeight: '170px',
  });

  return (
    <div className="kpi-container" id="section-b-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
      
      {/* 1. Current Commute Time */}
      <div className="kpi-card" id="kpi-commute" style={cardStyle('var(--color-critical)')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            CURRENT COMMUTE
          </span>
          <div style={{ padding: '8px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-critical)', display: 'flex' }}>
            <Clock size={18} />
          </div>
        </div>
        <div style={{ fontSize: '40px', fontWeight: 800, color: commute && commute.currentMin > 40 ? 'var(--color-critical)' : 'var(--text-primary)', lineHeight: 1.1 }}>
          {commute ? commute.currentMin : '--'} <span style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-secondary)' }}>min</span>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {commute && commute.currentMin > 45 ? 'Peak congestion active' : commute ? 'Business-corridor estimate' : 'Select corridor'}
        </div>
      </div>

      {/* 2. Demand Above Operating Target */}
      <div className="kpi-card" id="kpi-excess" style={cardStyle(pressure && pressure.excess > 0 ? 'var(--color-high)' : 'var(--color-low)')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            ABOVE OPERATING TARGET
          </span>
          <div style={{ padding: '8px', borderRadius: '50%', background: pressure && pressure.excess > 0 ? 'rgba(251, 146, 60, 0.08)' : 'rgba(34, 197, 94, 0.08)', color: pressure && pressure.excess > 0 ? 'var(--color-high)' : 'var(--color-low)', display: 'flex' }}>
            <TrendingDown size={18} />
          </div>
        </div>
        <div style={{ fontSize: '40px', fontWeight: 800, color: pressure && pressure.excess > 0 ? 'var(--color-high)' : 'var(--color-low)', lineHeight: 1.1 }}>
          {pressure ? (pressure.excess > 0 ? `+${pressure.excess.toLocaleString()}` : '0') : '--'} <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>trips/hr</span>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {pressure && pressure.excess > 0 ? `V/C ${pressure.vcRatio.toFixed(2)} — shift needed` : pressure ? 'Within target' : 'Select corridor'}
        </div>
      </div>

      {/* 3. Required Demand Shift */}
      <div className="kpi-card" id="kpi-shift" style={cardStyle('var(--rta-blue)')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            REQUIRED SHIFT
          </span>
          <div style={{ padding: '8px', borderRadius: '50%', background: 'var(--rta-blue-bg)', color: 'var(--rta-blue)', display: 'flex' }}>
            <BarChart3 size={18} />
          </div>
        </div>
        <div style={{ fontSize: '40px', fontWeight: 800, color: shift && shift.shiftPct > 0 ? 'var(--rta-blue)' : 'var(--text-primary)', lineHeight: 1.1 }}>
          {shift ? shift.shiftPct : 0}<span style={{ fontSize: '22px' }}>%</span>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {shift && shift.shiftPct > 0 ? `${shift.totalTripsToShift.toLocaleString()} trips/hr to shift` : 'No shift needed'}
        </div>
      </div>

      {/* 4. Minutes Saveable */}
      <div className="kpi-card" id="kpi-savings" style={cardStyle('var(--color-low)')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            MINUTES SAVEABLE
          </span>
          <div style={{ padding: '8px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.08)', color: 'var(--color-low)', display: 'flex' }}>
            <Timer size={18} />
          </div>
        </div>
        <div style={{ fontSize: '40px', fontWeight: 800, color: ba && ba.minutesSaved > 0 ? 'var(--color-low)' : 'var(--text-primary)', lineHeight: 1.1 }}>
          {ba ? ba.minutesSaved : 0} <span style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-secondary)' }}>min</span>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {ba && ba.minutesSaved > 0 ? 'Estimated commute savings' : 'No savings projected'}
        </div>
      </div>

    </div>
  );
};
export default KpiCards;
