export const locationMapPoints = [
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

export const projectCoords = (lat: number, lng: number) => {
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

export const getOffset = (id: string) => {
  if (id.includes('_N')) return { dx: -3, dy: -3 };
  if (id.includes('_S')) return { dx: 3, dy: 3 };
  if (id.includes('_E')) return { dx: 3, dy: -2 };
  if (id.includes('_W')) return { dx: -3, dy: 2 };
  return { dx: 0, dy: 0 };
};
