import { useMemo, useState } from 'react'
import { Clock, ShieldAlert, AlertTriangle, SlidersHorizontal, X } from 'lucide-react'
import { usePathwaySummaryQuery, usePathwayFilterOptionsQuery } from '../hooks/useWardWiseQueries'
import type { PathwayFilters } from '../services/api'
import { pathwaySummaryData } from '../data/mockData'
import { PageSkeleton } from '../components/ui/Skeleton'
import { StatusBadge } from '../components/ui/StatusBadge'

const EMPTY_FILTERS: PathwayFilters = {}

export const PathwayPage = () => {
  const [filters, setFilters] = useState<PathwayFilters>(EMPTY_FILTERS)

  const { data, isFetching, refetch } = usePathwaySummaryQuery(filters)
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

  // Transient states are exactly the keys of expected_months_to_absorption
  // (it's derived from the fundamental matrix N, which is transient x
  // transient only) -- deriving the split this way means the table stays
  // correct whether the backend returns 6 states (mock) or 10 (live), rather
  // than assuming a fixed row count.
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

  const updateFilter = <K extends keyof PathwayFilters>(key: K, value: PathwayFilters[K]) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (value === undefined || value === '') {
        delete next[key]
      } else {
        next[key] = value
      }
      return next
    })
  }

  const activeFilterChips: { key: keyof PathwayFilters; label: string }[] = []
  if (filters.segmentCode !== undefined) {
    const label = filterOptions?.segments.find((s) => s.code === filters.segmentCode)?.label
    activeFilterChips.push({ key: 'segmentCode', label: `Segment: ${label ?? filters.segmentCode}` })
  }
  if (filters.familySupportTier) {
    const label = filterOptions?.familySupportTiers.find((t) => t.value === filters.familySupportTier)?.label
    activeFilterChips.push({ key: 'familySupportTier', label: `Family support: ${label ?? filters.familySupportTier}` })
  }
  if (filters.zoneId) {
    const label = filterOptions?.zones.find((z) => z.id === filters.zoneId)?.name
    activeFilterChips.push({ key: 'zoneId', label: `Zone: ${label ?? filters.zoneId}` })
  }
  if (filters.diagnosisGroup) {
    activeFilterChips.push({ key: 'diagnosisGroup', label: `Diagnosis: ${filters.diagnosisGroup}` })
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
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Filter pathway by</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
            value={filters.segmentCode ?? ''}
            onChange={(e) => updateFilter('segmentCode', e.target.value === '' ? undefined : Number(e.target.value))}
          >
            <option value="">All segments</option>
            {filterOptions?.segments.map((s) => (
              <option key={s.code} value={s.code}>{s.label}</option>
            ))}
          </select>

          <select
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
            value={filters.familySupportTier ?? ''}
            onChange={(e) => updateFilter('familySupportTier', (e.target.value || undefined) as PathwayFilters['familySupportTier'])}
          >
            <option value="">All family support levels</option>
            {filterOptions?.familySupportTiers.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
            value={filters.zoneId ?? ''}
            onChange={(e) => updateFilter('zoneId', e.target.value || undefined)}
          >
            <option value="">All zones</option>
            {filterOptions?.zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>

          <select
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
            value={filters.diagnosisGroup ?? ''}
            onChange={(e) => updateFilter('diagnosisGroup', e.target.value || undefined)}
          >
            <option value="">All diagnosis groups</option>
            {filterOptions?.diagnosisGroups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/5">
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                onClick={() => updateFilter(chip.key, undefined)}
                className="flex items-center gap-1.5 text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full px-2.5 py-1 hover:bg-emerald-500/20 transition-colors"
              >
                {chip.label}
                <X className="w-3 h-3" />
              </button>
            ))}
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2 ml-1"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* No-data empty state */}
      {noData ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No matching patients</h3>
          <p className="text-sm text-slate-400 mt-1.5 max-w-md mx-auto">
            {noDataMessage || 'No transitions match this filter combination. Try removing one of the filters above.'}
          </p>
        </div>
      ) : (
        <>
          {/* Reliability caution banner */}
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

          {/* Sample size line */}
          {typeof sampleSize === 'number' && (
            <p className="text-xs text-slate-500 -mb-2">
              Based on <span className="text-slate-300 font-medium">{sampleSize.toLocaleString()}</span> transitions
              from <span className="text-slate-300 font-medium">{(patientCount ?? 0).toLocaleString()}</span> patients
              {hasActiveFilters ? ' matching the selected filters.' : ' (unfiltered).'}
            </p>
          )}

          {/* LTFU Headline */}
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

          {/* Expected Months Cards */}
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

          {/* Transition Matrix */}
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
                            No data for this subgroup
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

          {/* Absorption Probabilities */}
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
  )
}
