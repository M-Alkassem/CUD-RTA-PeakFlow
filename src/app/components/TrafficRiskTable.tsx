import React from 'react';
import { HelpCircle, Info } from 'lucide-react';
import { Corridor } from '../lib/types';

interface TrafficRiskTableProps {
  sortedCorridors: Corridor[];
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string) => void;
  activeScenarioId: string;
  showTooltip: boolean;
  setShowTooltip: (show: boolean) => void;
  getRecommendedActionForCorridor: (cor: Corridor) => { action: string; reason: string };
  showInfoFooter?: boolean;
}

export const TrafficRiskTable: React.FC<TrafficRiskTableProps> = ({
  sortedCorridors,
  selectedLocationId,
  setSelectedLocationId,
  activeScenarioId,
  showTooltip,
  setShowTooltip,
  getRecommendedActionForCorridor,
  showInfoFooter = true
}) => {
  return (
    <div className="detail-card" style={{ padding: 0 }} id="section-c-ranking-table">
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="kpi-title" style={{ fontSize: '10px' }}>Top Congestion Risks (Current Hour)</span>
        <div className="helper-text" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => setShowTooltip(!showTooltip)}>
          <HelpCircle size={11} /> Congestion Pressure Score
          {showTooltip && (
            <div style={{ position: 'absolute', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '4px', zIndex: 10, width: '220px', boxShadow: 'var(--shadow-focus)', top: '24px', right: '0px', textTransform: 'none', color: 'var(--text-primary)', fontWeight: 'normal' }}>
              <strong>Score Weighted Components:</strong><br />
              * 35% Volume-to-Capacity ratio<br />
              * 20% Speed drop vs limit<br />
              * 15% Travel time index scaling<br />
              * 10% Raw vehicle demand volume<br />
              * 8% Active incident blockages<br />
              * 7% Nearby junction saturation<br />
              * 5% Calendar holiday multipliers
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '10px 14px 0 14px' }}>
        {activeScenarioId === 'creek-crossing-demo' && (
          <div className="recommend-badge" style={{ marginBottom: '0px' }}>
            Comparing Creek crossings: Garhoud, Maktoum, Business Bay
          </div>
        )}
        {activeScenarioId === 'pm-peak-demo' && (
          <div className="recommend-badge" style={{ marginBottom: '0px' }}>
            Focus Corridor: SZR Commuter Egress
          </div>
        )}
        {activeScenarioId === 'signal-delay-demo' && (
          <div className="recommend-badge" style={{ marginBottom: '0px' }}>
            Focus: Deira Junction Optimization
          </div>
        )}
      </div>

      <div>
        <table className="hotspot-table">
          <thead>
            <tr>
              <th>Road / Corridor</th>
              <th>Risk Score</th>
              {showInfoFooter && <th>Main Cause</th>}
              <th>Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedCorridors.map(cor => {
              const isMainCauseIncident = cor.incident_affected;
              const isMainCauseCapacity = cor.vc_ratio > 0.9;
              const mainCause = isMainCauseIncident ? 'Incident blockages' : isMainCauseCapacity ? 'Volume near capacity' : 'PM Peak Commute';
              const rec = getRecommendedActionForCorridor(cor);

              return (
                <tr
                  key={cor.location_id}
                  onClick={() => setSelectedLocationId(cor.location_id)}
                  className={`hotspot-row ${selectedLocationId === cor.location_id ? 'selected' : ''}`}
                  id={`ranking-row-${cor.location_id}`}
                >
                  <td style={{ fontWeight: 600 }}>
                    {cor.location_id} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '10px' }}>({cor.location_name})</span>
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    <span className={`badge-risk ${cor.risk_level.toLowerCase()}`} style={{ marginRight: '6px' }}>
                      {cor.congestion_pressure_score}
                    </span>
                  </td>
                  {showInfoFooter && <td>{mainCause}</td>}
                  <td style={{ color: 'var(--rta-blue)', fontWeight: 600 }}>
                    {rec.action}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showInfoFooter && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-color)', fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Info size={11} /> <span>Click a corridor row to load visual detail overlays on the Map or Forecast tabs.</span>
        </div>
      )}
    </div>
  );
};
export default TrafficRiskTable;
