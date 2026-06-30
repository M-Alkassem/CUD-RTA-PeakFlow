import React from 'react';
import dynamic from 'next/dynamic';
import { Corridor, ActiveTab } from '../lib/types';
import { ShieldAlert, Compass, SkipForward } from 'lucide-react';

const DubaiLeafletMap = dynamic(
  () => import('./DubaiLeafletMap'),
  { 
    ssr: false, 
    loading: () => (
      <div style={{ height: '550px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ border: '3px solid var(--border-color)', borderTop: '3px solid var(--rta-blue)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
        <span>Loading Dubai Traffic Replay Map...</span>
      </div>
    )
  }
);

interface LiveMapTabProps {
  corridors: Corridor[];
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
  theme: 'dark' | 'light';
  appliedActions: Record<string, boolean>;
}

export const LiveMapTab: React.FC<LiveMapTabProps> = ({
  corridors,
  selectedLocationId,
  setSelectedLocationId,
  setActiveTab,
  theme,
  appliedActions
}) => {
  const selectedCorridor = corridors.find(c => c.location_id === selectedLocationId) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
      
      {/* Real Dubai Leaflet Map Component */}
      <DubaiLeafletMap 
        corridors={corridors}
        selectedLocationId={selectedLocationId}
        setSelectedLocationId={setSelectedLocationId}
        theme={theme}
      />

      {/* Fallback & Tile Load Info Notice */}
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>ℹ️ Map tiles are served via OpenStreetMap / CARTO. If offline or tiles fail to load, hotspot risk scores remain inspectable in the Overview table.</span>
      </div>

      {/* Bottom Panel - Legend & Selected Hotspot Detail Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        
        {/* Risk Legend Card */}
        <div className="detail-card" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={14} className="text-secondary" /> Risk Status Legend
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-critical)', display: 'inline-block' }} />
              <strong>80–100:</strong> <span style={{ color: 'var(--color-critical)', fontWeight: 600 }}>Critical Risk (Pulsing)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-high)', display: 'inline-block' }} />
              <strong>60–79:</strong> <span style={{ color: 'var(--color-high)', fontWeight: 600 }}>High Risk (Pulsing)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-medium)', display: 'inline-block' }} />
              <strong>40–59:</strong> <span style={{ color: 'var(--color-medium)', fontWeight: 600 }}>Medium Risk</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-low)', display: 'inline-block' }} />
              <strong>0–39:</strong> <span style={{ color: 'var(--color-low)', fontWeight: 600 }}>Low Risk</span>
            </div>
          </div>
        </div>

        {/* Selected Hotspot Detail Card */}
        {selectedCorridor ? (
          <div className="detail-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '8px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-title)' }}>
                  Selected Hotspot: {selectedCorridor.road_name} ({selectedCorridor.direction})
                </h4>
                {appliedActions[selectedCorridor.location_id] && (
                  <span className="badge-risk low" style={{ fontSize: '11px', padding: '2px 8px' }}>Override Split Active</span>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '14px', marginTop: '6px' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '12px' }}>Risk Score</span>
                  <strong style={{ fontSize: '16px', color: selectedCorridor.congestion_pressure_score >= 80 ? 'var(--color-critical)' : selectedCorridor.congestion_pressure_score >= 60 ? 'var(--color-high)' : selectedCorridor.congestion_pressure_score >= 40 ? 'var(--color-medium)' : 'var(--color-low)' }}>
                    {selectedCorridor.congestion_pressure_score} / 100
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '12px' }}>Average Speed</span>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{selectedCorridor.avg_speed_kph} kph</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '12px' }}>V/C Ratio</span>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{selectedCorridor.vc_ratio.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '12px' }}>Area</span>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{selectedCorridor.area}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button 
                onClick={() => setActiveTab('forecast')}
                className="btn-action approve"
                style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Compass size={14} /> Open Detailed Diagnostics & Simulator
              </button>
            </div>
          </div>
        ) : (
          <div className="detail-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Select a map hotspot marker to review current telemetry metrics.</span>
          </div>
        )}

      </div>
    </div>
  );
};

export default LiveMapTab;
