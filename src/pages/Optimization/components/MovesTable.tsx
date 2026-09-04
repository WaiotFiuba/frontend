import { useState, useMemo } from 'react'
import type { RedistributionPlan } from '../types'
import {
  ArrowRight,
  Download,
  Search,
  Truck,
} from 'lucide-react'
import { Button } from '@/common/ui/button'

interface MovesTableProps {
  plan: RedistributionPlan | null
  onHighlightMove?: (containerId: number | null) => void
  highlightedMoveId?: number | null
}

export default function MovesTable({
  plan,
  onHighlightMove,
  highlightedMoveId,
}: MovesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const filteredMoves = useMemo(() => {
    if (!plan?.moves) return []
    if (!searchTerm.trim()) return plan.moves
    const term = searchTerm.toLowerCase()
    return plan.moves.filter(
      (m) =>
        m.container_id.toString().includes(term) ||
        m.from_site_name.toLowerCase().includes(term) ||
        m.to_site_name.toLowerCase().includes(term)
    )
  }, [plan, searchTerm])

  const totalPages = Math.ceil(filteredMoves.length / pageSize) || 1
  const paginatedMoves = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredMoves.slice(start, start + pageSize)
  }, [filteredMoves, currentPage])

  if (!plan) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
          <Truck className="h-6 w-6" />
        </div>
        <h4 className="font-bold text-slate-800 text-base">Aún no se ha generado un plan</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Ajustá los parámetros en el panel superior y hacé clic en &ldquo;Generar Plan de Redistribución&rdquo; para ver la lista de traslados sugeridos.
        </p>
      </div>
    )
  }

  const exportCsv = () => {
    if (!plan.moves.length) return
    const headers = ['Contenedor ID', 'Sitio Origen', 'Sitio Destino', 'Distancia KM']
    const rows = plan.moves.map((m) => [
      m.container_id,
      `"${m.from_site_name.replace(/"/g, '""')}"`,
      `"${m.to_site_name.replace(/"/g, '""')}"`,
      m.distance_km,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `plan_redistribucion_${plan.id}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
      {/* Executive Summary Header */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border-b border-slate-100 pb-4">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Movimientos</span>
          <span className="text-xl font-extrabold text-blue-700">
            {plan.total_containers_moved}
          </span>
          <span className="text-[10px] text-slate-400 block">contenedores</span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 block">Sitios Donantes</span>
          <span className="text-xl font-extrabold text-sky-700">{plan.sites_donating}</span>
          <span className="text-[10px] text-slate-400 block">ceden exceso</span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 block">Sitios Receptores</span>
          <span className="text-xl font-extrabold text-rose-700">{plan.sites_receiving}</span>
          <span className="text-[10px] text-slate-400 block">descongestionados</span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 block">Distancia Promedio</span>
          <span className="text-xl font-extrabold text-indigo-700">
            {plan.avg_distance_km.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block">km por traslado</span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-slate-500 block">Mejora Esperada</span>
          <span className="text-xl font-extrabold text-emerald-700">
            {(plan.expected_improvement * 100).toFixed(0)}%
          </span>
          <span className="text-[10px] text-slate-400 block">alivio saturación</span>
        </div>
      </div>

      {/* Toolbar: Search + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por sitio o ID de contenedor..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            className="text-xs gap-1.5 border-slate-200 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Contenedor</th>
              <th className="p-3">Sitio Donante (Origen)</th>
              <th className="p-3 text-center"></th>
              <th className="p-3">Sitio Receptor (Destino)</th>
              <th className="p-3 text-right">Distancia</th>
              <th className="p-3 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedMoves.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-slate-500">
                  No se encontraron movimientos con los filtros actuales.
                </td>
              </tr>
            ) : (
              paginatedMoves.map((m, idx) => {
                const globalIdx = (currentPage - 1) * pageSize + idx + 1
                const isSelected = highlightedMoveId === m.container_id

                return (
                  <tr
                    key={`move-${m.container_id}`}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      isSelected ? 'bg-blue-50/60 font-semibold' : ''
                    }`}
                  >
                    <td className="p-3 text-slate-400 font-mono text-[11px]">{globalIdx}</td>
                    <td className="p-3">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        #{m.container_id}
                      </span>
                    </td>
                    <td className="p-3 max-w-[240px]">
                      <div className="font-medium text-slate-900 truncate" title={m.from_site_name}>
                        {m.from_site_name}
                      </div>
                      <span className="text-[10px] text-sky-600 font-semibold">
                        ID Sitio {m.from_site_id}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-400">
                      <ArrowRight className="h-4 w-4 inline text-indigo-500" />
                    </td>
                    <td className="p-3 max-w-[240px]">
                      <div className="font-medium text-slate-900 truncate" title={m.to_site_name}>
                        {m.to_site_name}
                      </div>
                      <span className="text-[10px] text-rose-600 font-semibold">
                        ID Sitio {m.to_site_id}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">
                      <span className="text-slate-800 font-bold">{m.distance_km.toFixed(2)}</span>
                      <span className="text-slate-400 text-[10px] ml-1">km</span>
                      <div className="text-[10px] text-slate-400">
                        {Math.round(m.distance_km * 1000)} m
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          onHighlightMove?.(
                            highlightedMoveId === m.container_id ? null : m.container_id
                          )
                        }
                        className={`text-[11px] font-semibold px-2 py-1 rounded transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? 'Seleccionado' : 'Ver mapa'}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>
            Mostrando {(currentPage - 1) * pageSize + 1} a{' '}
            {Math.min(currentPage * pageSize, filteredMoves.length)} de {filteredMoves.length}{' '}
            traslados
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="text-xs h-8 px-2.5 cursor-pointer"
            >
              Anterior
            </Button>
            <span className="px-2 font-mono">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="text-xs h-8 px-2.5 cursor-pointer"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
