import React from 'react';
import { 
  Sun, 
  Moon, 
  CheckCircle, 
  LayoutDashboard, 
  Map, 
  Cpu, 
  AlertTriangle, 
  Activity, 
  Shield 
} from 'lucide-react';
import { Scenario, ActiveTab } from '../lib/types';

interface ControlSidebarProps {
  scenarios: Scenario[];
  activeScenarioId: string;
  handleLaunchScenario: (sc: Scenario) => void;
  realTime: string;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedLocationId: string | null;
}

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  scenarios,
  activeScenarioId,
  handleLaunchScenario,
  realTime,
  theme,
  toggleTheme,
  activeTab,
  setActiveTab,
  selectedLocationId
}) => {
  const handleTabClick = (tab: ActiveTab) => {
    if (tab === 'overview' || tab === 'map') {
      setActiveTab(tab);
    } else {
      if (selectedLocationId) {
        setActiveTab(tab);
      } else {
        alert("Please select a hotspot corridor first.");
      }
    }
  };

  const navItems: { label: string; tab: ActiveTab; icon: React.ReactNode }[] = [
    { label: 'Dashboard', tab: 'overview', icon: <LayoutDashboard size={16} /> },
    { label: 'Live Map', tab: 'map', icon: <Map size={16} /> },
    { label: 'AI Predictions', tab: 'forecast', icon: <Cpu size={16} /> },
    { label: 'Incidents', tab: 'forecast', icon: <AlertTriangle size={16} /> },
    { label: 'Signal Timing', tab: 'forecast', icon: <Activity size={16} /> },
    { label: 'AI Briefing', tab: 'briefing', icon: <Shield size={16} /> }
  ];

  return (
    <aside className="panel" id="sidebar-scenarios" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--border-color)', padding: '20px 18px', gap: '16px', background: 'var(--bg-panel)', overflowY: 'auto' }}>
      
      {/* App Brand Header */}
      <div className="brand-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div className="rta-logo" style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, background: 'var(--rta-red)', color: 'white', letterSpacing: '0.02em' }}>RTA</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', padding: '1px 6px', borderRadius: '20px', fontSize: '10px', fontWeight: 700 }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }}></span>
            ONLINE
          </div>
        </div>
        <h1 className="console-title" style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginTop: '2px' }}>
          PeakFlow Copilot
        </h1>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Traffic Prevention Console
        </div>
      </div>

      {/* Modern Sidebar Navigation Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item, idx) => {
          const isItemActive = activeTab === item.tab;
          return (
            <button
              key={idx}
              onClick={() => handleTabClick(item.tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: 'none',
                background: isItemActive ? 'var(--rta-blue-bg)' : 'transparent',
                color: isItemActive ? 'var(--rta-blue)' : 'var(--text-secondary)',
                fontSize: '16px',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              className="sidebar-nav-btn"
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Clock and Theme Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
        <div className="status-badge" style={{ textTransform: 'none', fontFamily: 'var(--font-mono)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 600 }}>
          <span className="status-dot active"></span>
          Clock: {realTime || '00:00:00'}
        </div>
        <button 
          onClick={toggleTheme}
          style={{ cursor: 'pointer', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', fontSize: '14px', fontWeight: 600, background: 'var(--bg-card)', color: 'var(--text-primary)', transition: 'all 0.15s ease' }}
        >
          {theme === 'dark' ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Sun size={14} /> Light Mode</span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Moon size={14} /> Dark Mode</span>
          )}
        </button>
      </div>

      {/* Replay Launcher Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <span style={{ fontSize: '11px', display: 'block', paddingLeft: '4px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>Simulation Replays</span>
        <div className="scenario-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {scenarios.map(sc => {
            const isOptional = sc.id === 'rain-stress-test';
            const simplifiedSubtitle = {
              'pm-peak-demo': 'Weekday commuter rush',
              'creek-crossing-demo': 'Bridge rerouting',
              'signal-delay-demo': 'Adaptive split delay',
              'rain-stress-test': 'Rain volume shift'
            }[sc.id] || sc.title;

            return (
              <button
                key={sc.id}
                onClick={() => handleLaunchScenario(sc)}
                className={`scenario-card ${isOptional ? 'optional' : ''} ${activeScenarioId === sc.id ? 'active' : ''}`}
                id={`scenario-${sc.id}`}
                style={{ width: '100%', cursor: 'pointer', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}
              >
                <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0, fontSize: '14px', fontWeight: 700, lineHeight: 1.35 }}>
                  <span>
                    {sc.id === 'rain-stress-test' ? 'Storm Test' : sc.title}
                  </span>
                  {activeScenarioId === sc.id && <CheckCircle size={12} className="text-primary" />}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{simplifiedSubtitle}</p>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
export default ControlSidebar;
