import React from 'react';
import { Sun, Moon, Info, CheckCircle } from 'lucide-react';
import { Scenario } from '../lib/types';

interface ControlSidebarProps {
  scenarios: Scenario[];
  activeScenarioId: string;
  handleLaunchScenario: (sc: Scenario) => void;
  realTime: string;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  scenarios,
  activeScenarioId,
  handleLaunchScenario,
  realTime,
  theme,
  toggleTheme
}) => {
  return (
    <aside className="panel" id="sidebar-scenarios" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--border-color)', padding: '20px' }}>
      {/* App Brand Header */}
      <div className="brand-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', width: '100%' }}>
        <div className="rta-logo" style={{ fontSize: '15px', padding: '4px 8px', borderRadius: '4px', fontWeight: 800 }}>RTA</div>
        <h1 className="console-title" style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
          PeakFlow Copilot
        </h1>
        <div style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Traffic Prevention Console
        </div>
      </div>

      {/* Clock and Theme Controls */}
      <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-color)' }}>
        <div className="status-badge" style={{ textTransform: 'none', fontFamily: 'var(--font-mono)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-main)' }}>
          <span className="status-dot active"></span>
          TOC Time: {realTime || '00:00:00'}
        </div>
        <button 
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title="Toggle Theme"
          style={{ cursor: 'pointer', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', fontSize: '15px', fontWeight: 600, background: 'var(--bg-panel)' }}
        >
          {theme === 'dark' ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Sun size={14} className="text-primary" /> Light Mode</span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Moon size={14} className="text-primary" /> Dark Mode</span>
          )}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, paddingTop: '16px', overflowY: 'auto' }}>
        {/* Scenario Launcher List */}
        <div>
          <span className="kpi-title" style={{ fontSize: '14px', display: 'block', marginBottom: '10px', paddingLeft: '4px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Simulation Replays</span>
          <div className="scenario-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                  style={{ width: '100%', cursor: 'pointer' }}
                >
                  <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                    <span style={{ fontSize: '15px', fontWeight: 700 }}>
                      {sc.id === 'rain-stress-test' ? 'Optional Resilience Test' : sc.title}
                    </span>
                    {activeScenarioId === sc.id && <CheckCircle size={14} className="text-primary" />}
                  </h4>
                  <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{simplifiedSubtitle}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Instructions at the bottom */}
        <div style={{ marginTop: 'auto', padding: '14px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <div className="helper-text" style={{ fontWeight: 700, color: 'var(--text-title)', marginBottom: '6px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={14} /> Instructions
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
            Select a simulation scenario. Click any road on the risks list or Live Map to diagnose metrics, test prevention actions, and request copilot briefs.
          </p>
        </div>
      </div>
    </aside>
  );
};
export default ControlSidebar;
