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
            className={`rounded-xl border px-3.5 py-1.5 text-sm shadow-md backdrop-blur transition-all flex flex-col items-start select-none ${
                visible
                    ? "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-white/95 border-slate-200/80 text-slate-800 hover:border-indigo-300"
            }`}
        >
            <span className={`text-[9px] font-bold uppercase tracking-wider ${visible ? "text-indigo-200" : "text-slate-400"}`}>
                Perfiles de zona
            </span>
            <span className="font-semibold leading-tight">
                {loading ? "Cargando…" : visible ? "Activado" : "Desactivado"}
            </span>
        </button>
    )
}
