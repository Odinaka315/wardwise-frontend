import { useState, useMemo } from 'react'
import {
  CheckCircle2,
  HeartHandshake,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
} from 'lucide-react'
import { useLongStayQuery } from '../hooks/useWardWiseQueries'
import { longStayResidentsData } from '../data/mockData'
import { PageSkeleton } from '../components/ui/Skeleton'
import { StatusBadge } from '../components/ui/StatusBadge'

export const LongStayPage = () => {
  const { data, isFetching, refetch } = useLongStayQuery()
  const residents = data?.data ?? longStayResidentsData
  const isLive = Boolean(data?.isLive)
  const isLoading = !data && isFetching

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [searchTerm, setSearchTerm] = useState('')
  const [feasibilityFilter, setFeasibilityFilter] = useState<'ALL' | 'Eligible' | 'High Support' | 'Institutional' | 'Assessed'>('ALL')

  const totalResidents = residents.length
  const assessedCount = residents.filter((r) => r.resettlementAssessedFlag).length
  const avgYears = totalResidents > 0
    ? (residents.reduce((a, r) => a + r.yearsResident, 0) / totalResidents).toFixed(1)
    : '0.0'
  const longestStay = totalResidents > 0
    ? Math.max(...residents.map((r) => r.yearsResident))
    : 0

  // Dynamic occupancy from data
  const ltwResidents = residents.filter((r) => r.unit === 'LTW')
  const ltwOccupied = ltwResidents.length
  const ltwCapacity = 60 // Known LTW ward capacity

  // Counts for tabs
  const eligibleCount = useMemo(() => residents.filter((r) => r.resettlementFeasibility === 'Eligible for Community Step-down').length, [residents])
  const highSupportCount = useMemo(() => residents.filter((r) => r.resettlementFeasibility === 'High Support Needed').length, [residents])
  const institutionalCount = useMemo(() => residents.filter((r) => r.resettlementFeasibility === 'Specialized Institutional').length, [residents])

  // Filtered dataset
  const filteredResidents = useMemo(() => {
    return residents.filter((r) => {
      // Search term filter
      const matchesSearch =
        searchTerm === '' ||
        r.residentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.primaryDiagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.fundingSource.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchesSearch) return false

      // Category filter
      if (feasibilityFilter === 'Assessed') return r.resettlementAssessedFlag
      if (feasibilityFilter === 'Eligible') return r.resettlementFeasibility === 'Eligible for Community Step-down'
      if (feasibilityFilter === 'High Support') return r.resettlementFeasibility === 'High Support Needed'
      if (feasibilityFilter === 'Institutional') return r.resettlementFeasibility === 'Specialized Institutional'

      return true
    })
  }, [residents, searchTerm, feasibilityFilter])

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredResidents.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedResidents = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize
    return filteredResidents.slice(startIndex, startIndex + pageSize)
  }, [filteredResidents, safeCurrentPage, pageSize])

  const startIndexDisplay = filteredResidents.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const endIndexDisplay = Math.min(safeCurrentPage * pageSize, filteredResidents.length)

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold tracking-widest text-amber-400 uppercase">
            Hospital Operations
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Long-Stay Tracker
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Custodial resident registry, tenure distribution, and resettlement eligibility.
          </p>
        </div>
        <StatusBadge isLive={isLive} isFetching={isFetching} onRefetch={refetch} label="LongStay API" />
      </div>

      {/* KPI Cards — dynamic */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4">
          <span className="text-[11px] text-slate-500 font-medium">LTW Capacity</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {ltwOccupied}<span className="text-slate-500">/{ltwCapacity}</span>
          </div>
          <span className="text-[11px] text-rose-400 font-mono">
            {((ltwOccupied / ltwCapacity) * 100).toFixed(1)}% occupancy
          </span>
        </div>
        <div className="glass-card rounded-xl p-4">
          <span className="text-[11px] text-slate-500 font-medium">Avg Stay</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">{avgYears}y</div>
          <span className="text-[11px] text-slate-500">Longest: {longestStay}y</span>
        </div>
        <div className="glass-card rounded-xl p-4">
          <span className="text-[11px] text-slate-500 font-medium">Resettlement Assessed</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {assessedCount}<span className="text-slate-500">/{totalResidents}</span>
          </div>
          <span className="text-[11px] text-emerald-400">
            {((assessedCount / totalResidents) * 100).toFixed(0)}% evaluated
          </span>
        </div>
        <div className="glass-card rounded-xl p-4">
          <span className="text-[11px] text-slate-500 font-medium">Step-Down Ready</span>
          <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
            {eligibleCount}
          </div>
          <span className="text-[11px] text-blue-400 font-medium">Eligible candidates</span>
        </div>
      </div>

      {/* Scenario 6 Context */}
      <div className="glass-card rounded-xl p-4 flex items-start gap-3">
        <HeartHandshake className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <span className="text-white font-semibold">Scenario 6 Link: </span>
          The {ltwOccupied} LTW beds represent the chronic custodial cohort tested in Scenario 6. Resettlement into supported housing releases bed capacity and provides humanitarian benefits, but does not alter upstream hospital absorption probabilities.
        </div>
      </div>

      {/* Residents Table with Filter & Pagination */}
      <div className="glass-card rounded-xl overflow-hidden">
        {/* Table Header & Search/Filter Controls */}
        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Resident Registry</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/8">
                  {filteredResidents.length} of {totalResidents}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Filter by tenure, step-down feasibility, and diagnosis code</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search ID, diagnosis, grant..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Filter Pills & Page Size Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/3">
            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                onClick={() => { setFeasibilityFilter('ALL'); setCurrentPage(1) }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  feasibilityFilter === 'ALL'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-white/4 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                All ({totalResidents})
              </button>
              <button
                onClick={() => { setFeasibilityFilter('Eligible'); setCurrentPage(1) }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  feasibilityFilter === 'Eligible'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-white/4 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                Eligible ({eligibleCount})
              </button>
              <button
                onClick={() => { setFeasibilityFilter('High Support'); setCurrentPage(1) }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  feasibilityFilter === 'High Support'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-white/4 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                High Support ({highSupportCount})
              </button>
              <button
                onClick={() => { setFeasibilityFilter('Institutional'); setCurrentPage(1) }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  feasibilityFilter === 'Institutional'
                    ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                    : 'bg-white/4 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                Institutional ({institutionalCount})
              </button>
              <button
                onClick={() => { setFeasibilityFilter('Assessed'); setCurrentPage(1) }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  feasibilityFilter === 'Assessed'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-white/4 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                Assessed ({assessedCount})
              </button>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>Show:</span>
              {[10, 15, 25].map((size) => (
                <button
                  key={size}
                  onClick={() => { setPageSize(size); setCurrentPage(1) }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    pageSize === size
                      ? 'bg-white/10 text-white font-bold border border-white/15'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[11px] text-slate-500 uppercase tracking-wider bg-white/1">
                <th className="py-3 px-4 text-left font-medium">Resident ID</th>
                <th className="py-3 px-4 text-left font-medium">Ward</th>
                <th className="py-3 px-4 text-left font-medium">Demographics</th>
                <th className="py-3 px-4 text-center font-medium">Tenure</th>
                <th className="py-3 px-4 text-center font-medium">Admitted</th>
                <th className="py-3 px-4 text-left font-medium">Funding Source</th>
                <th className="py-3 px-4 text-center font-medium">Review</th>
                <th className="py-3 px-4 text-left font-medium">Resettlement Feasibility</th>
                <th className="py-3 px-4 text-left font-medium">Diagnosis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/3">
              {paginatedResidents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    <Users className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    No residents match the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedResidents.map((r) => (
                  <tr key={r.id} className="hover:bg-white/3 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-300">{r.residentCode}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                        {r.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{r.age}y ({r.gender})</td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-white">{r.yearsResident}y</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-500">{r.admissionYear}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-slate-400 border border-white/5">
                        {r.fundingSource}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.resettlementAssessedFlag ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Assessed
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-600">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r.resettlementFeasibility === 'Eligible for Community Step-down' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Eligible Step-Down
                        </span>
                      ) : r.resettlementFeasibility === 'High Support Needed' ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          High Support
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          Institutional Care
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-[180px] truncate" title={r.primaryDiagnosis}>
                      <span className="font-mono text-[11px] bg-white/4 px-1.5 py-0.5 rounded border border-white/5 mr-1.5 text-slate-300">
                        {r.primaryDiagnosis}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredResidents.length > 0 && (
          <div className="p-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing <span className="font-semibold text-white">{startIndexDisplay}</span> to{' '}
              <span className="font-semibold text-white">{endIndexDisplay}</span> of{' '}
              <span className="font-semibold text-white">{filteredResidents.length}</span> residents
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-white/8 bg-white/3 hover:bg-white/6 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 text-[11px]"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1
                  if (totalPages > 6 && Math.abs(pNum - safeCurrentPage) > 2 && pNum !== 1 && pNum !== totalPages) {
                    if (Math.abs(pNum - safeCurrentPage) === 3) {
                      return <span key={pNum} className="px-1 text-slate-600">...</span>
                    }
                    return null
                  }
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`min-w-[28px] h-7 rounded-lg text-[11px] font-mono transition-colors ${
                        safeCurrentPage === pNum
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                          : 'bg-white/3 text-slate-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {pNum}
                    </button>
                  )
                })}
              </div>

              <button
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-white/8 bg-white/3 hover:bg-white/6 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 text-[11px]"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
