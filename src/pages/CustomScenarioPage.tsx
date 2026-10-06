import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
  XCircle,
  Loader2,
  Save,
  Trash2,
  Clock,
  Plus,
  Beaker,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  fetchCustomScenarioBaselineDefaults,
  submitCustomScenario,
  pollCustomScenarioResult,
} from '../services/api'
import type {
  CustomScenarioBaselineDefaults,
  CustomScenarioSubmission,
  CustomScenarioResult,
  DisruptionEventType,
  BedGroup,
  SavedCustomScenario,
} from '../types'
import { Skeleton } from '../components/ui/Skeleton'

const BED_GROUP_LABELS: Record<BedGroup, string> = {
  ACUTE: 'Acute (ACM + ACF)',
  REHAB: 'Rehabilitation (DRU + LSR)',
  DAY: 'Day Hospital',
}

const EVENT_LABELS: Record<DisruptionEventType, string> = {
  none: 'None',
  strike: 'Staffing Strike',
  surge: 'Demand Surge',
  freeze: 'Admissions Freeze',
}

const STORAGE_KEY = 'wardwise_custom_scenarios'

// LocalStorage helpers
const loadSavedScenarios = (): SavedCustomScenario[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const persistScenarios = (scenarios: SavedCustomScenario[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios))
}

type RunStatus = 'idle' | 'running' | 'success' | 'failure'

