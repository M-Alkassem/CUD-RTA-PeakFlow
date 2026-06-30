import { useState } from 'react';
import { Scenario } from '../lib/types';
import { projectCoords, locationMapPoints } from '../lib/mapUtils';

export function useMapPanZoom(params: {
  selectedLocationId: string | null;
  activeScenario: Scenario | null;
}) {
  const { selectedLocationId, activeScenario } = params;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [hoveredNode, setHoveredNode] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
  };

  const handleZoomIn = () => {
    setZoom(z => Math.min(5, z + 0.25));
  };

  const handleZoomOut = () => {
    setZoom(z => Math.max(0.5, z - 0.25));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFitHotspots = () => {
    const targetId = selectedLocationId || (activeScenario ? activeScenario.focusLocation : 'SZR_S1');
    const pt = locationMapPoints.find(p => p.id === targetId);
    if (!pt) return;
    const coords = projectCoords(pt.lat, pt.lng);
    const z = 1.8;
    setZoom(z);
    setPan({
      x: 400 - coords.x * z,
      y: 240 - coords.y * z
    });
  };

  return {
    zoom,
    setZoom,
    pan,
    setPan,
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
    setTooltipPos
  };
}
