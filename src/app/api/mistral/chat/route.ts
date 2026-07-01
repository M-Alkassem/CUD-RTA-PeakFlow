import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getLocationsReference,
  getCalendarContext,
  getIncidentsLog,
  getTrafficHourly2024,
  getSignalPerformance2024,
  getSignalTimingPlans,
  getSalikToll2025,
  getMetroRidershipDaily
} from '@/lib/dataLoader';

// Env helper to read Mistral Key
const getEnvVariable = (key: string): string | undefined => {
  if (process.env[key]) {
    const val = process.env[key]?.trim();
    if (val && val !== 'undefined') return val;
  }
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const [k, ...vParts] = trimmed.split('=');
        if (k.trim() === key) {
          const val = vParts.join('=').trim();
          if (val && val !== 'undefined') return val;
        }
      }
    }
  } catch (err) {
    console.error('Error reading env in chat:', err);
  }
  return undefined;
};

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const query = message.toLowerCase();
    const contextBlocks: string[] = [];

    // 1. Locations Reference search
    const locations = getLocationsReference();
    const matchedLocs = locations.filter(loc => 
      query.includes(loc.location_id.toLowerCase()) || 
      query.includes(loc.road_name.toLowerCase()) ||
      query.includes(loc.area.toLowerCase())
    );
    if (matchedLocs.length > 0) {
      contextBlocks.push(`Locations details found:\n${JSON.stringify(matchedLocs.slice(0, 3), null, 2)}`);
    } else {
      contextBlocks.push(`Known locations reference list: ${locations.map(l => `${l.location_id} (${l.road_name} direction ${l.direction})`).join(', ')}`);
    }

    // 2. Incidents Log search
    if (query.includes('incident') || query.includes('accident') || query.includes('crash') || query.includes('blocked') || query.includes('weather') || query.includes('rain')) {
      const incidents = getIncidentsLog();
      // Find incidents matching query terms
      const matchedIncidents = incidents.filter(inc => 
        query.includes(inc.location_id.toLowerCase()) ||
        query.includes(inc.incident_type?.toLowerCase() || '') ||
        query.includes(inc.weather_condition?.toLowerCase() || '')
      );
      if (matchedIncidents.length > 0) {
        contextBlocks.push(`Matched Incidents Log entries:\n${JSON.stringify(matchedIncidents.slice(0, 5), null, 2)}`);
      } else {
        contextBlocks.push(`Recent active incidents: ${JSON.stringify(incidents.slice(0, 3), null, 2)}`);
      }
    }

    // 3. Traffic Hourly Volume/Speed search
    if (query.includes('volume') || query.includes('speed') || query.includes('v/c') || query.includes('capacity') || query.includes('flow') || query.includes('travel time') || query.includes('tti')) {
      const traffic = getTrafficHourly2024();
      let matchedTraffic = traffic;
      // Filter by location if specified
      const locId = locations.find(l => query.includes(l.location_id.toLowerCase()) || query.includes(l.road_name.toLowerCase()))?.location_id;
      if (locId) {
        matchedTraffic = traffic.filter(t => t.location_id === locId);
      }
      
      // Calculate high-level stats from matching records
      const totalRecords = matchedTraffic.length;
      if (totalRecords > 0) {
        const avgSpeed = Math.round(matchedTraffic.reduce((sum, r) => sum + (r.avg_speed_kph || 0), 0) / totalRecords);
        const avgVolume = Math.round(matchedTraffic.reduce((sum, r) => sum + (r.volume_vph || 0), 0) / totalRecords);
        const maxVolumeRow = matchedTraffic.reduce((max, r) => (r.volume_vph || 0) > (max.volume_vph || 0) ? r : max, matchedTraffic[0]);
        const avgVc = (matchedTraffic.reduce((sum, r) => sum + (r.vc_ratio || 0), 0) / totalRecords).toFixed(2);

        contextBlocks.push(`Traffic Volume Stats (from 2024 hourly dataset):\n` +
          `- Filtered Location: ${locId || 'All locations'}\n` +
          `- Total hourly records analysed: ${totalRecords}\n` +
          `- Average Speed: ${avgSpeed} kph\n` +
          `- Average Volume: ${avgVolume} vph\n` +
          `- Average V/C Ratio: ${avgVc}\n` +
          `- Peak Volume recorded: ${maxVolumeRow.volume_vph} vph at hour ${maxVolumeRow.hour} (Date: ${maxVolumeRow.date}, Speed: ${maxVolumeRow.avg_speed_kph} kph)`);
      }
    }

    // 4. Signal Junction Performance search
    if (query.includes('signal') || query.includes('delay') || query.includes('junction') || query.includes('saturation') || query.includes('queue') || query.includes('phase')) {
      const signalPerf = getSignalPerformance2024();
      const signalPlans = getSignalTimingPlans();
      
      const matchedPerf = signalPerf.filter(p => query.includes(p.junction_id?.toLowerCase() || ''));
      if (matchedPerf.length > 0) {
        const total = matchedPerf.length;
        const avgDelay = Math.round(matchedPerf.reduce((sum, r) => sum + (r.avg_delay_s_per_veh || 0), 0) / total);
        const avgSat = Math.round((matchedPerf.reduce((sum, r) => sum + (r.degree_of_saturation || 0), 0) / total) * 100);
        contextBlocks.push(`Signal Junction Performance details:\n` +
          `- Average delay: ${avgDelay} seconds per vehicle\n` +
          `- Average degree of saturation: ${avgSat}%\n` +
          `- Sample records:\n${JSON.stringify(matchedPerf.slice(0, 2), null, 2)}`);
      } else {
        contextBlocks.push(`Overview of Signal Timing Plans:\n${JSON.stringify(signalPlans.slice(0, 3), null, 2)}`);
      }
    }

    // 5. Salik Toll search
    if (query.includes('salik') || query.includes('toll') || query.includes('gate') || query.includes('fee')) {
      const salik = getSalikToll2025();
      const total = salik.length;
      if (total > 0) {
        const avgToll = (salik.reduce((sum, r) => sum + (r.toll_fee_aed || 0), 0) / total).toFixed(2);
        const avgVolume = Math.round(salik.reduce((sum, r) => sum + (r.volume_vph || 0), 0) / total);
        contextBlocks.push(`Salik Hourly Toll Stats (2025 dataset):\n` +
          `- Total toll logs: ${total}\n` +
          `- Average toll fee: AED ${avgToll}\n` +
          `- Average passing volume: ${avgVolume} vph`);
      }
    }

    // 6. Metro Ridership search
    if (query.includes('metro') || query.includes('ridership') || query.includes('transit') || query.includes('station')) {
      const metro = getMetroRidershipDaily();
      const total = metro.length;
      if (total > 0) {
        const avgRiders = Math.round(metro.reduce((sum, r) => sum + (r.daily_ridership || 0), 0) / total);
        const maxRidersRow = metro.reduce((max, r) => (r.daily_ridership || 0) > (max.daily_ridership || 0) ? r : max, metro[0]);
        contextBlocks.push(`Metro Daily Ridership Stats:\n` +
          `- Total records: ${total}\n` +
          `- Average daily ridership: ${avgRiders.toLocaleString()} passengers\n` +
          `- Peak ridership day: ${maxRidersRow.date} with ${maxRidersRow.daily_ridership?.toLocaleString()} passengers`);
      }
    }

    const contextText = contextBlocks.join('\n\n');

    // Call Mistral AI
    const apiKey = getEnvVariable('MISTRAL_API_KEY');
    if (!apiKey) {
      return NextResponse.json({
        message: `I have scanned the local datasets for you. Here is what I found:\n\n${contextText}\n\n*(Connect your Mistral API Key to receive interactive natural language answers.)*`
      });
    }

    const promptMessages = [
      {
        role: 'system',
        content: `You are the PeakFlow Copilot AI Traffic Analyst. You assist human traffic operators at the Dubai RTA.
You have access to active local traffic datasets (Locations, Incidents, Hourly Traffic Volumes, Signal Junction Performance, Salik Toll logs, and Metro Ridership).

RULES:
1. Always base your answers on the real dataset statistics provided in the context. Be honest and call out numbers.
2. Keep answers concise, factual, and strictly professional.
3. Do not invent any coordinates, telemetry numbers, or incidents not in the context.
4. Format output cleanly in markdown with bullet points or small tables where appropriate.

Context retrieved from datasets:
${contextText || 'No specific dataset matches found. Provide overview of locations and recent statistics.'}`
      },
      ...history.map((h: any) => ({
        role: h.sender === 'user' ? 'user' : 'assistant',
        content: h.text
      })),
      {
        role: 'user',
        content: message
      }
    ];

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'open-mistral-7b',
        messages: promptMessages,
        temperature: 0.2,
        max_tokens: 600
      })
    });

    if (response.ok) {
      const data = await response.json();
      const reply = data.choices[0].message.content;
      return NextResponse.json({ message: reply });
    } else {
      const errorText = await response.text();
      return NextResponse.json({
        message: `Failed to connect to Mistral API (${response.status}). Here is the local dataset overview:\n\n${contextText}`,
        error: errorText
      });
    }

  } catch (err: any) {
    console.error('Error in chat API route:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
