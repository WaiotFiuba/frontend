import React, { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Pause, Square, Plus, Trash2, RefreshCw, Activity } from 'lucide-react'
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
  started_at: string | null
  finished_at: string | null
  zone_overrides: SimulationZoneState[]
}

interface ZoneDemandRead {
  neighborhood: string
  commune: string | null
}

const getMinTickSeconds = (): number => {
  const envVal = import.meta.env.VITE_MIN_TICK_SECONDS
  if (envVal !== undefined && envVal !== '') {
    const parsed = Number(envVal)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  return 16
}

const MIN_TICK_SECONDS = getMinTickSeconds()

interface SimulationControlProps {
  onSimulationStateChange?: () => void
}

export default function SimulationControl({ onSimulationStateChange }: SimulationControlProps) {
  const [activeSim, setActiveSim] = useState<SimulationRead | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [neighborhoods, setNeighborhoods] = useState<string[]>([])

  // Form states for NEW simulation
  const [speedup, setSpeedup] = useState<number | string>(1)
  const [globalDemandMultiplier, setGlobalDemandMultiplier] = useState<number | string>(1.0)
  const [transitionMinutes, setTransitionMinutes] = useState<number | string>(30)
  const [isGlobal, setIsGlobal] = useState<boolean>(true)
  const [zoneOverrides, setZoneOverrides] = useState<ZoneOverride[]>([])

  // Real elapsed stopwatch state
  const [realElapsedMs, setRealElapsedMs] = useState<number>(0)
  const isFirstRenderRef = useRef(true)

  // Form states for LIVE controls

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
        if (onSimulationStateChange) {
          if (!prev ||
            prev.simulated_time !== data.simulated_time ||
            prev.measurements_sent !== data.measurements_sent ||
            prev.status !== data.status) {
            onSimulationStateChange()
          }
        }
        return data
      })
    } catch (err: any) {
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

  useEffect(() => {
    if (activeSim) {
      setSpeedup(activeSim.speedup)
      setGlobalDemandMultiplier(activeSim.global_demand_current)
      setTransitionMinutes(activeSim.transition_minutes)
      if (activeSim.zone_overrides) {
        setZoneOverrides(
          activeSim.zone_overrides.map((zo) => ({
            neighborhood: zo.neighborhood,
            multiplier: zo.multiplier_current,
          }))
        )
      }
    }
  }, [activeSim])

  useEffect(() => {
    if (!activeSim || ['completed', 'failed'].includes(activeSim.status)) return

    const frequencyMinutes = activeSim.scenario?.frequency_minutes ?? 60
    const calculatedInterval = (frequencyMinutes / activeSim.speedup) * 1000
    const pollInterval = Math.max(1000, Math.min(calculatedInterval, 8000))

    const intervalId = setInterval(() => {
      fetchActiveSimulation()
    }, pollInterval)

    return () => clearInterval(intervalId)
  }, [activeSim?.status, activeSim?.speedup, activeSim?.scenario?.frequency_minutes])

  useEffect(() => {
    if (!activeSim) {
      setRealElapsedMs(0)
      return
    }

    const accumKey = `sim_accum_${activeSim.id}`
    const resumeKey = `sim_last_resume_${activeSim.id}`

    let accum = Number(localStorage.getItem(accumKey)) || 0
    let lastResumeStr = localStorage.getItem(resumeKey)
    let lastResume = lastResumeStr ? Number(lastResumeStr) : null

    const isFirst = isFirstRenderRef.current
    isFirstRenderRef.current = false

    if (activeSim.status === 'running') {
      if (!lastResume) {
        lastResume = Date.now()
        localStorage.setItem(resumeKey, String(lastResume))
      }
    } else {
      if (lastResume) {
        if (!isFirst) {
          accum += Date.now() - lastResume
          localStorage.setItem(accumKey, String(accum))
        }
        localStorage.removeItem(resumeKey)
        lastResume = null
      }
    }

    const updateDisplay = () => {
      if (activeSim.status === 'running' && lastResume) {
        setRealElapsedMs(accum + (Date.now() - lastResume))
      } else {
        setRealElapsedMs(accum)
      }
    }

    updateDisplay()

    let intervalId: any = null
    if (activeSim.status === 'running') {
      intervalId = setInterval(updateDisplay, 1000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [activeSim?.id, activeSim?.status])

  const formatElapsed = (ms: number): string => {
    if (ms <= 0) return '00:00'
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const pad = (val: number) => String(val).padStart(2, '0')
    return `${pad(minutes)}:${pad(seconds)}`
  }

  const handleStartSimulation = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        speedup: speedup === '' ? 1 : Math.max(1, parseInt(String(speedup)) || 1),
        global_demand_multiplier: globalDemandMultiplier === '' ? 1.0 : Math.max(0.1, parseFloat(String(globalDemandMultiplier)) || 0.1),
        transition_minutes: transitionMinutes === '' ? 30 : Math.max(0, parseInt(String(transitionMinutes)) || 0),
        scenario: {},
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

  // Zone overrides management
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

  if (loading) {
    return (
      <Card className="border-slate-200/80 shadow-sm bg-white rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px]">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-slate-500 font-semibold text-sm">Loading simulator status...</p>
      </Card>
    )
  }

  const isGlobalInvalid = isGlobal &&
    speedup !== '' &&
    transitionMinutes !== '' &&
    (Number(transitionMinutes) / Number(speedup)) < MIN_TICK_SECONDS;

  const maxSpeedupForCurrentTransition = transitionMinutes !== '' ? Math.floor(Number(transitionMinutes) / MIN_TICK_SECONDS) : 0;
  const minTransitionForCurrentSpeedup = speedup !== '' ? Math.ceil(Number(speedup) * MIN_TICK_SECONDS) : 0;

  const secondsPerTick = (speedup !== '' && Number(speedup) > 0 && transitionMinutes !== '')
    ? (Number(transitionMinutes) / Number(speedup))
    : 0;

  return (
    <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden rounded-2xl relative">
      {activeSim && ['pending', 'stopping'].includes(activeSim.status) && (
        <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px] flex flex-col items-center justify-center z-30 animate-in fade-in duration-200">
          <div className="bg-white/95 border border-slate-200/80 shadow-2xl rounded-2xl p-6 flex flex-col items-center gap-3 max-w-sm mx-4 transform animate-in zoom-in-95 duration-200">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-slate-800 font-bold text-sm text-center">
              {activeSim.status === 'pending' ? 'Generando simulación...' : 'Deteniendo simulación...'}
            </p>
            <p className="text-slate-500 text-xs text-center leading-relaxed">
              {activeSim.status === 'pending'
                ? 'El backend está cargando la topología de contenedores y preparando el flujo de telemetría.'
                : 'Finalizando el proceso del simulador y deteniendo la transmisión de datos.'}
            </p>
          </div>
        </div>
      )}
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


        {activeSim && (
          // Active simulation panel
          <div className="space-y-6 mb-6">
            {/* Monitor stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
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
                <p className="text-sm font-bold text-indigo-700 mt-1.5 truncate" title={activeSim.simulated_time || ''}>
                  {activeSim.simulated_time
                    ? new Date(activeSim.simulated_time).toLocaleTimeString()
                    : 'Not started'}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Real Elapsed Time</p>
                <p className="text-sm font-bold text-indigo-700 mt-1.5 truncate">
                  {formatElapsed(realElapsedMs)}
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
                    className="!bg-emerald-600 hover:!bg-emerald-700 !text-white gap-2 h-9 px-3 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Play
                  </Button>
                )}
                <Button
                  onClick={() => handleStatusAction('stop')}
                  disabled={actionLoading || activeSim.status === 'stopping'}
                  className="!bg-red-600 hover:!bg-red-700 !text-white gap-2 h-9 px-3 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Parameters Form (Visible always, but disabled if simulation is active) */}
        <div className="relative group">
          {activeSim && (
            <div className="absolute inset-0 bg-slate-600/10 rounded-2xl flex items-center justify-center z-10 cursor-not-allowed backdrop-blur-[0.5px]">
              <div className="bg-slate-900/95 backdrop-blur text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Debe detener la simulación para editar parámetros
              </div>
            </div>
          )}
          <form onSubmit={handleStartSimulation} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Speed (Speedup) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={speedup}
                  onChange={(e) => setSpeedup(e.target.value)}
                  disabled={!!activeSim}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold disabled:bg-slate-600/10 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-400">Ex: 1 = 1 simulated min per real sec (60x speedup).</p>
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
                  disabled={!!activeSim}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold disabled:bg-slate-600/10 disabled:text-slate-400 disabled:cursor-not-allowed"
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
                  disabled={!!activeSim}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold disabled:bg-slate-600/10 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-400">Default: 30 min.</p>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isGlobal"
                  checked={isGlobal}
                  onChange={(e) => setIsGlobal(e.target.checked)}
                  disabled={!!activeSim}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                />
                <div className="space-y-0.5 select-none">
                  <label htmlFor="isGlobal" className="text-xs font-bold text-slate-700 uppercase cursor-pointer">
                    Simulación Global
                  </label>
                  <p className="text-[10px] text-slate-400">Simular todos los contenedores de la base de datos (28k+).</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-2.5 leading-relaxed">
              💡 Dada la configuración actual, las actualizaciones reales de telemetría serán cada <strong className="text-indigo-600">{secondsPerTick.toFixed(1)} segundos</strong> con una demanda global de <strong className="text-indigo-600">{globalDemandMultiplier || 1.0}x</strong>
              {zoneOverrides.length > 0 && (
                <> salvo en los barrios de <span className="text-slate-700 font-semibold">{zoneOverrides.map(zo => `${zo.neighborhood} (${zo.multiplier}x)`).join(', ')}</span></>
              )}
              .
            </p>

            {isGlobalInvalid && (
              <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-800 p-3.5 rounded-r-lg shadow-sm text-xs mt-2 animate-in fade-in duration-200">
                <p className="font-semibold">Intervalo de actualización no válido para simulación global</p>
                <p className="text-amber-700 mt-0.5">
                  Para simular a nivel global (28k+ contenedores), la espera por tick debe ser de al menos {MIN_TICK_SECONDS} segundos para evitar sobrecargar el sistema.
                  El intervalo actual es de <strong>{(Number(transitionMinutes) / Number(speedup)).toFixed(1)}s</strong>.
                </p>
                <div className="mt-2 pt-2 border-t border-amber-200/60 space-y-1 text-amber-700">
                  {maxSpeedupForCurrentTransition >= 1 ? (
                    <p>• Si desea mantener los minutos de transición actual, configure el <strong>Speedup máximo en {maxSpeedupForCurrentTransition}</strong>.</p>
                  ) : (
                    <p>• Los minutos de transición actuales ({transitionMinutes} min) son demasiado bajos para un Speedup válido. Aumente la transición a al menos {MIN_TICK_SECONDS} min.</p>
                  )}
                  <p>• Si desea mantener el Speedup actual, configure los <strong>Minutos de Transición mínimo en {minTransitionForCurrentSpeedup} min</strong>.</p>
                  <p>• O desmarque <strong>"Simulación Global"</strong> para permitir cualquier velocidad.</p>
                </div>
              </div>
            )}

            {/* Zone Overrides */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Specific neighborhood overrides</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addZoneOverride}
                  disabled={!!activeSim}
                  className="h-8 px-3 text-xs border-slate-200 font-semibold flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        disabled={!!activeSim}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold disabled:bg-slate-600/10 disabled:text-slate-400 disabled:cursor-not-allowed"
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
                        disabled={!!activeSim}
                        className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold disabled:bg-slate-600/10 disabled:text-slate-400 disabled:cursor-not-allowed"
                        placeholder="Multiplier"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeZoneOverride(index)}
                        disabled={!!activeSim}
                        className="h-9 w-9 text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={actionLoading || !!activeSim}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md px-5 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2 inline" />
                    Starting...
                  </>
                ) : (
                  'Start Simulation'
                )}
              </Button>
            </div>
          </form>
        </div>

        {success && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-500/25 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{success}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
