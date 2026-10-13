import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/utils/ui/button'
import { ContainerStats } from './components/types'
import ManagementStats from './components/ManagementStats'
import ContainersTable from './components/ContainersTable'
// import AddContainerForm from './components/AddContainerForm'
import DeleteContainerForm from './components/DeleteContainerForm'
import { BackendContainer } from './components/types'
// import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Database, Map } from 'lucide-react'
import { api } from '@/lib/api'

export default function Management() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  // const [localError, setLocalError] = useState<string | null>(null)
  // const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [containerToRemove, setContainerToRemove] = useState<BackendContainer | null>(null)

  // Stats fetched from /map/containers/stats
  const [stats, setStats] = useState<ContainerStats | null>(null)

  const [tableRefreshTrigger, setTableRefreshTrigger] = useState(0)

  // const [containerTypes, setContainerTypes] = useState<Array<{ id: number; name: string }>>([])

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.get<ContainerStats>('/map/containers/stats')
      setStats(data)
    } catch (err: unknown) {
      console.error('Error fetching stats:', err)
    }
  }, [])

  /*
  const fetchContainerTypes = useCallback(async () => {
    try {
      const data = await api.get<Array<{ id: number; name: string }>>('/map/containers/types')
      setContainerTypes(data)
    } catch (err: unknown) {
      console.error('Error fetching container types:', err)
    }
  }, [])
  */

  useEffect(() => {
    fetchStats()
    // fetchContainerTypes()
  }, [fetchStats])

  /*
  const handleContainerCreated = () => {
    fetchStats()
    setTableRefreshTrigger((prev) => prev + 1)
  }
  */

  const handleConfirmRemove = async () => {
    if (!containerToRemove) return
    setContainerToRemove(null)
    fetchStats()
    setTableRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-emerald-50/30 p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-sky-600 shrink-0" />
            <div className="space-y-0.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {t('management.title')}
              </h1>
              <p className="text-slate-500 text-sm md:text-base">
                {t('management.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/map')}
              className="border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold px-4 py-2 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Map className="h-4 w-4 text-sky-600" />
              {t('management.go_to_map')}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold px-4 py-2 rounded-xl shadow-xs cursor-pointer"
            >
              {t('common.back_to_home')}
            </Button>
          </div>
        </div>


        {/* 
        {localError && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-r-xl shadow-sm text-sm flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error detected</p>
              <p className="text-rose-700">{localError}</p>
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
        */}

        <ManagementStats stats={stats} showOnlyAlerts={false} onToggleAlerts={() => { }} />

        <ContainersTable
          onRemoveContainer={setContainerToRemove}
          refreshTrigger={tableRefreshTrigger}
        />

        {/* 
        <AddContainerForm
          containerTypes={containerTypes}
          onContainerCreated={handleContainerCreated}
          onError={setLocalError}
          onSuccess={setSuccessMsg}
        /> 
        */}
      </div>

      {containerToRemove && (
        <DeleteContainerForm
          container={containerToRemove}
          onClose={() => setContainerToRemove(null)}
          onConfirm={handleConfirmRemove}
        />
      )}
    </div>
  )
}
