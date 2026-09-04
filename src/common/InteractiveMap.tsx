import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import type { MutableRefObject } from "react"
import { useNavigate } from "react-router-dom"
import { MapContainer, Marker, Popup, TileLayer, Polyline, useMapEvents } from "react-leaflet"
import { labels } from "./utils/types"
import type { Container, Site, RouteDetails } from "./utils/types"
import { fetchContainersBBox, getContainerFetchConfigByZoom, groupContainersBySite, createMapPinIcon, colorForLevel, formatSimulatedTime } from "./utils/functions"
import type { Map as LeafletMap } from 'leaflet'
import { api } from '@/lib/api'

interface ActiveSimulation {
    status: 'pending' | 'running' | 'paused' | 'stopping' | 'completed' | 'failed'
    simulated_time: string | null
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
}

export default function InteractiveMap({ refreshTrigger = 0, containers: propContainers }: InteractiveMapProps) {
    const [containers, setContainers] = useState<Container[]>([])
    const [zoom, setZoom] = useState<number>(13)
    const [activeSimulation, setActiveSimulation] = useState<ActiveSimulation | null>(null)
    const [selectedRoute, setSelectedRoute] = useState<RouteDetails | null>(null)

    const navigate = useNavigate()
    const mapRef = useRef<LeafletMap | null>(null)
    const debounceRef = useRef<number | null>(null)
    const mountedRef = useRef(true)
    const latestRequestIdRef = useRef<number>(0)
    const prevContainersLevelMapRef = useRef<Map<string, number>>(new Map())
    const activeSimulationRef = useRef<ActiveSimulation | null>(null)

    const fetchForBounds = useCallback(async (lat_min: number, lat_max: number, lng_min: number, lng_max: number, zoom: number) => {

        const requestId = ++latestRequestIdRef.current
        const { backendZoom, limit } = { backendZoom: zoom, limit: 2000 }

        try {
            const data = await fetchContainersBBox(lat_min, lat_max, lng_min, lng_max, backendZoom, limit)
            if (mountedRef.current && requestId === latestRequestIdRef.current) {
                const backendTime = activeSimulationRef.current?.simulated_time ?? 'Sin simulación'
                const frontSimTime = formatSimulatedTime(activeSimulationRef.current?.simulated_time)
                const frontClock = new Date().toLocaleTimeString()

                // Registrar cambios de nivel de llenado para los contenedores visualizados
                data.forEach((c) => {
                    const prevLevel = prevContainersLevelMapRef.current.get(c.id)
                    const isTarget = c.id.includes('332') || String(c.siteId).includes('332') || c.description?.includes('DEGLIOUMINI')

                    if (isTarget) {
                        console.log(
                            `%c[FRONTEND TELEMETRIA RECIBIDA - SITIO 332]\n` +
                            `  • Contenedor: id=${c.id} (sitio=${c.siteId}, desc=${c.description})\n` +
                            `  • Nivel actual: ${c.currentLevel}% | Nivel previo: ${prevLevel !== undefined ? prevLevel + '%' : 'inicial'}\n` +
                            `  • Hora Backend (simulada): ${backendTime}\n` +
                            `  • Hora Front (reloj simulado): ${frontSimTime}\n` +
                            `  • Hora Front (reloj local navegador): ${frontClock}`,
                            'color: #0284c7; font-weight: bold;'
                        )
                    }

                    if (prevLevel !== undefined && prevLevel >= 50 && c.currentLevel <= 15) {
                        console.log(
                            `%c[FRONTEND VACIADO DETECTADO]\n` +
                            `  • Contenedor: ${c.id} (${c.description ?? ''})\n` +
                            `  • Nivel: ${prevLevel}% -> ${c.currentLevel}%\n` +
                            `  • Hora Backend (simulada): ${backendTime}\n` +
                            `  • Hora Front (reloj simulado): ${frontSimTime}\n` +
                            `  • Hora Front (reloj local navegador): ${frontClock}`,
                            'color: #16a34a; font-weight: bold; font-size: 13px;'
                        )
                    }
                    prevContainersLevelMapRef.current.set(c.id, c.currentLevel)
                })

                setContainers(data)
            }
        } catch (e) {
            console.error('Error al cargar contenedores:', e)
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
                    activeSimulationRef.current = data
                    setActiveSimulation(data)
                }
            } catch {
                if (!cancelled) {
                    activeSimulationRef.current = null
                    setActiveSimulation(null)
                }
            }
        }

        void fetchActiveSimulation()
        const intervalId = window.setInterval(fetchActiveSimulation, 800)

        return () => {
            cancelled = true
            window.clearInterval(intervalId)
        }
    }, [])


    // Refrescar automáticamente los contenedores visibles cuando avanza la simulación
    useEffect(() => {
        if (!mapRef.current || propContainers) return
        const map = mapRef.current
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
    }, [activeSimulation?.simulated_time, activeSimulation?.status, fetchForBounds, propContainers])

    const simulatedClock = useMemo(
        () => formatSimulatedTime(activeSimulation?.simulated_time),
        [activeSimulation?.simulated_time]
    )

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

    // Cantidad de contenedores al 100% (en riesgo de colapso/desborde)
    const fullContainersCount = useMemo(() => {
        return containers.filter((c) => {
            if (c.level !== undefined) {
                return c.level >= 100
            }
            const match = c.description.match(/Nivel:\s*(\d+)%/)
            return match ? Number(match[1]) >= 100 : false
        }).length
    }, [containers])

    // Centro del mapa en CABA
    const cabaCenter: [number, number] = [-34.6037, -58.3816]

    return (
        <div className="h-full w-full relative">
            <div className="absolute top-3 left-14 z-[1000] flex gap-3">
                {/* Pestaña flotante: Contenedores al 100% */}
                <div
                    className="bg-white/95 backdrop-blur-md border border-slate-200/80 hover:border-red-300 text-slate-800 px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-2.5 transition-all hover:shadow-lg select-none"
                    title="Contenedores al 100% de capacidad que inician desborde hacia sitios de enfrente"
                >
                    <div className="relative flex items-center justify-center">
                        <span className="flex h-2.5 w-2.5 relative">
                            {fullContainersCount > 0 && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            )}
                            <span
                                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                                    fullContainersCount > 0 ? "bg-red-500" : "bg-emerald-500"
                                }`}
                            ></span>
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Al 100%
                        </span>
                        <span
                            className={`text-base font-extrabold leading-tight ${
                                fullContainersCount > 0 ? "text-red-600 font-mono" : "text-slate-700 font-mono"
                            }`}
                        >
                            {fullContainersCount}
                        </span>
                    </div>
                </div>

                {/* Reloj de tiempo simulado */}
                <div className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-1.5 text-sm shadow-md backdrop-blur">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Simulated Clock
                    </p>
                    <p className="font-semibold text-slate-900 leading-tight">
                        {simulatedClock}
                    </p>
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

                {/* Trazado de circuito seleccionado */}
                {selectedRoute && selectedRoute.waypoints.length > 0 && (
                    <Polyline
                        positions={selectedRoute.waypoints}
                        pathOptions={{
                            color: "#2563eb",
                            weight: 5,
                            opacity: 0.85,
                            dashArray: "8, 6",
                        }}
                    />
                )}

                {sites.map((site) => {
                    const isCluster = site.containers.length === 1 && String(site.containers[0].id).startsWith('cluster-')
                    const clusterTotal = isCluster ? Number(site.containers[0].description) || 1 : 0
                    const containerCount = isCluster ? clusterTotal : site.containers.length
                    const siteLevel = site.currentLevel ?? site.avgLevel ?? 0

                    const handleMarkerClick = () => {
                        const map = mapRef.current
                        if (!map) return

                        if (isCluster) {
                            const currentZoom = map.getZoom()
                            const targetZoom = Math.min(map.getMaxZoom(), Math.max(currentZoom + 3, 13))
                            map.flyTo([site.lat, site.long], targetZoom, { animate: true })
                        }
                    }
                    const siteKey = site.id
                    if (!isCluster) {
                        return (
                            <Marker
                                key={siteKey}
                                position={[site.lat, site.long]}
                                icon={createMapPinIcon(site.color, containerCount)}
                                eventHandlers={{ click: handleMarkerClick }}
                            >
                                <Popup>
                                    <div className="p-2 space-y-2.5 max-w-xs min-w-[220px]">
                                        <div className="border-b pb-1.5 flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-sm text-slate-900 leading-tight">
                                                    Sitio #{site.id}
                                                </h3>
                                                <p className="text-[11px] text-slate-500 font-medium">
                                                    {labels[site.type]} • {containerCount} cont.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-600 font-medium">Nivel promedio:</span>
                                                <span className="font-bold font-mono" style={{ color: colorForLevel(siteLevel) }}>
                                                    {siteLevel}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${Math.min(100, Math.max(0, siteLevel))}%`,
                                                        backgroundColor: colorForLevel(siteLevel),
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="border-t pt-2">
                                            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                                Contenedores
                                            </p>
                                            <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                                                {site.containers.map((container) => {
                                                    const cLevel = container.currentLevel ?? container.level ?? 0
                                                    const cColor = colorForLevel(cLevel)
                                                    return (
                                                        <div
                                                            key={container.id}
                                                            className="px-2 py-1 text-xs rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                                                        >
                                                            <div className="truncate">
                                                                <span className="font-semibold text-slate-800">#{container.id}</span>
                                                                <span className="text-slate-500 ml-1 text-[11px] truncate">
                                                                    {container.description}
                                                                </span>
                                                            </div>
                                                            <span
                                                                className="font-bold text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0"
                                                                style={{
                                                                    color: cColor,
                                                                    backgroundColor: `${cColor}18`,
                                                                }}
                                                            >
                                                                {cLevel}%
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => navigate(`/map/sites/${site.id}`)}
                                            className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-sm"
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
            </MapContainer>

            {/* Panel flotante de métricas de optimización ATSP/DRPP */}
            {selectedRoute && (
                <div style={{
                    position: 'absolute',
                    bottom: '24px',
                    left: '24px',
                    zIndex: 1000,
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    backdropFilter: 'blur(8px)',
                    color: 'white',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                    maxWidth: '320px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: '#60a5fa' }}>
                            🗺️ Circuito #{selectedRoute.route_id} (OR-Tools)
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedRoute(null)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
                        >
                            ✕
                        </button>
                    </div>
                    <div style={{ fontSize: '11px', lineHeight: '1.6', color: '#cbd5e1' }}>
                        <div><strong>Servicio:</strong> {selectedRoute.service_name}</div>
                        <div><strong>Distancia Total:</strong> {((selectedRoute.total_distance_m || 0) / 1000).toFixed(2)} km</div>
                        <div><strong>Recolección Efectiva:</strong> {((selectedRoute.collection_distance_m || 0) / 1000).toFixed(2)} km</div>
                        <div><strong>Traslado (Deadheading):</strong> {((selectedRoute.deadheading_distance_m || 0) / 1000).toFixed(2)} km</div>
                        <div><strong>Tramos Repetidos:</strong> {selectedRoute.repeated_segments_count || 0}</div>
                    </div>
                </div>
            )}

        </div>
    )
}
