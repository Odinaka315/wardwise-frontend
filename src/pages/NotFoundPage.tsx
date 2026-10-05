import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
      <div className="text-6xl font-mono font-bold text-slate-700 mb-2">404</div>
      <h2 className="text-xl font-bold text-white mb-2">Page Not Found</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-sm">
        The page you're looking for doesn't exist in the WardWise system.
      </p>
      <Link
        to="/decisions"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Decision Suite
      </Link>
    </div>
  )
}
