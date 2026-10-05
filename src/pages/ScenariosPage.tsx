import { useState } from 'react'
import { CheckCircle2, Info, RefreshCw } from 'lucide-react'
import {
  useScenarioSimulationQuery,
  useStrikeTrajectoryQuery,
} from '../hooks/useWardWiseQueries'
import {
  scenarioSimulationResults as fallbackScenarios,
  strikeTrajectoryData as fallbackStrike,
} from '../data/mockData'
import { PageSkeleton } from '../components/ui/Skeleton'

export const ScenariosPage = () => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<number>(2)
  const [showStrikeDeepDive, setShowStrikeDeepDive] = useState<boolean>(true)

  const { data: simData, isFetching: isSimFetching, refetch: refetchSim } = useScenarioSimulationQuery()
  const { data: strikeData, isFetching: isStrikeFetching, refetch: refetchStrike } = useStrikeTrajectoryQuery()

  const scenarios = simData?.data ?? fallbackScenarios
  const trajectory = strikeData?.data ?? fallbackStrike
  const isFetching = isSimFetching || isStrikeFetching
  const isLoading = !simData && isSimFetching

  const selectedScenario = scenarios.find((s) => s.scenarioId === selectedScenarioId) || scenarios[1]

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold tracking-widest text-blue-400 uppercase">
            Board Strategy Suite
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Scenario Comparison
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            6 discrete-event simulation scenarios evaluated for operational policy decisions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { refetchSim(); refetchStrike() }}
            disabled={isFetching}
            className="p-2 rounded-lg bg-white/5 border border-white/8 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Board Ready
          </div>
        </div>
      </div>

      {/* Mandatory Findings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                Official Recommendation
              </span>
              <h3 className="text-sm font-bold text-white mt-1">
                Scenario 2: +12 Rehab Beds via DAY Reallocation
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Wait times: 14.2 → 3.8 days (−73%). Overflow: −75%. Savings: ₦5.7M/mo. Zero capital.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                Scenario 6 Discovery
              </span>
              <h3 className="text-sm font-bold text-white mt-1">
                Resettlement: 0.0% Change to Absorption
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Full LTW resettlement vacates beds but retention leakage occurs at acute presentation, not custodial exit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Scenario</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {scenarios.map((s) => {
            const isSelected = selectedScenarioId === s.scenarioId
            const isRec = s.isRecommendedOption
            return (
              <button
                key={s.scenarioId}
                onClick={() => setSelectedScenarioId(s.scenarioId)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-white/8 border-emerald-500/30 ring-1 ring-emerald-500/20'
                    : isRec
                    ? 'bg-emerald-500/5 border-emerald-500/15 hover:bg-emerald-500/8'
                    : 'glass-card hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-slate-500">S{s.scenarioId}</span>
                  {isRec && (
                    <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 uppercase">
                      Rec
                    </span>
                  )}
                </div>
                <h4 className="text-[11px] font-semibold text-slate-300 leading-tight line-clamp-2 mb-2">
                  {s.name.replace(`Scenario ${s.scenarioId}: `, '')}
                </h4>
                <div className="space-y-0.5 text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Occ</span>
                    <span className="text-slate-400">{s.occupancyRatePct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Wait</span>
                    <span className="text-slate-400">{s.avgWaitDays}d</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Scenario Detail */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                {selectedScenario.code}
              </span>
              <h3 className="text-base font-bold text-white">{selectedScenario.name}</h3>
              {selectedScenario.isRecommendedOption && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Preferred
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">{selectedScenario.description}</p>
          </div>
          <div className="text-left md:text-right">
            <span className="text-[11px] text-slate-500">Monthly Cost</span>
            <span className="text-lg font-mono font-bold text-emerald-400 block">
              ₦{selectedScenario.monthlyCostMlnNgn}M
            </span>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-white/3 rounded-lg border border-white/5">
            <span className="text-[11px] text-slate-500">Occupancy</span>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{selectedScenario.occupancyRatePct}%</div>
          </div>
          <div className="p-3 bg-white/3 rounded-lg border border-white/5">
            <span className="text-[11px] text-slate-500">Wait Time</span>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{selectedScenario.avgWaitDays}d</div>
          </div>
          <div className="p-3 bg-white/3 rounded-lg border border-white/5">
            <span className="text-[11px] text-slate-500">Overflows/Qtr</span>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{selectedScenario.overflowEventsPerQuarter}</div>
          </div>
          <div className="p-3 bg-white/3 rounded-lg border border-white/5">
            <span className="text-[11px] text-slate-500">Stable Discharge</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {selectedScenario.absorptionMix.dischargedStablePct}%
            </div>
          </div>
        </div>

        {/* Absorption Bar */}
        <div className="p-3 bg-white/3 rounded-lg border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Absorption Distribution</span>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2 h-2 rounded bg-emerald-500" /> Stable {selectedScenario.absorptionMix.dischargedStablePct}%
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2 h-2 rounded bg-rose-500" /> LTFU {selectedScenario.absorptionMix.lostToFollowUpPct}%
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2 h-2 rounded bg-amber-500" /> LT {selectedScenario.absorptionMix.longStayTransferPct}%
              </span>
            </div>
          </div>
          <div className="h-3 w-full bg-white/5 rounded-full flex overflow-hidden">
            <div className="bg-emerald-500 transition-all" style={{ width: `${selectedScenario.absorptionMix.dischargedStablePct}%` }} />
            <div className="bg-rose-500 transition-all" style={{ width: `${selectedScenario.absorptionMix.lostToFollowUpPct}%` }} />
            <div className="bg-amber-500 transition-all" style={{ width: `${selectedScenario.absorptionMix.longStayTransferPct}%` }} />
          </div>
        </div>

        <div className="p-3 bg-white/3 rounded-lg border border-white/5 text-xs text-slate-400 leading-relaxed">
          <span className="text-white font-semibold">Policy Note: </span>
          {selectedScenario.recommendationNote}
        </div>
      </div>

      {/* Strike Trajectory Deep Dive */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                S4 Deep Dive
              </span>
              <h3 className="text-sm font-semibold text-white">Strike Trajectory (±18 Months)</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Static average (74%) is misleading — the real dynamic is an immediate collapse → severe 134% delayed bottleneck.
            </p>
          </div>
          <button
            onClick={() => setShowStrikeDeepDive(!showStrikeDeepDive)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-slate-400 hover:text-white border border-white/8 transition-colors"
          >
            {showStrikeDeepDive ? 'Hide' : 'Show'}
          </button>
        </div>

        {showStrikeDeepDive && (
          <div className="p-5 space-y-5">
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-lg bg-white/2 border border-white/5">
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Pre-Strike Census</span>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">~85%</div>
                <span className="text-[10px] text-slate-500">Stable transient flow</span>
              </div>
              <div className="p-3 rounded-lg bg-white/2 border border-white/5">
                <span className="text-[10px] text-amber-400/80 font-medium uppercase tracking-wider">Strike Month (M0)</span>
                <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">~46%</div>
                <span className="text-[10px] text-amber-400/70">Admissions suspended</span>
              </div>
              <div className="p-3 rounded-lg bg-white/2 border border-white/5">
                <span className="text-[10px] text-rose-400/80 font-medium uppercase tracking-wider">Peak Rebound (M+2)</span>
                <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">134%</div>
                <span className="text-[10px] text-rose-400/70">+34% above capacity</span>
              </div>
              <div className="p-3 rounded-lg bg-white/2 border border-white/5">
                <span className="text-[10px] text-blue-400/80 font-medium uppercase tracking-wider">Full Clearance</span>
                <div className="text-lg font-bold font-mono text-blue-400 mt-0.5">Month +18</div>
                <span className="text-[10px] text-slate-500">Backlog fully absorbed</span>
              </div>
            </div>

            {/* Clean Non-overlapping Horizontal Timeline Chart */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Normal (&le;100%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Strike Trough
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" /> Overcrowding (&gt;100%)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                  Scroll horizontally to view all 24 months &rarr;
                </span>
              </div>

              <div className="overflow-x-auto pb-3 pt-1 border border-white/5 rounded-xl bg-[#090d18] relative">
                {/* Horizontal Capacity Threshold Reference Line */}
                <div
                  className="absolute left-0 right-0 border-b border-dashed border-amber-500/30 z-0 pointer-events-none"
                  style={{ bottom: 'calc(32px + (100 / 145) * 115px)' }}
                >
                  <span className="absolute right-4 -top-4 text-[9px] font-mono text-amber-400/80 bg-[#090d18] px-2 py-0.5 rounded border border-amber-500/20 shadow-sm">
                    100% Nominal Capacity Limit
                  </span>
                </div>

                <div className="flex items-end gap-1.5 min-w-[960px] h-48 px-4 pt-10 pb-2 relative z-10">
                  {trajectory.map((pt) => {
                    const isStrike = pt.monthOffset === 0
                    const isSpike = pt.strikePeriodOccupancy > 100
                    const barHeightPx = Math.max(10, Math.min(130, Math.round((pt.strikePeriodOccupancy / 145) * 125)))

                    return (
                      <div
                        key={pt.label}
                        className="flex-1 flex flex-col items-center justify-end h-full relative group min-w-[36px]"
                      >
                        {/* Occupancy Value & Overflow Pill */}
                        <div className="flex flex-col items-center mb-1 z-20">
                          {isSpike && (
                            <span className="text-[7.5px] font-mono font-bold text-rose-300 bg-rose-500/25 px-1 py-0.5 rounded leading-none mb-1 shadow-sm whitespace-nowrap">
                              +{pt.rehabGap > 0 ? pt.rehabGap : Math.round(pt.strikePeriodOccupancy - 100)}%
                            </span>
                          )}
                          {isStrike && (
                            <span className="text-[7.5px] font-mono font-bold text-amber-300 bg-amber-500/25 px-1 py-0.5 rounded leading-none mb-1 shadow-sm whitespace-nowrap">
                              STRIKE
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-mono font-bold leading-none ${
                              isSpike ? 'text-rose-400' : isStrike ? 'text-amber-400' : 'text-slate-300'
                            }`}
                          >
                            {Math.round(pt.strikePeriodOccupancy)}%
                          </span>
                        </div>

                        {/* Bar */}
                        <div
                          className={`w-full max-w-[26px] rounded-t transition-all duration-300 ${
                            isStrike
                              ? 'bg-gradient-to-t from-amber-600 to-amber-400 border-t border-x border-amber-300/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                              : isSpike
                              ? 'bg-gradient-to-t from-rose-600 to-rose-400 border-t border-x border-rose-300/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                              : 'bg-gradient-to-t from-emerald-600/80 to-emerald-400/80 border-t border-x border-emerald-400/30'
                          } group-hover:brightness-125`}
                          style={{ height: `${barHeightPx}px` }}
                        />

                        {/* Month Offset Label */}
                        <span
                          className={`text-[9.5px] font-mono mt-1.5 truncate text-center transition-colors ${
                            isStrike
                              ? 'text-amber-400 font-bold'
                              : isSpike
                              ? 'text-rose-300 font-medium'
                              : 'text-slate-400 group-hover:text-white'
                          }`}
                        >
                          {pt.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Trajectory Table */}
            <div className="overflow-x-auto rounded-lg border border-white/5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] text-slate-500 uppercase tracking-wider bg-white/2">
                    <th className="py-2.5 px-3 text-left font-medium">Timeline Point</th>
                    <th className="py-2.5 px-3 text-center font-medium">Baseline Census</th>
                    <th className="py-2.5 px-3 text-center font-medium">Strike Period Census</th>
                    <th className="py-2.5 px-3 text-center font-medium">Rehabilitation Gap</th>
                    <th className="py-2.5 px-3 text-left font-medium">Operational Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/3">
                  {trajectory.map((pt) => (
                    <tr
                      key={pt.label}
                      className={`${
                        pt.strikePeriodOccupancy > 100
                          ? 'bg-rose-500/5 hover:bg-rose-500/10'
                          : pt.monthOffset === 0
                          ? 'bg-amber-500/5 hover:bg-amber-500/10'
                          : 'hover:bg-white/3'
                      } transition-colors`}
                    >
                      <td className="py-2 px-3 font-mono text-slate-300 font-semibold">{pt.label}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-500">{pt.baselineOccupancy}%</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-white">{pt.strikePeriodOccupancy}%</td>
                      <td className="py-2 px-3 text-center font-mono font-semibold">
                        {pt.rehabGap > 0 ? (
                          <span className="text-rose-400">+{pt.rehabGap}%</span>
                        ) : pt.rehabGap < 0 ? (
                          <span className="text-amber-400">{pt.rehabGap}%</span>
                        ) : (
                          <span className="text-emerald-400">Balanced</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-400 text-[11px]">
                        {pt.monthOffset === 0 && '⚡ Industrial action: non-emergency admissions suspended'}
                        {pt.monthOffset === 1 && 'Post-strike intake opens; acute ward begins feeding rehab'}
                        {pt.monthOffset === 2 && '🚨 Severe bottleneck: rehab occupancy hits peak 134%'}
                        {pt.monthOffset === 3 && 'High pressure overflow continues (128%)'}
                        {pt.monthOffset === 18 && 'Re-equilibration: system returns to steady-state'}
                        {pt.monthOffset < 0 && 'Pre-strike historical baseline'}
                        {pt.monthOffset > 3 && pt.monthOffset < 18 && 'Backlog steadily clearing into step-down'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Full Comparison Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">All 6 Scenarios</h3>
          <p className="text-xs text-slate-500 mt-0.5">N = 10,000 patient simulation runs</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[11px] text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 text-left font-medium">Scenario</th>
                <th className="py-3 px-4 text-left font-medium">Description</th>
                <th className="py-3 px-4 text-center font-medium">Occupancy</th>
                <th className="py-3 px-4 text-center font-medium">Wait</th>
                <th className="py-3 px-4 text-center font-medium">Overflows</th>
                <th className="py-3 px-4 text-right font-medium">Cost</th>
                <th className="py-3 px-4 text-center font-medium">Stable %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/3">
              {scenarios.map((s) => (
                <tr key={s.scenarioId} className={`${s.isRecommendedOption ? 'bg-emerald-500/5' : 'hover:bg-white/3'} transition-colors`}>
                  <td className="py-3 px-4 font-mono font-bold text-slate-300">
                    <div className="flex items-center gap-1.5">
                      {s.code}
                      {s.isRecommendedOption && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{s.description}</td>
                  <td className="py-3 px-4 text-center font-mono text-white">{s.occupancyRatePct}%</td>
                  <td className="py-3 px-4 text-center font-mono text-slate-400">{s.avgWaitDays}d</td>
                  <td className="py-3 px-4 text-center font-mono text-slate-400">{s.overflowEventsPerQuarter}</td>
                  <td className="py-3 px-4 text-right font-mono text-white font-semibold">₦{s.monthlyCostMlnNgn}M</td>
                  <td className="py-3 px-4 text-center font-mono text-emerald-400 font-semibold">{s.absorptionMix.dischargedStablePct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
