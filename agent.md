# PeakFlow AI Agent Guidelines & Architecture

Welcome! This document outlines the guidelines, rules, and architecture conventions for AI agents working in the **PeakFlow Demand Shift & Flow Support Engine** repository.

---

## 🚀 Project Overview

PeakFlow is an RTA (Roads and Transport Authority) decision-support engine designed to reduce congestion on overloaded business corridors in Dubai. Instead of proposing raw infrastructure construction or unsafe automation (like direct signal hijacking), PeakFlow shifts traffic demand during peak hours.

### Key Pillars
1. **Demand Shift Optimizer:** Recommends a multi-channel campaign mix (Employer Flex, Metro/NOL rewards, Off-Peak Parking discounts) to stagger commuter arrivals.
2. **AI Strategy Comparison Matrix:** Evaluates individual strategies against a combined plan to prove the synergistic impact of joint demand-shifting.
3. **RTA Operator Approval:** Every campaign draft requires manual RTA operator review and confirmation. AI assists; humans decide.

---

## 📁 Repository Directory Structure

The project is structured in the frontend dashboard:
- `/rta-peakflow-copilot` (Next.js 15+ App Router, Tailwind/Vanilla CSS, TypeScript, Leaflet).

### Core Frontend Files
-   [`src/app/page.tsx`](file:///Users/m-alkassem/Desktop/RTA%20Competition/rta-peakflow-copilot/src/app/page.tsx): Main dashboard layout and state orchestrator.
-   [`src/app/components/DubaiLeafletMap.tsx`](file:///Users/m-alkassem/Desktop/RTA%20Competition/rta-peakflow-copilot/src/app/components/DubaiLeafletMap.tsx): Interactive GIS and Tactical map using OpenStreetMap light tiles and custom Dubai coordinates.
-   [`src/app/components/DemandShiftDecisionScreen.tsx`](file:///Users/m-alkassem/Desktop/RTA%20Competition/rta-peakflow-copilot/src/app/components/DemandShiftDecisionScreen.tsx): The premium Live Demo screen (Left corridor status grid, center map and matrix, right campaign panel, bottom impact bar).
-   [`src/app/components/DemandShiftHero.tsx`](file:///Users/m-alkassem/Desktop/RTA%20Competition/rta-peakflow-copilot/src/app/components/DemandShiftHero.tsx): Before vs After simulation card displaying simulated V/C and travel time reductions.
-   [`src/app/lib/demandShiftEngine.ts`](file:///Users/m-alkassem/Desktop/RTA%20Competition/rta-peakflow-copilot/src/app/lib/demandShiftEngine.ts): Mathematical helper functions to simulate travel times and required shift metrics.
-   [`src/lib/mistral/agents.ts`](file:///Users/m-alkassem/Desktop/RTA%20Competition/rta-peakflow-copilot/src/lib/mistral/agents.ts): Helper logic for querying Mistral Studio Agents via the REST API.

---

## 🎯 Primary Live Demo Scenario

To guarantee a clean presentation to judges, the primary demo must always default to:

-   **Scenario:** Business Corridor Peak Demo.
-   **Target Corridor:** `Sheikh Zayed Road → DIFC / Business Bay`.
-   **Peak Window:** `08:00–09:00 AM`.
-   **excess demand:** `+3,458 vph` (vehicles per hour above safe level).
-   **Required Shift:** `35%`.
-   **Estimated Commute Saving:** `17 minutes` (reducing SZR commute from `74 min` to `57 min`).
-   **Campaign Mix:**
    1.  *Employer Flex Campaign* (Shifts 1,902 trips/hr, 9 min saved, 72% confidence).
    2.  *Metro / NOL Incentive* (Shifts 865 trips/hr, 6 min saved, 68% confidence).
    3.  *Off-Peak Parking Reward* (Shifts 415 trips/hr, 3 min saved, 61% confidence).
    4.  *RTA Flow Support* (Operational road support layer, signal reviews, signage).

---

## ⚠️ Safety & Product Boundaries (Crucial)

PeakFlow enforces strict guardrails to maintain municipal safety and realism:

-   **NO Direct Intervention:** The agent must never propose direct automated signal manipulation or automatic dispatch of patrol vehicles.
    -   *DO NOT* use words like "Monitor Only", "Operations Dashboard" (use "Demand Shift Engine"), "automatic signal control", or "guaranteed traffic removal".
    -   *ALWAYS* specify travel time improvements as **"Estimated business-corridor commute impact"** (never guarantee minutes saved).

---

## 🛠️ Local Development Commands

To run PeakFlow locally:

```bash
# Start the Next.js frontend
cd rta-peakflow-copilot
npm run dev
```

---

## 🤖 Mistral Multi-Agent Integration Architecture (DO NOT CHANGE)

To ensure high reliability, safety, and demo correctness, the Mistral AI integration adheres to these strict rules. Future agents must **NEVER** change this architecture:

1. **Dedicated Studio Agents:**
   - **Operator Briefing:** Query using `operatorBriefing` type (`MISTRAL_OPERATOR_BRIEFING_AGENT_ID`).
   - **Congestion Optimizer:** Query using `congestionOptimizer` type (`MISTRAL_CONGESTION_OPTIMIZER_AGENT_ID`).
   - **Campaign Formulator:** Query using `campaignFormulator` type (`MISTRAL_CAMPAIGN_FORMULATOR_AGENT_ID`).

2. **Server-Side Security:**
   - Do **NOT** call `/v1/chat/completions` for PeakFlow agent completions. Call `POST https://api.mistral.ai/v1/agents/completions`.
   - All API keys and agent IDs must remain **100% server-side** (inside `.env.local` only). Never expose them to client bundles or front-end components.
   - The front-end must never pass raw agent IDs. It passes an agent type name parameter (`operatorBriefing` | `congestionOptimizer` | `campaignFormulator`).

3. **Calculations Kept Local:**
   - The Mistral agents must **NOT** calculate any traffic metrics (such as V/C, LOS, required shift volumes, commute savings, speed/density, capacity, or campaign mix volumes).
   - All calculations are done locally and deterministically inside `demandShiftEngine.ts`. The AI agents only generate wording, headlines, checklist bullets, and advisory texts based on calculated numbers.

4. **Prompt Format:**
   - All prompt templates must explicitly end with: `"Return valid JSON only. No markdown. No extra text."`
   - Set the API call option `response_format: { type: "json_object" }` in the POST request body.

5. **Validation & Fallbacks (Demo Safety):**
   - Parse and validate the response structure against TypeScript response interfaces (`OperatorBriefingResponse`, `CongestionOptimizerResponse`, `CampaignFormulatorResponse`). If any required structural keys are missing, throw a descriptive validation error.
   - If the API call fails or validation fails, catch the error and return **deterministic fallback data** along with `isFallback: true`.
   - The front-end will render fallback text and local metrics seamlessly. A warning badge is visible only in development mode (`process.env.NODE_ENV === "development"`).

6. **Call Limits and Timeout:**
   - Enforce a **25-second AbortController timeout** per request.
   - Implement exactly **one automatic retry** only on rate-limiting (`429`) or server errors (`5xx`).
   - Keep calls **lazy and action-based**: Do not query the congestion optimizer and campaign formulator together unless requested.

7. **AI Reasoning Summary Rule (UI Card Only):**
   - The field `aiReasoningSummary` is for the UI card only.
   - It must be maximum 2 short sentences and under 220 characters.
   - Do not include detailed trip breakdowns, explain every strategy, mention free-flow conditions, mention routing or signal changes, or write a paragraph.
   - Exact style when campaign is needed: `"Combined plan recommended because one strategy alone cannot shift {tripsToShift} trips. Mix employer flex, Metro/NOL, and parking rewards. Estimated impact. RTA approval required."` (where `{tripsToShift}` is replaced with the dynamic trips count).
   - Exact style when no campaign is needed: `"No campaign recommended because this corridor is within safe capacity for the selected time. Continue monitoring. Estimated impact. RTA approval required."`

8. **Consistent Level of Service (LOS) & Demand Pressure Calculations:**
   - **LOS derivation from V/C:**
     - A: <= 0.35
     - B: > 0.35 and <= 0.55
     - C: > 0.55 and <= 0.75
     - D: > 0.75 and <= 0.90
     - E: > 0.90 and <= 1.00
     - F: > 1.00
   - **Demand pressure level:**
     - If excessDemand <= 0: "Within target" (green)
     - Else if requiredShiftPct > 0 and requiredShiftPct < 15: "Elevated" (orange)
     - Else: "High" (red)
   - Ensure all frontend cards, map popups, AI panel, and corridor list items use this exact calculation logic consistently.

9. **Dynamic PeakFlow Demand Shift Mathematics & Labels:**
   - **Deterministic Formulas:**
     - `safeTarget = Math.round(capacity_vph * 0.90)`
     - `excessDemand = Math.max(0, demand_vph - safeTarget)`
     - `requiredShiftPct = demand_vph > 0 ? Math.ceil((excessDemand / demand_vph) * 100) : 0` (uses `Math.ceil` for conservative bounds)
     - `afterDemand = demand_vph - excessDemand`
     - `afterVC = afterDemand / capacity_vph`
   - **No Mixing of Telemetry Fields:**
     - Always use `demand_vph` for shift calculations, never `volume_vph` (observed throughput).
   - **UI Labels:**
     - Replace "Cars above safe level" with "Excess demand above operating target".
     - Always display units as "trips/hr" or "vehicles/hr" instead of "cars" or "vph".
   - **AI Grounding:**
     - Prohibit the AI optimizer agent from modifying or recalculating demand statistics. The AI must strictly align its textual explanations with the pre-calculated numbers passed in the input JSON context.

10. **AI Demand Shift Campaign Brief UI Layout (Low Scrolling):**
    - The right-side campaign panel must only display these sections by default to reduce scrolling:
      1. **Recommendation**
      2. **Why**
      3. **Campaign mix** (if campaign is needed)
      4. **Expected impact**
      5. **Human approval**
    - Long rationales and explanation text must be placed inside a collapsible `<details>` element labeled **"View detailed reasoning"**.
    - **Language Safety Guardrails:**
      - Never use automated-implementation words: `dispatch`, `automatically trigger`, `automatically control signals`, `guaranteed saving`.
      - Always use consultative words: `recommend`, `prepare`, `support`, `operator review`, `approval required before implementation`.
