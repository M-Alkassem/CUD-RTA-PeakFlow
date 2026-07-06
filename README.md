<img width="1467" height="734" alt="image" src="https://github.com/user-attachments/assets/c747ab78-dd20-4d91-bced-918425929e35" /># PeakFlow — Demand Shift Engine

**CUD 4IR Mobility Challenge × RTA**

PeakFlow is an AI decision-support prototype that helps RTA-style mobility operators reduce peak-hour congestion before it becomes gridlock.

Instead of only reacting to traffic after it happens, PeakFlow forecasts overloaded corridors, calculates how many trips need to shift, and uses Mistral AI to recommend a safe demand-shift campaign for operator review.

---

## What PeakFlow Does

PeakFlow helps answer one operational question:

> “Which corridor is overloaded, how many trips need to shift, and what campaign should RTA prepare?”

The prototype allows an operator to:

- Select a corridor and time window
- View forecasted demand pressure on the map
- See excess demand above the operating target
- Calculate the required trip shift
- Review an AI-recommended campaign mix
- Estimate expected impact in trips shifted, minutes saved, hours saved, and AED value of time saved
- Prepare a campaign draft for RTA review

---

## Core Idea

Peak-hour congestion is often caused by too many trips arriving in the same hour.

PeakFlow reduces pressure by recommending targeted demand-shift campaigns such as:

- **Employer flex hours** — stagger work arrival times
- **Metro / NOL incentives** — encourage commuters to switch to Metro
- **Off-peak parking rewards** — encourage later arrivals
- **RTA flow support** — advisory, signal review, and incident coordination support

The system does **not** automatically control roads, signals, pricing, or public campaigns.

All recommendations require human operator review and approval.

---
<img width="1467" height="734" alt="image" src="https://github.com/user-attachments/assets/20d86fd5-d8db-4189-9c13-388fd511fa15" />

---
## AI Workflow

PeakFlow uses a two-layer AI workflow:

<img width="1468" height="764" alt="image" src="https://github.com/user-attachments/assets/612fcb6b-95d7-4896-b3b9-7cb19702d851" />


### 1. Forecasting Layer

A lightweight predictive backend pipeline estimates corridor demand pressure using:

- Historical traffic patterns
- Corridor capacity
- Time window
- Weather context
- Incidents
- School status
- Ramadan and calendar context

### 2. Mistral AI Recommendation Layer

Mistral AI receives the forecasted demand, excess trips, required shift, and corridor context.

It then generates:

- Campaign recommendation
- Campaign mix
- AI reasoning summary
- Expected impact explanation
- Operator-safe wording

Mistral does not invent the final traffic math. PeakFlow validates and calculates the key operational metrics in the backend.

---

## Dataset

This prototype uses the **synthetic RTA-inspired CUD 4IR Mobility Challenge dataset**.

The dataset includes aggregated corridor-level mobility data such as:

- Traffic volume
- Estimated demand
- Average speed
- Road capacity
- V/C ratio
- Level of service
- Incident logs
- Weather context
- Metro ridership
- Salik/toll data
- Signal performance
- Calendar context

No real personal data is used.

No live RTA production data is used.

---

## Key Metrics

PeakFlow measures impact using:

- Trips shifted per hour
- V/C ratio reduction
- Estimated minutes saved per commuter
- Total hours saved
- Estimated AED value of time saved
- Number of campaigns prepared
- Operator approval status

Example demo scenario:

- **Trips shifted:** 4,968 trips/hr
- **V/C ratio:** 1.61 → 0.90
- **Estimated saving:** 34 minutes
- **Total hours saved:** 2,815 hrs
- **Estimated value:** AED 211,140

---

## Responsible AI Principles

PeakFlow is designed as a decision-support tool, not an automatic control system.

Safety principles:

- Synthetic data only for prototype
- No personal data
- Aggregated corridor-level analysis
- Human approval required
- No automatic signal control
- No automatic pricing changes
- No automatic public campaign launch
- AI outputs are explainable and reviewable

---

## Tech Stack

- **Next.js**
- **TypeScript**
- **React**
- **Mistral AI API**
- **Leaflet / OpenStreetMap**
- **CSV-based synthetic mobility dataset**

---

## Running the Project

Install dependencies:

```bash
npm install
