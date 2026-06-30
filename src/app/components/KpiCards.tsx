import React from 'react';
import { AlertTriangle, Activity, Zap, Clock } from 'lucide-react';

interface KpiCardsProps {
  kpis: { criticalHotspots: number; highRiskRoads: number; avgSpeed: number };
  hour: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, hour }) => {
  return (
    <div className="kpi-container" id="section-b-kpis">
      <div className="kpi-card" id="kpi-hotspots" style={{ borderLeft: '3px solid var(--color-critical)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <span className="kpi-title">Roads at Risk</span>
            <div className="kpi-value" style={{ color: kpis.criticalHotspots + kpis.highRiskRoads > 0 ? 'var(--color-critical)' : 'inherit' }}>
              {kpis.criticalHotspots + kpis.highRiskRoads}
            </div>
          </div>
          <div style={{ padding: '6px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-critical)', display: 'flex' }}>
            <AlertTriangle size={15} />
          </div>
        </div>
      </div>
      <div className="kpi-card" id="kpi-speed" style={{ borderLeft: '3px solid var(--color-low)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <span className="kpi-title">Network Speed</span>
            <div className="kpi-value">
              {kpis.avgSpeed} <span className="kpi-unit">kph</span>
            </div>
          </div>
          <div style={{ padding: '6px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-low)', display: 'flex' }}>
            <Activity size={15} />
          </div>
        </div>
      </div>
      <div className="kpi-card" id="kpi-actions" style={{ borderLeft: '3px solid var(--rta-blue)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <span className="kpi-title">Recommended Actions</span>
            <div className="kpi-value" style={{ color: kpis.criticalHotspots + kpis.highRiskRoads > 0 ? 'var(--rta-blue)' : 'inherit' }}>
              {kpis.criticalHotspots + kpis.highRiskRoads}
            </div>
          </div>
          <div style={{ padding: '6px', borderRadius: '50%', background: 'var(--rta-blue-bg)', color: 'var(--rta-blue)', display: 'flex' }}>
            <Zap size={15} />
          </div>
        </div>
      </div>
      <div className="kpi-card" id="kpi-time" style={{ borderLeft: '3px solid var(--text-muted)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <span className="kpi-title">Replay Time</span>
            <div className="kpi-value" style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
              {String(hour).padStart(2, '0')}:00
            </div>
          </div>
          <div style={{ padding: '6px', borderRadius: '50%', background: 'var(--border-color)', color: 'var(--text-secondary)', display: 'flex' }}>
            <Clock size={15} />
          </div>
        </div>
      </div>
    </div>
  );
};
export default KpiCards;
