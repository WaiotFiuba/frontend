import L from "leaflet"
import { renderToStaticMarkup } from "react-dom/server"
import {
    BackendCluster,
    BackendContainer,
    BackendContainerChanges,
    BackendContainerSnapshot,
    Container,
    Site,
} from "./types"
import { api } from "../../../lib/api"

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

export type ContainerBounds = {
    lat_min: number
    lat_max: number
    lng_min: number
    lng_max: number
}

export type ContainerSnapshot = {
    cursor: number
    containers: Container[]
    clustered: boolean
}

const containerParams = (
    bounds: ContainerBounds,
    extra: Record<string, string>,
) => new URLSearchParams({
    lat_min: String(bounds.lat_min),
    lat_max: String(bounds.lat_max),
    lng_min: String(bounds.lng_min),
    lng_max: String(bounds.lng_max),
    ...extra,
})

const mapBackendContainer = (container: BackendContainer): Container => {
    const typeName = (container.container_type?.name ?? 'indiferenciado').toString().toLowerCase()
    const currentLevel = container.current_level ?? 0
    const color = currentLevel >= 80
        ? '#ef4444'
        : currentLevel >= 50
            ? '#f59e0b'
            : '#10b981'

    return {
        id: String(container.id),
        siteId: String(container.site_id ?? container.id),
        lat: container.latitude,
        long: container.longitude,
        type: typeName as Container["type"],
        color,
        description: '',
        currentLevel,
        available: container.available,
        deviceImei: container.device_imei ?? undefined,
        zone: container.zone ?? undefined,
        wasteTypes: container.container_type?.waste_types
            ?.map((wasteType) => wasteType.name)
            .filter((name): name is string => Boolean(name)),
        lastReading: container.last_reading ?? undefined,
        updatedAt: container.updated_at ?? undefined,
    }
}

const mapClusters = (clusters: BackendCluster[]): Container[] => clusters.map((cluster, index) => ({
    id: `cluster-${index}`,
    siteId: `cluster-${index}`,
    lat: cluster.latitude,
    long: cluster.longitude,
    type: 'indiferenciado',
    color: '#6b7280',
    description: String(cluster.total),
}))

export const fetchContainersSnapshot = async (
    bounds: ContainerBounds,
    zoom: number,
    limit = 500
): Promise<ContainerSnapshot> => {
    const params = containerParams(bounds, {
        zoom: String(zoom),
        limit: String(limit),
    })
    const snapshot = await api.get<BackendContainerSnapshot>(
        `/map/containers/bbox/snapshot?${params.toString()}`,
    )
    const clustered = snapshot.clusters.length > 0
    return {
        cursor: snapshot.cursor,
        clustered,
        containers: clustered
            ? mapClusters(snapshot.clusters)
            : snapshot.containers.map(mapBackendContainer),
    }
}

export const fetchContainerChanges = async (
    bounds: ContainerBounds,
    after: number,
    limit = 2000,
): Promise<{ cursor: number; containers: Container[] }> => {
    const params = containerParams(bounds, {
        after: String(after),
        limit: String(limit),
    })
    const changes = await api.get<BackendContainerChanges>(
        `/map/containers/changes?${params.toString()}`,
    )
    return {
        cursor: changes.cursor,
        containers: changes.containers.map(mapBackendContainer),
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
