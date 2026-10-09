import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/common/ui/card'
import { Button } from '@/common/ui/button'
import {
  Settings,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Clock,
  Calendar,
  Truck,
  Layers,
  MapPin,
  FileCode,
  Check,
  Copy,
  FolderOpen,
  Edit3,
  Map,
  X,
  Eye,
  AlertCircle,
} from 'lucide-react'
import { api } from '@/lib/api'

export interface SavedConfigurationItem {
  id: number
  user_id: number
  name: string
  description: string | null
  config: Record<string, any>
  created_at: string
  updated_at: string
}

interface ZoneOverride {
  neighborhood: string
  multiplier: number | string
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

const DEFAULT_COLLECTION_HOURS = [21, 22, 23, 0, 1, 2, 3, 4, 5]
const DEFAULT_COLLECTION_DAYS = [0, 1, 2, 3, 4]

const WEEKDAYS = [
  { id: 0, label: 'Lunes', short: 'Lun' },
  { id: 1, label: 'Martes', short: 'Mar' },
  { id: 2, label: 'Miércoles', short: 'Mié' },
  { id: 3, label: 'Jueves', short: 'Jue' },
  { id: 4, label: 'Viernes', short: 'Vie' },
  { id: 5, label: 'Sábado', short: 'Sáb' },
  { id: 6, label: 'Domingo', short: 'Dom' },
]

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

export default function ConfigurationsPage() {
  const navigate = useNavigate()
  const [configs, setConfigs] = useState<SavedConfigurationItem[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [neighborhoods, setNeighborhoods] = useState<string[]>([])

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null)
  const [configName, setConfigName] = useState<string>('')
  const [configDescription, setConfigDescription] = useState<string>('')
  const [speedup, setSpeedup] = useState<number | string>(1000)
  const [startTime, setStartTime] = useState<string>(() => getNowRoundedHourArgentina(0))
  const [endTime, setEndTime] = useState<string>('')
  const [isEndUndefined, setIsEndUndefined] = useState<boolean>(true)
  const [collectionHours, setCollectionHours] = useState<number[]>(DEFAULT_COLLECTION_HOURS)
  const [collectionDays, setCollectionDays] = useState<number[]>(DEFAULT_COLLECTION_DAYS)
  const [globalDemandMultiplier, setGlobalDemandMultiplier] = useState<number | string>(1.0)
  const [zoneOverrides, setZoneOverrides] = useState<ZoneOverride[]>([])

  // JSON Mode / Preview State
  const [showJsonModal, setShowJsonModal] = useState<SavedConfigurationItem | null>(null)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const formatIsoTimestamp = (dtStr: string): string => {
    if (!dtStr) return dtStr
    return dtStr.length === 16 ? `${dtStr}:00` : dtStr
  }

  // Generate Current JSON object
  const buildCurrentConfigJson = () => {
    return {
      speedup: speedup === '' ? 1000.0 : Math.max(1.0, parseFloat(String(speedup)) || 1000.0),
      global_demand_multiplier:
        globalDemandMultiplier === '' ? 1.0 : Math.max(0.1, parseFloat(String(globalDemandMultiplier)) || 0.1),
      start_time: startTime ? formatIsoTimestamp(startTime) : undefined,
      scenario: {
        start: startTime ? formatIsoTimestamp(startTime) : undefined,
        end: !isEndUndefined && endTime ? formatIsoTimestamp(endTime) : null,
        frequency_minutes: 60,
        collection_hours: collectionHours,
        collection_days: collectionDays,
        no_collection_days: [0, 1, 2, 3, 4, 5, 6].filter((d) => !collectionDays.includes(d)),
      },
      zone_overrides: zoneOverrides.map((zo) => ({
        neighborhood: zo.neighborhood,
        multiplier: zo.multiplier === '' ? 1.0 : Math.max(0.1, parseFloat(String(zo.multiplier)) || 0.1),
      })),
    }
  }

  const fetchConfigs = async () => {
    setLoadingList(true)
    try {
      const data = await api.get<SavedConfigurationItem[]>('/digital-twin/configurations')
      setConfigs(data || [])
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setLoadingList(false)
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
    fetchConfigs()
    fetchNeighborhoods()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setConfigName('')
    setConfigDescription('')
    setSpeedup(1000)
    setStartTime(getNowRoundedHourArgentina(0))
    setEndTime('')
    setIsEndUndefined(true)
    setCollectionHours(DEFAULT_COLLECTION_HOURS)
    setCollectionDays(DEFAULT_COLLECTION_DAYS)
    setGlobalDemandMultiplier(1.0)
    setZoneOverrides([])
    setError(null)
    setSuccess(null)
  }

  const handleEditConfig = (item: SavedConfigurationItem) => {
    setEditingId(item.id)
    setConfigName(item.name)
    setConfigDescription(item.description || '')

    const c = item.config || {}
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

    window.scrollTo({ top: 0, behavior: 'smooth' })
    setSuccess(`Configuración "${item.name}" cargada en el editor.`)
    setTimeout(() => setSuccess(null), 4000)
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!configName.trim()) {
      setError('Por favor ingrese un nombre para la configuración.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    const payload = {
      name: configName.trim(),
      description: configDescription.trim() || null,
      config: buildCurrentConfigJson(),
    }

    try {
      if (editingId) {
        await api.put(`/digital-twin/configurations/${editingId}`, payload)
        setSuccess(`Configuración "${payload.name}" actualizada con éxito.`)
      } else {
        await api.post('/digital-twin/configurations', payload)
        setSuccess(`Configuración "${payload.name}" guardada con éxito.`)
      }
      setTimeout(() => setSuccess(null), 5000)
      await fetchConfigs()
      resetForm()
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : String(err)
      setError('Error al guardar configuración: ' + msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfig = async (id: number, name: string) => {
    if (!window.confirm(`¿Está seguro de eliminar la configuración "${name}"?`)) return
    try {
      await api.delete(`/digital-twin/configurations/${id}`)
      setSuccess(`Configuración "${name}" eliminada correctamente.`)
      setTimeout(() => setSuccess(null), 4000)
      if (editingId === id) resetForm()
      await fetchConfigs()
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : String(err)
      setError('Error al eliminar configuración: ' + msg)
    }
  }

  const handleUseInMap = (item: SavedConfigurationItem) => {
    sessionStorage.setItem('waiot_pending_load_config', JSON.stringify(item.config))
    sessionStorage.setItem('waiot_pending_load_config_name', item.name)
    navigate('/map')
  }

  const toggleCollectionHour = (hour: number) => {
    setCollectionHours((prev) =>
      prev.includes(hour) ? prev.filter((h) => h !== hour) : [...prev, hour].sort((a, b) => a - b)
    )
  }

  const setCollectionPreset = (preset: 'all' | 'night_reinforce' | 'night_only' | 'clear') => {
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
    setCollectionDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort((a, b) => a - b)
    )
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredConfigs = configs.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1700px] w-full mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
              <Settings className="h-9 w-9 text-indigo-600" />
              Configurations
            </h1>
            <p className="text-slate-600 mt-1">
              Cree, gestione y almacene configuraciones de simulación en formato JSON asociadas a su usuario.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/map')}
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center gap-2"
            >
              <Map className="h-4 w-4" />
              Ir al Mapa
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold px-4 py-2 rounded-xl shadow-sm"
            >
              Back to Home
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-r-xl shadow-sm text-sm flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">Error</p>
              <p className="text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-r-xl shadow-sm text-sm flex items-center gap-2 animate-in fade-in duration-200">
            <Check className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Operación Exitosa</p>
              <p className="text-emerald-700">{success}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* COLUMNA 1: Formulario de Creación / Edición */}
          <div className="xl:col-span-8 space-y-6">
            <Card className="border-slate-200/80 shadow-md bg-white rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-indigo-600" />
                    {editingId ? 'Editar Configuración' : 'Nueva Configuración de Simulación'}
                  </CardTitle>
                  <CardDescription className="text-slate-500 mt-1">
                    {editingId
                      ? 'Modifique los parámetros y guarde los cambios en la base de datos.'
                      : 'Configure los parámetros y almacénelos en formato JSON en su cuenta.'}
                  </CardDescription>
                </div>
                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                    className="text-xs text-rose-600 hover:bg-rose-50 font-semibold"
                  >
                    Cancelar Edición
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-6">
                <form onSubmit={handleSaveConfig} className="space-y-6">
                  {/* Datos Básicos */}
                  <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-4">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCode className="h-3.5 w-3.5 text-indigo-600" />
                      Identificación de la Configuración
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Nombre de la Configuración *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Semana Normal Noche, Fin de Semana Alto"
                          value={configName}
                          onChange={(e) => setConfigName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Descripción (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Recolección solo nocturna con refuerzo en Palermo"
                          value={configDescription}
                          onChange={(e) => setConfigDescription(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN: Tiempos y Velocidad */}
                  <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-4">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-indigo-600" />
                      Tiempos y Velocidad
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase">Aceleración *</label>
                        <input
                          type="number"
                          step="any"
                          min="1.0"
                          required
                          value={speedup}
                          onChange={(e) => setSpeedup(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                        />
                        <p className="text-[10px] text-slate-400">Multiplicador de velocidad (1000x).</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase">Frecuencia (minutos)</label>
                        <input
                          type="number"
                          value={60}
                          disabled={true}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 font-bold cursor-not-allowed"
                        />
                        <p className="text-[10px] text-slate-400">Frecuencia fija (1 tick = 1 hora).</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-500" /> Fecha Inicio *
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-500" /> Fecha Fin
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              if (isEndUndefined) {
                                setIsEndUndefined(false)
                                setEndTime(getNowRoundedHourArgentina(0))
                              } else {
                                setIsEndUndefined(true)
                                setEndTime('')
                              }
                            }}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                              isEndUndefined
                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            {isEndUndefined ? '✓ Sin definir' : 'Sin definir'}
                          </button>
                        </div>

                        {isEndUndefined ? (
                          <div
                            onClick={() => {
                              setIsEndUndefined(false)
                              setEndTime(getNowRoundedHourArgentina(0))
                            }}
                            className="w-full px-3 py-2 border border-dashed border-slate-200 rounded-lg text-xs flex items-center justify-between bg-slate-50 text-slate-400 font-medium cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/20"
                            title="Haga click para desbloquear e introducir fecha de fin"
                          >
                            <span>Sin definir</span>
                            <span className="text-[10px] text-indigo-600 font-semibold">Definir fecha</span>
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
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN: Franja Horaria de Recolección */}
                  <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-indigo-600" />
                          Franja Horaria y Días de Recolección (Truck Engine)
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCollectionPreset('night_reinforce')}
                          className="h-7 px-2 text-[10px] font-semibold"
                        >
                          Noche + Refuerzo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCollectionPreset('night_only')}
                          className="h-7 px-2 text-[10px] font-semibold"
                        >
                          Solo Noche
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCollectionPreset('all')}
                          className="h-7 px-2 text-[10px] font-semibold"
                        >
                          24 Horas
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCollectionPreset('clear')}
                          className="h-7 px-2 text-[10px] font-semibold text-rose-600"
                        >
                          Limpiar
                        </Button>
                      </div>
                    </div>

                    {/* 24 Hours Selector */}
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-2">
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                        const isSelected = collectionHours.includes(hour)
                        return (
                          <button
                            key={hour}
                            type="button"
                            onClick={() => toggleCollectionHour(hour)}
                            className={`py-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>{String(hour).padStart(2, '0')}:00</span>
                            <span className={`text-[9px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                              {hour >= 20 || hour < 6 ? 'Noche' : hour >= 11 && hour <= 16 ? 'Refuerzo' : 'Día'}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Weekdays Selector */}
                    <div className="grid grid-cols-7 gap-1.5 pt-2 border-t border-slate-200/70">
                      {WEEKDAYS.map((day) => {
                        const isSelected = collectionDays.includes(day.id)
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => toggleCollectionDay(day.id)}
                            className={`py-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span className="hidden sm:inline">{day.label}</span>
                            <span className="sm:hidden">{day.short}</span>
                            <span
                              className={`text-[9px] ${
                                isSelected ? 'text-indigo-200 font-semibold' : 'text-slate-400'
                              }`}
                            >
                              {isSelected ? 'Activo' : 'Sin recolección'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* SECCIÓN: Demanda Global y por Barrio */}
                  <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-4">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-indigo-600" />
                      Demanda Global y Multiplicadores por Barrio
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase">Demanda Global *</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="1100"
                          required
                          value={globalDemandMultiplier}
                          onChange={(e) => setGlobalDemandMultiplier(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                        />
                      </div>
                    </div>

                    {/* Zone Overrides */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-indigo-600" /> Sobrescrituras por Barrio
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addZoneOverride}
                          className="h-8 px-3 text-xs border-slate-200 font-semibold flex items-center gap-1.5 hover:bg-slate-50"
                        >
                          <Plus className="h-3.5 w-3.5 text-slate-500" />
                          Agregar Barrio
                        </Button>
                      </div>

                      {zoneOverrides.length === 0 ? (
                        <div className="p-3 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 bg-white">
                          Sin excepciones por barrio. Se aplicará la demanda global (
                          <strong>{globalDemandMultiplier}x</strong>).
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {zoneOverrides.map((zo, index) => (
                            <div
                              key={index}
                              className="flex gap-3 items-center bg-white p-2 border border-slate-200/80 rounded-xl shadow-xs"
                            >
                              <select
                                value={zo.neighborhood}
                                onChange={(e) => updateZoneOverride(index, 'neighborhood', e.target.value)}
                                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
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
                                  className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
                                  placeholder="Multiplicador"
                                />
                                <span className="text-xs font-bold text-slate-500">x</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeZoneOverride(index)}
                                className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setShowJsonModal({
                          id: 0,
                          user_id: 0,
                          name: configName || 'Nueva Configuración (Previsualización)',
                          description: configDescription,
                          config: buildCurrentConfigJson(),
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        })
                      }
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold gap-2"
                    >
                      <Eye className="h-4 w-4 text-slate-500" />
                      Ver JSON en Vivo
                    </Button>

                    <Button
                      type="submit"
                      disabled={saving}
                      className="!bg-indigo-600 hover:!bg-indigo-700 !text-white font-bold shadow-md px-6 py-2.5 rounded-xl transition-all text-sm gap-2"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin inline" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          {editingId ? 'Actualizar Configuración' : 'Guardar Configuración'}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* COLUMNA 2: Lista de Configuraciones Guardadas */}
          <div className="xl:col-span-4 space-y-4">
            <Card className="border-slate-200/80 shadow-md bg-white rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-indigo-600" />
                      Mis Configuraciones
                    </CardTitle>
                    <CardDescription className="text-slate-500 mt-1">
                      {configs.length} configuración{configs.length !== 1 ? 'es' : ''} guardada
                      {configs.length !== 1 ? 's' : ''} en su usuario.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fetchConfigs}
                    disabled={loadingList}
                    className="h-8 px-2.5 text-xs text-slate-600 gap-1.5"
                    title="Recargar lista"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>

                {configs.length > 0 && (
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Buscar por nombre o descripción..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                    />
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-6">
                {loadingList ? (
                  <div className="p-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                    <span className="text-xs font-semibold">Cargando configuraciones...</span>
                  </div>
                ) : configs.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center space-y-2 bg-slate-50/50">
                    <FolderOpen className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-600">No posee configuraciones guardadas</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Complete el formulario de la izquierda y presione "Guardar Configuración" para
                      almacenarla.
                    </p>
                  </div>
                ) : filteredConfigs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No se encontraron configuraciones que coincidan con "{searchTerm}".
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                    {filteredConfigs.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 border rounded-xl transition-all ${
                          editingId === item.id
                            ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500 shadow-sm'
                            : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                              {item.name}
                              {editingId === item.id && (
                                <span className="bg-indigo-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                                  En edición
                                </span>
                              )}
                            </h4>
                            {item.description && (
                              <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Summary Badges */}
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-600 font-medium">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                            Speedup: {item.config?.speedup ?? 1000}x
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                            Demanda: {item.config?.global_demand_multiplier ?? 1.0}x
                          </span>
                          {item.config?.scenario?.collection_hours && (
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-semibold">
                              {item.config.scenario.collection_hours.length} hs recolección
                            </span>
                          )}
                          {item.config?.zone_overrides?.length > 0 && (
                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-semibold">
                              {item.config.zone_overrides.length} barrios personalizados
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-1.5 mt-3 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowJsonModal(item)}
                              className="h-7 px-2 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 gap-1"
                              title="Inspeccionar JSON"
                            >
                              <FileCode className="h-3.5 w-3.5" />
                              Ver JSON
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditConfig(item)}
                              className="h-7 px-2 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 gap-1"
                              title="Cargar en editor para modificar"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleUseInMap(item)}
                              className="h-7 px-2.5 text-[11px] font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1 shadow-xs"
                              title="Cargar en el Mapa y simular"
                            >
                              <Map className="h-3.5 w-3.5" />
                              Usar en Mapa
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteConfig(item.id, item.name)}
                              className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="Eliminar configuración"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* MODAL / DIALOG: Visor de JSON Completo */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <FileCode className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{showJsonModal.name}</h3>
                  <p className="text-xs text-slate-500">Estructura JSON completa de la configuración</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowJsonModal(null)}
                className="h-8 w-8 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 bg-slate-950 text-slate-100 font-mono text-xs">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(showJsonModal.config, null, 2)}
              </pre>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {showJsonModal.id ? `ID #${showJsonModal.id}` : 'Previsualización'}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(showJsonModal.config, null, 2))}
                  className="gap-1.5 text-xs font-semibold"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar JSON
                    </>
                  )}
                </Button>
                {showJsonModal.id > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const item = showJsonModal
                      setShowJsonModal(null)
                      handleUseInMap(item)
                    }}
                    className="!bg-indigo-600 hover:!bg-indigo-700 !text-white text-xs font-bold gap-1.5"
                  >
                    <Map className="h-3.5 w-3.5" />
                    Cargar en Mapa
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowJsonModal(null)}
                  className="text-xs font-semibold"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
