import React from 'react';
import { ActiveTab } from '../lib/types';

interface WorkflowStepperProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedLocationId: string | null;
  mitigations: Record<string, string>;
  briefing: any;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  activeTab,
  setActiveTab,
  selectedLocationId,
  mitigations,
  briefing
}) => {
  return (
    <div className="workflow-stepper" id="guided-flow-steps">
      <div 
        className={`workflow-step completed ${activeTab === 'overview' ? 'active' : ''}`}
        onClick={() => setActiveTab('overview')}
      >
        <span className="workflow-step-num">Step 1</span>
        <span className="workflow-step-title">Select Scenario</span>
      </div>
      
      <div 
        className={`workflow-step ${selectedLocationId ? 'completed' : 'active'} ${activeTab === 'map' ? 'active' : ''}`}
        onClick={() => setActiveTab('map')}
      >
        <span className="workflow-step-num">Step 2</span>
        <span className="workflow-step-title">Select Hotspot</span>
      </div>

      <div 
        className={`workflow-step ${selectedLocationId ? 'completed' : ''} ${activeTab === 'forecast' ? 'active' : ''}`}
        onClick={() => {
          if (selectedLocationId) {
            setActiveTab('forecast');
          } else {
            alert("Please select a hotspot corridor (Step 2) first.");
          }
        }}
      >
        <span className="workflow-step-num">Step 3</span>
        <span className="workflow-step-title">Review Forecast & Actions</span>
      </div>

      <div 
        className={`workflow-step ${briefing ? 'completed' : ''} ${activeTab === 'briefing' ? 'active' : ''}`}
        onClick={() => {
          if (selectedLocationId) {
            setActiveTab('briefing');
          } else {
            alert("Please select a hotspot corridor (Step 2) first.");
          }
        }}
      >
        <span className="workflow-step-num">Step 4</span>
        <span className="workflow-step-title">Generate & Approve</span>
      </div>
    </div>
  );
};
export default WorkflowStepper;
