
import { api } from '@/lib/api'
import { useState, useEffect, useRef, useCallback } from 'react'
import { BackendContainer, ContainerStats, PaginatedContainers } from './components/types'
import ManagementStats from './components/ManagementStats'
import ContainersTable from './components/ContainersTable'
import AddContainerForm from './components/AddContainerForm'
import DeleteContainerForm from './components/DeleteContainerForm'
import SimulationControl from './components/SimulationControl'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

const PAGE_SIZE = 10

export default function Management() {
  const [containers, setContainers] = useState<BackendContainer[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<ContainerStats | null>(null)
  const [containerTypes, setContainerTypes] = useState<Array<{ id: number; name: string }>>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Table state (lifted up to drive backend requests)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [containerToRemove, setContainerToRemove] = useState<BackendContainer | null>(null)

  // Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setCurrentPage(1)
    }, 350)
  }, [])

  const handleTypeChange = (value: string) => {
    setSelectedType(value)
    setCurrentPage(1)
  }

  const handleToggleAlerts = (show: boolean) => {
    setShowOnlyAlerts(show)
    setCurrentPage(1)
  }

  // Fetch paginated containers
  const loadContainers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        page_size: String(PAGE_SIZE),
      })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (selectedType && selectedType !== 'all') params.set('type', selectedType)
      if (showOnlyAlerts) params.set('only_alerts', 'true')

      const data = await api.get<PaginatedContainers>(`/map/containers/?${params.toString()}`)
      setContainers(data.items)
      setTotal(data.total)
    } catch (err: any) {
      console.error(err)
      setError('Error connecting to the containers database. Please make sure the backend and database are running.')
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedSearch, selectedType, showOnlyAlerts])

  // Fetch stats independently
  const loadStats = useCallback(async () => {
    try {
      const data = await api.get<ContainerStats>('/map/containers/stats')
      setStats(data)
    } catch (err) {
      console.error('Error fetching container stats:', err)
    }
  }, [])

  // Fetch container types once on mount
  useEffect(() => {
    const loadContainerTypes = async () => {
      try {
        const data = await api.get<Array<{ id: number; name: string }>>('/map/containers/types')
        setContainerTypes(data)
      } catch (err) {
        console.error('Error fetching container types:', err)
      }
    }
    loadContainerTypes()
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadContainers()
  }, [loadContainers])

  const confirmRemoveLocalContainer = () => {
    if (containerToRemove) {
      setContainers((prev) => prev.filter((c) => c.id !== containerToRemove.id))
      setTotal((prev) => Math.max(0, prev - 1))
      setContainerToRemove(null)
    }
  }

  const handleRefreshAll = () => {
    loadContainers()
    loadStats()
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

        <ManagementStats stats={stats} showOnlyAlerts={showOnlyAlerts} onToggleAlerts={handleToggleAlerts} />

        <SimulationControl onSimulationStateChange={handleRefreshAll} />

        <ContainersTable
          containers={containers}
          total={total}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          selectedType={selectedType}
          onTypeChange={handleTypeChange}
          loading={loading}
          showOnlyAlerts={showOnlyAlerts}
          onToggleAlerts={handleToggleAlerts}
          onRemoveContainer={setContainerToRemove}
        />

        <AddContainerForm containerTypes={containerTypes} onContainerCreated={handleRefreshAll} onError={setError} onSuccess={setSuccessMsg} />
      </div>

      {containerToRemove && (
        <DeleteContainerForm container={containerToRemove} onClose={() => setContainerToRemove(null)} onConfirm={confirmRemoveLocalContainer} />
      )}
    </div>
  )
}
