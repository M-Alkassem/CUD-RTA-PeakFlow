import React from 'react';

interface RoadsideAdvisoryBoardProps {
  text: string;
}

export const RoadsideAdvisoryBoard: React.FC<RoadsideAdvisoryBoardProps> = ({ text }) => {
  return (
    <div className="vms-container">
      <div className="brief-section-title">Roadside Advisory Draft</div>
      <div className="vms-display" id="vms-preview">
        {text}
      </div>
    </div>
  );
};

export default RoadsideAdvisoryBoard;
