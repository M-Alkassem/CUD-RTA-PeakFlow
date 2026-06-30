import React, { useEffect, useRef } from 'react';
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const markerGroupRef = useRef<L.LayerGroup | null>(null);

  const validHotspots = getValidDubaiHotspots(corridors);

  // 1. Initialize Map Instance (Lock view to Dubai E11 Interchange 1)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [25.2048, 55.2708],
        zoom: 11,
        zoomControl: false,
        preferCanvas: true,          // Boost performance
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
      }
    };
  }, []);

  // 2. Synchronize stable OpenStreetMap Tiles (Light & Dark uses OSM for absolute reliability)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    tileLayerRef.current = L.tileLayer(tileUrl, { 
      attribution,
      updateWhenIdle: true,
      keepBuffer: 2
    }).addTo(map);
  }, []);

  // 3. Fix Leaflet Tab Rendering & Viewport Size (Runs when tab becomes active)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activeTab === 'map') {
      setTimeout(() => {
        // Redraw container layout sizes
        map.invalidateSize({ animate: false });
        
        // Safety lock: reset viewport center if it goes out of Dubai bounds
        const currentCenter = map.getCenter();
        if (!isValidDubaiCoordinate(currentCenter.lat, currentCenter.lng)) {
          map.setView([25.2048, 55.2708], 11, { animate: false });
        }

        // Fit valid hotspots to screen if available
        if (validHotspots.length >= 2) {
          const latLngs = validHotspots.map(h => {
            const coords = getCoordinatesForCorridor(h.location_id);
            return L.latLng(coords.lat, coords.lng);
          });
          const bounds = L.latLngBounds(latLngs);
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
        } else {
          map.setView([25.2048, 55.2708], 11, { animate: false });
        }
      }, 150);
    }
  }, [activeTab]);

  // 4. Render Simple, Performant Markers (No heavy layout box-shadow pulsing, matches risk score colors)
  useEffect(() => {
    const map = mapRef.current;
    const markerGroup = markerGroupRef.current;
    if (!map || !markerGroup) return;

    validHotspots.forEach(cor => {
      const coords = getCoordinatesForCorridor(cor.location_id);
      const score = cor.congestion_pressure_score;
      
      let riskClass = 'risk-low';
      let riskLevel = 'Low';
      if (score >= 80) { riskClass = 'risk-critical'; riskLevel = 'Critical'; }
      else if (score >= 60) { riskClass = 'risk-high'; riskLevel = 'High'; }
      else if (score >= 40) { riskClass = 'risk-medium'; riskLevel = 'Medium'; }

      const isSelected = cor.location_id === selectedLocationId;
      // Class styling uses color states and selected overlays without heavy animations
      const className = `custom-leaflet-marker ${riskClass} ${isSelected ? 'selected' : ''}`;

      const icon = L.divIcon({
        className,
        html: `<span>${score}</span>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const popupHtml = `
        <div style="font-family: var(--font-body); min-width: 220px; font-size: 13.5px; line-height: 1.5; color: var(--text-primary); padding: 4px;">
          <div style="font-weight: 800; font-family: var(--font-display); font-size: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; margin-bottom: 6px; color: var(--text-title);">
            ${cor.road_name} (${cor.direction})
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Risk Score:</strong> <span style="font-weight: 700; color: ${score >= 80 ? 'var(--color-critical)' : score >= 60 ? 'var(--color-high)' : score >= 40 ? 'var(--color-medium)' : 'var(--color-low)'}">${score} (${riskLevel})</span>
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Avg Speed:</strong> ${cor.avg_speed_kph} kph
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Cause:</strong> ${cor.incident_affected ? 'Lane blocking accident' : 'Commuter peak overload'}
          </div>
          <div style="margin-top: 8px; font-style: italic; font-size: 12.5px; color: var(--rta-blue); font-weight: 600;">
            Click to diagnose metrics in Forecast tab
          </div>
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

    // Remove any markers from coordinates that are no longer active
    const activeIds = new Set(validHotspots.map(c => c.location_id));
    Object.keys(markersRef.current).forEach(locId => {
      if (!activeIds.has(locId)) {
        const marker = markersRef.current[locId];
        markerGroup.removeLayer(marker);
        delete markersRef.current[locId];
      }
    });
  }, [corridors, selectedLocationId]);

  // 5. Marker Selection Pan and Popup Handling
  useEffect(() => {
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
  }, [selectedLocationId]);

  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.setView([25.2048, 55.2708], 11, { animate: true });
    }
  };

  const handleFitHotspots = () => {
    const map = mapRef.current;
    if (!map) return;

    if (validHotspots.length >= 2) {
      const latLngs = validHotspots.map(h => {
        const coords = getCoordinatesForCorridor(h.location_id);
        return L.latLng(coords.lat, coords.lng);
      });
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
    } else {
      map.setView([25.2048, 55.2708], 11, { animate: true });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '550px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
      
      {/* Empty State Banner Handling */}
      {validHotspots.length === 0 ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--color-critical)', fontSize: '15px', fontWeight: 600 }}>
          ⚠️ No valid Dubai hotspot coordinates found. Check mapCoordinates.ts.
        </div>
      ) : (
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} id="dubai-leaflet-map" />
      )}

      {/* Floating View Controls */}
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

      {/* Sandbox Honesty Banner */}
      <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 1000, background: 'rgba(15, 23, 42, 0.85)', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)' }}>
        Dubai Map — Sandbox Replay Hotspots
      </div>
    </div>
  );
};

export default DubaiLeafletMap;
