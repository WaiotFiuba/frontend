import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { Database, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react'

import { BackendContainer } from './components/types'
import GestionStats from './components/GestionStats'
import ContainersTable from './components/ContainersTable'
// import ContainerTypesCard from './components/ContainerTypesCard'
import AddContainerForm from './components/AddContainerForm'
import DeleteContainerForm from './components/DeleteContainerForm'

export default function Gestion() {
  const [containers, setContainers] = useState<BackendContainer[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // States for generation parameters
  const [forceRegen, setForceRegen] = useState(false)

  // Confirmation state for local deletion
  const [containerToRemove, setContainerToRemove] = useState<BackendContainer | null>(null)

  // Filtering state shared with stats cards
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false)

  const loadContainers = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch up to 1000 containers for representation in the management console
      const data = await api.get<BackendContainer[]>('/map/containers/?limit=1000')
      setContainers(data)
    } catch (err: any) {
      console.error(err)
      setError(
        'Error al conectar con la base de datos de contenedores. Asegúrese de que el backend y la base de datos estén corriendo.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // loadContainers()
    // No hacer el get por defecto hasta presionar el botón de generar o recargar manualmente
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    setSuccessMsg(null)
    try {
      await api.post(`/map/containers/generate?force=${forceRegen}`)
      setSuccessMsg(
        forceRegen
          ? 'Base de datos regenerada exitosamente con nuevos contenedores.'
          : 'Siembra de datos ejecutada. Se agregaron nuevos contenedores si faltaban.'
      )
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMsg(null), 5000)
      await loadContainers()
    } catch (err: any) {
      console.error(err)
      setError('Error al generar los contenedores: ' + (err.message || err))
    } finally {
      setGenerating(false)
    }
  }

  // Extract unique container types for the form dropdown
  const containerTypes = useMemo(() => {
    const uniqueTypes: Record<number, { id: number; name: string }> = {}
    containers.forEach((c) => {
      if (c.container_type && c.container_type.id) {
        uniqueTypes[c.container_type.id] = {
          id: c.container_type.id,
          name: c.container_type.name,
        }
      }
    })
    return Object.values(uniqueTypes)
  }, [containers])

  const confirmRemoveLocalContainer = () => {
    if (containerToRemove) {
      setContainers((prev) => prev.filter((c) => c.id !== containerToRemove.id))
      setContainerToRemove(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
              Gestión de Contenedores
            </h1>
            <p className="text-slate-500 text-sm md:text-base">
              Administración y control de contenedores y siembra de topología sintética.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer bg-slate-100/80 px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors">
              <input type="checkbox" checked={forceRegen} onChange={(e) => setForceRegen(e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500" />
              Limpiar antes de sembrar
            </label>

            <Button onClick={handleGenerate} disabled={generating} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md px-5 py-5 rounded-lg transition-all transform hover:scale-[1.02] flex items-center gap-2">
              {generating ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  Sembrando Datos...
                </>
              ) : (
                <>
                  <Database className="h-4.5 w-4.5" />
                  Generar Contenedores
                </>
              )}
            </Button>

            <Button variant="outline" onClick={loadContainers} disabled={loading} className="border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold px-4 py-5 rounded-lg transition-all">
              <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-r-xl shadow-sm text-sm flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error detectado</p>
              <p className="text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-r-xl shadow-sm text-sm flex items-start gap-3 animate-fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Operación completada con éxito</p>
              <p className="text-emerald-700">{successMsg}</p>
            </div>
          </div>
        )}

        <GestionStats containers={containers} showOnlyAlerts={showOnlyAlerts} onToggleAlerts={setShowOnlyAlerts} />

        <ContainersTable containers={containers} loading={loading} showOnlyAlerts={showOnlyAlerts} onToggleAlerts={setShowOnlyAlerts} onRemoveContainer={setContainerToRemove} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* <ContainerTypesCard containers={containers} /> */}

          <AddContainerForm containerTypes={containerTypes} onContainerCreated={loadContainers} onError={setError} onSuccess={setSuccessMsg} />
        </div>
      </div>

      {containerToRemove && (
        <DeleteContainerForm container={containerToRemove} onClose={() => setContainerToRemove(null)} onConfirm={confirmRemoveLocalContainer} />
      )}
    </div>
  )
}
