import { useTranslation } from "react-i18next"
import { ZONE_TYPE_COLORS, labelForZoneType } from "@/utils/functions"
import { AlertCircle, Layers } from "lucide-react"

interface ZoneProfilesLegendProps {
    visible: boolean
    error: string | null
}

// Banner de error + leyenda de colores de la capa de perfiles de zona.
// Se posiciona como overlay del mapa completo (debe ser hijo directo del
// contenedor raíz del mapa, no de la fila de badges, o el `absolute` queda
// mal anclado).
export default function ZoneProfilesLegend({ visible, error }: ZoneProfilesLegendProps) {
    const { t } = useTranslation()

    return (
        <>
            {error && (
                <div className="absolute top-16 left-14 z-[1000] rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-1.5 shadow-md flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {visible && (
                <div className="absolute bottom-6 right-4 z-[1000] rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-md backdrop-blur">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {t('zone_profiles.legend_title')}
                    </p>

                    <div className="space-y-1">
                        {Object.entries(ZONE_TYPE_COLORS).map(([zoneType, color]) => (
                            <div key={zoneType} className="flex items-center gap-2 text-xs text-slate-700">
                                <span
                                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                                    style={{ backgroundColor: color, opacity: 0.75 }}
                                />
                                {t(`zone_profiles.types.${zoneType}`, { defaultValue: labelForZoneType(zoneType) })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}
