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
    return (
        <button
            type="button"
            onClick={onToggle}
            disabled={loading}
            title="Mostrar/ocultar perfiles de zona por radio censal"
            className={`cursor-pointer disabled:cursor-not-allowed rounded-xl border px-3.5 py-1.5 text-sm shadow-md backdrop-blur transition-all flex flex-col items-start select-none ${
                visible
                    ? "bg-emerald-200 border-emerald-300 text-emerald-950 hover:bg-emerald-300 shadow-xs"
                    : "bg-white/95 border-slate-200/80 text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/40"
            }`}
        >
            <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${visible ? "text-emerald-800" : "text-slate-400"}`}>
                {loading ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                    <Layers className="w-2.5 h-2.5" />
                )}
                Perfiles de zona
            </span>
            <span className={`font-semibold leading-tight text-xs mt-0.5 ${visible ? "text-emerald-950 font-bold" : ""}`}>
                {loading ? "Cargando…" : visible ? "Activado" : "Desactivado"}
            </span>
        </button>
    )
}

