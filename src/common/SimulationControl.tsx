import React, { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/common/ui/card'
import { Button } from '@/common/ui/button'
import { Play, Pause, Square, Plus, Trash2, RefreshCw, Activity } from 'lucide-react'
import { api } from '@/lib/api'

interface UpdateLog {
  id: number
  timestamp: string
  simulatedTime: string
  measurementsSent: number
  duration: number | null
}

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


const CABA_FALLBACK_NEIGHBORHOODS = [
  'Agronomia', 'Almagro', 'Balvanera', 'Barracas', 'Belgrano', 'Boedo',
  'Caballito', 'Chacarita', 'Coghlan', 'Colegiales', 'Constitucion', 'Flores',
  'Floresta', 'La Boca', 'Liniers', 'Mataderos', 'Monserrat', 'Monte Castro',
  'Nueva Pompeya', 'Nuñez', 'Palermo', 'Parque Avellaneda', 'Parque Chacabuco',
  'Parque Chas', 'Parque Patricios', 'Paternal', 'Puerto Madero', 'Recoleta',
  'Retiro', 'Saavedra', 'San Cristobal', 'San Nicolas', 'San Telmo',
  'Velez Sarsfield', 'Versalles', 'Villa Crespo', 'Villa Del Parque',
  'Villa Devoto', 'Villa Gral. Mitre', 'Villa Lugano', 'Villa Luro',
  'Villa Ortuzar', 'Villa Pueyrredon', 'Villa Real', 'Villa Riachuelo',
  'Villa Santa Rita', 'Villa Soldati', 'Villa Urquiza'
]

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
  const [frequencyMinutes, setFrequencyMinutes] = useState<number | string>(15)
  // const [periods, setPeriods] = useState<number | string>(96)
  const [containerLimit, setContainerLimit] = useState<number | string>(100000)
  // const [isGlobal, setIsGlobal] = useState<boolean>(true)
  const [zoneOverrides, setZoneOverrides] = useState<ZoneOverride[]>([])

  // const simulatedDurationHours = Number(periods || 0) * Number(frequencyMinutes || 0) / 60

  // Real elapsed stopwatch state
  const [realElapsedMs, setRealElapsedMs] = useState<number>(0)
  const isFirstRenderRef = useRef(true)

  // States for tracking intervals between new telemetry sets
  const [lastSetTime, setLastSetTime] = useState<number | null>(null)
  const [timeSinceLastSet, setTimeSinceLastSet] = useState<number>(0)
  const [updateLogs, setUpdateLogs] = useState<UpdateLog[]>([])

  const prevMeasurementsSentRef = useRef<number | null>(null)
  const prevSimStatusRef = useRef<string | null>(null)
  const prevSimIdRef = useRef<number | null>(null)

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

  const fetchNeighborhoods = async () => {
    try {
      const data = await api.get<ZoneDemandRead[]>('/digital-twin/demand/zones')
      if (data && Array.isArray(data) && data.length > 0) {
        setNeighborhoods(data.map((z) => z.neighborhood))
      } else {
        setNeighborhoods(CABA_FALLBACK_NEIGHBORHOODS)
      }
    } catch (err) {
      console.error('Error fetching neighborhoods, using fallback:', err)
      setNeighborhoods(CABA_FALLBACK_NEIGHBORHOODS)
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
    if (!activeSim || ['completed', 'failed', 'stopping', 'paused'].includes(activeSim.status)) return

    const frequencyMinutes = activeSim.scenario?.frequency_minutes ?? 60
    const calculatedInterval = (frequencyMinutes / activeSim.speedup) * 1000
    const pollInterval = activeSim.status === 'running'
      ? Math.max(1000, Math.min(calculatedInterval, 2000))
      : Math.max(1000, Math.min(calculatedInterval, 5000))

    const intervalId = setInterval(() => {
      fetchActiveSimulation()
    }, pollInterval)

    return () => clearInterval(intervalId)
  }, [activeSim?.status, activeSim?.speedup, activeSim?.scenario?.frequency_minutes])

  // Refs to track running time across pauses without localStorage or backend changes
  const accumRunningMsRef = useRef<number>(0)
  const lastResumeMsRef = useRef<number | null>(null)

  useEffect(() => {
    if (!activeSim || ['pending'].includes(activeSim.status)) {
      accumRunningMsRef.current = 0
      lastResumeMsRef.current = null
      setRealElapsedMs(0)
      return
    }

    if (['completed', 'stopping', 'failed'].includes(activeSim.status)) {
      if (lastResumeMsRef.current !== null) {
        accumRunningMsRef.current += Date.now() - lastResumeMsRef.current
        lastResumeMsRef.current = null
      }
      setRealElapsedMs(accumRunningMsRef.current)
      return
    }

    if (activeSim.status === 'running') {
      if (lastResumeMsRef.current === null) {
        lastResumeMsRef.current = Date.now()
      }
    } else if (activeSim.status === 'paused') {
      if (lastResumeMsRef.current !== null) {
        accumRunningMsRef.current += Date.now() - lastResumeMsRef.current
        lastResumeMsRef.current = null
      }
    }

    const updateDisplay = () => {
      if (activeSim.status === 'running' && lastResumeMsRef.current !== null) {
        setRealElapsedMs(accumRunningMsRef.current + (Date.now() - lastResumeMsRef.current))
      } else {
        setRealElapsedMs(accumRunningMsRef.current)
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

  // Track intervals between incoming telemetry sets
  useEffect(() => {
    if (!activeSim) {
      setLastSetTime(null)
      setTimeSinceLastSet(0)
      setUpdateLogs([])
      prevMeasurementsSentRef.current = null
      prevSimStatusRef.current = null
      prevSimIdRef.current = null
      return
    }

    const currentMeasurements = activeSim.measurements_sent
    const currentStatus = activeSim.status
    const currentId = activeSim.id

    // If starting a new simulation or transitioning to running status
    if (prevSimIdRef.current !== currentId || (prevSimStatusRef.current !== 'running' && currentStatus === 'running')) {
      setLastSetTime(null) // null: esperar el primer dato antes de empezar a contar
      setTimeSinceLastSet(0)
      setUpdateLogs([])
      prevMeasurementsSentRef.current = currentMeasurements
      prevSimStatusRef.current = currentStatus
      prevSimIdRef.current = currentId
      return
    }

    // If simulation is running and we receive a new set of measurements
    if (currentStatus === 'running' && prevMeasurementsSentRef.current !== null && currentMeasurements > prevMeasurementsSentRef.current) {
      const now = Date.now()

      if (lastSetTime === null) {
        // Primer set recibido: iniciar el timer desde acá, sin loguear
        setLastSetTime(now)
        setTimeSinceLastSet(0)
      } else {
        // Sets siguientes: calcular intervalo real y loguear
        const deltaSeconds = (now - lastSetTime) / 1000

        const newLog: UpdateLog = {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          simulatedTime: activeSim.simulated_time
            ? new Date(activeSim.simulated_time).toLocaleTimeString()
            : 'Not started',
          measurementsSent: currentMeasurements,
          duration: deltaSeconds
        }

        setUpdateLogs((prev) => [newLog, ...prev].slice(0, 10))
        setLastSetTime(now)
        setTimeSinceLastSet(0)
      }
    }

    prevMeasurementsSentRef.current = currentMeasurements
    prevSimStatusRef.current = currentStatus
    prevSimIdRef.current = currentId
  }, [activeSim?.measurements_sent, activeSim?.status, activeSim?.id, lastSetTime])

  // Live timer for seconds elapsed since the last telemetry set was received
  useEffect(() => {
    if (!activeSim || activeSim.status !== 'running' || lastSetTime === null) {
      setTimeSinceLastSet(0)
      return
    }

    const intervalId = setInterval(() => {
      setTimeSinceLastSet(Math.max(0, Math.floor((Date.now() - lastSetTime) / 1000)))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [activeSim?.status, lastSetTime])

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
        speedup: speedup === '' ? 1.0 : Math.max(1.0, parseFloat(String(speedup)) || 1.0),
        global_demand_multiplier: globalDemandMultiplier === '' ? 1.0 : Math.max(0.1, parseFloat(String(globalDemandMultiplier)) || 0.1),
        scenario: {
          frequency_minutes: frequencyMinutes === '' ? 15 : Math.max(1, parseInt(String(frequencyMinutes)) || 1),
          container_limit: containerLimit === '' ? 100000 : Math.max(1, parseInt(String(containerLimit)) || 1),
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
      if (action === 'stop') {
        accumRunningMsRef.current = 0
        lastResumeMsRef.current = null
        setRealElapsedMs(0)
        setActiveSim(null)
      }
      await api.post<SimulationRead>(`/digital-twin/simulations/active/${action}`)
      setSuccess(`Simulation ${action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : 'stopped'} successfully.`)
      setTimeout(() => setSuccess(null), 5000)
      if (action !== 'stop') {
        await fetchActiveSimulation(true)
      }
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
            {activeSim ? 'Monitor and adjust the active simulation in real-time.' : 'Configure and start the real-time synthetic telemetry stream.'}
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
                  <Button onClick={() => handleStatusAction('pause')} disabled={actionLoading} variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 gap-2 h-9 px-3 text-xs font-bold">
                    <Pause className="h-3.5 w-3.5" />
                    Pause
                  </Button>
                ) : (
                  <Button onClick={() => handleStatusAction('resume')} disabled={actionLoading || activeSim.status !== 'paused'} className="!bg-emerald-600 hover:!bg-emerald-700 !text-white gap-2 h-9 px-3 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                    <Play className="h-3.5 w-3.5" />
                    Play
                  </Button>
                )}
                <Button onClick={() => handleStatusAction('stop')} disabled={actionLoading || activeSim.status === 'stopping'} className="!bg-red-600 hover:!bg-red-700 !text-white gap-2 h-9 px-3 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </Button>
              </div>
            </div>
          </div>
        )}


        {activeSim && (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                Intervalo entre Sets de Telemetría
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-full">
                  Tiempo transcurrido: {timeSinceLastSet}s
                </span>
                {updateLogs.filter(log => log.duration !== null).length > 0 && (
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    Promedio: {(
                      updateLogs
                        .filter(log => log.duration !== null)
                        .reduce((acc, log) => acc + (log.duration || 0), 0) /
                      updateLogs.filter(log => log.duration !== null).length
                    ).toFixed(1)}s
                  </span>
                )}
              </div>
            </div>

            {updateLogs.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 bg-white">
                Esperando el primer set de telemetría de la simulación activa...
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Historial de actualizaciones
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {updateLogs.map((log, idx) => (
                    <div key={log.id} className="flex items-center justify-between bg-white border border-slate-100 px-3 py-2.5 rounded-xl shadow-sm hover:border-slate-200/80 transition-colors animate-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 rounded-md w-6 h-6 flex items-center justify-center shrink-0">
                          {updateLogs.length - idx}
                        </span>
                        <div>
                          <p className="font-bold text-slate-700 text-xs">Set de Mediciones</p>
                          <p className="text-[10px] text-slate-400 font-medium">Total acumulado: {log.measurementsSent}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-700 text-xs">Recibido: {log.timestamp}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Simulado: {log.simulatedTime}</p>
                      </div>
                      <div className="bg-indigo-50/70 border border-indigo-100/60 rounded-lg px-2.5 py-1 text-center shrink-0 min-w-[70px] ml-2">
                        <span className="font-extrabold text-indigo-700 text-xs block leading-tight">
                          {log.duration !== null ? `+${log.duration.toFixed(1)}s` : 'Inicio'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                <input type="number" step="any" min="1.0" required value={speedup} onChange={(e) => setSpeedup(e.target.value)} disabled={!!activeSim} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold disabled:bg-slate-600/10 disabled:text-slate-400 disabled:cursor-not-allowed" />
                <p className="text-[10px] text-slate-400">Ex: 1 = 1 simulated min per real sec (60x speedup).</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Global Demand *</label>
                <input type="number" step="0.1" min="0.1" max="10" required value={globalDemandMultiplier} onChange={(e) => setGlobalDemandMultiplier(e.target.value)} disabled={!!activeSim} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold disabled:bg-slate-600/10 disabled:text-slate-400 disabled:cursor-not-allowed" />
                <p className="text-[10px] text-slate-400">General fill multiplier.</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Frequency *</label>
                <input type="number" min="1" required value={frequencyMinutes} onChange={(e) => setFrequencyMinutes(e.target.value)} disabled={!!activeSim} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold disabled:bg-slate-600/10 disabled:text-slate-400 disabled:cursor-not-allowed" />
                <p className="text-[10px] text-slate-400">Timestamp distance between telemetry ticks.</p>
              </div>

            </div>

            {/* Zone Overrides */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Specific neighborhood overrides</span>
                <Button type="button" variant="outline" size="sm" onClick={addZoneOverride} disabled={!!activeSim} className="h-8 px-3 text-xs border-slate-200 font-semibold flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
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
                      <select value={zo.neighborhood} onChange={(e) => updateZoneOverride(index, 'neighborhood', e.target.value)} disabled={!!activeSim} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold disabled:bg-slate-600/10 disabled:text-slate-400 disabled:cursor-not-allowed">
                        {neighborhoods.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <input type="number" step="0.1" min="0.1" max="10" required value={zo.multiplier} onChange={(e) => updateZoneOverride(index, 'multiplier', e.target.value)} disabled={!!activeSim} className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold disabled:bg-slate-600/10 disabled:text-slate-400 disabled:cursor-not-allowed" placeholder="Multiplier" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeZoneOverride(index)} disabled={!!activeSim} className="h-9 w-9 text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Trash2 className="h-4.5 w-4.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={actionLoading || !!activeSim} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md px-5 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
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

        {
          success && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-500/25 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{success}</span>
            </div>
          )
        }
      </CardContent >
    </Card >
  )
}
