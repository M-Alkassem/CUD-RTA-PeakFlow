import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Scenario, ThemeMode } from '../lib/types';

interface HeaderProps {
  realTime: string;
  activeScenario: Scenario | null;
  theme: ThemeMode;
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ realTime, activeScenario, theme, toggleTheme }) => {
  return (
    <header className="header-console">
      <div className="brand-section">
        <div className="rta-logo">RTA</div>
        <h1 className="console-title">
          RTA PeakFlow Copilot <span style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '8px', marginLeft: '8px', color: 'var(--text-secondary)', fontWeight: 400, fontSize: '12px' }}>Traffic Prevention Dashboard</span>
        </h1>
      </div>
      <div className="status-panel">
        <div className="status-badge" style={{ textTransform: 'none', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
          <span className="status-dot active"></span>
          TOC Time: {realTime || '00:00:00'}
        </div>
        <div className="status-badge" style={{ textTransform: 'none' }}>
          Operational View: {activeScenario ? activeScenario.title : 'PM Peak Congestion'}
        </div>
        <div className="status-badge">
          <span className="status-dot"></span>
          Telemetry Stream
        </div>
        <button 
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title="Toggle Theme"
          style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {theme === 'dark' ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sun size={12} className="text-primary" /> Light Mode</span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Moon size={12} className="text-primary" /> Dark Mode</span>
          )}
        </button>
      </div>
    </header>
  );
};
export default Header;
