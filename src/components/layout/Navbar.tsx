import { Activity, RefreshCw, Menu, X } from 'lucide-react'
import { API_BASE_URL } from '../../services/api'
import { useBackendHealthQuery } from '../../hooks/useWardWiseQueries'
import fnphyLogo from '../../assets/FNPHY logo 2.png'

interface NavbarProps {
  mobileMenuOpen?: boolean
  onToggleMobileMenu?: () => void
}

export const Navbar = ({ mobileMenuOpen = false, onToggleMobileMenu }: NavbarProps) => {
  const { data: health, isFetching, refetch } = useBackendHealthQuery()
  const isLive = Boolean(health?.live)

  return (
    <header className="h-14 bg-[#0a0e1a]/90 backdrop-blur-xl text-white border-b border-white/5 px-3 sm:px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Brand & Mobile Toggle */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
        <img
          src={fnphyLogo}
          alt="FNPH Yaba Logo"
          className="w-8 h-8 rounded-full object-contain shrink-0 shadow-md shadow-emerald-500/10 bg-white/5 p-0.5"
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-white">WardWise</span>
            <span className="hidden sm:inline-block text-[10px] font-medium text-slate-500">•</span>
            <span className="hidden sm:inline-block text-[11px] text-slate-400 font-medium">
              FNPH Yaba
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium leading-none hidden md:block">
            Operations & Decision Intelligence
          </span>
        </div>
      </div>

      {/* Right: Status Indicators */}
      <div className="flex items-center gap-2">
        {/* Backend Status */}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-xs text-slate-400 hover:bg-white/8 transition-all cursor-pointer"
          title={`Backend: ${API_BASE_URL}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLive
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                : 'bg-amber-400'
            }`}
          />
          <span className="font-medium font-mono text-[11px]">
            {isLive ? 'Connected' : 'Offline'}
          </span>
          {isFetching && <RefreshCw className="w-2.5 h-2.5 animate-spin text-slate-500" />}
        </button>

        {/* Census Quick Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-xs">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span className="text-slate-400 font-mono text-[11px]">
            <span className="text-slate-200 font-semibold">309</span>
            <span className="text-slate-500">/354</span>
          </span>
        </div>
      </div>
    </header>
  )
}
