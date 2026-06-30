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
    <div className="main-tab-bar">
      <button 
        className={`main-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
        onClick={() => handleTabClick('overview')}
      >
        <Sliders size={13} /> Overview
      </button>
      <button 
        className={`main-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
        onClick={() => handleTabClick('map')}
      >
        <Compass size={13} /> Map & Hotspots
      </button>
      <button 
        className={`main-tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
        onClick={() => handleTabClick('forecast')}
      >
        <Cpu size={13} /> Forecast
      </button>
      <button 
        className={`main-tab-btn ${activeTab === 'whatif' ? 'active' : ''}`}
        onClick={() => handleTabClick('whatif')}
      >
        <Sliders size={13} /> What-If Simulator
      </button>
      <button 
        className={`main-tab-btn ${activeTab === 'briefing' ? 'active' : ''}`}
        onClick={() => handleTabClick('briefing')}
      >
        <Shield size={13} /> AI Briefing & Approval
      </button>
    </div>
  );
};
export default DashboardTabs;
