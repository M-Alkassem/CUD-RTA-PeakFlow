import React from 'react';
import { Sliders, Activity, History, Info, CheckCircle } from 'lucide-react';
import { Scenario } from '../lib/types';

interface ControlSidebarProps {
  scenarios: Scenario[];
  activeScenarioId: string;
  handleLaunchScenario: (sc: Scenario) => void;
}

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  scenarios,
  activeScenarioId,
  handleLaunchScenario
}) => {
  return (
    <aside className="panel" id="sidebar-scenarios">
      <div className="panel-header">
        <h2 className="panel-title">
          <Sliders size={14} className="text-muted" /> Control Room Sidebar
        </h2>
      </div>
      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Command Room Sections */}
        <div className="sidebar-nav-list" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <span className="kpi-title" style={{ fontSize: '9px', display: 'block', marginBottom: '6px', paddingLeft: '8px' }}>Console Modules</span>
          <button className="sidebar-nav-item active">
            <Activity size={13} /> Operations Console
          </button>
          <button 
            className="sidebar-nav-item" 
            onClick={() => {
              const el = document.getElementById('decision-log-table');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <History size={13} /> Decision Logs
          </button>
        </div>

        {/* Scenario Launcher List */}
        <div>
          <span className="kpi-title" style={{ fontSize: '9px', display: 'block', marginBottom: '8px', paddingLeft: '8px' }}>Simulation Replays</span>
          <div className="scenario-list">
            {scenarios.map(sc => {
              const isOptional = sc.id === 'rain-stress-test';
              const simplifiedSubtitle = {
                'pm-peak-demo': 'Weekday commuter rush on SZR SB',
                'creek-crossing-demo': 'Al Garhoud Bridge incident rerouting',
                'signal-delay-demo': 'Deira Junction adaptive split adjustment',
                'rain-stress-test': 'Historic storm volume shifts to Metro'
              }[sc.id] || sc.title;

              return (
                <button
                  key={sc.id}
                  onClick={() => handleLaunchScenario(sc)}
                  className={`scenario-card ${isOptional ? 'optional' : ''} ${activeScenarioId === sc.id ? 'active' : ''}`}
                  id={`scenario-${sc.id}`}
                >
                  <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px' }}>
                      {sc.id === 'rain-stress-test' ? 'Optional Resilience Test' : sc.title}
                    </span>
                    {activeScenarioId === sc.id && <CheckCircle size={12} className="text-primary" />}
                  </h4>
                  <p style={{ marginTop: '3px', fontSize: '10px', color: 'var(--text-secondary)' }}>{simplifiedSubtitle}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 'auto', padding: '12px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
          <div className="helper-text" style={{ fontWeight: 700, color: 'var(--text-title)', marginBottom: '4px' }}>
            <Info size={12} /> System Instructions
          </div>
          <p style={{ fontSize: '10.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Replay data stream hour-by-hour. Click a corridor in the **Top Congestion Risks** list to inspect detailed metrics, simulate overrides, and request copilot operator briefs.
          </p>
        </div>
      </div>
    </aside>
  );
};
export default ControlSidebar;
