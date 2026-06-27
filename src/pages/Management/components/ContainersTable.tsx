import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Search,
  AlertTriangle,
  Filter,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
} from 'lucide-react'
import { BackendContainer } from './types'

interface ContainersTableProps {
  containers: BackendContainer[]
  total: number
  currentPage: number
  onPageChange: (page: number) => void
  searchTerm: string
  onSearchChange: (search: string) => void
  selectedType: string
  onTypeChange: (type: string) => void
  loading: boolean
  showOnlyAlerts: boolean
  onToggleAlerts: (show: boolean) => void
  onRemoveContainer: (container: BackendContainer) => void
}

export default function ContainersTable({
  containers,
  total,
  currentPage,
  onPageChange,
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  loading,
  showOnlyAlerts,
  onToggleAlerts,
  onRemoveContainer,
}: ContainersTableProps) {
  const itemsPerPage = 10
  const totalPages = Math.ceil(total / itemsPerPage) || 1

  return (
    <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden rounded-2xl">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-slate-950">Containers List</CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              Shows the geographical information and current status of each unit.
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {showOnlyAlerts && (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold px-2.5 py-1.5 animate-fade-in shrink-0">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Only ≥80%
                <button onClick={() => onToggleAlerts(false)} className="text-amber-500 hover:text-amber-700 ml-1 font-bold text-sm">
                  ×
                </button>
              </span>
            )}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ID, name or neighborhood..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-400 hidden sm:inline" />
              <select
                value={selectedType}
                onChange={(e) => onTypeChange(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
              >
                <option value="all">All Types</option>
                <option value="lateral">Side Load (Carga Lateral)</option>
                <option value="bilateral">Bilateral Load (Carga Bilateral)</option>
                <option value="soterrado">Underground (Soterrado)</option>
              </select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-sm font-medium">Loading containers...</p>
          </div>
        ) : containers.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Database className="h-12 w-12 mx-auto text-slate-300" />
            <p className="text-lg font-bold text-slate-500">No containers found</p>
            <p className="text-sm text-slate-400 max-w-md mx-auto px-6">
              The database is empty, no containers match the filters, or connection was lost.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4 font-semibold text-slate-900">Container ID</th>
                  <th className="px-6 py-4">Site ID</th>
                  <th className="px-6 py-4">Neighborhood / Zone</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 w-64">Fill Level</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {containers.map((container) => {
                  const fillPercentage = container.current_level

                  let fillBg = 'bg-emerald-500'
                  let fillTrack = 'bg-emerald-100'
                  if (fillPercentage >= 80) {
                    fillBg = 'bg-rose-500'
                    fillTrack = 'bg-rose-100'
                  } else if (fillPercentage >= 50) {
                    fillBg = 'bg-amber-500'
                    fillTrack = 'bg-amber-100'
                  }

                  return (
                    <tr key={container.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {container.id}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {container.site_id}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{container.zone || 'Not assigned'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {container.container_type?.name || 'Generic'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {container.available ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-9 text-right font-bold text-xs tabular-nums text-slate-700">
                            {fillPercentage}%
                          </span>
                          <div className={`h-2.5 w-full rounded-full ${fillTrack}`}>
                            <div className={`h-2.5 rounded-full transition-all duration-300 ${fillBg}`} style={{ width: `${Math.min(100, fillPercentage)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => onRemoveContainer(container)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 h-8 w-8 rounded-lg" title="Remove from view (frontend only)">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {!loading && total > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/30 px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Showing{' '}
            <span className="font-bold text-slate-700">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-slate-700">
              {Math.min(total, currentPage * itemsPerPage)}
            </span>{' '}
            of <span className="font-bold text-slate-700">{total}</span>{' '}
            containers
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xs font-bold text-slate-700">
              Page {currentPage} of {totalPages}
            </div>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
