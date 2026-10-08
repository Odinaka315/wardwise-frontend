export type UnitCode =
  | 'ACM' // Acute Male
  | 'ACF' // Acute Female
  | 'CAU' // Child & Adolescent Unit
  | 'FOR' // Forensic Psychiatric Unit
  | 'DRU' // Drug Rehabilitation Unit
  | 'LSR' // Long-Stay Rehabilitation
  | 'LTW' // Long-Term Ward
  | 'GER' // Geriatric Psychiatry
  | 'CTU' // Community Treatment Unit
  | 'DAY' // Day Hospital / Outpatient Clinic
  | 'OPD' // General Outpatient Department

export interface UnitBaseline {
  code: UnitCode
  name: string
  category: 'Acute' | 'Specialist' | 'Rehabilitation' | 'Outpatient' | 'Long-Term'
  totalBeds: number
  occupiedBeds: number
  occupancyRate: number
  avgLengthOfStayDays: number
  monthlyOperatingCostNgn: number
  assignedStaff: number
  isLocked: boolean // for Model 2 flexibility restriction
}

export interface TransitionCell {
  fromState: string
  toState: string
  probability: number
}

export interface PathwaySegmentOption {
  code: number
  label: string
}

export interface PathwayFamilySupportOption {
  value: 'low' | 'medium' | 'high'
  label: string
}

export interface PathwayZoneOption {
  id: string
  name: string
}

export interface PathwayDiagnosisOption {
  id: string
  name: string
  group: string
}

export interface PathwayFilterOptions {
  segments: PathwaySegmentOption[]
  family_support_tiers: PathwayFamilySupportOption[]
  zones: PathwayZoneOption[]
  diagnosis_groups: string[]
  diagnoses: PathwayDiagnosisOption[]
}

export interface PathwayFilterParams {
  segment_code?: number
  family_support_tier?: 'low' | 'medium' | 'high'
  family_support_min?: number
  family_support_max?: number
  zone_id?: string
  diagnosis_group?: string
  diagnosis_id?: string
}

export interface PathwaySummaryFiltersApplied {
  segment_code?: number | null
  family_support_tier?: string | null
  family_support_min?: number | null
  family_support_max?: number | null
  zone_id?: string | null
  diagnosis_group?: string | null
  diagnosis_id?: string | null
}

export interface PathwayAbsorptionRow {
  state: string
  dischargedStable: number
  lostToFollowUp: number
  transferredLongTerm: number
  transferredFacility?: number
  deceased?: number
  rawMap?: Record<string, number>
}

export interface PathwaySummary {
  states: string[]
  transientStates: string[]
  absorbingStates: string[]
  transitionMatrix: number[][]
  fundamentalMatrix?: Record<string, Record<string, number>>
  expectedMonthsToAbsorption: { [state: string]: number }
  absorptionProbabilities: PathwayAbsorptionRow[]
  rawAbsorptionMap?: Record<string, Record<string, number>>
  lostToFollowUpRate: number // Recomputed mean LTFU % across transient states
  minLostToFollowUpRate?: number
  maxLostToFollowUpRate?: number
  censoredPatientFraction?: number
  sampleSize: number
  patientCount: number
  reliable: boolean
  minReliableTransitions: number
  statesWithNoData: string[]
  filtersApplied: PathwaySummaryFiltersApplied
  keyFindingNote?: string
  noData:boolean
  noDataMessage:string
}

export interface PathwaySummaryFetchResult {
  isNoData?: boolean
  error?: string
  message?: string
  data?: PathwaySummary
  sampleSize?: number
  filtersApplied?: PathwaySummaryFiltersApplied
}


export interface ForecastItem {
  unitCode: UnitCode
  unitName: string
  predictedAdmissions: number
  historicalMonthlyAvg: number
  method: 'XGBoost' | 'Naive Persistence'
  clippedFromNegative: boolean // stated limitation warning badge
  trendDirection: 'up' | 'down' | 'stable'
  confidenceLow: number
  confidenceHigh: number
}

export interface RiskPatient {
  id: string
  patientId: string
  gender: 'M' | 'F'
  age: number
  unit: UnitCode
  riskType: 'Readmission' | 'Non-attendance'
  riskScore: number // 0 to 1
  riskTier: 'High' | 'Medium' | 'Low'
  lastDischargeDate?: string
  lastVisitDate?: string
  scheduledAppointmentDate?: string
  primaryDrivers: string[]
  daysSinceDischarge?: number
  priorAdmissionsCount: number
}

export interface LongStayResident {
  id: string
  residentCode: string
  unit: 'LTW' | 'LSR'
  gender: 'M' | 'F'
  age: number
  yearsResident: number
  admissionYear: number
  fundingSource: 'Federal Grant' | 'State Subsidized' | 'Family Funded' | 'Indigent Hospital Reserve'
  resettlementAssessedFlag: boolean
  resettlementFeasibility: 'Eligible for Community Step-down' | 'High Support Needed' | 'Specialized Institutional'
  primaryDiagnosis: string
}

