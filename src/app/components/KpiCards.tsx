import React from 'react';
import { AlertTriangle, Activity, Zap, Clock } from 'lucide-react';

interface KpiCardsProps {
  kpis: { criticalHotspots: number; highRiskRoads: number; avgSpeed: number };
  hour: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, hour }) => {
  const roadsAtRiskCount = kpis.criticalHotspots + kpis.highRiskRoads;

  return (
    <div className="kpi-container" id="section-b-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
      
      {/* 1. Roads at Risk */}
      <div className="kpi-card" id="kpi-hotspots" style={{ 
        borderLeft: '4px solid var(--color-critical)', 
        background: 'var(--bg-card)', 
        padding: '24px', 
        borderRadius: '16px', 
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '180px',
        border: '1px solid var(--border-color)'
      }}>
        {/* Top: Label + Icon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            ROADS AT RISK
          </span>
          <div style={{ padding: '8px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-critical)', display: 'flex' }}>
            <AlertTriangle size={18} />
          </div>
        </div>
        
        {/* Middle: Numeric Value */}
        <div style={{ fontSize: '42px', fontWeight: 800, color: roadsAtRiskCount > 0 ? 'var(--color-critical)' : 'var(--text-primary)', lineHeight: 1.1 }}>
          {roadsAtRiskCount}
        </div>

        {/* Bottom: Helper Text */}
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {roadsAtRiskCount > 0 ? 'Urgent bottlenecks detected' : 'Normal flow monitored'}
        </div>
      </div>

      {/* 2. Network Speed */}
      <div className="kpi-card" id="kpi-speed" style={{ 
        borderLeft: '4px solid var(--color-low)', 
        background: 'var(--bg-card)', 
        padding: '24px', 
        borderRadius: '16px', 
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '180px',
        border: '1px solid var(--border-color)'
      }}>
        {/* Top: Label + Icon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            NETWORK SPEED
          </span>
          <div style={{ padding: '8px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.08)', color: 'var(--color-low)', display: 'flex' }}>
            <Activity size={18} />
          </div>
        </div>

        {/* Middle: Numeric Value */}
        <div style={{ fontSize: '42px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
          {kpis.avgSpeed} <span style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-secondary)' }}>kph</span>
        </div>

        {/* Bottom: Helper Text */}
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          System telemetry average
        </div>
      </div>

      {/* 3. Recommended Actions */}
      <div className="kpi-card" id="kpi-actions" style={{ 
        borderLeft: '4px solid var(--rta-blue)', 
        background: 'var(--bg-card)', 
        padding: '24px', 
        borderRadius: '16px', 
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '180px',
        border: '1px solid var(--border-color)'
      }}>
        {/* Top: Label + Icon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            RECOMMENDED ACTIONS
          </span>
          <div style={{ padding: '8px', borderRadius: '50%', background: 'var(--rta-blue-bg)', color: 'var(--rta-blue)', display: 'flex' }}>
            <Zap size={18} />
          </div>
        </div>

        {/* Middle: Numeric Value */}
        <div style={{ fontSize: '42px', fontWeight: 800, color: roadsAtRiskCount > 0 ? 'var(--rta-blue)' : 'var(--text-primary)', lineHeight: 1.1 }}>
          {roadsAtRiskCount}
        </div>

        {/* Bottom: Helper Text */}
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {roadsAtRiskCount > 0 ? 'Split proposals pending' : 'No overrides required'}
        </div>
      </div>

      {/* 4. Replay Time */}
      <div className="kpi-card" id="kpi-time" style={{ 
        borderLeft: '4px solid var(--text-muted)', 
        background: 'var(--bg-card)', 
        padding: '24px', 
        borderRadius: '16px', 
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '180px',
        border: '1px solid var(--border-color)'
      }}>
        {/* Top: Label + Icon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            REPLAY HOUR
          </span>
          <div style={{ padding: '8px', borderRadius: '50%', background: 'var(--border-color)', color: 'var(--text-secondary)', display: 'flex' }}>
            <Clock size={18} />
          </div>
        </div>

        {/* Middle: Numeric Value */}
        <div style={{ fontSize: '42px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, fontFamily: 'var(--font-mono)' }}>
          {String(hour).padStart(2, '0')}:00
        </div>

        {/* Bottom: Helper Text */}
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Simulation clock scheduler
        </div>
      </div>

    </div>
  );
};
export default KpiCards;
