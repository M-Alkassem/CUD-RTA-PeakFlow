'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  CheckCircle,
  Sliders,
  Shield,
  Clock,
  Compass,
  Radio,
  Train,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
  Cpu,
  History,
  Info,
  HelpCircle,
  AlertTriangle,
  Activity,
  Zap,
  Sun,
  Moon
} from 'lucide-react';

interface Incident {
  incident_id: string;
  incident_type: string;
  severity: string;
  lanes_blocked: number;
  duration_min: number;
  weather_condition: string;
}

interface Corridor {
  location_id: string;
  location_name: string;
  road_code: string;
  road_name: string;
  area: string;
  direction: string;
  num_lanes: number;
  free_flow_speed_kph: number;
  speed_limit_kph: number;
  capacity_vph: number;
  latitude: number;
  longitude: number;
  volume_vph: number;
  demand_vph: number;
  avg_speed_kph: number;
  vc_ratio: number;
  occupancy_pct: number;
  travel_time_index: number;
  level_of_service: string;
  incident_affected: boolean;
  active_incidents: Incident[];
  junction_id: string;
  junction_performance: any;
  congestion_pressure_score: number;
  risk_level: string;
  speedHistory: number[];
  volumeHistory: number[];
  forecast?: {
    model_name: string;
    predicted_risk_score: number;
    predicted_risk_level: string;
    forecast_confidence: number;
    topContributingFeatures: string[];
  };
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  date: string;
  startHour: number;
  endHour: number;
  focusLocation: string;
  focusJunction: string;
  focusRoad: string;
  focusDirection: string;
  story: string;
  focusIds: string[];
}

const locationMapPoints = [
  { id: 'SZR_N1', lat: 25.223, lng: 55.282, name: 'SZR @ Defence (NB)' },
  { id: 'SZR_S1', lat: 25.2228, lng: 55.2832, name: 'SZR @ Defence (SB)' },
  { id: 'SZR_N2', lat: 25.211, lng: 55.279, name: 'SZR @ DIFC (NB)' },
  { id: 'SZR_S2', lat: 25.2108, lng: 55.2802, name: 'SZR @ DIFC (SB)' },
  { id: 'SZR_N4', lat: 25.118, lng: 55.2, name: 'SZR @ Mall of Emirates (NB)' },
  { id: 'SZR_S4', lat: 25.1178, lng: 55.2012, name: 'SZR @ Mall of Emirates (SB)' },
  { id: 'EKR_N1', lat: 25.186, lng: 55.27, name: 'Al Khail Rd @ Business Bay (NB)' },
  { id: 'EKR_S1', lat: 25.149, lng: 55.235, name: 'Al Khail Rd @ Al Quoz (SB)' },
  { id: 'MBZ_E1', lat: 24.99, lng: 55.17, name: 'MBZ Rd @ DIP (EB)' },
  { id: 'EMR_E1', lat: 25.17, lng: 55.44, name: 'Emirates Rd @ Al Awir (EB)' },
  { id: 'ITT_W1', lat: 25.295, lng: 55.355, name: 'Al Ittihad Rd @ Al Mamzar (WB)' },
  { id: 'ITT_E1', lat: 25.268, lng: 55.338, name: 'Al Ittihad Rd @ Al Qiyadah (EB)' },
  { id: 'AIR_W1', lat: 25.248, lng: 55.352, name: 'Airport Rd @ Al Garhoud (WB)' },
  { id: 'GAR_N1', lat: 25.233, lng: 55.33, name: 'Al Garhoud Bridge (NB)' },
  { id: 'MAK_N1', lat: 25.24, lng: 55.317, name: 'Al Maktoum Bridge (NB)' },
  { id: 'BBC_S1', lat: 25.192, lng: 55.29, name: 'Business Bay Crossing (SB)' },
  { id: 'JBR_X1', lat: 25.208, lng: 55.248, name: 'Jumeirah Beach Rd' },
  { id: 'DWC_X1', lat: 24.896, lng: 55.161, name: 'Expo Rd @ Dubai South' }
];

const projectCoords = (lat: number, lng: number) => {
  const mapWidth = 800;
  const mapHeight = 480;
  const minLat = 24.85;
  const maxLat = 25.32;
  const minLng = 55.12;
  const maxLng = 55.46;

  const x = ((lng - minLng) / (maxLng - minLng)) * mapWidth;
  const y = mapHeight - ((lat - minLat) / (maxLat - minLat)) * mapHeight;
  return { x, y };
};

const getOffset = (id: string) => {
  if (id.includes('_N')) return { dx: -3, dy: -3 };
  if (id.includes('_S')) return { dx: 3, dy: 3 };
  if (id.includes('_E')) return { dx: 3, dy: -2 };
  if (id.includes('_W')) return { dx: -3, dy: 2 };
  return { dx: 0, dy: 0 };
};