export interface PatientCluster {
  clusterId: number
  name: string
  tagline: string
  size: number
  percentage: number
  avgAge: number
  avgAdmissionsPerYear: number
  annualHospitalCostSharePct: number
  primaryCharacteristics: string[]
  clinicalRecommendation: string
  isCostDriver: boolean // e.g. Cluster 3
}

export interface Model2UnitPlan {
  unitCode: UnitCode
  unitName: string
  isLocked: boolean
  currentBeds: number
  recommendedBeds: number
  bedDelta: number
  currentNurseFTE: number
  recommendedNurseFTE: number
  nurseDelta: number
  currentMonthlyCostNgn: number
  projectedMonthlyCostNgn: number
}

export interface Model2Result {
  annualSavingsPct: number // 12.2%
  annualSavingsNgn: number
  totalCurrentBeds: number
  totalRecommendedBeds: number
  totalCurrentStaff: number
  totalRecommendedStaff: number
  flexiblePoolOnlyCaveat: string
  units: Model2UnitPlan[]
}

export interface BedReallocationResult {
  sourceUnit: string
  targetUnits: { unit: string; bedsAdded: number }[]
  totalBedsShifted: number
  rationale: string
  shadowPrices: {
    unit: string
    resource: string
    shadowPrice: number // value of an additional bed/resource
    interpretation: string
  }[]
}

export interface StaffRosterResult {
  totalUnfilledNurseShifts: number // 1,733 finding
  priorityUnits: {
    unitCode: UnitCode
    unitName: string
    unfilledShifts: number
    urgency: 'Critical' | 'High' | 'Moderate'
    impactNote: string
  }[]
  shiftTypeBreakdown: {
    shift: 'Morning' | 'Afternoon' | 'Night'
    unfilledCount: number
  }[]
}

export interface BudgetTierResult {
  tier1EssentialPct: number // 100%
  tier2ClinicalSupportPct: number // 92%
  tier3DevelopmentalPct: number // 5.5%
  structuralShortfallPct: number // 26.5%
  totalBudgetRequestedNgn: number
  totalBudgetSecuredNgn: number
  deficitNgn: number
  framingNote: string
}

export interface ScenarioSimulationResult {
  scenarioId: number
  code: string
  name: string
  description: string
  occupancyRatePct: number
  overflowEventsPerQuarter: number
  avgWaitDays: number
  monthlyCostMlnNgn: number
  absorptionMix: {
    dischargedStablePct: number
    lostToFollowUpPct: number
    longStayTransferPct: number
  }
  isRecommendedOption?: boolean
  recommendationNote: string
}

export interface StrikeTrajectoryPoint {
  monthOffset: number // e.g. -18 to +18
  label: string
  baselineOccupancy: number
  strikePeriodOccupancy: number
  rehabGap: number
}

// Custom Scenario Types

export type BedGroup = 'ACUTE' | 'REHAB' | 'DAY'

export type DisruptionEventType = 'none' | 'strike' | 'surge' | 'freeze'

export interface CustomScenarioBaselineDefaults {
  capacity: Record<BedGroup, number>
  phi: Record<BedGroup, number>
  bed_cost_per_day_ngn: Record<BedGroup, number>
  community_cost_per_month_ngn: { outpatient_follow_up: number; community_relapse: number }
  demand_multiplier: number
  overcrowd_dropout: number
  horizon_months: number
  warmup_months: number
  entry_window_months: number
  default_replications: number
  event_types: {
    none: null
    strike: { arrival_factor: number; discharge_factor: number }
    surge: { arrival_factor: number; discharge_factor: number }
    freeze: { arrival_factor: number; discharge_factor: number }
  }
  note: string
}

export interface CustomScenarioSubmission {
  label: string
  capacity_overrides?: Partial<Record<BedGroup, number>>
  demand_multiplier?: number
  overcrowd_dropout?: number
  event?: {
    type: DisruptionEventType
    start_month?: number
    duration_months?: number
    arrival_factor?: number | null
    discharge_factor?: number | null
  }
  horizon_months?: number
  replications?: number
}

export interface CustomScenarioTrajectoryGroup {
  baseline_occupancy: number[]
  scenario_occupancy: number[]
  gap: number[]
  deepest_dip_month_offset: number
  deepest_dip_gap: number
}

export interface CustomScenarioTrajectory {
  months_relative_to_event: number[]
  acute: CustomScenarioTrajectoryGroup
  rehab: CustomScenarioTrajectoryGroup
  day: CustomScenarioTrajectoryGroup
}

export interface CustomScenarioResult {
  occupancy_rate_0: number // Acute
  occupancy_rate_1: number // Rehab
  occupancy_rate_2: number // Day
  overflow_beds_1: number
  wait_days_1: number
  'abs_Lost to follow-up': number
  'abs_Recovered and discharged from service': number
  monthly_relapse_events: number
  monthly_cost_ngn: number
  months_in_system: number
  label: string
  warnings: string[]
  trajectory: CustomScenarioTrajectory | null
  [key: string]: unknown // remaining summarise() keys
}

