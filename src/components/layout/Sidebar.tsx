import type React from 'react'
import { NavLink } from 'react-router-dom'
import {
  SlidersHorizontal,
  GitCompare,
  GitFork,
  AlertTriangle,
  Users,
  LayoutDashboard,
  TrendingUp,
  BedDouble,
  X,
  FlaskConical,
  Activity
} from 'lucide-react'
import fnphyLogo from '../../assets/FNPHY logo 2.png'

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  badge?: string
  badgeColor?: string
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Executive',
    items: [
      { to: '/decisions', label: 'Decision Suite', icon: SlidersHorizontal, badge: 'Core', badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
      { to: '/scenarios', label: 'Scenarios', icon: GitCompare, badge: 'Board', badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
      { to: '/scenarios/custom', label: 'Custom Scenario', icon: FlaskConical, badge: 'Custom', badgeColor: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
      { to: '/baseline', label: 'Baseline', icon: Activity },
    ],
  },
  {
    title: 'Clinical',
    items: [
      { to: '/pathway', label: 'Pathway Explorer', icon: GitFork },
      { to: '/risk-worklist', label: 'Risk Worklist', icon: AlertTriangle },
      { to: '/segments', label: 'Segments', icon: Users },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/overview', label: 'Overview', icon: LayoutDashboard },
      { to: '/forecast', label: 'Forecast', icon: TrendingUp },
      { to: '/long-stay', label: 'Long-Stay', icon: BedDouble },
    ],
  },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export const Sidebar = ({ isOpen = false, onClose }: SidebarProps) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: Mobile Off-Canvas Drawer + Desktop Static Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0e1a] border-r border-white/5 flex flex-col h-full
          transition-transform duration-300 ease-in-out md:static md:w-56 md:translate-x-0 md:z-20 shrink-0
          ${isOpen ? 'translate-x-0 shadow-2xl shadow-black/90' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Mobile Header with Brand & Close Button */}
        <div className="flex md:hidden items-center justify-between p-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src={fnphyLogo}
              alt="FNPH Yaba Logo"
              className="w-7 h-7 rounded-full object-contain bg-white/5 p-0.5"
            />
            <span className="font-bold text-sm text-white">WardWise</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-6 pt-5 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="px-3 mb-2">
                <span className="text-[10px] font-semibold tracking-widest text-slate-600 uppercase">
                  {section.title}
                </span>
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => onClose && onClose()}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group ${
                          isActive
                            ? 'bg-white/8 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/4'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0 transition-colors group-hover:text-emerald-400" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${item.badgeColor || 'bg-white/5 text-slate-500 border-white/8'}`}>
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 shrink-0">
          <div className="text-[10px] text-slate-600 font-mono leading-relaxed">
            <span className="text-slate-500">WardWise</span> v1.0
            <br />
            Federal Ministry of Health
          </div>
        </div>
      </aside>
    </>
  )
}

