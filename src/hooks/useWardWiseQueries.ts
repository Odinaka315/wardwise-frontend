import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchBaselineSummary, type BaselineFilters } from '../services/api';
import {
  checkBackendHealth,
  fetchOverviewBaseline,
  fetchPathwaySummary,
  fetchForecast,
  fetchRiskWorklist,
  fetchPatientSegments,
  fetchLongStaySummary,
  solveModel2,
  solveBedReallocation,
  solveRoster,
  solveBudget,
  fetchScenarioSimulation,
  fetchStrikeTrajectory,
  fetchPathwayFilterOptions,
  type PathwayFilters,
  MODEL2_BASELINE_ASSUMPTIONS,
  BED_REALLOCATION_BASELINE_ASSUMPTIONS,
  ROSTER_BASELINE_ASSUMPTIONS,
  BUDGET_BASELINE_ASSUMPTIONS,
} from '../services/api'

import type {
  Model2Assumptions,
  BedReallocationAssumptions,
  RosterAssumptions,
  BudgetAssumptions,
  SolveJobStatus,
  Model2SolveResult,
  BedReallocationSolveResult,
  RosterSolveResult,
  BudgetSolveResult,
} from '../types'

function useSolveMutation<TAssumptions, TResult>(
  solveFn: (a: TAssumptions, onStatus?: (s: SolveJobStatus) => void) => Promise<TResult>,
  defaultAssumptions: TAssumptions,
) {
  const [jobStatus, setJobStatus] = useState<SolveJobStatus>('idle')
  // The first successful resolve becomes the "what changed" reference
  // point for later resolves. Starts undefined -- there is no result
  // until a real solve has actually run, by design.
  const [baselineResult, setBaselineResult] = useState<TResult | undefined>(undefined)
 
  const mutation = useMutation({
    mutationFn: (assumptions: TAssumptions) => solveFn(assumptions, setJobStatus),
    onSuccess: (result) => {
      setBaselineResult((prev) => prev ?? result)
    },
  })
 
  return {
    resolve: (assumptions: TAssumptions) => mutation.mutate(assumptions),
    result: mutation.data,
    baselineResult,
    jobStatus,
    isResolving: mutation.isPending,
    error: mutation.error as Error | null,
    defaultAssumptions,
  }
}

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
export const usePathwaySummaryQuery = (filters: PathwayFilters = {}) => {
  return useQuery({
    // Including `filters` in the query key is what makes "recompute on the
    // fly when filtered" actually happen: React Query treats a different
    // filters object as a different query and refetches automatically.
    queryKey: ['pathway-summary', filters],
    queryFn: () => fetchPathwaySummary(filters),
  })
}

export const usePathwayFilterOptionsQuery = () => {
  return useQuery({
    queryKey: ['pathway-filter-options'],
    queryFn: fetchPathwayFilterOptions,
    staleTime: 1000 * 60 * 30, // these barely change -- segments/zones/diagnoses are near-static reference data
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
export const useModel2Resolver = () =>
  useSolveMutation<Model2Assumptions, Model2SolveResult>(solveModel2, MODEL2_BASELINE_ASSUMPTIONS)
 
export const useBedReallocationResolver = () =>
  useSolveMutation<BedReallocationAssumptions, BedReallocationSolveResult>(
    solveBedReallocation, BED_REALLOCATION_BASELINE_ASSUMPTIONS
  )
 
export const useRosterResolver = () =>
  useSolveMutation<RosterAssumptions, RosterSolveResult>(solveRoster, ROSTER_BASELINE_ASSUMPTIONS)
 
export const useBudgetResolver = () =>
  useSolveMutation<BudgetAssumptions, BudgetSolveResult>(solveBudget, BUDGET_BASELINE_ASSUMPTIONS)

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

// useWardWiseQueries.ts additions


export const useBaselineSummaryQuery = (filters: BaselineFilters = {}) => {
  return useQuery({
    queryKey: ['baseline-summary', filters],
    queryFn: () => fetchBaselineSummary(filters),
  });
};