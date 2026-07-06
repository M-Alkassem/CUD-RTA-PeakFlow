# RTA PeakFlow Copilot

**An AI copilot that helps Dubai RTA traffic operators prevent peak-hour congestion before it happens — by shifting demand instead of just reacting to gridlock.**

Built for the CUD 4IR Mobility Challenge.

## The real-world problem

Dubai's business corridors (Sheikh Zayed Road → DIFC / Business Bay, the Creek crossings, key signalized junctions) regularly see demand exceed safe road capacity during the 08:00–09:00 AM and 17:00–19:00 PM peaks. Adding lanes is slow and expensive; reacting after congestion forms is too late. The most cost-effective lever is **demand shifting**: moving a calculated share of trips to earlier/later windows or to the Metro *before* the peak builds.

## What the app does

PeakFlow replays real hourly traffic, signal, Salik, weather, and Metro-ridership datasets and, for any corridor and hour:

1. **Computes demand pressure deterministically** — demand vs. capacity, V/C ratio, excess trips over the 90%-capacity safe target ([demandShiftEngine.ts](src/app/lib/demandShiftEngine.ts)). The AI never invents numbers.
2. **Recommends a campaign mix** to shift the excess demand: Employer Flex staggered hours (~60%), Metro/NOL incentives (~25%), off-peak parking rewards (~15%), plus RTA flow support as a secondary layer.
3. **Generates an operator briefing with Mistral AI** — directly queries your published **Mistral Studio Agents** via server-side API routes to get plain-English briefings, employer/commuter messages, and strategy analysis.
4. **Keeps a human in the loop** — every action requires operator approval; a safety filter strips any auto-control/dispatch language before anything reaches the screen; decisions are logged.

## Architecture

```
Next.js Operator Dashboard (this repo)
   │  POST /api/peakflow-workflow · /api/mistral/briefing
   ▼
Next.js API routes  ──► Mistral Studio Agents (cloud-hosted)
                    ──► POST https://api.mistral.ai/v1/agents/completions
```

All briefings and campaign analyses are live Mistral AI output from your cloud-hosted Mistral Studio Agents. If the Mistral API is unreachable or the keys are invalid, the UI shows an explicit error (with a retry button) — there is no canned fallback content. The deterministic numbers (demand, capacity, V/C, campaign mix) are always computed locally by the demand-shift engine; the AI only writes the narrative around them.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

### Mistral AI setup (required)

1. Create an API key at [console.mistral.ai](https://console.mistral.ai) → API Keys. **Make sure your workspace has an active plan** (the free *Experiment* tier is enough) — keys return `401 Unauthorized` until a plan is activated.
2. Put it in [.env](.env) as:
   ```env
   MISTRAL_API_KEY=your_key_here
   MISTRAL_AGENT_ID_BRIEFING=your_briefing_agent_id_here
   MISTRAL_AGENT_ID_WORKFLOW=your_workflow_agent_id_here
   ```
3. **Restart `npm run dev` after changing `.env`** — Next.js reads it at server start.

A valid key and agent configuration are required: AI panels show an error state until Mistral responds successfully.

### Data

`data/` contains the CUD RTA challenge datasets (hourly traffic volume, signal performance & timing plans, Salik tolls, Metro ridership, incidents, weather calendar, and location/junction references).

## Demo script

1. Pick a scenario in the left sidebar (Business Corridor Peak, Creek Crossing, Signal Performance, Storm Test).
2. Select a corridor — the AI workflow runs automatically and fills the decision screen: demand vs. safe capacity, required shift, campaign mix, before/after commute.
3. Switch the Time Window (or use *Auto: Highest Pressure Hour*).
4. Open **Shift Briefing** for the full Mistral-generated operator briefing, then Approve / Request Review / Dismiss to demonstrate the human-in-the-loop decision log.
