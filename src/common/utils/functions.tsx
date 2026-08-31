import L from "leaflet"
import { renderToStaticMarkup } from "react-dom/server"
import type { BackendCluster, BackendContainer, Container, ContainerType, Site } from "./types"
import { api } from "../../lib/api"

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
                currentLevel: 0,
                containers: [],
            }
        }

        sitesMap[siteId].containers.push(container)
    })

    return Object.values(sitesMap).map((site) => {
        const totalLevel = site.containers.reduce((sum, c) => sum + c.currentLevel, 0)
        const currentLevel = site.containers.length > 0
            ? Math.round(totalLevel / site.containers.length)
            : 0

        return {
            ...site,
            currentLevel,
            color: colorForLevel(currentLevel),
        }
    })
}

export const colorForLevel = (level: number) => {
    if (level >= 80) return "#ef4444"
    if (level >= 50) return "#f59e0b"
    return "#10b981"
}

// Devuelve contendeores en el area dada, o clusters si hay demasiados contenedores para mostrar
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

        // Determine if response is clusters (has total) or containers (has id)
        if (Array.isArray(data) && data.length > 0 && (data[0] as BackendCluster).total != null) {
            // clusters
            const clusters = data as BackendCluster[]
            return clusters.map((cl) => {
                const avgLevel = cl.avg_level ?? 0

                const clusterId = `cluster-${cl.latitude.toFixed(4)}_${cl.longitude.toFixed(4)}`
                return {
                    id: clusterId,
                    siteId: clusterId,
                    lat: cl.latitude,
                    long: cl.longitude,
                    type: 'indiferenciado',
                    color: colorForLevel(avgLevel),
                    description: `Cluster (${cl.total} cont.) (Nivel: ${avgLevel}%)`,
                    currentLevel: avgLevel,
                }
            })
        }

        return (data as BackendContainer[]).map((c) => {
            let type: ContainerType = "indiferenciado"

            const typeName = (c.container_type?.name || "").toLowerCase()
            if (typeName.includes("seca") || typeName.includes("reciclaje")) {
                type = "reciclaje"
            } else if (typeName.includes("humeda") || typeName.includes("húmeda") || typeName.includes("organico")) {
                type = "organico"
            }

            // Color basado en el nivel de llenado
            const level = c.current_level ?? 0

            return {
                id: String(c.id),
                siteId: String(c.site_id ?? c.id),
                lat: c.latitude,
                long: c.longitude,
                type: type,
                color: colorForLevel(level),
                description: `${c.site_name || 'Contenedor'} - ${c.container_type?.name || 'Genérico'} (Nivel: ${level}%)`,
                currentLevel: level,
            } as Container
        })
    } catch (error) {
        console.warn('Error obteniendo los contenedores:', error)
        return []
    }
}


//PROVISIONAL HASTA ENCONTRAR UNA LIBRERIA DE ICONOS PERSONALIZABLE
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
            style={{ overflow: 'visible' }}
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

    return L.divIcon({ html: iconHtml, iconSize: [size, size], iconAnchor: [size / 2, size], popupAnchor: [0, -size / 1.2], className: "bg-transparent border-none", })
}
