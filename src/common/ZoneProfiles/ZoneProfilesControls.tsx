import { useTranslation } from "react-i18next"
import { Layers, Loader2 } from "lucide-react"

interface ZoneProfilesControlsProps {
    visible: boolean
    loading: boolean
    onToggle: () => void
}

// Botón toggle (apagado por defecto) para la capa de perfiles de zona.
// Pensado para ubicarse como un ítem más dentro de la fila de badges
// flotante del mapa (no lleva posicionamiento propio).
export default function ZoneProfilesControls({ visible, loading, onToggle }: ZoneProfilesControlsProps) {
    const { t } = useTranslation()

    return (
        <button
            type="button"
            onClick={onToggle}
            disabled={loading}
            title={t('zone_profiles.toggle_tooltip')}
            className={`cursor-pointer disabled:cursor-not-allowed rounded-xl border px-3.5 py-1.5 text-sm shadow-md backdrop-blur transition-all flex flex-col items-start select-none ${
                visible
                    ? "bg-sky-600 border-sky-600 text-white hover:bg-sky-700 shadow-sm"
                    : "bg-white/95 border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
        >
            <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${visible ? "text-sky-100" : "text-slate-400"}`}>
                {loading ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                    <Layers className="w-2.5 h-2.5" />
                )}
                {t('map.zone_profiles')}
            </span>
            <span className={`font-semibold leading-tight text-xs mt-0.5 ${visible ? "text-white font-bold" : "text-slate-800"}`}>
                {loading ? t('zone_profiles.loading') : visible ? t('zone_profiles.active') : t('zone_profiles.inactive')}
            </span>
        </button>
    )
}

