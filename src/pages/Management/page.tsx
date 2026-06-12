
import { api } from '@/lib/api'
import { useState, useEffect, useMemo } from 'react'
import { BackendContainer } from './components/types'
import ManagementStats from './components/ManagementStats'
import ContainersTable from './components/ContainersTable'
import AddContainerForm from './components/AddContainerForm'
import DeleteContainerForm from './components/DeleteContainerForm'
import SimulationControl from './components/SimulationControl'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function Management() {
  const [containers, setContainers] = useState<BackendContainer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [containerToRemove, setContainerToRemove] = useState<BackendContainer | null>(null)
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false)

  const loadContainers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<BackendContainer[]>(`/map/containers/?limit=1000&t=${Date.now()}`)
      setContainers(data)
    } catch (err: any) {
      console.error(err)
      setError(
        'Error connecting to the containers database. Please make sure the backend and database are running.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContainers()
  }, [])


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
              Container Management
            </h1>
            <p className="text-slate-500 text-sm md:text-base">
              Administration and control of containers and synthetic topology seeding.
            </p>
          </div>

        </div>

        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-r-xl shadow-sm text-sm flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error detected</p>
              <p className="text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-r-xl shadow-sm text-sm flex items-start gap-3 animate-fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Operation completed successfully</p>
              <p className="text-emerald-700">{successMsg}</p>
            </div>
          </div>
        )}

        <ManagementStats containers={containers} showOnlyAlerts={showOnlyAlerts} onToggleAlerts={setShowOnlyAlerts} />

        <SimulationControl onSimulationStateChange={loadContainers} />

        <ContainersTable containers={containers} loading={loading} showOnlyAlerts={showOnlyAlerts} onToggleAlerts={setShowOnlyAlerts} onRemoveContainer={setContainerToRemove} />

        <AddContainerForm containerTypes={containerTypes} onContainerCreated={loadContainers} onError={setError} onSuccess={setSuccessMsg} />
      </div>

      {containerToRemove && (
        <DeleteContainerForm container={containerToRemove} onClose={() => setContainerToRemove(null)} onConfirm={confirmRemoveLocalContainer} />
      )}
    </div>
  )
}
