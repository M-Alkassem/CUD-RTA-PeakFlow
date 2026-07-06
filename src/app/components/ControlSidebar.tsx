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
  Shield,
  MessageSquare
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
  activeSidebarNav: string;
  setActiveSidebarNav: (label: string) => void;
  showToast?: (msg: string, type?: 'success' | 'info' | 'warning') => void;
  viewMode?: 'demo' | 'planner';
  selectedCorridorName?: string;
  hour?: number;
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
  selectedLocationId,
  activeSidebarNav,
  setActiveSidebarNav,
  showToast,
  viewMode = 'demo',
  selectedCorridorName,
  hour
}) => {
  const handleTabClick = (label: string, tab: ActiveTab) => {
    if (tab === 'overview' || tab === 'map') {
      setActiveSidebarNav(label);
      setActiveTab(tab);
    } else {
      if (selectedLocationId) {
        setActiveSidebarNav(label);
        setActiveTab(tab);
      } else {
        if (showToast) {
          showToast("Please select a hotspot corridor first.", "warning");
        } else {
          alert("Please select a hotspot corridor first.");
        }
      }
    }
  };

  const navItems: { label: string; tab: ActiveTab; icon: React.ReactNode }[] = [
    { label: 'Demand Pressure', tab: 'overview', icon: <LayoutDashboard size={16} /> },
    { label: 'Live Map', tab: 'map', icon: <Map size={16} /> },
    { label: 'Demand Campaign Planner', tab: 'forecast', icon: <Cpu size={16} /> },
    { label: 'Shift Briefing', tab: 'briefing', icon: <Shield size={16} /> }
  ];

  return (
    <aside className="panel" id="sidebar-scenarios" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--border-color)', padding: '20px 18px', gap: '16px', background: 'var(--bg-panel)', overflowY: 'auto' }}>
      
      {/* App Brand Header */}
      <div className="brand-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', width: '100%' }}>
        <h1 className="console-title" style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginTop: '2px' }}>
          PeakFlow
        </h1>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Demand Shift Engine
        </div>
      </div>

      {/* Sidebar Navigation Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item, idx) => {
          const isItemActive = activeSidebarNav === item.label;
          return (
            <button
              key={idx}
              onClick={() => handleTabClick(item.label, item.tab)}
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

      {/* Scenario launcher section based on viewMode */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
        {viewMode === 'demo' ? (
          <>
            {/* Active Scenario compact badge */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '10px', display: 'block', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>Active Scenario</span>
              <div style={{ 
                background: 'rgba(14, 165, 233, 0.05)', 
                border: '1px solid var(--rta-blue)', 
                borderRadius: '8px', 
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-title)', display: 'block' }}>
                  {activeScenarioId === 'pm-peak-demo' ? 'Business Corridor Peak Demo' : 
                   activeScenarioId === 'creek-crossing-demo' ? 'Creek Crossing Routing Demo' :
                   activeScenarioId === 'signal-delay-demo' ? 'Signal Performance Optimization' : 'Storm Test'}
                </strong>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 550, display: 'block' }}>
                  Selected: {selectedCorridorName || 'None selected'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                  {hour !== undefined ? `Selected time window: ${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00` : (activeScenarioId === 'pm-peak-demo' ? 'AM Peak 08:00–09:00' : 'Peak Commute Hours')}
                </span>
              </div>
            </div>

            {/* Collapsed other scenarios */}
            <details style={{ marginTop: '4px' }}>
              <summary style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none' }}>
                Other demo scenarios
              </summary>
              <div className="scenario-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {scenarios.map(sc => {
                  const isOptional = sc.id === 'rain-stress-test';
                  const titleStr = sc.id === 'rain-stress-test' ? 'Storm Test' : sc.title;
                  const simplifiedSubtitle = {
                    'pm-peak-demo': 'SZR → DIFC / Business Bay AM peak',
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
                      style={{ width: '100%', cursor: 'pointer', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                    >
                      <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0, fontSize: '12.5px', fontWeight: 700, color: 'var(--text-title)' }}>
                        <span>{titleStr}</span>
                        {activeScenarioId === sc.id && <CheckCircle size={12} style={{ color: 'var(--rta-blue)' }} />}
                      </h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>{simplifiedSubtitle}</p>
                    </button>
                  );
                })}
              </div>
            </details>
          </>
        ) : (
          <>
            {/* Standard Simulation Replays list in planner mode */}
            <span style={{ fontSize: '11px', display: 'block', paddingLeft: '4px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>Simulation Replays</span>
            <div className="scenario-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {scenarios.map(sc => {
                const isOptional = sc.id === 'rain-stress-test';
                const titleStr = sc.id === 'rain-stress-test' ? 'Storm Test' : sc.title;
                const simplifiedSubtitle = {
                  'pm-peak-demo': 'SZR → DIFC / Business Bay AM peak',
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
                      <span>{titleStr}</span>
                      {activeScenarioId === sc.id && <CheckCircle size={12} className="text-primary" />}
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{simplifiedSubtitle}</p>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
export default ControlSidebar;
