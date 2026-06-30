import React from 'react';

interface RoadsideAdvisoryBoardProps {
  text: string;
}

export const RoadsideAdvisoryBoard: React.FC<RoadsideAdvisoryBoardProps> = ({ text }) => {
  return (
    <div className="vms-container">
      <div className="brief-section-title" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
        Official Roadside Advisory Draft
      </div>
      <div className="vms-display" id="vms-preview" style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', background: '#111', color: '#ffcc00', padding: '12px', borderRadius: '4px', border: '2px solid #333', textAlign: 'center', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {text}
      </div>
    </div>
  );
};

export default RoadsideAdvisoryBoard;
