import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  TrendingDown,
  Truck,
  X,
} from 'lucide-react'
import type { RedistributionMove } from '../types'

interface MoveImpactCardProps {
  move: RedistributionMove
  onClose: () => void
  className?: string
}

export default function MoveImpactCard({
  move,
  onClose,
  className = '',
}: MoveImpactCardProps) {
  const rBefore = move.receiver_fill_before ?? null
  const rAfter = move.receiver_fill_after ?? null
  const dBefore = move.donor_fill_before ?? null
  const dAfter = move.donor_fill_after ?? null

  const rRelief =
    rBefore != null && rAfter != null ? Math.round((rAfter - rBefore) * 10) / 10 : null
  const dDelta =
    dBefore != null && dAfter != null ? Math.round((dAfter - dBefore) * 10) / 10 : null

  const netDecongestion =
    move.net_decongestion_pct ??
    (rRelief != null && dDelta != null
      ? Math.round((rRelief + dDelta) * 10) / 10
      : null)

  const isNetImproved = netDecongestion != null && netDecongestion < 0

  return (
    <div
      role="region"
      aria-label="Detalle de impacto del traslado"
      onClick={(e) => e.stopPropagation()}
      className={`absolute top-4 right-4 z-[1001] pointer-events-auto w-80 sm:w-96 max-w-[calc(100%-2rem)] bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xl p-4 sm:p-5 space-y-3.5 transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                #{move.container_id}
              </span>
              <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                Traslado Seleccionado
              </h4>
            </div>
            <p className="text-[11px] text-slate-500">
              Impacto y descongestión de carga entre sitios
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main Net Metric Card */}
      {netDecongestion != null && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
            isNetImproved
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-blue-50/80 border-blue-200 text-blue-950'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                isNetImproved
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              <TrendingDown className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-600 block">
                Descongestión Neta del Par
              </span>
              <span className="text-sm font-black tracking-tight text-emerald-700">
                {netDecongestion > 0 ? `+${netDecongestion}%` : `${netDecongestion}%`}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800 border border-emerald-300">
            Suma de ambos sitios
          </span>
        </div>
      )}

      {/* Breakdown: Receiver (Destino) vs Donor (Origen) */}
      <div className="space-y-2 text-xs">
        {/* 1. Destino (Receptor - Descongestión) */}
        <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
              <ArrowDownRight className="h-3.5 w-3.5" />
              Destino (Receptor Saturado)
            </span>
            {rRelief != null && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {rRelief}% saturación
              </span>
            )}
          </div>
          <p className="font-semibold text-slate-800 text-[11px] truncate" title={move.to_site_name}>
            {move.to_site_name}
          </p>
          {rBefore != null && rAfter != null && (
            <div className="flex items-center gap-1 text-[11px] text-slate-600">
              <span>Llenado:</span>
              <span className="font-mono font-bold text-rose-600">{rBefore}%</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <span className="font-mono font-bold text-emerald-600">{rAfter}%</span>
            </div>
          )}
        </div>

        {/* 2. Origen (Donante - Cesión segura) */}
        <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-700 flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Origen (Donante con Holgura)
            </span>
            {dDelta != null && (
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                +{dDelta}% carga segura
              </span>
            )}
          </div>
          <p className="font-semibold text-slate-800 text-[11px] truncate" title={move.from_site_name}>
            {move.from_site_name}
          </p>
          {dBefore != null && dAfter != null && (
            <div className="flex items-center gap-1 text-[11px] text-slate-600">
              <span>Llenado:</span>
              <span className="font-mono font-bold text-sky-600">{dBefore}%</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <span className="font-mono font-bold text-slate-700">{dAfter}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Distancia y cierre */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          <span>Distancia:</span>
          <span className="font-mono font-bold text-slate-700">
            {move.distance_km.toFixed(2)} km
          </span>
          <span className="text-[10px] text-slate-400">
            ({Math.round(move.distance_km * 1000)} m)
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
        >
          Ocultar
        </button>
      </div>
    </div>
  )
}
