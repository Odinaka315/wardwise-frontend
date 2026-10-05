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

export interface PathwaySummary {
  states: string[]
  transitionMatrix: number[][]
  lostToFollowUpRate: number // 35-43% headline finding
  expectedMonthsToAbsorption: { [state: string]: number }
  absorptionProbabilities: {
    state: string
    dischargedStable: number
    lostToFollowUp: number
    transferredLongTerm: number
  }[]
  keyFindingNote: string
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
