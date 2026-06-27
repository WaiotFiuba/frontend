import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Pause, Square, Plus, Trash2, Settings, RefreshCw, Activity } from 'lucide-react'
import { api } from '@/lib/api'

interface ZoneOverride {
  neighborhood: string
  multiplier: number | string
}

interface SimulationZoneState {
  neighborhood: string
  multiplier_current: number
  multiplier_target: number
}

interface SimulationRead {
  id: number
  status: 'pending' | 'running' | 'paused' | 'stopping' | 'completed' | 'failed'
  scenario: Record<string, any>
  speedup: number
  global_demand_current: number
  global_demand_target: number
  transition_minutes: number
  simulated_time: string | null
  current_period: number
  total_periods: number
  measurements_sent: number
  collections_generated: number
  alarms_generated: number
  error_message: string | null
  zone_overrides: SimulationZoneState[]
}

interface ZoneDemandRead {
  neighborhood: string
  commune: string | null
}

interface SimulationControlProps {
  onSimulationStateChange?: () => void
}

export default function SimulationControl({ onSimulationStateChange }: SimulationControlProps) {
  const [activeSim, setActiveSim] = useState<SimulationRead | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [neighborhoods, setNeighborhoods] = useState<string[]>([])

  // Form states for NEW simulation
  const [speedup, setSpeedup] = useState<number | string>(60)
  const [globalDemandMultiplier, setGlobalDemandMultiplier] = useState<number | string>(1.0)
  const [transitionMinutes, setTransitionMinutes] = useState<number | string>(60)
  const [frequencyMinutes, setFrequencyMinutes] = useState<number | string>(15)
  const [periods, setPeriods] = useState<number | string>(96)
  const [containerLimit, setContainerLimit] = useState<number | string>(1000)
  const [readingJitterMinutes, setReadingJitterMinutes] = useState<number | string>(0)
  const [zoneOverrides, setZoneOverrides] = useState<ZoneOverride[]>([])

  // Form states for LIVE controls
  const [liveSpeedup, setLiveSpeedup] = useState<number | string>(1)
  const [liveGlobalMultiplier, setLiveGlobalMultiplier] = useState<number | string>(1.0)
  const [liveTransitionMinutes, setLiveTransitionMinutes] = useState<number | string>(60)
  const [liveZoneOverrides, setLiveZoneOverrides] = useState<ZoneOverride[]>([])

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const simulatedDurationHours = Number(periods || 0) * Number(frequencyMinutes || 0) / 60

  // Fetch active simulation
  const fetchActiveSimulation = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const data = await api.get<SimulationRead>('/digital-twin/simulations/active')
      setActiveSim((prev) => {
        if (prev && prev.status === 'pending' && data.status === 'paused') {
          setSuccess('Simulation data generated successfully! Click Play to start.')
          setTimeout(() => setSuccess(null), 5000)
        }
        return data
      })
      // Populate live control values
      setLiveSpeedup(data.speedup)
      setLiveGlobalMultiplier(data.global_demand_target)
      setLiveTransitionMinutes(data.transition_minutes)
      setLiveZoneOverrides(
        data.zone_overrides.map((zo) => ({
          neighborhood: zo.neighborhood,
          multiplier: zo.multiplier_target,
        }))
      )
    } catch (err: any) {
      // 404 or other errors means no active simulation
      setActiveSim(null)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // Fetch neighborhoods for dropdowns
  const fetchNeighborhoods = async () => {
    try {
      const data = await api.get<ZoneDemandRead[]>('/digital-twin/demand/zones')
      if (data && Array.isArray(data)) {
        setNeighborhoods(data.map((z) => z.neighborhood))
      }
    } catch (err) {
      console.error('Error fetching neighborhoods:', err)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchActiveSimulation(), fetchNeighborhoods()])
      setLoading(false)
    }
    init()
  }, [])

  // Poll active simulation status if running/pending
  useEffect(() => {
    if (!activeSim || ['completed', 'failed'].includes(activeSim.status)) return

    // Calculate poll rate based on simulation speed (but keep it between 2s and 10s)
    const frequencyMinutes = activeSim.scenario?.frequency_minutes ?? 60
    const calculatedInterval = ((frequencyMinutes * 60) / activeSim.speedup) * 1000
    const pollInterval = Math.max(2000, Math.min(calculatedInterval, 8000))

    const intervalId = setInterval(() => {
      fetchActiveSimulation()
      if (onSimulationStateChange) {
        onSimulationStateChange()
      }
    }, pollInterval)

    return () => clearInterval(intervalId)
  }, [activeSim?.status, activeSim?.speedup, activeSim?.scenario?.frequency_minutes])

  const handleStartSimulation = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        speedup: speedup === '' ? 60 : Math.max(1, parseInt(String(speedup)) || 1),
        global_demand_multiplier: globalDemandMultiplier === '' ? 1.0 : Math.max(0.1, parseFloat(String(globalDemandMultiplier)) || 0.1),
        transition_minutes: transitionMinutes === '' ? 60 : Math.max(0, parseInt(String(transitionMinutes)) || 0),
        scenario: {
          container_limit: containerLimit === '' ? 1000 : Math.max(1, parseInt(String(containerLimit)) || 1),
          frequency_minutes: frequencyMinutes === '' ? 15 : Math.max(1, parseInt(String(frequencyMinutes)) || 1),
          periods: periods === '' ? 96 : Math.max(1, parseInt(String(periods)) || 1),
          reading_jitter_minutes: readingJitterMinutes === '' ? 0 : Math.max(0, parseInt(String(readingJitterMinutes)) || 0),
        },
        zone_overrides: zoneOverrides.map(zo => ({
          neighborhood: zo.neighborhood,
          multiplier: zo.multiplier === '' ? 1.0 : Math.max(0.1, parseFloat(String(zo.multiplier)) || 0.1)
        })),
      }

      await api.post<SimulationRead>('/digital-twin/simulations', payload)
      setSuccess('Simulation created successfully. Generating synthetic data...')
      setTimeout(() => setSuccess(null), 5000)
      await fetchActiveSimulation(true)
      if (onSimulationStateChange) onSimulationStateChange()
    } catch (err: any) {
      console.error(err)
      setError('Error starting simulation: ' + (err.message || String(err)))
    } finally {
      setActionLoading(false)
    }
  }


  const handleStatusAction = async (action: 'pause' | 'resume' | 'stop') => {
    setActionLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await api.post<SimulationRead>(`/digital-twin/simulations/active/${action}`)
      setSuccess(`Simulation ${action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : 'stopped'} successfully.`)
      setTimeout(() => setSuccess(null), 5000)
      await fetchActiveSimulation(true)
      if (onSimulationStateChange) onSimulationStateChange()
    } catch (err: any) {
      console.error(err)
      setError(`Error executing action ${action}: ` + (err.message || String(err)))
    } finally {
      setActionLoading(false)
    }
  }

  // Zone overrides management (new simulation)
  const addZoneOverride = () => {
    if (neighborhoods.length === 0) return
    const unusedNeighborhood = neighborhoods.find(
      (n) => !zoneOverrides.some((zo) => zo.neighborhood === n)
    ) || neighborhoods[0]
    setZoneOverrides([...zoneOverrides, { neighborhood: unusedNeighborhood, multiplier: 1.0 }])
  }

  const removeZoneOverride = (index: number) => {
    setZoneOverrides(zoneOverrides.filter((_, i) => i !== index))
  }

  const updateZoneOverride = (index: number, field: keyof ZoneOverride, value: any) => {
    const updated = [...zoneOverrides]
    updated[index] = {
      ...updated[index],
      [field]: field === 'multiplier' ? (value === '' ? '' : value) : value,
    }
    setZoneOverrides(updated)
  }

  // Live zone overrides management
  const addLiveZoneOverride = () => {
    if (neighborhoods.length === 0) return
    const unusedNeighborhood = neighborhoods.find(
      (n) => !liveZoneOverrides.some((zo) => zo.neighborhood === n)
    ) || neighborhoods[0]
    setLiveZoneOverrides([...liveZoneOverrides, { neighborhood: unusedNeighborhood, multiplier: 1.0 }])
  }

  const removeLiveZoneOverride = (index: number) => {
    setLiveZoneOverrides(liveZoneOverrides.filter((_, i) => i !== index))
  }

  const updateLiveZoneOverride = (index: number, field: keyof ZoneOverride, value: any) => {
    const updated = [...liveZoneOverrides]
    updated[index] = {
      ...updated[index],
      [field]: field === 'multiplier' ? (value === '' ? '' : value) : value,
    }
    setLiveZoneOverrides(updated)
  }

  const submitLiveControls = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await api.patch<SimulationRead>('/digital-twin/simulations/active/controls', {
        speedup: liveSpeedup === '' ? 1 : Math.max(1, parseInt(String(liveSpeedup)) || 1),
        global_demand_multiplier: liveGlobalMultiplier === '' ? 1.0 : Math.max(0.1, parseFloat(String(liveGlobalMultiplier)) || 0.1),
        transition_minutes: liveTransitionMinutes === '' ? 30 : Math.max(0, parseInt(String(liveTransitionMinutes)) || 0),
        zone_overrides: liveZoneOverrides.map(zo => ({
          neighborhood: zo.neighborhood,
          multiplier: zo.multiplier === '' ? 1.0 : Math.max(0.1, parseFloat(String(zo.multiplier)) || 0.1)
        })),
      })

      setSuccess('Controls updated successfully.')
      setTimeout(() => setSuccess(null), 5000)
      await fetchActiveSimulation(true)
      if (onSimulationStateChange) onSimulationStateChange()
    } catch (err: any) {
      console.error(err)
      setError('Error updating controls: ' + (err.message || String(err)))
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-slate-200/80 shadow-sm bg-white rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px]">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-slate-500 font-semibold text-sm">Loading simulator status...</p>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden rounded-2xl">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-bold text-slate-950 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Digital Twin Control
          </CardTitle>
          <CardDescription className="text-slate-500 mt-1">
            {activeSim
              ? 'Monitor and adjust the active simulation in real-time.'
              : 'Configure and start the real-time synthetic telemetry stream.'}
          </CardDescription>
        </div>
        {activeSim && (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${activeSim.status === 'running'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : activeSim.status === 'paused'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : activeSim.status === 'pending'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
              {activeSim.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-spin mr-1" />}
              {activeSim.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              {activeSim.status === 'pending' ? 'GENERATING' : activeSim.status.toUpperCase()}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6">
        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-3.5 rounded-r-lg shadow-sm text-xs mb-4">
            <p className="font-semibold">Error</p>
            <p className="text-rose-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-3.5 rounded-r-lg shadow-sm text-xs mb-4">
            <p className="font-semibold">Success</p>
            <p className="text-emerald-700">{success}</p>
          </div>
        )}

        {activeSim ? (
          // Active simulation panel
          <div className="space-y-6">
            {/* Monitor stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Simulation ID</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">#{activeSim.id}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Measurements Sent</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{activeSim.measurements_sent}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Periods</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {activeSim.current_period}/{activeSim.total_periods}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Simulated Clock</p>
                <p className="text-xs font-bold text-indigo-700 mt-1.5 truncate" title={activeSim.simulated_time || ''}>
                  {activeSim.simulated_time
                    ? new Date(activeSim.simulated_time).toLocaleDateString() + ' ' + new Date(activeSim.simulated_time).toLocaleTimeString()
                    : 'Not started'}
                </p>
              </div>
            </div>

            {/* Quick Status Actions */}
            <div className="flex flex-wrap gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100 items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Execution Controls:</span>
              <div className="flex gap-2">
                {activeSim.status === 'running' ? (
                  <Button
                    onClick={() => handleStatusAction('pause')}
                    disabled={actionLoading}
                    variant="outline"
                    className="border-amber-200 text-amber-700 hover:bg-amber-50 gap-2 h-9 px-3 text-xs font-bold"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleStatusAction('resume')}
                    disabled={actionLoading || activeSim.status !== 'paused'}
                    variant="outline"
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2 h-9 px-3 text-xs font-bold"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Play
                  </Button>
                )}
                <Button
                  onClick={() => handleStatusAction('stop')}
                  disabled={actionLoading || activeSim.status === 'pending'}
                  variant="destructive"
                  className="bg-rose-600 hover:bg-rose-700 text-white gap-2 h-9 px-3 text-xs font-bold"
                >
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </Button>
              </div>
            </div>

            {/* Live Controls Form */}
            <form onSubmit={submitLiveControls} className="space-y-4 pt-2 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Settings className="h-4 w-4 text-slate-500" />
                Update Live Parameters
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Speed (Speedup)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={liveSpeedup}
                    onChange={(e) => setLiveSpeedup(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                  />
                  <p className="text-[10px] text-slate-400">Ex: 60 = 1 simulated min per real sec</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Demand Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    required
                    value={liveGlobalMultiplier}
                    onChange={(e) => setLiveGlobalMultiplier(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                  />
                  <p className="text-[10px] text-slate-400">General generation factor</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Transition Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="10080"
                    required
                    value={liveTransitionMinutes}
                    onChange={(e) => setLiveTransitionMinutes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                  />
                  <p className="text-[10px] text-slate-400">Simulated minutes to interpolate</p>
                </div>
              </div>

              {/* Live Zone Overrides */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Multipliers by Neighborhood</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLiveZoneOverride}
                    className="h-7 px-2 text-[10px] border-slate-200 font-bold flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Neighborhood
                  </Button>
                </div>

                {liveZoneOverrides.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No specific neighborhood overrides.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {liveZoneOverrides.map((zo, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <select
                          value={zo.neighborhood}
                          onChange={(e) => updateLiveZoneOverride(index, 'neighborhood', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                        >
                          {neighborhoods.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="10"
                          required
                          value={zo.multiplier}
                          onChange={(e) => updateLiveZoneOverride(index, 'multiplier', e.target.value)}
                          className="w-24 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLiveZoneOverride(index)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md px-5 py-2.5 rounded-lg transition-all"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2 inline" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          // Create new simulation form
          <form onSubmit={handleStartSimulation} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Speed (Speedup) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={speedup}
                  onChange={(e) => setSpeedup(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                />
                <p className="text-[10px] text-slate-400">Ex: 1 = real time. 60 = 60x.</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Initial Global Demand *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  required
                  value={globalDemandMultiplier}
                  onChange={(e) => setGlobalDemandMultiplier(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                />
                <p className="text-[10px] text-slate-400">General fill multiplier.</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Transition Minutes *</label>
                <input
                  type="number"
                  min="0"
                  max="10080"
                  required
                  value={transitionMinutes}
                  onChange={(e) => setTransitionMinutes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                />
                <p className="text-[10px] text-slate-400">Default: 60 simulated min.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Minutes per Period *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={frequencyMinutes}
                  onChange={(e) => setFrequencyMinutes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                />
                <p className="text-[10px] text-slate-400">Timestamp distance between telemetry ticks.</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Periods *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={periods}
                  onChange={(e) => setPeriods(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                />
                <p className="text-[10px] text-slate-400">{simulatedDurationHours.toLocaleString()} simulated hours total.</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Container Limit *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={containerLimit}
                  onChange={(e) => setContainerLimit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                />
                <p className="text-[10px] text-slate-400">Maximum containers updated per tick.</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Reading Jitter Minutes *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={readingJitterMinutes}
                  onChange={(e) => setReadingJitterMinutes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                />
                <p className="text-[10px] text-slate-400">Use 0 to align every reading with the displayed clock.</p>
              </div>
            </div>

            {/* Zone Overrides */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Specific neighborhood overrides</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addZoneOverride}
                  className="h-8 px-3 text-xs border-slate-200 font-semibold flex items-center gap-1.5 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5 text-slate-500" />
                  Add Neighborhood
                </Button>
              </div>

              {zoneOverrides.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 bg-slate-50/50">
                  No specific overrides. The simulation will apply the global demand to all neighborhoods.
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {zoneOverrides.map((zo, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <select
                        value={zo.neighborhood}
                        onChange={(e) => updateZoneOverride(index, 'neighborhood', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                      >
                        {neighborhoods.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        required
                        value={zo.multiplier}
                        onChange={(e) => updateZoneOverride(index, 'multiplier', e.target.value)}
                        className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                        placeholder="Multiplier"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeZoneOverride(index)}
                        className="h-9 w-9 text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={actionLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md px-5 py-2.5 rounded-lg transition-all"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2 inline" />
                    Generating...
                  </>
                ) : (
                  'Generate Simulation'
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
