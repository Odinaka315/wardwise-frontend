# WardWise — Custom Scenario Page: Frontend Requirements
*(v2 — corrected against the actual simulation engine; supersedes the v1 draft)*

## 1. Purpose

Add a 7th option to the existing Scenario Comparison page (alongside S1–S6): a **Custom Scenario Builder**. The user adjusts operational parameters in a form, pre-filled with the calibrated Status-Quo baseline values, and submits to get a simulation result rendered in the same visual language already built for S1–S6 (the stat tiles, the absorption bar, and — when relevant — a trajectory strip like the one built for the strike scenario).

Reuse every component already built for the 6 preset scenarios. The only new UI is the input form and the submit/poll flow around it.

**Important correction from an earlier draft of this spec:** the simulation engine does **not** model beds at the level of the 10 individual wards used elsewhere in the app (Model 2, the bed-reallocation model). It groups beds into **three pathway stages**: Acute, Rehabilitation, and Day Hospital. Acute combines the ACM+ACF wards; Rehabilitation combines DRU+LSR; Day Hospital stands alone. There is no simulated bed capacity for the other wards (FOR, GER, CAU, CTU, LTW) — those exist in the hospital's real ward structure but are not part of this particular engine's state space. Do not build a 10-row capacity form for this page; build a 3-row one. Also: there is **no staffing/night-shift parameter in this engine at all** — that belongs to a separate rostering model and has no place on this page.

## 2. API Contract

### 2.1 `GET /api/v1/simulation/baseline-defaults`

Called once when the Custom Scenario tab/page is opened. Synchronous — no `task_id`, no polling, it answers directly. Always fetch live; never hardcode these numbers into the frontend, since the baseline is periodically recalibrated on the backend.

Response shape:
```json
{
  "capacity": { "ACUTE": 115, "REHAB": 85, "DAY": 30 },
  "phi": { "ACUTE": 0.21, "REHAB": 0.41, "DAY": 0.03 },
  "bed_cost_per_day_ngn": { "ACUTE": 41000, "REHAB": 38000, "DAY": 19000 },
  "community_cost_per_month_ngn": { "outpatient_follow_up": 25000, "community_relapse": 15000 },
  "demand_multiplier": 1.0,
  "overcrowd_dropout": 0.0,
  "horizon_months": 200,
  "warmup_months": 24,
  "entry_window_months": 60,
  "default_replications": 30,
  "event_types": {
    "none": null,
    "strike":  { "arrival_factor": 0.532, "discharge_factor": 0.891 },
    "surge":   { "arrival_factor": 1.25,  "discharge_factor": 1.0 },
    "freeze":  { "arrival_factor": 0.0,   "discharge_factor": 1.0 }
  },
  "note": "Beds are grouped into three pathway stages (Acute, Rehabilitation, Day hospital), not the ten individual wards used in the bed-reallocation model -- Acute combines ACM+ACF and Rehabilitation combines DRU+LSR."
}
```
`capacity` has exactly 3 keys: `ACUTE`, `REHAB`, `DAY`. There is no locked/flexible distinction on this page — that concept belongs to the separate bed-reallocation model, not this simulation. `phi` is shown read-only/informational (a small "ⓘ beds occupied per patient in this stage" tooltip) — it is a calibrated constant, not something the user edits.

### 2.2 `POST /api/v1/simulation/custom`

