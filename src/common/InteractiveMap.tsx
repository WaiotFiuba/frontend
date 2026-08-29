import { useCallback, useEffect, useState, useRef } from "react"
import type { MutableRefObject } from "react"
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet"
import {
    Container,
    BackendSite,
    SiteCluster,
    LevelAggregation,
} from "./utils/types"
import {
    fetchSitesBBox,
    fetchSitesChanges,
    createMapPinIcon,
    getLevelColor,
} from "./utils/functions"
import type { Map as LeafletMap } from "leaflet"
import { Layers } from "lucide-react"

function MapViewportController({
    mapRef,
    debounceRef,
    fetchForMap,
    onZoomChange,
}: {
    mapRef: MutableRefObject<LeafletMap | null>
    debounceRef: MutableRefObject<number | null>
    fetchForMap: (map: LeafletMap) => void
    onZoomChange?: (zoom: number) => void
}) {
    const map = useMapEvents({
        moveend: () => {
            mapRef.current = map
            fetchForMap(map)
        },
        zoomend: () => {
            mapRef.current = map
            fetchForMap(map)
            if (onZoomChange) {
                onZoomChange(map.getZoom())
            }
        },
    })

    useEffect(() => {
        mapRef.current = map
        const currentDebounce = debounceRef.current
        fetchForMap(map)
        if (onZoomChange) {
            onZoomChange(map.getZoom())
        }

        return () => {
            if (currentDebounce) {
                window.clearTimeout(currentDebounce)
            }
            mapRef.current = null
        }
    }, [map, mapRef, debounceRef, fetchForMap, onZoomChange])

    return null
}

interface InteractiveMapProps {
    refreshTrigger?: number
    levelAggregation?: LevelAggregation
    onLevelAggregationChange?: (agg: LevelAggregation) => void
    containers?: Container[]
}

