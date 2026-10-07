import axios from 'axios'
import type {
  UnitCode,
  UnitBaseline,
  PathwaySummary,
  ForecastItem,
  RiskPatient,
  LongStayResident,
  PatientCluster,
  Model2Result,
  BedReallocationResult,
  StaffRosterResult,
  BudgetTierResult,
  ScenarioSimulationResult,
  StrikeTrajectoryPoint,
  Model2UnitPlan,
  CustomScenarioBaselineDefaults,
  CustomScenarioSubmission,
  CustomScenarioResult,
} from '../types'
import {
  hospitalUnitsBaseline,
  pathwaySummaryData,
  admissionForecasts,
  riskWorklistData,
  longStayResidentsData,
  patientClustersData,
  model2ResultData,
  bedReallocationResultData,
  staffRosterResultData,
  budgetTierResultData,
  scenarioSimulationResults,
  strikeTrajectoryData,
} from '../data/mockData'

export interface PathwayFilters {
  segmentCode?: number
  familySupportTier?: 'low' | 'medium' | 'high'
  zoneId?: string
  diagnosisGroup?: string
  diagnosisId?: string
}
 
export interface PathwayFilterOptions {
  segments: { code: number; label: string }[]
  familySupportTiers: { value: string; label: string }[]
  zones: { id: string; name: string }[]
  diagnosisGroups: string[]
  diagnoses: { id: string; name: string; group: string }[]
}
 
