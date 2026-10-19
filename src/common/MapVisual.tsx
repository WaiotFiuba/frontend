import { useTranslation } from "react-i18next"
import { Button } from "@/utils/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/utils/ui/tooltip"
import {
    Layers,
    Trash2,
    Recycle,
    AlertTriangle,
} from "lucide-react"
import ZoneProfilesControls from "./ZoneProfiles/ZoneProfilesControls"
import type { MapWasteFilter } from "@/utils/types"

export interface MapVisualProps {
    fullContainersCount: number
    showFullContainersCount?: boolean
    currentZoom?: number
    wasteFilter: MapWasteFilter
    onWasteFilterChange: (filter: MapWasteFilter) => void
    zoneProfilesVisible: boolean
    zoneProfilesLoading: boolean
    onToggleZoneProfiles: () => void
    availableWasteTypes?: string[]
    onZoomIn?: () => void
    onZoomOut?: () => void
    className?: string
}

export default function MapVisual({
    fullContainersCount,
    showFullContainersCount = true,
    wasteFilter,
    onWasteFilterChange,
    zoneProfilesVisible,
    zoneProfilesLoading,
    onToggleZoneProfiles,
    availableWasteTypes,
    className = "",
}: MapVisualProps) {
    const { t } = useTranslation()

    return (
        <div className={`absolute top-3 left-14 z-[1000] flex flex-wrap items-center gap-3 ${className}`}>
            {/* Pestaña flotante: Contenedores al 100% */}
            {showFullContainersCount && <div
                className="bg-white/95 backdrop-blur-md border border-slate-200/80 hover:bg-slate-100 text-slate-800 px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-2.5 transition-all select-none cursor-default"
                title={t('map.full_alert_tooltip')}
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
                        {t('map.full_alert')}
                    </span>
                    <span
                        className={`text-base font-extrabold leading-tight ${
                            fullContainersCount > 0 ? "text-red-600 font-mono" : "text-slate-700 font-mono"
                        }`}
                    >
                        {fullContainersCount}
                    </span>
                </div>
            </div>}

            {/* Controles de perfiles de zona */}
            <ZoneProfilesControls
                visible={zoneProfilesVisible}
                loading={zoneProfilesLoading}
                onToggle={onToggleZoneProfiles}
            />

            {/* Filtros dinámicos de tipo de residuo */}
            <TooltipProvider delayDuration={150}>
                <div className="rounded-xl border border-slate-200/80 bg-white/95 p-1 shadow-md backdrop-blur flex items-center gap-1">
                    {[
                        { value: 'all', label: t('common.all'), icon: Layers },
                        { value: 'organico', label: t('map.organic'), icon: Trash2 },
                        { value: 'reciclaje', label: t('map.recyclable'), icon: Recycle },
                    ].map(({ value, label, icon: Icon }) => {
                        const isDisabled =
                            value !== 'all' &&
                            availableWasteTypes != null &&
                            !availableWasteTypes.includes(value)

                        const buttonNode = (
                            <Button
                                key={value}
                                type="button"
                                size="sm"
                                disabled={isDisabled}
                                variant={wasteFilter === value ? 'default' : 'ghost'}
                                onClick={() => onWasteFilterChange(value as MapWasteFilter)}
                                className={`h-7 px-2.5 text-xs font-semibold gap-1 rounded-lg transition-all ${
                                    isDisabled
                                        ? 'opacity-40 cursor-not-allowed text-slate-400 pointer-events-none'
                                        : wasteFilter === value
                                        ? 'bg-sky-600 text-white hover:bg-sky-700 shadow-sm cursor-pointer'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
                                }`}
                            >
                                <Icon className="w-3 h-3" />
                                {label}
                            </Button>
                        )

                        if (isDisabled) {
                            return (
                                <Tooltip key={value}>
                                    <TooltipTrigger asChild>
                                        <span className="inline-flex cursor-not-allowed" tabIndex={0}>
                                            {buttonNode}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs font-medium">
                                        {t('map.waste_type_unavailable', { type: label.toLowerCase() })}
                                    </TooltipContent>
                                </Tooltip>
                            )
                        }

                        return buttonNode
                    })}
                </div>
            </TooltipProvider>
        </div>
    )
}