Submitted on "Run Scenario". Body:
```json
{
  "label": "My scenario name",
  "capacity_overrides": { "ACUTE": 115, "REHAB": 97, "DAY": 30 },
  "demand_multiplier": 1.0,
  "overcrowd_dropout": 0.0,
  "event": {
    "type": "none" | "strike" | "surge" | "freeze",
    "start_month": 0,
    "duration_months": 0,
    "arrival_factor": null,
    "discharge_factor": null
  },
  "horizon_months": 200,
  "replications": 30
}
```
Field notes:
- `label` is required (1–60 chars); everything else is optional — omit a field entirely to keep it at the baseline value (don't send the baseline value back redundantly, though sending it is harmless).
- `capacity_overrides` only needs the keys the user changed; any of `ACUTE`/`REHAB`/`DAY` may be present or absent.
- `event.arrival_factor` / `event.discharge_factor` are **power-user overrides**, shown in an "Advanced" disclosure, not the main form. When left blank, the backend fills them in from `event_types` in the defaults response (e.g. picking `"strike"` with no overrides uses 0.532/0.891 automatically). Only show these two fields once `event.type` is not `"none"`.
- `event.duration_months` applies the chosen arrival/discharge factors to every month from `start_month` through `start_month + duration_months - 1`. There's no such thing as an event with `type != "none"` and `duration_months = 0` — validate against that combination before submit.

Response (immediately):
```json
{ "task_id": "abc123", "status": "submitted" }
```

### 2.3 `GET /api/v1/simulation/result/{task_id}`

Identical existing endpoint, unchanged — poll it exactly the way you already poll for S1–S6. On `SUCCESS`, `result` is a flat dict of the same metric keys your other scenario results already use (the ones produced by this engine's `summarise()` function), plus three fields specific to this endpoint:

```json
{
  "status": "SUCCESS",
  "result": {
    "occupancy_rate_0": 0.843, "occupancy_rate_1": 1.02, "occupancy_rate_2": 0.31,
    "overflow_beds_1": 2.1, "wait_days_1": 4.6,
    "abs_Lost to follow-up": 0.39, "abs_Recovered and discharged from service": 0.41,
    "monthly_relapse_events": 6.2, "monthly_cost_ngn": 108200000,
    "months_in_system": 11.3,
    "...": "(the remaining summarise() keys — same set your other scenario cards already consume)",

    "label": "My scenario name",
    "warnings": ["REHAB capacity (85 beds) is below the steady-state demand this configuration implies (~97 beds); expect sustained overflow even without the disruption event."],
    "trajectory": null
  }
}
```
Numeric result keys use index suffixes, not unit codes: `_0` = Acute, `_1` = Rehab, `_2` = Day — confirm this mapping with whatever adapter code your S1–S6 cards already use to turn these into the "Occupancy / Wait Time / Overflows / Stable Discharge" stat tiles, and reuse that exact adapter here rather than re-deriving the mapping.

`trajectory` is `null` unless the event's `duration_months` is short relative to `horizon_months` (the backend decides this — mirrors the logic already used for the strike deep-dive). When present:
```json
{
  "trajectory": {
    "months_relative_to_event": [-6, -5, "...", 23],
    "acute":  { "baseline_occupancy": [...], "scenario_occupancy": [...], "gap": [...], "deepest_dip_month_offset": 2, "deepest_dip_gap": -0.06 },
    "rehab":  { "baseline_occupancy": [...], "scenario_occupancy": [...], "gap": [...], "deepest_dip_month_offset": 2, "deepest_dip_gap": -0.09 },
    "day":    { "baseline_occupancy": [...], "scenario_occupancy": [...], "gap": [...], "deepest_dip_month_offset": 0, "deepest_dip_gap": -0.01 }
  }
}
```
This has one sub-object **per bed group** (not just rehab, unlike the original strike deep-dive which only tracked rehab) — the trajectory strip component should be able to render any of the three, or all three stacked. Check the exact field names your existing strike-trajectory chart component expects and adapt here rather than assuming they're identical — the shape is close but not byte-identical to what S4 originally used.

On `FAILURE`: show the error message plainly in the result panel. This happens for things like an invalid capacity-group name, or an event window that doesn't fit inside the horizon — these are hard failures, distinct from `warnings` (which is a successful run flagging that the user's inputs look operationally risky, e.g. capacity set below demand).

## 3. Page Behavior

### 3.1 Entry point
Add "Custom" as a 7th tile in the existing `SELECT SCENARIO` row, styled distinctly (dashed border / "+" icon) since it isn't a preplanned scenario.

### 3.2 On open
1. Loading skeleton in place of the form.
2. Call `GET /api/v1/simulation/baseline-defaults`.
3. Populate every field from the response. If the call fails: inline error + "Retry", no form shown, no guessed fallback defaults.

### 3.3 Form layout
- **Bed Capacity** — exactly 3 rows: Acute, Rehabilitation, Day Hospital, pre-filled from `capacity`. Each can show its `phi` value as a small read-only info line ("~21% of patients in this stage occupy a bed on a given day").
- **Demand** — one `demand_multiplier` slider, 0.5×–2.0×, default 1.0×, labeled in plain language.
- **Disruption Event** — dropdown: None / Staffing Strike / Demand Surge / Admissions Freeze. Selecting anything but None reveals `start_month` and `duration_months` (both required, no silent defaults), plus an "Advanced" disclosure exposing `arrival_factor` / `discharge_factor` pre-filled from `event_types[selected]` and editable.
- **Simulation Settings** (collapsed by default) — `horizon_months`, `replications` (floored at 20 in the UI, matching the backend's own floor).
- **Scenario name** — required text input, becomes `label`.

There is no staffing/night-cap field and no 10-ward capacity grid on this page — both were incorrect in an earlier draft of this spec.

### 3.4 Submit flow
- "Run Scenario" button, disabled mid-flight.
- POST `/custom` → poll `/result/{task_id}` using the exact same polling hook already used for S1–S6.
- Pending: form stays editable; result panel shows a distinct "Running…" state.
- Success: render via the same stat-tile/absorption-bar components as S1–S6, using the `_0/_1/_2` → Acute/Rehab/Day mapping noted above. Render the trajectory strip (per bed group) when `trajectory` is non-null.
- `warnings` non-empty: amber notice above the stat tiles — a successful-but-risky run, not an error.

### 3.5 After a result is shown
- "Adjust and re-run" (keep form values) and "Reset to Status Quo" (re-fetch baseline-defaults).
- Omit any "Save/Compare" button unless a persistence endpoint actually exists — don't wire it to nothing.

## 4. Validation Rules (client-side; the backend re-validates independently)

- `capacity_overrides.{ACUTE,REHAB,DAY}`: integer, ≥ 0.
- `demand_multiplier`: 0.5–2.0 inclusive.
- `overcrowd_dropout`: 0.0–1.0 inclusive (this one is genuinely obscure — fine to bury it in Advanced with a one-line explanation, or omit it from the UI entirely for v1).
- If `event.type != "none"`: `duration_months` ≥ 1, and `start_month + duration_months ≤ horizon_months`.
- `replications`: integer, 20–100.
- `label`: required, 1–60 chars.

## 5. States to Design For

1. Initial load (fetching defaults).
2. Baseline fetch failed → error + retry, no form.
3. Form ready, no run yet → empty-state result panel ("Run a scenario to see results here").
4. Run submitted, pending → form editable, result panel shows "Running…".
5. Run succeeded, no warnings → full result.
6. Run succeeded, with warnings → full result + amber banner.
7. Run failed → error message, form untouched (don't clear user input).

## 6. Explicit Non-Goals

- No raw transition-matrix (P) editing — only via the named event mechanisms.
- No live/streaming re-simulation as sliders move — this is submit-then-poll only.
- No side-by-side comparison of multiple saved custom scenarios — out of scope unless a persistence feature is added separately.
- No staffing/roster parameters on this page — out of scope for this engine.
