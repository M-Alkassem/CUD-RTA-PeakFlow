import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

// Root directory data path
const DATA_DIR = path.join(process.cwd(), 'data');

// Lazy-loaded cache variables
let locationsReference: any[] | null = null;
let calendarContext: any[] | null = null;
let incidentsLog: any[] | null = null;
let trafficHourly2024: any[] | null = null;
let signalPerformance2024: any[] | null = null;
let signalTimingPlans: any[] | null = null;
let salikToll2025: any[] | null = null;
let metroRidershipDaily: any[] | null = null;

/**
 * Utility function to read and parse CSV from project data directory
 */
function readCSV(filename: string): any[] {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`RTA PeakFlow DataLoader Error: File not found at ${filePath}`);
    return [];
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = Papa.parse(fileContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });
    return parsed.data;
  } catch (error) {
    console.error(`RTA PeakFlow DataLoader Error parsing ${filename}:`, error);
    return [];
  }
}

// Module-level lazy getters

export function getLocationsReference(): any[] {
  if (!locationsReference) {
    console.log('Lazy loading locations_reference.csv...');
    locationsReference = readCSV('locations_reference.csv');
  }
  return locationsReference;
}

export function getCalendarContext(): any[] {
  if (!calendarContext) {
    console.log('Lazy loading calendar_context.csv...');
    calendarContext = readCSV('calendar_context.csv');
  }
  return calendarContext;
}

export function getIncidentsLog(): any[] {
  if (!incidentsLog) {
    console.log('Lazy loading incidents_log.csv...');
    incidentsLog = readCSV('incidents_log.csv');
  }
  return incidentsLog;
}

export function getTrafficHourly2024(): any[] {
  if (!trafficHourly2024) {
    console.log('Lazy loading traffic_volume_hourly_2024.csv...');
    trafficHourly2024 = readCSV('traffic_volume_hourly_2024.csv');
  }
  return trafficHourly2024;
}

export function getSignalPerformance2024(): any[] {
  if (!signalPerformance2024) {
    console.log('Lazy loading signal_performance_hourly_2024.csv...');
    signalPerformance2024 = readCSV('signal_performance_hourly_2024.csv');
  }
  return signalPerformance2024;
}

export function getSignalTimingPlans(): any[] {
  if (!signalTimingPlans) {
    console.log('Lazy loading signal_timing_plans.csv...');
    signalTimingPlans = readCSV('signal_timing_plans.csv');
  }
  return signalTimingPlans;
}

export function getSalikToll2025(): any[] {
  if (!salikToll2025) {
    console.log('Lazy loading salik_toll_hourly_2025.csv...');
    salikToll2025 = readCSV('salik_toll_hourly_2025.csv');
  }
  return salikToll2025;
}

export function getMetroRidershipDaily(): any[] {
  if (!metroRidershipDaily) {
    console.log('Lazy loading metro_ridership_daily.csv...');
    metroRidershipDaily = readCSV('metro_ridership_daily.csv');
  }
  return metroRidershipDaily;
}
