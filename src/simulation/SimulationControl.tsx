import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/utils/ui/card'
import { Button } from '@/utils/ui/button'
import {
  Play,
  Pause,
  Square,
  Plus,
  Trash2,
  RefreshCw,
  Activity,
  Truck,
  Calendar,
  Layers,
  RotateCcw,
  Clock,
  MapPin,
  FolderOpen,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatSimulatedTime } from '@/utils/functions'

interface UpdateLog {
  id: number
  setNumber: number
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
  scenario: Record<string, unknown>
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

// Horarios de recolección por defecto: Solo Noche (21 a 05 hs)
const DEFAULT_COLLECTION_HOURS = [21, 22, 23, 0, 1, 2, 3, 4, 5]

// Días de recolección por defecto: Lunes a Viernes (0 a 4)
const DEFAULT_COLLECTION_DAYS = [0, 1, 2, 3, 4]

const WEEKDAYS = [
  { id: 0, key: 'mon', label: 'Lunes', short: 'Lun' },
  { id: 1, key: 'tue', label: 'Martes', short: 'Mar' },
  { id: 2, key: 'wed', label: 'Miércoles', short: 'Mié' },
  { id: 3, key: 'thu', label: 'Jueves', short: 'Jue' },
  { id: 4, key: 'fri', label: 'Viernes', short: 'Vie' },
  { id: 5, key: 'sat', label: 'Sábado', short: 'Sáb' },
  { id: 6, key: 'sun', label: 'Domingo', short: 'Dom' },
]

interface SimulationControlProps {
  onSimulationStateChange?: () => void
}

// Helper para obtener fecha y hora actual en Argentina redondeada a la hora en punto (ej: 12:00, 13:00)
const getNowRoundedHourArgentina = (offsetHours = 0): string => {
  const now = new Date()
  const date = new Date(now.getTime() + offsetHours * 3600 * 1000)
  date.setMinutes(0, 0, 0)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const p: Record<string, string> = {}
  parts.forEach(({ type, value }) => {
    p[type] = value
  })
  return `${p.year}-${p.month}-${p.day}T${p.hour}:00`
}

export default function SimulationControl({ onSimulationStateChange }: SimulationControlProps) {
  const { t } = useTranslation()
  const [activeSim, setActiveSim] = useState<SimulationRead | null>(null)
  const [loading, setLoading] = useState(true)
  // Consulta periódica en curso: si la API está lenta, no se le apilan pedidos.
  const pollInFlightRef = useRef(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [neighborhoods, setNeighborhoods] = useState<string[]>([])

  // 1. Velocidad & Frecuencia
  const [speedup, setSpeedup] = useState<number | string>(1000)
  const [frequencyMinutes] = useState<number>(60) // Fijo en 60 min (bloqueado)

  // 2. Fechas
  const [startTime, setStartTime] = useState<string>(() => getNowRoundedHourArgentina(0))
  const [endTime, setEndTime] = useState<string>('') // Por defecto sin fecha de fin
  const [isEndUndefined, setIsEndUndefined] = useState<boolean>(true) // Por defecto sin determinar

  // 3. Franja Horaria y Días de Recolección (usada por TruckFleetSimulator / TruckEngine)
  const [collectionHours, setCollectionHours] = useState<number[]>(DEFAULT_COLLECTION_HOURS)
  const [collectionDays, setCollectionDays] = useState<number[]>(DEFAULT_COLLECTION_DAYS)

  // 4. Demanda Global y por Barrios
  const [globalDemandMultiplier, setGlobalDemandMultiplier] = useState<number | string>(1.0)
  const [zoneOverrides, setZoneOverrides] = useState<ZoneOverride[]>([])

  // Desplegable de parámetros avanzados (por defecto desplegado mostrando todos los parámetros)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)

  // Stopwatch & Telemetry intervals
  const [realElapsedMs, setRealElapsedMs] = useState<number>(0)
  const [lastSetTime, setLastSetTime] = useState<number | null>(null)
  const [timeSinceLastSet, setTimeSinceLastSet] = useState<number>(0)
  const [updateLogs, setUpdateLogs] = useState<UpdateLog[]>([])

  const lastSetTimeRef = useRef<number | null>(null)
  const prevPeriodRef = useRef<number | null>(null)
  const prevMeasurementsSentRef = useRef<number | null>(null)
  const prevSimStatusRef = useRef<string | null>(null)
  const prevSimIdRef = useRef<number | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load Config Modal state
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [savedConfigs, setSavedConfigs] = useState<
    { id: number; name: string; description: string | null; config: Record<string, any> }[]
  >([])
  const [loadingConfigs, setLoadingConfigs] = useState(false)

  const applyConfig = (c: Record<string, any>, name: string) => {
    if (c.speedup !== undefined) setSpeedup(c.speedup)
    if (c.global_demand_multiplier !== undefined) setGlobalDemandMultiplier(c.global_demand_multiplier)
    if (Array.isArray(c.zone_overrides)) {
      setZoneOverrides(
        c.zone_overrides.map((zo: any) => ({
          neighborhood: zo.neighborhood,
          multiplier: zo.multiplier,
        }))
      )
    } else {
      setZoneOverrides([])
    }

    const sc = c.scenario || {}
    if (sc.start && typeof sc.start === 'string') {
      setStartTime(sc.start.slice(0, 16))
    }
    if (sc.end && typeof sc.end === 'string') {
      setEndTime(sc.end.slice(0, 16))
      setIsEndUndefined(false)
    } else {
      setEndTime('')
      setIsEndUndefined(true)
    }
    if (Array.isArray(sc.collection_hours)) {
      setCollectionHours(sc.collection_hours)
    }
    if (Array.isArray(sc.collection_days)) {
      setCollectionDays(sc.collection_days)
    }

    setSuccess(`Configuración "${name}" cargada con éxito.`)
    setTimeout(() => setSuccess(null), 5000)
    setShowLoadModal(false)
  }

  const handleOpenLoadModal = async () => {
    setShowLoadModal(true)
    setLoadingConfigs(true)
    try {
      const data = await api.get<
        { id: number; name: string; description: string | null; config: Record<string, any> }[]
      >('/digital-twin/configurations')
      setSavedConfigs(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingConfigs(false)
    }
  }

  const resetToDefaults = () => {
    setSpeedup(1000)
    setStartTime(getNowRoundedHourArgentina(0))
    setEndTime('')
    setIsEndUndefined(true)
    setCollectionHours(DEFAULT_COLLECTION_HOURS)
    setCollectionDays(DEFAULT_COLLECTION_DAYS)
    setGlobalDemandMultiplier(1.0)
    setZoneOverrides([])
    setIsCollapsed(false)
  }

  // Fetch active simulation
  const fetchActiveSimulation = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const data = await api.get<SimulationRead>('/digital-twin/simulations/active')
      setActiveSim((prev) => {
        if (prev && prev.status === 'pending' && data.status === 'paused') {
          setSuccess('¡Datos de simulación generados! Haga click en Iniciar/Play.')
          setTimeout(() => setSuccess(null), 5000)
        }
        if (onSimulationStateChange) {
          if (
            !prev ||
            prev.simulated_time !== data.simulated_time ||
            prev.measurements_sent !== data.measurements_sent ||
            prev.current_period !== data.current_period ||
            prev.status !== data.status
          ) {
            onSimulationStateChange()
          }
        }
        return data
      })
    } catch {
      setActiveSim((prev) => {
        if (prev && ['running', 'stopping', 'pending', 'paused'].includes(prev.status)) {
          setSuccess('La simulación ha finalizado correctamente.')
          setTimeout(() => setSuccess(null), 6000)
          if (onSimulationStateChange) onSimulationStateChange()
        }
        return null
      })
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
    } catch {
      setNeighborhoods(CABA_FALLBACK_NEIGHBORHOODS)
    }
  }

  useEffect(() => {
    fetchActiveSimulation(true)
    fetchNeighborhoods()

    const pendingJson = sessionStorage.getItem('waiot_pending_load_config')
    const pendingName = sessionStorage.getItem('waiot_pending_load_config_name') || 'Guardada'
    if (pendingJson) {
      try {
        const parsed = JSON.parse(pendingJson)
        applyConfig(parsed, pendingName)
      } catch (err) {
        console.error('Error al parsear config de sessionStorage', err)
      } finally {
        sessionStorage.removeItem('waiot_pending_load_config')
        sessionStorage.removeItem('waiot_pending_load_config_name')
      }
    }
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
      if (activeSim.scenario) {
        const sc = activeSim.scenario as Record<string, any>
        if (sc.start && typeof sc.start === 'string') {
          setStartTime(sc.start.slice(0, 16))
        }
        if (sc.end && typeof sc.end === 'string') {
          setEndTime(sc.end.slice(0, 16))
          setIsEndUndefined(false)
        } else {
          setEndTime('')
          setIsEndUndefined(true)
        }
        if (Array.isArray(sc.collection_hours)) {
          setCollectionHours(sc.collection_hours)
        }
      }
    }
  }, [activeSim])

