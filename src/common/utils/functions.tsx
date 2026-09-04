import L from "leaflet"
import { renderToStaticMarkup } from "react-dom/server"
import { Container, Site, ContainerType } from "./types"
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
                currentLevel: container.currentLevel ?? container.level ?? 0,
                avgLevel: container.currentLevel ?? container.level ?? 0,
                containers: [],
            }
        }

        sitesMap[siteId].containers.push(container)
    })

    return Object.values(sitesMap).map((site) => {
        const totalLevel = site.containers.reduce(
            (sum, c) => sum + (c.currentLevel ?? c.level ?? 0),
            0
        )
        const currentLevel = site.containers.length > 0
            ? Math.round(totalLevel / site.containers.length)
            : 0

        return {
            ...site,
            currentLevel,
            avgLevel: currentLevel,
            containerCount: site.containers.length,
            color: colorForLevel(currentLevel),
        }
    })
}

// Devuelve sitios/contenedores en el area dada, o clusters si hay demasiados para mostrar
export const fetchContainersBBox = async (
    lat_min: number,
    lat_max: number,
    lng_min: number,
    lng_max: number,
    zoom: number,
    limit = 2000
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
                    siteId: clusterId,
                    lat: lat,
                    long: lon,
                    type: 'indiferenciado' as ContainerType,
                    color: colorForLevel(avgLevel),
                    currentLevel: avgLevel,
                    level: avgLevel,
                    description: String(count),
                }
            })
        }

        // Si la respuesta son Sitios completos (zoom alto con lista de containers completa)
        const resultContainers: Container[] = []

        data.forEach((s) => {
            const avgLevel = Number(s.current_level ?? 0)
            const lat = Number(s.latitude ?? 0)
            const lon = Number(s.longitude ?? 0)
            const siteContainers = Array.isArray(s.containers) && s.containers.length > 0 ? (s.containers as Array<Record<string, unknown>>) : []

            if (siteContainers.length === 0) {
                resultContainers.push({
                    id: `site-${s.id}-c1`,
                    siteId: String(s.id),
                    lat: lat,
                    long: lon,
                    type: 'indiferenciado',
                    color: colorForLevel(avgLevel),
                    currentLevel: avgLevel,
                    level: avgLevel,
                    description: `${(s.name as string) || (s.address as string) || 'Sitio'} (Nivel: ${avgLevel}%)`
                })
            } else {
                siteContainers.forEach((c) => {
                    let type: ContainerType = "indiferenciado"
                    const typeName = String(c.container_type || "").toLowerCase()
                    if (typeName.includes("seca") || typeName.includes("reciclaje")) {
                        type = "reciclaje"
                    } else if (typeName.includes("humeda") || typeName.includes("húmeda") || typeName.includes("organico")) {
                        type = "organico"
                    }

                    const cLevel = Number(c.current_level ?? avgLevel)
                    resultContainers.push({
                        id: String(c.id),
                        siteId: String(s.id),
                        lat: lat,
                        long: lon,
                        type: type,
                        color: colorForLevel(cLevel),
                        currentLevel: cLevel,
                        level: cLevel,
                        description: String(c.container_type || 'Contenedor'),
                    })
                })
            }
        })

        return resultContainers
    } catch (error) {
        console.warn('Error obteniendo sitios/contenedores:', error)
        return []
    }
}

// PROVISIONAL HASTA ENCONTRAR UNA LIBRERIA DE ICONOS PERSONALIZABLE
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
