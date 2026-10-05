import { useState } from 'react'
import {
  SlidersHorizontal,
  Bed,
  Users2,
  Wallet,
  AlertOctagon,
  Lock,
  Unlock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import {
  useModel2Query,
  useBedReallocationQuery,
  useStaffRosterQuery,
  useBudgetSolveQuery,
} from '../hooks/useWardWiseQueries'
import {
  model2ResultData as fallbackModel2,
  bedReallocationResultData as fallbackReallocation,
  staffRosterResultData as fallbackRoster,
  budgetTierResultData as fallbackBudget,
} from '../data/mockData'
import { PageSkeleton } from '../components/ui/Skeleton'

type Tab = 'model2' | 'reallocation' | 'roster' | 'budget'

const tabs: { id: Tab; label: string; icon: React.ElementType; shortLabel: string }[] = [
  { id: 'model2', label: 'Bed & Staffing Plan', icon: Bed, shortLabel: 'Model 2' },
  { id: 'reallocation', label: 'Bed Reallocation', icon: SlidersHorizontal, shortLabel: 'Realloc' },
  { id: 'roster', label: 'Staff Roster', icon: Users2, shortLabel: 'Roster' },
  { id: 'budget', label: 'Budget', icon: Wallet, shortLabel: 'Budget' },
]

export const DecisionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('model2')

  const { data: model2Res, isFetching: isModel2Fetching, refetch: refetchModel2 } = useModel2Query()
  const { data: reallocationRes, isFetching: isReallocationFetching, refetch: refetchReallocation } = useBedReallocationQuery()
  const { data: rosterRes, isFetching: isRosterFetching, refetch: refetchRoster } = useStaffRosterQuery()
  const { data: budgetRes, isFetching: isBudgetFetching, refetch: refetchBudget } = useBudgetSolveQuery()

  const model2 = model2Res?.data ?? fallbackModel2
  const reallocation = reallocationRes?.data ?? fallbackReallocation
  const roster = rosterRes?.data ?? fallbackRoster
  const budget = budgetRes?.data ?? fallbackBudget

  const isLoading = !model2Res && isModel2Fetching
  const isFetching = isModel2Fetching || isReallocationFetching || isRosterFetching || isBudgetFetching

  const handleRefetch = () => {
    if (activeTab === 'model2') refetchModel2()
    else if (activeTab === 'reallocation') refetchReallocation()
    else if (activeTab === 'roster') refetchRoster()
    else if (activeTab === 'budget') refetchBudget()
  }

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold tracking-widest text-emerald-400 uppercase">
              Executive Decision Suite
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Clinical Resource Optimization
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Evidence-based bed, staffing, and budget reconfiguration for FNPH Yaba.
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 bg-white/3 p-1 rounded-xl border border-white/5 w-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                activeTab === id
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/4'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
          <button
            onClick={handleRefetch}
            disabled={isFetching}
            className="ml-1 p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/4 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TAB 1: MODEL 2 */}
      {activeTab === 'model2' && (
        <div className="space-y-5 animate-fade-in">
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="glass-card rounded-xl p-4">
              <span className="text-[11px] text-slate-500 font-medium">Annual Net Savings</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                ~{model2.annualSavingsPct}%
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                ₦{(model2.annualSavingsNgn / 1e6).toFixed(1)}M / year
              </p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <span className="text-[11px] text-slate-500 font-medium">Bed Fleet</span>
              <div className="text-2xl font-bold text-white mt-1 font-mono">
                {model2.totalRecommendedBeds}
                <span className="text-sm font-normal text-slate-500 ml-1">
                  ← {model2.totalCurrentBeds}
                </span>
              </div>
              <p className="text-[11px] text-emerald-500 mt-0.5">Surplus → Rehab</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <span className="text-[11px] text-slate-500 font-medium">Nurse FTEs</span>
              <div className="text-2xl font-bold text-white mt-1 font-mono">
                {model2.totalRecommendedStaff}
                <span className="text-sm font-normal text-slate-500 ml-1">
                  ← {model2.totalCurrentStaff}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Targeted to Acute & Forensic</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <span className="text-[11px] text-slate-500 font-medium">Locked Wards</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">5</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Legal/clinical invariants</p>
            </div>
          </div>

          {/* Caveat Banner */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Governance Caveat
              </h4>
              <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                {model2.flexiblePoolOnlyCaveat}
              </p>
            </div>
          </div>

          {/* Unit Table */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Unit Allocation Matrix</h3>
                <p className="text-xs text-slate-500 mt-0.5">Current vs. Model 2 recommendation</p>
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
                    <th className="py-3 px-4 text-center font-medium">Nurse FTE</th>
                    <th className="py-3 px-4 text-center font-medium">Δ Nurse</th>
                    <th className="py-3 px-4 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/3">
                  {model2.units.map((u) => (
                    <tr key={u.unitCode} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-300">{u.unitCode}</td>
                      <td className="py-3 px-4 text-slate-400">{u.unitName}</td>
                      <td className="py-3 px-4 text-center">
                        {u.isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-slate-500 border border-white/8">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Unlock className="w-2.5 h-2.5" /> Flex
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className="text-slate-500">{u.currentBeds}</span>
                        <span className="text-slate-600 mx-1">→</span>
                        <span className="text-white font-semibold">{u.recommendedBeds}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold">
                        {u.bedDelta > 0 && <span className="text-emerald-400">+{u.bedDelta}</span>}
                        {u.bedDelta < 0 && <span className="text-rose-400">{u.bedDelta}</span>}
                        {u.bedDelta === 0 && <span className="text-slate-600">0</span>}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className="text-slate-500">{u.currentNurseFTE}</span>
                        <span className="text-slate-600 mx-1">→</span>
                        <span className="text-white font-semibold">{u.recommendedNurseFTE}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold">
                        {u.nurseDelta > 0 && <span className="text-emerald-400">+{u.nurseDelta}</span>}
                        {u.nurseDelta < 0 && <span className="text-rose-400">{u.nurseDelta}</span>}
                        {u.nurseDelta === 0 && <span className="text-slate-600">0</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        ₦{(u.projectedMonthlyCostNgn / 1e6).toFixed(1)}M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BED REALLOCATION */}
      {activeTab === 'reallocation' && (
        <div className="space-y-5 animate-fade-in">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">DAY → DRU / LSR Reallocation</h3>
                <p className="text-xs text-slate-500 mt-0.5">Zero-capital bed capacity realignment</p>
              </div>
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Zero Capex
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed bg-white/3 p-3 rounded-lg border border-white/5">
              {reallocation.rationale}
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
                <span className="text-[10px] font-semibold text-rose-400 uppercase">Donor</span>
                <h4 className="text-xs font-semibold text-slate-300 mt-1">DAY</h4>
                <div className="text-lg font-mono font-bold text-rose-400 mt-1">-18</div>
              </div>
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase">Recipient</span>
                <h4 className="text-xs font-semibold text-slate-300 mt-1">DRU</h4>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1">+10</div>
              </div>
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase">Recipient</span>
                <h4 className="text-xs font-semibold text-slate-300 mt-1">LSR</h4>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1">+6</div>
              </div>
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase">Recipient</span>
                <h4 className="text-xs font-semibold text-slate-300 mt-1">ACM</h4>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1">+2</div>
              </div>
            </div>
          </div>

          {/* Shadow Price Table */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white">Shadow-Price Sensitivity Analysis</h3>
              <p className="text-xs text-slate-500 mt-0.5">Marginal value of relaxing capacity constraints</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 text-left font-medium">Unit</th>
                    <th className="py-3 px-4 text-left font-medium">Resource</th>
                    <th className="py-3 px-4 text-left font-medium">Shadow Price</th>
                    <th className="py-3 px-4 text-left font-medium">Interpretation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/3">
                  {reallocation.shadowPrices.map((sp, idx) => (
                    <tr key={idx} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-300">{sp.unit}</td>
                      <td className="py-3 px-4 text-slate-400">{sp.resource}</td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        {sp.shadowPrice > 0 ? (
                          <span className="text-emerald-400">₦{sp.shadowPrice.toLocaleString()}/mo</span>
                        ) : (
                          <span className="text-slate-600">₦0 (Slack)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-sm">{sp.interpretation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STAFF ROSTER */}
      {activeTab === 'roster' && (
        <div className="space-y-5 animate-fade-in">
          {/* Headline */}
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">
                Critical Finding
              </span>
              <h3 className="text-xl font-bold text-white mt-1">
                1,733 Unfilled Nurse-Shifts
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                ACF and FOR represent 51.8% of the deficit — direct clinical safety hazard.
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-3xl font-mono font-bold text-rose-400">1,733</span>
              <p className="text-[10px] text-rose-400/70 uppercase font-semibold">Shift Deficit</p>
            </div>
          </div>

          {/* Shift Type Cards */}
          <div className="grid grid-cols-3 gap-3">
            {roster.shiftTypeBreakdown.map((s) => (
              <div key={s.shift} className="glass-card rounded-xl p-4">
                <span className="text-[11px] text-slate-500 font-medium">{s.shift} Shift</span>
                <div className="text-xl font-bold text-white mt-1 font-mono">{s.unfilledCount}</div>
                <div className="w-full bg-white/5 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(s.unfilledCount / 1733) * 100}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {((s.unfilledCount / 1733) * 100).toFixed(1)}% of total
                </span>
              </div>
            ))}
          </div>

          {/* Priority Table */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white">Ward Deficit Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 text-left font-medium">Ward</th>
                    <th className="py-3 px-4 text-left font-medium">Urgency</th>
                    <th className="py-3 px-4 text-center font-medium">Unfilled</th>
                    <th className="py-3 px-4 text-center font-medium">% Deficit</th>
                    <th className="py-3 px-4 text-left font-medium">Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/3">
                  {roster.priorityUnits.map((u) => (
                    <tr key={u.unitCode} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-300">{u.unitCode}</span>
                        <span className="text-slate-500 ml-2">{u.unitName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          u.urgency === 'Critical'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {u.urgency}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-white">{u.unfilledShifts}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {((u.unfilledShifts / 1733) * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-slate-500">{u.impactNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BUDGET */}
      {activeTab === 'budget' && (
        <div className="space-y-5 animate-fade-in">
          {/* Structural Shortfall Banner */}
          <div className="rounded-xl bg-gradient-to-r from-slate-900 to-[#0c1025] border border-white/8 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                Board Briefing
              </span>
              <span className="text-xs font-mono text-amber-400 font-semibold">Gap: 26.5%</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="text-emerald-400 font-semibold">Key Framing: </span>
              {budget.framingNote}
            </p>
          </div>

          {/* 3-Tier Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card rounded-xl p-5 border-t-2 border-t-emerald-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase">Tier 1: Essential</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  100%
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white">Life-Safety & Supplies</h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Emergency medication, food, diesel, and core security.
              </p>
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Fully ring-fenced
              </div>
            </div>

            <div className="glass-card rounded-xl p-5 border-t-2 border-t-blue-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-blue-400 uppercase">Tier 2: Clinical</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  92%
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white">Therapy & Diagnostics</h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Lab consumables, psychological testing, OT supplies.
              </p>
              <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-blue-400">
                8% managed via phased inventory
              </div>
            </div>

            <div className="glass-card rounded-xl p-5 border-t-2 border-t-amber-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-amber-400 uppercase">Tier 3: Development</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  5.5%
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white">Infrastructure & Capital</h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Ward refurbishment, EHR expansion, training.
              </p>
              <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-amber-400">
                Requires Federal Capital Vote
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="glass-card rounded-xl p-5">
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Financial Summary</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-white/3 rounded-lg border border-white/5">
                <span className="text-[11px] text-slate-500 block">Requested</span>
                <span className="text-lg font-bold text-white mt-1 block font-mono">
                  ₦{(budget.totalBudgetRequestedNgn / 1e6).toFixed(0)}M
                </span>
              </div>
              <div className="p-3 bg-white/3 rounded-lg border border-white/5">
                <span className="text-[11px] text-slate-500 block">Secured</span>
                <span className="text-lg font-bold text-emerald-400 mt-1 block font-mono">
                  ₦{(budget.totalBudgetSecuredNgn / 1e6).toFixed(0)}M
                </span>
              </div>
              <div className="p-3 bg-rose-500/5 rounded-lg border border-rose-500/20">
                <span className="text-[11px] text-rose-400 block">Gap (26.5%)</span>
                <span className="text-lg font-bold text-rose-400 mt-1 block font-mono">
                  -₦{(budget.deficitNgn / 1e6).toFixed(0)}M
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
