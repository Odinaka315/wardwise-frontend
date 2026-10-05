import { useState } from 'react'
import { Building2, Bed, Users, DollarSign, Search } from 'lucide-react'
import { useOverviewBaselineQuery } from '../hooks/useWardWiseQueries'
import { hospitalUnitsBaseline } from '../data/mockData'
import { PageSkeleton } from '../components/ui/Skeleton'
import { StatusBadge } from '../components/ui/StatusBadge'

export const OverviewPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchTerm, setSearchTerm] = useState<string>('')

  const { data, isFetching, refetch } = useOverviewBaselineQuery()
  const units = data?.data ?? hospitalUnitsBaseline
  const isLive = Boolean(data?.isLive)
  const isLoading = !data && isFetching

  const totalBeds = units.reduce((a, u) => a + u.totalBeds, 0)
  const totalOccupied = units.reduce((a, u) => a + u.occupiedBeds, 0)
  const overallOccupancy = totalBeds > 0 ? ((totalOccupied / totalBeds) * 100).toFixed(1) : '0.0'
  const totalStaff = units.reduce((a, u) => a + u.assignedStaff, 0)
  const totalCost = units.reduce((a, u) => a + u.monthlyOperatingCostNgn, 0)

  const categories = ['All', 'Acute', 'Specialist', 'Rehabilitation', 'Long-Term', 'Outpatient']

  const filtered = units
    .filter((u) => (selectedCategory === 'All' ? true : u.category === selectedCategory))
    .filter((u) => u.code.toLowerCase().includes(searchTerm.toLowerCase()) || u.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold tracking-widest text-teal-400 uppercase">
            Hospital Operations
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Ward Census Overview
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Baseline operational status across all 11 hospital units.
          </p>
        </div>
        <StatusBadge isLive={isLive} isFetching={isFetching} onRefetch={refetch} label="Overview API" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Inpatient Census</span>
            <Bed className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {totalOccupied}<span className="text-slate-500">/{totalBeds}</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">{overallOccupancy}% occupancy</span>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Staff Roster</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{totalStaff}</div>
          <span className="text-[11px] text-slate-500">Clinical personnel</span>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Monthly Run-Rate</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">₦{(totalCost / 1e6).toFixed(0)}M</div>
          <span className="text-[11px] text-slate-500">All 11 units combined</span>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Active Units</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">11</div>
          <span className="text-[11px] text-slate-500">Wards & departments</span>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-white/10 text-white'
                    : 'bg-white/3 text-slate-500 hover:text-slate-300 border border-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white/3 border border-white/5 rounded-lg text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 w-full sm:w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[11px] text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 text-left font-medium">Code</th>
                <th className="py-3 px-4 text-left font-medium">Ward</th>
                <th className="py-3 px-4 text-left font-medium">Type</th>
                <th className="py-3 px-4 text-center font-medium">Beds</th>
                <th className="py-3 px-4 text-center font-medium">Census</th>
                <th className="py-3 px-4 text-center font-medium">Occupancy</th>
                <th className="py-3 px-4 text-center font-medium">LOS</th>
                <th className="py-3 px-4 text-center font-medium">Staff</th>
                <th className="py-3 px-4 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/3">
              {filtered.map((u) => (
                <tr key={u.code} className="hover:bg-white/3 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-300">{u.code}</td>
                  <td className="py-3 px-4 text-slate-400">{u.name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-slate-500 border border-white/5">
                      {u.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-400">
                    {u.totalBeds > 0 ? u.totalBeds : '—'}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-semibold text-white">
                    {u.totalBeds > 0 ? u.occupiedBeds : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {u.totalBeds > 0 ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-12 bg-white/5 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              u.occupancyRate >= 95 ? 'bg-rose-500' : u.occupancyRate >= 80 ? 'bg-emerald-500' : 'bg-slate-500'
                            }`}
                            style={{ width: `${Math.min(u.occupancyRate, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono font-semibold text-[11px] text-slate-300">{u.occupancyRate}%</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 font-mono">OPD</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-500">
                    {u.avgLengthOfStayDays > 0 ? `${u.avgLengthOfStayDays}d` : '—'}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-400">{u.assignedStaff}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-300">
                    ₦{(u.monthlyOperatingCostNgn / 1e6).toFixed(1)}M
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
