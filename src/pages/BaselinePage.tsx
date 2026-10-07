import { useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Clock, ShieldAlert, Users, SlidersHorizontal } from 'lucide-react';
import { useBaselineSummaryQuery } from '../hooks/useWardWiseQueries';
import { PageSkeleton } from '../components/ui/Skeleton';
import type { BaselineFilters } from '../services/api';

export const BaselinePage = () => {
  const [filters, setFilters] = useState<BaselineFilters>({});
  const { data,  } = useBaselineSummaryQuery(filters);

  if (!data) return <PageSkeleton />;

  const updateFilter = (key: keyof BaselineFilters, value: string | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <span className="text-[10px] font-semibold tracking-widest text-emerald-400 uppercase">
          Core Metrics
        </span>
        <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
          Operations Baseline
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Historical overview of capacity, throughput, and safety indicators.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Filter Baseline By</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200"
            value={filters.unitId || ''}
            onChange={(e) => updateFilter('unitId', e.target.value)}
          >
            <option value="">All Wards</option>
            <option value="ACM">Acute Male</option>
            <option value="ACF">Acute Female</option>
            <option value="CAU">Child & Adolescent</option>
          </select>
          <select
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200"
            value={filters.diagnosisGroup || ''}
            onChange={(e) => updateFilter('diagnosisGroup', e.target.value)}
          >
            <option value="">All Diagnoses</option>
            <option value="Psychotic">Psychotic</option>
            <option value="Mood">Mood</option>
            <option value="Substance">Substance</option>
          </select>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 w-full"
              value={filters.startDate || ''}
              onChange={(e) => updateFilter('startDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-5 border-t-2 border-t-blue-500">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase">Avg Length of Stay</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3 text-3xl font-mono font-bold text-white">
            {data.avgLengthOfStay} <span className="text-sm font-normal text-slate-500">days</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border-t-2 border-t-amber-500">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase">Avg Cost</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 text-3xl font-mono font-bold text-white">
            ₦{(data.avgCostNgn / 1000).toFixed(1)}k
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border-t-2 border-t-emerald-500">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase">Attendance Rate</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-3xl font-mono font-bold text-white">
            {data.attendanceRate.toFixed(1)}%
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border-t-2 border-t-rose-500">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase">Safety Incidents</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3 text-3xl font-mono font-bold text-white">
            {data.safetyIncidents}
          </div>
        </div>
      </div>

      {/* Chart: Nominal vs Effective Capacity */}
      <div className="glass-card rounded-xl p-5 h-96">
        <h3 className="text-sm font-semibold text-white mb-6">Occupancy vs. Nominal Capacity</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.occupancySeries}>
            <defs>
              <linearGradient id="colorOccupied" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="census_date" stroke="#94a3b8" fontSize={10} minTickGap={30} />
            <YAxis stroke="#94a3b8" fontSize={10} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px' }}
              itemStyle={{ fontSize: '12px' }}
              labelStyle={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}
            />
            <Area type="monotone" dataKey="nominal_capacity" name="Nominal Capacity" stroke="#3b82f6" fill="none" strokeWidth={2} />
            <Area type="monotone" dataKey="occupied_beds" name="Occupied Beds" stroke="#10b981" fillOpacity={1} fill="url(#colorOccupied)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};