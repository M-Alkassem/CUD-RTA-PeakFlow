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
          RTA PeakFlow <span style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '8px', marginLeft: '8px', color: 'var(--text-secondary)', fontWeight: 400, fontSize: '12px' }}>Demand Shift Engine</span>
        </h1>
      </div>
      <div className="status-panel">
        <div className="status-badge" style={{ textTransform: 'none', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
          <span className="status-dot active"></span>
          TOC Time: {realTime || '00:00:00'}
        </div>
        <div className="status-badge" style={{ textTransform: 'none' }}>
          Operational View: {activeScenario ? activeScenario.title : 'Business Corridor Peak'}
        </div>
        <div className="status-badge">
          <span className="status-dot"></span>
          Telemetry Stream
        </div>

      </div>
    </header>
  );
};
export default Header;
