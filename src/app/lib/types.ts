export interface Incident {
  incident_id: string;
  incident_type: string;
  severity: string;
  lanes_blocked: number;
  duration_min: number;
  weather_condition: string;
}

export interface Corridor {
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

export interface Scenario {
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

export interface BriefingResponse {
  model?: string;
  causeExplanation: string;
  recommendedAction: string;
  publicAdvisory?: string;
}

export interface WhatIfImpact {
  actionName: string;
  beforeRisk: number;
  afterRisk: number;
  beforeLevel: string;
  afterLevel: string;
  speedDeltaKph: number;
  delayDeltaSeconds: number;
  volumeDeltaVph: number;
  confidence: number;
  reason: string;
  applicable: boolean;
  assumptions: string[];
}

export interface DecisionLogEntry {
  timestamp: string;
  location: string;
  description: string;
  status: string;
  operator: string;
}

export interface ApprovedImpact {
  beforeScore: number;
  beforeLevel: string;
  approvedAction: string;
  expectedImpact: string;
  mainReason: string;
  status: string;
}

export type ThemeMode = 'dark' | 'light';
export type ActiveTab = 'overview' | 'map' | 'forecast' | 'whatif' | 'briefing';