  // Polling during active simulation
  useEffect(() => {
    if (!activeSim) return

    const isRunning = activeSim.status === 'running'
    const isStopping = activeSim.status === 'stopping'
    const isPending = activeSim.status === 'pending'

    if (!isRunning && !isStopping && !isPending) return

    const freqMin = Number(activeSim.scenario?.frequency_minutes ?? 60)
    const calculatedInterval = (freqMin / activeSim.speedup) * 1000
    const pollInterval = isRunning
      ? Math.max(1000, Math.min(calculatedInterval, 2000))
      : 2000

    const timer = setInterval(() => {
      if (pollInFlightRef.current) return
      pollInFlightRef.current = true
      void fetchActiveSimulation(false).finally(() => {
        pollInFlightRef.current = false
      })
    }, pollInterval)

    return () => clearInterval(timer)
  }, [activeSim?.status, activeSim?.speedup, activeSim?.scenario?.frequency_minutes])

  // Real stopwatch tracking
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

    let intervalId: ReturnType<typeof setInterval> | null = null
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
      lastSetTimeRef.current = null
      setLastSetTime(null)
      setTimeSinceLastSet(0)
      setUpdateLogs([])
      prevPeriodRef.current = null
      prevMeasurementsSentRef.current = null
      prevSimStatusRef.current = null
      prevSimIdRef.current = null
      return
    }

    const currentMeasurements = activeSim.measurements_sent
    const currentPeriod = activeSim.current_period
    const currentStatus = activeSim.status
    const currentId = activeSim.id

    if (prevSimIdRef.current !== currentId || (prevSimStatusRef.current !== 'running' && currentStatus === 'running')) {
      const now = Date.now()
      lastSetTimeRef.current = now
      setLastSetTime(now)
      setTimeSinceLastSet(0)
      setUpdateLogs([])
      prevPeriodRef.current = currentPeriod
      prevMeasurementsSentRef.current = currentMeasurements
      prevSimStatusRef.current = currentStatus
      prevSimIdRef.current = currentId
      return
    }

    if (
      currentStatus === 'running' &&
      prevPeriodRef.current !== null &&
      currentPeriod > prevPeriodRef.current
    ) {
      const now = Date.now()
      const deltaSeconds = lastSetTimeRef.current ? (now - lastSetTimeRef.current) / 1000 : 0
      lastSetTimeRef.current = now
      setLastSetTime(now)
      setTimeSinceLastSet(0)

      const newLog: UpdateLog = {
        id: Date.now(),
        setNumber: currentPeriod,
        timestamp: new Date().toLocaleTimeString(),
        simulatedTime: activeSim.simulated_time
          ? new Date(activeSim.simulated_time).toLocaleTimeString()
          : 'Not started',
        measurementsSent: currentMeasurements,
        duration: deltaSeconds > 0 ? deltaSeconds : null,
      }

      setUpdateLogs((prev) => [newLog, ...prev].slice(0, 10))
    }

    prevPeriodRef.current = currentPeriod
    prevMeasurementsSentRef.current = currentMeasurements
    prevSimStatusRef.current = currentStatus
    prevSimIdRef.current = currentId
  }, [activeSim?.current_period, activeSim?.status, activeSim?.id, activeSim?.measurements_sent])

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

  const toggleCollectionHour = (hour: number) => {
    if (!!activeSim) return
    setCollectionHours((prev) =>
      prev.includes(hour) ? prev.filter((h) => h !== hour) : [...prev, hour].sort((a, b) => a - b)
    )
  }

  const setCollectionPreset = (preset: 'all' | 'night_reinforce' | 'night_only' | 'clear') => {
    if (!!activeSim) return
    if (preset === 'all') {
      setCollectionHours(Array.from({ length: 24 }, (_, i) => i))
    } else if (preset === 'night_reinforce') {
      setCollectionHours([21, 22, 23, 0, 1, 2, 3, 4, 5, 11, 12, 13, 14, 15, 16])
    } else if (preset === 'night_only') {
      setCollectionHours([21, 22, 23, 0, 1, 2, 3, 4, 5])
    } else if (preset === 'clear') {
      setCollectionHours([])
    }
  }

  const toggleCollectionDay = (dayId: number) => {
    if (!!activeSim) return
    setCollectionDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort((a, b) => a - b)
    )
  }

  const formatIsoTimestamp = (dtStr: string): string => {
    if (!dtStr) return dtStr
    return dtStr.length === 16 ? `${dtStr}:00` : dtStr
  }

  const handleStartSimulation = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        speedup: speedup === '' ? 1000.0 : Math.max(1.0, parseFloat(String(speedup)) || 1000.0),
        global_demand_multiplier:
          globalDemandMultiplier === '' ? 1.0 : Math.max(0.1, parseFloat(String(globalDemandMultiplier)) || 0.1),
        start_time: startTime ? formatIsoTimestamp(startTime) : undefined,
        scenario: {
          start: startTime ? formatIsoTimestamp(startTime) : undefined,
          end: !isEndUndefined && endTime ? formatIsoTimestamp(endTime) : null,
          frequency_minutes: 60, // Fixed to 60 as requested
          collection_hours: collectionHours,
          collection_days: collectionDays,
          no_collection_days: [0, 1, 2, 3, 4, 5, 6].filter((d) => !collectionDays.includes(d)),
        },
        zone_overrides: zoneOverrides.map((zo) => ({
          neighborhood: zo.neighborhood,
          multiplier: zo.multiplier === '' ? 1.0 : Math.max(0.1, parseFloat(String(zo.multiplier)) || 0.1),
        })),
      }

      const sim = await api.post<SimulationRead>('/digital-twin/simulations', payload)
      setActiveSim(sim)
      setSuccess('Simulación configurada e iniciada con éxito. Generando datos sintéticos...')
      setTimeout(() => setSuccess(null), 5000)
      await fetchActiveSimulation(false)
      if (onSimulationStateChange) onSimulationStateChange()
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : String(err)
      setError('Error al iniciar simulación: ' + msg)
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
      const updated = await api.post<SimulationRead>(`/digital-twin/simulations/active/${action}`)
      if (action !== 'stop') {
        setActiveSim(updated)
      }
      setSuccess(
        `Simulación ${action === 'pause' ? 'pausada' : action === 'resume' ? 'reanudada' : 'detenida'} correctamente.`
      )
      setTimeout(() => setSuccess(null), 5000)
      if (action !== 'stop') {
        await fetchActiveSimulation(false)
      }
      if (onSimulationStateChange) onSimulationStateChange()
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Error al ejecutar acción ${action}: ` + msg)
    } finally {
      setActionLoading(false)
    }
  }

  const addZoneOverride = () => {
    if (neighborhoods.length === 0) return
    const unusedNeighborhood =
      neighborhoods.find((n) => !zoneOverrides.some((zo) => zo.neighborhood === n)) || neighborhoods[0]
    setZoneOverrides([...zoneOverrides, { neighborhood: unusedNeighborhood, multiplier: 1.0 }])
  }

  const removeZoneOverride = (index: number) => {
    setZoneOverrides(zoneOverrides.filter((_, i) => i !== index))
  }

  const updateZoneOverride = (index: number, field: keyof ZoneOverride, value: string | number) => {
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
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-2" />
        <p className="text-slate-500 font-semibold text-sm">Cargando estado del simulador...</p>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden rounded-2xl relative">
      {activeSim && ['pending', 'stopping'].includes(activeSim.status) && (
        <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px] flex flex-col items-center justify-center z-30 animate-in fade-in duration-200">
          <div className="bg-white/95 border border-slate-200/80 shadow-2xl rounded-2xl p-6 flex flex-col items-center gap-3 max-w-sm mx-4 transform animate-in zoom-in-95 duration-200">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
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

      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-bold text-slate-950 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            {t('simulation.control_title')}
          </CardTitle>
          <CardDescription className="text-slate-500 mt-1">
            {activeSim
              ? t('simulation.control_desc_active')
              : t('simulation.control_desc_idle')}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          {activeSim && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${activeSim.status === 'running'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : activeSim.status === 'paused'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : activeSim.status === 'pending'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
            >
              {activeSim.status === 'pending' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-spin mr-1" />
              )}
              {activeSim.status === 'running' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
              {activeSim.status === 'pending' ? t('simulation.generating') : activeSim.status.toUpperCase()}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer select-none shadow-2xs h-8"
            aria-expanded={!isCollapsed}
            title={isCollapsed ? t('simulation.more_params') : t('simulation.less_params')}
          >
            {isCollapsed ? (
              <>
                <span className="font-medium">{t('simulation.more_params')}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span className="font-medium">{t('simulation.less_params')}</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-3.5 rounded-r-lg shadow-sm text-xs mb-4">
            <p className="font-semibold">Error</p>
            <p className="text-rose-700">{error}</p>
          </div>
        )}

        {/* Live Simulation Monitor & Controls */}
        {activeSim && (
          <div className="space-y-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('simulation.simulation_id')}</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">#{activeSim.id}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('simulation.measurements_sent')}</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{activeSim.measurements_sent.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('simulation.periods_ticks')}</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {activeSim.current_period}
                  {activeSim.total_periods > 0 ? ` / ${activeSim.total_periods}` : ''}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('simulation.simulated_clock')}</p>
                <p className="text-sm font-bold text-blue-900 mt-1.5 truncate" title={activeSim.simulated_time || ''}>
                  {formatSimulatedTime(activeSim.simulated_time)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('simulation.real_elapsed')}</p>
                <p className="text-sm font-bold text-blue-900 mt-1.5 truncate">
                  {formatElapsed(realElapsedMs)}
                </p>
              </div>
            </div>

            {/* Quick Status Actions */}
            <div className="flex flex-wrap gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100 items-center justify-between">
              <span className="text-sm font-bold text-slate-700">{t('simulation.exec_controls')}</span>
              <div className="flex gap-2">
                {activeSim.status === 'running' ? (
                  <Button
                    onClick={() => handleStatusAction('pause')}
                    disabled={actionLoading}
                    variant="outline"
                    className="border-amber-200 text-amber-700 hover:bg-amber-50 gap-2 h-9 px-3 text-xs font-bold"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    {t('simulation.pause')}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleStatusAction('resume')}
                    disabled={actionLoading || activeSim.status !== 'paused'}
                    className="!bg-emerald-600 hover:!bg-emerald-700 !text-white gap-2 h-9 px-3 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {t('simulation.resume')}
                  </Button>
                )}
                <Button
                  onClick={() => handleStatusAction('stop')}
                  disabled={actionLoading || activeSim.status === 'stopping'}
                  className="!bg-red-600 hover:!bg-red-700 !text-white gap-2 h-9 px-3 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Square className="h-3.5 w-3.5" />
                  {t('simulation.stop')}
                </Button>
              </div>
            </div>

            {/* Telemetry Interval Log */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  {t('simulation.telemetry_interval')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-full">
                    {t('simulation.time_elapsed_label', { time: timeSinceLastSet })}
                  </span>
                  {updateLogs.filter((log) => log.duration !== null).length > 0 && (
                    <span className="text-[11px] font-bold text-emerald-950 bg-emerald-200 border border-emerald-300 px-2 py-0.5 rounded-full">
                      {t('simulation.avg_label', {
                        avg: (
                          updateLogs
                            .filter((log) => log.duration !== null)
                            .reduce((acc, log) => acc + (log.duration || 0), 0) /
                          updateLogs.filter((log) => log.duration !== null).length
                        ).toFixed(1),
                      })}
                    </span>
                  )}
                </div>
              </div>

              {updateLogs.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 bg-white">
                  {t('simulation.telemetry_waiting')}
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t('simulation.update_history')}
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {updateLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between bg-white border border-slate-100 px-3 py-2 rounded-xl shadow-sm hover:border-slate-200/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 rounded-md w-6 h-6 flex items-center justify-center shrink-0">
                            {log.setNumber}
                          </span>
                          <div>
                            <p className="font-bold text-slate-700 text-xs">Set #{log.setNumber}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Acumulado: {log.measurementsSent.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-700 text-xs">Recibido: {log.timestamp}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Simulado: {log.simulatedTime}</p>
                        </div>
                        <div className="bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1 text-center shrink-0 min-w-[70px] ml-2">
                          <span className="font-extrabold text-blue-900 text-xs block leading-tight">
                            {log.duration !== null ? `+${log.duration.toFixed(1)}s` : 'Inicio'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Configuration Form */}
        <div className="relative group">
          {activeSim && (
            <div className="absolute inset-0 bg-slate-600/10 rounded-2xl flex items-center justify-center z-10 cursor-not-allowed backdrop-blur-[0.5px]">
              <div className="bg-slate-900/95 backdrop-blur text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                {t('simulation.must_stop_to_edit')}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5">
            <span className="text-sm font-bold text-slate-800">
              {t('simulation.scenario_params')}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenLoadModal}
                disabled={!!activeSim}
                className="text-xs bg-blue-100 border-blue-200 text-blue-950 hover:bg-blue-200 flex items-center gap-1.5 h-8 px-2.5 font-bold shadow-xs cursor-pointer"
                title={t('simulation.load_saved_configs_hint')}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                {t('simulation.load_saved_configs')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetToDefaults}
                disabled={!!activeSim}
                className="text-xs text-slate-500 hover:text-blue-700 flex items-center gap-1 h-8 px-2 cursor-pointer"
                title={t('simulation.reset_defaults_hint')}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('simulation.reset_defaults')}
              </Button>
            </div>
          </div>

          <form onSubmit={handleStartSimulation} className="space-y-6">
            {/* SECCIÓN 1: Tiempos, Velocidad y Frecuencia */}
            <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                {t('simulation.times_speed')}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">{t('simulation.speedup')}</label>
                  <input
                    type="number"
                    step="any"
                    min="1.0"
                    required
                    value={speedup}
                    onChange={(e) => setSpeedup(e.target.value)}
                    disabled={!!activeSim}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 font-semibold disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400">{t('simulation.speedup_hint')}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">{t('simulation.frequency')}</label>
                  <input
                    type="number"
                    value={frequencyMinutes}
                    disabled={true}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 font-bold cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400">{t('simulation.frequency_hint')}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-500" /> {t('simulation.start_date')}
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={!!activeSim}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 font-semibold disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400">{t('simulation.start_date_hint')}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-500" /> {t('simulation.end_date')}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!!activeSim) return
                        if (isEndUndefined) {
                          setIsEndUndefined(false)
                          setEndTime(getNowRoundedHourArgentina(0))
                        } else {
                          setIsEndUndefined(true)
                          setEndTime('')
                        }
                      }}
                      disabled={!!activeSim}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${isEndUndefined
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isEndUndefined ? `✓ ${t('simulation.undefined')}` : t('simulation.undefined')}
                    </button>
                  </div>

                  {isEndUndefined ? (
                    <div
                      onClick={() => {
                        if (!activeSim) {
                          setIsEndUndefined(false)
                          setEndTime(getNowRoundedHourArgentina(0))
                        }
                      }}
                      className={`w-full px-3 py-2 border border-dashed border-slate-200 rounded-lg text-xs flex items-center justify-between bg-slate-50 text-slate-400 font-medium ${!activeSim ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50/20' : 'cursor-not-allowed'
                        }`}
                      title="Haga click para desbloquear e introducir fecha de fin"
                    >
                      <span>{t('simulation.undefined')}</span>
                      <span className="text-[10px] text-blue-700 font-semibold">{t('simulation.define_date')}</span>
                    </div>
                  ) : (
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value)
                        if (!e.target.value) {
                          setIsEndUndefined(true)
                        }
                      }}
                      disabled={!!activeSim}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 font-semibold disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  )}
                  <p className="text-[10px] text-slate-400">
                    {isEndUndefined
                      ? t('simulation.no_end_date_hint')
                      : t('simulation.end_date_limit_hint')}
                  </p>
                </div>
              </div>
            </div>

            {/* Opciones Avanzadas Desplegables (Franja de camiones y Demanda por barrio) */}
            {!isCollapsed && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* SECCIÓN 2: Franja Horaria de Recolección */}
                <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-blue-600" />
                        {t('simulation.truck_hours')}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {t('simulation.truck_hours_desc')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-sky-950 bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-md">
                        {t('simulation.hours_selected', { count: collectionHours.length })}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCollectionPreset('night_reinforce')}
                          disabled={!!activeSim}
                          className="h-7 px-2 text-[10px] font-semibold cursor-pointer"
                        >
                          {t('simulation.preset_night_boost')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCollectionPreset('night_only')}
                          disabled={!!activeSim}
                          className="h-7 px-2 text-[10px] font-semibold cursor-pointer"
                        >
                          {t('simulation.preset_night_only')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCollectionPreset('all')}
                          disabled={!!activeSim}
                          className="h-7 px-2 text-[10px] font-semibold cursor-pointer"
                        >
                          {t('simulation.preset_24h')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCollectionPreset('clear')}
                          disabled={!!activeSim}
                          className="h-7 px-2 text-[10px] font-semibold text-rose-600 cursor-pointer"
                        >
                          {t('simulation.preset_clear')}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Selector interactivo de 24 horas */}
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-2">
                    {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                      const isSelected = collectionHours.includes(hour)
                      return (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => toggleCollectionHour(hour)}
                          disabled={!!activeSim}
                          className={`cursor-pointer py-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 ${isSelected
                            ? 'bg-sky-600 text-white border-sky-600 hover:bg-sky-700 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          <span>{String(hour).padStart(2, '0')}:00</span>
                          <span className={`text-[9px] ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                            {hour >= 20 || hour < 6 ? t('simulation.night') : hour >= 11 && hour <= 16 ? t('simulation.reinforcement') : t('simulation.day')}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Selector interactivo de Días de la Semana (directamente debajo de las horas) */}
                  <div className="grid grid-cols-7 gap-1.5 pt-2 border-t border-slate-200/70">
                    {WEEKDAYS.map((day) => {
                      const isSelected = collectionDays.includes(day.id)
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleCollectionDay(day.id)}
                          disabled={!!activeSim}
                          className={`cursor-pointer py-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 ${isSelected
                            ? 'bg-sky-600 text-white border-sky-600 hover:bg-sky-700 shadow-sm'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          <span className="hidden sm:inline">{t(`simulation.weekdays.${day.key}`)}</span>
                          <span className="sm:hidden">{day.short}</span>
                          <span className={`text-[9px] ${isSelected ? 'text-sky-100 font-semibold' : 'text-slate-400'}`}>
                            {isSelected ? t('simulation.active') : t('simulation.no_collection')}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* SECCIÓN 3: Demanda Global y Ajustes Específicos por Barrio */}
                <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-4">


                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Demanda Global */}
                    <div className="w-full md:w-80 lg:w-96 shrink-0 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 min-h-[42px]">
                        <div>
                          <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                            <Layers className="h-3 w-3 text-blue-600" /> {t('simulation.global_demand')}
                          </label>
                          <p className="text-[10px] text-slate-400">
                            {t('simulation.global_demand_hint')}
                          </p>
                        </div>
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="1100"
                          required
                          value={globalDemandMultiplier}
                          onChange={(e) => setGlobalDemandMultiplier(e.target.value)}
                          disabled={!!activeSim}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 font-semibold disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Ajustes por Barrio */}
                    <div className="flex-1 w-full space-y-3 min-w-0">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 min-h-[42px]">
                        <div>
                          <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-emerald-600" /> {t('simulation.neighborhood_overrides')}
                          </span>
                          <p className="text-[10px] text-slate-400">
                            {t('simulation.neighborhood_overrides_hint')}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addZoneOverride}
                          disabled={!!activeSim}
                          className="h-8 px-3 text-xs border-slate-200 font-semibold flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5 text-slate-500" />
                          {t('simulation.add_neighborhood')}
                        </Button>
                      </div>

                      {zoneOverrides.length === 0 ? (
                        <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 bg-white">
                          {t('simulation.no_overrides')}
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {zoneOverrides.map((zo, index) => (
                            <div key={index} className="flex gap-3 items-center bg-white p-2 border border-slate-200/80 rounded-xl shadow-xs">
                              <select
                                value={zo.neighborhood}
                                onChange={(e) => updateZoneOverride(index, 'neighborhood', e.target.value)}
                                disabled={!!activeSim}
                                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 font-semibold disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                {neighborhoods.map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  max="1100"
                                  required
                                  value={zo.multiplier}
                                  onChange={(e) => updateZoneOverride(index, 'multiplier', e.target.value)}
                                  disabled={!!activeSim}
                                  className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 font-semibold disabled:bg-slate-100 disabled:text-slate-400"
                                  placeholder="Multiplicador"
                                />
                                <span className="text-xs font-bold text-slate-500">x</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeZoneOverride(index)}
                                disabled={!!activeSim}
                                className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end">
              <Button
                type="submit"
                disabled={actionLoading || !!activeSim}
                className="!bg-emerald-600 hover:!bg-emerald-700 !text-white font-bold shadow-md px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2 inline" />
                    {t('simulation.starting_sim')}
                  </>
                ) : (
                  t('simulation.start_sim')
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

      {/* MODAL: Load Configuration */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <FolderOpen className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Carga de Configuraciones</h3>
                  <p className="text-xs text-slate-500">Seleccione una configuración guardada para cargar en los campos</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowLoadModal(false)}
                className="h-8 w-8 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
                <span className="font-bold shrink-0">Tip:</span>
                <span>
                  Aquí solo se listan los nombres de sus configuraciones. Si desea inspeccionar el contenido completo o crear nuevas variantes, visite la pestaña <strong>Configurations</strong> en la barra superior.
                </span>
              </div>

              {loadingConfigs ? (
                <div className="p-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-xs font-semibold">Buscando configuraciones guardadas...</span>
                </div>
              ) : savedConfigs.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center space-y-2 bg-slate-50/50">
                  <FolderOpen className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-600">No posee configuraciones guardadas</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Puede crear y guardar configuraciones con nombre desde la pestaña <strong>Configurations</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedConfigs.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => applyConfig(item.config, item.name)}
                      className="p-3.5 border border-slate-200/80 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer flex items-center justify-between group shadow-xs"
                    >
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-800 transition-colors">
                          {item.name}
                        </h4>
                        {item.description && (
                          <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="!bg-blue-200 group-hover:!bg-blue-300 !text-blue-950 border border-blue-300/80 text-xs font-bold px-3 h-8 shadow-xs shrink-0 cursor-pointer"
                      >
                        Cargar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLoadModal(false)}
                className="text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