export interface SavedCustomScenario {
  id: string
  name: string
  savedAt: string // ISO timestamp
  params: CustomScenarioSubmission
  result?: CustomScenarioResult | null
}


export interface Model2Assumptions {
  demandBufferPct: number        // default 0   -- "what if occupancy runs X% hotter/colder"
  budgetMultiplier: number       // default 1.0 -- "what if the budget were cut/raised by X%"
  nurseRatioMultiplier: number   // default 1.0 -- "what if min nurse:bed ratio changed by X%"
  doctorRatioMultiplier: number  // default 1.0 -- "what if min doctor:bed ratio changed by X%"
}
export const MODEL2_BASELINE_ASSUMPTIONS: Model2Assumptions = {
  demandBufferPct: 0, budgetMultiplier: 1.0, nurseRatioMultiplier: 1.0, doctorRatioMultiplier: 1.0,
}
 
export interface BedReallocationAssumptions {
  lookbackMonths: number   // default 6
  demandBufferPct: number  // default 0
}
export const BED_REALLOCATION_BASELINE_ASSUMPTIONS: BedReallocationAssumptions = {
  lookbackMonths: 6, demandBufferPct: 0,
}
 
export interface RosterAssumptions {
  nightCapBonus: number     // default 0 -- extra night shifts allowed per staff member
  compareRelaxed: boolean   // default false -- also solve +2 and report the improvement
}
export const ROSTER_BASELINE_ASSUMPTIONS: RosterAssumptions = {
  nightCapBonus: 0, compareRelaxed: false,
}
 
export interface BudgetAssumptions {
  personnelFloorFraction: number  // default 0.70
  tierTolerance: number           // default 1.02
}
export const BUDGET_BASELINE_ASSUMPTIONS: BudgetAssumptions = {
  personnelFloorFraction: 0.70, tierTolerance: 1.02,
}

// ADD these to types/index.ts (alongside the Model2Assumptions etc. you
// already have there). These describe the RAW shape the solvers actually
// return (snake_case, `by_unit`, etc.) — distinct from your old
// Model2Result/BedReallocationResult/StaffRosterResult/BudgetTierResult,
// which described a camelCase shape the solvers never produced. Keep the
// old types if other pages still use mock data shaped that way; just
// don't use them for the Decision Suite's live resolver results anymore.

export interface Model2UnitRow {
  unit_id: string
  recommended_beds: number
  recommended_nurses: number
  recommended_doctors: number
  current_beds: number
  bed_change: number
  pct_change: number
}

export interface Model2SolveResult {
  status: string
  message?: string
  assumptions: Model2Assumptions & { is_baseline: boolean }
  fiscal_year?: number
  total_bed_stock?: number
  total_budget_ngn?: number
  optimal_annual_cost_ngn?: number
  current_annual_cost_ngn?: number
  annual_savings_ngn?: number
  annual_savings_pct?: number
  by_unit?: Model2UnitRow[]
}

export interface BedReallocationUnitRow {
  unit_id: string
  recommended_beds: number
  current_beds: number
  bed_change: number
}

export interface BedReallocationSolveResult {
  lp_status: string
  mip_status: string
  flexible_pool_size: number
  assumptions: BedReallocationAssumptions & { is_baseline: boolean }
  scope_note: string
  by_unit: BedReallocationUnitRow[]
  sensitivity: Record<string, { shadow_price_ngn_per_year: number; slack: number }>
}

export interface RosterUnitRow {
  unit_id: string
  nurse_shortfall: number
  doctor_shortfall: number
}

export interface RosterSolveResult {
  status: string
  total_penalised_shortfall: number
  total_unfilled_nurse_shifts: number
  total_unfilled_doctor_shifts: number
  staff_at_night_cap: number
  total_roster_staff: number
  by_unit: RosterUnitRow[]
  assumptions: RosterAssumptions & { is_baseline: boolean }
  night_cap_sensitivity?: {
    relaxed_by: number
    relaxed_total_penalised_shortfall: number
    improvement_pct: number
  }
}

export interface BudgetTierRow {
  goal_programming_tier: number
  total_requested: number
  total_allocated: number
  avg_pct_funded: number
}

export interface BudgetSolveResult {
  fiscal_year: number
  assumptions: BudgetAssumptions & { is_baseline: boolean }
  total_requested_ngn: number
  total_budget_ceiling_ngn: number
  structural_shortfall_pct: number
  stage_results: Record<string, { status: string; weighted_shortfall: number }>
  tier_summary: BudgetTierRow[]
  by_line_item: {
    unit_id: string
    cost_category: string
    goal_programming_tier: number
    amount_requested_ngn: number
    final_allocation: number
    pct_funded: number
  }[]
}
export type SolveJobStatus = 'idle' | 'submitting' | 'queued' | 'running' | 'success' | 'error'