# WardWise — Frontend Build Spec
*For continuation in a new chat. Pair this with WARDWISE_HANDOFF.md (overall project status).*

## Before building: the RAM-limit constraint shapes everything below

The deployed Render backend is on a free 512MB web service. Confirmed working: health check and the "light" read endpoints (pathway, forecast, risk lookups, segmentation). Confirmed failing under load: the four PuLP/simulation solve endpoints (Model 2, bed reallocation, roster, budget, simulation) — these build thousands of variables in memory and can exceed the free tier.

**Recommended approach for every "heavy" page below:** don't call the live solve endpoint directly from the deployed frontend. Instead:
1. Run the solve once locally (`docker compose up -d` on your own machine, call the endpoint there), save the JSON result to a static file.
2. Either (a) have the frontend fetch that static JSON instead of hitting the live endpoint, or (b) upgrade just the `wardwise-api` service to Render's $7 Starter plan for the demo window, then downgrade after.
Option (a) costs nothing and never fails live during a demo — recommended default unless the brief specifically requires a live solve on stage.

## Suggested stack
No frontend code exists yet — this is a from-scratch build. A React app (plain Vite + fetch, no heavy framework needed) talking to the FastAPI JSON endpoints is the natural fit given the architecture already built. Plain HTML/JS would also work and is lower-effort if time is short.

## Pages to build

### 1. Home / Navigation shell
Simple layout with a sidebar or top nav linking to every page below. Not a brief requirement by itself, but needed to tie everything together.

### 2. Data Overview (Baseline) — ⚠️ backend gap, not yet built
**Brief requirement.** No endpoint currently returns a general descriptive baseline (occupancy/cost/attendance by ward). Before this page can be built, add a lightweight endpoint — e.g. `GET /api/v1/overview` — that queries `daily_census` and `units` for current occupancy %, bed counts, and basic cost figures per unit. This is a light query, safe on the free tier.
**UI:** a table or small multi-chart dashboard, one row per unit (ACM, ACF, CAU, FOR, DRU, LSR, LTW, GER, CTU, DAY, OPD).

### 3. Patient Pathway Explorer
**Endpoint:** `GET /api/v1/pathway/summary` (light, safe live)
**UI:** the transition matrix as a heatmap or table, expected-months-to-absorption as a bar chart per starting state, absorption probabilities as a stacked bar per state. Worth surfacing the Lost-to-follow-up finding (35–43%) prominently — it's the single strongest headline number from the whole project.

### 4. Forecast
**Endpoint:** `GET /api/v1/forecast` (light, safe live)
**UI:** one row/card per unit showing next month's predicted admissions, which method produced it (XGBoost vs. naive), and the `clipped_from_negative` flag rendered as a visible warning badge where true (don't hide this — it's a stated limitation).

### 5. Risk Worklist
**Endpoints:** `GET /api/v1/risk/readmission/worklist`, `GET /api/v1/risk/nonattendance/worklist` (light, safe live)
**UI:** two tabs (Readmission / Non-attendance), each a sortable table of flagged patients/visits by risk score, with the lift-over-baseline stat (e.g. "2.1x more likely than random") shown as a headline metric above the table.

### 6. Long-Stay / Long-Term Ward Tracker — ⚠️ backend gap, not yet built
**Brief requirement.** No endpoint exists yet. Build `GET /api/v1/longstay/summary` pulling from `long_stay_residents` and the LTW rows of `daily_census` — current occupancy vs. capacity, resident count, and flags like `resettlement_assessed_flag`. Light query, safe on free tier.
**UI:** a simple table of current LTW residents with key fields (years_resident, funding_source, resettlement_assessed_flag), plus the occupancy number used in Scenario 6.

### 7. Patient Segments
**Endpoint:** `GET /api/v1/segmentation/summary` (light, safe live)
**UI:** 5 cards, one per cluster, showing size, % of total, and the human-readable label (e.g. "Chronic, long-term, high-utilisation"). This cluster card is a good place to link visually to the Risk Worklist, since Cluster 3 was identified as the likely driver of repeat-admission cost.

### 8. Decision / Recommendation (the core model) — ⚠️ HEAVY, use static JSON
**Endpoints (all heavy):** `POST /api/v1/model2/solve`, `POST /api/v1/bed-reallocation/solve`, `POST /api/v1/roster/solve`, `POST /api/v1/budget/solve`
**UI:** likely 4 tabs or sub-sections on one page:
  - **Bed & Staffing Plan** (Model 2): recommended vs. current beds/staff per unit, the ~12.2% annual saving, and the `locked_flag` caveat displayed explicitly (don't let the full-hospital number stand alone — pair it with the flexible-pool-only caveat).
  - **Bed Reallocation**: the DAY→DRU/LSR recommendation plus the shadow-price table (sensitivity analysis).
  - **Staff Roster**: the 1,733 unfilled nurse-shifts finding, broken down by unit (ACF/FOR as the priority units).
  - **Budget**: the tier-funding table (100% / 92% / 5.5%) and the structural-shortfall framing (26.5% gap is real, not a modelling failure).
**Build note:** run each solve once locally, save the 4 JSON results as static files the frontend fetches, per the RAM-limit strategy above.

### 9. Scenario Comparison — ⚠️ HEAVY, use static JSON
**Endpoints (heavy):** `POST /api/v1/simulation/solve`, `POST /api/v1/simulation/strike-trajectory`
**UI:** a comparison table, one row per scenario, with the key metrics (occupancy, overflow, wait, cost, absorption mix) — probably best as a bar-chart grid rather than a dense table, since the brief wants board-readability, not a spreadsheet. For Scenario 4 (strike) specifically, show the trajectory line chart (rehab occupancy gap over the ±18 month window), not the single averaged row — the averaged row is misleadingly close to zero (see WARDWISE_HANDOFF.md §3, item 14).
**Must state on this page:** the recommendation for Scenario 2 (12 extra rehab beds, chosen over the other two options with no hedging), and Scenario 6's explicit "no change to absorption probabilities" finding, since both are specific things the brief asks the board deck to say plainly.

## Priority order if time is short
1. Decision/Recommendation and Scenario Comparison (pages 8–9) — these are what the brief's board demo actually hinges on.
2. Pathway Explorer and Risk Worklist (pages 3, 5) — strongest standalone findings (LTFU rate, 2.1x risk lift).
3. Forecast and Segments (pages 4, 7).
4. Data Overview and Long-Stay Tracker (pages 2, 6) — need new backend endpoints first; lowest risk to deprioritise if time runs out, since they're descriptive rather than decision-driving.
