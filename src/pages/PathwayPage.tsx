import { Clock, ShieldAlert } from 'lucide-react'
import { usePathwaySummaryQuery } from '../hooks/useWardWiseQueries'
import { pathwaySummaryData } from '../data/mockData'
import { PageSkeleton } from '../components/ui/Skeleton'
import { StatusBadge } from '../components/ui/StatusBadge'

export const PathwayPage = () => {
  const { data, isFetching, refetch } = usePathwaySummaryQuery()
  const summary = data?.data ?? pathwaySummaryData
  const isLive = Boolean(data?.isLive)
  const isLoading = !data && isFetching

  const { states, transitionMatrix, lostToFollowUpRate, expectedMonthsToAbsorption, absorptionProbabilities, keyFindingNote } = summary

  const getCellStyle = (val: number, isAbsorbing: boolean): string => {
    if (isAbsorbing && val === 1.0) return 'bg-white/8 text-white font-bold'
    if (val === 0) return 'text-slate-700'
    if (val > 0.4) return 'bg-emerald-500/30 text-emerald-300 font-bold'
    if (val > 0.25) return 'bg-emerald-500/20 text-emerald-400'
    if (val > 0.1) return 'bg-emerald-500/10 text-emerald-400/80'
    return 'text-slate-500'
  }

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
                35–43% Lost-to-Follow-up Rate
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
        {Object.entries(expectedMonthsToAbsorption).map(([stateName, months]) => (
          <div key={stateName} className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">{stateName}</span>
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-mono font-bold text-white mt-1">
              {months} <span className="text-sm font-normal text-slate-500">mo</span>
            </div>
            <div className="w-full bg-white/5 h-1 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(Number(months) / 20) * 100}%` }} />
            </div>
          </div>
        ))}
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
                const isAbsorbing = rIdx >= 3
                return (
                  <tr key={states[rIdx]} className={isAbsorbing ? 'bg-white/2' : ''}>
                    <td className="py-3 px-3 font-semibold text-slate-300 bg-white/3 border-r border-white/5 text-[11px]">
                      {states[rIdx]}
                      {isAbsorbing && <span className="ml-1 text-[8px] text-slate-600 font-mono">(Absorb)</span>}
                    </td>
                    {row.map((val, cIdx) => (
                      <td
                        key={cIdx}
                        className={`py-3 px-3 text-center font-mono text-[11px] ${getCellStyle(val, isAbsorbing)}`}
                      >
                        {(val * 100).toFixed(0)}%
                      </td>
                    ))}
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
          {absorptionProbabilities.map((item) => (
            <div key={item.state} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-300">{item.state}</span>
                <span className="font-mono text-[11px] text-slate-500">
                  <span className="text-emerald-400">{item.dischargedStable}%</span>
                  {' / '}
                  <span className="text-rose-400">{item.lostToFollowUp}%</span>
                  {' / '}
                  <span className="text-amber-400">{item.transferredLongTerm}%</span>
                </span>
              </div>
              <div className="h-3 w-full bg-white/5 rounded-full flex overflow-hidden">
                <div className="bg-emerald-500 transition-all" style={{ width: `${item.dischargedStable}%` }} />
                <div className="bg-rose-500 transition-all" style={{ width: `${item.lostToFollowUp}%` }} />
                <div className="bg-amber-500 transition-all" style={{ width: `${item.transferredLongTerm}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