export default function InteractiveMap({
    refreshTrigger = 0,
    levelAggregation = "avg",
    onLevelAggregationChange,
    containers: propContainers,
}: InteractiveMapProps) {
    const [sites, setSites] = useState<BackendSite[]>([])
    const [clusters, setClusters] = useState<SiteCluster[]>([])
    const [zoom, setZoom] = useState<number>(13)
    const [currentAgg, setCurrentAgg] = useState<LevelAggregation>(levelAggregation)

    const mapRef = useRef<LeafletMap | null>(null)
    const cacheRef = useRef<Map<string, (BackendSite | SiteCluster)[]>>(new Map())
    const pendingRef = useRef<Map<string, Promise<(BackendSite | SiteCluster)[]>>>(new Map())
    const debounceRef = useRef<number | null>(null)
    const mountedRef = useRef(true)
    const latestRequestIdRef = useRef<number>(0)
    const latestCursorRef = useRef<number>(0)

    useEffect(() => {
        if (levelAggregation !== currentAgg) {
            setCurrentAgg(levelAggregation)
            cacheRef.current.clear()
            if (mapRef.current) {
                fetchForMap(mapRef.current)
            }
        }
    }, [levelAggregation])

    const handleAggChange = (newAgg: LevelAggregation) => {
        setCurrentAgg(newAgg)
        cacheRef.current.clear()
        if (onLevelAggregationChange) {
            onLevelAggregationChange(newAgg)
        }
        if (mapRef.current) {
            fetchForMap(mapRef.current)
        }
    }

    const processResults = (items: (BackendSite | SiteCluster)[]) => {
        if (!items || items.length === 0) {
            setSites([])
            setClusters([])
            return
        }

        const first = items[0]
        if ("cluster_id" in first) {
            setClusters(items as SiteCluster[])
            setSites([])
        } else {
            setSites(items as BackendSite[])
            setClusters([])
        }
    }

    const fetchForBounds = useCallback(
        async (
            lat_min: number,
            lat_max: number,
            lng_min: number,
            lng_max: number,
            currentZoom: number
        ) => {
            const requestId = ++latestRequestIdRef.current
            const key = `${lat_min.toFixed(4)}_${lat_max.toFixed(4)}_${lng_min.toFixed(4)}_${lng_max.toFixed(4)}_${currentZoom}_${currentAgg}`

            const cached = cacheRef.current.get(key)
            if (cached) {
                if (mountedRef.current && requestId === latestRequestIdRef.current) {
                    processResults(cached)
                }
                return
            }

            const pending = pendingRef.current.get(key)
            if (pending) {
                try {
                    const data = await pending
                    if (mountedRef.current && requestId === latestRequestIdRef.current) {
                        processResults(data)
                    }
                } catch (e) {
                    console.error("Error en petición pendiente:", e)
                }
                return
            }

            const promise = fetchSitesBBox(
                lat_min,
                lat_max,
                lng_min,
                lng_max,
                currentZoom,
                currentAgg,
                2000
            )
            pendingRef.current.set(key, promise)

            try {
                const data = await promise
                cacheRef.current.set(key, data)
                if (mountedRef.current && requestId === latestRequestIdRef.current) {
                    processResults(data)
                }
            } catch (error) {
                console.error("Error al cargar sitios:", error)
            } finally {
                pendingRef.current.delete(key)
            }
        },
        [currentAgg]
    )

    const fetchForMap = useCallback(
        (map: LeafletMap) => {
            if (propContainers) return

            if (debounceRef.current) {
                window.clearTimeout(debounceRef.current)
            }

            debounceRef.current = window.setTimeout(() => {
                const bounds = map.getBounds()
                const currentZoom = map.getZoom()
                const sw = bounds.getSouthWest()
                const ne = bounds.getNorthEast()

                const boundsPadding = 0.05
                const latPadding = (ne.lat - sw.lat) * boundsPadding
                const lngPadding = (ne.lng - sw.lng) * boundsPadding

                void fetchForBounds(
                    sw.lat - latPadding,
                    ne.lat + latPadding,
                    sw.lng - lngPadding,
                    ne.lng + lngPadding,
                    currentZoom
                )
            }, 250)
        },
        [fetchForBounds, propContainers]
    )

    // Polling reactivo para simulación activa
    useEffect(() => {
        let isPolling = true
        const interval = setInterval(async () => {
            if (!isPolling || zoom < 18) return
            const changes = await fetchSitesChanges(latestCursorRef.current, currentAgg, 500)
            if (changes && changes.sites.length > 0) {
                latestCursorRef.current = changes.latest_cursor
                setSites((prevSites) => {
                    const changesMap = new Map(changes.sites.map((s) => [s.id, s]))
                    return prevSites.map((s) => changesMap.get(s.id) || s)
                })
            }
        }, 2500)

        return () => {
            isPolling = false
            clearInterval(interval)
        }
    }, [currentAgg, zoom])

    useEffect(() => {
        if (propContainers) return
        mountedRef.current = true
        cacheRef.current.clear()

        if (mapRef.current) {
            fetchForMap(mapRef.current)
        } else {
            void fetchForBounds(-34.70, -34.50, -58.55, -58.30, 13)
        }

        return () => {
            mountedRef.current = false
            if (debounceRef.current) {
                window.clearTimeout(debounceRef.current)
            }
        }
    }, [refreshTrigger, fetchForBounds, fetchForMap, propContainers])

    const cabaCenter: [number, number] = [-34.6037, -58.3816]

    return (
        <div className="relative h-full w-full">
            {/* Control Flotante de Agregación (Promedio vs Máximo) */}
            <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-md border border-slate-200/80 flex items-center space-x-2 text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    Nivel Sitio:
                </span>
                <button
                    onClick={() => handleAggChange("avg")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        currentAgg === "avg"
                            ? "bg-blue-600 text-white shadow-sm font-semibold"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                    Promedio (avg)
                </button>
                <button
                    onClick={() => handleAggChange("max")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        currentAgg === "max"
                            ? "bg-blue-600 text-white shadow-sm font-semibold"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                    Máximo (max)
                </button>
            </div>

            <MapContainer
                center={cabaCenter}
                zoom={13}
                className="h-full w-full"
                maxZoom={19}
                minZoom={10}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                <MapViewportController
                    mapRef={mapRef}
                    debounceRef={debounceRef}
                    fetchForMap={fetchForMap}
                    onZoomChange={setZoom}
                />

                {/* Renderizado de Clusters (Zoom < 18) */}
                {clusters.map((cluster) => {
                    const color = "#6b7280"
                    const handleClusterClick = () => {
                        const map = mapRef.current
                        if (!map) return
                        const currentZoom = map.getZoom()
                        const nextZoom = Math.min(map.getMaxZoom(), Math.max(currentZoom + 3, 18))
                        map.flyTo([cluster.latitude, cluster.longitude], nextZoom, { animate: true })
                    }

                    return (
                        <Marker
                            key={cluster.cluster_id}
                            position={[cluster.latitude, cluster.longitude]}
                            icon={createMapPinIcon(color, cluster.count)}
                            eventHandlers={{ click: handleClusterClick }}
                        />
                    )
                })}

                {/* Renderizado de Sitios Físicos (Zoom >= 18) */}
                {sites.map((site) => {
                    const levelColor = getLevelColor(site.current_level)
                    const containerCount = site.containers?.length || site.container_count || 1

                    return (
                        <Marker
                            key={`site-${site.id}`}
                            position={[site.latitude, site.longitude]}
                            icon={createMapPinIcon(levelColor, containerCount)}
                        >
                            <Popup>
                                <div className="p-2 space-y-2 max-w-xs text-slate-800">
                                    <h3 className="font-bold text-sm border-b pb-1 text-slate-900">
                                        {site.name}
                                    </h3>
                                    <p className="text-xs">
                                        <strong>Total:</strong> {containerCount} contenedor{containerCount > 1 ? "es" : ""}
                                    </p>
                                    {site.address && (
                                        <p className="text-xs">
                                            <strong>Dirección:</strong> {site.address}
                                        </p>
                                    )}
                                    {site.load_side_category && (
                                        <p className="text-xs">
                                            <strong>Lado de carga:</strong> {site.load_side_category}
                                        </p>
                                    )}
                                    <p className="text-xs">
                                        <strong>Nivel ({currentAgg === "max" ? "Máximo" : "Promedio"}):</strong>{" "}
                                        <span className="font-bold" style={{ color: levelColor }}>
                                            {site.current_level}%
                                        </span>
                                    </p>

                                    {site.containers && site.containers.length > 0 && (
                                        <div className="border-t pt-1">
                                            <p className="text-xs font-semibold mb-1">Contenedores:</p>
                                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                                {site.containers.map((container) => (
                                                    <div
                                                        key={container.id}
                                                        className="p-1.5 text-xs rounded-md bg-gray-100 space-y-0.5"
                                                    >
                                                        <p className="font-semibold text-slate-800">
                                                            ID: #{container.id} {container.serie_id ? `(${container.serie_id})` : ""}
                                                        </p>
                                                        {container.container_type && (
                                                            <p className="text-slate-600">Tipo: {container.container_type}</p>
                                                        )}
                                                        <p className="text-slate-700">
                                                            Llenado:{" "}
                                                            <strong style={{ color: getLevelColor(container.current_level) }}>
                                                                {container.current_level}%
                                                            </strong>
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}
            </MapContainer>
        </div>
    )
}