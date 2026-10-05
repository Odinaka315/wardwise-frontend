import { RefreshCw } from 'lucide-react'

interface StatusBadgeProps {
  isLive: boolean
  isFetching: boolean
  onRefetch: () => void
  label?: string
}

/** Shows live/cached data source with refetch capability */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  isLive,
  isFetching,
  onRefetch,
  label,
}) => (
  <button
    onClick={onRefetch}
    disabled={isFetching}
    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/8 text-xs text-slate-400 hover:bg-white/8 hover:text-slate-300 transition-all cursor-pointer group"
    title="Click to refresh data"
  >
    <span
      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        isLive ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-amber-400'
      }`}
    />
    <span className="font-medium">
      {isLive ? (label || 'Live') : 'Cached'}
    </span>
    <RefreshCw
      className={`w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors ${
        isFetching ? 'animate-spin' : ''
      }`}
    />
  </button>
)
