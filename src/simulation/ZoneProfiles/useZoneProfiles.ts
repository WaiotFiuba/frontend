import { useCallback, useRef, useState } from "react"
import type { Path, PathOptions } from "leaflet"
import { fetchZoneProfiles } from "@/utils/functions"
import type { ZoneProfileCollection } from "@/utils/types"

export interface SelectedZoneRef {
    layer: Path
    normalStyle: PathOptions
}

// Estado y carga (perezosa, cacheada) de la capa de perfiles de zona del
// mapa. El dataset es estático, así que se pide una sola vez, la primera
// vez que el usuario activa la capa.
export function useZoneProfiles() {
    const [visible, setVisible] = useState(false)
    const [data, setData] = useState<ZoneProfileCollection | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Radio actualmente resaltado por click, para poder devolverlo a su
    // estilo normal cuando se selecciona otro (o se apaga la capa).
    const selectedZoneRef = useRef<SelectedZoneRef | null>(null)

    const toggle = useCallback(() => {
        setVisible((prev) => {
            const next = !prev
            if (!next) {
                selectedZoneRef.current = null
            }
            if (next && !data && !loading) {
                setLoading(true)
                setError(null)
                fetchZoneProfiles()
                    .then((result) => setData(result))
                    .catch(() => setError("No se pudieron cargar los perfiles de zona."))
                    .finally(() => setLoading(false))
            }
            return next
        })
    }, [data, loading])

    return { visible, data, loading, error, toggle, selectedZoneRef }
}
