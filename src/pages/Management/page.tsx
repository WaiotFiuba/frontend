import { useState, useMemo } from 'react'
import { BackendContainer, ContainerStats } from './components/types'
import ManagementStats from './components/ManagementStats'
import ContainersTable from './components/ContainersTable'
import AddContainerForm from './components/AddContainerForm'
import DeleteContainerForm from './components/DeleteContainerForm'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

interface ManagementProps {
  containers: BackendContainer[]
  loading: boolean
  error: string | null
  loadContainers: () => Promise<void>
  setContainers: React.Dispatch<React.SetStateAction<BackendContainer[]>>
}

export default function Management({
  containers,
  loading,
  error: parentError,
  loadContainers,
  setContainers,
}: ManagementProps) {
  const [localError, setLocalError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [containerToRemove, setContainerToRemove] = useState<BackendContainer | null>(null)
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false)

  const error = parentError || localError

  // Stats computadas localmente desde los containers que llegan del ContainersHub
  const stats: ContainerStats = useMemo(() => {
    const total = containers.length
    const available = containers.filter((c) => c.available).length
    const alert_level = containers.filter((c) => c.current_level >= 80).length
    const avg_fill =
      total > 0
        ? Math.round(containers.reduce((acc, c) => acc + c.current_level, 0) / total)
        : 0
    return { total, available, alert_level, avg_fill }
  }, [containers])

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

        <ManagementStats stats={stats} showOnlyAlerts={showOnlyAlerts} onToggleAlerts={setShowOnlyAlerts} />

        <ContainersTable
          containers={containers}
          loading={loading}
          showOnlyAlerts={showOnlyAlerts}
          onToggleAlerts={setShowOnlyAlerts}
          onRemoveContainer={setContainerToRemove}
        />

        <AddContainerForm
          containerTypes={containerTypes}
          onContainerCreated={loadContainers}
          onError={setLocalError}
          onSuccess={setSuccessMsg}
        />
      </div>

      {containerToRemove && (
        <DeleteContainerForm
          container={containerToRemove}
          onClose={() => setContainerToRemove(null)}
          onConfirm={confirmRemoveLocalContainer}
        />
      )}
    </div>
  )
}
