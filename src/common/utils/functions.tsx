import L from "leaflet"
import { renderToStaticMarkup } from "react-dom/server"
import { Container, Site, ContainerType, ZoneProfileCollection, ZoneType } from "./types"
import { api } from "../../lib/api"

// Colores por tipo de zona para la capa de perfiles de zona del mapa.
// Solo los zone_type que realmente aparecen clasificados en
// land_use_by_radio.csv (ninguno de los 3.820 radios cae en "residential"
// genérico: ese nombre solo existe como fallback interno de
// ZoneClassifier.get_profile() por nombre directo, no por clasificación real).
export const ZONE_TYPE_COLORS: Record<string, string> = {
    residential_multifamily: "#2563eb",
    residential_singlefamily: "#38bdf8",
    commercial: "#f59e0b",
    office: "#a855f7",
    industrial: "#ef4444",
    mixed: "#10b981",
}

export const ZONE_TYPE_LABELS: Record<string, string> = {
    residential_multifamily: "Residencial multifamiliar",
    residential_singlefamily: "Residencial unifamiliar",
    commercial: "Comercial",
    office: "Oficinas",
    industrial: "Industrial",
    mixed: "Mixta",
}

export const colorForZoneType = (zoneType: ZoneType): string =>
    ZONE_TYPE_COLORS[zoneType] ?? "#94a3b8"

export const labelForZoneType = (zoneType: ZoneType): string =>
    ZONE_TYPE_LABELS[zoneType] ?? zoneType

// Trae los polígonos de radio censal con su perfil de zona. Es un dataset
// estático (no cambia durante la sesión), así que el llamador lo pide una
// sola vez al activar la capa y lo cachea.
export const fetchZoneProfiles = async (): Promise<ZoneProfileCollection> => {
    return api.get<ZoneProfileCollection>("/map/zone-profiles/radios")
}

export type ContainerFetchZoomConfig = {
    backendZoom: number
    boundsPadding: number
    limit: number
}

// Ajustá esta función para cambiar cuánto área y cuántos resultados pide el mapa según el zoom.
export const getContainerFetchConfigByZoom = (zoom: number): ContainerFetchZoomConfig => {
    const normalizedZoom = Math.max(0, Math.floor(zoom))

    if (normalizedZoom >= 16) {
        return { backendZoom: normalizedZoom, boundsPadding: 0.02, limit: 1000 }
    }

    if (normalizedZoom >= 14) {
        return { backendZoom: Math.max(0, normalizedZoom), boundsPadding: 0.06, limit: 1000 }
    }

    if (normalizedZoom >= 12) {
        return { backendZoom: Math.max(0, normalizedZoom), boundsPadding: 0.25, limit: 200 }
    }

    return { backendZoom: Math.max(0, normalizedZoom), boundsPadding: 0.25, limit: 200 }
}

