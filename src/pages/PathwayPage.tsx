import { useMemo, useState } from 'react'
import { Clock, ShieldAlert, AlertTriangle, SlidersHorizontal } from 'lucide-react'
import { usePathwaySummaryQuery, usePathwayFilterOptionsQuery } from '../hooks/useWardWiseQueries'
import type { PathwayFilters } from '../services/api'
import { pathwaySummaryData } from '../data/mockData'
import { PageSkeleton } from '../components/ui/Skeleton'
import { StatusBadge } from '../components/ui/StatusBadge'

const EMPTY_FILTERS: PathwayFilters = {}

export const PathwayPage = () => {
  // Draft filters hold the UI state until the user clicks Run
  const [draftFilters, setDraftFilters] = useState<PathwayFilters>(EMPTY_FILTERS)
  // Active filters dictate what React Query actually fetches
  const [activeFilters, setActiveFilters] = useState<PathwayFilters>(EMPTY_FILTERS)

  const { data, isFetching, refetch } = usePathwaySummaryQuery(activeFilters)
  const { data: filterOptions } = usePathwayFilterOptionsQuery()

  const summary = data?.data ?? pathwaySummaryData
  const isLive = Boolean(data?.isLive)
  const isLoading = !data && isFetching

  const {
    states,
    transitionMatrix,
    lostToFollowUpRate,
    expectedMonthsToAbsorption,
    absorptionProbabilities,
    keyFindingNote,
    sampleSize,
    patientCount,
    reliable,
    minReliableTransitions,
    statesWithNoData,
    noData,
    noDataMessage,
  } = summary

  const transientCount = Object.keys(expectedMonthsToAbsorption).length
  const noDataStates = new Set(statesWithNoData ?? [])

  const ltfuRange = useMemo(() => {
    const values = absorptionProbabilities.map((a) => a.lostToFollowUp)
    if (values.length === 0) return null
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [absorptionProbabilities])

  const getCellStyle = (val: number, isAbsorbing: boolean): string => {
    if (isAbsorbing && val === 1.0) return 'bg-white/8 text-white font-bold'
    if (val === 0) return 'text-slate-700'
    if (val > 0.4) return 'bg-emerald-500/30 text-emerald-300 font-bold'
    if (val > 0.25) return 'bg-emerald-500/20 text-emerald-400'
    if (val > 0.1) return 'bg-emerald-500/10 text-emerald-400/80'
    return 'text-slate-500'
  }

  const updateDraftFilter = <K extends keyof PathwayFilters>(key: K, value: PathwayFilters[K]) => {
    setDraftFilters((prev) => {
      const next = { ...prev }
      if (value === undefined || value === '') delete next[key]
      else next[key] = value
      return next
    })
  }

  const applyFilters = () => setActiveFilters(draftFilters)
  
  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS)
    setActiveFilters(EMPTY_FILTERS)
  }

  // Generate chips based on the *currently active* fetch, not the draft
  const activeFilterChips: { key: keyof PathwayFilters; label: string }[] = []
  if (activeFilters.segmentCode !== undefined) {
    const label = filterOptions?.segments.find((s) => s.code === activeFilters.segmentCode)?.label
    activeFilterChips.push({ key: 'segmentCode', label: `Segment: ${label ?? activeFilters.segmentCode}` })
  }
  if (activeFilters.familySupportTier) {
    const label = filterOptions?.familySupportTiers.find((t) => t.value === activeFilters.familySupportTier)?.label
    activeFilterChips.push({ key: 'familySupportTier', label: `Family support: ${label ?? activeFilters.familySupportTier}` })
  }
  if (activeFilters.zoneId) {
    const label = filterOptions?.zones.find((z) => z.id === activeFilters.zoneId)?.name
    activeFilterChips.push({ key: 'zoneId', label: `Zone: ${label ?? activeFilters.zoneId}` })
  }
  if (activeFilters.diagnosisGroup) {
    activeFilterChips.push({ key: 'diagnosisGroup', label: `Diagnosis: ${activeFilters.diagnosisGroup}` })
  }
  const hasActiveFilters = activeFilterChips.length > 0

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold tracking-widest text-rose-400 uppercase">
            Clinical Intelligence
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Patient Pathway Explorer
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Absorbing Markov chain: state transitions, retention leakage, and terminal absorption.
          </p>
        </div>
        <StatusBadge isLive={isLive} isFetching={isFetching} onRefetch={refetch} label="Pathway API" />
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Configure Subgroup</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
            value={draftFilters.segmentCode ?? ''}
            onChange={(e) => updateDraftFilter('segmentCode', e.target.value === '' ? undefined : Number(e.target.value))}
          >
            <option value="">All segments</option>
            {filterOptions?.segments.map((s) => (
              <option key={s.code} value={s.code}>{s.label}</option>
            ))}
          </select>

          <select
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
            value={draftFilters.familySupportTier ?? ''}
            onChange={(e) => updateDraftFilter('familySupportTier', (e.target.value || undefined) as PathwayFilters['familySupportTier'])}
          >
            <option value="">All family support levels</option>
            {filterOptions?.familySupportTiers.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
            value={draftFilters.zoneId ?? ''}
            onChange={(e) => updateDraftFilter('zoneId', e.target.value || undefined)}
          >
            <option value="">All zones</option>
            {filterOptions?.zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>

          <select
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
            value={draftFilters.diagnosisGroup ?? ''}
            onChange={(e) => updateDraftFilter('diagnosisGroup', e.target.value || undefined)}
          >
            <option value="">All diagnosis groups</option>
            {filterOptions?.diagnosisGroups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
          <button
            onClick={applyFilters}
            disabled={isFetching}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {isFetching ? 'Running...' : 'Run Analysis'}
          </button>
          {(Object.keys(draftFilters).length > 0 || Object.keys(activeFilters).length > 0) && (
            <button
              onClick={resetFilters}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {hasActiveFilters && !noData && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500">Showing results for:</span>
          {activeFilterChips.map((chip) => (
            <span
              key={chip.key}
              className="flex items-center gap-1.5 text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full px-2.5 py-1"
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {/* Wrapping container for the subtle re-fetch dimming state */}
      <div className="relative mt-2">
        {isFetching && !isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px] rounded-xl transition-all duration-300">
            <div className="bg-slate-900 border border-emerald-500/30 shadow-xl rounded-full px-5 py-2.5 flex items-center gap-3">
              <Clock className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="text-sm font-semibold text-emerald-400">Recalculating Markov chain...</span>
            </div>
          </div>
        )}

        <div className={`space-y-6 transition-opacity duration-300 ${isFetching && !isLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          {noData ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No matching transitions</h3>
              <p className="text-sm text-slate-400 mt-1.5 max-w-md mx-auto">
                {noDataMessage || 'No recorded patient pathways match this specific filter combination.'}
              </p>
            </div>
          ) : (
            <>
              {reliable === false && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    This filter combination is based on a small sample ({sampleSize} transitions
                    {typeof patientCount === 'number' ? `, ${patientCount} patients` : ''}, below the
                    {' '}{minReliableTransitions ?? 150}-transition threshold for a stable estimate). Treat these
                    numbers as indicative, not precise.
                  </p>
                </div>
              )}

              {typeof sampleSize === 'number' && (
                <p className="text-xs text-slate-500 -mb-2">
                  Based on <span className="text-slate-300 font-medium">{sampleSize.toLocaleString()}</span> transitions
                  from <span className="text-slate-300 font-medium">{(patientCount ?? 0).toLocaleString()}</span> patients.
                </p>
              )}

              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">
                        Primary Discovery
                      </span>
                      <h3 className="text-xl font-bold text-white mt-1">
                        {ltfuRange ? `${ltfuRange.min.toFixed(1)}–${ltfuRange.max.toFixed(1)}%` : '—'} Lost-to-Follow-up Rate
                      </h3>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
                        {keyFindingNote}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-rose-500/20 p-3 rounded-lg text-center shrink-0">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Mean</span>
                    <span className="text-2xl font-mono font-bold text-rose-400">{lostToFollowUpRate}%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(expectedMonthsToAbsorption).map(([stateName, months]) => {
                  const hasNoData = noDataStates.has(stateName)
                  return (
                    <div key={stateName} className="glass-card rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">{stateName}</span>
                        <Clock className="w-4 h-4 text-emerald-500" />
                      </div>
                      {hasNoData ? (
                        <div className="text-xs text-amber-400/90 mt-2">No data for this subgroup</div>
                      ) : (
                        <>
                          <div className="text-2xl font-mono font-bold text-white mt-1">
                            {months} <span className="text-sm font-normal text-slate-500">mo</span>
                          </div>
                          <div className="w-full bg-white/5 h-1 rounded-full mt-3 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(Number(months) / 20) * 100}%` }} />
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Transition Matrix (P)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">30-day epoch conditional destination probabilities</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="inline-block w-3 h-3 bg-emerald-500/10 rounded border border-emerald-500/20" /> Low
                    <span className="inline-block w-3 h-3 bg-emerald-500/20 rounded" /> Med
                    <span className="inline-block w-3 h-3 bg-emerald-500/30 rounded" /> High
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="py-3 px-3 text-left text-[11px] text-slate-500 uppercase tracking-wider font-medium bg-white/3">
                          Origin
                        </th>
                        {states.map((st) => (
                          <th key={st} className="py-3 px-3 text-center text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                            {st}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/3">
                      {transitionMatrix.map((row, rIdx) => {
                        const isAbsorbing = rIdx >= transientCount
                        const rowState = states[rIdx]
                        const rowHasNoData = !isAbsorbing && noDataStates.has(rowState)
                        
                        return (
                          <tr key={rowState} className={isAbsorbing ? 'bg-white/2' : ''}>
                            <td className="py-3 px-3 font-semibold text-slate-300 bg-white/3 border-r border-white/5 text-[11px]">
                              {rowState}
                              {isAbsorbing && <span className="ml-1 text-[8px] text-slate-600 font-mono">(Absorb)</span>}
                            </td>
                            {rowHasNoData ? (
                              <td colSpan={states.length} className="py-3 px-3 text-center text-[11px] text-amber-400/80 italic">
                                No transitions logged for this state in the filtered subgroup
                              </td>
                            ) : (
                              row.map((val, cIdx) => (
                                <td
                                  key={cIdx}
                                  className={`py-3 px-3 text-center font-mono text-[11px] ${getCellStyle(val, isAbsorbing)}`}
                                >
                                  {(val * 100).toFixed(0)}%
                                </td>
                              ))
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="glass-card rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Terminal Absorption by Starting State</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Long-run probability of each exit pathway</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-500" /> Stable</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-rose-500" /> LTFU</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-amber-500" /> Long-Term</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {absorptionProbabilities.map((item) => {
                    const hasNoData = noDataStates.has(item.state)
                    return (
                      <div key={item.state} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-300">{item.state}</span>
                          {hasNoData ? (
                            <span className="text-[11px] text-amber-400/80 italic">No data for this subgroup</span>
                          ) : (
                            <span className="font-mono text-[11px] text-slate-500">
                              <span className="text-emerald-400">{item.dischargedStable}%</span>
                              {' / '}
                              <span className="text-rose-400">{item.lostToFollowUp}%</span>
                              {' / '}
                              <span className="text-amber-400">{item.transferredLongTerm}%</span>
                            </span>
                          )}
                        </div>
                        {!hasNoData && (
                          <div className="h-3 w-full bg-white/5 rounded-full flex overflow-hidden">
                            <div className="bg-emerald-500 transition-all" style={{ width: `${item.dischargedStable}%` }} />
                            <div className="bg-rose-500 transition-all" style={{ width: `${item.lostToFollowUp}%` }} />
                            <div className="bg-amber-500 transition-all" style={{ width: `${item.transferredLongTerm}%` }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}