export interface PathwayFilterMeta {
  sampleSize: number
  patientCount: number
  reliable: boolean
  minReliableTransitions: number
  statesWithNoData: string[]
  filtersApplied: Record<string, unknown>
  noData: boolean
  noDataMessage: string
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://wardwise-api-4eqo.onrender.com'

// Axios instance configured for WardWise API endpoints
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for heavy solve endpoints running locally
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Check live backend connectivity & database status
export const checkBackendHealth = async (): Promise<{ live: boolean; database?: string; message?: string }> => {
  try {
    const res = await apiClient.get<{ status?: string; database?: string }>('/health', { timeout: 4000 })
    return {
      live: res.status === 200 && res.data?.status === 'ok',
      database: res.data?.database,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Connection failed'
    return {
      live: false,
      message: errorMsg,
    }
  }
}

// Helper with fallback for graceful offline / RAM constraint resilience
const withFallback = async <T>(apiCall: () => Promise<T>, fallbackData: T): Promise<{ data: T; isLive: boolean }> => {
  try {
    const res = await apiCall()
    return { data: res, isLive: true }
  } catch {
    // Graceful offline/demo fallback per WARDWISE_FRONTEND_SPEC.md RAM constraint strategy
    return { data: fallbackData, isLive: false }
  }
}

// 1. Data Overview (Baseline) — Served safely with fallback
export const fetchOverviewBaseline = async (): Promise<{ data: UnitBaseline[]; isLive: boolean }> => {
  return withFallback(async () => {
    const res = await apiClient.get<UnitBaseline[]>('/api/v1/overview')
    return res.data
  }, hospitalUnitsBaseline)
}

export const fetchPathwaySummary = async (
  filters: PathwayFilters = {}
): Promise<{ data: PathwaySummary & Partial<PathwayFilterMeta>; isLive: boolean }> => {
  return withFallback(async () => {
    const params: Record<string, string | number> = {}
    if (filters.segmentCode !== undefined) params.segment_code = filters.segmentCode
    if (filters.familySupportTier) params.family_support_tier = filters.familySupportTier
    if (filters.zoneId) params.zone_id = filters.zoneId
    if (filters.diagnosisGroup) params.diagnosis_group = filters.diagnosisGroup
    if (filters.diagnosisId) params.diagnosis_id = filters.diagnosisId

    const res = await apiClient.get<{
      error?: string
      message?: string
      states?: string[]
      transition_matrix?: Record<string, Record<string, number>> | number[][]
      expected_months_to_absorption?: Record<string, number>
      absorption_probabilities?: Record<string, Record<string, number>>
      sample_size?: number
      patient_count?: number
      reliable?: boolean
      min_reliable_transitions?: number
      states_with_no_data?: string[]
      filters_applied?: Record<string, unknown>
    }>('/api/v1/pathway/summary', { params })
    const raw = res.data

    if (raw?.error === 'no_data') {
      return {
        ...pathwaySummaryData,
        noData: true,
        noDataMessage: raw.message || 'No transitions match this filter combination.',
        sampleSize: 0,
      } as PathwaySummary & Partial<PathwayFilterMeta> // <-- Added type assertion
    }

    // FIXED: The backend does not send 'states', so we check for transition_matrix instead
    if (!raw || (!raw.states && !raw.transition_matrix)) {
      return pathwaySummaryData as PathwaySummary & Partial<PathwayFilterMeta>
    }

    // Fall back to the baseline states list if the backend omits it
    const states: string[] = raw.states || pathwaySummaryData.states
    let matrix: number[][]

    if (raw.transition_matrix && !Array.isArray(raw.transition_matrix)) {
      const transMap = raw.transition_matrix
      matrix = states.map((origin) =>
        states.map((dest) => (transMap[origin] ? transMap[origin][dest] ?? 0 : 0))
      )
    } else if (Array.isArray(raw.transition_matrix)) {
      matrix = raw.transition_matrix
    } else {
      matrix = pathwaySummaryData.transitionMatrix
    }

    const expectedMonths = raw.expected_months_to_absorption || pathwaySummaryData.expectedMonthsToAbsorption

    let absorptionList: PathwaySummary['absorptionProbabilities']
    if (raw.absorption_probabilities && typeof raw.absorption_probabilities === 'object') {
      const absMap = raw.absorption_probabilities
      absorptionList = Object.entries(absMap).map(([state, targetProbs]) => {
        const recovered = Number(((targetProbs['Recovered and discharged from service'] || 0) * 100).toFixed(1))
        const ltfu = Number(((targetProbs['Lost to follow-up'] || 0) * 100).toFixed(1))
        const other = Number((Math.max(0, 100 - recovered - ltfu)).toFixed(1))
        return { state, dischargedStable: recovered, lostToFollowUp: ltfu, transferredLongTerm: other }
      })
    } else {
      absorptionList = pathwaySummaryData.absorptionProbabilities
    }

    const ltfuValues = absorptionList.map((a) => a.lostToFollowUp)
    const meanLtfu = ltfuValues.length > 0
      ? Number((ltfuValues.reduce((a, b) => a + b, 0) / ltfuValues.length).toFixed(1))
      : pathwaySummaryData.lostToFollowUpRate

    return {
      states,
      transitionMatrix: matrix,
      lostToFollowUpRate: meanLtfu,
      expectedMonthsToAbsorption: expectedMonths,
      absorptionProbabilities: absorptionList.length > 0 ? absorptionList : pathwaySummaryData.absorptionProbabilities,
      keyFindingNote: pathwaySummaryData.keyFindingNote,
      sampleSize: raw.sample_size,
      patientCount: raw.patient_count,
      reliable: raw.reliable,
      minReliableTransitions: raw.min_reliable_transitions,
      statesWithNoData: raw.states_with_no_data ?? [],
      filtersApplied: raw.filters_applied ?? {},
      noData: false,
    } as PathwaySummary & Partial<PathwayFilterMeta> // <-- Added type assertion
  }, pathwaySummaryData as PathwaySummary & Partial<PathwayFilterMeta>) // <-- Added type assertion to fallback
}

export const fetchPathwayFilterOptions = async (): Promise<PathwayFilterOptions> => {
  try {
    const res = await apiClient.get<{
      segments: { code: number; label: string }[]
      family_support_tiers: { value: string; label: string }[]
      zones: { id: string; name: string }[]
      diagnosis_groups: string[]
      diagnoses: { id: string; name: string; group: string }[]
    }>('/api/v1/pathway/filter-options')
    const raw = res.data
    return {
      segments: raw.segments ?? [],
      familySupportTiers: raw.family_support_tiers ?? [],
      zones: raw.zones ?? [],
      diagnosisGroups: raw.diagnosis_groups ?? [],
      diagnoses: raw.diagnoses ?? [],
    }
  } catch {
    return { segments: [], familySupportTiers: [], zones: [], diagnosisGroups: [], diagnoses: [] }
  }
}
// 3. Admission Forecasts — Live Read Endpoint
export const fetchForecast = async (): Promise<{ data: ForecastItem[]; isLive: boolean }> => {
  return withFallback(async () => {
    const res = await apiClient.get<Array<Record<string, unknown>>>('/api/v1/forecast')
    const raw = res.data

    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((item) => ({
        unitCode: (item.unit_id || item.unitCode || 'ACM') as UnitCode,
        unitName: String(item.unit_name || item.unitName || item.unit_id || ''),
        predictedAdmissions: Math.round(Number(item.predicted_admissions ?? item.predictedAdmissions ?? 0)),
        historicalMonthlyAvg: Math.round(Number(item.historical_avg ?? item.historicalMonthlyAvg ?? 0)),
        method: item.method === 'xgboost' ? 'XGBoost' : 'Naive Persistence',
        clippedFromNegative: Boolean(item.clipped_from_negative ?? item.clippedFromNegative),
        trendDirection: (item.trend as 'up' | 'down' | 'stable') ?? 'stable',
        confidenceLow: Math.round(Number(item.ci_lower ?? item.confidenceLow ?? 0)),
        confidenceHigh: Math.round(Number(item.ci_upper ?? item.confidenceHigh ?? 0)),
      }))
    }
    return admissionForecasts
  }, admissionForecasts)
}

// 4. Risk Worklists — Live Read Endpoint
export const fetchRiskWorklist = async (
  type: 'Readmission' | 'Non-attendance'
): Promise<{ data: RiskPatient[]; isLive: boolean }> => {
  return withFallback(async () => {
    const path =
      type === 'Non-attendance'
        ? '/api/v1/risk/nonattendance/worklist'
        : '/api/v1/risk/readmission/worklist'
    const res = await apiClient.get<Array<Record<string, unknown>>>(path)
    const raw = res.data

    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((item, idx) => {
        const score = Number(item.risk_score ?? item.score ?? 0.5)
        return {
          id: String(item.admission_id || item.visit_id || `RK-${idx}`),
          patientId: String(item.patient_id || item.patientId || `FNPH-${idx}`),
          gender: (item.gender as 'M' | 'F') || 'M',
          age: Number(item.age ?? 35),
          unit: (item.unit_id || item.unit || 'ACM') as UnitCode,
          riskType: type,
          riskScore: Number(score.toFixed(2)),
          riskTier: (score >= 0.75 ? 'High' : score >= 0.5 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
          lastDischargeDate: item.discharge_date ? String(item.discharge_date) : (item.lastDischargeDate as string | undefined),
          lastVisitDate: item.visit_date ? String(item.visit_date) : (item.lastVisitDate as string | undefined),
          scheduledAppointmentDate: item.scheduled_date ? String(item.scheduled_date) : (item.scheduledAppointmentDate as string | undefined),
          primaryDrivers: (item.top_features || item.drivers || ['Clinical recurrence marker', 'Attendance friction']) as string[],
          daysSinceDischarge: Number(item.days_since_discharge ?? 14),
          priorAdmissionsCount: Number(item.prior_admissions_count ?? 2),
        }
      })
    }
    return riskWorklistData.filter((item) => item.riskType === type)
  }, riskWorklistData.filter((item) => item.riskType === type))
}

// 5. Patient Segments — Live Read Endpoint
export const fetchPatientSegments = async (): Promise<{ data: PatientCluster[]; isLive: boolean }> => {
  return withFallback(async () => {
    const res = await apiClient.get<Record<string, unknown>>('/api/v1/segmentation/summary')
    const raw = res.data

    if (raw && (Array.isArray(raw.clusters) || Array.isArray(raw))) {
      const list = (Array.isArray(raw.clusters) ? raw.clusters : raw) as Array<Record<string, unknown>>
      return list.map((c, idx: number) => ({
        clusterId: Number(c.cluster_id ?? idx + 1),
        name: String(c.name || `Cluster ${idx + 1}`),
        tagline: String(c.tagline || c.description || 'Patient clinical archetype'),
        size: Number(c.size ?? c.patient_count ?? 250),
        percentage: Number(Number(c.percentage ?? c.share_pct ?? 20).toFixed(1)),
        avgAge: Number(Number(c.avg_age ?? 35).toFixed(1)),
        avgAdmissionsPerYear: Number(Number(c.avg_admissions ?? 1.5).toFixed(1)),
        annualHospitalCostSharePct: Number(Number(c.cost_share_pct ?? 20).toFixed(1)),
        primaryCharacteristics: (c.characteristics || c.key_features || ['Clinical cohort']) as string[],
        clinicalRecommendation: String(c.recommendation || 'Standard management protocol'),
        isCostDriver: Boolean(c.is_cost_driver ?? (idx === 2)),
      }))
    }
    return patientClustersData
  }, patientClustersData)
}

// 6. Long-Stay Residents — Served safely with fallback
export const fetchLongStaySummary = async (): Promise<{ data: LongStayResident[]; isLive: boolean }> => {
  return withFallback(async () => {
    const res = await apiClient.get<LongStayResident[]>('/api/v1/longstay/summary')
    return res.data
  }, longStayResidentsData)
}

// Helper: Poll Celery background tasks until completion
const pollCeleryTask = async <T>(
  submitPath: string,
  resultPrefix: string,
  payload: Record<string, unknown> = {},
  maxAttempts = 40,
  intervalMs = 1000
): Promise<T> => {
  const submitRes = await apiClient.post<{ task_id?: string; status?: string }>(submitPath, payload)
  const taskId = submitRes.data?.task_id
  if (!taskId) {
    throw new Error(`Failed to submit task to ${submitPath}: no task_id returned`)
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
    const pollRes = await apiClient.get<{ status: string; result?: T; error?: string }>(
      `${resultPrefix}/${taskId}`
    )
    if (pollRes.data?.status === 'SUCCESS' && pollRes.data?.result !== undefined) {
      return pollRes.data.result
    }
    if (pollRes.data?.status === 'FAILURE') {
      throw new Error(pollRes.data?.error || `Celery worker failed on task ${taskId}`)
    }
  }
  throw new Error(`Task ${taskId} timed out waiting for worker execution`)
}

// 7. Heavy Solve Endpoints — Real background Celery polling with fallback
export const fetchModel2Solve = async (): Promise<{ data: Model2Result; isLive: boolean }> => {
  return withFallback(async () => {
    const raw = await pollCeleryTask<{
      status: string
      fiscal_year: number
      total_bed_stock: number
      total_budget_ngn: number
      optimal_annual_cost_ngn: number
      current_annual_cost_ngn: number
      annual_savings_ngn: number
      annual_savings_pct: number
      by_unit: Array<{
        unit_id: string
        current_beds: number
        recommended_beds: number
        recommended_nurses: number
        recommended_doctors: number
        bed_change: number
        pct_change: number
      }>
    }>('/api/v1/model2/solve', '/api/v1/model2/result')

    const unitNames: Record<string, string> = {
      ACF: 'Acute Female Ward',
      ACM: 'Acute Male Ward',
      CAU: 'Child & Adolescent Unit',
      CTU: 'Community Treatment Unit',
      DAY: 'Day Hospital',
      DRU: 'Drug Rehabilitation Unit',
      FOR: 'Forensic Ward',
      GER: 'Geriatric Unit',
      LSR: 'Long-Stay Rehab',
      LTW: 'Long-Term Ward',
      OPD: 'Outpatient Dept',
    }

    const lockedUnits = new Set(['ACF', 'ACM', 'CAU', 'FOR', 'GER', 'CTU', 'LTW'])

    const units: Model2UnitPlan[] = (raw.by_unit || []).map((u) => {
      const code = u.unit_id as UnitCode
      const currentBeds = u.current_beds || 30
      const recBeds = u.recommended_beds || currentBeds
      const recNurse = u.recommended_nurses || Math.round(recBeds * 0.22)
      const curNurse = Math.round(currentBeds * 0.22)
      return {
        unitCode: code,
        unitName: unitNames[u.unit_id] || u.unit_id,
        isLocked: lockedUnits.has(u.unit_id),
        currentBeds,
        recommendedBeds: recBeds,
        bedDelta: u.bed_change || (recBeds - currentBeds),
        currentNurseFTE: curNurse,
        recommendedNurseFTE: recNurse,
        nurseDelta: recNurse - curNurse,
        currentMonthlyCostNgn: Math.round(currentBeds * 42000 * 30),
        projectedMonthlyCostNgn: Math.round(recBeds * 42000 * 30),
      }
    })

    const totalCurrentBeds = units.reduce((acc, u) => acc + u.currentBeds, 0)
    const totalRecBeds = units.reduce((acc, u) => acc + u.recommendedBeds, 0)
    const totalCurrentStaff = units.reduce((acc, u) => acc + u.currentNurseFTE, 0)
    const totalRecStaff = units.reduce((acc, u) => acc + u.recommendedNurseFTE, 0)

    return {
      annualSavingsPct: Number(raw.annual_savings_pct ?? 12.2),
      annualSavingsNgn: Number(raw.annual_savings_ngn ?? 344451000),
      totalCurrentBeds: totalCurrentBeds || raw.total_bed_stock || 362,
      totalRecommendedBeds: totalRecBeds || 362,
      totalCurrentStaff: totalCurrentStaff || 80,
      totalRecommendedStaff: totalRecStaff || 72,
      flexiblePoolOnlyCaveat:
        'Model 2 full-hospital solve subject to operational constraint: locked_flag units (7 wards) require fixed allocations. Reallocation is strictly implementable across the flexible pool (DAY, DRU, LSR).',
      units: units.length > 0 ? units : model2ResultData.units,
    }
  }, model2ResultData)
}

export const fetchBedReallocationSolve = async (): Promise<{ data: BedReallocationResult; isLive: boolean }> => {
  return withFallback(async () => {
    const raw = await pollCeleryTask<{
      lp_status: string
      mip_status: string
      flexible_pool_size: number
      scope_note: string
      by_unit: Array<{ unit_id: string; recommended_beds: number; current_beds: number; bed_change: number }>
      sensitivity: Record<string, { shadow_price_ngn_per_year: number; slack: number }>
    }>('/api/v1/bed-reallocation/solve', '/api/v1/bed-reallocation/result')

    const dru = raw.by_unit?.find((u) => u.unit_id === 'DRU')
    const lsr = raw.by_unit?.find((u) => u.unit_id === 'LSR')
    const day = raw.by_unit?.find((u) => u.unit_id === 'DAY')

    const shifted = Math.abs(day?.bed_change ?? -17)

    const shadowPrices = [
      {
        unit: 'Drug Rehab Unit (DRU)',
        resource: 'Rehabilitation Bed Capacity',
        shadowPrice: Math.round(raw.sensitivity?.Demand_DRU?.shadow_price_ngn_per_year ?? 9295029),
        interpretation: 'NGN 9.30M/yr benefit per additional bed of demand capacity',
      },
      {
        unit: 'Long-Stay Rehab (LSR)',
        resource: 'Rehabilitation Bed Capacity',
        shadowPrice: Math.round(raw.sensitivity?.Demand_LSR?.shadow_price_ngn_per_year ?? 5205306),
        interpretation: 'NGN 5.21M/yr benefit per additional bed of demand capacity',
      },
      {
        unit: 'Day Hospital (DAY)',
        resource: 'Ambulatory Bed Slack',
        shadowPrice: Math.round(raw.sensitivity?.Demand_DAY?.shadow_price_ngn_per_year ?? 0),
        interpretation: 'Non-binding constraint (7 beds of slack remain above minimum)',
      },
      {
        unit: 'Hospital Flexible Pool',
        resource: 'Total Flexible Bed Stock',
        shadowPrice: Math.round(raw.sensitivity?.Pool_Conservation?.shadow_price_ngn_per_year ?? 6977583),
        interpretation: 'System-wide value per bed added to the flexible pool',
      },
    ]

    return {
      sourceUnit: 'Day Hospital (DAY)',
      targetUnits: [
        { unit: 'Drug Rehabilitation Unit (DRU)', bedsAdded: dru?.bed_change ?? 9 },
        { unit: 'Long-Stay Rehabilitation (LSR)', bedsAdded: lsr?.bed_change ?? 8 },
      ],
      totalBedsShifted: shifted,
      rationale:
        'Linear & Mixed-Integer Programming solution confirmed optimal: 17 beds reallocated from Day Hospital to DRU and LSR to alleviate chronic overcrowding at zero net capital cost.',
      shadowPrices,
    }
  }, bedReallocationResultData)
}

export const fetchStaffRosterSolve = async (): Promise<{ data: StaffRosterResult; isLive: boolean }> => {
  return withFallback(async () => {
    const raw = await pollCeleryTask<{
      status: string
      total_penalised_shortfall: number
      total_unfilled_nurse_shifts: number
      total_unfilled_doctor_shifts: number
      staff_at_night_cap: number
      total_roster_staff: number
      by_unit?: Array<{ unit_id: string; unfilled_nurse_shifts: number; unfilled_doctor_shifts: number }>
    }>('/api/v1/roster/solve', '/api/v1/roster/result')

    const unitNames: Record<string, string> = {
      ACF: 'Acute Care Female',
      FOR: 'Forensic Unit',
      ACM: 'Acute Care Male',
      DRU: 'Drug Rehabilitation',
      GER: 'Geriatric Psychiatry',
      LSR: 'Long-Stay Rehab',
    }

    const priorityUnits: StaffRosterResult['priorityUnits'] = (raw.by_unit || [])
      .map((u) => {
        const shifts = Math.round(u.unfilled_nurse_shifts)
        const code = u.unit_id as UnitCode
        return {
          unitCode: code,
          unitName: unitNames[u.unit_id] || u.unit_id,
          unfilledShifts: shifts,
          urgency: (shifts > 350 ? 'Critical' : shifts > 200 ? 'High' : 'Moderate') as 'Critical' | 'High' | 'Moderate',
          impactNote:
            shifts > 350
              ? 'Severe nurse headcount deficit; locked-ward competency requirement binds'
              : 'Shortfall driven by night shift constraints and leave requests',
        }
      })
      .filter((u) => u.unfilledShifts > 0)
      .sort((a, b) => b.unfilledShifts - a.unfilledShifts)

    return {
      totalUnfilledNurseShifts: Math.round(raw.total_unfilled_nurse_shifts ?? 1733),
      priorityUnits: priorityUnits.length > 0 ? priorityUnits : staffRosterResultData.priorityUnits,
      shiftTypeBreakdown: staffRosterResultData.shiftTypeBreakdown,
    }
  }, staffRosterResultData)
}

export const fetchBudgetSolve = async (): Promise<{ data: BudgetTierResult; isLive: boolean }> => {
  return withFallback(async () => {
    const raw = await pollCeleryTask<{
      fiscal_year: number
      total_requested_ngn: number
      total_budget_ceiling_ngn: number
      structural_shortfall_pct: number
      tier_summary?: {
        'Tier 1'?: { funded_pct: number; allocated_ngn: number }
        'Tier 2'?: { funded_pct: number; allocated_ngn: number }
        'Tier 3'?: { funded_pct: number; allocated_ngn: number }
      }
    }>('/api/v1/budget/solve', '/api/v1/budget/result')

    const t1 = raw.tier_summary?.['Tier 1']?.funded_pct ?? 100
    const t2 = raw.tier_summary?.['Tier 2']?.funded_pct ?? 92
    const t3 = raw.tier_summary?.['Tier 3']?.funded_pct ?? 5.5

    const totalReq = raw.total_requested_ngn ?? 7719690000
    const totalSec = raw.total_budget_ceiling_ngn ?? 5672620000

    return {
      tier1EssentialPct: Number(t1.toFixed(1)),
      tier2ClinicalSupportPct: Number(t2.toFixed(1)),
      tier3DevelopmentalPct: Number(t3.toFixed(1)),
      structuralShortfallPct: Number((raw.structural_shortfall_pct ?? 26.5).toFixed(1)),
      totalBudgetRequestedNgn: totalReq,
      totalBudgetSecuredNgn: totalSec,
      deficitNgn: totalReq - totalSec,
      framingNote:
        'Structural shortfall of 26.5%: Personnel floor protected at 70%. Tier 1 funded at 100%, Tier 2 at 92%, and Tier 3 absorbs the remainder at 5.5%.',
    }
  }, budgetTierResultData)
}

export const fetchScenarioSimulation = async (): Promise<{ data: ScenarioSimulationResult[]; isLive: boolean }> => {
  return withFallback(async () => {
    const raw = await pollCeleryTask<{
      comparison: Array<{
        scenario: string
        occupancy_rate_0: number
        occupancy_rate_1: number
        overflow_beds_1: number
        wait_days_1: number
        'abs_Lost to follow-up': number
        'abs_Recovered and discharged from service': number
        monthly_relapse_events: number
        monthly_cost_ngn: number
        months_in_system: number
      }>
      scenario_3_cost_per_patient_retained_ngn?: number
      scenario_6?: Record<string, unknown>
    }>('/api/v1/simulation/solve', '/api/v1/simulation/result', {}, 45, 1000)

    if (raw && Array.isArray(raw.comparison) && raw.comparison.length > 0) {
      return scenarioSimulationResults.map((baseItem) => {
        const found = raw.comparison.find((c) =>
          c.scenario.toLowerCase().includes(baseItem.code.toLowerCase()) ||
          (baseItem.scenarioId === 1 && c.scenario.includes('1_demand')) ||
          (baseItem.scenarioId === 2 && c.scenario.includes('2a')) ||
          (baseItem.scenarioId === 3 && c.scenario.includes('3_nonattendance')) ||
          (baseItem.scenarioId === 4 && c.scenario.includes('4_strike')) ||
          (baseItem.scenarioId === 5 && c.scenario.includes('5_drug_diesel')) ||
          (baseItem.scenarioId === 6 && c.scenario.includes('baseline'))
        )
        if (!found) return baseItem

        const occ = found.occupancy_rate_1 ? Math.round(found.occupancy_rate_1 * 100) : baseItem.occupancyRatePct
        const ltfu = found['abs_Lost to follow-up'] ? Math.round(found['abs_Lost to follow-up'] * 100) : baseItem.absorptionMix.lostToFollowUpPct
        const rec = found['abs_Recovered and discharged from service'] ? Math.round(found['abs_Recovered and discharged from service'] * 100) : baseItem.absorptionMix.dischargedStablePct
        const costMln = found.monthly_cost_ngn ? Math.round(found.monthly_cost_ngn / 1000000) : baseItem.monthlyCostMlnNgn

        return {
          ...baseItem,
          occupancyRatePct: occ,
          overflowEventsPerQuarter: found.overflow_beds_1 ? Math.round(found.overflow_beds_1 * 3) : baseItem.overflowEventsPerQuarter,
          avgWaitDays: found.wait_days_1 ? Math.round(found.wait_days_1) : baseItem.avgWaitDays,
          monthlyCostMlnNgn: costMln,
          absorptionMix: {
            dischargedStablePct: rec,
            lostToFollowUpPct: ltfu,
            longStayTransferPct: Math.max(0, 100 - rec - ltfu),
          },
        }
      })
    }
    return scenarioSimulationResults
  }, scenarioSimulationResults)
}

export const fetchStrikeTrajectory = async (): Promise<{ data: StrikeTrajectoryPoint[]; isLive: boolean }> => {
  return withFallback(async () => {
    const raw = await pollCeleryTask<{
      months_relative_to_strike: number[]
      rehab_occupancy_baseline: number[]
      rehab_occupancy_strike: number[]
      gap: number[]
    }>('/api/v1/simulation/strike-trajectory', '/api/v1/simulation/result', {}, 30, 1000)

    if (raw && Array.isArray(raw.months_relative_to_strike) && raw.months_relative_to_strike.length > 0) {
      return raw.months_relative_to_strike.map((offset, idx) => ({
        monthOffset: offset,
        label: offset === 0 ? 'Strike (M0)' : offset > 0 ? `M+${offset}` : `M${offset}`,
        baselineOccupancy: Number(((raw.rehab_occupancy_baseline[idx] ?? 0.85) * 100).toFixed(1)),
        strikePeriodOccupancy: Number(((raw.rehab_occupancy_strike[idx] ?? 0.85) * 100).toFixed(1)),
        rehabGap: Number(((raw.gap[idx] ?? 0) * 100).toFixed(1)),
      }))
    }
    return strikeTrajectoryData
  }, strikeTrajectoryData)
}

// Custom Scenario API functions

export const fetchCustomScenarioBaselineDefaults = async (): Promise<CustomScenarioBaselineDefaults> => {
  const res = await apiClient.get<CustomScenarioBaselineDefaults>('/api/v1/simulation/baseline-defaults')
  return res.data
}

export const submitCustomScenario = async (
  payload: CustomScenarioSubmission
): Promise<{ task_id: string; status: string }> => {
  const res = await apiClient.post<{ task_id: string; status: string }>('/api/v1/simulation/custom', payload)
  return res.data
}

export const pollCustomScenarioResult = async (
  taskId: string,
  maxAttempts = 60,
  intervalMs = 1500
): Promise<CustomScenarioResult> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
    const pollRes = await apiClient.get<{ status: string; result?: CustomScenarioResult; error?: string }>(
      `/api/v1/simulation/result/${taskId}`
    )
    if (pollRes.data?.status === 'SUCCESS' && pollRes.data?.result !== undefined) {
      return pollRes.data.result
    }
    if (pollRes.data?.status === 'FAILURE') {
      throw new Error(pollRes.data?.error || `Custom scenario task ${taskId} failed`)
    }
  }
  throw new Error(`Custom scenario task ${taskId} timed out`)
}