export const formatSimulatedTime = (isoString?: string | null): string => {
    if (!isoString) return 'Sin simulación activa'
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return 'Sin simulación activa'
    return date.toLocaleString('es-AR', {
        timeZone: 'UTC',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export const colorForLevel = (level: number) => {
    if (level >= 80) return "#ef4444"
    if (level >= 50) return "#f59e0b"
    return "#10b981"
}

export const containerTypeForWaste = (rawType?: string | null, rawWaste?: string | null): ContainerType => {
    const value = `${rawType ?? ""} ${rawWaste ?? ""}`.toLowerCase()
    if (value.includes("seca") || value.includes("recicl") || value.includes("verde")) {
        return "reciclaje"
    }
    if (value.includes("humeda") || value.includes("húmeda") || value.includes("hÃºmeda") || value.includes("organico")) {
        return "organico"
    }
    return "indiferenciado"
}

// Devuelve sitios directos en el area dada, o clusters si hay demasiados para mostrar
export const fetchSitesBBox = async (
    lat_min: number,
    lat_max: number,
    lng_min: number,
    lng_max: number,
    zoom: number,
    limit = 2000,
    distribution: 'real' | 'whatif' = 'real'
): Promise<Site[]> => {
    try {
        const params = new URLSearchParams({
            lat_min: String(lat_min),
            lat_max: String(lat_max),
            lng_min: String(lng_min),
            lng_max: String(lng_max),
            zoom: String(zoom),
            limit: String(limit),
            distribution: distribution,
        })

        const url = `/map/sites/bbox?${params.toString()}`
        const data = await api.get<Array<Record<string, unknown>>>(url)

        if (!Array.isArray(data) || data.length === 0) {
            return []
        }

        // Si la respuesta es de tipo cluster (zoom bajo con count o total)
        if (data[0].count != null || data[0].total != null) {
            return data.map((cl, idx) => {
                const count = (cl.count as number | undefined) ?? (cl.total as number | undefined) ?? 1
                const avgLevel = (cl.avg_level as number | undefined) ?? 0
                const lat = Number(cl.latitude ?? 0)
                const lon = Number(cl.longitude ?? 0)
                const clusterId = (cl.cluster_id as string | undefined) || `cluster-${lat.toFixed(4)}_${lon.toFixed(4)}_${idx}`

                return {
                    id: clusterId,
                    name: `Cluster (${count} sitios)`,
                    address: null,
                    lat: lat,
                    long: lon,
                    type: 'indiferenciado' as ContainerType,
                    color: colorForLevel(avgLevel),
                    currentLevel: avgLevel,
                    avgLevel: avgLevel,
                    containerCount: count,
                    containers: [],
                    isCluster: true,
                }
            })
        }

        // Si la respuesta son Sitios completos (zoom alto con lista de containers completa)
        return data.map((s) => {
            const avgLevel = Number(s.current_level ?? 0)
            const lat = Number(s.latitude ?? 0)
            const lon = Number(s.longitude ?? 0)
            const siteContainers = Array.isArray(s.containers) ? (s.containers as Array<Record<string, unknown>>) : []

            const containers: Container[] = siteContainers.map((c) => {
                let type: ContainerType = "indiferenciado"
                const typeName = String(c.container_type || "").toLowerCase()
                if (typeName.includes("seca") || typeName.includes("reciclaje")) {
                    type = "reciclaje"
                } else if (typeName.includes("humeda") || typeName.includes("húmeda") || typeName.includes("organico")) {
                    type = "organico"
                }

                const cLevel = Number(c.current_level ?? avgLevel)
                return {
                    id: String(c.id),
                    siteId: String(s.id),
                    lat: lat,
                    long: lon,
                    type: type,
                    color: colorForLevel(cLevel),
                    currentLevel: cLevel,
                    level: cLevel,
                    description: String(c.container_type || 'Contenedor'),
                }
            })

            const siteName = (s.name as string) || (s.address as string) || `Sitio #${s.id}`
            const siteAddress = (s.address as string) || null

            return {
                id: String(s.id),
                name: siteName,
                address: siteAddress,
                lat: lat,
                long: lon,
                type: containers.length > 0 ? containers[0].type : 'indiferenciado',
                color: colorForLevel(avgLevel),
                currentLevel: avgLevel,
                avgLevel: avgLevel,
                containerCount: (s.container_count as number | undefined) ?? siteContainers.length,
                containers: containers,
                isCluster: false,
            }
        })
    } catch (error) {
        console.warn('Error obteniendo sitios:', error)
        return []
    }
}

const pinTypeAccent = (type: ContainerType) => {
    if (type === "reciclaje") {
        return { color: "#047857", label: "R" }
    }
    if (type === "organico") {
        return { color: "#111827", label: "H" }
    }
    return { color: "#64748b", label: "" }
}

// PROVISIONAL HASTA ENCONTRAR UNA LIBRERIA DE ICONOS PERSONALIZABLE
export const createMapPinIcon = (color: string, containerCount: number = 1, type: ContainerType = "indiferenciado") => {
    const size = containerCount >= 100 ? 92 : containerCount >= 25 ? 80 : containerCount > 1 ? 70 : 56
    const countFontSize = containerCount >= 100 ? 22 : containerCount >= 25 ? 19 : containerCount > 1 ? 16 : 15
    const countY = containerCount >= 100 ? 28 : containerCount >= 25 ? 28 : 27
    const accent = pinTypeAccent(type)

    const iconHtml = renderToStaticMarkup(
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ overflow: 'visible' }}
        >
            <path
                d="M32 4C21.4 4 12.8 12.6 12.8 23.2C12.8 37.6 32 60 32 60C32 60 51.2 37.6 51.2 23.2C51.2 12.6 42.6 4 32 4Z"
                fill={color}
                stroke={accent.color}
                strokeWidth="4.25"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
            />
            <path
                d="M22 45C25.3 50.5 29.5 56.1 32 60C34.5 56.1 38.7 50.5 42 45Z"
                fill={accent.color}
                opacity="1"
            />
            <circle cx="32" cy="23" r="11" fill="rgba(17, 24, 39, 0.30)" />
            <text
                x="32"
                y={countY}
                textAnchor="middle"
                fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
                fontSize={countFontSize}
                fontWeight="800"
                fill="white"
                stroke="rgba(17, 24, 39, 0.75)"
                strokeWidth="1.25"
                paintOrder="stroke"
            >
                {containerCount}
            </text>
            {accent.label && (
                <text
                    x="32"
                    y="54"
                    textAnchor="middle"
                    fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
                    fontSize="9"
                    fontWeight="900"
                    fill="white"
                >
                    {accent.label}
                </text>
            )}
        </svg>
    )

    return L.divIcon({ html: iconHtml, iconSize: [size, size], iconAnchor: [size / 2, size], popupAnchor: [0, -size / 1.2], className: "bg-transparent border-none", })
}

export const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    if (lat1 === lat2 && lng1 === lng2) return 0
    const dLng = (lng2 - lng1) * (Math.PI / 180)
    const lat1Rad = lat1 * (Math.PI / 180)
    const lat2Rad = lat2 * (Math.PI / 180)
    const y = Math.sin(dLng) * Math.cos(lat2Rad)
    const x =
        Math.cos(lat1Rad) * Math.sin(lat2Rad) -
        Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng)
    const brng = Math.atan2(y, x) * (180 / Math.PI)
    return (brng + 360) % 360
}

export const createArrowIcon = (bearing: number, isSelected: boolean) => {
    const color = isSelected ? '#2563eb' : '#4f46e5'
    const size = isSelected ? 24 : 18
    const half = size / 2
    const path = isSelected
        ? 'M 12 0 L 21 20 L 12 15 L 3 20 Z'
        : 'M 9 0 L 16 15 L 9 11.5 L 2 15 Z'

    const html = `
        <svg
            width="${size}"
            height="${size}"
            viewBox="0 0 ${size} ${size}"
            style="overflow: visible; display: block; transform: rotate(${bearing}deg); transform-origin: ${half}px 0px;"
        >
            <path
                d="${path}"
                fill="${color}"
                stroke="#ffffff"
                stroke-width="${isSelected ? 2 : 1.5}"
                stroke-linejoin="round"
                filter="drop-shadow(0 1px 2px rgba(0,0,0,0.3))"
            />
        </svg>
    `

    return L.divIcon({
        html,
        className: 'bg-transparent border-none pointer-events-none',
        iconSize: [size, size],
        iconAnchor: [half, 0],
    })
}
