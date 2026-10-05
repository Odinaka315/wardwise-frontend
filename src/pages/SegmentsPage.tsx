import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { usePatientSegmentsQuery } from '../hooks/useWardWiseQueries'
import { patientClustersData } from '../data/mockData'
import { PageSkeleton } from '../components/ui/Skeleton'
import { StatusBadge } from '../components/ui/StatusBadge'

export const SegmentsPage = () => {
  const { data, isFetching, refetch } = usePatientSegmentsQuery()
  const clusters = data?.data ?? patientClustersData
  const isLive = Boolean(data?.isLive)
  const isLoading = !data && isFetching

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold tracking-widest text-teal-400 uppercase">
            Clinical Intelligence
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Patient Segments
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            K-Means clustering: 5 phenotypic archetypes, resource drivers, and intervention targets.
          </p>
        </div>
        <StatusBadge isLive={isLive} isFetching={isFetching} onRefetch={refetch} label="Segmentation API" />
      </div>

      {/* Resource Share Bar — now dynamic */}
      <div className="glass-card rounded-xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <span className="font-semibold text-slate-300">Hospital Cost Share by Cluster</span>
          <span className="text-rose-400 font-medium text-[11px]">
            Cluster 3: {clusters.find(c => c.isCostDriver)?.percentage ?? 17.5}% of patients →{' '}
            {clusters.find(c => c.isCostDriver)?.annualHospitalCostSharePct ?? 37.8}% of cost
          </span>
        </div>
        <div className="h-4 w-full bg-white/5 rounded-full flex overflow-hidden font-mono text-[9px] text-white font-semibold text-center leading-4">
          {clusters.map((c) => (
            <div
              key={c.clusterId}
              className={`transition-all ${c.isCostDriver ? 'bg-rose-500 ring-1 ring-rose-400 z-10' : 'bg-slate-600'}`}
              style={{ width: `${c.annualHospitalCostSharePct}%` }}
              title={`Cluster ${c.clusterId}: ${c.annualHospitalCostSharePct}%`}
            >
              {c.annualHospitalCostSharePct > 12 ? `C${c.clusterId}: ${c.annualHospitalCostSharePct}%` : ''}
            </div>
          ))}
        </div>
      </div>

      {/* Cluster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clusters.map((cluster) => {
          const isDriver = cluster.isCostDriver
          return (
            <div
              key={cluster.clusterId}
              className={`rounded-xl p-5 flex flex-col justify-between transition-all ${
                isDriver
                  ? 'glass-card border-rose-500/20 ring-1 ring-rose-500/10'
                  : 'glass-card hover:bg-white/5'
              }`}
            >
              <div className="space-y-3">
                {/* Badge */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                    isDriver ? 'bg-rose-500/15 text-rose-400' : 'bg-white/8 text-slate-400'
                  }`}>
                    Cluster {cluster.clusterId}
                  </span>
                  {isDriver && (
                    <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase">
                      <AlertTriangle className="w-2.5 h-2.5" /> Cost Driver
                    </span>
                  )}
                </div>

                {/* Name */}
                <div>
                  <h3 className="text-sm font-bold text-white">{cluster.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{cluster.tagline}</p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 bg-white/3 p-2.5 rounded-lg border border-white/5 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-600 block uppercase">Size</span>
                    <span className="text-slate-300 font-semibold">{cluster.size} pts</span>
                    <span className="text-slate-500 ml-1">({cluster.percentage}%)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 block uppercase">Age</span>
                    <span className="text-slate-300 font-semibold">{cluster.avgAge}y</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 block uppercase">Admits/Yr</span>
                    <span className={`font-semibold ${isDriver ? 'text-rose-400' : 'text-slate-300'}`}>
                      {cluster.avgAdmissionsPerYear}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 block uppercase">Cost %</span>
                    <span className={`font-semibold ${isDriver ? 'text-rose-400' : 'text-slate-300'}`}>
                      {cluster.annualHospitalCostSharePct}%
                    </span>
                  </div>
                </div>

                {/* Markers */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-600">Markers</span>
                  <div className="flex flex-wrap gap-1">
                    {cluster.primaryCharacteristics.map((c, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-slate-500 border border-white/5">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommendation */}
                <div className="text-xs text-slate-500 bg-white/3 p-2.5 rounded-lg border border-white/5 leading-relaxed">
                  <span className="text-slate-300 font-semibold">Protocol: </span>
                  {cluster.clinicalRecommendation}
                </div>
              </div>

              {/* Link for cost driver */}
              {isDriver && (
                <div className="mt-4 pt-3 border-t border-rose-500/15 flex items-center justify-between">
                  <span className="text-[11px] text-rose-400">Revolving-door risk</span>
                  <Link
                    to="/risk-worklist"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 text-xs font-medium hover:bg-rose-500/20 transition-colors border border-rose-500/20"
                  >
                    Risk Worklist <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
