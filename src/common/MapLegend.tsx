import { useState } from "react"
import { BookOpen, Info, Layers, Sparkles } from "lucide-react"
import { useLevelThresholds } from "@/context/CityConfigContext"

interface MapLegendProps {
    className?: string
}

function PinPreview({
    fill,
    accent,
    count,
    countLabel,
    label,
}: {
    fill: string
    accent: string
    count?: number
    countLabel?: string
    label: string
}) {
    return (
        <svg width="28" height="28" viewBox="0 0 64 64" fill="none" className="shrink-0">
            <path
                d="M32 4C21.4 4 12.8 12.6 12.8 23.2C12.8 37.6 32 60 32 60C32 60 51.2 37.6 51.2 23.2C51.2 12.6 42.6 4 32 4Z"
                fill={fill}
                stroke={accent}
                strokeWidth="4.25"
            />
            <path
                d="M22 45C25.3 50.5 29.5 56.1 32 60C34.5 56.1 38.7 50.5 42 45Z"
                fill={accent}
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
                {countLabel ?? count}
            </text>
            <text x="32" y="54" textAnchor="middle" fontSize="9" fontWeight="900" fill="white">
                {label}
            </text>
        </svg>
    )
}

export default function MapLegend({ className = "" }: MapLegendProps) {
    const [activeTab, setActiveTab] = useState<"all" | "levels" | "markers">("all")
    const { high, critical } = useLevelThresholds()

    return (
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-lg flex flex-col overflow-hidden text-slate-800 ${className}`}>
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
                            Simbologia y estados
                        </p>
                    </div>
                </div>

                <div className="flex gap-1.5 mt-3 text-xs font-semibold">
                    {[
                        ["all", "Todos"],
                        ["levels", "Llenado"],
                        ["markers", "Pines"],
                    ].map(([tab, label]) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab as "all" | "levels" | "markers")}
                            className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                                activeTab === tab
                                    ? "bg-blue-600 text-white shadow-sm font-bold"
                                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-3 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
                {(activeTab === "all" || activeTab === "levels") && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider text-slate-400">
                            <Layers className="w-3 h-3 text-slate-400" />
                            <span>Niveles de Llenado</span>
                        </div>

                        <div className="flex items-start gap-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5">
                            <PinPreview fill="#10b981" accent="#ffffff" count={1} label="" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs text-emerald-950">&lt; {high}%</span>
                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md">Optimo</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-snug mt-0.5">
                                    Nivel bajo de residuos.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5">
                            <PinPreview fill="#f59e0b" accent="#ffffff" count={1} label="" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs text-amber-950">{high}% - {critical - 1}%</span>
                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md">Medio</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-snug mt-0.5">
                                    Carga moderada.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5 bg-red-50/70 border border-red-200/80 rounded-xl p-2.5">
                            <PinPreview fill="#ef4444" accent="#ffffff" count={1} label="" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs text-red-950">&ge; {critical}%</span>
                                    <span className="text-[10px] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded-md">Critico</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-snug mt-0.5">
                                    Prioridad alta de recoleccion.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="flex h-3 w-3 relative shrink-0 mt-0.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
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

                {(activeTab === "all" || activeTab === "markers") && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider text-slate-400">
                            <Sparkles className="w-3 h-3 text-slate-400" />
                            <span>Tipo de Sitio</span>
                        </div>

                        <div className="flex items-center gap-3 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80">
                            <PinPreview fill="#10b981" accent="#111827" count={1} label="H" />
                            <div className="min-w-0">
                                <p className="font-bold text-xs sm:text-sm text-slate-800">Sitio humedo</p>
                                <p className="text-xs text-slate-500">Borde oscuro y letra H.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80">
                            <PinPreview fill="#10b981" accent="#047857" count={3} label="R" />
                            <div className="min-w-0">
                                <p className="font-bold text-xs sm:text-sm text-slate-800">Sitio reciclable</p>
                                <p className="text-xs text-slate-500">Borde verde y letra R.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200">
                            <PinPreview fill="#10b981" accent="#64748b" countLabel="N" label="" />
                            <div className="min-w-0">
                                <p className="font-bold text-xs sm:text-sm text-slate-800">Cantidad de contenedores</p>
                                <p className="text-xs text-slate-500">El numero central indica cuantos contenedores agrupa el sitio.</p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-2 text-xs leading-snug text-slate-600">
                            El color del pin sigue indicando nivel de llenado.
                        </div>
                    </div>
                )}
            </div>

            <div className="p-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2 text-xs text-slate-600">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="leading-tight">Click en pin para ver sensores.</span>
            </div>
        </div>
    )
}
