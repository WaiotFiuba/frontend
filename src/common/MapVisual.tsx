import type { ReactNode } from "react"
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
} from "lucide-react"
import type { MapWasteFilter } from "@/utils/types"

export interface MapVisualProps {
    currentZoom?: number
    wasteFilter: MapWasteFilter
    onWasteFilterChange: (filter: MapWasteFilter) => void
    // Botones que agrega la página a la barra (por ejemplo, los del simulador).
    extraControls?: ReactNode
    availableWasteTypes?: string[]
    onZoomIn?: () => void
    onZoomOut?: () => void
    className?: string
}

export default function MapVisual({
    wasteFilter,
    onWasteFilterChange,
    extraControls,
    availableWasteTypes,
    className = "",
}: MapVisualProps) {
    const { t } = useTranslation()

    return (
        <div className={`absolute top-3 left-14 z-[1000] flex flex-wrap items-center gap-3 ${className}`}>
            {extraControls}

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
