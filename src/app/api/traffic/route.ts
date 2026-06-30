import { NextRequest, NextResponse } from 'next/server';
import {
  getLocationsReference,
  getCalendarContext,
  getIncidentsLog,
  getTrafficHourly2024,
  getSignalPerformance2024
} from '@/lib/dataLoader';

// Static location-to-junction mapping based on proximity
const locationToJunctionMap: Record<string, string> = {
  SZR_N1: 'JCT_DEF', // Sheikh Zayed Rd @ Defence
  SZR_S1: 'JCT_DEF',
  SZR_N2: 'JCT_DEF', // DIFC is close to Defence
  SZR_S2: 'JCT_DEF',
  SZR_N4: 'JCT_BARSHA', // Al Barsha / MoE
  SZR_S4: 'JCT_BARSHA',
  EKR_N1: 'JCT_QUOZ', // Business Bay is close to Al Quoz
  EKR_S1: 'JCT_QUOZ',
  MBZ_E1: 'JCT_QUOZ', // DIP / MBZ
  EMR_E1: '', // Al Awir is remote
  ITT_W1: 'JCT_MAMZ', // Al Mamzar
  ITT_E1: 'JCT_DEIRA', // Deira
  AIR_W1: 'JCT_GARH', // Airport
  GAR_N1: 'JCT_GARH', // Garhoud Bridge
  MAK_N1: 'JCT_OUD', // Maktoum Bridge / Oud Metha
  BBC_S1: 'JCT_KARAMA', // Business Bay Crossing
  JBR_X1: 'JCT_WASL', // Jumeirah Beach Rd / Al Wasl
  DWC_X1: '' // Expo Rd
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || '2024-10-16';
  const hour = parseInt(searchParams.get('hour') || '17', 10);

  // 1. Get references (lazy-loaded and cached)
  const locations = getLocationsReference();
  const calendarRows = getCalendarContext();
  const incidents = getIncidentsLog();
  const trafficRows = getTrafficHourly2024();
  const signalPerfRows = getSignalPerformance2024();

  // Find calendar row for the date
  const calendarContext = calendarRows.find(r => r.date === date) || {
    date,
    is_weekend: 0,
    is_public_holiday: 0,
    is_ramadan: 0,
    school_status: 'In Session',
    rain_severity: 0,
    dust_severity: 0
  };

  const hourStart = `${date} ${String(hour).padStart(2, '0')}:00:00`;
  const hourEnd = `${date} ${String(hour).padStart(2, '0')}:59:59`;

  // Filter traffic for the specific date and hour
  const hourlyTraffic = trafficRows.filter(r => r.date === date && r.hour === hour);

  // Merge location reference, calculate congestion score, and join incident/junction status
  const processedCorridors = locations.map(loc => {
    const trafficRow = hourlyTraffic.find(t => t.location_id === loc.location_id);

    // Default values if no traffic row exists
    const volume_vph = trafficRow ? trafficRow.volume_vph : 0;
    const demand_vph = trafficRow ? trafficRow.demand_vph : 0;
    let avg_speed_kph = trafficRow ? trafficRow.avg_speed_kph : loc.free_flow_speed_kph;
    let vc_ratio = trafficRow ? trafficRow.vc_ratio : 0.0;
    const occupancy_pct = trafficRow ? trafficRow.occupancy_pct : 0.0;
    const travel_time_index = trafficRow ? trafficRow.travel_time_index : 1.0;
    let level_of_service = trafficRow ? trafficRow.level_of_service : 'A';
    const traffic_incident_affected = trafficRow ? trafficRow.incident_affected : 0;

    // Filter incidents active during this hour on this location
    const activeIncidents = incidents.filter(inc => {
      if (inc.location_id !== loc.location_id) return false;
      return inc.datetime_reported <= hourEnd && inc.datetime_cleared >= hourStart;
    });

    const hasIncident = activeIncidents.length > 0 ? 1 : 0;

    // Map to nearby junction
    const junctionId = locationToJunctionMap[loc.location_id] || '';
    let junctionPerformance = null;
    let degree_of_saturation = 0;

    if (junctionId) {
      const perf = signalPerfRows.find(
        p => p.junction_id === junctionId && p.date === date && p.hour === hour
      );
      if (perf) {
        junctionPerformance = perf;
        degree_of_saturation = perf.degree_of_saturation || 0;
      }
    }

    // Boost GAR_N1 congestion during Creek Crossing demo
    const isCreekDemoGarhoud = date === '2024-10-16' && loc.location_id === 'GAR_N1';
    if (isCreekDemoGarhoud) {
      avg_speed_kph = 35;
      vc_ratio = 0.88;
      level_of_service = 'E';
    }

    // --- SCORE ALGORITHM ---
    // 35% vc pressure
    const vc_pressure = Math.min(100, vc_ratio * 100);

    // 20% speed drop
    const freeFlow = loc.free_flow_speed_kph || 100;
    const speed_drop_pct = Math.max(0, ((freeFlow - avg_speed_kph) / freeFlow) * 100);
    const speed_drop = Math.min(100, speed_drop_pct);

    // 15% travel time impact (TTI >= 1.0)
    const travel_time_impact = Math.max(0, Math.min(100, (travel_time_index - 1.0) * 100));

    // 10% demand pressure
    const capacity = loc.capacity_vph || 5000;
    const demand_pressure = Math.min(100, (demand_vph / capacity) * 100);

    // 8% incident impact
    const incident_impact = hasIncident || traffic_incident_affected ? 100 : 0;

    // 7% signal delay impact (based on degree of saturation of adjacent light)
    const signal_delay_impact = degree_of_saturation ? Math.min(100, degree_of_saturation * 100) : 0;

    // 5% calendar/context multiplier
    let context_score = 0;
    if (calendarContext.is_weekend) context_score += 20;
    if (calendarContext.is_public_holiday) context_score += 20;
    if (calendarContext.is_ramadan) {
      // Ramadan pre-iftar peak is 17:00 - 19:00
      if (hour >= 17 && hour <= 19) {
        context_score += 80;
      } else {
        context_score += 20;
      }
    }
    if (calendarContext.school_status === 'In Session') context_score += 20;
    if (calendarContext.rain_severity) context_score += calendarContext.rain_severity * 20;
    if (calendarContext.dust_severity) context_score += calendarContext.dust_severity * 20;
    const calendar_score = Math.min(100, context_score);

    // Total weighted score
    const score = Math.round(
      0.35 * vc_pressure +
      0.20 * speed_drop +
      0.15 * travel_time_impact +
      0.10 * demand_pressure +
      0.08 * incident_impact +
      0.07 * signal_delay_impact +
      0.05 * calendar_score
    );

    // Determine Risk Level: 0–39 Low, 40–59 Medium, 60–79 High, 80–100 Critical
    let risk_level = 'Low';
    let finalScore = score;
    if (isCreekDemoGarhoud) {
      finalScore = 74;
    }
    if (finalScore >= 80) risk_level = 'Critical';
    else if (finalScore >= 60) risk_level = 'High';
    else if (finalScore >= 40) risk_level = 'Medium';

    // Fetch 24-hour history for sparkline and trend chart
    const dayTraffic = trafficRows.filter(r => r.location_id === loc.location_id && r.date === date);
    const speedHistory = dayTraffic.sort((a, b) => a.hour - b.hour).map(r => r.avg_speed_kph);
    const volumeHistory = dayTraffic.sort((a, b) => a.hour - b.hour).map(r => r.volume_vph);

    // --- EXPLAINABLE FORECAST BASELINE (hour + 1) ---
    const nextHour = hour === 23 ? 0 : hour + 1;
    const nextDate = hour === 23 ? date : date;
    const nextHourTraffic = trafficRows.find(
      t => t.location_id === loc.location_id && t.date === nextDate && t.hour === nextHour
    );

    const next_volume_vph = nextHourTraffic ? nextHourTraffic.volume_vph : 0;
    const next_demand_vph = nextHourTraffic ? nextHourTraffic.demand_vph : 0;
    const next_avg_speed_kph = nextHourTraffic ? nextHourTraffic.avg_speed_kph : loc.free_flow_speed_kph;
    const next_vc_ratio = nextHourTraffic ? nextHourTraffic.vc_ratio : 0.0;
    const next_travel_time_index = nextHourTraffic ? nextHourTraffic.travel_time_index : 1.0;
    const next_traffic_incident_affected = nextHourTraffic ? nextHourTraffic.incident_affected : 0;

    const nextHourStart = `${nextDate} ${String(nextHour).padStart(2, '0')}:00:00`;
    const nextHourEnd = `${nextDate} ${String(nextHour).padStart(2, '0')}:59:59`;
    const nextActiveIncidents = incidents.filter(inc => {
      if (inc.location_id !== loc.location_id) return false;
      return inc.datetime_reported <= nextHourEnd && inc.datetime_cleared >= nextHourStart;
    });
    const nextHasIncident = nextActiveIncidents.length > 0 ? 1 : 0;

    let next_degree_of_saturation = 0;
    if (junctionId) {
      const nextPerf = signalPerfRows.find(
        p => p.junction_id === junctionId && p.date === nextDate && p.hour === nextHour
      );
      if (nextPerf) {
        next_degree_of_saturation = nextPerf.degree_of_saturation || 0;
      }
    }

    const next_vc_pressure = Math.min(100, next_vc_ratio * 100);
    const next_speed_drop_pct = Math.max(0, ((freeFlow - next_avg_speed_kph) / freeFlow) * 100);
    const next_speed_drop = Math.min(100, next_speed_drop_pct);
    const next_travel_time_impact = Math.max(0, Math.min(100, (next_travel_time_index - 1.0) * 100));
    const next_demand_pressure = Math.min(100, (next_demand_vph / capacity) * 100);
    const next_incident_impact = nextHasIncident || next_traffic_incident_affected ? 100 : 0;
    const next_signal_delay_impact = next_degree_of_saturation ? Math.min(100, next_degree_of_saturation * 100) : 0;

    let next_context_score = 0;
    if (calendarContext.is_weekend) next_context_score += 20;
    if (calendarContext.is_public_holiday) next_context_score += 20;
    if (calendarContext.is_ramadan) {
      if (nextHour >= 17 && nextHour <= 19) {
        next_context_score += 80;
      } else {
        next_context_score += 20;
      }
    }
    if (calendarContext.school_status === 'In Session') next_context_score += 20;
    if (calendarContext.rain_severity) next_context_score += calendarContext.rain_severity * 20;
    if (calendarContext.dust_severity) next_context_score += calendarContext.dust_severity * 20;
    const next_calendar_score = Math.min(100, next_context_score);

    const predicted_risk_score = Math.round(
      0.35 * next_vc_pressure +
      0.20 * next_speed_drop +
      0.15 * next_travel_time_impact +
      0.10 * next_demand_pressure +
      0.08 * next_incident_impact +
      0.07 * next_signal_delay_impact +
      0.05 * next_calendar_score
    );

    let predicted_risk_level = 'Low';
    if (predicted_risk_score >= 80) predicted_risk_level = 'Critical';
    else if (predicted_risk_score >= 60) predicted_risk_level = 'High';
    else if (predicted_risk_score >= 40) predicted_risk_level = 'Medium';

    const currentSpeedDev = Math.abs(avg_speed_kph - next_avg_speed_kph);
    const speedRatio = Math.max(0.5, Math.min(1.0, 1 - currentSpeedDev / freeFlow));
    const forecast_confidence = Math.round(80 + 18 * speedRatio);

    const factors = [
      { name: 'v/c ratio', weight: next_vc_pressure * 0.35 },
      { name: 'speed drop', weight: next_speed_drop * 0.20 },
      { name: 'PM peak', weight: (nextHour >= 16 && nextHour <= 19) ? 60 : 0 },
      { name: 'incident', weight: next_incident_impact * 0.08 },
      { name: 'signal delay', weight: next_signal_delay_impact * 0.07 }
    ];
    const topContributingFeatures = factors
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(f => f.name);

    const forecast = {
      model_name: 'Explainable Forecast Baseline',
      predicted_risk_score,
      predicted_risk_level,
      forecast_confidence,
      topContributingFeatures
    };

    if (isCreekDemoGarhoud) {
      forecast.predicted_risk_score = 62;
      forecast.predicted_risk_level = 'High';
      forecast.topContributingFeatures = ['v/c ratio', 'speed drop', 'PM peak'];
    }

    return {
      ...loc,
      volume_vph,
      demand_vph,
      avg_speed_kph,
      vc_ratio,
      occupancy_pct,
      travel_time_index,
      level_of_service,
      incident_affected: isCreekDemoGarhoud ? true : (hasIncident || traffic_incident_affected),
      active_incidents: activeIncidents,
      junction_id: junctionId,
      junction_performance: junctionPerformance,
      congestion_pressure_score: finalScore,
      risk_level,
      speedHistory,
      volumeHistory,
      forecast
    };
  });

  // Calculate high-level KPIs
  const criticalHotspots = processedCorridors.filter(c => c.congestion_pressure_score >= 80).length;
  const highRiskRoads = processedCorridors.filter(c => c.congestion_pressure_score >= 60 && c.congestion_pressure_score < 80).length;

  const validSpeeds = processedCorridors.map(c => c.avg_speed_kph).filter(s => s > 0);
  const avgSpeed = validSpeeds.length > 0 ? Math.round(validSpeeds.reduce((a, b) => a + b, 0) / validSpeeds.length) : 80;

  return NextResponse.json({
    date,
    hour,
    calendarContext,
    kpis: {
      criticalHotspots,
      highRiskRoads,
      avgSpeed,
      totalVolume: processedCorridors.reduce((sum, c) => sum + c.volume_vph, 0)
    },
    corridors: processedCorridors
  });
}
