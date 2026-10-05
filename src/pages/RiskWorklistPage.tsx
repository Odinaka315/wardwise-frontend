import { useState } from 'react'
import { PhoneCall, ArrowUpDown } from 'lucide-react'
import { useRiskWorklistQuery } from '../hooks/useWardWiseQueries'
import { riskWorklistData } from '../data/mockData'
import { PageSkeleton } from '../components/ui/Skeleton'
import { StatusBadge } from '../components/ui/StatusBadge'

export const RiskWorklistPage = () => {
  const [activeTab, setActiveTab] = useState<'Readmission' | 'Non-attendance'>('Readmission')
  const [selectedTier, setSelectedTier] = useState<string>('All')
  const [sortAsc, setSortAsc] = useState<boolean>(false)

  const { data, isFetching, refetch } = useRiskWorklistQuery(activeTab)
  const defaultPatients = riskWorklistData.filter((p) => p.riskType === activeTab)
  const patients = data?.data ?? defaultPatients
  const isLive = Boolean(data?.isLive)
  const isLoading = !data && isFetching

  const filteredPatients = patients
    .filter((p) => (selectedTier === 'All' ? true : p.riskTier === selectedTier))
    .sort((a, b) => (sortAsc ? a.riskScore - b.riskScore : b.riskScore - a.riskScore))

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold tracking-widest text-amber-400 uppercase">
            Clinical Intelligence
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Risk Worklists
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            ML-stratified patient queues for active surveillance and prevention.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge isLive={isLive} isFetching={isFetching} onRefetch={refetch} />
          <div className="flex gap-0.5 bg-white/3 p-0.5 rounded-lg border border-white/5">
            {(['Readmission', 'Non-attendance'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-white/10 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === 'Non-attendance' ? 'Non-Attendance' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lift Metric */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
              Model Diagnostic Power
            </span>
            <h3 className="text-base font-semibold text-white mt-1">
              {activeTab === 'Readmission' ? '30-Day Readmission' : 'Non-Attendance'} Scoring
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Top-decile patients are significantly more likely to experience adverse events than random selection.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white/3 border border-white/5 p-4 rounded-xl shrink-0">
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Lift</span>
              <span className="text-3xl font-mono font-bold text-emerald-400">2.1x</span>
            </div>
            <div className="border-l border-white/5 pl-3 text-[11px] text-slate-500 max-w-[180px] leading-tight">
              Over unstratified baseline cohort
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Tier:</span>
            {['All', 'High', 'Medium'].map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedTier === tier
                    ? 'bg-white/10 text-white'
                    : 'bg-white/3 text-slate-500 hover:text-slate-300 border border-white/5'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/3 border border-white/5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowUpDown className="w-3 h-3" />
            {sortAsc ? 'Ascending' : 'Descending'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[11px] text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 text-left font-medium">Patient</th>
                <th className="py-3 px-4 text-left font-medium">Demo</th>
                <th className="py-3 px-4 text-left font-medium">Ward</th>
                <th className="py-3 px-4 text-center font-medium">Score</th>
                <th className="py-3 px-4 text-left font-medium">Tier</th>
                <th className="py-3 px-4 text-left font-medium">
                  {activeTab === 'Readmission' ? 'Since D/C' : 'Next Appt'}
                </th>
                <th className="py-3 px-4 text-left font-medium">Drivers</th>
                <th className="py-3 px-4 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/3">
              {filteredPatients.map((p) => (
                <tr key={p.id} className="hover:bg-white/3 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-300">{p.patientId}</td>
                  <td className="py-3 px-4 text-slate-500">{p.gender}, {p.age}y</td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-semibold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                      {p.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-semibold text-white">
                    {(p.riskScore * 100).toFixed(0)}%
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      p.riskTier === 'High'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {p.riskTier}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    {activeTab === 'Readmission' ? `${p.daysSinceDischarge}d ago` : p.scheduledAppointmentDate}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {p.primaryDrivers.slice(0, 2).map((d, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-slate-500 border border-white/5">
                          {d}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-[11px] text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                      <PhoneCall className="w-3 h-3" />
                      Contact
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