export const CustomScenarioPage = () => {
  const navigate = useNavigate()

  // Baseline state
  const [defaults, setDefaults] = useState<CustomScenarioBaselineDefaults | null>(null)
  const [defaultsError, setDefaultsError] = useState<string | null>(null)
  const [loadingDefaults, setLoadingDefaults] = useState(true)

  // Form state
  const [capacityAcute, setCapacityAcute] = useState(0)
  const [capacityRehab, setCapacityRehab] = useState(0)
  const [capacityDay, setCapacityDay] = useState(0)
  const [demandMultiplier, setDemandMultiplier] = useState(1.0)
  const [eventType, setEventType] = useState<DisruptionEventType>('none')
  const [eventStartMonth, setEventStartMonth] = useState(0)
  const [eventDurationMonths, setEventDurationMonths] = useState(1)
  const [arrivalFactor, setArrivalFactor] = useState<number | null>(null)
  const [dischargeFactor, setDischargeFactor] = useState<number | null>(null)
  const [horizonMonths, setHorizonMonths] = useState(200)
  const [replications, setReplications] = useState(30)
  const [scenarioLabel, setScenarioLabel] = useState('')
  const [overcrowdDropout, setOvercrowdDropout] = useState(0.0)

  // UI state
  const [showAdvancedEvent, setShowAdvancedEvent] = useState(false)
  const [showSimSettings, setShowSimSettings] = useState(false)
  const [showSavedPanel, setShowSavedPanel] = useState(true)

  // Run state
  const [runStatus, setRunStatus] = useState<RunStatus>('idle')
  const [result, setResult] = useState<CustomScenarioResult | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  // Saved scenarios
  const [savedScenarios, setSavedScenarios] = useState<SavedCustomScenario[]>(loadSavedScenarios)

  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Fetch baseline defaults
  const fetchDefaults = useCallback(async () => {
    setLoadingDefaults(true)
    setDefaultsError(null)
    try {
      const data = await fetchCustomScenarioBaselineDefaults()
      setDefaults(data)
      setCapacityAcute(data.capacity.ACUTE)
      setCapacityRehab(data.capacity.REHAB)
      setCapacityDay(data.capacity.DAY)
      setDemandMultiplier(data.demand_multiplier)
      setOvercrowdDropout(data.overcrowd_dropout)
      setHorizonMonths(data.horizon_months)
      setReplications(data.default_replications)
    } catch (err) {
      setDefaultsError(err instanceof Error ? err.message : 'Failed to load baseline defaults')
    } finally {
      setLoadingDefaults(false)
    }
  }, [])

  useEffect(() => {
    fetchDefaults()
  }, [fetchDefaults])

  // Update event factors when event type changes
  useEffect(() => {
    if (defaults && eventType !== 'none') {
      const eventDefaults = defaults.event_types[eventType]
      if (eventDefaults) {
        setArrivalFactor(eventDefaults.arrival_factor)
        setDischargeFactor(eventDefaults.discharge_factor)
      }
    } else {
      setArrivalFactor(null)
      setDischargeFactor(null)
    }
  }, [eventType, defaults])

  const validate = (): string[] => {
    const errors: string[] = []
    if (!scenarioLabel.trim()) errors.push('Scenario name is required')
    if (scenarioLabel.length > 60) errors.push('Scenario name must be 60 characters or less')
    if (capacityAcute < 0) errors.push('Acute capacity must be ≥ 0')
    if (capacityRehab < 0) errors.push('Rehab capacity must be ≥ 0')
    if (capacityDay < 0) errors.push('Day capacity must be ≥ 0')
    if (demandMultiplier < 0.5 || demandMultiplier > 2.0) errors.push('Demand multiplier must be 0.5–2.0')
    if (overcrowdDropout < 0.0 || overcrowdDropout > 1.0) errors.push('Overcrowd dropout must be 0.0–1.0')
    if (eventType !== 'none') {
      if (eventDurationMonths < 1) errors.push('Event duration must be ≥ 1 month')
      if (eventStartMonth + eventDurationMonths > horizonMonths) {
        errors.push('Event window must fit within the simulation horizon')
      }
    }
    if (replications < 20 || replications > 100) errors.push('Replications must be 20–100')
    return errors
  }

  const buildPayload = (): CustomScenarioSubmission => {
    const payload: CustomScenarioSubmission = {
      label: scenarioLabel.trim(),
    }

    // Only send capacity overrides that differ from defaults
    if (defaults) {
      const overrides: Partial<Record<BedGroup, number>> = {}
      if (capacityAcute !== defaults.capacity.ACUTE) overrides.ACUTE = capacityAcute
      if (capacityRehab !== defaults.capacity.REHAB) overrides.REHAB = capacityRehab
      if (capacityDay !== defaults.capacity.DAY) overrides.DAY = capacityDay
      if (Object.keys(overrides).length > 0) payload.capacity_overrides = overrides

      if (demandMultiplier !== defaults.demand_multiplier) payload.demand_multiplier = demandMultiplier
      if (overcrowdDropout !== defaults.overcrowd_dropout) payload.overcrowd_dropout = overcrowdDropout
      if (horizonMonths !== defaults.horizon_months) payload.horizon_months = horizonMonths
      if (replications !== defaults.default_replications) payload.replications = replications
    }

    if (eventType !== 'none') {
      payload.event = {
        type: eventType,
        start_month: eventStartMonth,
        duration_months: eventDurationMonths,
        arrival_factor: arrivalFactor,
        discharge_factor: dischargeFactor,
      }
    }

    return payload
  }

  const handleSubmit = async () => {
    const errors = validate()
    setValidationErrors(errors)
    if (errors.length > 0) return

    setRunStatus('running')
    setRunError(null)
    setResult(null)

    try {
      const payload = buildPayload()
      const { task_id } = await submitCustomScenario(payload)
      const res = await pollCustomScenarioResult(task_id)
      setResult(res)
      setRunStatus('success')
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Simulation failed')
      setRunStatus('failure')
    }
  }

  const handleResetToBaseline = () => {
    fetchDefaults()
    setEventType('none')
    setEventStartMonth(0)
    setEventDurationMonths(1)
    setScenarioLabel('')
    setShowAdvancedEvent(false)
    setShowSimSettings(false)
    setResult(null)
    setRunStatus('idle')
    setRunError(null)
    setValidationErrors([])
  }

  // Saved scenarios
  const handleSaveScenario = () => {
    const errors = validate()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    const payload = buildPayload()
    const newSaved: SavedCustomScenario = {
      id: crypto.randomUUID(),
      name: scenarioLabel.trim(),
      savedAt: new Date().toISOString(),
      params: payload,
      result: result,
    }
    const updated = [newSaved, ...savedScenarios]
    setSavedScenarios(updated)
    persistScenarios(updated)
  }

  const handleLoadScenario = (scenario: SavedCustomScenario, viewResult = false) => {
    const p = scenario.params
    setScenarioLabel(p.label)
    if (defaults) {
      setCapacityAcute(p.capacity_overrides?.ACUTE ?? defaults.capacity.ACUTE)
      setCapacityRehab(p.capacity_overrides?.REHAB ?? defaults.capacity.REHAB)
      setCapacityDay(p.capacity_overrides?.DAY ?? defaults.capacity.DAY)
      setDemandMultiplier(p.demand_multiplier ?? defaults.demand_multiplier)
      setOvercrowdDropout(p.overcrowd_dropout ?? defaults.overcrowd_dropout)
      setHorizonMonths(p.horizon_months ?? defaults.horizon_months)
      setReplications(p.replications ?? defaults.default_replications)
    }
    if (p.event) {
      setEventType(p.event.type)
      setEventStartMonth(p.event.start_month ?? 0)
      setEventDurationMonths(p.event.duration_months ?? 1)
      setArrivalFactor(p.event.arrival_factor ?? null)
      setDischargeFactor(p.event.discharge_factor ?? null)
    } else {
      setEventType('none')
    }

    if (viewResult && scenario.result) {
      setResult(scenario.result)
      setRunStatus('success')
    } else {
      setResult(null)
      setRunStatus('idle')
    }
    setRunError(null)
    setValidationErrors([])
  }

  const handleRunSavedScenario = async (scenario: SavedCustomScenario) => {
    handleLoadScenario(scenario, false)
    setRunStatus('running')
    setRunError(null)
    setResult(null)

    try {
      const { task_id } = await submitCustomScenario(scenario.params)
      const res = await pollCustomScenarioResult(task_id)
      setResult(res)
      setRunStatus('success')

      // Cache the result in localStorage for this scenario
      const updated = savedScenarios.map((s) => (s.id === scenario.id ? { ...s, result: res } : s))
      setSavedScenarios(updated)
      persistScenarios(updated)
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Simulation failed')
      setRunStatus('failure')
    }
  }

  const handleDeleteScenario = (id: string) => {
    const updated = savedScenarios.filter((s) => s.id !== id)
    setSavedScenarios(updated)
    persistScenarios(updated)
  }

  // Loading state
  if (loadingDefaults) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card rounded-xl p-5">
                <Skeleton className="h-4 w-32 mb-3" />
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="glass-card rounded-xl p-5">
            <Skeleton className="h-4 w-40 mb-4" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full mb-2" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (defaultsError) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/scenarios')}
            className="p-2 rounded-lg bg-white/5 border border-white/8 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-2xl font-bold text-white">Custom Scenario Builder</h2>
        </div>
        <div className="glass-card rounded-xl p-8 text-center">
          <XCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Baseline</h3>
          <p className="text-sm text-slate-400 mb-4">{defaultsError}</p>
          <button
            onClick={fetchDefaults}
            className="px-4 py-2 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20 text-sm font-medium hover:bg-blue-500/25 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!defaults) return null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/scenarios')}
            className="p-2 rounded-lg bg-white/5 border border-white/8 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-semibold tracking-widest text-violet-400 uppercase">
              Custom Scenario Builder
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              Build & Test Your Own Scenario
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Adjust operational parameters and run a discrete-event simulation with custom settings.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSavedPanel(!showSavedPanel)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-slate-400 hover:text-white border border-white/8 transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            {showSavedPanel ? 'Hide' : 'Show'} Saved
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Saved Scenarios Sidebar */}
        {showSavedPanel && (
          <div className="lg:w-72 shrink-0 space-y-3 animate-fade-in">
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-violet-400" />
                    Saved Scenarios
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">{savedScenarios.length} saved</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetToBaseline}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-violet-600/15 text-violet-300 border border-violet-500/25 hover:bg-violet-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Scenario from Scratch
                </button>
              </div>

              {savedScenarios.length === 0 ? (
                <div className="p-6 text-center">
                  <Beaker className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No saved scenarios yet.</p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    Save your custom parameter configurations to re-run or edit later.
                  </p>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-320px)] overflow-y-auto divide-y divide-white/5">
                  {savedScenarios.map((s) => {
                    const hasResult = !!s.result
                    const eventName = s.params.event ? EVENT_LABELS[s.params.event.type] : 'None'
                    const demand = s.params.demand_multiplier ?? 1.0

                    return (
                      <div
                        key={s.id}
                        className="p-3.5 hover:bg-white/3 transition-colors group space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-semibold text-white leading-tight line-clamp-2">
                              {s.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {new Date(s.savedAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteScenario(s.id)}
                            className="p-1 rounded text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                            title="Delete saved scenario"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Parameter quick badges */}
                        <div className="flex flex-wrap gap-1 text-[9px] font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                            {demand.toFixed(2)}× Demand
                          </span>
                          {eventName !== 'None' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {eventName}
                            </span>
                          )}
                          {hasResult && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Simulated
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            onClick={() => handleLoadScenario(s, false)}
                            className="flex-1 min-w-[70px] px-2 py-1.5 rounded text-[10px] font-medium bg-white/5 text-slate-300 border border-white/8 hover:text-white hover:bg-white/10 transition-colors text-center"
                            title="Load parameters into editor to modify"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRunSavedScenario(s)}
                            disabled={runStatus === 'running'}
                            className="flex-1 min-w-[75px] px-2 py-1.5 rounded text-[10px] font-medium bg-violet-500/15 text-violet-300 border border-violet-500/25 hover:bg-violet-500/25 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                            title="Run simulation as is"
                          >
                            <Play className="w-2.5 h-2.5" />
                            Run as is
                          </button>
                          {hasResult && (
                            <button
                              onClick={() => handleLoadScenario(s, true)}
                              className="w-full px-2 py-1 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-center"
                              title="View saved simulation results"
                            >
                              View Saved Result
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Form Section */}
          <div className="space-y-4">
            {/* Scenario Name */}
            <div className="glass-card rounded-xl p-5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Scenario Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={scenarioLabel}
                onChange={(e) => setScenarioLabel(e.target.value)}
                maxLength={60}
                placeholder="e.g. High-demand rehab expansion"
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/8 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
              <span className="text-[10px] text-slate-600 mt-1 block text-right">
                {scenarioLabel.length}/60
              </span>
            </div>

            {/* Bed Capacity */}
            <div className="glass-card rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Bed Capacity
              </h3>
              {(['ACUTE', 'REHAB', 'DAY'] as BedGroup[]).map((group) => {
                const value = group === 'ACUTE' ? capacityAcute : group === 'REHAB' ? capacityRehab : capacityDay
                const setter = group === 'ACUTE' ? setCapacityAcute : group === 'REHAB' ? setCapacityRehab : setCapacityDay
                const phi = defaults.phi[group]
                const defaultVal = defaults.capacity[group]
                return (
                  <div key={group} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-slate-400">{BED_GROUP_LABELS[group]}</label>
                      <span className="text-[10px] text-slate-600 font-mono">
                        Default: {defaultVal}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={value}
                        onChange={(e) => setter(Math.max(0, parseInt(e.target.value) || 0))}
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-white text-sm font-mono focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
                      />
                      <div className="flex items-center gap-1 text-[10px] text-slate-600 shrink-0" title={`~${Math.round(phi * 100)}% of patients in this stage occupy a bed on a given day`}>
                        <Info className="w-3 h-3 text-slate-600" />
                        <span>ϕ = {(phi * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Demand Multiplier */}
            <div className="glass-card rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Demand Level
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-400">Demand Multiplier</label>
                  <span className="text-sm font-mono font-bold text-white">
                    {demandMultiplier.toFixed(2)}×
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  value={demandMultiplier}
                  onChange={(e) => setDemandMultiplier(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-white/8 cursor-pointer accent-violet-500"
                />
                <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                  <span>0.50× (Low)</span>
                  <span>1.00× (Baseline)</span>
                  <span>2.00× (High)</span>
                </div>
              </div>
            </div>

            {/* Disruption Event */}
            <div className="glass-card rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Disruption Event
              </h3>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as DisruptionEventType)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/8 text-white text-sm focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
              >
                {(Object.keys(EVENT_LABELS) as DisruptionEventType[]).map((t) => (
                  <option key={t} value={t} className="bg-slate-900">
                    {EVENT_LABELS[t]}
                  </option>
                ))}
              </select>

              {eventType !== 'none' && (
                <div className="space-y-3 pt-2 border-t border-white/5 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5">Start Month</label>
                      <input
                        type="number"
                        min={0}
                        value={eventStartMonth}
                        onChange={(e) => setEventStartMonth(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-white text-sm font-mono focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5">Duration (months)</label>
                      <input
                        type="number"
                        min={1}
                        value={eventDurationMonths}
                        onChange={(e) => setEventDurationMonths(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-white text-sm font-mono focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Advanced Event Overrides */}
                  <button
                    onClick={() => setShowAdvancedEvent(!showAdvancedEvent)}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showAdvancedEvent ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Advanced (arrival/discharge factors)
                  </button>

                  {showAdvancedEvent && (
                    <div className="grid grid-cols-2 gap-3 animate-fade-in">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Arrival Factor</label>
                        <input
                          type="number"
                          step={0.01}
                          min={0}
                          value={arrivalFactor ?? ''}
                          onChange={(e) => setArrivalFactor(e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder={defaults.event_types[eventType]?.arrival_factor?.toString()}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-white text-sm font-mono focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all placeholder-slate-600"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Discharge Factor</label>
                        <input
                          type="number"
                          step={0.01}
                          min={0}
                          value={dischargeFactor ?? ''}
                          onChange={(e) => setDischargeFactor(e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder={defaults.event_types[eventType]?.discharge_factor?.toString()}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-white text-sm font-mono focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all placeholder-slate-600"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Simulation Settings (collapsed) */}
            <div className="glass-card rounded-xl overflow-hidden">
              <button
                onClick={() => setShowSimSettings(!showSimSettings)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-white/2 transition-colors"
              >
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  Simulation Settings
                </h3>
                {showSimSettings ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </button>
              {showSimSettings && (
                <div className="px-5 pb-5 space-y-3 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5">Horizon (months)</label>
                      <input
                        type="number"
                        min={1}
                        value={horizonMonths}
                        onChange={(e) => setHorizonMonths(Math.max(1, parseInt(e.target.value) || 200))}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-white text-sm font-mono focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5">Replications</label>
                      <input
                        type="number"
                        min={20}
                        max={100}
                        value={replications}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 20
                          setReplications(Math.max(20, Math.min(100, v)))
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-white text-sm font-mono focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">
                      Overcrowd Dropout (0–1)
                      <span className="text-[10px] text-slate-600 ml-1">— fraction of patients who leave when overcrowded</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={overcrowdDropout}
                      onChange={(e) => setOvercrowdDropout(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)))}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-white text-sm font-mono focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-1">
                {validationErrors.map((err, idx) => (
                  <p key={idx} className="text-xs text-rose-400 flex items-center gap-1.5">
                    <XCircle className="w-3 h-3 shrink-0" />
                    {err}
                  </p>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={runStatus === 'running'}
                className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
              >
                {runStatus === 'running' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Scenario
                  </>
                )}
              </button>
              <button
                onClick={handleSaveScenario}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-slate-400 border border-white/8 hover:text-white hover:bg-white/8 transition-all flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
              <button
                onClick={handleResetToBaseline}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-slate-400 border border-white/8 hover:text-white hover:bg-white/8 transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>

          {/* Result Panel */}
          <div className="space-y-4">
            {/* Idle state */}
            {runStatus === 'idle' && !result && (
              <div className="glass-card rounded-xl p-12 text-center">
                <Beaker className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-400">Run a scenario to see results here</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Configure your parameters above and click "Run Scenario"
                </p>
              </div>
            )}

            {/* Running state */}
            {runStatus === 'running' && (
              <div className="glass-card rounded-xl p-12 text-center">
                <Loader2 className="w-10 h-10 text-violet-400 mx-auto mb-3 animate-spin" />
                <h3 className="text-sm font-semibold text-white">Simulation Running…</h3>
                <p className="text-xs text-slate-500 mt-1">
                  This may take up to a minute depending on the number of replications.
                </p>
              </div>
            )}

            {/* Failure state */}
            {runStatus === 'failure' && runError && (
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">Simulation Failed</h3>
                    <p className="text-xs text-slate-400">{runError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success state */}
            {runStatus === 'success' && result && (
              <div className="space-y-4 animate-fade-in">
                {/* Warnings */}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                    {result.warnings.map((w, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300/90 leading-relaxed">{w}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Result Header */}
                <div className="glass-card rounded-xl p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-violet-500/10 px-2 py-0.5 rounded-full text-violet-400 border border-violet-500/20">
                          Custom
                        </span>
                        <h3 className="text-base font-bold text-white">{result.label}</h3>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <span className="text-[11px] text-slate-500">Monthly Cost</span>
                      <span className="text-lg font-mono font-bold text-emerald-400 block">
                        ₦{Math.round(result.monthly_cost_ngn / 1_000_000)}M
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stat Tiles — per bed group */}
                <div className="glass-card rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Occupancy by Bed Group
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {([
                      { key: 'ACUTE', label: 'Acute', idx: 0 },
                      { key: 'REHAB', label: 'Rehabilitation', idx: 1 },
                      { key: 'DAY', label: 'Day Hospital', idx: 2 },
                    ] as const).map(({ key, label, idx }) => {
                      const occKey = `occupancy_rate_${idx}` as keyof CustomScenarioResult
                      const occVal = Number(result[occKey] ?? 0) * 100
                      const isOver = occVal > 100
                      return (
                        <div key={key} className="p-3 bg-white/3 rounded-lg border border-white/5">
                          <span className="text-[11px] text-slate-500">{label} Occupancy</span>
                          <div className={`text-xl font-bold font-mono mt-0.5 ${isOver ? 'text-rose-400' : 'text-white'}`}>
                            {occVal.toFixed(1)}%
                          </div>
                          {isOver && (
                            <span className="text-[10px] text-rose-400/80">⚠ Over capacity</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="glass-card p-3 rounded-lg">
                    <span className="text-[11px] text-slate-500">Wait Time (Rehab)</span>
                    <div className="text-xl font-bold font-mono text-white mt-0.5">
                      {result.wait_days_1.toFixed(1)}d
                    </div>
                  </div>
                  <div className="glass-card p-3 rounded-lg">
                    <span className="text-[11px] text-slate-500">Overflow (Rehab)</span>
                    <div className="text-xl font-bold font-mono text-white mt-0.5">
                      {result.overflow_beds_1.toFixed(1)}
                    </div>
                  </div>
                  <div className="glass-card p-3 rounded-lg">
                    <span className="text-[11px] text-slate-500">Monthly Relapses</span>
                    <div className="text-xl font-bold font-mono text-white mt-0.5">
                      {result.monthly_relapse_events.toFixed(1)}
                    </div>
                  </div>
                  <div className="glass-card p-3 rounded-lg">
                    <span className="text-[11px] text-slate-500">Avg Months in System</span>
                    <div className="text-xl font-bold font-mono text-white mt-0.5">
                      {result.months_in_system.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Absorption Bar */}
                {(() => {
                  const stablePct = Math.round((result['abs_Recovered and discharged from service'] ?? 0) * 100)
                  const ltfuPct = Math.round((result['abs_Lost to follow-up'] ?? 0) * 100)
                  const otherPct = Math.max(0, 100 - stablePct - ltfuPct)
                  return (
                    <div className="glass-card rounded-xl p-5 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Absorption Distribution</span>
                        <div className="flex gap-4">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <span className="w-2 h-2 rounded bg-emerald-500" /> Stable {stablePct}%
                          </span>
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <span className="w-2 h-2 rounded bg-rose-500" /> LTFU {ltfuPct}%
                          </span>
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <span className="w-2 h-2 rounded bg-amber-500" /> LT {otherPct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-3 w-full bg-white/5 rounded-full flex overflow-hidden">
                        <div className="bg-emerald-500 transition-all" style={{ width: `${stablePct}%` }} />
                        <div className="bg-rose-500 transition-all" style={{ width: `${ltfuPct}%` }} />
                        <div className="bg-amber-500 transition-all" style={{ width: `${otherPct}%` }} />
                      </div>
                    </div>
                  )
                })()}

                {/* Trajectory Chart */}
                {result.trajectory && (
                  <div className="glass-card rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          Trajectory
                        </span>
                        <h3 className="text-sm font-semibold text-white">
                          Event Impact Trajectory (Per Bed Group)
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Occupancy trajectory relative to the disruption event window.
                      </p>
                    </div>
                    <div className="p-5 space-y-6">
                      {(['acute', 'rehab', 'day'] as const).map((group) => {
                        const traj = result.trajectory![group]
                        if (!traj) return null
                        const months = result.trajectory!.months_relative_to_event
                        const maxOcc = Math.max(...traj.scenario_occupancy, ...traj.baseline_occupancy, 1)
                        const chartMax = Math.max(maxOcc * 1.15, 1.1)
                        const groupLabel = group === 'acute' ? 'Acute' : group === 'rehab' ? 'Rehabilitation' : 'Day Hospital'

                        return (
                          <div key={group} className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-300 font-semibold">{groupLabel}</span>
                              <div className="flex gap-3 text-[10px]">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-0.5 bg-slate-500 inline-block rounded" /> Baseline
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-0.5 bg-violet-400 inline-block rounded" /> Scenario
                                </span>
                              </div>
                            </div>
                            <div className="overflow-x-auto pb-2">
                              <div className="flex items-end gap-1 min-w-[600px] h-28 px-2">
                                {months.map((m, idx) => {
                                  const baseH = Math.round((traj.baseline_occupancy[idx] / chartMax) * 100)
                                  const scenH = Math.round((traj.scenario_occupancy[idx] / chartMax) * 100)
                                  const isOver = traj.scenario_occupancy[idx] > 1.0
                                  return (
                                    <div key={m} className="flex-1 flex flex-col items-center justify-end h-full relative group min-w-[20px]">
                                      <div className="flex gap-px w-full justify-center" style={{ height: `${Math.max(baseH, scenH)}%` }}>
                                        <div
                                          className="w-1/3 max-w-[8px] bg-slate-600/60 rounded-t transition-all"
                                          style={{ height: `${baseH}%` }}
                                        />
                                        <div
                                          className={`w-1/3 max-w-[8px] rounded-t transition-all ${
                                            isOver ? 'bg-rose-400' : 'bg-violet-400'
                                          }`}
                                          style={{ height: `${scenH}%` }}
                                        />
                                      </div>
                                      <span className="text-[8px] font-mono text-slate-600 mt-0.5 truncate">
                                        {m === 0 ? 'E' : m > 0 ? `+${m}` : m}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            {traj.deepest_dip_gap !== 0 && (
                              <p className="text-[10px] text-slate-500">
                                Deepest impact: <span className="text-rose-400 font-mono font-semibold">{(traj.deepest_dip_gap * 100).toFixed(1)}%</span> at month offset <span className="font-mono">{traj.deepest_dip_month_offset >= 0 ? `+${traj.deepest_dip_month_offset}` : traj.deepest_dip_month_offset}</span>
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Post-result actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleResetToBaseline}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-white/5 text-slate-400 border border-white/8 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to Status Quo
                  </button>
                  <button
                    onClick={() => setRunStatus('idle')}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adjust & Re-run
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
