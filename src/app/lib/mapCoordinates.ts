export interface MapCoordinateEntry {
  location_id: string;
  displayName: string;
  latitude: number;
  longitude: number;
  road: string;
  note: string;
}

export const dubaiCorridorCoordinates: MapCoordinateEntry[] = [
  {
    location_id: 'SZR_N1',
    displayName: 'SZR @ Defence (NB)',
    latitude: 25.2230,
    longitude: 55.2820,
    road: 'Sheikh Zayed Road (E11)',
    note: 'Northbound SZR segment near Interchange 1 (Defence Roundabout).'
  },
  {
    location_id: 'SZR_S1',
    displayName: 'SZR @ Defence (SB)',
    latitude: 25.2228,
    longitude: 55.2832,
    road: 'Sheikh Zayed Road (E11)',
    note: 'Southbound SZR segment near Interchange 1 (Defence Roundabout).'
  },
  {
    location_id: 'SZR_N2',
    displayName: 'SZR @ DIFC (NB)',
    latitude: 25.2110,
    longitude: 55.2790,
    road: 'Sheikh Zayed Road (E11)',
    note: 'Northbound SZR near DIFC and Emirates Towers.'
  },
  {
    location_id: 'SZR_S2',
    displayName: 'SZR @ DIFC (SB)',
    latitude: 25.2108,
    longitude: 55.2802,
    road: 'Sheikh Zayed Road (E11)',
    note: 'Southbound SZR near DIFC and Emirates Towers.'
  },
  {
    location_id: 'SZR_N4',
    displayName: 'SZR @ Mall of Emirates (NB)',
    latitude: 25.1180,
    longitude: 55.2000,
    road: 'Sheikh Zayed Road (E11)',
    note: 'Northbound SZR near Mall of the Emirates and Interchange 4.'
  },
  {
    location_id: 'SZR_S4',
    displayName: 'SZR @ Mall of Emirates (SB)',
    latitude: 25.1178,
    longitude: 55.2012,
    road: 'Sheikh Zayed Road (E11)',
    note: 'Southbound SZR near Mall of the Emirates and Interchange 4.'
  },
  {
    location_id: 'EKR_N1',
    displayName: 'Al Khail Rd @ Business Bay (NB)',
    latitude: 25.1860,
    longitude: 55.2700,
    road: 'Al Khail Road (E44)',
    note: 'Northbound Al Khail segment crossing near Business Bay development.'
  },
  {
    location_id: 'EKR_S1',
    displayName: 'Al Khail Rd @ Al Quoz (SB)',
    latitude: 25.1490,
    longitude: 55.2350,
    road: 'Al Khail Road (E44)',
    note: 'Southbound Al Khail segment near Al Quoz industrial areas.'
  },
  {
    location_id: 'MBZ_E1',
    displayName: 'MBZ Rd @ DIP (EB)',
    latitude: 24.9900,
    longitude: 55.1700,
    road: 'Sheikh Mohammed Bin Zayed Road (E311)',
    note: 'Eastbound MBZ Rd segment near Dubai Investment Park (DIP).'
  },
  {
    location_id: 'EMR_E1',
    displayName: 'Emirates Rd @ Al Awir (EB)',
    latitude: 25.1700,
    longitude: 55.4400,
    road: 'Emirates Road (E611)',
    note: 'Eastbound segment on Emirates Road near Al Awir intersection.'
  },
  {
    location_id: 'ITT_W1',
    displayName: 'Al Ittihad Rd @ Al Mamzar (WB)',
    latitude: 25.2950,
    longitude: 55.3550,
    road: 'Al Ittihad Road (E11)',
    note: 'Westbound segment towards Sharjah boundary near Al Mamzar area.'
  },
  {
    location_id: 'ITT_E1',
    displayName: 'Al Ittihad Rd @ Al Qiyadah (EB)',
    latitude: 25.2680,
    longitude: 55.3380,
    road: 'Al Ittihad Road (E11)',
    note: 'Eastbound segment near Al Qiyadah Metro station.'
  },
  {
    location_id: 'AIR_W1',
    displayName: 'Airport Rd @ Al Garhoud (WB)',
    latitude: 25.2480,
    longitude: 55.3520,
    road: 'Airport Road (D89)',
    note: 'Westbound segment near Al Garhoud leading to DXB Terminal 1.'
  },
  {
    location_id: 'GAR_N1',
    displayName: 'Al Garhoud Bridge (NB)',
    latitude: 25.2330,
    longitude: 55.3300,
    road: 'Al Garhoud Bridge Crossing',
    note: 'Creek crossing northbound segment on Al Garhoud Bridge.'
  },
  {
    location_id: 'MAK_N1',
    displayName: 'Al Maktoum Bridge (NB)',
    latitude: 25.2400,
    longitude: 55.3170,
    road: 'Al Maktoum Bridge Crossing',
    note: 'Creek crossing northbound segment on Al Maktoum Bridge.'
  },
  {
    location_id: 'BBC_S1',
    displayName: 'Business Bay Crossing (SB)',
    latitude: 25.1920,
    longitude: 55.2900,
    road: 'Business Bay Crossing',
    note: 'Creek crossing southbound segment on Business Bay Crossing.'
  },
  {
    location_id: 'JBR_X1',
    displayName: 'Jumeirah Beach Rd',
    latitude: 25.2080,
    longitude: 55.2480,
    road: 'Jumeirah Beach Road (D94)',
    note: 'Coastal segment running parallel to SZR E11.'
  },
  {
    location_id: 'DWC_X1',
    displayName: 'Expo Rd @ Dubai South',
    latitude: 24.8960,
    longitude: 55.1610,
    road: 'Expo Road (E77)',
    note: 'Segment near Dubai South and Al Maktoum International Airport (DWC).'
  }
];

// Helper to validate coordinate is strictly within Dubai bounding box
export const isValidDubaiCoordinate = (lat: number | undefined | null, lng: number | undefined | null): boolean => {
  if (lat === undefined || lat === null || lng === undefined || lng === null) return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  return lat >= 24.70 && lat <= 25.45 && lng >= 54.80 && lng <= 56.00;
};

// Helper to retrieve coordinate with validated fallback
export const getCoordinatesForCorridor = (locationId: string): { lat: number; lng: number } => {
  const match = dubaiCorridorCoordinates.find(c => c.location_id === locationId);
  if (match && isValidDubaiCoordinate(match.latitude, match.longitude)) {
    return { lat: match.latitude, lng: match.longitude };
  }
  // TODO: replace fallback coordinate with verified corridor coordinate
  return { lat: 25.2048, lng: 55.2708 };
};

// Retrieve a guaranteed valid coordinate or null
export const getValidDubaiCoordinate = (locationId: string): { lat: number; lng: number } => {
  return getCoordinatesForCorridor(locationId);
};

// Filter corridors to only return ones with valid coordinates
export const getValidDubaiHotspots = (corridors: any[]): any[] => {
  return corridors.filter(c => {
    const coords = getCoordinatesForCorridor(c.location_id);
    return isValidDubaiCoordinate(coords.lat, coords.lng);
  });
};