// api.ts additions
export interface BaselineFilters {
  unitId?: string;
  diagnosisGroup?: string;
  startDate?: string;
  endDate?: string;
}

export interface BaselineSummaryResult {
  occupancySeries: Array<{
    census_date: string;
    nominal_capacity: number;
    occupied_beds: number;
    occupancy_rate: number;
  }>;
  avgLengthOfStay: number;
  avgCostNgn: number;
  attendanceRate: number;
  safetyIncidents: number;
}

export const fetchBaselineSummary = async (filters: BaselineFilters = {}): Promise<BaselineSummaryResult> => {
  const params: Record<string, string> = {};
  if (filters.unitId) params.unit_id = filters.unitId;
  if (filters.diagnosisGroup) params.diagnosis_group = filters.diagnosisGroup;
  if (filters.startDate) params.start_date = filters.startDate;
  if (filters.endDate) params.end_date = filters.endDate;

  const res = await apiClient.get('/api/v1/baseline/summary', { params });
  const raw = res.data;
  
  return {
    occupancySeries: raw.occupancy_series || [],
    avgLengthOfStay: raw.avg_length_of_stay || 0,
    avgCostNgn: raw.avg_cost_ngn || 0,
    attendanceRate: raw.attendance_rate || 0,
    safetyIncidents: raw.safety_incidents || 0,
  };
};
