import { useState } from "react"
import { BookOpen, Info, ArrowRight, Layers, Sparkles } from "lucide-react"

interface MapLegendProps {
    className?: string
    hasRedistributionMoves?: boolean
}

export default function MapLegend({
    className = "",
    hasRedistributionMoves = false,
}: MapLegendProps) {
    const [activeTab, setActiveTab] = useState<'all' | 'levels' | 'markers' | 'routes'>('all')

    return (
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-lg flex flex-col overflow-hidden text-slate-800 ${className}`}>
            {/* Encabezado del Diccionario */}
            <div className="p-3.5 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 border-b border-slate-200/80">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/30 shrink-0">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">
                            Diccionario de Iconos
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                            Simbología y estados
                        </p>
                    </div>
                </div>

                {/* Filtro rápido por categorías */}
                <div className="flex gap-1.5 mt-3 text-xs font-semibold">
                    <button
                        type="button"
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                            activeTab === 'all'
                                ? 'bg-blue-600 text-white shadow-sm font-bold'
                                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                        }`}
                    >
                        Todos
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('levels')}
                        className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                            activeTab === 'levels'
                                ? 'bg-blue-600 text-white shadow-sm font-bold'
                                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                        }`}
                    >
                        Llenado
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('markers')}
                        className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                            activeTab === 'markers'
                                ? 'bg-blue-600 text-white shadow-sm font-bold'
                                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                        }`}
                    >
                        Pines
                    </button>
                    {hasRedistributionMoves && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('routes')}
                            className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                                activeTab === 'routes'
                                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                            }`}
                        >
                            Rutas
                        </button>
                    )}
                </div>
            </div>

            {/* Lista de elementos / explicaciones */}
            <div className="p-3 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
                {/* SECCIÓN: NIVELES DE LLENADO */}
                {(activeTab === 'all' || activeTab === 'levels') && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider text-slate-400">
                            <Layers className="w-3 h-3 text-slate-400" />
                            <span>Niveles de Llenado</span>
                        </div>

                        {/* Verde: Óptimo */}
                        <div className="flex items-start gap-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 hover:border-emerald-300 transition-colors">
                            <svg width="22" height="22" viewBox="0 0 64 64" fill="none" className="shrink-0 mt-0.5">
                                <path
                                    d="M32 4C21.4 4 12.8 12.6 12.8 23.2C12.8 37.6 32 60 32 60C32 60 51.2 37.6 51.2 23.2C51.2 12.6 42.6 4 32 4Z"
                                    fill="#10b981"
                                    stroke="white"
                                    strokeWidth="3"
                                />
                                <circle cx="32" cy="23" r="11" fill="rgba(17, 24, 39, 0.30)" />
                                <circle cx="32" cy="23" r="6" fill="white" />
                            </svg>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs text-emerald-950">&lt; 50%</span>
                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md">Óptimo</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-snug mt-0.5">
                                    Nivel bajo de residuos.
                                </p>
                            </div>
                        </div>

                        {/* Amarillo: Medio */}
                        <div className="flex items-start gap-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 hover:border-amber-300 transition-colors">
                            <svg width="22" height="22" viewBox="0 0 64 64" fill="none" className="shrink-0 mt-0.5">
                                <path
                                    d="M32 4C21.4 4 12.8 12.6 12.8 23.2C12.8 37.6 32 60 32 60C32 60 51.2 37.6 51.2 23.2C51.2 12.6 42.6 4 32 4Z"
                                    fill="#f59e0b"
                                    stroke="white"
                                    strokeWidth="3"
                                />
                                <circle cx="32" cy="23" r="11" fill="rgba(17, 24, 39, 0.30)" />
                                <circle cx="32" cy="23" r="6" fill="white" />
                            </svg>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs text-amber-950">50% – 79%</span>
                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md">Medio</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-snug mt-0.5">
                                    Carga moderada.
                                </p>
                            </div>
                        </div>

                        {/* Rojo: Crítico */}
                        <div className="flex items-start gap-2.5 bg-red-50/70 border border-red-200/80 rounded-xl p-2.5 hover:border-red-300 transition-colors">
                            <svg width="22" height="22" viewBox="0 0 64 64" fill="none" className="shrink-0 mt-0.5">
                                <path
                                    d="M32 4C21.4 4 12.8 12.6 12.8 23.2C12.8 37.6 32 60 32 60C32 60 51.2 37.6 51.2 23.2C51.2 12.6 42.6 4 32 4Z"
                                    fill="#ef4444"
                                    stroke="white"
                                    strokeWidth="3"
                                />
                                <circle cx="32" cy="23" r="11" fill="rgba(17, 24, 39, 0.30)" />
                                <circle cx="32" cy="23" r="6" fill="white" />
                            </svg>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs text-red-950">&ge; 80%</span>
                                    <span className="text-[10px] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded-md">Crítico</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-snug mt-0.5">
                                    Prioridad alta de recolección.
                                </p>
                            </div>
                        </div>

                        {/* Indicador Al 100% */}
                        <div className="flex items-start gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="flex h-3 w-3 relative shrink-0 mt-0.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <div className="text-xs leading-snug">
                                <span className="font-bold text-red-600">Al 100%:</span>
                                <span className="text-slate-700 ml-1">
                                    Desborde hacia sitios cercanos.
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* SECCIÓN: TIPOS DE MARCADORES (SIN DESCRIPCIONES Y CON LETRAS MÁS GRANDES) */}
                {(activeTab === 'all' || activeTab === 'markers') && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider text-slate-400">
                            <Sparkles className="w-3 h-3 text-slate-400" />
                            <span>Pines en Mapa</span>
                        </div>

                        {/* Marcador 1 contenedor */}
                        <div className="flex items-center gap-3 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80 hover:bg-slate-100/70 transition-colors">
                            <svg width="24" height="24" viewBox="0 0 64 64" fill="none" className="shrink-0">
                                <path
                                    d="M32 4C21.4 4 12.8 12.6 12.8 23.2C12.8 37.6 32 60 32 60C32 60 51.2 37.6 51.2 23.2C51.2 12.6 42.6 4 32 4Z"
                                    fill="#64748b"
                                    stroke="white"
                                    strokeWidth="2.5"
                                />
                                <circle cx="32" cy="23" r="11" fill="rgba(17, 24, 39, 0.30)" />
                                <circle cx="32" cy="23" r="6" fill="white" />
                            </svg>
                            <span className="font-bold text-xs sm:text-sm text-slate-800">
                                Sitio con 1 contenedor
                            </span>
                        </div>

                        {/* Marcador múltiple */}
                        <div className="flex items-center gap-3 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80 hover:bg-slate-100/70 transition-colors">
                            <svg width="24" height="24" viewBox="0 0 64 64" fill="none" className="shrink-0">
                                <path
                                    d="M32 4C21.4 4 12.8 12.6 12.8 23.2C12.8 37.6 32 60 32 60C32 60 51.2 37.6 51.2 23.2C51.2 12.6 42.6 4 32 4Z"
                                    fill="#64748b"
                                    stroke="white"
                                    strokeWidth="2.5"
                                />
                                <circle cx="32" cy="23" r="11" fill="rgba(17, 24, 39, 0.30)" />
                                <text
                                    x="32"
                                    y="28"
                                    textAnchor="middle"
                                    fontSize="18"
                                    fontWeight="800"
                                    fill="white"
                                    stroke="rgba(17, 24, 39, 0.75)"
                                    strokeWidth="1.25"
                                    paintOrder="stroke"
                                >
                                    3
                                </text>
                            </svg>
                            <span className="font-bold text-xs sm:text-sm text-slate-800">
                                Sitio con múltiples contenedores
                            </span>
                        </div>
                    </div>
                )}

                {/* SECCIÓN: RUTAS Y REDISTRIBUCIÓN */}
                {(activeTab === 'all' || activeTab === 'routes') && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider text-slate-400">
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span>Redistribución</span>
                        </div>

                        <div className="p-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                                <ArrowRight className="w-4 h-4 text-indigo-600" />
                                <span>Vector de Traslado</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-snug">
                                Mueve contenedor de sitio holgado a saturado.
                            </p>
                            <div className="flex items-center justify-between pt-1.5 border-t border-indigo-200/60 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-sm" />
                                    <span className="font-semibold text-slate-700">Origen</span>
                                </div>
                                <span className="text-slate-400 font-bold">&rarr;</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm" />
                                    <span className="font-semibold text-slate-700">Destino</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer con tip de interacción */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2 text-xs text-slate-600">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="leading-tight">Click en pin para ver sensores.</span>
            </div>
        </div>
    )
}
