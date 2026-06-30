import { NextRequest, NextResponse } from 'next/server';
import {
  getSignalPerformance2024,
  getSignalTimingPlans
} from '@/lib/dataLoader';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

// Helper to get static junctions list
function getSignalJunctionsMaster(): any[] {
  const filePath = path.join(process.cwd(), 'data', 'signal_junctions_reference.csv');
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  return Papa.parse(content, { header: true, dynamicTyping: true }).data as any[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const junctionId = searchParams.get('junction_id') || '';
  const date = searchParams.get('date') || '2024-10-16';
  const hour = parseInt(searchParams.get('hour') || '17', 10);

  const junctionsMaster = getSignalJunctionsMaster();

  // If no junction requested, return the master list
  if (!junctionId) {
    return NextResponse.json({ junctions: junctionsMaster });
  }

  // Get active plans and performance data
  const timingPlans = getSignalTimingPlans().filter(p => p.junction_id === junctionId);
  const performanceRows = getSignalPerformance2024();

  // Find current performance row
  const activePerformance = performanceRows.find(
    p => p.junction_id === junctionId && p.date === date && p.hour === hour
  ) || null;

  // Filter timing plan phases active during this hour's program
  // e.g., Early Morning (00:00-06:00), AM Peak (06:00-10:00), Midday (10:00-16:00), PM Peak (16:00-20:00), Evening (20:00-24:00)
  let activeProgram = 'Midday';
  if (activePerformance) {
    activeProgram = activePerformance.active_program;
  } else {
    // Basic fallback based on hour
    if (hour >= 0 && hour < 6) activeProgram = 'Early Morning';
    else if (hour >= 6 && hour < 10) activeProgram = 'AM Peak';
    else if (hour >= 10 && hour < 16) activeProgram = 'Midday';
    else if (hour >= 16 && hour < 20) activeProgram = 'PM Peak';
    else activeProgram = 'Evening';
  }

  const activePlanPhases = timingPlans.filter(
    p => p.program.toLowerCase() === activeProgram.toLowerCase()
  );

  return NextResponse.json({
    junctionId,
    junctionName: junctionsMaster.find(j => j.junction_id === junctionId)?.junction_name || junctionId,
    activeProgram,
    performance: activePerformance,
    phases: activePlanPhases,
    allProgramsTiming: timingPlans
  });
}
