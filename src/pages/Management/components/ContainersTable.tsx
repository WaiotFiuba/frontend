import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/common/utils/ui/card'
import { Button } from '@/common/utils/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/common/utils/ui/table'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/common/utils/ui/select'
import {
  Search,
  AlertTriangle,
  Filter,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Database,
} from 'lucide-react'
import { BackendContainer, PaginatedContainers } from './types'
import { api } from '@/lib/api'

interface ContainersTableProps {
  onRemoveContainer: (container: BackendContainer) => void
  refreshTrigger: number
}

const ITEMS_PER_PAGE = 10

export default function ContainersTable({ onRemoveContainer, refreshTrigger }: ContainersTableProps) {

  const [containers, setContainers] = useState<BackendContainer[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Debounce search input to avoid excessive API calls
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchContainers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        page_size: String(ITEMS_PER_PAGE),
      })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (selectedType !== 'all') params.set('type', selectedType)
      if (showOnlyAlerts) params.set('only_alerts', 'true')

      const data = await api.get<PaginatedContainers>(`/map/containers/?${params.toString()}`)
      setContainers(data.items)
      setTotalItems(data.total)
    } catch (err: unknown) {
      console.error(err)
      setError('Error loading containers.')
      setContainers([])
      setTotalItems(0)
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedSearch, selectedType, showOnlyAlerts])

  useEffect(() => {
    fetchContainers()
  }, [fetchContainers, refreshTrigger])

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1

  const handleToggleAlerts = (show: boolean) => {
    setShowOnlyAlerts(show)
    setCurrentPage(1)
  }

  const handleTypeChange = (type: string) => {
    setSelectedType(type)
    setCurrentPage(1)
  }

  return (
    <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden rounded-2xl">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-slate-950">Lista de Contenedores</CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              Muestra la informaciÃ³n geogrÃ¡fica y el estado actual de cada unidad.
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {showOnlyAlerts && (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold px-2.5 py-1.5 animate-fade-in shrink-0">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Solo â‰¥80%
                <button onClick={() => handleToggleAlerts(false)} className="text-amber-500 hover:text-amber-700 ml-1 font-bold text-sm">
                  Ã—
                </button>
              </span>
            )}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Buscar por ID, nombre o barrio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400 text-slate-700" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-400 hidden sm:inline" />
              <Select value={selectedType} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-full sm:w-56 text-xs font-semibold bg-white border-slate-200">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="lateral">Carga Lateral</SelectItem>
                  <SelectItem value="bilateral">Carga Bilateral</SelectItem>
                  <SelectItem value="soterrado">Soterrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-3 m-4 rounded-lg shadow-sm text-xs">
            {error}
          </div>
        )}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="h-10 w-10 animate-spin text-sky-600" />
            <p className="text-sm font-medium">Cargando contenedores...</p>
          </div>
        ) : containers.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Database className="h-12 w-12 mx-auto text-slate-300" />
            <p className="text-lg font-bold text-slate-500">No se encontraron contenedores</p>
            <p className="text-sm text-slate-400 max-w-md mx-auto px-6">
              {totalItems === 0 && !debouncedSearch && selectedType === 'all' && !showOnlyAlerts
                ? "No hay contenedores registrados en la base de datos."
                : 'NingÃºn contenedor coincide con la bÃºsqueda o el filtro seleccionado.'}
            </p>
          </div>
        ) : (
            <Table>
              <TableHeader className="bg-slate-50/40">
                <TableRow className="border-b border-slate-100">
                  <TableHead className="px-6 py-4 font-semibold text-slate-900">ID Contenedor</TableHead>
                  <TableHead className="px-6 py-4">ID Sitio</TableHead>
                  <TableHead className="px-6 py-4">Barrio / Zona</TableHead>
                  <TableHead className="px-6 py-4">Tipo</TableHead>
                  <TableHead className="px-6 py-4">Estado</TableHead>
                  <TableHead className="px-6 py-4 w-64">Nivel de Llenado</TableHead>
                  <TableHead className="px-6 py-4 text-right">AcciÃ³n</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                    <TableRow key={container.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="px-6 py-4 font-mono text-xs text-slate-500">
                        {container.id}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-mono text-xs text-slate-600">
                        {container.site_id}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">{container.zone || 'Sin asignar'}</TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {container.container_type?.name || 'GenÃ©rico'}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {container.available ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Inactivo
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-9 text-right font-bold text-xs tabular-nums text-slate-700">
                            {fillPercentage}%
                          </span>
                          <div className={`h-2.5 w-full rounded-full ${fillTrack}`}>
                            <div className={`h-2.5 rounded-full transition-all duration-300 ${fillBg}`} style={{ width: `${Math.min(100, fillPercentage)}%` }} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => onRemoveContainer(container)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 h-8 w-8 rounded-lg cursor-pointer" title="Eliminar de la vista (solo visual)">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
        )}
      </CardContent>

      {!loading && totalItems > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/30 px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Mostrando{' '}
            <span className="font-bold text-slate-700">
              {Math.min(totalItems, (currentPage - 1) * ITEMS_PER_PAGE + 1)}
            </span>{' '}
            a{' '}
            <span className="font-bold text-slate-700">
              {Math.min(totalItems, currentPage * ITEMS_PER_PAGE)}
            </span>{' '}
            de <span className="font-bold text-slate-700">{totalItems}</span>{' '}
            contenedores
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xs font-bold text-slate-700">
              PÃ¡gina {currentPage} de {totalPages}
            </div>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