export default function Page() {
  // Theme and Real-time Clock State
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [realTime, setRealTime] = useState('');

  // Sync theme class to root html element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setRealTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tab Navigation state
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'forecast' | 'whatif' | 'briefing'>('overview');

  // SVG Map zoom & pan states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Custom HTML map tooltip states
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Scenario and Clock State
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState('pm-peak-demo');
  const [date, setDate] = useState('2024-10-16');
  const [hour, setHour] = useState(16);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(4); // seconds per simulated hour

  // Telemetry & Details State (Starts pre-selected on PM Peak focus SZR_S1 for clean initial load)
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [kpis, setKpis] = useState({ criticalHotspots: 0, highRiskRoads: 0, avgSpeed: 80, totalVolume: 0 });
  const [calendarContext, setCalendarContext] = useState<any>({});
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>('SZR_S1');
  const [showTooltip, setShowTooltip] = useState(false);

  // What-If Simulator & Mitigation State
  const [mitigations, setMitigations] = useState<Record<string, string>>({}); // locationId -> active mitigation key
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({});

  // AI Briefing State
  const [briefing, setBriefing] = useState<any>(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

  // Decision Log State
  const [decisionLog, setDecisionLog] = useState<any[]>([]);
  const [approvedImpact, setApprovedImpact] = useState<any>(null);

  // Ref for timer loop
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // SVG Map zoom/pan mouse and button action handlers
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

  // 1. Fetch fixed scenarios on mount
  useEffect(() => {
    fetch('/api/scenarios')
      .then(res => res.json())
      .then(data => {
        setScenarios(data);
        const pmPeak = data.find((s: Scenario) => s.id === 'pm-peak-demo');
        if (pmPeak) {
          setDate(pmPeak.date);
          setHour(pmPeak.startHour);
          setSelectedLocationId(pmPeak.focusLocation); // Auto-select default road SZR_S1
        }
      })
      .catch(err => console.error('Failed to load scenarios', err));
  }, []);

  // 2. Fetch traffic data when clock tick occurs
  useEffect(() => {
    fetch(`/api/traffic?date=${date}&hour=${hour}`)
      .then(res => res.json())
      .then(data => {
        if (data.corridors) {
          setCorridors(data.corridors);
          setKpis(data.kpis);
          setCalendarContext(data.calendarContext);
        }
      })
      .catch(err => console.error('Error fetching traffic data', err));

    setBriefing(null);
  }, [date, hour]);

  // 3. Play / Pause clock timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setHour(prevHour => {
          const currentScenario = scenarios.find(s => s.id === activeScenarioId);
          const end = currentScenario ? currentScenario.endHour : 23;
          const start = currentScenario ? currentScenario.startHour : 0;
          if (prevHour >= end) {
            return start; // Loop back
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

  // Reset approved impact details card on corridor select change
  useEffect(() => {
    setApprovedImpact(null);
  }, [selectedLocationId]);

  // 4. Handle scenario triggers
  const handleLaunchScenario = (sc: Scenario) => {
    setIsPlaying(false);
    setActiveScenarioId(sc.id);
    setDate(sc.date);
    setHour(sc.startHour);
    setSelectedLocationId(sc.focusLocation); // Auto-select scenario focus road on load
    setMitigations({});
    setAppliedActions({});
    setBriefing(null);
    setApprovedImpact(null);
  };

  const activeScenario = scenarios.find(s => s.id === activeScenarioId);
  const activeFocusIds = activeScenario?.focusIds || [];

  const selectedCorridor = corridors.find(c => c.location_id === selectedLocationId) || null;
  const junctionPerformance = selectedCorridor?.junction_performance;

  /**
   * Unified logic to get recommended action and description for any corridor.
   * Ensures absolute logical consistency between ranking table, details drawer, What-If simulator, and AI panel.
   */
  const getRecommendedActionForCorridor = (cor: Corridor) => {
    if (!cor) return { action: 'Monitor conditions', reason: 'Normal flow detected.' };

    const isStorm = date === '2024-04-16';
    const isCreekBridge = ['GAR_N1', 'MAK_N1', 'BBC_S1'].includes(cor.location_id);
    const hasIncident = cor.incident_affected;
    const hasSignalSaturation = cor.junction_performance?.degree_of_saturation > 0.9;
    const isFixedSignal = cor.junction_performance?.control_type === 'Fixed-time';

    // 1. Weather Stress (historic storm)
    if (isStorm) {
      return {
        action: 'Official roadside advisory + incident response',
        reason: 'Severe rain and flooding event. Deploy active emergency responders to flooded exits and advise public transport shift.'
      };
    }

    // 2. Creek Crossing routing demo logic (GAR_N1, MAK_N1, BBC_S1)
    if (activeScenarioId === 'creek-crossing-demo' && cor.location_id === 'GAR_N1') {
      const mak = corridors.find(c => c.location_id === 'MAK_N1');
      const bbc = corridors.find(c => c.location_id === 'BBC_S1');
      const makRisk = mak ? mak.congestion_pressure_score : 100;
      const bbcRisk = bbc ? bbc.congestion_pressure_score : 100;
      
      // If Garhoud risk is higher than alternatives, recommend routing to the lower-risk crossings
      if (cor.congestion_pressure_score > makRisk || cor.congestion_pressure_score > bbcRisk) {
        const targetCrossing = bbcRisk <= makRisk ? 'Business Bay Crossing' : 'Al Maktoum Bridge';
        return {
          action: `Route advisory to ${targetCrossing}`,
          reason: `Al Garhoud Bridge is congested (${cor.congestion_pressure_score}/100). Divert outbound flow to the lower-risk crossing: ${targetCrossing}.`
        };
      }
    }

    // 3. Incident Blockages (with or without signal saturation)
    if (hasIncident) {
      if (hasSignalSaturation) {
        return {
          action: 'Signal timing review',
          reason: 'Active collision causing approach delays and signal saturation. Modify green timings at adjacent Defence intersection.'
        };
      }
      return {
        action: 'Incident response + route advisory',
        reason: 'Incident lanes blocked. Deploy emergency road patrol team and publish dynamic route rerouting via official roadside signs.'
      };
    }

    // 4. Signal Saturation or fixed-time delay queues
    if (hasSignalSaturation || (isFixedSignal && cor.congestion_pressure_score >= 65)) {
      return {
        action: 'Signal timing review',
        reason: 'Intersection approach saturated. Revise static plans and add green timing splits to clear approach bottlenecks.'
      };
    }

    // 5. Volume Near Capacity / PM Peak
    if (cor.vc_ratio > 0.9) {
      return {
        action: 'Route advisory',
        reason: 'Corridor demand exceeds 90% of structural capacity. Reroute outbound flow to adjacent expressways.'
      };
    }

    // 6. Metro Transit shift
    if (cor.congestion_pressure_score >= 60 && hour >= 17 && hour <= 19) {
      return {
        action: 'Public transport advisory',
        reason: 'Saturated PM outbound commuter flow. Advise public transport modal shift via official pre-trip mobility updates.'
      };
    }

    return {
      action: 'Monitor conditions',
      reason: 'Traffic parameters remain within normal design thresholds.'
    };
  };

  // Find recommended action for selected corridor
  const selectedRecommendation = selectedCorridor ? getRecommendedActionForCorridor(selectedCorridor) : { action: 'Monitor conditions', reason: 'Normal flow detected.' };

  // Alternatives string helper
  const getCreekAlternatives = () => {
    if (selectedLocationId === 'GAR_N1') return 'Al Maktoum Bridge (MAK_N1) or Business Bay Crossing (BBC_S1)';
    if (selectedLocationId === 'MAK_N1') return 'Business Bay Crossing (BBC_S1) or Al Garhoud Bridge (GAR_N1)';
    if (selectedLocationId === 'BBC_S1') return 'Al Garhoud Bridge (GAR_N1) or Al Maktoum Bridge (MAK_N1)';
    return null;
  };
  const alternatives = getCreekAlternatives();

  const getRiskWording = (score: number) => {
    const n = Number(score || 0);
    if (n >= 80) return "critical congestion risk";
    if (n >= 60) return "high congestion risk";
    if (n >= 40) return "moderate congestion pressure";
    return "low congestion pressure";
  };

  const buildSafeSituationSummary = (selectedHotspot: any) => {
    const location = selectedHotspot?.location_name || selectedHotspot?.locationName || selectedHotspot?.location || "Selected corridor";
    const score = Number(selectedHotspot?.congestion_pressure_score || selectedHotspot?.riskScore || selectedHotspot?.risk_score || 0);
    return `Congestion pressure is rising at ${location}. Current Risk Score is ${score}/100, indicating ${getRiskWording(score)} for the next 30–60 minutes.`;
  };

  // Format briefing fields safely to prevent React crashes and strip markdown/emojis
  const formatBriefField = (field: any): string => {
    if (!field) return '';
    let text = '';
    if (typeof field === 'string') {
      text = field;
    } else if (typeof field === 'object') {
      if (Array.isArray(field)) {
        text = field.join(', ');
      } else {
        text = field.action ?? field.summary ?? field.explanation ?? field.message ?? JSON.stringify(field);
      }
    } else {
      text = String(field);
    }
    return text
      .replace(/3060/g, "30–60")
      .replace(/30\s*60/g, "30–60")
      .replace(/imminent gridlock/gi, "critical congestion risk")
      .replace(/This congestion delays is primarily driven by active triggers:\s*/gi, "This congestion pressure is primarily driven by ")
      .replace(/This critical congestion risk is primarily driven by active triggers:\s*/gi, "This congestion pressure is primarily driven by ")
      .replace(/This imminent gridlock is primarily driven by active triggers:\s*/gi, "This congestion pressure is primarily driven by ")
      .replace(/\*\*/g, '')
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2600-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '')
      .trim();
  };

  // Dynamic data-driven What-If impact calculator
  const calculateWhatIfImpact = (params: {
    selectedCorridor: Corridor;
    selectedAction: string;
    scenario: Scenario | null;
    forecast: any;
    crossingAlternatives: string | null;
    signalTelemetry: any;
  }) => {
    const { selectedCorridor: cor, selectedAction, scenario } = params;
    const beforeRisk = cor.congestion_pressure_score;
    const beforeLevel = cor.risk_level;
    let afterRisk = beforeRisk;
    let afterLevel = beforeLevel;
    let speedDeltaKph = 0;
    let delayDeltaSeconds = 0;
    let volumeDeltaVph = 0;
    let confidence = 85;
    let reason = '';
    let applicable = true;
    const assumptions: string[] = [];

    const currentRisk = cor.congestion_pressure_score;
    const vcRatio = cor.vc_ratio || 0;
    const avgSpeed = cor.avg_speed_kph || 80;
    const incidentAffected = cor.incident_affected;
    
    // Estimate demand
    let currentDemand = cor.demand_vph || 0;
    if (!currentDemand && cor.volume_vph) {
      currentDemand = Math.round(cor.volume_vph / (vcRatio || 0.8));
      assumptions.push("Estimated baseline demand from volume and volume-to-capacity ratio.");
    }

    const peakHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);
    const isStorm = date === '2024-04-16';

    const clampVal = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
    const getRiskLevel = (score: number) => {
      if (score >= 80) return 'Critical';
      if (score >= 60) return 'High';
      if (score >= 40) return 'Medium';
      return 'Low';
    };

    let riskReduction = 0;

    switch (selectedAction) {
      case 'route-advisory': {
        const isBridge = ['GAR_N1', 'MAK_N1', 'BBC_S1'].includes(cor.location_id);
        if (isBridge) {
          const otherBridges = corridors.filter(c => ['GAR_N1', 'MAK_N1', 'BBC_S1'].includes(c.location_id) && c.location_id !== cor.location_id);
          const lowestAlternativeRisk = otherBridges.length > 0 
            ? Math.min(...otherBridges.map(b => b.congestion_pressure_score)) 
            : 100;
          
          const alternativeGap = currentRisk - lowestAlternativeRisk;
          
          if (alternativeGap > 0) {
            riskReduction = clampVal(4 + alternativeGap * 0.35 + Math.max(0, vcRatio - 0.85) * 30, 2, 18);
            speedDeltaKph = Math.round(clampVal(3 + alternativeGap * 0.25, 2, 14));
            reason = `Alternative creek crossings have lower pressure (gap of ${Math.round(alternativeGap)} points). Rerouting has high efficacy.`;
          } else {
            riskReduction = 2;
            speedDeltaKph = 2;
            applicable = false;
            reason = "Adjacent creek crossings are equally or more congested. Rerouting offers limited relief.";
          }
        } else {
          riskReduction = clampVal(2 + vcRatio * 4, 1, 6);
          speedDeltaKph = 2;
          applicable = false;
          reason = "No dynamic alternate crossing routes defined for this corridor. Limited impact.";
        }
        volumeDeltaVph = -Math.round(currentDemand * 0.05);
        break;
      }

      case 'signal-timing': {
        const hasSignal = !!cor.junction_performance;
        if (hasSignal && cor.junction_performance) {
          const delaySeconds = cor.junction_performance.avg_delay_s_per_veh || 10;
          const saturation = (cor.junction_performance.degree_of_saturation || 0) * 100;
          const queueSize = cor.junction_performance.avg_queue_veh || 0;

          if (saturation > 80 || delaySeconds > 30 || queueSize > 15) {
            riskReduction = clampVal((delaySeconds / 10) + Math.max(0, saturation - 80) * 0.4 + queueSize * 1.5, 2, 18);
            delayDeltaSeconds = -Math.round(clampVal(delaySeconds * 0.25, 5, 25));
            speedDeltaKph = Math.round(clampVal(delayDeltaSeconds * -0.3, 2, 10));
            reason = `Active saturation (${Math.round(saturation)}%) and queue delay detected. Optimization will clear approach queues.`;
          } else {
            riskReduction = 2;
            delayDeltaSeconds = -2;
            applicable = false;
            reason = "Degree of saturation and delay are already within acceptable service thresholds.";
          }
        } else {
          riskReduction = 1;
          applicable = false;
          reason = "No adaptive signal junctions mapped to this corridor hotspot.";
        }
        break;
      }

      case 'metro-riders': {
        if (peakHour) {
          riskReduction = clampVal(5 + currentRisk * 0.08, 3, 14);
          volumeDeltaVph = -Math.round(clampVal(currentDemand * 0.04, 80, 400));
          reason = "High peak-hour commuter volume. Public transit advisory leverages nearby stations for passenger modal shift.";
        } else {
          riskReduction = clampVal(2 + currentRisk * 0.04, 1, 7);
          volumeDeltaVph = -Math.round(clampVal(currentDemand * 0.02, 30, 150));
          reason = "Off-peak hours limit the potential volume shift to transit channels.";
        }
        speedDeltaKph = Math.round(clampVal(volumeDeltaVph * -0.02, 1, 5));
        break;
      }

      case 'salik-shift': {
        const isPeakCommute = scenario?.id === 'pm-peak-demo' || peakHour;
        if (isPeakCommute) {
          riskReduction = clampVal(4 + currentRisk * 0.06, 3, 12);
          volumeDeltaVph = -Math.round(clampVal(currentDemand * 0.05, 100, 450));
          reason = "Commuter corridor under peak Salik pressure. Off-peak pricing incentives redirect discretionary trips.";
        } else {
          riskReduction = clampVal(1 + currentRisk * 0.03, 1, 5);
          volumeDeltaVph = -Math.round(clampVal(currentDemand * 0.015, 20, 120));
          reason = "Non-peak conditions limit the price-elastic response of commuter shifting.";
        }
        speedDeltaKph = Math.round(clampVal(volumeDeltaVph * -0.02, 1, 6));
        break;
      }

      case 'route-advisory-incident':
      case 'incident-response':
      case 'Official roadside advisory + incident response': {
        const incidentOrWeather = incidentAffected || isStorm;
        if (incidentOrWeather) {
          riskReduction = clampVal(8 + currentRisk * 0.12, 6, 20);
          speedDeltaKph = Math.round(clampVal(4 + currentRisk * 0.08, 3, 12));
          reason = isStorm 
            ? "Severe weather disruption. Dynamic alerts redirect traffic and deploy emergency responses to flooded blockages." 
            : "Active incident blocking lanes. Dispatching response unit and roadside sign warnings provides rapid clearing and recovery.";
        } else {
          riskReduction = clampVal(2 + currentRisk * 0.04, 1, 8);
          speedDeltaKph = 2;
          applicable = false;
          reason = "No active incident or severe weather disruption detected on this corridor.";
        }
        break;
      }

      case 'monitor':
      default: {
        riskReduction = 0;
        reason = "No operational intervention selected; conditions continue to be monitored.";
        break;
      }
    }

    afterRisk = Math.round(Math.max(15, Math.min(100, currentRisk - riskReduction)));
    afterLevel = getRiskLevel(afterRisk);

    const actionName = {
      'route-advisory': 'Route Advisory',
      'signal-timing': 'Signal Timing Review',
      'metro-riders': 'Public Transport Advisory',
      'salik-shift': 'Off-Peak Demand Shift',
      'incident-response': 'Incident Response',
      'monitor': 'Monitor Only'
    }[selectedAction] || 'Monitor Only';

    return {
      actionName,
      beforeRisk,
      afterRisk,
      beforeLevel,
      afterLevel,
      speedDeltaKph,
      delayDeltaSeconds,
      volumeDeltaVph,
      confidence,
      reason,
      applicable,
      assumptions
    };
  };

  // What-If dynamic simulated prediction outcome
  const getMitigatedMetrics = (corridor: Corridor, optionKey: string) => {
    if (!corridor) return null;
    const impact = calculateWhatIfImpact({
      selectedCorridor: corridor,
      selectedAction: optionKey,
      scenario: activeScenario || null,
      forecast: corridor.forecast,
      crossingAlternatives: getCreekAlternatives(),
      signalTelemetry: junctionPerformance
    });
    return {
      score: impact.afterRisk,
      level: impact.afterLevel,
      speed: Math.round(Math.min(corridor.speed_limit_kph, corridor.avg_speed_kph + impact.speedDeltaKph)),
      volume: Math.round(Math.max(100, corridor.volume_vph + impact.volumeDeltaVph)),
      delay: junctionPerformance ? Math.max(5, Math.round(junctionPerformance.avg_delay_s_per_veh + impact.delayDeltaSeconds)) : null
    };
  };

  const getDefaultMitigationKey = (actionText: string): string => {
    const text = actionText.toLowerCase();
    if (text.includes('route advisory') || text.includes('divert') || text.includes('diversion') || text.includes('route advisory to business bay') || text.includes('route advisory to al maktoum')) return 'route-advisory';
    if (text.includes('signal split') || text.includes('signal timing') || text.includes('junction split') || text.includes('junction timing')) return 'signal-timing';
    if (text.includes('metro') || text.includes('public transport') || text.includes('transit')) return 'metro-riders';
    if (text.includes('toll') || text.includes('salik') || text.includes('pricing')) return 'salik-shift';
    return 'monitor';
  };

  const defaultKey = selectedRecommendation ? getDefaultMitigationKey(selectedRecommendation.action) : 'monitor';
  const activeMitigationKey = selectedCorridor ? (mitigations[selectedCorridor.location_id] || defaultKey) : 'monitor';
  const mitigatedData = selectedCorridor ? getMitigatedMetrics(selectedCorridor, activeMitigationKey) : null;

  const routeImpact = selectedCorridor ? calculateWhatIfImpact({
    selectedCorridor,
    selectedAction: 'route-advisory',
    scenario: activeScenario || null,
    forecast: selectedCorridor.forecast,
    crossingAlternatives: getCreekAlternatives(),
    signalTelemetry: junctionPerformance
  }) : null;

  const signalImpact = selectedCorridor ? calculateWhatIfImpact({
    selectedCorridor,
    selectedAction: 'signal-timing',
    scenario: activeScenario || null,
    forecast: selectedCorridor.forecast,
    crossingAlternatives: getCreekAlternatives(),
    signalTelemetry: junctionPerformance
  }) : null;

  const metroImpact = selectedCorridor ? calculateWhatIfImpact({
    selectedCorridor,
    selectedAction: 'metro-riders',
    scenario: activeScenario || null,
    forecast: selectedCorridor.forecast,
    crossingAlternatives: getCreekAlternatives(),
    signalTelemetry: junctionPerformance
  }) : null;

  const salikImpact = selectedCorridor ? calculateWhatIfImpact({
    selectedCorridor,
    selectedAction: 'salik-shift',
    scenario: activeScenario || null,
    forecast: selectedCorridor.forecast,
    crossingAlternatives: getCreekAlternatives(),
    signalTelemetry: junctionPerformance
  }) : null;

  const incidentImpact = selectedCorridor ? calculateWhatIfImpact({
    selectedCorridor,
    selectedAction: 'incident-response',
    scenario: activeScenario || null,
    forecast: selectedCorridor.forecast,
    crossingAlternatives: getCreekAlternatives(),
    signalTelemetry: junctionPerformance
  }) : null;

  const handleGenerateBriefing = async () => {
    if (!selectedCorridor) return;
    setIsGeneratingBrief(true);
    setBriefing(null);

    // Identify cause tags dynamically
    const isStorm = date === '2024-04-16';
    const isMainCauseIncident = selectedCorridor.incident_affected;
    const isMainCauseCapacity = selectedCorridor.vc_ratio > 0.9;
    const hasSignalPressure = !!selectedCorridor.junction_performance && 
      ((selectedCorridor.junction_performance.degree_of_saturation || 0) > 0.8 || 
       (selectedCorridor.junction_performance.avg_delay_s_per_veh || 0) > 30);
    
    const causesArray = [];
    if (isStorm) {
      causesArray.push('weather disruption and flooding');
    }
    if (isMainCauseIncident) {
      causesArray.push('Incident blockages');
    }
    if (hasSignalPressure) {
      causesArray.push('signal saturation and queue delays');
    }
    if (isMainCauseCapacity) {
      causesArray.push('volume near capacity');
    }
    if (causesArray.length === 0) {
      causesArray.push('PM Peak Commute');
    }

    const payload = {
      locationId: selectedCorridor.location_id,
      locationName: selectedCorridor.location_name,
      date,
      hour,
      avgSpeed: selectedCorridor.avg_speed_kph,
      freeFlowSpeed: selectedCorridor.free_flow_speed_kph,
      vcRatio: selectedCorridor.vc_ratio,
      levelOfService: selectedCorridor.level_of_service,
      demandVph: selectedCorridor.demand_vph,
      capacityVph: selectedCorridor.capacity_vph,
      riskScore: selectedCorridor.congestion_pressure_score,
      riskLevel: selectedCorridor.risk_level,
      activeIncidents: selectedCorridor.active_incidents,
      calendarContext,
      junctionPerformance: selectedCorridor.junction_performance,
      // Pass the unified recommended action & causes to ensure AI output matches perfectly
      recommended_action: selectedRecommendation.action,
      causes: causesArray
    };

    try {
      const res = await fetch('/api/mistral/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setBriefing(data);
    } catch (err) {
      console.error('Error generating brief', err);
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  const handleOperatorDecision = (action: 'approve' | 'reject' | 'review') => {
    if (!selectedCorridor) return;

    let desc = '';
    let statusText = '';
    const mitigationText = {
      'route-advisory': 'Route Advisory',
      'signal-timing': 'Signal Timing Review',
      'metro-riders': 'Public Transport Advisory',
      'salik-shift': 'Off-Peak Demand Shift',
      'incident-response': 'Incident Response',
      'monitor': 'Monitor Only'
    }[activeMitigationKey] || 'Monitor Only';

    if (action === 'approve') {
      desc = `Operator approved recommendation: ${mitigationText}`;
      statusText = 'APPROVED';
      setAppliedActions(prev => ({ ...prev, [selectedCorridor.location_id]: true }));

      const impact = calculateWhatIfImpact({
        selectedCorridor,
        selectedAction: activeMitigationKey,
        scenario: activeScenario || null,
        forecast: selectedCorridor.forecast,
        crossingAlternatives: getCreekAlternatives(),
        signalTelemetry: junctionPerformance
      });

      let expectedImpactStr = '';
      if (activeMitigationKey === 'monitor') {
        expectedImpactStr = `No change. Risk remains at ${selectedCorridor.congestion_pressure_score} / ${selectedCorridor.risk_level}.`;
      } else if (mitigatedData) {
        if (activeMitigationKey === 'signal-timing') {
          expectedImpactStr = `Reduces risk to ${mitigatedData.score} / ${mitigatedData.level}, expected delay reduction ${Math.abs(impact.delayDeltaSeconds)}s`;
        } else {
          expectedImpactStr = `Reduces risk to ${mitigatedData.score} / ${mitigatedData.level}, expected speed +${impact.speedDeltaKph} kph`;
        }
      } else {
        expectedImpactStr = `Risk remains at ${selectedCorridor.congestion_pressure_score} / ${selectedCorridor.risk_level}`;
      }

      const mainReasonStr = selectedCorridor.forecast?.topContributingFeatures.join(', ') || 'Peak commute flow limits';

      setApprovedImpact({
        beforeScore: selectedCorridor.congestion_pressure_score,
        beforeLevel: selectedCorridor.risk_level,
        approvedAction: mitigationText,
        expectedImpact: expectedImpactStr,
        mainReason: mainReasonStr,
        status: 'APPROVED'
      });
    } else if (action === 'reject') {
      desc = `Operator rejected recommendation: ${mitigationText}`;
      statusText = 'CANCELLED';
      setApprovedImpact(null);
    } else {
      desc = `Requested manual engineering review for ${selectedCorridor.location_name}`;
      statusText = 'ESCALATED';
      setApprovedImpact(null);
    }

    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      location: selectedCorridor.location_id,
      description: desc,
      status: statusText,
      operator: 'OP-402'
    };

    setDecisionLog(prev => [logEntry, ...prev]);
  };

  // Filter & sort corridors placing focusIds first
  let sortedCorridors = [...corridors].sort((a, b) => {
    const aIsFocus = activeFocusIds.includes(a.location_id);
    const bIsFocus = activeFocusIds.includes(b.location_id);
    if (aIsFocus && !bIsFocus) return -1;
    if (!aIsFocus && bIsFocus) return 1;
    return b.congestion_pressure_score - a.congestion_pressure_score;
  });

  // Capping rules based on scenario focus
  if (activeScenarioId === 'creek-crossing-demo') {
    // Only display Garhoud, Maktoum, Business Bay to make the comparison clean and focused
    sortedCorridors = sortedCorridors.filter(c => activeFocusIds.includes(c.location_id));
  } else {
    // Top 5 general hotspots
    sortedCorridors = sortedCorridors.slice(0, 5);
  }

  // Check if selected recommendation corresponds to a simulator option
  const recommendedSimKey = selectedRecommendation.action.toLowerCase().includes('incident response') ? 'incident-response' :
                             selectedRecommendation.action.toLowerCase().includes('route advisory') ? 'route-advisory' : 
                             selectedRecommendation.action.toLowerCase().includes('signal timing') ? 'signal-timing' :
                             selectedRecommendation.action.toLowerCase().includes('metro') || selectedRecommendation.action.toLowerCase().includes('public transport') ? 'metro-riders' :
                             selectedRecommendation.action.toLowerCase().includes('salik') || selectedRecommendation.action.toLowerCase().includes('off-peak') ? 'salik-shift' : 
                             selectedRecommendation.action.toLowerCase().includes('official roadside advisory') ? 'route-advisory' : 'monitor';

  return (
    <div className="app-container">
      {/* Header Panel */}
      <header className="header-console">
        <div className="brand-section">
          <div className="rta-logo">RTA</div>
          <h1 className="console-title">
            RTA PeakFlow Copilot <span style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '8px', marginLeft: '8px', color: 'var(--text-secondary)', fontWeight: 400, fontSize: '12px' }}>Traffic Prevention Dashboard</span>
          </h1>
        </div>
        <div className="status-panel">
          <div className="status-badge" style={{ textTransform: 'none', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
            <span className="status-dot active"></span>
            TOC Time: {realTime || '00:00:00'}
          </div>
          <div className="status-badge" style={{ textTransform: 'none' }}>
            Operational View: {activeScenario ? activeScenario.title : 'PM Peak Congestion'}
          </div>
          <div className="status-badge">
            <span className="status-dot"></span>
            Telemetry Stream
          </div>
          <button 
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className="theme-toggle-btn"
            title="Toggle Theme"
            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {theme === 'dark' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sun size={12} className="text-primary" /> Light Mode</span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Moon size={12} className="text-primary" /> Dark Mode</span>
            )}
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="dashboard-grid">
        
        {/* Column 1: Scenarios Launcher Sidebar (Simplified Card Text) */}
        <aside className="panel" id="sidebar-scenarios">
          <div className="panel-header">
            <h2 className="panel-title">
              <Sliders size={14} className="text-muted" /> Control Room Sidebar
            </h2>
          </div>
          <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Command Room Sections */}
            <div className="sidebar-nav-list" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <span className="kpi-title" style={{ fontSize: '9px', display: 'block', marginBottom: '6px', paddingLeft: '8px' }}>Console Modules</span>
              <button className="sidebar-nav-item active">
                <Activity size={13} /> Operations Console
              </button>
              <button className="sidebar-nav-item" onClick={() => {
                // Focus bottom log table dynamically or scroll to it
                const el = document.getElementById('decision-log-table');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}>
                <History size={13} /> Decision Logs
              </button>
            </div>

            {/* Scenario Launcher List */}
            <div>
              <span className="kpi-title" style={{ fontSize: '9px', display: 'block', marginBottom: '8px', paddingLeft: '8px' }}>Simulation Replays</span>
              <div className="scenario-list">
                {scenarios.map(sc => {
                  const isOptional = sc.id === 'rain-stress-test';
                  const simplifiedSubtitle = {
                    'pm-peak-demo': 'Weekday commuter rush on SZR SB',
                    'creek-crossing-demo': 'Al Garhoud Bridge incident rerouting',
                    'signal-delay-demo': 'Deira Junction adaptive split adjustment',
                    'rain-stress-test': 'Historic storm volume shifts to Metro'
                  }[sc.id] || sc.title;

                  return (
                    <button
                      key={sc.id}
                      onClick={() => handleLaunchScenario(sc)}
                      className={`scenario-card ${isOptional ? 'optional' : ''} ${activeScenarioId === sc.id ? 'active' : ''}`}
                      id={`scenario-${sc.id}`}
                    >
                      <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px' }}>
                          {sc.id === 'rain-stress-test' ? 'Optional Resilience Test' : sc.title}
                        </span>
                        {activeScenarioId === sc.id && <CheckCircle size={12} className="text-primary" />}
                      </h4>
                      <p style={{ marginTop: '3px', fontSize: '10px', color: 'var(--text-secondary)' }}>{simplifiedSubtitle}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 'auto', padding: '12px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <div className="helper-text" style={{ fontWeight: 700, color: 'var(--text-title)', marginBottom: '4px' }}>
                <Info size={12} /> System Instructions
              </div>
              <p style={{ fontSize: '10.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Replay data stream hour-by-hour. Click a corridor in the **Top Congestion Risks** list to inspect detailed metrics, simulate overrides, and request copilot operator briefs.
              </p>
            </div>
          </div>
        </aside>

        {/* Column 2: Main Content (A, B, C, D, E) */}
        <section className="panel" style={{ overflowY: 'auto' }} id="main-telemetry-content">
          
          {/* Main User Alert Banner */}
          <div className="alert-bar" id="story-banner">
            Analyze traffic data, identify congestion before it becomes critical, compare prevention options, and generate an AI operator briefing.
          </div>

          {/* Clickable 5-Step Workflow Stepper Guide */}
          <div className="workflow-stepper" id="guided-flow-steps">
            <div 
              className={`workflow-step completed ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span className="workflow-step-num">Step 1</span>
              <span className="workflow-step-title">Select Scenario</span>
            </div>
            
            <div 
              className={`workflow-step ${selectedLocationId ? 'completed' : 'active'} ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              <span className="workflow-step-num">Step 2</span>
              <span className="workflow-step-title">Select Hotspot</span>
            </div>

            <div 
              className={`workflow-step ${selectedLocationId ? 'completed' : ''} ${activeTab === 'forecast' ? 'active' : ''}`}
              onClick={() => {
                if (selectedLocationId) {
                  setActiveTab('forecast');
                } else {
                  alert("Please select a hotspot corridor (Step 2) first.");
                }
              }}
            >
              <span className="workflow-step-num">Step 3</span>
              <span className="workflow-step-title">Review Forecast</span>
            </div>

            <div 
              className={`workflow-step ${selectedLocationId && Object.keys(mitigations).length > 0 ? 'completed' : ''} ${activeTab === 'whatif' ? 'active' : ''}`}
              onClick={() => {
                if (selectedLocationId) {
                  setActiveTab('whatif');
                } else {
                  alert("Please select a hotspot corridor (Step 2) first.");
                }
              }}
            >
              <span className="workflow-step-num">Step 4</span>
              <span className="workflow-step-title">Compare Actions</span>
            </div>

            <div 
              className={`workflow-step ${briefing ? 'completed' : ''} ${activeTab === 'briefing' ? 'active' : ''}`}
              onClick={() => {
                if (selectedLocationId) {
                  setActiveTab('briefing');
                } else {
                  alert("Please select a hotspot corridor (Step 2) first.");
                }
              }}
            >
              <span className="workflow-step-num">Step 5</span>
              <span className="workflow-step-title">Generate & Approve</span>
            </div>
          </div>

          {/* Main Viewport Tabs Selector */}
          <div className="main-tab-bar">
            <button 
              className={`main-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Sliders size={13} /> Overview
            </button>
            <button 
              className={`main-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              <Compass size={13} /> Map & Hotspots
            </button>
            <button 
              className={`main-tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
              onClick={() => {
                if (selectedLocationId) {
                  setActiveTab('forecast');
                } else {
                  alert("Please select a hotspot corridor first.");
                }
              }}
            >
              <Cpu size={13} /> Forecast
            </button>
            <button 
              className={`main-tab-btn ${activeTab === 'whatif' ? 'active' : ''}`}
              onClick={() => {
                if (selectedLocationId) {
                  setActiveTab('whatif');
                } else {
                  alert("Please select a hotspot corridor first.");
                }
              }}
            >
              <Sliders size={13} /> What-If Simulator
            </button>
            <button 
              className={`main-tab-btn ${activeTab === 'briefing' ? 'active' : ''}`}
              onClick={() => {
                if (selectedLocationId) {
                  setActiveTab('briefing');
                } else {
                  alert("Please select a hotspot corridor first.");
                }
              }}
            >
              <Shield size={13} /> AI Briefing & Approval
            </button>
          </div>

          {/* Scenario Story Alert Box */}
          <div style={{ background: '#EBF5FF', borderLeft: '4px solid var(--rta-blue)', padding: '12px', borderRadius: '4px', margin: '0 14px 12px 14px', fontSize: '11.5px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
            <strong>Operational View Active:</strong> {activeScenarioId === 'pm-peak-demo' 
              ? 'PM peak pressure is building. The system ranks the highest-risk roads and recommends prevention actions before congestion becomes critical.' 
              : activeScenarioId === 'creek-crossing-demo'
              ? 'Garhoud Bridge is heavily congested. The system compares crossing risks and recommends rerouting to lower-risk bridges.'
              : activeScenarioId === 'signal-delay-demo'
              ? 'Adaptive signal reviews active. Review fixed-time signal programs at Deira to adjust splits and clear approaches.'
              : 'Stress testing city-wide response. Massive volume shifts from flooded roads to Metro transit routes.'}
          </div>

          <div className="panel-content" style={{ overflowY: 'visible', paddingTop: 0 }}>
            
            {/* activeTab === 'overview' */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                {/* Section A: Scenario Clock & Details */}
                <div className="time-controller" id="section-a-clock">
                  <div className="time-row">
                    <div>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                        Traffic Time
                      </div>
                      <span className="time-display">{date} {String(hour).padStart(2, '0')}:00</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="control-buttons">
                        <button 
                          onClick={() => setIsPlaying(!isPlaying)} 
                          className={`btn-ctrl ${isPlaying ? 'active' : ''}`}
                          title={isPlaying ? 'Pause' : 'Play'}
                          id="btn-play-pause"
                        >
                          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                        </button>
                        <button 
                          onClick={() => setHour(prev => (prev >= 23 ? 0 : prev + 1))} 
                          className="btn-ctrl"
                          title="Next Hour"
                          id="btn-next-hour"
                        >
                          <SkipForward size={12} />
                        </button>
                      </div>
                      
                      <input
                        type="range"
                        min="0"
                        max="23"
                        value={hour}
                        onChange={e => {
                          setIsPlaying(false);
                          setHour(parseInt(e.target.value, 10));
                        }}
                        style={{ width: '100px' }}
                        className="slider-custom"
                        id="timeline-slider"
                      />
                    </div>
                  </div>

                  {activeScenario && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '6px', lineHeight: 1.4 }}>
                      <strong>Scenario Context:</strong> {activeScenario.description}
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                    Sandbox replay mode: historical mobility data is replayed like a live stream for prototype validation.
                  </div>
                </div>

                {/* Section B: KPI cards */}
                <div className="kpi-container" id="section-b-kpis">
                  <div className="kpi-card" id="kpi-hotspots" style={{ borderLeft: '3px solid var(--color-critical)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <span className="kpi-title">Roads at Risk</span>
                        <div className="kpi-value" style={{ color: kpis.criticalHotspots + kpis.highRiskRoads > 0 ? 'var(--color-critical)' : 'inherit' }}>
                          {kpis.criticalHotspots + kpis.highRiskRoads}
                        </div>
                      </div>
                      <div style={{ padding: '6px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-critical)', display: 'flex' }}>
                        <AlertTriangle size={15} />
                      </div>
                    </div>
                  </div>
                  <div className="kpi-card" id="kpi-speed" style={{ borderLeft: '3px solid var(--color-low)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <span className="kpi-title">Network Speed</span>
                        <div className="kpi-value">
                          {kpis.avgSpeed} <span className="kpi-unit">kph</span>
                        </div>
                      </div>
                      <div style={{ padding: '6px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-low)', display: 'flex' }}>
                        <Activity size={15} />
                      </div>
                    </div>
                  </div>
                  <div className="kpi-card" id="kpi-actions" style={{ borderLeft: '3px solid var(--rta-blue)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <span className="kpi-title">Recommended Actions</span>
                        <div className="kpi-value" style={{ color: kpis.criticalHotspots + kpis.highRiskRoads > 0 ? 'var(--rta-blue)' : 'inherit' }}>
                          {kpis.criticalHotspots + kpis.highRiskRoads}
                        </div>
                      </div>
                      <div style={{ padding: '6px', borderRadius: '50%', background: 'var(--rta-blue-bg)', color: 'var(--rta-blue)', display: 'flex' }}>
                        <Zap size={15} />
                      </div>
                    </div>
                  </div>
                  <div className="kpi-card" id="kpi-time" style={{ borderLeft: '3px solid var(--text-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <span className="kpi-title">Replay Time</span>
                        <div className="kpi-value" style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                          {String(hour).padStart(2, '0')}:00
                        </div>
                      </div>
                      <div style={{ padding: '6px', borderRadius: '50%', background: 'var(--border-color)', color: 'var(--text-secondary)', display: 'flex' }}>
                        <Clock size={15} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section C: Hotspot Ranking Table */}
                <div className="detail-card" style={{ padding: 0 }} id="section-c-ranking-table">
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="kpi-title" style={{ fontSize: '10px' }}>Top Congestion Risks (Current Hour)</span>
                    <div className="helper-text" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => setShowTooltip(!showTooltip)}>
                      <HelpCircle size={11} /> Congestion Pressure Score
                      {showTooltip && (
                        <div style={{ position: 'absolute', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '4px', zIndex: 10, width: '220px', boxShadow: 'var(--shadow-focus)', top: '24px', right: '0px', textTransform: 'none', color: 'var(--text-primary)', fontWeight: 'normal' }}>
                          <strong>Score Weighted Components:</strong><br />
                          * 35% Volume-to-Capacity ratio<br />
                          * 20% Speed drop vs limit<br />
                          * 15% Travel time index scaling<br />
                          * 10% Raw vehicle demand volume<br />
                          * 8% Active incident blockages<br />
                          * 7% Nearby junction saturation<br />
                          * 5% Calendar holiday multipliers
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '10px 14px 0 14px' }}>
                    {activeScenarioId === 'creek-crossing-demo' && (
                      <div className="recommend-badge" style={{ marginBottom: '0px' }}>
                        Comparing Creek crossings: Garhoud, Maktoum, Business Bay
                      </div>
                    )}
                    {activeScenarioId === 'pm-peak-demo' && (
                      <div className="recommend-badge" style={{ marginBottom: '0px' }}>
                        Focus Corridor: SZR Commuter Egress
                      </div>
                    )}
                    {activeScenarioId === 'signal-delay-demo' && (
                      <div className="recommend-badge" style={{ marginBottom: '0px' }}>
                        Focus: Deira Junction Optimization
                      </div>
                    )}
                  </div>

                  <div>
                    <table className="hotspot-table">
                      <thead>
                        <tr>
                          <th>Road / Corridor</th>
                          <th>Risk Score</th>
                          <th>Main Cause</th>
                          <th>Recommended Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCorridors.map(cor => {
                          const isMainCauseIncident = cor.incident_affected;
                          const isMainCauseCapacity = cor.vc_ratio > 0.9;
                          const mainCause = isMainCauseIncident ? 'Incident blockages' : isMainCauseCapacity ? 'Volume near capacity' : 'PM Peak Commute';
                          const rec = getRecommendedActionForCorridor(cor);

                          return (
                            <tr
                              key={cor.location_id}
                              onClick={() => setSelectedLocationId(cor.location_id)}
                              className={`hotspot-row ${selectedLocationId === cor.location_id ? 'selected' : ''}`}
                              id={`ranking-row-${cor.location_id}`}
                            >
                              <td style={{ fontWeight: 600 }}>
                                {cor.location_id} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '10px' }}>({cor.location_name})</span>
                              </td>
                              <td style={{ fontWeight: 700 }}>
                                <span className={`badge-risk ${cor.risk_level.toLowerCase()}`} style={{ marginRight: '6px' }}>
                                  {cor.congestion_pressure_score}
                                </span>
                              </td>
                              <td>{mainCause}</td>
                              <td style={{ color: 'var(--rta-blue)', fontWeight: 600 }}>
                                {rec.action}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-color)', fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Info size={11} /> <span>Click a corridor row to load visual detail overlays on the Map or Forecast tabs.</span>
                  </div>
                </div>
              </div>
            )}

            {/* activeTab === 'map' */}
            {activeTab === 'map' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                {/* Section A: Scenario Clock & Details */}
                <div className="time-controller" id="section-a-clock">
                  <div className="time-row">
                    <div>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                        Traffic Time
                      </div>
                      <span className="time-display">{date} {String(hour).padStart(2, '0')}:00</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="control-buttons">
                        <button 
                          onClick={() => setIsPlaying(!isPlaying)} 
                          className={`btn-ctrl ${isPlaying ? 'active' : ''}`}
                          title={isPlaying ? 'Pause' : 'Play'}
                          id="btn-play-pause-map"
                        >
                          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                        </button>
                        <button 
                          onClick={() => setHour(prev => (prev >= 23 ? 0 : prev + 1))} 
                          className="btn-ctrl"
                          title="Next Hour"
                        >
                          <SkipForward size={12} />
                        </button>
                      </div>
                      
                      <input
                        type="range"
                        min="0"
                        max="23"
                        value={hour}
                        onChange={e => {
                          setIsPlaying(false);
                          setHour(parseInt(e.target.value, 10));
                        }}
                        style={{ width: '100px' }}
                        className="slider-custom"
                      />
                    </div>
                  </div>
                </div>

                {/* Tactical road map with pan and zoom */}
                {/* Render Section Map Overview */}
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
              </div>
            )}

            {/* activeTab === 'forecast' */}
            {activeTab === 'forecast' && (
              <div style={{ marginTop: '10px' }}>
                {selectedLocationId && selectedCorridor ? (
                  <div className="hotspot-detail-grid animate-fade-in" id="section-d-details" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    
                    {/* Risk Gauge Circle */}
                    <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span className="kpi-title" style={{ display: 'block', textAlign: 'center', marginBottom: '4px' }}>
                        Congestion Pressure Score
                      </span>
                      <div className="risk-gauge-container">
                        <svg className="risk-circle-svg">
                          <circle className="risk-circle-bg" cx="35" cy="35" r="30" />
                          <circle
                            className="risk-circle-val"
                            cx="35"
                            cy="35"
                            r="30"
                            stroke={
                              appliedActions[selectedLocationId] && mitigatedData
                                ? (mitigatedData.score >= 80 ? 'var(--color-critical)' : mitigatedData.score >= 60 ? 'var(--color-high)' : mitigatedData.score >= 40 ? 'var(--color-medium)' : 'var(--color-low)')
                                : (selectedCorridor.congestion_pressure_score >= 80 ? 'var(--color-critical)' : selectedCorridor.congestion_pressure_score >= 60 ? 'var(--color-high)' : selectedCorridor.congestion_pressure_score >= 40 ? 'var(--color-medium)' : 'var(--color-low)')
                            }
                            strokeDasharray="188.5"
                            strokeDashoffset={
                              188.5 - (188.5 * (appliedActions[selectedLocationId] && mitigatedData ? mitigatedData.score : selectedCorridor.congestion_pressure_score)) / 100
                            }
                          />
                        </svg>
                        <div className="risk-value-text">
                          {appliedActions[selectedLocationId] && mitigatedData ? mitigatedData.score : selectedCorridor.congestion_pressure_score}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '9.5px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        Risk Category: <strong style={{ color: 'var(--text-title)' }}>
                          {appliedActions[selectedLocationId] && mitigatedData ? mitigatedData.level : selectedCorridor.risk_level}
                        </strong>
                      </div>
                    </div>

                    {/* Avg Speed detail-card */}
                    <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span className="kpi-title">Average Corridor Speed</span>
                      <div style={{ fontSize: '22px', fontWeight: 800, margin: '8px 0 2px 0', color: 'var(--text-title)' }}>
                        {selectedCorridor.avg_speed_kph} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>kph</span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Free-flow baseline: 80 kph
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Speed drop: <span style={{ color: 'var(--color-critical)', fontWeight: 700 }}>
                          {Math.max(0, 80 - selectedCorridor.avg_speed_kph)} kph
                        </span>
                      </div>
                    </div>

                    {/* V/C ratio & volume */}
                    <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span className="kpi-title">Volume / Capacity Ratio</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0 2px 0', color: 'var(--text-title)' }}>
                        {selectedCorridor.vc_ratio.toFixed(2)}
                      </div>
                      <div className="telemetry-progress-container">
                        <div className="telemetry-progress-bar-bg">
                          <div 
                            className="telemetry-progress-bar-val" 
                            style={{ 
                              width: `${Math.min(100, selectedCorridor.vc_ratio * 100)}%`,
                              background: selectedCorridor.vc_ratio > 0.9 ? 'var(--color-critical)' : selectedCorridor.vc_ratio > 0.7 ? 'var(--color-medium)' : 'var(--color-low)'
                            }} 
                          />
                        </div>
                      </div>
                      <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Demand: {selectedCorridor.volume_vph} / {selectedCorridor.capacity_vph} vph
                      </span>
                    </div>

                    {/* Travel Time Index */}
                    <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span className="kpi-title">Travel Time Index (TTI)</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0 2px 0', color: 'var(--text-title)' }}>
                        {selectedCorridor.travel_time_index.toFixed(2)}x
                      </div>
                      <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                        Trip takes {((selectedCorridor.travel_time_index - 1) * 100).toFixed(0)}% longer than off-peak.
                      </span>
                    </div>

                    {/* Explainable AI Forecast details */}
                    {selectedCorridor.forecast && (
                      <div className="detail-card" style={{ gridColumn: 'span 2' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span className="kpi-title" style={{ fontSize: '10px' }}>Explainable AI Forecast Profile</span>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>AI Window: Next 30–60 Minutes</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Model Confidence Level:</span>
                            <span style={{ fontWeight: 700, color: 'var(--rta-blue)' }}>{selectedCorridor.forecast?.forecast_confidence}%</span>
                          </div>
                          <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Top Contributing factors:</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {selectedCorridor.forecast?.topContributingFeatures?.map((f: string, idx: number) => (
                              <span key={idx} className="cause-tag" style={{ background: 'var(--rta-blue-bg)', color: 'var(--rta-blue)', border: '1px solid var(--rta-blue-border)', fontSize: '8.5px', padding: '2px 6px' }}>
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Creek Crossing side-by-side comparison card */}
                    {activeScenarioId === 'creek-crossing-demo' && (
                      <div className="detail-card animate-fade-in" style={{ gridColumn: 'span 2', background: 'var(--rta-blue-bg)', borderLeft: '4px solid var(--rta-blue)', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span className="kpi-title" style={{ fontSize: '9.5px' }}>
                            Creek Crossing Corridor Performance Comparison
                          </span>
                          <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Click to select target crossing</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                          {['GAR_N1', 'MAK_N1', 'BBC_S1'].map(locId => {
                            const corRow = corridors.find(c => c.location_id === locId);
                            if (!corRow) return null;
                            const isCurrent = selectedLocationId === locId;
                            const crossings = corridors.filter(c => ['GAR_N1', 'MAK_N1', 'BBC_S1'].includes(c.location_id));
                            const lowestRiskVal = Math.min(...crossings.map(c => c.congestion_pressure_score));
                            const isLowest = corRow.congestion_pressure_score === lowestRiskVal;

                            return (
                              <div 
                                key={locId} 
                                onClick={() => setSelectedLocationId(locId)}
                                style={{ 
                                  background: 'var(--bg-card)', 
                                  padding: '10px', 
                                  borderRadius: '6px', 
                                  cursor: 'pointer',
                                  border: isCurrent ? '2px solid var(--rta-blue)' : '1px solid var(--border-color)',
                                  boxShadow: 'var(--shadow-card)',
                                  transition: 'all 0.2s ease',
                                  position: 'relative'
                                }}
                                className="kpi-card"
                              >
                                <div style={{ fontWeight: 700, fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-title)' }}>
                                  <span>{locId === 'GAR_N1' ? 'Garhoud Bridge' : locId === 'MAK_N1' ? 'Maktoum Bridge' : 'Business Bay'}</span>
                                  {isCurrent && <span style={{ color: 'var(--rta-blue)', fontSize: '8px', fontWeight: 'bold' }}>SELECTED</span>}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                  Speed: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{corRow.avg_speed_kph} kph</span>
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                  <span>Risk Score:</span> 
                                  <span className={`badge-risk ${corRow.risk_level.toLowerCase()}`} style={{ fontSize: '8px', padding: '1px 4px' }}>
                                    {corRow.congestion_pressure_score}
                                  </span>
                                </div>

                                <div className="telemetry-progress-container" style={{ marginTop: '6px' }}>
                                  <div className="telemetry-progress-bar-bg" style={{ height: '3px' }}>
                                    <div 
                                      className="telemetry-progress-bar-val" 
                                      style={{ 
                                        width: `${corRow.congestion_pressure_score}%`,
                                        background: corRow.congestion_pressure_score >= 80 ? 'var(--color-critical)' : corRow.congestion_pressure_score >= 60 ? 'var(--color-high)' : corRow.congestion_pressure_score >= 40 ? 'var(--color-medium)' : 'var(--color-low)'
                                      }} 
                                    />
                                  </div>
                                </div>

                                {isLowest && (
                                  <div style={{ position: 'absolute', top: '-6px', right: '6px', background: 'var(--color-low)', color: 'white', fontSize: '7px', fontWeight: 'bold', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase' }}>
                                    Best Route
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Adjacent crossing alternatives if creek crossings */}
                    {alternatives && activeScenarioId !== 'creek-crossing-demo' && (
                      <div className="detail-card" style={{ gridColumn: 'span 2', background: 'var(--bg-panel)', borderLeft: '3px solid var(--rta-blue)' }}>
                        <span className="kpi-title" style={{ display: 'block', fontSize: '9px', marginBottom: '2px', color: 'var(--rta-blue)' }}>
                          Adjacent Crossing Alternatives
                        </span>
                        <p style={{ fontSize: '11px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          Divert flow to adjacent bridge routes: <strong>{alternatives}</strong>. Alternate bridges currently have free capacities.
                        </p>
                      </div>
                    )}

                    {/* Nearby junction parameters */}
                    {junctionPerformance && (
                      <div className="detail-card" style={{ gridColumn: 'span 2' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span className="kpi-title">Nearby Intersection Telemetry</span>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {junctionPerformance.junction_id} · {junctionPerformance.control_type}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                          <div className="telemetry-item">
                            <div className="telemetry-label">Avg delay</div>
                            <div className="telemetry-val">
                              {appliedActions[selectedLocationId] && mitigatedData && mitigatedData.delay !== null ? mitigatedData.delay : Math.round(junctionPerformance.avg_delay_s_per_veh)}s
                            </div>
                            <div className="telemetry-progress-container">
                              <div className="telemetry-progress-bar-bg">
                                <div 
                                  className="telemetry-progress-bar-val" 
                                  style={{ 
                                    width: `${Math.min(100, ((appliedActions[selectedLocationId] && mitigatedData && mitigatedData.delay !== null ? mitigatedData.delay : junctionPerformance.avg_delay_s_per_veh) / 80) * 100)}%`,
                                    background: 'var(--rta-blue)'
                                  }} 
                                />
                              </div>
                            </div>
                          </div>
                          <div className="telemetry-item">
                            <div className="telemetry-label">Saturation</div>
                            <div className="telemetry-val">{Math.round(junctionPerformance.degree_of_saturation * 100)}%</div>
                            <div className="telemetry-progress-container">
                              <div className="telemetry-progress-bar-bg">
                                <div 
                                  className="telemetry-progress-bar-val" 
                                  style={{ 
                                    width: `${Math.min(100, junctionPerformance.degree_of_saturation * 100)}%`,
                                    background: junctionPerformance.degree_of_saturation > 0.85 ? 'var(--color-critical)' : junctionPerformance.degree_of_saturation > 0.7 ? 'var(--color-medium)' : 'var(--color-low)'
                                  }} 
                                />
                              </div>
                            </div>
                          </div>
                          <div className="telemetry-item">
                            <div className="telemetry-label">Queue Size</div>
                            <div className="telemetry-val">{junctionPerformance.avg_queue_veh} <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>veh</span></div>
                            <div className="telemetry-progress-container">
                              <div className="telemetry-progress-bar-bg">
                                <div 
                                  className="telemetry-progress-bar-val" 
                                  style={{ 
                                    width: `${Math.min(100, (junctionPerformance.avg_queue_veh / 35) * 100)}%`,
                                    background: 'var(--text-secondary)'
                                  }} 
                                />
                              </div>
                            </div>
                          </div>
                          <div className="telemetry-item">
                            <div className="telemetry-label">Phase Failures</div>
                            <div className="telemetry-val" style={{ color: junctionPerformance.phase_failures > 0 ? 'var(--color-critical)' : 'inherit' }}>
                              {junctionPerformance.phase_failures}
                            </div>
                            <div className="telemetry-progress-container">
                              <div className="telemetry-progress-bar-bg">
                                <div 
                                  className="telemetry-progress-bar-val" 
                                  style={{ 
                                    width: `${Math.min(100, (junctionPerformance.phase_failures / 5) * 100)}%`,
                                    background: 'var(--color-critical)'
                                  }} 
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="detail-card" style={{ padding: '30px 20px', textAlign: 'center', borderStyle: 'dashed' }} id="details-placeholder">
                    <Info size={24} className="text-muted" style={{ margin: '0 auto 10px' }} />
                    <h3 style={{ fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                      No Corridor Selected
                    </h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      Select a road row from the Control Room Sidebar or Overview to review diagnostic speed charts and inspect adaptive signal splits.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* activeTab === 'whatif' */}
            {activeTab === 'whatif' && (
              <div style={{ marginTop: '10px' }}>
                {selectedLocationId && selectedCorridor ? (
                  <div className="hotspot-detail-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    
                    {/* Section E: What-If Prevention Simulator */}
                    <div className="detail-card" id="section-e-whatif" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="kpi-title">What-If Prevention Simulator</span>
                        {appliedActions[selectedLocationId] && (
                          <span className="badge-risk low" style={{ fontSize: '8px' }}>Action split active</span>
                        )}
                      </div>

                      <div className="recommend-badge" style={{ marginBottom: '2px' }}>
                        Recommended Option: {selectedRecommendation.action}
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.35, marginBottom: '6px' }}>
                        {selectedRecommendation.reason}
                      </p>

                      <div className="mitigation-stack">
                        {/* Option 1: Route Advisory */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'route-advisory' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'route-advisory' ? 'active' : ''} ${recommendedSimKey === 'route-advisory' ? 'recommended-row' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="radio"
                                name="mitigation"
                                checked={activeMitigationKey === 'route-advisory'}
                                onChange={() => {}}
                              />
                              <div>
                                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-title)' }}>
                                  <Compass size={12} className="text-primary" /> Route Advisory
                                  {recommendedSimKey === 'route-advisory' && <span className="recommend-badge" style={{ fontSize: '7px', margin: 0 }}>Recommended</span>}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Publish alternate bridge diversions on official roadside signs</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <span style={{
                                background: routeImpact?.applicable ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-main)',
                                color: routeImpact?.applicable ? 'var(--color-low)' : 'var(--text-secondary)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 700
                              }}>
                                {routeImpact?.applicable ? `Speed +${routeImpact.speedDeltaKph} kph` : 'Limited impact'}
                              </span>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Priority: {routeImpact?.confidence || 85}/100</div>
                            </div>
                          </div>
                          {activeMitigationKey === 'route-advisory' && routeImpact && (
                            <p style={{ marginTop: '6px', borderTop: '1px dashed var(--border-color)', fontSize: '10px', color: 'var(--text-secondary)', paddingTop: '6px' }}>
                              <strong>Operational Impact:</strong> {routeImpact.reason}
                              {routeImpact.assumptions.length > 0 && <span style={{ display: 'block', fontSize: '8.5px', color: 'var(--text-muted)', marginTop: '2px' }}>* {routeImpact.assumptions[0]}</span>}
                            </p>
                          )}
                        </div>

                        {/* Option 2: Signal Timings */}
                        <div 
                          onClick={() => {
                            if (junctionPerformance) {
                              setMitigations(prev => ({ ...prev, [selectedLocationId]: 'signal-timing' }));
                            }
                          }}
                          className={`mitigation-action-card ${!junctionPerformance ? 'disabled' : ''} ${activeMitigationKey === 'signal-timing' ? 'active' : ''} ${recommendedSimKey === 'signal-timing' ? 'recommended-row' : ''}`}
                          style={{ opacity: junctionPerformance ? 1 : 0.5, cursor: junctionPerformance ? 'pointer' : 'not-allowed' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="radio"
                                name="mitigation"
                                checked={activeMitigationKey === 'signal-timing'}
                                disabled={!junctionPerformance}
                                onChange={() => {}}
                              />
                              <div>
                                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-title)' }}>
                                  <Radio size={12} className="text-primary" /> Signal Timing Review
                                  {recommendedSimKey === 'signal-timing' && <span className="recommend-badge" style={{ fontSize: '7px', margin: 0 }}>Recommended</span>}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                  {junctionPerformance ? 'Extend green splits on saturated approaches' : 'No adjacent signal junction'}
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <span style={{
                                background: signalImpact?.applicable ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-main)',
                                color: signalImpact?.applicable ? 'var(--color-low)' : 'var(--text-secondary)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 700
                              }}>
                                {junctionPerformance ? (signalImpact?.applicable ? `Delay ${signalImpact.delayDeltaSeconds}s` : 'Limited impact') : '--'}
                              </span>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{junctionPerformance ? `Priority: ${signalImpact?.confidence || 78}/100` : '--'}</div>
                            </div>
                          </div>
                          {activeMitigationKey === 'signal-timing' && signalImpact && (
                            <p style={{ marginTop: '6px', borderTop: '1px dashed var(--border-color)', fontSize: '10px', color: 'var(--text-secondary)', paddingTop: '6px' }}>
                              <strong>Operational Impact:</strong> {signalImpact.reason}
                            </p>
                          )}
                        </div>

                        {/* Option 3: Public Transport Advisory */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'metro-riders' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'metro-riders' ? 'active' : ''} ${recommendedSimKey === 'metro-riders' ? 'recommended-row' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="radio"
                                name="mitigation"
                                checked={activeMitigationKey === 'metro-riders'}
                                onChange={() => {}}
                              />
                              <div>
                                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-title)' }}>
                                  <Train size={12} className="text-primary" /> Public Transport Advisory
                                  {recommendedSimKey === 'metro-riders' && <span className="recommend-badge" style={{ fontSize: '7px', margin: 0 }}>Recommended</span>}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Publish public transport alerts highlighting Metro and bus alternatives</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <span style={{
                                background: metroImpact?.applicable ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-main)',
                                color: metroImpact?.applicable ? 'var(--color-low)' : 'var(--text-secondary)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 700
                              }}>
                                {metroImpact?.applicable ? `Volume ${metroImpact.volumeDeltaVph} vph` : 'Limited impact'}
                              </span>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Priority: {metroImpact?.confidence || 72}/100</div>
                            </div>
                          </div>
                          {activeMitigationKey === 'metro-riders' && metroImpact && (
                            <p style={{ marginTop: '6px', borderTop: '1px dashed var(--border-color)', fontSize: '10px', color: 'var(--text-secondary)', paddingTop: '6px' }}>
                              <strong>Operational Impact:</strong> {metroImpact.reason}
                              {metroImpact.assumptions.length > 0 && <span style={{ display: 'block', fontSize: '8.5px', color: 'var(--text-muted)', marginTop: '2px' }}>* {metroImpact.assumptions[0]}</span>}
                            </p>
                          )}
                        </div>

                        {/* Option 4: Off-Peak Demand Shift */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'salik-shift' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'salik-shift' ? 'active' : ''} ${recommendedSimKey === 'salik-shift' ? 'recommended-row' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="radio"
                                name="mitigation"
                                checked={activeMitigationKey === 'salik-shift'}
                                onChange={() => {}}
                              />
                              <div>
                                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-title)' }}>
                                  <DollarSign size={12} className="text-primary" /> Off-Peak Demand Shift
                                  {recommendedSimKey === 'salik-shift' && <span className="recommend-badge" style={{ fontSize: '7px', margin: 0 }}>Recommended</span>}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Advise toll off-peak discount policy to shift discretionary commuter departures</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <span style={{
                                background: salikImpact?.applicable ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-main)',
                                color: salikImpact?.applicable ? 'var(--color-low)' : 'var(--text-secondary)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 700
                              }}>
                                {salikImpact?.applicable ? `Volume ${salikImpact.volumeDeltaVph} vph` : 'Limited impact'}
                              </span>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Priority: {salikImpact?.confidence || 60}/100</div>
                            </div>
                          </div>
                          {activeMitigationKey === 'salik-shift' && salikImpact && (
                            <p style={{ marginTop: '6px', borderTop: '1px dashed var(--border-color)', fontSize: '10px', color: 'var(--text-secondary)', paddingTop: '6px' }}>
                              <strong>Operational Impact:</strong> {salikImpact.reason}
                              {salikImpact.assumptions.length > 0 && <span style={{ display: 'block', fontSize: '8.5px', color: 'var(--text-muted)', marginTop: '2px' }}>* {salikImpact.assumptions[0]}</span>}
                            </p>
                          )}
                        </div>

                        {/* Option 5: Incident Response */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'incident-response' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'incident-response' ? 'active' : ''} ${recommendedSimKey === 'incident-response' ? 'recommended-row' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="radio"
                                name="mitigation"
                                checked={activeMitigationKey === 'incident-response'}
                                onChange={() => {}}
                              />
                              <div>
                                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-title)' }}>
                                  <Shield size={12} className="text-primary" /> Incident Response
                                  {recommendedSimKey === 'incident-response' && <span className="recommend-badge" style={{ fontSize: '7px', margin: 0 }}>Recommended</span>}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Deploy emergency responders and dynamic route advisories</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <span style={{
                                background: incidentImpact?.applicable ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-main)',
                                color: incidentImpact?.applicable ? 'var(--color-low)' : 'var(--text-secondary)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 700
                              }}>
                                {incidentImpact?.applicable ? `Speed +${incidentImpact.speedDeltaKph} kph` : 'Limited impact'}
                              </span>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Priority: {incidentImpact?.confidence || 85}/100</div>
                            </div>
                          </div>
                          {activeMitigationKey === 'incident-response' && incidentImpact && (
                            <p style={{ marginTop: '6px', borderTop: '1px dashed var(--border-color)', fontSize: '10px', color: 'var(--text-secondary)', paddingTop: '6px' }}>
                              <strong>Operational Impact:</strong> {incidentImpact.reason}
                            </p>
                          )}
                        </div>

                        {/* Option 6: Monitor Only */}
                        <div 
                          onClick={() => setMitigations(prev => ({ ...prev, [selectedLocationId]: 'monitor' }))}
                          className={`mitigation-action-card ${activeMitigationKey === 'monitor' ? 'active' : ''} ${recommendedSimKey === 'monitor' ? 'recommended-row' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="radio"
                                name="mitigation"
                                checked={activeMitigationKey === 'monitor'}
                                onChange={() => {}}
                              />
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Monitor Only</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Keep current plans active without overlays</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{
                                background: 'var(--bg-main)',
                                color: 'var(--text-muted)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '9.5px',
                                fontWeight: 700
                              }}>
                                No Impact
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {mitigatedData && (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--rta-blue-bg)', padding: '10px', borderRadius: '6px', borderLeft: '3px solid var(--rta-blue)', border: '1px solid var(--rta-blue-border)', borderLeftWidth: '3px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                              <strong>Prediction:</strong> Reduces score to <span style={{ color: 'var(--color-low)', fontWeight: 700 }}>{mitigatedData.score} ({mitigatedData.level})</span>
                            </div>
                            <button
                              onClick={() => handleOperatorDecision('approve')}
                              className="btn-action approve"
                              id="btn-apply-action"
                            >
                              <CheckCircle size={12} /> Approve Action
                            </button>
                          </div>
                          <div style={{ fontSize: '8px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
                            * Simulation estimate based on current corridor telemetry and sandbox data.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="detail-card" style={{ padding: '30px 20px', textAlign: 'center', borderStyle: 'dashed' }} id="details-placeholder-whatif">
                    <Info size={24} className="text-muted" style={{ margin: '0 auto 10px' }} />
                    <h3 style={{ fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                      No Corridor Selected
                    </h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      Select a road row from the Control Room Sidebar or Overview to compare simulation actions.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* activeTab === 'briefing' */}
            {activeTab === 'briefing' && (
              <div style={{ marginTop: '10px' }}>
                <div className="detail-card animate-fade-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="kpi-title" style={{ fontSize: '11px' }}>AI Copilot Briefing & Operator Action Console</span>
                    <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>AI Source: Mistral Studio Agent</span>
                  </div>

                  {selectedLocationId && selectedCorridor ? (
                    <div className="ai-selection-card" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-title)', marginBottom: '4px', fontSize: '11.5px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                        Active Hotspot Target
                      </div>
                      <div style={{ color: 'var(--rta-blue)', fontWeight: 700, marginBottom: '2px' }}>
                        {selectedCorridor.location_name} ({selectedCorridor.location_id})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                        <div>
                          Risk Score: <span style={{ fontWeight: 700, color: 'var(--text-title)' }}>{selectedCorridor.congestion_pressure_score}/100</span>
                        </div>
                        <div>
                          Main Cause: <span style={{ fontWeight: 600 }}>
                            {selectedCorridor.incident_affected ? 'Incident blockages' : 
                             (selectedCorridor.junction_performance && selectedCorridor.junction_performance.degree_of_saturation > 0.8) ? 'Signal Saturation & Delay' :
                             selectedCorridor.vc_ratio > 0.9 ? 'Volume near capacity' : 
                             'PM Peak Commute'}
                          </span>
                        </div>
                        <div>
                          Recommended Action: <span style={{ fontWeight: 700, color: 'var(--rta-red)' }}>{selectedRecommendation.action}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(255,159,0,0.08)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,159,0,0.15)', fontSize: '11px', color: 'var(--color-medium)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={12} />
                      <span>Select a hotspot corridor first to generate a briefing.</span>
                    </div>
                  )}

                  <button
                    onClick={handleGenerateBriefing}
                    disabled={isGeneratingBrief || !selectedLocationId}
                    className="btn-ai-generate"
                    id="btn-generate-briefing"
                    style={{ padding: '10px 14px', width: '100%', cursor: selectedLocationId ? 'pointer' : 'not-allowed' }}
                  >
                    <Cpu size={14} />
                    {isGeneratingBrief ? 'Compiling AI brief...' : 'Generate Operator Briefing'}
                  </button>

                  {isGeneratingBrief && (
                    <div className="brief-output-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                      <span className="status-dot pulsing" style={{ background: 'var(--rta-red)', width: '8px', height: '8px', marginBottom: '8px' }}></span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                        Copilot is calculating situational context details...
                      </span>
                    </div>
                  )}

                  {briefing && !isGeneratingBrief && (
                    <div className="brief-output-container animate-fade-in" id="briefing-output" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'right', fontWeight: 600 }}>
                        AI Source: {briefing.model && briefing.model.includes('Smart Fallback') ? 'Smart Fallback Mode' : 'Mistral Studio Agent'}
                      </div>
                      <div>
                        <div className="brief-section-title">Situation Summary</div>
                        <p style={{ color: 'var(--text-primary)', fontSize: '11px', lineHeight: 1.4 }}>{formatBriefField(buildSafeSituationSummary(selectedCorridor))}</p>
                      </div>

                      <div>
                        <div className="brief-section-title">Cause Explanation</div>
                        <p style={{ color: 'var(--text-primary)', fontSize: '11px', lineHeight: 1.4 }}>{formatBriefField(briefing.causeExplanation)}</p>
                      </div>

                      <div>
                        <div className="brief-section-title">Recommended Action</div>
                        <p style={{ fontWeight: 600, color: 'var(--text-title)', fontSize: '11px', lineHeight: 1.4 }}>{formatBriefField(briefing.recommendedAction)}</p>
                      </div>

                      <div className="vms-container">
                        <div className="brief-section-title">Roadside Advisory Draft</div>
                        <div className="vms-display" id="vms-preview">
                          {briefing.publicAdvisory ? formatBriefField(briefing.publicAdvisory).replace(/^Roadside [aA]dvisory [dD]raft:?\s*/i, '').replace(/['"]/g, '') : 'RTA ROADSIDE PREVIEW'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', color: 'var(--color-medium)', padding: '8px', background: 'var(--bg-main)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <Shield size={12} />
                        <span>Human operator review and explicit approval required. System will NOT trigger signals or direct vehicles.</span>
                      </div>

                      <div className="approval-bar" style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleOperatorDecision('approve')} 
                          className="btn-action approve"
                          id="btn-approve"
                          style={{ flex: 1, padding: '10px' }}
                        >
                          <ThumbsUp size={12} /> Approve Action
                        </button>
                        <button 
                          onClick={() => handleOperatorDecision('reject')} 
                          className="btn-action reject"
                          id="btn-reject"
                          style={{ flex: 1, padding: '10px' }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  {!briefing && !isGeneratingBrief && (
                    <div className="brief-output-container" style={{ textAlign: 'center', padding: '30px 10px', borderStyle: 'dashed', background: 'var(--bg-main)' }}>
                      <Info size={20} className="text-muted" style={{ margin: '0 auto 8px' }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        AI-generated briefs and official roadside advisory text drafts will display here once generated.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </section>

        {/* Column 3: Side-by-Side Context Panels & Operator Logs */}
        <section className="panel" id="panel-briefing" style={{ overflowY: 'auto' }}>
          <div className="panel-header">
            <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {activeTab === 'overview' && <><History size={14} className="text-muted" /> Operations Logs</>}
              {activeTab === 'map' && <><Compass size={14} className="text-muted" /> Active Risk Table</>}
              {activeTab === 'forecast' && <><Cpu size={14} className="text-muted" /> Selected Hotspot Context</>}
              {activeTab === 'whatif' && <><Sliders size={14} className="text-muted" /> Simulation Outcomes</>}
              {activeTab === 'briefing' && <><Shield size={14} className="text-muted" /> Approved Prevention Actions</>}
            </h2>
          </div>

          <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {activeTab === 'overview' && (
              <>
                {/* Operator decision log */}
                {approvedImpact && (
                  <div className="animate-fade-in" style={{ 
                    background: 'rgba(16, 185, 129, 0.08)', 
                    border: '1px solid rgba(16, 185, 129, 0.25)', 
                    padding: '10px 12px', 
                    borderRadius: '6px'
                  }} id="prevention-impact-summary">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-low)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={12} /> Prevention Impact Summary
                      </span>
                      <span className="badge-risk low" style={{ fontSize: '8px', padding: '1px 5px', color: 'var(--color-low)', border: '1px solid var(--color-low)', background: 'transparent' }}>
                        {approvedImpact.status}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '9.5px', color: 'var(--text-primary)' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Before Risk Score:</span> {approvedImpact.beforeScore} / {approvedImpact.beforeLevel}
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Approved Action:</span> {approvedImpact.approvedAction}
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Expected Impact:</span> {approvedImpact.expectedImpact}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span className="kpi-title" style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <History size={10} /> Operator Decision Log
                  </span>
                  <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>SESSION-LOG</span>
                </div>

                <div className="log-table-container">
                  <table className="log-table" id="decision-log-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Loc</th>
                        <th>Action Decision Details</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisionLog.length > 0 ? (
                        decisionLog.map((log, i) => (
                          <tr key={i}>
                            <td>{log.timestamp}</td>
                            <td style={{ fontWeight: 700 }}>{log.location}</td>
                            <td>{log.description}</td>
                            <td style={{ 
                              color: log.status === 'APPROVED' ? 'var(--color-low)' : 
                                     log.status === 'CANCELLED' ? 'var(--color-critical)' : 'var(--color-medium)',
                              fontWeight: 700
                            }}>
                              {log.status}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '10px' }}>
                            No operator actions logged.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'map' && (
              <>
                {/* Hotspot list side-by-side with map */}
                <div className="detail-card" style={{ padding: 0 }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="kpi-title" style={{ fontSize: '10px' }}>Top Congestion Risks (Current Hour)</span>
                  </div>

                  <div>
                    <table className="hotspot-table">
                      <thead>
                        <tr>
                          <th>Road / Corridor</th>
                          <th>Risk Score</th>
                          <th>Recommended Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCorridors.map(cor => {
                          const rec = getRecommendedActionForCorridor(cor);
                          return (
                            <tr
                              key={cor.location_id}
                              onClick={() => setSelectedLocationId(cor.location_id)}
                              className={`hotspot-row ${selectedLocationId === cor.location_id ? 'selected' : ''}`}
                            >
                              <td style={{ fontWeight: 600 }}>
                                {cor.location_id} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '9px' }}>({cor.location_name})</span>
                              </td>
                              <td style={{ fontWeight: 700 }}>
                                <span className={`badge-risk ${cor.risk_level.toLowerCase()}`}>
                                  {cor.congestion_pressure_score}
                                </span>
                              </td>
                              <td style={{ color: 'var(--rta-blue)', fontWeight: 600, fontSize: '9.5px' }}>
                                {rec.action}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'forecast' && (
              <>
                {selectedLocationId && selectedCorridor ? (
                  <div className="detail-card animate-fade-in" style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-title)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '8px' }}>
                      Explainable AI Forecast
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Predictive Window:</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>Next 30–60 Minutes</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>AI Confidence Level:</div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--rta-blue)' }}>{selectedCorridor.forecast?.forecast_confidence}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Contributing Factors:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {selectedCorridor.forecast?.topContributingFeatures?.map((f: string, idx: number) => (
                            <span key={idx} className="cause-tag" style={{ background: 'var(--rta-blue-bg)', color: 'var(--rta-blue)', border: '1px solid var(--rta-blue-border)', fontSize: '8.5px', padding: '2px 6px' }}>
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    No corridor selected.
                  </div>
                )}
              </>
            )}

            {activeTab === 'whatif' && (
              <>
                {mitigatedData && (
                  <div className="detail-card animate-fade-in" style={{ padding: '12px', background: 'var(--rta-blue-bg)', border: '1px solid var(--rta-blue-border)', borderLeft: '3px solid var(--rta-blue)', borderLeftWidth: '3px' }}>
                    <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-title)', marginBottom: '4px' }}>
                      Mitigated Scenario Target
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      Applying **{activeMitigationKey}** is projected to reduce the corridor congestion score to <span style={{ color: 'var(--color-low)', fontWeight: 700 }}>{mitigatedData.score} ({mitigatedData.level})</span>.
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span className="kpi-title" style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <History size={10} /> Operator Decision Log
                  </span>
                  <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>SESSION-LOG</span>
                </div>

                <div className="log-table-container">
                  <table className="log-table" id="decision-log-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Loc</th>
                        <th>Action Decision Details</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisionLog.length > 0 ? (
                        decisionLog.map((log, i) => (
                          <tr key={i}>
                            <td>{log.timestamp}</td>
                            <td style={{ fontWeight: 700 }}>{log.location}</td>
                            <td>{log.description}</td>
                            <td style={{ 
                              color: log.status === 'APPROVED' ? 'var(--color-low)' : 
                                     log.status === 'CANCELLED' ? 'var(--color-critical)' : 'var(--color-medium)',
                              fontWeight: 700
                            }}>
                              {log.status}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '10px' }}>
                            No operator actions logged.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'briefing' && (
              <>
                {approvedImpact && (
                  <div className="animate-fade-in" style={{ 
                    background: 'rgba(16, 185, 129, 0.08)', 
                    border: '1px solid rgba(16, 185, 129, 0.25)', 
                    padding: '10px 12px', 
                    borderRadius: '6px' 
                  }} id="prevention-impact-summary">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-low)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={12} /> Prevention Impact Summary
                      </span>
                      <span className="badge-risk low" style={{ fontSize: '8px', padding: '1px 5px', color: 'var(--color-low)', border: '1px solid var(--color-low)', background: 'transparent' }}>
                        {approvedImpact.status}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '9.5px', color: 'var(--text-primary)' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Before Risk Score:</span> {approvedImpact.beforeScore} / {approvedImpact.beforeLevel}
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Approved Action:</span> {approvedImpact.approvedAction}
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Expected Impact:</span> {approvedImpact.expectedImpact}
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Main Reason:</span> {approvedImpact.mainReason}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span className="kpi-title" style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <History size={10} /> Operator Decision Log
                  </span>
                  <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>SESSION-LOG</span>
                </div>

                <div className="log-table-container">
                  <table className="log-table" id="decision-log-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Loc</th>
                        <th>Action Decision Details</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisionLog.length > 0 ? (
                        decisionLog.map((log, i) => (
                          <tr key={i}>
                            <td>{log.timestamp}</td>
                            <td style={{ fontWeight: 700 }}>{log.location}</td>
                            <td>{log.description}</td>
                            <td style={{ 
                              color: log.status === 'APPROVED' ? 'var(--color-low)' : 
                                     log.status === 'CANCELLED' ? 'var(--color-critical)' : 'var(--color-medium)',
                              fontWeight: 700
                            }}>
                              {log.status}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '10px' }}>
                            No operator actions logged.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
