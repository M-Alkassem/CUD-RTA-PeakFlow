import React from 'react';
import { Sliders, Compass, Cpu, Shield } from 'lucide-react';
import { ActiveTab } from '../lib/types';

interface DashboardTabsProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedLocationId: string | null;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({
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

  return (
    <div className="main-tab-bar" style={{ marginBottom: '16px' }}>
      <button 
        className={`main-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
        onClick={() => handleTabClick('overview')}
      >
        <Sliders size={16} /> Overview
      </button>
      <button 
        className={`main-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
        onClick={() => handleTabClick('map')}
      >
        <Compass size={16} /> Live Map
      </button>
      <button 
        className={`main-tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
        onClick={() => handleTabClick('forecast')}
      >
        <Cpu size={16} /> Forecast & Actions
      </button>
      <button 
        className={`main-tab-btn ${activeTab === 'briefing' ? 'active' : ''}`}
        onClick={() => handleTabClick('briefing')}
      >
        <Shield size={16} /> AI Briefing
      </button>
    </div>
  );
};
export default DashboardTabs;
