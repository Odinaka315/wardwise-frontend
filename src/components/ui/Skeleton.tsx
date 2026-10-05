import type React from 'react'

interface SkeletonProps {
  className?: string
  children?: React.ReactNode
}

/** Reusable shimmer skeleton block */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`skeleton-shimmer rounded-lg ${className}`} />
)

/** Page-level loading skeleton with header + content blocks */
export const PageSkeleton: React.FC = () => (
  <div className="space-y-6 animate-fade-in">
    {/* Header skeleton */}
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
      <Skeleton className="h-7 w-80 mb-2" />
      <Skeleton className="h-4 w-96" />
    </div>

    {/* Metric cards skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="glass-card rounded-xl p-5">
          <Skeleton className="h-3.5 w-28 mb-3" />
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>

    {/* Table skeleton */}
    <div className="glass-card rounded-2xl p-6 space-y-3">
      <Skeleton className="h-5 w-64 mb-4" />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24 ml-auto" />
        </div>
      ))}
    </div>
  </div>
)

/** Card-level loading skeleton */
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="glass-card rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
)

/** Table-level loading skeleton */
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 8,
  cols = 6,
}) => (
  <div className="glass-card rounded-2xl overflow-hidden">
    <div className="p-5 border-b border-white/5">
      <Skeleton className="h-5 w-56 mb-2" />
      <Skeleton className="h-3.5 w-80" />
    </div>
    <div className="p-5 space-y-2.5">
      {/* Header row */}
      <div className="flex gap-4 pb-3 border-b border-white/5">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-3.5 flex-1" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-1">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
)
