import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import type { MutableRefObject } from "react"
import { useNavigate } from "react-router-dom"
import { MapContainer, Marker, Popup, TileLayer, Polyline, useMapEvents } from "react-leaflet"
import { labels } from "./utils/types"
import type { Container, Site } from "./utils/types"
import { fetchContainersBBox, getContainerFetchConfigByZoom, groupContainersBySite, createMapPinIcon, colorForLevel } from "./utils/functions"
import type { Map as LeafletMap } from 'leaflet'
import { api } from '@/lib/api'

interface ActiveSimulation {
    status: 'pending' | 'running' | 'paused' | 'stopping' | 'completed' | 'failed'
    simulated_time: string | null
}

export interface MapRedistributionMove {
    container_id: number
    from_site_id: number
    from_site_name: string
    to_site_id: number
    to_site_name: string
    distance_km: number
    from_lat?: number
    from_lng?: number
    to_lat?: number
    to_lng?: number
}

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
    containers?: Container[]
    redistributionMoves?: MapRedistributionMove[]
    highlightedMoveId?: number | null
}

export default function InteractiveMap({
    refreshTrigger = 0,
    containers: propContainers,
    redistributionMoves,
    highlightedMoveId,
}: InteractiveMapProps) {
    const [containers, setContainers] = useState<Container[]>([])
    const [zoom, setZoom] = useState<number>(13)
    const [activeSimulation, setActiveSimulation] = useState<ActiveSimulation | null>(null)
    const navigate = useNavigate()
    const mapRef = useRef<LeafletMap | null>(null)
    const pendingRef = useRef<Map<string, Promise<Container[]>>>(new Map())
    const debounceRef = useRef<number | null>(null)
    const mountedRef = useRef(true)
    const latestRequestIdRef = useRef<number>(0)
    const prevContainersLevelMapRef = useRef<Map<string, number>>(new Map())

    const fetchForBounds = useCallback(async (lat_min: number, lat_max: number, lng_min: number, lng_max: number, zoom: number) => {
        const requestId = ++latestRequestIdRef.current
        const { backendZoom, limit } = { backendZoom: zoom, limit: 2000 }

        const key = `${lat_min.toFixed(5)}_${lat_max.toFixed(5)}_${lng_min.toFixed(5)}_${lng_max.toFixed(5)}_${backendZoom}`
        // Si ya hay una petición en curso para esa key, espera a que termine
        const pending = pendingRef.current.get(key)
        if (pending) {
            try {
                const data = await pending
                if (mountedRef.current && requestId === latestRequestIdRef.current) {
                    setContainers(data)
                }
            } catch (e) {
                console.error('Error awaiting pending fetch', e)
            }
            return
        }

        // Petición en vivo al backend
        const promise = fetchContainersBBox(lat_min, lat_max, lng_min, lng_max, backendZoom, limit)
        pendingRef.current.set(key, promise)

        try {
            const data = await promise
            if (mountedRef.current && requestId === latestRequestIdRef.current) {
                // Registrar cambios de nivel de llenado para los contenedores visualizados
                data.forEach((c) => {
                    prevContainersLevelMapRef.current.set(c.id, c.currentLevel)
                })

                setContainers(data)
            }
        } catch (e) {
            console.error('Error al cargar contenedores:', e)
        } finally {
            pendingRef.current.delete(key)
        }
    }, [])

    const fetchForMap = useCallback((map: LeafletMap) => {
        if (debounceRef.current) {
            window.clearTimeout(debounceRef.current)
        }

        debounceRef.current = window.setTimeout(() => {
            const bounds = map.getBounds()
            const sw = bounds.getSouthWest()
            const ne = bounds.getNorthEast()
            const zoom = map.getZoom()
            const { boundsPadding } = getContainerFetchConfigByZoom(zoom)
            const latPadding = (ne.lat - sw.lat) * boundsPadding
            const lngPadding = (ne.lng - sw.lng) * boundsPadding

            void fetchForBounds(
                sw.lat - latPadding,
                ne.lat + latPadding,
                sw.lng - lngPadding,
                ne.lng + lngPadding,
                zoom
            )
        }, 250)
    }, [fetchForBounds])

    useEffect(() => {
        if (propContainers) {
            return
        }
        mountedRef.current = true

        if (mapRef.current) {
            const map = mapRef.current
            const bounds = map.getBounds()
            const sw = bounds.getSouthWest()
            const ne = bounds.getNorthEast()
            const currentZoom = map.getZoom()
            const { boundsPadding } = getContainerFetchConfigByZoom(currentZoom)
            const latPadding = (ne.lat - sw.lat) * boundsPadding
            const lngPadding = (ne.lng - sw.lng) * boundsPadding

            void fetchForBounds(
                sw.lat - latPadding,
                ne.lat + latPadding,
                sw.lng - lngPadding,
                ne.lng + lngPadding,
                currentZoom
            )
        } else {
            void fetchForBounds(-90, 90, -180, 180, 5)
        }

        return () => {
            mountedRef.current = false
            const currentDebounce = debounceRef.current
            if (currentDebounce) {
                window.clearTimeout(currentDebounce)
            }
        }
    }, [refreshTrigger, fetchForBounds, propContainers])

    useEffect(() => {
        let cancelled = false

        const fetchActiveSimulation = async () => {
            try {
                const data = await api.get<ActiveSimulation>('/digital-twin/simulations/active')
                if (!cancelled) {
                    setActiveSimulation(data)
                }
            } catch {
                if (!cancelled) {
                    setActiveSimulation(null)
                }
            }
        }

        void fetchActiveSimulation()
        const intervalId = window.setInterval(fetchActiveSimulation, 2000)

        return () => {
            cancelled = true
            window.clearInterval(intervalId)
        }
    }, [])

    const simulatedClock = useMemo(() => {
        if (!activeSimulation?.simulated_time) {
            return 'No active simulation'
        }

        return new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(activeSimulation.simulated_time))
    }, [activeSimulation?.simulated_time])

    // Agrupamiento del lado del cliente cuando se pasan contenedores estáticos (propContainers)
    // Emula el ST_SnapToGrid de la base de datos con los mismos niveles de cuadrícula por zoom.
    const displayContainers = useMemo(() => {
        if (!propContainers) {
            return containers
        }

        const getGridSize = (z: number): number | null => {
            if (z < 11) return 0.15
            if (z < 13) return 0.05
            if (z < 15) return 0.015
            if (z < 17) return 0.003
            return null
        }

        const gridSize = getGridSize(zoom)
        if (gridSize === null) {
            return propContainers
        }

        const groups: Record<string, Container[]> = {}
        propContainers.forEach((c) => {
            const snapLat = Math.round(c.lat / gridSize)
            const snapLong = Math.round(c.long / gridSize)
            const cellKey = `${snapLat}_${snapLong}`
            if (!groups[cellKey]) {
                groups[cellKey] = []
            }
            groups[cellKey].push(c)
        })

        const clustered: Container[] = []
        Object.entries(groups).forEach(([cellKey, cellContainers]) => {
            if (cellContainers.length === 1) {
                clustered.push(cellContainers[0])
            } else {
                let sumLat = 0
                let sumLong = 0
                cellContainers.forEach((c) => {
                    sumLat += c.lat
                    sumLong += c.long
                })
                const avgLat = sumLat / cellContainers.length
                const avgLong = sumLong / cellContainers.length

                clustered.push({
                    id: `cluster-${cellKey}`,
                    siteId: `cluster-${cellKey}`,
                    lat: avgLat,
                    long: avgLong,
                    type: 'indiferenciado',
                    color: '#6b7280',
                    currentLevel: Math.round(
                        cellContainers.reduce((sum, c) => sum + c.currentLevel, 0) / cellContainers.length
                    ),
                    description: String(cellContainers.length),
                })
            }
        })

        return clustered
    }, [propContainers, containers, zoom])

    // Calcular sitios agrupados. Se recalcula automáticamente cuando cambian los contenedores
    const sites: Site[] = useMemo(() => {
        return groupContainersBySite(displayContainers)
    }, [displayContainers])

    // Centro del mapa en CABA
    const cabaCenter: [number, number] = [-34.6037, -58.3816]

    return (
        <div className="h-full w-full relative">
            <div className="pointer-events-none absolute right-3 top-3 z-[1000]">
                <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow-md backdrop-blur">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Simulated Time
                    </p>
                    <p className="font-semibold text-slate-900">
                        {simulatedClock}
                    </p>
                    {activeSimulation?.status && (
                        <p className="text-xs capitalize text-slate-500">
                            {activeSimulation.status}
                        </p>
                    )}
                </div>
            </div>

            <MapContainer
                center={cabaCenter}
                zoom={13}
                className="h-full w-full relative"
                maxZoom={21}
                minZoom={10}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={21}
                    maxNativeZoom={19}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                <MapViewportController
                    mapRef={mapRef}
                    debounceRef={debounceRef}
                    fetchForMap={fetchForMap}
                    onZoomChange={setZoom}
                />

                {sites.map((site) => {
                    const isCluster = site.containers.length === 1 && String(site.containers[0].id).startsWith('cluster-')
                    const clusterTotal = isCluster ? Number(site.containers[0].description) || 1 : 0
                    const containerCount = isCluster ? clusterTotal : site.containers.length
                    const siteLevel = site.currentLevel

                    const handleMarkerClick = () => {
                        const map = mapRef.current
                        if (!map) return

                        if (isCluster) {
                            const currentZoom = map.getZoom()
                            const targetZoom = Math.min(map.getMaxZoom(), Math.max(currentZoom + 3, 13))
                            map.flyTo([site.lat, site.long], targetZoom, { animate: true })
                        }
                    }
                    const siteKey = `${site.id}-${site.color}-${site.containers.map((c) => c.description).join('-')}`
                    if (!isCluster) {
                        return (
                            <Marker
                                key={siteKey}
                                position={[site.lat, site.long]}
                                icon={createMapPinIcon(site.color, containerCount)}
                                eventHandlers={{ click: handleMarkerClick }}
                            >
                                <Popup>
                                    <div className="p-2 space-y-2 max-w-xs">
                                        <h3 className="font-bold text-sm border-b pb-1">
                                            Sitio - {labels[site.type]}
                                        </h3>
                                        <p className="text-xs">
                                            <strong>Total:</strong> {containerCount} contenedor{containerCount > 1 ? "es" : ""}
                                        </p>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <strong>Nivel actual</strong>
                                                <span className="font-bold">{siteLevel}%</span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${Math.min(100, Math.max(0, siteLevel))}%`,
                                                        backgroundColor: colorForLevel(siteLevel),
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs">
                                            <strong>Coordenadas:</strong> ({site.lat.toFixed(6)}, {site.long.toFixed(6)})
                                        </p>

                                        <div className="border-t pt-1">
                                            <p className="text-xs font-semibold mb-1">Contenedores:</p>
                                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                                {site.containers.map((container) => (
                                                    <div key={container.id} className="h-full p-1  text-xs rounded-md bg-gray-100">
                                                        <p className="font-semibold">ID: {container.id}</p>
                                                        <p className="font-semibold">Descripción: {container.description}</p>
                                                        <p className="font-semibold">Tipo: {labels[container.type]}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/map/sites/${site.id}`)}
                                            className="mt-2 w-full rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                                        >
                                            Ver detalle del sitio
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    }
                    else {
                        return (
                            <Marker
                                key={siteKey}
                                position={[site.lat, site.long]}
                                icon={createMapPinIcon(site.color, containerCount)}
                                eventHandlers={{ click: handleMarkerClick }}
                            />
                        )
                    }
                })}

                {redistributionMoves && redistributionMoves.map((m) => {
                    if (m.from_lat == null || m.from_lng == null || m.to_lat == null || m.to_lng == null) return null
                    const isSelected = highlightedMoveId === m.container_id
                    return (
                        <Polyline
                            key={`opt-move-${m.container_id}`}
                            positions={[[m.from_lat, m.from_lng], [m.to_lat, m.to_lng]]}
                            pathOptions={{
                                color: isSelected ? '#2563eb' : '#4f46e5',
                                weight: isSelected ? 5 : 3.5,
                                dashArray: '6, 8',
                                opacity: isSelected ? 1 : 0.85,
                            }}
                        >
                            <Popup>
                                <div className="p-2 space-y-1.5 min-w-[200px] text-xs">
                                    <div className="font-bold text-indigo-700 border-b pb-1">
                                        Traslado Contenedor #{m.container_id}
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-semibold">Origen: </span>
                                        <span className="font-medium text-slate-800">{m.from_site_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-semibold">Destino: </span>
                                        <span className="font-medium text-slate-800">{m.to_site_name}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-600 font-mono pt-1 border-t">
                                        Distancia: <strong>{m.distance_km.toFixed(2)} km</strong> ({Math.round(m.distance_km * 1000)} m)
                                    </div>
                                </div>
                            </Popup>
                        </Polyline>
                    )
                })}
            </MapContainer>

        </div>
    )
}
