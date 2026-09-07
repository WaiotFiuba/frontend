import type { OptimizationConfig } from '../types'
import { Button } from '@/common/ui/button'
import { Sliders, Sparkles, RefreshCw, Cpu, Zap, Info } from 'lucide-react'

interface ConfigPanelProps {
  config: OptimizationConfig
  onChangeConfig: (config: OptimizationConfig) => void
  onGeneratePlan: () => void
  onRefreshMetrics: () => void
  generating: boolean
  refreshing: boolean
}

export default function ConfigPanel({
  config,
  onChangeConfig,
  onGeneratePlan,
  onRefreshMetrics,
  generating,
  refreshing,
}: ConfigPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Parámetros de Optimización</h3>
            <p className="text-xs text-slate-500">Configuración del algoritmo Balanced Load Redistribution (BLR)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshMetrics}
            disabled={refreshing || generating}
            className="text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar Diagnóstico
          </Button>

          <Button
            onClick={onGeneratePlan}
            disabled={generating}
            className="text-xs font-semibold gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs cursor-pointer"
          >
            <Sparkles className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Calculando Plan...' : 'Generar Plan de Redistribución'}
          </Button>
        </div>
      </div>

      {/* Grid of parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Distancia máxima */}
        <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="dist-slider" className="font-semibold text-slate-700">
              Radio Máximo de Traslado
            </label>
            <span className="font-mono font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-100">
              {config.max_distance_km.toFixed(1)} km
            </span>
          </div>
          <input
            id="dist-slider"
            type="range"
            min="0.5"
            max="5.0"
            step="0.1"
            value={config.max_distance_km}
            onChange={(e) =>
              onChangeConfig({ ...config, max_distance_km: parseFloat(e.target.value) })
            }
            className="w-full accent-blue-600 cursor-pointer"
          />
          <p className="text-[11px] text-slate-500">
            Evita traslados lejanos entre barrios distantes. Por defecto 2.0 km.
          </p>
        </div>

        {/* 2. Ventana temporal */}
        <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
          <label htmlFor="window-select" className="text-xs font-semibold text-slate-700 block">
            Ventana de Historial a Analizar
          </label>
          <select
            id="window-select"
            value={config.window_days ?? 'all'}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                window_days: e.target.value === 'all' ? null : parseInt(e.target.value, 10),
              })
            }
            className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="all">Todo el historial disponible (Máximo)</option>
            <option value="7">Últimos 7 días (Crecimiento reciente)</option>
            <option value="15">Últimos 15 días</option>
            <option value="30">Últimos 30 días (Mes completo)</option>
          </select>
          <p className="text-[11px] text-slate-500">
            Filtra lecturas de telemetría para evaluar la utilización histórica de cada sitio.
          </p>
        </div>

        {/* 3. Selector de Algoritmo */}
        <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
          <span className="text-xs font-semibold text-slate-700 block">Motor de Optimización</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeConfig({ ...config, algorithm: 'greedy' })}
              className={`p-2 rounded-lg border text-left flex items-start gap-2 transition-all cursor-pointer ${
                config.algorithm === 'greedy'
                  ? 'border-blue-500 bg-blue-50/80 text-blue-900 ring-1 ring-blue-500'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold">Greedy</div>
                <div className="text-[10px] text-slate-500">Prioridad local rápida</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChangeConfig({ ...config, algorithm: 'lp' })}
              className={`p-2 rounded-lg border text-left flex items-start gap-2 transition-all cursor-pointer ${
                config.algorithm === 'lp'
                  ? 'border-blue-500 bg-blue-50/80 text-blue-900 ring-1 ring-blue-500'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Cpu className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold">Prog. Lineal</div>
                <div className="text-[10px] text-slate-500">Óptimo global (LP)</div>
              </div>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            {config.algorithm === 'lp'
              ? 'Minimiza la distancia euclidiana total recorrida resolviendo el problema de transporte con HiGHS.'
              : 'Asigna donantes más cercanos por orden de severidad de saturación.'}
          </p>
        </div>
      </div>

      {/* Constraints tip */}
      <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
        <Info className="h-4 w-4 text-blue-600 shrink-0" />
        <span>
          <strong>Reglas aplicadas:</strong> Solo se transfieren contenedores entre sitios con el <em>mismo tipo de residuo</em> y <em>tipo de contenedor</em>. Si un sitio dona todos sus contenedores, se marca como vaciado y sus residuos virtuales se redirigen al sitio receptor más cercano durante la simulación.
        </span>
      </div>
    </div>
  )
}
