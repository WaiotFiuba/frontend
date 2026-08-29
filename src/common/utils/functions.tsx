import L from "leaflet"
import { renderToStaticMarkup } from "react-dom/server"
import {
    Container,
    Site,
    ContainerType,
    BackendContainer,
    BackendCluster,
    BackendSite,
    SiteCluster,
    SiteChanges,
    LevelAggregation,
} from "./types"
import { api } from "../../lib/api"

export type ContainerFetchZoomConfig = {
    backendZoom: number
    boundsPadding: number
    limit: number
}

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

/**
 * Consulta la API de sitios por bounding box y nivel de zoom.
 * En zoom >= 18 devuelve BackendSite[], en zoom < 18 devuelve SiteCluster[].
 */
export const fetchSitesBBox = async (
    lat_min: number,
    lat_max: number,
    lng_min: number,
    lng_max: number,
    zoom: number,
    levelAggregation: LevelAggregation = "avg",
    limit = 2000
): Promise<(BackendSite | SiteCluster)[]> => {
    try {
        const params = new URLSearchParams({
            lat_min: String(lat_min),
            lat_max: String(lat_max),
            lng_min: String(lng_min),
            lng_max: String(lng_max),
            zoom: String(zoom),
            level_aggregation: levelAggregation,
            limit: String(limit),
        })

        const url = `/map/sites/bbox?${params.toString()}`
        return await api.get<(BackendSite | SiteCluster)[]>(url)
    } catch (error) {
        console.warn("Error obteniendo sitios por bbox:", error)
        return []
    }
}

/**
 * Consulta cambios incrementales en sitios a partir de un cursor.
 */
export const fetchSitesChanges = async (
    afterCursor: number,
    levelAggregation: LevelAggregation = "avg",
    limit = 5000
): Promise<SiteChanges | null> => {
    try {
        const params = new URLSearchParams({
            after: String(afterCursor),
            level_aggregation: levelAggregation,
            limit: String(limit),
        })
        const url = `/map/sites/changes?${params.toString()}`
        return await api.get<SiteChanges>(url)
    } catch (error) {
        console.warn("Error obteniendo cambios de sitios:", error)
        return null
    }
}

export const groupContainersBySite = (containers: Container[]): Site[] => {
    const sitesMap: Record<string, Site> = {}

    containers.forEach((container) => {
        const { siteId } = container

        if (!sitesMap[siteId]) {
            sitesMap[siteId] = {
                id: siteId,
                lat: container.lat,
                long: container.long,
                type: container.type,
                color: container.color,
                containers: [],
            }
        }

        sitesMap[siteId].containers.push(container)
    })

    const colorPriority: Record<string, number> = {
        "#ef4444": 3,
        "#f59e0b": 2,
        "#10b981": 1,
    }

    Object.values(sitesMap).forEach((site) => {
        const counts: Record<string, number> = {}
        site.containers.forEach((c) => {
            counts[c.color] = (counts[c.color] || 0) + 1
        })

        let majorityColor = site.containers[0]?.color || "#10b981"
        let maxCount = 0

        Object.entries(counts).forEach(([color, count]) => {
            if (count > maxCount) {
                maxCount = count
                majorityColor = color
            } else if (count === maxCount) {
                const currentPri = colorPriority[color] || 0
                const majorityPri = colorPriority[majorityColor] || 0
                if (currentPri > majorityPri) {
                    majorityColor = color
                }
            }
        })

        site.color = majorityColor
    })

    return Object.values(sitesMap)
}

// Devuelve contenedores en el area dada (compatibilidad hacia atras)
export const fetchContainersBBox = async (
    lat_min: number,
    lat_max: number,
    lng_min: number,
    lng_max: number,
    zoom: number,
    limit = 500
): Promise<Container[]> => {
    try {
        const params = new URLSearchParams({
            lat_min: String(lat_min),
            lat_max: String(lat_max),
            lng_min: String(lng_min),
            lng_max: String(lng_max),
            zoom: String(zoom),
            limit: String(limit),
        })

        const url = `/map/containers/bbox?${params.toString()}`
        const data = await api.get<BackendContainer[] | BackendCluster[]>(url)

        if (Array.isArray(data) && data.length > 0 && (data[0] as BackendCluster).total != null) {
            const clusters = data as BackendCluster[]
            return clusters.map((cl, idx) => ({
                id: `cluster-${idx}`,
                siteId: `cluster-${idx}`,
                lat: cl.latitude,
                long: cl.longitude,
                type: "indiferenciado",
                color: "#6b7280",
                description: String(cl.total),
            }))
        }

        return (data as BackendContainer[]).map((c) => {
            let type: ContainerType = "indiferenciado"

            const typeName = (c.container_type?.name || "").toLowerCase()
            if (typeName.includes("seca") || typeName.includes("reciclaje")) {
                type = "reciclaje"
            } else if (typeName.includes("humeda") || typeName.includes("húmeda") || typeName.includes("organico")) {
                type = "organico"
            }

            const level = c.current_level ?? 0
            let color = "#10b981"
            if (level >= 80) {
                color = "#ef4444"
            } else if (level >= 50) {
                color = "#f59e0b"
            }

            return {
                id: String(c.id),
                siteId: String(c.site_id ?? c.id),
                lat: c.latitude,
                long: c.longitude,
                type: type,
                color: color,
                description: `${c.site_name || "Contenedor"} - ${c.container_type?.name || "Genérico"} (Nivel: ${level}%)`,
            } as Container
        })
    } catch (error) {
        console.warn("Error obteniendo los contenedores:", error)
        return []
    }
}

export const getLevelColor = (level: number): string => {
    if (level >= 80) return "#ef4444" // Rojo (>=80%)
    if (level >= 50) return "#f59e0b" // Naranja (50-79%)
    return "#10b981" // Verde (<50%)
}

export const createMapPinIcon = (color: string, containerCount: number = 1) => {
    const size = containerCount >= 100 ? 92 : containerCount >= 25 ? 80 : containerCount > 1 ? 70 : 56
    const countFontSize = containerCount >= 100 ? 22 : containerCount >= 25 ? 19 : 16
    const countY = containerCount >= 100 ? 28 : containerCount >= 25 ? 28 : 27

    const iconHtml = renderToStaticMarkup(
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ overflow: "visible" }}
        >
            <path
                d="M32 4C21.4 4 12.8 12.6 12.8 23.2C12.8 37.6 32 60 32 60C32 60 51.2 37.6 51.2 23.2C51.2 12.6 42.6 4 32 4Z"
                fill={color}
                stroke="white"
                strokeWidth="1.5"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
            />
            <circle cx="32" cy="23" r="11" fill="rgba(17, 24, 39, 0.30)" />
            <circle cx="32" cy="23" r="6" fill="white" opacity={containerCount > 1 ? 0.0 : 1.0} />
            {containerCount > 1 && (
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
            )}
        </svg>
    )

    return L.divIcon({
        html: iconHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size / 1.2],
        className: "bg-transparent border-none",
    })
}
