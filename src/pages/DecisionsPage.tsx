// REPLACES DecisionsPage.tsx in full. Pairs with queries_decisions_fix.ts
// and the api.ts / types.ts fixes.
//
// Since there's no mock baseline anymore, each tab auto-resolves once
// with default assumptions the first time it's opened (useEffect below) --
// that's what makes the page show a real result on load instead of a
// blank "click resolve" screen, while still being an honest live solve
// rather than fabricated data.

import { useEffect, useState } from 'react'
import {
  SlidersHorizontal, Bed, Users2, Wallet, AlertOctagon, Lock, Unlock,
  CheckCircle2, XCircle, Loader2, Clock, RotateCcw,
} from 'lucide-react'
import {
  useModel2Resolver, useBedReallocationResolver, useRosterResolver, useBudgetResolver,
} from '../hooks/useWardWiseQueries'
import type {
  Model2Assumptions, BedReallocationAssumptions, RosterAssumptions, BudgetAssumptions, SolveJobStatus,
} from '../types'
import { PageSkeleton } from '../components/ui/Skeleton'

type Tab = 'model2' | 'reallocation' | 'roster' | 'budget'

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'model2', label: 'Bed & Staffing Plan', icon: Bed },
  { id: 'reallocation', label: 'Bed Reallocation', icon: SlidersHorizontal },
  { id: 'roster', label: 'Staff Roster', icon: Users2 },
  { id: 'budget', label: 'Budget', icon: Wallet },
]

const UNIT_NAMES: Record<string, string> = {
  ACM: 'Acute Care - Male', ACF: 'Acute Care - Female', CAU: 'Child & Adolescent',
  FOR: 'Forensic Unit', DRU: 'Drug Rehabilitation', LSR: 'Long-Stay Rehab',
  LTW: 'Long-Term Ward', GER: 'Geriatric Psychiatry', CTU: 'Community Treatment',
  DAY: 'Day Hospital & Observation', OPD: 'Outpatient Clinic',
}
const LOCKED_UNITS = new Set(['ACF', 'ACM', 'CAU', 'FOR', 'GER', 'CTU', 'LTW'])

function fmtNgn(n: number | undefined | null) {
  if (n === undefined || n === null) return '—'
  return `₦${(n / 1e6).toFixed(1)}M`
}

