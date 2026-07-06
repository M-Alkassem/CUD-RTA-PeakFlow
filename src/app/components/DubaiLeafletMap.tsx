import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Corridor, ActiveTab } from '../lib/types';
import { 
  isValidDubaiCoordinate, 
  getCoordinatesForCorridor, 
  getValidDubaiHotspots 
} from '../lib/mapCoordinates';
import { Navigation, Compass, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { calcDemandPressure } from '../lib/demandShiftEngine';

interface DubaiLeafletMapProps {
  corridors: Corridor[];
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string) => void;
  theme: 'dark' | 'light';
  activeTab: ActiveTab;
  workflowResponse?: any;
  isLiveDemo?: boolean;
}

export const DubaiLeafletMap: React.FC<DubaiLeafletMapProps> = ({
  corridors,
  selectedLocationId,
  setSelectedLocationId,
  theme,
  activeTab,
  workflowResponse,
  isLiveDemo = false
}) => {
  const [viewMode, setViewMode] = useState<'tactical' | 'gis'>('gis');
  const [mapStyle, setMapStyle] = useState<'carto-dark' | 'inverted-osm' | 'osm-light'>('osm-light');

  // Leaflet Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const badgeMarkersRef = useRef<L.Marker[]>([]);

  const validHotspots = getValidDubaiHotspots(corridors);
  const selectedCorridor = corridors.find(c => c.location_id === selectedLocationId) || null;

  // 1. GIS Leaflet Map Mount/Destroy Cycle
  useEffect(() => {
    if (viewMode !== 'gis' || !mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [25.22, 55.32],
        zoom: 12,
        zoomControl: false,
        preferCanvas: false,
        zoomAnimation: true,
        markerZoomAnimation: true,
        fadeAnimation: true
      });

      L.control.zoom({ position: 'topright' }).addTo(mapRef.current);
      markerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
        tileLayerRef.current = null;
      }
    };
  }, [viewMode]);

  // 1b. Dynamic Basemap Tile Layer Manager
  useEffect(() => {
    const map = mapRef.current;
    if (!map || viewMode !== 'gis') return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    let url = '';
    let options: L.TileLayerOptions = {};

    if (mapStyle === 'carto-dark') {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
      options = {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        updateWhenIdle: true,
        keepBuffer: 2
      };
    } else if (mapStyle === 'inverted-osm') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      options = {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        className: 'custom-dark-tiles',
        updateWhenIdle: true,
        keepBuffer: 2
      };
    } else {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      options = {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        updateWhenIdle: true,
        keepBuffer: 2
      };
    }

    try {
      tileLayerRef.current = L.tileLayer(url, options).addTo(map);
    } catch (e) {
      console.error("Failed to add tile layer:", e);
    }
  }, [mapStyle, viewMode]);

  // 2. Leaflet Tab Resizing Sync
  useEffect(() => {
    let active = true;
    const map = mapRef.current;
    if (!map || viewMode !== 'gis') return;

    if (activeTab === 'map') {
      setTimeout(() => {
        if (!active || mapRef.current !== map || !mapContainerRef.current) return;
        
        try {
          map.invalidateSize({ animate: false });
          
          const currentCenter = map.getCenter();
          if (currentCenter && !isValidDubaiCoordinate(currentCenter.lat, currentCenter.lng)) {
            map.setView([25.22, 55.32], 12, { animate: false });
          }
        } catch (e) {
          console.error("Error setting map center:", e);
        }

        if (validHotspots.length >= 2) {
          // Exclude outlying enclaves (Emirates Road and Dubai South Expo Road) to keep the map focused on central corridors
          const centralHotspots = validHotspots.filter(h => h.location_id !== 'EMR_E1' && h.location_id !== 'DWC_X1');
          const latLngs = (centralHotspots.length >= 2 ? centralHotspots : validHotspots).map(h => {
            const coords = getCoordinatesForCorridor(h.location_id);
            return L.latLng(coords.lat, coords.lng);
          });
          const bounds = L.latLngBounds(latLngs);
          try {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
          } catch (e) {
            console.error("Error fitting map bounds:", e);
          }
        }
      }, 150);
    }
    return () => {
      active = false;
    };
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

      // Small elegant dot style instead of blocky numbers
      const color = score >= 80 ? 'var(--color-critical)' : score >= 60 ? 'var(--color-high)' : score >= 40 ? 'var(--color-medium)' : 'var(--color-low)';
      const size = isSelected ? 16 : 10;
      const borderSize = isSelected ? 3 : 2;
      const shadow = isSelected ? '0 0 10px rgba(14,165,233,0.8)' : '0 2px 4px rgba(0,0,0,0.3)';

      const html = `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; border: ${borderSize}px solid white; box-shadow: ${shadow}; background-color: ${color}; transition: all 0.2s ease;"></div>`;

      const icon = L.divIcon({
        className: `custom-glowing-dot ${isSelected ? 'selected' : ''}`,
        html: html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      let popupHtml = '';
      if (isLiveDemo) {
        // Real per-corridor demand math (same formulas as demandShiftEngine)
        const demand = cor.demand_vph !== undefined ? cor.demand_vph : (cor.volume_vph || 0);
        const capacity = cor.capacity_vph || 12000;
        const safeTarget = Math.round(capacity * 0.80);
        const excess = Math.max(0, demand - safeTarget);
        const shiftPct = demand > 0 ? Math.ceil((excess / demand) * 100) : 0;

        let pressureLabel = '';
        let pressureColor = '';
        if (excess <= 0) {
          pressureLabel = "Within target";
          pressureColor = "#22c55e"; // green
        } else if (shiftPct > 0 && shiftPct < 15) {
          pressureLabel = "Elevated";
          pressureColor = "#f97316"; // orange
        } else {
          pressureLabel = "High";
          pressureColor = "#ef4444"; // red
        }

        let computedLos = 'A';
        const vc = cor.vc_ratio || 0;
        if (vc <= 0.35) computedLos = 'A';
        else if (vc <= 0.55) computedLos = 'B';
        else if (vc <= 0.75) computedLos = 'C';
        else if (vc <= 0.90) computedLos = 'D';
        else if (vc <= 1.00) computedLos = 'E';
        else computedLos = 'F';

        const excessRows = excess > 0 ? `
              <div style="margin-bottom: 4px;"><strong>Excess demand above operating target:</strong> <span style="color: var(--color-critical); font-weight: 700;">+${excess.toLocaleString()} trips/hr</span></div>
              <div style="margin-bottom: 4px;"><strong>Required shift:</strong> <span style="color: var(--color-high); font-weight: 700;">${shiftPct}%</span></div>` : `
              <div style="margin-bottom: 4px;"><strong>Excess demand above operating target:</strong> <span style="color: var(--color-low); font-weight: 700;">0 trips/hr (within target)</span></div>`;

        popupHtml = `
          <div style="font-family: var(--font-body); min-width: 220px; font-size: 13.5px; color: var(--text-primary); padding: 4px;">
            <div style="font-weight: 800; font-family: var(--font-display); font-size: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; margin-bottom: 6px; color: var(--text-title);">
              ${cor.road_name} (${cor.direction})
            </div>
            <div style="margin-bottom: 4px;"><strong>Demand pressure:</strong> <span style="color: ${pressureColor}; font-weight: 700;">${pressureLabel}</span></div>${excessRows}
            <div style="margin-bottom: 3px;"><strong>V/C ratio:</strong> <span>${cor.vc_ratio.toFixed(2)}</span></div>
            <div style="margin-bottom: 3px;"><strong>LOS:</strong> <span>${computedLos}</span></div>
          </div>
        `;
      } else {
        popupHtml = `
          <div style="font-family: var(--font-body); min-width: 220px; font-size: 13.5px; color: var(--text-primary); padding: 4px;">
            <div style="font-weight: 800; font-family: var(--font-display); font-size: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; margin-bottom: 6px; color: var(--text-title);">
              ${cor.road_name} (${cor.direction})
            </div>
            <div><strong>Demand Pressure:</strong> ${score} (${riskLevel})</div>
            <div><strong>Avg Speed:</strong> ${cor.avg_speed_kph} kph</div>
            <div><strong>Cause:</strong> ${cor.incident_affected ? 'Incident blockages' : 'Commuter flow'}</div>
          </div>
        `;
      }

      const existingMarker = markersRef.current[cor.location_id];
      if (existingMarker) {
        existingMarker.setIcon(icon);
        if (popupHtml) {
          existingMarker.setPopupContent(popupHtml);
        }
        if (isSelected && popupHtml) {
          existingMarker.openPopup();
        }
      } else {
        const marker = L.marker([coords.lat, coords.lng], { icon })
          .addTo(markerGroup);
        
        if (popupHtml) {
          marker.bindPopup(popupHtml, { closeButton: false, offset: [0, -10] });
        }

        marker.on('click', () => {
          setSelectedLocationId(cor.location_id);
          marker.openPopup();
        });

        markersRef.current[cor.location_id] = marker;
        if (isSelected && popupHtml) {
          marker.openPopup();
        }
      }
    });
  }, [corridors, selectedLocationId, viewMode]);

  // 4. GIS Selection Pan
  useEffect(() => {
    let active = true;
    if (viewMode !== 'gis') return;

    // Proactively open the popup of the selected corridor marker
    if (selectedLocationId) {
      const selectedMarker = markersRef.current[selectedLocationId];
      if (selectedMarker) {
        selectedMarker.openPopup();
      }
    }

    Object.entries(markersRef.current).forEach(([locId, marker]) => {
      const isSelected = locId === selectedLocationId;
      const element = marker.getElement();
      if (element) {
        if (isSelected) {
          element.classList.add('selected');
          const coords = getCoordinatesForCorridor(locId);
          mapRef.current?.panTo([coords.lat, coords.lng], { animate: true, duration: 0.5 });
        } else {
          element.classList.remove('selected');
        }
      }
    });
    return () => {
      active = false;
    };
  }, [selectedLocationId, viewMode]);

  // Dynamic routing parameters matching Waze options
  let showRouting = false;
  let roadNameText = "";
  let altRoadNameText = "";
  let congestedTimeText = "";
  let alternateTimeText = "";

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
    const paths: { [key: string]: L.LatLngTuple[] } = {
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

    // Draw main roads (if no specific route is shown, or as background lines)
    Object.entries(paths).forEach(([roadKey, coords]) => {
      const score = scores[roadKey as keyof typeof scores] || 20;
      const color = getColorForScore(score);
      
      const polyline = L.polyline(coords as L.LatLngExpression[], {
        color: color,
        weight: 5,
        opacity: 0.6,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      polyline.bindTooltip(`${roadKey} Corridor: Congestion Score ${score}/100`, { sticky: true });
      polylinesRef.current.push(polyline);
    });

    // Draw Suggested Alternative Route Overlay if bottleneck selected
    if (selectedLocationId && Math.random() < -1) {
      let mainRoutePath: L.LatLngTuple[] = [];
      let altPath: L.LatLngTuple[] = [];
      let congestedBadgeCoords: [number, number] = [0, 0];
      let alternateBadgeCoords: [number, number] = [0, 0];
      let congestedBadgeText = "";
      let alternateBadgeText = "";
      let startPoint: [number, number] = [0, 0];
      let endPoint: [number, number] = [0, 0];

      if (selectedLocationId.startsWith('SZR')) {
        mainRoutePath = paths.SZR;
        altPath = [
          [25.1180, 55.2000], // Start at MOE SZR
          [25.1220, 55.2080], // Link
          [25.1250, 55.2200], // Al Quoz
          [25.1490, 55.2350], // E44 Al Khail Road
          [25.1630, 55.2530],
          [25.1860, 55.2700],
          [25.1960, 55.2880],
          [25.2080, 55.3020], // link back
          [25.2230, 55.2820]  // Defence
        ];
        congestedBadgeCoords = [25.1610, 55.2390]; // Safa
        congestedBadgeText = "SZR (E11): 45m (Slow)";
        alternateBadgeCoords = [25.1630, 55.2530]; // EKR
        alternateBadgeText = "Al Khail (E44): 24m (Fastest)";
        startPoint = [25.1180, 55.2000];
        endPoint = [25.2230, 55.2820];
      } 
      else if (selectedLocationId.startsWith('EKR')) {
        mainRoutePath = paths.EKR;
        altPath = [
          [25.1490, 55.2350], // EKR
          [25.1400, 55.2320],
          [25.1250, 55.2200], // link
          [25.1180, 55.2000], // SZR
          [25.1430, 55.2220],
          [25.1610, 55.2390],
          [25.1760, 55.2510],
          [25.2010, 55.2700],
          [25.2190, 55.3130]
        ];
        congestedBadgeCoords = [25.1630, 55.2530];
        congestedBadgeText = "Al Khail (E44): 38m (Moderate)";
        alternateBadgeCoords = [25.1610, 55.2390];
        alternateBadgeText = "SZR (E11): 26m (Best Route)";
        startPoint = [25.1490, 55.2350];
        endPoint = [25.2190, 55.3130];
      }
      else if (selectedLocationId.startsWith('GAR')) {
        mainRoutePath = paths.GAR;
        altPath = [
          [25.2200, 55.3230], // Oud Metha
          [25.2050, 55.2950], // Link to BBC
          [25.1920, 55.2900], // BBC bridge
          [25.2450, 55.3380]
        ];
        congestedBadgeCoords = [25.2330, 55.3300];
        congestedBadgeText = "Garhoud Bridge: 28m (Slow)";
        alternateBadgeCoords = [25.1920, 55.2900];
        alternateBadgeText = "BB Crossing: 16m (Fastest)";
        startPoint = [25.2200, 55.3230];
        endPoint = [25.2450, 55.3380];
      }
      else if (selectedLocationId.startsWith('BBC') || selectedLocationId.startsWith('MAK')) {
        mainRoutePath = selectedLocationId.startsWith('BBC') ? paths.BBC : paths.MAK;
        altPath = paths.GAR;
        congestedBadgeCoords = selectedLocationId.startsWith('BBC') ? [25.1920, 55.2900] : [25.2400, 55.3170];
        congestedBadgeText = selectedLocationId.startsWith('BBC') ? "BB Crossing: 22m" : "Maktoum Br: 20m";
        alternateBadgeCoords = [25.2330, 55.3300];
        alternateBadgeText = "Garhoud Br: 14m (Best route)";
        startPoint = selectedLocationId.startsWith('BBC') ? [25.1780, 55.3150] : [25.2330, 55.3130];
        endPoint = [25.2450, 55.3380];
      }

      if (mainRoutePath.length > 0) {
        // Draw active selected main path in high-visibility purple/red (congested style)
        const mainPolyline = L.polyline(mainRoutePath, {
          color: '#8b5cf6', // Indigo/purple
          weight: 8,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
        polylinesRef.current.push(mainPolyline);
      }

      if (altPath.length > 0) {
        // Draw alternate path in glowing neon green/cyan
        const altPolyline = L.polyline(altPath, {
          color: '#10b981', // Waze green
          weight: 7,
          opacity: 0.9,
          dashArray: '8, 12',
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
        polylinesRef.current.push(altPolyline);

        // Add Waze-style floating HTML duration speech bubbles
        if (congestedBadgeCoords[0] > 0) {
          const cMarker = L.marker(congestedBadgeCoords, {
            icon: L.divIcon({
              className: 'waze-congested-badge',
              html: `<div style="background: #ef4444; color: white; padding: 6px 12px; border-radius: 20px; font-weight: 800; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); white-space: nowrap; font-family: var(--font-display);">${congestedBadgeText}</div>`,
              iconSize: [160, 30],
              iconAnchor: [80, 15]
            })
          }).addTo(map);
          badgeMarkersRef.current.push(cMarker);
        }

        if (alternateBadgeCoords[0] > 0) {
          const aMarker = L.marker(alternateBadgeCoords, {
            icon: L.divIcon({
              className: 'waze-alternate-badge',
              html: `<div style="background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-weight: 800; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); white-space: nowrap; font-family: var(--font-display);">${alternateBadgeText}</div>`,
              iconSize: [170, 30],
              iconAnchor: [85, 15]
            })
          }).addTo(map);
          badgeMarkersRef.current.push(aMarker);
        }

        // Add start pin (pulsing GPS blue dot)
        if (startPoint[0] > 0) {
          const startMarker = L.marker(startPoint, {
            icon: L.divIcon({
              className: 'gps-pulse-marker',
              html: `
                <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
                  <div style="position: absolute; width: 20px; height: 20px; background: rgba(14, 165, 233, 0.4); border-radius: 50%; animation: pulse-gps 1.5s infinite;"></div>
                  <div style="width: 10px; height: 10px; background: #0ea5e9; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 6px #0ea5e9; z-index: 2;"></div>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })
          }).addTo(map);
          badgeMarkersRef.current.push(startMarker);
        }

        // Add end pin (checkered flag)
        if (endPoint[0] > 0) {
          const endMarker = L.marker(endPoint, {
            icon: L.divIcon({
              className: 'checkered-flag-marker',
              html: `
                <div style="background: white; border: 1.5px solid #000; border-radius: 4px; padding: 3px 6px; font-size: 13px; font-weight: 800; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap; font-family: var(--font-display);">
                  🏁 Finish
                </div>
              `,
              iconSize: [60, 24],
              iconAnchor: [30, 24]
            })
          }).addTo(map);
          badgeMarkersRef.current.push(endMarker);
        }
      }
    }
  }, [corridors, selectedLocationId, viewMode]);

  // Set routing parameters for the overlay card
  if (selectedLocationId) {
    showRouting = true;
    if (selectedLocationId.startsWith('SZR')) {
      roadNameText = "SZR (E11) — Southbound";
      altRoadNameText = "Al Khail Road (E44)";
      congestedTimeText = "45 min";
      alternateTimeText = "24 min";
    } else if (selectedLocationId.startsWith('EKR')) {
      roadNameText = "Al Khail Road (E44)";
      altRoadNameText = "SZR (E11)";
      congestedTimeText = "38 min";
      alternateTimeText = "26 min";
    } else if (selectedLocationId.startsWith('GAR')) {
      roadNameText = "Al Garhoud Bridge";
      altRoadNameText = "Business Bay Crossing";
      congestedTimeText = "28 min";
      alternateTimeText = "16 min";
    } else if (selectedLocationId.startsWith('BBC') || selectedLocationId.startsWith('MAK')) {
      roadNameText = selectedLocationId.startsWith('BBC') ? "Business Bay Crossing" : "Al Maktoum Bridge";
      altRoadNameText = "Al Garhoud Bridge";
      congestedTimeText = "22 min";
      alternateTimeText = "14 min";
    }
  }

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
      mapRef.current.setView([25.22, 55.32], 12, { animate: true });
    }
  };

  const handleFitHotspots = () => {
    if (viewMode === 'gis' && mapRef.current && validHotspots.length >= 2) {
      const centralHotspots = validHotspots.filter(h => h.location_id !== 'EMR_E1' && h.location_id !== 'DWC_X1');
      const latLngs = (centralHotspots.length >= 2 ? centralHotspots : validHotspots).map(h => {
        const coords = getCoordinatesForCorridor(h.location_id);
        return L.latLng(coords.lat, coords.lng);
      });
      const bounds = L.latLngBounds(latLngs);
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '400px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', background: viewMode === 'tactical' ? '#07111F' : 'var(--bg-main)' }}>
      


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
            <path id="szr_path" d="M 100,450 C 300,380 500,200 700,80" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" strokeLinecap="round" />
            <path d="M 100,450 C 300,380 500,200 700,80" fill="none" stroke="rgba(14, 165, 233, 0.7)" strokeWidth="2" strokeLinecap="round" />
            <path d="M 100,450 C 300,380 500,200 700,80" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" className="pulse-flow-line" style={{ strokeDasharray: '10, 20', animation: 'dash 3s linear infinite' }} />

            <path d="M 150,500 C 320,430 480,270 650,150" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" strokeLinecap="round" />
            <path d="M 150,500 C 320,430 480,270 650,150" fill="none" stroke="rgba(14, 165, 233, 0.5)" strokeWidth="2" strokeLinecap="round" />
            <path d="M 150,500 C 320,430 480,270 650,150" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" className="pulse-flow-line" style={{ strokeDasharray: '8, 25', animation: 'dash 4s linear infinite' }} />

            <path d="M 600,100 C 650,80 720,50 780,40" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" strokeLinecap="round" />
            <path d="M 600,100 C 650,80 720,50 780,40" fill="none" stroke="rgba(14, 165, 233, 0.6)" strokeWidth="2" strokeLinecap="round" />

            <line x1="430" y1="230" x2="530" y2="210" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="6" />
            <line x1="410" y1="130" x2="510" y2="110" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="6" />
            <line x1="470" y1="330" x2="570" y2="310" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="6" />

            {/* Render Glowing Hotspots Node Markers */}
            {tacticalNodes.map(node => {
              const cor = corridors.find(c => c.location_id === node.id);
              if (!cor) return null;

              const score = cor.congestion_pressure_score;
              const isSelected = selectedLocationId === node.id;

              let color = 'var(--color-low)';
              let riskLabel = 'Within target';

              if (isLiveDemo) {
                const corPressure = calcDemandPressure(cor);
                const corExcess = corPressure.excess;
                const corShiftPct = corPressure.excessPct;
                if (corExcess <= 0) {
                  color = 'var(--color-low)'; // green
                  riskLabel = 'Within target';
                } else if (corShiftPct > 0 && corShiftPct < 15) {
                  color = 'var(--color-medium)'; // orange
                  riskLabel = 'Elevated';
                } else {
                  color = 'var(--color-critical)'; // red
                  riskLabel = 'High';
                }
              } else {
                if (score >= 80) { color = 'var(--color-critical)'; riskLabel = 'Critical'; }
                else if (score >= 60) { color = 'var(--color-high)'; riskLabel = 'High'; }
                else if (score >= 40) { color = 'var(--color-medium)'; riskLabel = 'Medium'; }
              }

              return (
                <g 
                  key={node.id} 
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedLocationId(node.id)}
                >
                  {isSelected && (
                    <circle cx={node.x} cy={node.y} r="22" fill="none" stroke="var(--rta-blue)" strokeWidth="2" style={{ opacity: 0.8 }} />
                  )}
                  <circle cx={node.x} cy={node.y} r="14" fill="none" stroke={color} strokeWidth="2" style={{ opacity: 0.4 }} />
                  <circle cx={node.x} cy={node.y} r="10" fill={color} />
                  <text x={node.x} y={node.y + 4} textAnchor="middle" fill="white" style={{ fontSize: '10px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    {score}
                  </text>
                  {isSelected && (
                    <g>
                      <rect x={node.x - 70} y={node.y - 45} width="140" height="24" rx="4" fill="var(--bg-panel)" stroke="var(--border-color)" strokeWidth="1" />
                      <text x={node.x} y={node.y - 29} textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: '11px', fontWeight: 700 }}>
                        {cor.road_name} ({riskLabel})
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

            const corPressure = calcDemandPressure(cor);
            const corExcess = corPressure.excess;
            const corShiftPct = corPressure.excessPct;

            let corPressureLabel = '';
            let corColor = '';
            if (corExcess <= 0) {
              corPressureLabel = "Within target";
              corColor = "var(--color-low)"; // green
            } else if (corShiftPct > 0 && corShiftPct < 15) {
              corPressureLabel = "Elevated";
              corColor = "var(--color-medium)"; // orange
            } else {
              corPressureLabel = "High";
              corColor = "var(--color-critical)"; // red
            }

            return (
              <div style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(11, 18, 32, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', color: 'white', width: '280px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', color: 'var(--text-title)' }}>
                  {cor.road_name} ({cor.direction})
                </div>
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Demand Pressure:</strong> <span style={{ color: corColor, fontWeight: 700 }}>{corPressureLabel}</span></div>
                  <div><strong>Avg Speed:</strong> {cor.avg_speed_kph} kph</div>
                  <div><strong>Flow Volume:</strong> {cor.volume_vph} vph</div>
                  <div><strong>Main Cause:</strong> {cor.incident_affected ? 'Collision Blockage' : 'Commuter Peak Flow'}</div>
                </div>
              </div>
            );
          })()}

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
        </div>
      )}

      {/* Floating GPS pulse styling keyframes */}
      <style>{`
        @keyframes pulse-gps {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default DubaiLeafletMap;
