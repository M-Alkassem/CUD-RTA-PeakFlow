import React from 'react';
import { Compass } from 'lucide-react';
import { Corridor } from '../lib/types';
import { locationMapPoints, projectCoords, getOffset } from '../lib/mapUtils';

interface RoadNetworkMapProps {
  zoom: number;
  pan: { x: number; y: number };
  isPanning: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUpOrLeave: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetView: () => void;
  handleFitHotspots: () => void;
  hoveredNode: any;
  setHoveredNode: (node: any) => void;
  tooltipPos: { x: number; y: number };
  setTooltipPos: (pos: { x: number; y: number }) => void;
  corridors: Corridor[];
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string) => void;
}

export const RoadNetworkMap: React.FC<RoadNetworkMapProps> = ({
  zoom,
  pan,
  isPanning,
  handleMouseDown,
  handleMouseMove,
  handleMouseUpOrLeave,
  handleZoomIn,
  handleZoomOut,
  handleResetView,
  handleFitHotspots,
  hoveredNode,
  setHoveredNode,
  tooltipPos,
  setTooltipPos,
  corridors,
  selectedLocationId,
  setSelectedLocationId
}) => {
  return (
    <div className="map-panel" id="section-map-overview" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span className="panel-title" style={{ fontSize: '10px' }}>
          <Compass size={12} className="text-muted" style={{ marginRight: '4px' }} /> Dubai Road Network Overview (Live Hotspots)
        </span>
        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Interactive Tactical Map (Drag to Pan · Zoom active)
        </span>
      </div>
      
      <div style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-main)' }}>
        {/* Floating Map Controls Panel */}
        <div className="map-controls-overlay">
          <button className="map-control-action-btn" onClick={handleZoomIn} title="Zoom In">+</button>
          <button className="map-control-action-btn" onClick={handleZoomOut} title="Zoom Out">-</button>
          <button className="map-control-wide-btn" onClick={handleResetView} title="Reset Scale">Reset View</button>
          <button className="map-control-wide-btn" onClick={handleFitHotspots} title="Fit Selected Hotspot">Fit Hotspots</button>
        </div>

        <svg 
          viewBox="0 0 800 480" 
          className="map-svg"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          style={{ cursor: isPanning ? 'grabbing' : 'grab', userSelect: 'none', width: '100%', height: 'auto', display: 'block' }}
        >
          {/* Grid Lines for high-tech look */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border-color)" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Apply Zoom and Pan transform grouping */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} style={{ transformOrigin: 'center', transition: isPanning ? 'none' : 'transform 0.15s ease-out' }}>
            {/* Water / Creek Path */}
            <path d="M 450,0 C 460,50 490,95 460,115 C 420,135 390,155 375,230" className="map-road-path waterway" />
            
            {/* Shoreline Coast */}
            <path d="M 0,100 C 150,110 300,105 440,0 L 0,0 Z" className="map-shoreline-path" />

            {/* Dubai Highways Background Paths */}
            {/* Sheikh Zayed Road (E11) */}
            <path d="M 96,433 L 118,337 L 188,206 L 271,175 L 374,111 L 382,99 L 464,81 L 513,53 L 553,25" className="map-road-path main-highway" style={{ stroke: 'rgba(0,0,0,0.1)' }} />
            <path d="M 96,433 L 118,337 L 188,206 L 271,175 L 374,111 L 382,99 L 464,81 L 513,53 L 553,25" className="map-road-path main-highway" style={{ stroke: 'var(--border-highlight)', opacity: 0.8 }} />

            {/* Al Khail Road (E44) */}
            <path d="M 118,337 L 271,175 L 353,137 L 400,130 L 494,89 L 546,73" className="map-road-path" style={{ stroke: 'var(--border-color)', opacity: 0.6 }} />

            {/* Mohammed Bin Zayed Road (E311) */}
            <path d="M 150,450 L 500,250 L 753,153" className="map-road-path" style={{ stroke: 'var(--border-color)', opacity: 0.5 }} />

            {/* Major Road Labels */}
            <text x="140" y="240" transform="rotate(-30 140 240)" fill="var(--text-muted)" fontSize="8" fontWeight="600" opacity="0.8">SHEIKH ZAYED ROAD (E11)</text>
            <text x="240" y="195" transform="rotate(-25 240 195)" fill="var(--text-muted)" fontSize="7" fontWeight="500" opacity="0.6">AL KHAIL ROAD (E44)</text>
            <text x="440" y="200" transform="rotate(-20 440 200)" fill="var(--text-muted)" fontSize="7" fontWeight="500" opacity="0.5">MBZ ROAD (E311)</text>
            <text x="440" y="55" fill="var(--text-muted)" fontSize="7" fontWeight="500" opacity="0.7">DUBAI CREEK</text>

            {/* Interactive Nodes */}
            {locationMapPoints.map(pt => {
              const corridorData = corridors.find(c => c.location_id === pt.id);
              if (!corridorData) return null;
              
              const score = corridorData.congestion_pressure_score;
              const level = corridorData.risk_level.toLowerCase();
              const isSelected = selectedLocationId === pt.id;
              const offset = getOffset(pt.id);
              const coords = projectCoords(pt.lat, pt.lng);
              const cx = coords.x + offset.dx;
              const cy = coords.y + offset.dy;

              const colorMap = {
                low: 'var(--color-low)',
                medium: 'var(--color-medium)',
                high: 'var(--color-high)',
                critical: 'var(--color-critical)'
              };
              const color = colorMap[level as 'low'|'medium'|'high'|'critical'] || 'var(--text-muted)';

              return (
                <g 
                  key={pt.id} 
                  className={`map-node-group ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLocationId(pt.id);
                  }}
                  onMouseEnter={(e) => {
                    setHoveredNode({ pt, corridorData });
                    setTooltipPos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => {
                    setTooltipPos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => {
                    setHoveredNode(null);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx={cx} cy={cy} r="18" fill="transparent" />

                  {isSelected && (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r="7.5" 
                      fill="none" 
                      stroke={color} 
                      className="pulsing-ring" 
                    />
                  )}

                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={isSelected ? "7" : "5.5"} 
                    fill={color} 
                    stroke={isSelected ? "var(--text-title)" : "var(--bg-panel)"} 
                    strokeWidth={isSelected ? "2" : "1"}
                    className="map-node-marker"
                    style={{
                      filter: isSelected ? `drop-shadow(0 0 5px ${color})` : 'none'
                    }}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {/* Map Legend overlay */}
        <div className="map-legend">
          <div className="map-legend-item">
            <span className="map-legend-dot" style={{ background: 'var(--color-low)' }}></span>
            <span>Low Risk (&lt;40)</span>
          </div>
          <div className="map-legend-item">
            <span className="map-legend-dot" style={{ background: 'var(--color-medium)' }}></span>
            <span>Medium Risk (40-59)</span>
          </div>
          <div className="map-legend-item">
            <span className="map-legend-dot" style={{ background: 'var(--color-high)' }}></span>
            <span>High Risk (60-79)</span>
          </div>
          <div className="map-legend-item">
            <span className="map-legend-dot" style={{ background: 'var(--color-critical)' }}></span>
            <span>Critical Risk (&ge;80)</span>
          </div>
        </div>
      </div>

      {/* Floating HTML Map Tooltip Overlay */}
      {hoveredNode && (
        <div 
          className="map-html-tooltip" 
          style={{ 
            left: `${tooltipPos.x + 12}px`, 
            top: `${tooltipPos.y + 12}px` 
          }}
        >
          <div className="map-html-tooltip-title">{hoveredNode.pt.name}</div>
          <div className="map-html-tooltip-row">
            <span className="map-html-tooltip-label">ID:</span>
            <span className="map-html-tooltip-val">{hoveredNode.pt.id}</span>
          </div>
          <div className="map-html-tooltip-row">
            <span className="map-html-tooltip-label">Risk Score:</span>
            <span className="map-html-tooltip-val" style={{ color: hoveredNode.corridorData.congestion_pressure_score >= 80 ? 'var(--color-critical)' : hoveredNode.corridorData.congestion_pressure_score >= 60 ? 'var(--color-high)' : 'var(--color-low)', fontWeight: 700 }}>
              {hoveredNode.corridorData.congestion_pressure_score}/100
            </span>
          </div>
          <div className="map-html-tooltip-row">
            <span className="map-html-tooltip-label">Avg Speed:</span>
            <span className="map-html-tooltip-val">{hoveredNode.corridorData.avg_speed_kph || 80} kph</span>
          </div>
          <div className="map-html-tooltip-row">
            <span className="map-html-tooltip-label">Main Cause:</span>
            <span className="map-html-tooltip-val" style={{ fontSize: '9.5px', maxWidth: '100px', textAlign: 'right', display: 'block' }}>
              {hoveredNode.corridorData.incident_affected ? 'Incident blockage' : 
               (hoveredNode.corridorData.junction_performance && hoveredNode.corridorData.junction_performance.degree_of_saturation > 0.8) ? 'Signal delay' :
               hoveredNode.corridorData.vc_ratio > 0.9 ? 'Near capacity' : 
               'Commute peak'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
export default RoadNetworkMap;
