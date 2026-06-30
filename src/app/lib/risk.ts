export const getRiskWording = (score: number): string => {
  const n = Number(score || 0);
  if (n >= 80) return "critical congestion risk";
  if (n >= 60) return "high congestion risk";
  if (n >= 40) return "moderate congestion pressure";
  return "low congestion pressure";
};

export const buildSafeSituationSummary = (selectedHotspot: any): string => {
  if (!selectedHotspot) return '';
  const location = selectedHotspot.location_name || selectedHotspot.locationName || selectedHotspot.location || "Selected corridor";
  const score = Number(selectedHotspot.congestion_pressure_score || selectedHotspot.riskScore || selectedHotspot.risk_score || 0);
  return `Congestion pressure is rising at ${location}. Current Risk Score is ${score}/100, indicating ${getRiskWording(score)} for the next 30–60 minutes.`;
};
