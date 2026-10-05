import { AlertTriangle, Cpu, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { useForecastQuery } from '../hooks/useWardWiseQueries'
import { admissionForecasts } from '../data/mockData'
import { PageSkeleton } from '../components/ui/Skeleton'
import { StatusBadge } from '../components/ui/StatusBadge'

export const ForecastPage = () => {
  const { data, isFetching, refetch } = useForecastQuery()
  const forecasts = data?.data ?? admissionForecasts
  const isLive = Boolean(data?.isLive)
  const isLoading = !data && isFetching

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold tracking-widest text-blue-400 uppercase">
            Hospital Operations
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Admission Forecasts
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Next-month predictions per unit (XGBoost & Naive baseline).
          </p>
        </div>
        <StatusBadge isLive={isLive} isFetching={isFetching} onRefetch={refetch} label="Forecast API" />
      </div>

      {/* Methodology Notice */}
      <div className="glass-card rounded-xl p-4 flex items-start gap-3">
        <Cpu className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <span className="text-white font-semibold">Model Note: </span>
          XGBoost for high-volume wards, Naive Persistence for sparse units.
          <span className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Clipped from Negative
          </span>
          flags where regression output was bounded to physical minimums.
        </div>
      </div>

      {/* Forecast Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {forecasts.map((item) => (
          <div
            key={item.unitCode}
            className={`rounded-xl p-5 transition-all ${
              item.clippedFromNegative
                ? 'glass-card border-amber-500/20'
                : 'glass-card'
            }`}
          >
            <div className="space-y-3">
              {/* Unit Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-white/8 text-white px-2 py-0.5 rounded-md">
                    {item.unitCode}
                  </span>
                  <span className="text-xs font-semibold text-slate-300">{item.unitName}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-500 border border-white/5">
                  {item.method}
                </span>
              </div>

              {/* Clipped Warning */}
              {item.clippedFromNegative && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Clipped from Negative
                </div>
              )}

              {/* Numbers */}
              <div className="flex items-end justify-between pt-1">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                    Predicted
                  </span>
                  <div className="text-3xl font-mono font-bold text-white">
                    {item.predictedAdmissions}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-600 block">Hist. Avg</span>
                  <div className="text-sm font-mono text-slate-500 font-medium">
                    {item.historicalMonthlyAvg}/mo
                  </div>
                  <div className="flex items-center justify-end gap-0.5 text-[11px] font-semibold mt-0.5">
                    {item.trendDirection === 'up' && (
                      <span className="text-emerald-400 flex items-center">
                        <ArrowUpRight className="w-3.5 h-3.5" />+{item.predictedAdmissions - item.historicalMonthlyAvg}
                      </span>
                    )}
                    {item.trendDirection === 'down' && (
                      <span className="text-rose-400 flex items-center">
                        <ArrowDownRight className="w-3.5 h-3.5" />{item.predictedAdmissions - item.historicalMonthlyAvg}
                      </span>
                    )}
                    {item.trendDirection === 'stable' && (
                      <span className="text-slate-600 flex items-center">
                        <Minus className="w-3.5 h-3.5" /> Stable
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Confidence Interval */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>95% CI</span>
                <span className="font-medium text-slate-400">
                  [{item.confidenceLow} – {item.confidenceHigh}]
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
