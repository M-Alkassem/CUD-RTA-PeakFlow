import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Corridor, ActiveTab } from '../lib/types';
import { 
  isValidDubaiCoordinate, 
  getCoordinatesForCorridor, 
  getValidDubaiHotspots 
} from '../lib/mapCoordinates';

interface DubaiLeafletMapProps {
  corridors: Corridor[];
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string) => void;
  theme: 'dark' | 'light';
  activeTab: ActiveTab;
}

export const DubaiLeafletMap: React.FC<DubaiLeafletMapProps> = ({
  corridors,
  selectedLocationId,
  setSelectedLocationId,
  theme,
  activeTab
}) => {
  const [viewMode, setViewMode] = useState<'tactical' | 'gis'>('gis');

  // Leaflet Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const badgeMarkersRef = useRef<L.Marker[]>([]);

  const validHotspots = getValidDubaiHotspots(corridors);

  // 1. GIS Leaflet Map Mount/Destroy Cycle
  useEffect(() => {
    if (viewMode !== 'gis' || !mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [25.2048, 55.2708],
        zoom: 11,
        zoomControl: false,
        preferCanvas: false,
        zoomAnimation: true,
        markerZoomAnimation: true,
        fadeAnimation: true
      });

      L.control.zoom({ position: 'topright' }).addTo(mapRef.current);
      
      const tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      tileLayerRef.current = L.tileLayer(tileUrl, { 
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        updateWhenIdle: true,
        keepBuffer: 2
      }).addTo(mapRef.current);

      markerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
      }
    };
  }, [viewMode]);

  // 2. Leaflet Tab Resizing Sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map || viewMode !== 'gis') return;

    if (activeTab === 'map') {
      setTimeout(() => {
        map.invalidateSize({ animate: false });
        
        const currentCenter = map.getCenter();
        if (!isValidDubaiCoordinate(currentCenter.lat, currentCenter.lng)) {
          map.setView([25.2048, 55.2708], 11, { animate: false });
        }

        if (validHotspots.length >= 2) {
          const latLngs = validHotspots.map(h => {
            const coords = getCoordinatesForCorridor(h.location_id);
            return L.latLng(coords.lat, coords.lng);
          });
          const bounds = L.latLngBounds(latLngs);
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
        }
      }, 150);
    }
  }, [activeTab, viewMode]);

  // 3. GIS Markers Builder
  useEffect(() => {
    const map = mapRef.current;
    const markerGroup = markerGroupRef.current;
    if (!map || !markerGroup || viewMode !== 'gis') return;

    validHotspots.forEach(cor => {
      const coords = getCoordinatesForCorridor(cor.location_id);
      const score = cor.congestion_pressure_score;
      
      let riskClass = 'risk-low';
      let riskLevel = 'Low';
      if (score >= 80) { riskClass = 'risk-critical'; riskLevel = 'Critical'; }
      else if (score >= 60) { riskClass = 'risk-high'; riskLevel = 'High'; }
      else if (score >= 40) { riskClass = 'risk-medium'; riskLevel = 'Medium'; }

      const isSelected = cor.location_id === selectedLocationId;
      const className = `custom-leaflet-marker ${riskClass} ${isSelected ? 'selected' : ''}`;

      const icon = L.divIcon({
        className,
        html: `<span>${score}</span>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const popupHtml = `
        <div style="font-family: var(--font-body); min-width: 220px; font-size: 13.5px; color: var(--text-primary); padding: 4px;">
          <div style="font-weight: 800; font-family: var(--font-display); font-size: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; margin-bottom: 6px; color: var(--text-title);">
            ${cor.road_name} (${cor.direction})
          </div>
          <div><strong>Risk Score:</strong> ${score} (${riskLevel})</div>
          <div><strong>Avg Speed:</strong> ${cor.avg_speed_kph} kph</div>
          <div><strong>Cause:</strong> ${cor.incident_affected ? 'Incident blockages' : 'Commuter flow'}</div>
        </div>
      `;

      const existingMarker = markersRef.current[cor.location_id];
      if (existingMarker) {
        existingMarker.setIcon(icon);
        existingMarker.setPopupContent(popupHtml);
      } else {
        const marker = L.marker([coords.lat, coords.lng], { icon })
          .addTo(markerGroup)
          .bindPopup(popupHtml, { closeButton: false, offset: [0, -10] });

        marker.on('click', () => {
          setSelectedLocationId(cor.location_id);
        });

        markersRef.current[cor.location_id] = marker;
      }
    });
  }, [corridors, selectedLocationId, viewMode]);

  // 4. GIS Selection Pan
  useEffect(() => {
    if (viewMode !== 'gis') return;
    Object.entries(markersRef.current).forEach(([locId, marker]) => {
      const isSelected = locId === selectedLocationId;
      const element = marker.getElement();
      if (element) {
        if (isSelected) {
          element.classList.add('selected');
          const coords = getCoordinatesForCorridor(locId);
          mapRef.current?.panTo([coords.lat, coords.lng], { animate: true, duration: 0.5 });
          setTimeout(() => {
            if (marker.getPopup() && !marker.getPopup()?.isOpen()) {
              marker.openPopup();
            }
          }, 100);
        } else {
          element.classList.remove('selected');
        }
      }
    });
  }, [selectedLocationId, viewMode]);

  // 5. Draw Road Polylines and Suggested Alternative Route overlays
  useEffect(() => {
    const map = mapRef.current;
    if (!map || viewMode !== 'gis') return;

    // Clear old polylines
    polylinesRef.current.forEach(p => p.remove());
    polylinesRef.current = [];

    // Clear old badge markers
    badgeMarkersRef.current.forEach(m => m.remove());
    badgeMarkersRef.current = [];

    // High-Fidelity Curved Coordinate Paths tracing real Dubai highways
    const paths = {
      SZR: [
        [25.0750, 55.1380], // Marina / JLT
        [25.0930, 55.1610], // Barsha Heights
        [25.1180, 55.2000], // MOE / Interchange 4
        [25.1430, 55.2220], // Al Manara
        [25.1610, 55.2390], // Safa Park S
        [25.1760, 55.2510], // Safa Park N
        [25.2010, 55.2700], // Business Bay
        [25.2110, 55.2790], // DIFC
        [25.2230, 55.2820]  // Defence / Interchange 1
      ],
      EKR: [
        [25.1250, 55.2200], // Al Quoz S
        [25.1400, 55.2320],
        [25.1490, 55.2350], // Al Quoz / Marabea
        [25.1630, 55.2530], // Latifa Bint Hamdan
        [25.1860, 55.2700], // Business Bay
        [25.1960, 55.2880], // Financial Centre
        [25.2190, 55.3130]  // Oud Metha E44
      ],
      JBR: [
        [25.1320, 55.1850], // Madinat Jumeirah
        [25.1550, 55.2050], // Umm Suqeim
        [25.1750, 55.2210], // Jumeirah 3
        [25.2000, 55.2420], // Mercato
        [25.2080, 55.2480], // Jumeirah 2
        [25.2220, 55.2660]  // La Mer
      ],
      ITT: [
        [25.2580, 55.3280], // Clocktower
        [25.2680, 55.3380], // Qiyadah Metro
        [25.2950, 55.3550]  // Mamzar
      ],
      GAR: [
        [25.2200, 55.3230], // Oud Metha
        [25.2330, 55.3300], // Creek bridge
        [25.2450, 55.3380]  // Airport Rd merge
      ],
      MAK: [
        [25.2330, 55.3130],
        [25.2400, 55.3170],
        [25.2510, 55.3220]
      ],
      BBC: [
        [25.1780, 55.3150], // Ras Al Khor
        [25.1920, 55.2900], // Creek bridge
        [25.2050, 55.2850]  // Downtown bypass
      ]
    };

    const getColorForScore = (s: number) => {
      if (s >= 80) return '#ef4444'; // Red
      if (s >= 60) return '#f97316'; // Orange
      if (s >= 40) return '#eab308'; // Amber
      return '#22c55e'; // Emerald green
    };

    // Calculate max scores to color main roads
    const getScoreForPrefix = (prefix: string) => {
      const matches = corridors.filter(c => c.location_id.startsWith(prefix));
      if (matches.length === 0) return 0;
      return Math.max(...matches.map(m => m.congestion_pressure_score));
    };

    const scores = {
      SZR: getScoreForPrefix('SZR'),
      EKR: getScoreForPrefix('EKR'),
      JBR: getScoreForPrefix('JBR'),
      ITT: getScoreForPrefix('ITT'),
      GAR: getScoreForPrefix('GAR'),
      MAK: getScoreForPrefix('MAK'),
      BBC: getScoreForPrefix('BBC')
    };

    // Draw main roads
    Object.entries(paths).forEach(([roadKey, coords]) => {
      const score = scores[roadKey as keyof typeof scores] || 20;
      const color = getColorForScore(score);
      
      const polyline = L.polyline(coords as L.LatLngExpression[], {
        color: color,
        weight: 6,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Bind tooltip for road name & current congestion
      polyline.bindTooltip(`${roadKey} Corridor: Congestion Score ${score}/100`, { sticky: true });
      polylinesRef.current.push(polyline);
    });

    // Draw Suggested Alternative Route Overlay if bottleneck selected
    if (selectedLocationId) {
      let altPath: L.LatLngExpression[] = [];
      let label = "";
      let congestedBadgeCoords: [number, number] = [0, 0];
      let alternateBadgeCoords: [number, number] = [0, 0];
      let congestedBadgeText = "";
      let alternateBadgeText = "";

      if (selectedLocationId.startsWith('SZR') && scores.SZR >= 40) {
        // Recommend Al Khail Road (EKR) as alternative bypass
        altPath = [
          [25.1180, 55.2000], // SZR MOE
          [25.1220, 55.2100], // link road
          [25.1250, 55.2200], // Al Quoz link
          [25.1490, 55.2350], // EKR E44 path
          [25.1630, 55.2530],
          [25.1860, 55.2700]  // EKR Business Bay
        ];
        label = "AI Alternate Route: E44 Al Khail Road (Low Congestion)";
        congestedBadgeCoords = [25.1610, 55.2390]; // Safa Park
        congestedBadgeText = "SZR (E11): 45m (Delay +18m)";
        alternateBadgeCoords = [25.1630, 55.2530]; // EKR middle
        alternateBadgeText = "Al Khail (E44): 24m (Best Route)";
      } 
      else if (selectedLocationId === 'GAR_N1' && scores.GAR >= 40) {
        // Recommend Business Bay Crossing (BBC)
        altPath = [
          [25.2200, 55.3230], // Oud Metha
          [25.2050, 55.2950], // Link to BBC
          [25.1920, 55.2900], // BBC bridge
          [25.1780, 55.3150]  // Ras Al Khor
        ];
        label = "AI Alternate Route: Business Bay Crossing (Low Congestion)";
        congestedBadgeCoords = [25.2330, 55.3300]; // Garhoud Bridge
        congestedBadgeText = "Garhoud Br: 28m (Delay +12m)";
        alternateBadgeCoords = [25.1920, 55.2900]; // BBC Bridge
        alternateBadgeText = "BB Crossing: 16m (Best Route)";
      }

      if (altPath.length > 0) {
        const altPolyline = L.polyline(altPath, {
          color: '#10b981', // Emerald Green for suggested route path
          weight: 5,
          opacity: 0.9,
          dashArray: '8, 12',
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        altPolyline.bindTooltip(label, { permanent: true, direction: 'top', className: 'ai-map-tooltip' });
        polylinesRef.current.push(altPolyline);

        // Add Waze-style floating HTML badges at route centers
        if (congestedBadgeCoords[0] > 0) {
          const congestedHtml = `<div style="background: #ef4444; color: white; padding: 6px 12px; border-radius: 20px; font-weight: 800; font-size: 11.5px; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); white-space: nowrap; font-family: var(--font-display);">${congestedBadgeText}</div>`;
          const cMarker = L.marker(congestedBadgeCoords, {
            icon: L.divIcon({
              className: 'waze-congested-badge',
              html: congestedHtml,
              iconSize: [160, 30],
              iconAnchor: [80, 15]
            })
          }).addTo(map);
          badgeMarkersRef.current.push(cMarker);
        }

        if (alternateBadgeCoords[0] > 0) {
          const alternateHtml = `<div style="background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-weight: 800; font-size: 11.5px; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); white-space: nowrap; font-family: var(--font-display);">${alternateBadgeText}</div>`;
          const aMarker = L.marker(alternateBadgeCoords, {
            icon: L.divIcon({
              className: 'waze-alternate-badge',
              html: alternateHtml,
              iconSize: [170, 30],
              iconAnchor: [85, 15]
            })
          }).addTo(map);
          badgeMarkersRef.current.push(aMarker);
        }
      }
    }
  }, [corridors, selectedLocationId, viewMode]);

  // Tactical SVG Coordinates mappings for Dubai Road schematic
  const tacticalNodes = [
    { id: 'SZR_S1', label: 'SZR @ Defence SB', x: 340, y: 340 },
    { id: 'SZR_N1', label: 'SZR @ Defence NB', x: 320, y: 350 },
    { id: 'SZR_S2', label: 'SZR @ DIFC SB', x: 400, y: 300 },
    { id: 'SZR_N2', label: 'SZR @ DIFC NB', x: 380, y: 310 },
    { id: 'SZR_S4', label: 'SZR @ MOE SB', x: 200, y: 415 },
    { id: 'SZR_N4', label: 'SZR @ MOE NB', x: 180, y: 425 },
    { id: 'EKR_S1', label: 'Al Khail @ Al Quoz SB', x: 280, y: 440 },
    { id: 'EKR_N1', label: 'Al Khail @ BB NB', x: 380, y: 370 },
    { id: 'GAR_N1', label: 'Al Garhoud Bridge', x: 480, y: 220 },
    { id: 'MAK_N1', label: 'Al Maktoum Bridge', x: 450, y: 130 },
    { id: 'BBC_S1', label: 'Business Bay Crossing', x: 530, y: 310 },
    { id: 'ITT_E1', label: 'Al Ittihad @ Qiyadah EB', x: 670, y: 65 },
    { id: 'ITT_W1', label: 'Al Ittihad @ Mamzar WB', x: 690, y: 55 },
    { id: 'AIR_W1', label: 'Airport Rd WB', x: 580, y: 130 },
    { id: 'JBR_X1', label: 'Jumeirah Beach Rd', x: 220, y: 320 },
    { id: 'DWC_X1', label: 'Expo Rd @ Dubai South', x: 120, y: 490 }
  ];

  const handleResetView = () => {
    if (viewMode === 'gis' && mapRef.current) {
      mapRef.current.setView([25.2048, 55.2708], 11, { animate: true });
    }
  };

  const handleFitHotspots = () => {
    if (viewMode === 'gis' && mapRef.current && validHotspots.length >= 2) {
      const latLngs = validHotspots.map(h => {
        const coords = getCoordinatesForCorridor(h.location_id);
        return L.latLng(coords.lat, coords.lng);
      });
      const bounds = L.latLngBounds(latLngs);
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '550px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#07111F' }}>
      
      {/* Floating Toggle View Mode control */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 1000, display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setViewMode(v => v === 'tactical' ? 'gis' : 'tactical')}
          style={{
            background: 'rgba(14, 165, 233, 0.95)',
            color: 'white',
            border: 'none',
            padding: '8px 14px',
            fontSize: '14px',
            fontWeight: 700,
            borderRadius: '6px',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
          }}
        >
          {viewMode === 'tactical' ? 'Switch to GIS Sat-Map' : 'Switch to Tactical View'}
        </button>
      </div>

      {/* RTA Operations Header Banner */}
      <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 1000, background: 'rgba(11, 18, 32, 0.85)', backdropFilter: 'blur(4px)', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0EA5E9', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
        Dubai Operations Center — {viewMode === 'tactical' ? 'Tactical Telemetry Grid' : 'GIS Satellite View'}
      </div>

      {/* VIEW MODE 1: TACTICAL SVG VIEWPORT */}
      {viewMode === 'tactical' && (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
          {/* Tech Grid SVG Background */}
          <svg style={{ width: '100%', height: '100%', background: '#07111F' }}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Glowing Dubai Creek path */}
            <path d="M 380,40 C 450,150 520,280 580,450" fill="none" stroke="rgba(14, 165, 233, 0.15)" strokeWidth="20" strokeLinecap="round" />
            <path d="M 380,40 C 450,150 520,280 580,450" fill="none" stroke="rgba(14, 165, 233, 0.4)" strokeWidth="4" strokeLinecap="round" />

            {/* Glowing Dubai Highway Corridors */}
            {/* 1. Sheikh Zayed Road */}
            <path id="szr_path" d="M 100,450 C 300,380 500,200 700,80" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" strokeLinecap="round" />
            <path d="M 100,450 C 300,380 500,200 700,80" fill="none" stroke="rgba(14, 165, 233, 0.7)" strokeWidth="2" strokeLinecap="round" />
            {/* Animated Traffic density pulses */}
            <path d="M 100,450 C 300,380 500,200 700,80" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" className="pulse-flow-line" style={{ strokeDasharray: '10, 20', animation: 'dash 3s linear infinite' }} />

            {/* 2. Al Khail Road */}
            <path d="M 150,500 C 320,430 480,270 650,150" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" strokeLinecap="round" />
            <path d="M 150,500 C 320,430 480,270 650,150" fill="none" stroke="rgba(14, 165, 233, 0.5)" strokeWidth="2" strokeLinecap="round" />
            <path d="M 150,500 C 320,430 480,270 650,150" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" className="pulse-flow-line" style={{ strokeDasharray: '8, 25', animation: 'dash 4s linear infinite' }} />

            {/* 3. Al Ittihad Road */}
            <path d="M 600,100 C 650,80 720,50 780,40" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" strokeLinecap="round" />
            <path d="M 600,100 C 650,80 720,50 780,40" fill="none" stroke="rgba(14, 165, 233, 0.6)" strokeWidth="2" strokeLinecap="round" />

            {/* Creek Crossing Bridges links */}
            {/* Al Garhoud Bridge */}
            <line x1="430" y1="230" x2="530" y2="210" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="6" />
            {/* Al Maktoum Bridge */}
            <line x1="410" y1="130" x2="510" y2="110" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="6" />
            {/* Business Bay Crossing */}
            <line x1="470" y1="330" x2="570" y2="310" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="6" />

            {/* Render Glowing Hotspots Node Markers */}
            {tacticalNodes.map(node => {
              const cor = corridors.find(c => c.location_id === node.id);
              if (!cor) return null;

              const score = cor.congestion_pressure_score;
              const isSelected = selectedLocationId === node.id;

              let color = 'var(--color-low)';
              if (score >= 80) color = 'var(--color-critical)';
              else if (score >= 60) color = 'var(--color-high)';
              else if (score >= 40) color = 'var(--color-medium)';

              return (
                <g 
                  key={node.id} 
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedLocationId(node.id)}
                >
                  {/* Selected Outer highlight circle */}
                  {isSelected && (
                    <circle cx={node.x} cy={node.y} r="22" fill="none" stroke="var(--rta-blue)" strokeWidth="2" style={{ opacity: 0.8 }} />
                  )}
                  {/* Hotspot Outer Glow ring */}
                  <circle cx={node.x} cy={node.y} r="14" fill="none" stroke={color} strokeWidth="2" style={{ opacity: 0.4 }} />
                  {/* Hotspot Inner Solid core */}
                  <circle cx={node.x} cy={node.y} r="10" fill={color} />
                  {/* Risk score value inside node */}
                  <text x={node.x} y={node.y + 4} textAnchor="middle" fill="white" style={{ fontSize: '10px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    {score}
                  </text>
                  {/* Label tooltip text */}
                  {isSelected && (
                    <g>
                      <rect x={node.x - 70} y={node.y - 45} width="140" height="24" rx="4" fill="var(--bg-panel)" stroke="var(--border-color)" strokeWidth="1" />
                      <text x={node.x} y={node.y - 29} textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: '11px', fontWeight: 700 }}>
                        {cor.road_name} ({score} Risk)
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Floating Selected Corridor Details Overlay (Tactical View) */}
          {selectedLocationId && (() => {
            const cor = corridors.find(c => c.location_id === selectedLocationId);
            if (!cor) return null;
            const score = cor.congestion_pressure_score;
            let riskLevel = 'Low';
            if (score >= 80) riskLevel = 'Critical';
            else if (score >= 60) riskLevel = 'High';
            else if (score >= 40) riskLevel = 'Medium';

            return (
              <div style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(11, 18, 32, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', color: 'white', width: '280px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', color: 'var(--text-title)' }}>
                  {cor.road_name} ({cor.direction})
                </div>
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Risk Score:</strong> <span style={{ color: score >= 80 ? 'var(--color-critical)' : score >= 60 ? 'var(--color-high)' : 'var(--color-low)', fontWeight: 700 }}>{score} ({riskLevel})</span></div>
                  <div><strong>Avg Speed:</strong> {cor.avg_speed_kph} kph</div>
                  <div><strong>Flow Volume:</strong> {cor.volume_vph} vph</div>
                  <div><strong>Main Cause:</strong> {cor.incident_affected ? 'Collision Blockage' : 'Commuter Peak Flow'}</div>
                </div>
              </div>
            );
          })()}

          {/* Custom style overrides for animated paths */}
          <style>{`
            @keyframes dash {
              to {
                stroke-dashoffset: -40;
              }
            }
          `}</style>
        </div>
      )}

      {/* VIEW MODE 2: GIS LEAFLET VIEWPORT */}
      {viewMode === 'gis' && (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {validHotspots.length === 0 ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--color-critical)', fontSize: '15px', fontWeight: 600 }}>
              ⚠️ No valid Dubai hotspot coordinates found.
            </div>
          ) : (
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} id="dubai-leaflet-map" />
          )}

          {/* Floating GIS Controls */}
          {validHotspots.length > 0 && (
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 1000, display: 'flex', gap: '8px' }}>
              <button 
                onClick={handleResetView}
                className="map-control-wide-btn"
                style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', height: 'auto', textTransform: 'none' }}
              >
                Reset View
              </button>
              <button 
                onClick={handleFitHotspots}
                className="map-control-wide-btn"
                style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', height: 'auto', textTransform: 'none' }}
              >
                Fit Hotspots
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default DubaiLeafletMap;
