import { Button } from "@/common/ui/button"
import {
    Clock,
    Layers,
    Trash2,
    Recycle,
    AlertTriangle,
} from "lucide-react"
import ZoneProfilesControls from "./ZoneProfiles/ZoneProfilesControls"
import type { MapWasteFilter } from "./utils/types"

export interface MapVisualProps {
    fullContainersCount: number
    simulatedClock: string
    currentZoom?: number
    wasteFilter: MapWasteFilter
    onWasteFilterChange: (filter: MapWasteFilter) => void
    zoneProfilesVisible: boolean
    zoneProfilesLoading: boolean
    onToggleZoneProfiles: () => void
    onZoomIn?: () => void
    onZoomOut?: () => void
    className?: string
}

export default function MapVisual({
    fullContainersCount,
    simulatedClock,
    wasteFilter,
    onWasteFilterChange,
    zoneProfilesVisible,
    zoneProfilesLoading,
    onToggleZoneProfiles,
    className = "",
}: MapVisualProps) {
    return (
        <div className={`absolute top-3 left-14 z-[1000] flex flex-wrap items-center gap-3 ${className}`}>
            {/* Pestaña flotante: Contenedores al 100% */}
            <div
                className="bg-white/95 backdrop-blur-md border border-slate-200/80 hover:border-red-300 text-slate-800 px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-2.5 transition-all hover:shadow-lg select-none"
                title="Contenedores al 100% de capacidad que inician desborde hacia sitios de enfrente"
            >
                <div className="relative flex items-center justify-center">
                    <span className="flex h-2.5 w-2.5 relative">
                        {fullContainersCount > 0 && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        )}
                        <span
                            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                                fullContainersCount > 0 ? "bg-red-500" : "bg-emerald-500"
                            }`}
                        />
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        {fullContainersCount > 0 && <AlertTriangle className="w-2.5 h-2.5 text-red-500" />}
                        Al 100%
                    </span>
                    <span
                        className={`text-base font-extrabold leading-tight ${
                            fullContainersCount > 0 ? "text-red-600 font-mono" : "text-slate-700 font-mono"
                        }`}
                    >
                        {fullContainersCount}
                    </span>
                </div>
            </div>

            {/* Reloj de tiempo simulado */}
            <div className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-1.5 text-sm shadow-md backdrop-blur">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-sky-600" />
                    Reloj de Simulación
                </p>
                <p className="font-semibold text-slate-900 leading-tight">
                    {simulatedClock}
                </p>
            </div>

            {/* Controles de perfiles de zona */}
            <ZoneProfilesControls
                visible={zoneProfilesVisible}
                loading={zoneProfilesLoading}
                onToggle={onToggleZoneProfiles}
            />

            {/* Filtros dinámicos de tipo de residuo */}
            <div className="rounded-xl border border-slate-200/80 bg-white/95 p-1 shadow-md backdrop-blur flex items-center gap-1">
                {[
                    { value: 'all', label: 'Todos', icon: Layers },
                    { value: 'organico', label: 'Húmedos', icon: Trash2 },
                    { value: 'reciclaje', label: 'Reciclables', icon: Recycle },
                ].map(({ value, label, icon: Icon }) => (
                    <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={wasteFilter === value ? 'default' : 'ghost'}
                        onClick={() => onWasteFilterChange(value as MapWasteFilter)}
                        className={`h-7 px-2.5 text-xs font-semibold gap-1 rounded-lg cursor-pointer ${
                            wasteFilter === value
                                ? 'bg-sky-600 text-white hover:bg-sky-700 shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                        <Icon className="w-3 h-3" />
                        {label}
                    </Button>
                ))}
            </div>
        </div>
    )
}
