import { NextResponse } from 'next/server';

export async function GET() {
  const scenarios = [
    {
      id: 'pm-peak-demo',
      title: 'PM Peak Congestion Demo',
      description: 'Normal weekday commuter PM Peak rush hour on Sheikh Zayed Road southbound. Traffic builds up starting at 16:00, peaks at 17:00-19:00, and dissipates by 20:00.',
      date: '2024-10-16',
      startHour: 16,
      endHour: 20,
      focusLocation: 'SZR_S1',
      focusJunction: 'JCT_DEF',
      focusRoad: 'Sheikh Zayed Road',
      focusDirection: 'SB (to Abu Dhabi)',
      story: 'Evaluate normal commuter peaks and signal timing splits at Defence Junction during rush hour.',
      focusIds: ['SZR_S1', 'SZR_S2', 'SZR_S4', 'ITT_E1', 'ITT_W1']
    },
    {
      id: 'creek-crossing-demo',
      title: 'Creek Crossing Routing Demo',
      description: 'Congestion builds at Garhoud Bridge (GAR_N1) during the afternoon. Evaluates routing advisory tools to redirect commuters to alternative bridge crossings: Al Maktoum Bridge (MAK_N1) and Business Bay Crossing (BBC_S1).',
      date: '2024-10-16',
      startHour: 15,
      endHour: 19,
      focusLocation: 'GAR_N1',
      focusJunction: 'JCT_GARH',
      focusRoad: 'Al Garhoud Bridge',
      focusDirection: 'NB (to Deira)',
      story: 'Demonstrate alternate Creek crossing dynamic routings when an incident triggers severe delays on Garhoud Bridge.',
      focusIds: ['GAR_N1', 'MAK_N1', 'BBC_S1']
    },
    {
      id: 'signal-delay-demo',
      title: 'Signal Performance Optimization',
      description: 'Severe queue buildup and phase saturation at Deira / Al Ittihad fixed-time junction (JCT_DEIRA). Propose retiming plans and transition from fixed-time program to adaptive control.',
      date: '2024-10-16',
      startHour: 8,
      endHour: 12,
      focusLocation: 'ITT_E1',
      focusJunction: 'JCT_DEIRA',
      focusRoad: 'Al Ittihad Road',
      focusDirection: 'EB (to Sharjah)',
      story: 'Analyze saturation and phase delays to make the business case for replacing static signal timing plans with SCOOT-adaptive operations.',
      focusIds: ['ITT_E1', 'ITT_W1', 'DESS_S1']
    },
    {
      id: 'rain-stress-test',
      title: 'Weather Stress-Test (Historic Storm)',
      description: 'An optional stress-test replaying the historic Dubai rainstorm on April 16, 2024. Massive flooding, severe city-wide speed drops, accident spikes, and a modal passenger shift to the Dubai Metro.',
      date: '2024-04-16',
      startHour: 15,
      endHour: 19,
      focusLocation: 'SZR_N1',
      focusJunction: 'JCT_DEF',
      focusRoad: 'Sheikh Zayed Road',
      focusDirection: 'NB (to Deira)',
      story: 'Stress test operator decision-making under multi-incident storm events, high transit ridership, and severe weather visibility limits.',
      focusIds: ['SZR_N1', 'GAR_N1', 'MAK_N1']
    }
  ];

  return NextResponse.json(scenarios);
}
