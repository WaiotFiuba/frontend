import { useState } from "react"
import { Info, Layers, CheckCircle2, AlertTriangle, AlertCircle, ChevronDown, MapPin } from "lucide-react"
import { Badge } from "@/common/ui/badge"

interface MapLegendProps {
    className?: string
    defaultLevelsOpen?: boolean
    defaultTypesOpen?: boolean
}

function PinPreview({
    fill,
    accent,
    count,
    countLabel,
    label,
    size = 46,
}: {
    fill: string
    accent: string
    count?: number
    countLabel?: string
    label: string
    size?: number
}) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className="shrink-0 drop-shadow-xs">
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
            <circle cx="32" cy="23" r="11.5" fill="rgba(17, 24, 39, 0.35)" />
            <text
                x="32"
                y="28"
                textAnchor="middle"
                fontSize="17"
                fontWeight="800"
                fill="white"
                stroke="rgba(17, 24, 39, 0.75)"
                strokeWidth="1.25"
                paintOrder="stroke"
            >
                {countLabel ?? count}
            </text>
            {label ? (
                <text x="32" y="54" textAnchor="middle" fontSize="10" fontWeight="900" fill="white">
                    {label}
                </text>
            ) : null}
        </svg>
    )
}

export default function MapLegend({
    className = "",
    defaultLevelsOpen = false,
    defaultTypesOpen = false,
}: MapLegendProps) {
    const [isLevelsOpen, setIsLevelsOpen] = useState(defaultLevelsOpen)
    const [isTypesOpen, setIsTypesOpen] = useState(defaultTypesOpen)

    return (
        <div
            onMouseDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className={`absolute top-3 right-3 z-[1000] flex flex-col gap-2 w-[310px] max-w-[calc(100vw-2.5rem)] pointer-events-auto select-none ${className}`}
        >
            {/* Desplegable 1: Nivel de Llenado */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden transition-all duration-200">
                <button
                    type="button"
                    onClick={() => setIsLevelsOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between p-2.5 px-3 hover:bg-slate-50/80 transition-colors cursor-pointer text-left"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg shrink-0">
                            <Layers className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-800 block leading-tight">Nivel de llenado</span>
                            <span className="text-[10px] text-slate-500 font-medium block">Rangos de capacidad y alertas</span>
                        </div>
                    </div>
                    <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                            isLevelsOpen ? "rotate-180" : ""
                        }`}
                    />
                </button>

                {isLevelsOpen && (
                    <div className="p-2.5 border-t border-slate-100 space-y-2 bg-white max-h-[40vh] overflow-y-auto custom-scrollbar animate-in fade-in duration-150">
                        <div className="flex items-center gap-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 transition-colors hover:bg-emerald-50">
                            <PinPreview fill="#10b981" accent="#ffffff" count={1} label="" size={46} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs text-emerald-950">&lt; 50%</span>
                                    <Badge variant="success" className="text-[10px] px-1.5 py-0 font-bold gap-1">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                        Óptimo
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                                    Nivel bajo de residuos.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 transition-colors hover:bg-amber-50">
                            <PinPreview fill="#f59e0b" accent="#ffffff" count={1} label="" size={46} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs text-amber-950">50% - 79%</span>
                                    <Badge variant="warning" className="text-[10px] px-1.5 py-0 font-bold gap-1">
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        Medio
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                                    Carga moderada.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 bg-red-50/70 border border-red-200/80 rounded-xl p-2.5 transition-colors hover:bg-red-50">
                            <PinPreview fill="#ef4444" accent="#ffffff" count={1} label="" size={46} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs text-red-950">&ge; 80%</span>
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-bold gap-1">
                                        <AlertCircle className="w-2.5 h-2.5" />
                                        Crítico
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                                    Prioridad alta de recolección.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="h-2 w-2 rounded-full bg-red-500 shrink-0 mt-1" />
                            <div className="text-[11px] leading-snug">
                                <span className="font-bold text-red-600">Al 100%:</span>
                                <span className="text-slate-600 ml-1">Desborde hacia sitios cercanos.</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Desplegable 2: Tipo de Sitio */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden transition-all duration-200">
                <button
                    type="button"
                    onClick={() => setIsTypesOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between p-2.5 px-3 hover:bg-slate-50/80 transition-colors cursor-pointer text-left"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg shrink-0">
                            <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-800 block leading-tight">Tipo de sitio</span>
                            <span className="text-[10px] text-slate-500 font-medium block">Tipología de residuo y contenedor</span>
                        </div>
                    </div>
                    <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                            isTypesOpen ? "rotate-180" : ""
                        }`}
                    />
                </button>

                {isTypesOpen && (
                    <div className="p-2.5 border-t border-slate-100 space-y-2 bg-white max-h-[40vh] overflow-y-auto custom-scrollbar animate-in fade-in duration-150">
                        <div className="flex items-center gap-2.5 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80">
                            <PinPreview fill="#10b981" accent="#111827" count={1} label="H" size={46} />
                            <div className="min-w-0">
                                <p className="font-bold text-xs text-slate-800">Sitio humedo</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                    Borde oscuro y letra <span className="font-bold text-slate-700">H</span> (Fracción húmeda/mixta).
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80">
                            <PinPreview fill="#10b981" accent="#047857" count={3} label="R" size={46} />
                            <div className="min-w-0">
                                <p className="font-bold text-xs text-slate-800">Sitio reciclable</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                    Borde verde y letra <span className="font-bold text-emerald-700">R</span> (Materiales secos).
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200">
                            <PinPreview fill="#10b981" accent="#64748b" countLabel="N" label="" size={46} />
                            <div className="min-w-0">
                                <p className="font-bold text-xs text-slate-800">Cantidad de contenedores</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                    El número central <span className="font-bold text-slate-700">N</span> indica cuántos contenedores agrupa el sitio.
                                </p>
                            </div>
                        </div>

                        <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-[11px] text-slate-600">
                            <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span>Click en pin del mapa para ver telemetría.</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
