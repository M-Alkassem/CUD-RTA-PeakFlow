import { useState, useEffect, useRef } from 'react';
import { Scenario, Corridor } from '../lib/types';

export function useTrafficData(
  selectedLocationId: string | null,
  onCorridorChange?: (id: string | null) => void
) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState('pm-peak-demo');
  const [date, setDate] = useState('2024-10-16');
  const [hour, setHour] = useState(16);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(4); // seconds per simulated hour

  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [kpis, setKpis] = useState({ criticalHotspots: 0, highRiskRoads: 0, avgSpeed: 80, totalVolume: 0 });
  const [calendarContext, setCalendarContext] = useState<any>({});
  
  // Performant In-Memory Cache Ref
  const cacheRef = useRef<Record<string, any>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastScenarioIdRef = useRef(activeScenarioId);

  // 1. Fetch scenarios on mount
  useEffect(() => {
    fetch('/api/scenarios')
      .then(res => res.json())
      .then(data => {
        setScenarios(data);
        const pmPeak = data.find((s: Scenario) => s.id === 'pm-peak-demo');
        if (pmPeak) {
          setDate(pmPeak.date);
          setHour(pmPeak.startHour);
          if (onCorridorChange) onCorridorChange(pmPeak.focusLocation);
        }
      })
      .catch(err => console.error('Failed to load scenarios', err));
  }, []);

  // 2. Scenario Sync Trigger (Runs only when the user changes active scenario)
  useEffect(() => {
    if (activeScenarioId !== lastScenarioIdRef.current) {
      lastScenarioIdRef.current = activeScenarioId;
      const currentScenario = scenarios.find(s => s.id === activeScenarioId);
      if (currentScenario && onCorridorChange) {
        onCorridorChange(currentScenario.focusLocation);
      }
    }
  }, [activeScenarioId, scenarios]);

  // 3. Fetch traffic data with in-memory caching and clean updates
  useEffect(() => {
    const cacheKey = `${date}_${hour}`;
    
    const applyTrafficData = (data: any) => {
      if (data.corridors) {
        setCorridors(data.corridors);
        setKpis(data.kpis);
        setCalendarContext(data.calendarContext);

        // Fallback: If no corridor is selected, select the first highest-risk corridor
        if (!selectedLocationId && onCorridorChange) {
          const currentScenario = scenarios.find(s => s.id === activeScenarioId);
          const focusIds = currentScenario?.focusIds || [];
          
          const sorted = [...data.corridors].sort((a, b) => {
            const aIsFocus = focusIds.includes(a.location_id);
            const bIsFocus = focusIds.includes(b.location_id);
            if (aIsFocus && !bIsFocus) return -1;
            if (!aIsFocus && bIsFocus) return 1;
            return b.congestion_pressure_score - a.congestion_pressure_score;
          });

          if (sorted.length > 0) {
            onCorridorChange(sorted[0].location_id);
          }
        }
      }
    };

    // Use cached response if available (Major Performance Boost)
    if (cacheRef.current[cacheKey]) {
      applyTrafficData(cacheRef.current[cacheKey]);
      return;
    }

    fetch(`/api/traffic?date=${date}&hour=${hour}`)
      .then(res => res.json())
      .then(data => {
        cacheRef.current[cacheKey] = data; // Cache in memory
        applyTrafficData(data);
      })
      .catch(err => console.error('Error fetching traffic data', err));
  }, [date, hour, activeScenarioId, scenarios, selectedLocationId]);

  // 4. Play/Pause interval timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setHour(prevHour => {
          const currentScenario = scenarios.find(s => s.id === activeScenarioId);
          const end = currentScenario ? currentScenario.endHour : 23;
          const start = currentScenario ? currentScenario.startHour : 0;
          if (prevHour >= end) {
            return start;
          }
          return prevHour + 1;
        });
      }, playSpeed * 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playSpeed, activeScenarioId, scenarios]);

  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || null;
  const activeFocusIds = activeScenario?.focusIds || [];

  const handleLaunchScenario = (sc: Scenario) => {
    setIsPlaying(false);
    setActiveScenarioId(sc.id);
    setDate(sc.date);
    setHour(sc.startHour);
    if (onCorridorChange) onCorridorChange(sc.focusLocation);
  };

  // Filter and sort corridors
  let sortedCorridors = [...corridors].sort((a, b) => {
    const aIsFocus = activeFocusIds.includes(a.location_id);
    const bIsFocus = activeFocusIds.includes(b.location_id);
    if (aIsFocus && !bIsFocus) return -1;
    if (!aIsFocus && bIsFocus) return 1;
    return b.congestion_pressure_score - a.congestion_pressure_score;
  });

  if (activeScenarioId === 'creek-crossing-demo') {
    sortedCorridors = sortedCorridors.filter(c => activeFocusIds.includes(c.location_id));
  } else {
    sortedCorridors = sortedCorridors.slice(0, 5);
  }

  return {
    scenarios,
    activeScenarioId,
    setActiveScenarioId,
    date,
    setDate,
    hour,
    setHour,
    isPlaying,
    setIsPlaying,
    playSpeed,
    setPlaySpeed,
    corridors,
    kpis,
    calendarContext,
    activeScenario,
    activeFocusIds,
    sortedCorridors,
    handleLaunchScenario
  };
}
