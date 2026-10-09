import { useState } from "react"
import { Info, Layers, CheckCircle2, AlertTriangle, AlertCircle, ChevronDown, MapPin } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/common/ui/card"
import { Badge } from "@/common/ui/badge"

interface MapLegendProps {
    className?: string
}

function PinPreview({
    fill,
    accent,
    count,
    countLabel,
    label,
    size = 52,
}: {
    fill: string
    accent: string
    count?: number
    countLabel?: string
    label: string
    size?: number
}) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className="shrink-0 drop-shadow-sm">
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
    const [isLevelsOpen, setIsLevelsOpen] = useState(false)
    const [isMarkersOpen, setIsMarkersOpen] = useState(false)

    return (
        <Card className={`rounded-2xl border-slate-200 shadow-lg flex flex-col overflow-hidden text-slate-800 p-0 gap-0 bg-white ${className}`}>
            <CardHeader className="p-3.5 bg-gradient-to-br from-slate-50 via-sky-50/40 to-emerald-50/30 border-b border-slate-200/80 rounded-t-2xl">
                <div className="min-w-0">
                    <CardTitle className="text-sm font-bold text-slate-900 leading-tight">
                        Diccionario de Iconos
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 font-medium">
                        Simbología y estados
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {/* SECCIÓN 1: Niveles de Llenado (Desplegable / Replegable) */}
                <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-slate-50/40 shadow-2xs">
                    <button
                        type="button"
                        onClick={() => setIsLevelsOpen(prev => !prev)}
                        className="w-full flex items-center justify-between p-2.5 bg-slate-100/80 hover:bg-slate-200/60 transition-all cursor-pointer select-none text-left"
                    >
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-sky-600 shrink-0" />
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Niveles de Llenado
                            </span>
                        </div>
                        <ChevronDown
                            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                                isLevelsOpen ? "rotate-180" : ""
                            }`}
                        />
                    </button>

                    {isLevelsOpen && (
                        <div className="p-2.5 space-y-2 border-t border-slate-200/80 bg-white animate-in fade-in duration-150">
                            <div className="flex items-center gap-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 transition-colors hover:bg-emerald-50">
                                <PinPreview fill="#10b981" accent="#ffffff" count={1} label="" size={52} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-xs text-emerald-950">&lt; 50%</span>
                                        <Badge variant="success" className="text-[10px] px-1.5 py-0 font-bold gap-1">
                                            <CheckCircle2 className="w-2.5 h-2.5" />
                                            Óptimo
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-snug mt-0.5">
                                        Nivel bajo de residuos.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 transition-colors hover:bg-amber-50">
                                <PinPreview fill="#f59e0b" accent="#ffffff" count={1} label="" size={52} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-xs text-amber-950">50% - 79%</span>
                                        <Badge variant="warning" className="text-[10px] px-1.5 py-0 font-bold gap-1">
                                            <AlertTriangle className="w-2.5 h-2.5" />
                                            Medio
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-snug mt-0.5">
                                        Carga moderada.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-red-50/70 border border-red-200/80 rounded-xl p-2.5 transition-colors hover:bg-red-50">
                                <PinPreview fill="#ef4444" accent="#ffffff" count={1} label="" size={52} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-xs text-red-950">&ge; 80%</span>
                                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-bold gap-1">
                                            <AlertCircle className="w-2.5 h-2.5" />
                                            Crítico
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-snug mt-0.5">
                                        Prioridad alta de recolección.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                                <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0 mt-1" />
                                <div className="text-xs leading-snug">
                                    <span className="font-bold text-red-600">Al 100%:</span>
                                    <span className="text-slate-700 ml-1">
                                        Desborde hacia sitios cercanos.
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* SECCIÓN 2: Tipo de Sitio (Desplegable / Replegable) */}
                <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-slate-50/40 shadow-2xs">
                    <button
                        type="button"
                        onClick={() => setIsMarkersOpen(prev => !prev)}
                        className="w-full flex items-center justify-between p-2.5 bg-slate-100/80 hover:bg-slate-200/60 transition-all cursor-pointer select-none text-left"
                    >
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Tipo de Sitio
                            </span>
                        </div>
                        <ChevronDown
                            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                                isMarkersOpen ? "rotate-180" : ""
                            }`}
                        />
                    </button>

                    {isMarkersOpen && (
                        <div className="p-2.5 space-y-2 border-t border-slate-200/80 bg-white animate-in fade-in duration-150">
                            <div className="flex items-center gap-3 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80">
                                <PinPreview fill="#10b981" accent="#111827" count={1} label="H" size={52} />
                                <div className="min-w-0">
                                    <p className="font-bold text-xs sm:text-sm text-slate-800">Sitio húmedo</p>
                                    <p className="text-xs text-slate-500">Borde oscuro y letra H.</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80">
                                <PinPreview fill="#10b981" accent="#047857" count={3} label="R" size={52} />
                                <div className="min-w-0">
                                    <p className="font-bold text-xs sm:text-sm text-slate-800">Sitio reciclable</p>
                                    <p className="text-xs text-slate-500">Borde verde y letra R.</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200">
                                <PinPreview fill="#10b981" accent="#64748b" countLabel="N" label="" size={52} />
                                <div className="min-w-0">
                                    <p className="font-bold text-xs sm:text-sm text-slate-800">Cantidad de contenedores</p>
                                    <p className="text-xs text-slate-500">El número central indica cuántos contenedores agrupa el sitio.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="p-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2 text-xs text-slate-600 rounded-b-2xl">
                <Info className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="leading-tight">Click en pin para ver más detalles.</span>
            </CardFooter>
        </Card>
    )
}