const JobStatusBadge: React.FC<{ status: SolveJobStatus }> = ({ status }) => {
  const map: Record<SolveJobStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    idle: { label: 'Not yet resolved', cls: 'bg-white/5 text-slate-500 border-white/8', icon: <Clock className="w-3 h-3" /> },
    submitting: { label: 'Submitting…', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    queued: { label: 'Queued', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    running: { label: 'Solving…', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    success: { label: 'Resolved', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" /> },
    error: { label: 'Failed', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: <XCircle className="w-3 h-3" /> },
  }
  const s = map[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  )
}

const AssumptionField: React.FC<{
  label: string; value: number; onChange: (v: number) => void
  step?: number; min?: number; max?: number; suffix?: string
}> = ({ label, value, onChange, step = 1, min, max, suffix }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[11px] text-slate-500 font-medium">{label}</span>
    <div className="flex items-center gap-2">
      <input
        type="number" value={value} step={step} min={min} max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-28 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/40"
      />
      {suffix && <span className="text-[11px] text-slate-500">{suffix}</span>}
    </div>
  </label>
)

const WhatChangedPanel: React.FC<{
  isBaseline: boolean
  lines: { label: string; from: string; to: string; changed: boolean }[]
  why: string
}> = ({ isBaseline, lines, why }) => {
  if (isBaseline) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-xs text-slate-400">
        Showing the baseline assumptions (no overrides). Change an assumption above and press
        <span className="text-white font-medium"> Resolve</span> to see what it changes.
      </div>
    )
  }
  const anyChanged = lines.some((l) => l.changed)
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
      <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">What changed, and why</h4>
      {anyChanged ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {lines.filter((l) => l.changed).map((l) => (
            <div key={l.label} className="text-xs">
              <span className="text-slate-500 block">{l.label}</span>
              <span className="font-mono text-slate-400">{l.from}</span>
              <span className="text-slate-600 mx-1">→</span>
              <span className="font-mono text-white font-semibold">{l.to}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">These assumptions produced the same result as the baseline.</p>
      )}
      <p className="text-xs text-emerald-200/80 leading-relaxed pt-2 border-t border-emerald-500/10">{why}</p>
    </div>
  )
}

// Shown while a tab has no result yet (first load, still resolving, or failed).
const TabPending: React.FC<{ status: SolveJobStatus; error: Error | null; onRetry: () => void }> = ({ status, error, onRetry }) => {
  if (status === 'error') {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-rose-300">Resolve failed</h4>
          <p className="text-xs text-rose-200/70 mt-1">{error?.message ?? 'Unknown error'}</p>
        </div>
        <button onClick={onRetry} className="px-3 py-2 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-semibold">Retry</button>
      </div>
    )
  }
  return <PageSkeleton />
}

export const DecisionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('model2')

  const model2 = useModel2Resolver()
  const realloc = useBedReallocationResolver()
  const roster = useRosterResolver()
  const budget = useBudgetResolver()

  const [m2Assumptions, setM2Assumptions] = useState<Model2Assumptions>(model2.defaultAssumptions)
  const [reAssumptions, setReAssumptions] = useState<BedReallocationAssumptions>(realloc.defaultAssumptions)
  const [rosterAssumptions, setRosterAssumptions] = useState<RosterAssumptions>(roster.defaultAssumptions)
  const [budgetAssumptions, setBudgetAssumptions] = useState<BudgetAssumptions>(budget.defaultAssumptions)

  // Auto-resolve each tab once, the first time it's opened, with default
  // assumptions -- so the page shows a real result on load instead of a
  // blank "click resolve" screen.
  useEffect(() => { if (activeTab === 'model2' && model2.jobStatus === 'idle') model2.resolve(m2Assumptions) }, [activeTab])
  useEffect(() => { if (activeTab === 'reallocation' && realloc.jobStatus === 'idle') realloc.resolve(reAssumptions) }, [activeTab])
  useEffect(() => { if (activeTab === 'roster' && roster.jobStatus === 'idle') roster.resolve(rosterAssumptions) }, [activeTab])
  useEffect(() => { if (activeTab === 'budget' && budget.jobStatus === 'idle') budget.resolve(budgetAssumptions) }, [activeTab])

  const m2 = model2.result
  const re = realloc.result
  const ro = roster.result
  const bu = budget.result

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4">
        <div>
          <span className="text-[10px] font-semibold tracking-widest text-emerald-400 uppercase">Executive Decision Suite</span>
          <h2 className="text-2xl font-bold text-white tracking-tight">Clinical Resource Optimization</h2>
          <p className="text-sm text-slate-500 mt-1">
            Evidence-based bed, staffing, and budget reconfiguration for FNPH Yaba. Adjust assumptions and resolve to see how the recommendation moves.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-white/3 p-1 rounded-xl border border-white/5 w-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                activeTab === id ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-white/4'
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: MODEL 2 */}
      {activeTab === 'model2' && (
        <div className="space-y-5 animate-fade-in">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Assumptions</h3>
              <JobStatusBadge status={model2.jobStatus} />
            </div>
            <div className="flex flex-wrap gap-5">
              <AssumptionField label="Demand buffer" value={m2Assumptions.demandBufferPct} step={1} min={-50} max={100} suffix="%" onChange={(v) => setM2Assumptions((a) => ({ ...a, demandBufferPct: v }))} />
              <AssumptionField label="Budget multiplier" value={m2Assumptions.budgetMultiplier} step={0.05} min={0.5} max={2} onChange={(v) => setM2Assumptions((a) => ({ ...a, budgetMultiplier: v }))} />
              <AssumptionField label="Nurse ratio multiplier" value={m2Assumptions.nurseRatioMultiplier} step={0.05} min={0.5} max={2} onChange={(v) => setM2Assumptions((a) => ({ ...a, nurseRatioMultiplier: v }))} />
              <AssumptionField label="Doctor ratio multiplier" value={m2Assumptions.doctorRatioMultiplier} step={0.05} min={0.5} max={2} onChange={(v) => setM2Assumptions((a) => ({ ...a, doctorRatioMultiplier: v }))} />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => model2.resolve(m2Assumptions)} disabled={model2.isResolving} className="px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
                {model2.isResolving ? 'Resolving…' : 'Resolve'}
              </button>
              <button onClick={() => setM2Assumptions(model2.defaultAssumptions)} className="px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1.5">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>

          {!m2 ? (
            <TabPending status={model2.jobStatus} error={model2.error} onRetry={() => model2.resolve(m2Assumptions)} />
          ) : m2.status !== 'Optimal' ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">{m2.message}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="glass-card rounded-xl p-4">
                  <span className="text-[11px] text-slate-500 font-medium">Annual Net Savings</span>
                  <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">~{m2.annual_savings_pct}%</div>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{fmtNgn(m2.annual_savings_ngn)} / year</p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <span className="text-[11px] text-slate-500 font-medium">Optimal Annual Cost</span>
                  <div className="text-2xl font-bold text-white mt-1 font-mono">{fmtNgn(m2.optimal_annual_cost_ngn)}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono">vs. {fmtNgn(m2.current_annual_cost_ngn)} current</p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <span className="text-[11px] text-slate-500 font-medium">Bed Stock Ceiling</span>
                  <div className="text-2xl font-bold text-white mt-1 font-mono">{m2.total_bed_stock}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Total physical beds</p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <span className="text-[11px] text-slate-500 font-medium">Locked Wards</span>
                  <div className="text-2xl font-bold text-amber-400 mt-1">{LOCKED_UNITS.size}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Legal/clinical invariants</p>
                </div>
              </div>

              <WhatChangedPanel
                isBaseline={m2.assumptions?.is_baseline ?? true}
                lines={model2.baselineResult ? [
                  { label: 'Annual savings', from: `${model2.baselineResult.annual_savings_pct}%`, to: `${m2.annual_savings_pct}%`, changed: model2.baselineResult.annual_savings_pct !== m2.annual_savings_pct },
                  { label: 'Optimal cost', from: fmtNgn(model2.baselineResult.optimal_annual_cost_ngn), to: fmtNgn(m2.optimal_annual_cost_ngn), changed: model2.baselineResult.optimal_annual_cost_ngn !== m2.optimal_annual_cost_ngn },
                ] : []}
                why={`Demand buffer ${m2.assumptions?.demandBufferPct ?? 0}%, budget ×${m2.assumptions?.budgetMultiplier ?? 1}, nurse ratio ×${m2.assumptions?.nurseRatioMultiplier ?? 1}, doctor ratio ×${m2.assumptions?.doctorRatioMultiplier ?? 1} — these tighten or loosen the LP's demand, budget and staffing-ratio constraints directly, which is why the recommended bed/staff mix shifts.`}
              />

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Governance Caveat</h4>
                  <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                    The 7 units below are legally/clinically locked (ACF, ACM, CAU, FOR, GER, CTU, LTW) and cannot absorb bed or staffing cuts without statutory compromise — treat their deltas as informational, not actionable.
                  </p>
                </div>
              </div>

              <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Unit Allocation Matrix</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Current vs. recommended, under the active assumptions</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>
                    <span className="flex items-center gap-1 text-emerald-400"><Unlock className="w-3 h-3" /> Flex</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-[11px] text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 text-left font-medium">Ward</th>
                        <th className="py-3 px-4 text-left font-medium">Name</th>
                        <th className="py-3 px-4 text-center font-medium">Status</th>
                        <th className="py-3 px-4 text-center font-medium">Beds</th>
                        <th className="py-3 px-4 text-center font-medium">Δ Beds</th>
                        <th className="py-3 px-4 text-center font-medium">Nurses</th>
                        <th className="py-3 px-4 text-center font-medium">Doctors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/3">
                      {(m2.by_unit ?? []).map((u) => (
                        <tr key={u.unit_id} className="hover:bg-white/3 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-300">{u.unit_id}</td>
                          <td className="py-3 px-4 text-slate-400">{UNIT_NAMES[u.unit_id] ?? u.unit_id}</td>
                          <td className="py-3 px-4 text-center">
                            {LOCKED_UNITS.has(u.unit_id) ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-slate-500 border border-white/8"><Lock className="w-2.5 h-2.5" /> Locked</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Unlock className="w-2.5 h-2.5" /> Flex</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            <span className="text-slate-500">{u.current_beds}</span>
                            <span className="text-slate-600 mx-1">→</span>
                            <span className="text-white font-semibold">{u.recommended_beds}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold">
                            {u.bed_change > 0 && <span className="text-emerald-400">+{u.bed_change}</span>}
                            {u.bed_change < 0 && <span className="text-rose-400">{u.bed_change}</span>}
                            {u.bed_change === 0 && <span className="text-slate-600">0</span>}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-white">{u.recommended_nurses}</td>
                          <td className="py-3 px-4 text-center font-mono text-white">{u.recommended_doctors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: BED REALLOCATION */}
      {activeTab === 'reallocation' && (
        <div className="space-y-5 animate-fade-in">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Assumptions</h3>
              <JobStatusBadge status={realloc.jobStatus} />
            </div>
            <div className="flex flex-wrap gap-5">
              <AssumptionField label="Lookback window" value={reAssumptions.lookbackMonths} step={1} min={1} max={24} suffix="months" onChange={(v) => setReAssumptions((a) => ({ ...a, lookbackMonths: v }))} />
              <AssumptionField label="Demand buffer" value={reAssumptions.demandBufferPct} step={1} min={-50} max={100} suffix="%" onChange={(v) => setReAssumptions((a) => ({ ...a, demandBufferPct: v }))} />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => realloc.resolve(reAssumptions)} disabled={realloc.isResolving} className="px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
                {realloc.isResolving ? 'Resolving…' : 'Resolve'}
              </button>
              <button onClick={() => setReAssumptions(realloc.defaultAssumptions)} className="px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1.5">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>

          {!re ? (
            <TabPending status={realloc.jobStatus} error={realloc.error} onRetry={() => realloc.resolve(reAssumptions)} />
          ) : (
            <>
              <WhatChangedPanel
                isBaseline={re.assumptions?.is_baseline ?? true}
                lines={realloc.baselineResult ? (re.by_unit ?? []).map((u) => {
                  const baseUnit = realloc.baselineResult!.by_unit?.find((b) => b.unit_id === u.unit_id)
                  return { label: u.unit_id, from: `${baseUnit?.recommended_beds ?? '—'} beds`, to: `${u.recommended_beds} beds`, changed: baseUnit?.recommended_beds !== u.recommended_beds }
                }) : []}
                why={`Lookback window ${re.assumptions?.lookbackMonths ?? 6} months, demand buffer ${re.assumptions?.demandBufferPct ?? 0}% — a shorter window reacts faster to recent demand swings, and the buffer front-loads capacity for anticipated growth before it shows up in the data.`}
              />

              <div className="glass-card rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Flexible Pool Reallocation</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{re.scope_note}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Zero Capex</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {(re.by_unit ?? []).map((u) => (
                    <div key={u.unit_id} className={`p-3 rounded-lg border ${u.bed_change < 0 ? 'border-rose-500/20 bg-rose-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                      <span className={`text-[10px] font-semibold uppercase ${u.bed_change < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{u.bed_change < 0 ? 'Donor' : 'Recipient'}</span>
                      <h4 className="text-xs font-semibold text-slate-300 mt-1">{u.unit_id} — {UNIT_NAMES[u.unit_id]}</h4>
                      <div className={`text-lg font-mono font-bold mt-1 ${u.bed_change < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{u.bed_change > 0 ? '+' : ''}{u.bed_change}</div>
                      <p className="text-[10px] text-slate-500 mt-1">{u.current_beds} → {u.recommended_beds} beds</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-white">Shadow-Price Sensitivity</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Marginal annual cost of relaxing each unit's demand constraint by one more bed</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-[11px] text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 text-left font-medium">Constraint</th>
                        <th className="py-3 px-4 text-left font-medium">Shadow Price</th>
                        <th className="py-3 px-4 text-left font-medium">Slack</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/3">
                      {Object.entries(re.sensitivity ?? {}).map(([name, sp]) => (
                        <tr key={name} className="hover:bg-white/3 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-300">{name}</td>
                          <td className="py-3 px-4 font-mono font-semibold">
                            {sp.shadow_price_ngn_per_year > 0 ? <span className="text-emerald-400">₦{sp.shadow_price_ngn_per_year.toLocaleString()}/yr</span> : <span className="text-slate-600">₦0 (Slack)</span>}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{sp.slack}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: STAFF ROSTER */}
      {activeTab === 'roster' && (
        <div className="space-y-5 animate-fade-in">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Assumptions</h3>
              <JobStatusBadge status={roster.jobStatus} />
            </div>
            <div className="flex flex-wrap items-end gap-5">
              <AssumptionField label="Night-cap bonus" value={rosterAssumptions.nightCapBonus} step={1} min={0} max={10} suffix="extra nights/staff" onChange={(v) => setRosterAssumptions((a) => ({ ...a, nightCapBonus: v }))} />
              <label className="flex items-center gap-2 pb-1.5">
                <input type="checkbox" checked={rosterAssumptions.compareRelaxed} onChange={(e) => setRosterAssumptions((a) => ({ ...a, compareRelaxed: e.target.checked }))} className="accent-emerald-500" />
                <span className="text-xs text-slate-400">Also compare against +2 relaxed cap</span>
              </label>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => roster.resolve(rosterAssumptions)} disabled={roster.isResolving} className="px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
                {roster.isResolving ? 'Resolving…' : 'Resolve'}
              </button>
              <button onClick={() => setRosterAssumptions(roster.defaultAssumptions)} className="px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1.5">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>

          {!ro ? (
            <TabPending status={roster.jobStatus} error={roster.error} onRetry={() => roster.resolve(rosterAssumptions)} />
          ) : (
            <>
              <WhatChangedPanel
                isBaseline={ro.assumptions?.is_baseline ?? true}
                lines={roster.baselineResult ? [
                  { label: 'Unfilled nurse shifts', from: `${roster.baselineResult.total_unfilled_nurse_shifts}`, to: `${ro.total_unfilled_nurse_shifts}`, changed: roster.baselineResult.total_unfilled_nurse_shifts !== ro.total_unfilled_nurse_shifts },
                  { label: 'Penalised shortfall', from: `${roster.baselineResult.total_penalised_shortfall}`, to: `${ro.total_penalised_shortfall}`, changed: roster.baselineResult.total_penalised_shortfall !== ro.total_penalised_shortfall },
                ] : []}
                why={ro.night_cap_sensitivity
                  ? `Relaxing the night-shift cap by ${ro.night_cap_sensitivity.relaxed_by} reduces penalised shortfall by only ${ro.night_cap_sensitivity.improvement_pct}% — confirming headcount, not the night-shift policy, is the binding constraint.`
                  : `Night-cap bonus of ${ro.assumptions?.nightCapBonus ?? 0} extra shifts per staff member changes how many night slots existing staff can legally cover, which is why the shortfall total moves.`}
              />

              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Critical Finding</span>
                  <h3 className="text-xl font-bold text-white mt-1">{ro.total_unfilled_nurse_shifts} Unfilled Nurse-Shifts</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">{ro.total_unfilled_doctor_shifts} unfilled doctor-shifts across {ro.total_roster_staff} roster staff; {ro.staff_at_night_cap} staff currently at their night-shift cap.</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-3xl font-mono font-bold text-rose-400">{ro.total_penalised_shortfall}</span>
                  <p className="text-[10px] text-rose-400/70 uppercase font-semibold">Penalised Shortfall</p>
                </div>
              </div>

              <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/5"><h3 className="text-sm font-semibold text-white">Ward Shortfall Breakdown</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-[11px] text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 text-left font-medium">Ward</th>
                        <th className="py-3 px-4 text-center font-medium">Nurse Shortfall</th>
                        <th className="py-3 px-4 text-center font-medium">Doctor Shortfall</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/3">
                      {(ro.by_unit ?? []).map((u) => (
                        <tr key={u.unit_id} className="hover:bg-white/3 transition-colors">
                          <td className="py-3 px-4"><span className="font-mono font-bold text-slate-300">{u.unit_id}</span><span className="text-slate-500 ml-2">{UNIT_NAMES[u.unit_id]}</span></td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-white">{u.nurse_shortfall}</td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-white">{u.doctor_shortfall}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 4: BUDGET */}
      {activeTab === 'budget' && (
        <div className="space-y-5 animate-fade-in">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Assumptions</h3>
              <JobStatusBadge status={budget.jobStatus} />
            </div>
            <div className="flex flex-wrap gap-5">
              <AssumptionField label="Personnel floor" value={budgetAssumptions.personnelFloorFraction} step={0.05} min={0} max={1} onChange={(v) => setBudgetAssumptions((a) => ({ ...a, personnelFloorFraction: v }))} />
              <AssumptionField label="Tier tolerance" value={budgetAssumptions.tierTolerance} step={0.01} min={1.0} max={1.5} onChange={(v) => setBudgetAssumptions((a) => ({ ...a, tierTolerance: v }))} />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => budget.resolve(budgetAssumptions)} disabled={budget.isResolving} className="px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
                {budget.isResolving ? 'Resolving…' : 'Resolve'}
              </button>
              <button onClick={() => setBudgetAssumptions(budget.defaultAssumptions)} className="px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1.5">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>

          {!bu ? (
            <TabPending status={budget.jobStatus} error={budget.error} onRetry={() => budget.resolve(budgetAssumptions)} />
          ) : (
            <>
              <WhatChangedPanel
                isBaseline={bu.assumptions?.is_baseline ?? true}
                lines={budget.baselineResult ? (bu.tier_summary ?? []).map((t) => {
                  const baseTier = budget.baselineResult!.tier_summary?.find((b) => b.goal_programming_tier === t.goal_programming_tier)
                  return { label: `Tier ${t.goal_programming_tier} avg funded`, from: `${baseTier?.avg_pct_funded ?? '—'}%`, to: `${t.avg_pct_funded}%`, changed: baseTier?.avg_pct_funded !== t.avg_pct_funded }
                }) : []}
                why={`Personnel floor ${((bu.assumptions?.personnelFloorFraction ?? 0.7) * 100).toFixed(0)}% of current spend, tier tolerance ${bu.assumptions?.tierTolerance ?? 1.02} — raising the floor protects more personnel spend from being traded away for lower-tier goals; a tighter tolerance leaves less room for a lower tier to eat into a higher tier's allocation.`}
              />

              <div className="rounded-xl bg-gradient-to-r from-slate-900 to-[#0c1025] border border-white/8 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Board Briefing</span>
                  <span className="text-xs font-mono text-amber-400 font-semibold">Gap: {bu.structural_shortfall_pct}%</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  FY{bu.fiscal_year} requested {fmtNgn(bu.total_requested_ngn)} against a {fmtNgn(bu.total_budget_ceiling_ngn)} ceiling — a structural shortfall, not a one-time overrun, allocated by priority tier below.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(bu.tier_summary ?? []).map((t, idx) => (
                  <div key={t.goal_programming_tier} className={`glass-card rounded-xl p-5 border-t-2 ${idx === 0 ? 'border-t-emerald-500' : idx === 1 ? 'border-t-blue-500' : 'border-t-amber-500'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[11px] font-semibold uppercase ${idx === 0 ? 'text-emerald-400' : idx === 1 ? 'text-blue-400' : 'text-amber-400'}`}>Tier {t.goal_programming_tier}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${idx === 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : idx === 1 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{t.avg_pct_funded}%</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{fmtNgn(t.total_allocated)} allocated of {fmtNgn(t.total_requested)} requested.</p>
                  </div>
                ))}
              </div>

              <div className="glass-card rounded-xl p-5">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Financial Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-white/3 rounded-lg border border-white/5"><span className="text-[11px] text-slate-500 block">Requested</span><span className="text-lg font-bold text-white mt-1 block font-mono">{fmtNgn(bu.total_requested_ngn)}</span></div>
                  <div className="p-3 bg-white/3 rounded-lg border border-white/5"><span className="text-[11px] text-slate-500 block">Ceiling</span><span className="text-lg font-bold text-emerald-400 mt-1 block font-mono">{fmtNgn(bu.total_budget_ceiling_ngn)}</span></div>
                  <div className="p-3 bg-rose-500/5 rounded-lg border border-rose-500/20"><span className="text-[11px] text-rose-400 block">Gap ({bu.structural_shortfall_pct}%)</span><span className="text-lg font-bold text-rose-400 mt-1 block font-mono">-{fmtNgn(bu.total_requested_ngn - bu.total_budget_ceiling_ngn)}</span></div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}