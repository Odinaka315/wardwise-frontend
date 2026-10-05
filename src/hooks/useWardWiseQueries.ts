import { useQuery } from '@tanstack/react-query'
import {
  checkBackendHealth,
  fetchOverviewBaseline,
  fetchPathwaySummary,
  fetchForecast,
  fetchRiskWorklist,
  fetchPatientSegments,
  fetchLongStaySummary,
  fetchModel2Solve,
  fetchBedReallocationSolve,
  fetchStaffRosterSolve,
  fetchBudgetSolve,
  fetchScenarioSimulation,
  fetchStrikeTrajectory,
} from '../services/api'

// Backend connectivity and database health hook
export const useBackendHealthQuery = () => {
  return useQuery({
    queryKey: ['backend-health'],
    queryFn: checkBackendHealth,
    refetchInterval: 30000, // Periodically check health in the background every 30s
    staleTime: 10000,
  })
}

// 1. Data Overview (Baseline)
export const useOverviewBaselineQuery = () => {
  return useQuery({
    queryKey: ['overview-baseline'],
    queryFn: fetchOverviewBaseline,
  })
}

// 2. Patient Pathway Explorer (Markov Chain Summary)
export const usePathwaySummaryQuery = () => {
  return useQuery({
    queryKey: ['pathway-summary'],
    queryFn: fetchPathwaySummary,
  })
}

// 3. Admission Forecasts
export const useForecastQuery = () => {
  return useQuery({
    queryKey: ['forecast'],
    queryFn: fetchForecast,
  })
}

// 4. Predictive Clinical Risk Worklists
export const useRiskWorklistQuery = (type: 'Readmission' | 'Non-attendance') => {
  return useQuery({
    queryKey: ['risk-worklist', type],
    queryFn: () => fetchRiskWorklist(type),
  })
}

// 5. Patient Segments (K-Means Clustering)
export const usePatientSegmentsQuery = () => {
  return useQuery({
    queryKey: ['patient-segments'],
    queryFn: fetchPatientSegments,
  })
}

// 6. Long-Stay / Long-Term Ward Tracker
export const useLongStayQuery = () => {
  return useQuery({
    queryKey: ['long-stay-summary'],
    queryFn: fetchLongStaySummary,
  })
}

// 7. Optimization Solves & Scenarios
export const useModel2Query = () => {
  return useQuery({
    queryKey: ['model2-solve'],
    queryFn: fetchModel2Solve,
    staleTime: 1000 * 60 * 15,
  })
}

export const useBedReallocationQuery = () => {
  return useQuery({
    queryKey: ['bed-reallocation-solve'],
    queryFn: fetchBedReallocationSolve,
    staleTime: 1000 * 60 * 15,
  })
}

export const useStaffRosterQuery = () => {
  return useQuery({
    queryKey: ['staff-roster-solve'],
    queryFn: fetchStaffRosterSolve,
    staleTime: 1000 * 60 * 15,
  })
}

export const useBudgetSolveQuery = () => {
  return useQuery({
    queryKey: ['budget-tier-solve'],
    queryFn: fetchBudgetSolve,
    staleTime: 1000 * 60 * 15,
  })
}

export const useScenarioSimulationQuery = () => {
  return useQuery({
    queryKey: ['scenario-simulation'],
    queryFn: fetchScenarioSimulation,
    staleTime: 1000 * 60 * 15,
  })
}

export const useStrikeTrajectoryQuery = () => {
  return useQuery({
    queryKey: ['strike-trajectory'],
    queryFn: fetchStrikeTrajectory,
    staleTime: 1000 * 60 * 15,
  })
}
