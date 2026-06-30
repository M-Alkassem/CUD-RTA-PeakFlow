import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Corridor } from '../lib/types';
import { getCoordinatesForCorridor } from '../lib/mapCoordinates';

interface DubaiLeafletMapProps {
  corridors: Corridor[];
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string) => void;
  theme: 'dark' | 'light';
}

export const DubaiLeafletMap: React.FC<DubaiLeafletMapProps> = ({
  corridors,
  selectedLocationId,
  setSelectedLocationId,
  theme
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const markerGroupRef = useRef<L.LayerGroup | null>(null);

  // 1. Initialize Map Instance (Only Once)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [25.2048, 55.2708],
        zoom: 11,
        zoomControl: false,
        preferCanvas: true,          // Enforce canvas for performance
        zoomAnimation: true,         // Smooth zoom animation
        markerZoomAnimation: true,   // Smooth marker animation
        fadeAnimation: true          // Fade transition overlays
      });

      L.control.zoom({ position: 'topright' }).addTo(mapRef.current);
      
      // Initialize Marker Layer Group and add to map
      markerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    }

    // Clean up map instance on component unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Synchronize Map Tile Layer (Runs when theme changes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    // CARTO Dark Matter or OSM Standard Light tiles
    const tileUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = theme === 'dark'
      ? '&copy; <a href="https://carto.com/">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    tileLayerRef.current = L.tileLayer(tileUrl, { 
      attribution,
      updateWhenIdle: true,  // Optimize performance during panning
      keepBuffer: 2          // Buffer adjacent tile grids
    }).addTo(map);
  }, [theme]);

  // 3. Render and Update Hotspot Markers (Optimized to prevent recreating markers)
  useEffect(() => {
    const map = mapRef.current;
    const markerGroup = markerGroupRef.current;
    if (!map || !markerGroup) return;

    corridors.forEach(cor => {
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
        // Highly Optimized: Just update icon and popup instead of re-instantiating Marker
        existingMarker.setIcon(icon);
        existingMarker.setPopupContent(popupHtml);
      } else {
        // Instantiate and add to marker group
        const marker = L.marker([coords.lat, coords.lng], { icon })
          .addTo(markerGroup)
          .bindPopup(popupHtml, { closeButton: false, offset: [0, -10] });

        marker.on('click', () => {
          setSelectedLocationId(cor.location_id);
        });

        markersRef.current[cor.location_id] = marker;
      }
    });

    // Remove any markers from coordinates that are no longer active in corridors list
    const corridorIds = new Set(corridors.map(c => c.location_id));
    Object.keys(markersRef.current).forEach(locId => {
      if (!corridorIds.has(locId)) {
        const marker = markersRef.current[locId];
        markerGroup.removeLayer(marker);
        delete markersRef.current[locId];
      }
    });
  }, [corridors]);

  // 4. Lightweight Selection Class Syncing (Direct DOM manipulation to prevent lag)
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([locId, marker]) => {
      const isSelected = locId === selectedLocationId;
      const element = marker.getElement();
      
      if (element) {
        if (isSelected) {
          element.classList.add('selected');
          // Smooth pan to active marker coords
          const coords = getCoordinatesForCorridor(locId);
          mapRef.current?.panTo([coords.lat, coords.lng], { animate: true, duration: 0.5 });
          
          // Open popup safely
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

  // Viewport action overlay functions
  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.setView([25.2048, 55.2708], 11, { animate: true });
    }
  };

  const handleFitHotspots = () => {
    const map = mapRef.current;
    if (!map) return;

    const latLngs = corridors.map(cor => {
      const coords = getCoordinatesForCorridor(cor.location_id);
      return L.latLng(coords.lat, coords.lng);
    });

    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '550px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
      {/* Map Target Element */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} id="dubai-leaflet-map" />

      {/* Floating Controls Overlays */}
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

      {/* Sandbox Honesty Banner */}
      <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 1000, background: 'rgba(15, 23, 42, 0.85)', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)' }}>
        Dubai Map — Sandbox Replay Hotspots
      </div>
    </div>
  );
};

export default DubaiLeafletMap;
