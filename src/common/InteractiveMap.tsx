import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import type { MutableRefObject } from "react"
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet"
import { Container, Site, labels } from "./utils/types"
import { fetchContainersBBox, getContainerFetchConfigByZoom, groupContainersBySite, createMapPinIcon } from "./utils/functions"
import type { Map as LeafletMap } from 'leaflet'

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
                    const match = c.description.match(/Nivel:\s*(\d+)%/)
                    const currentLevel = match ? Number(match[1]) : 0
                    prevContainersLevelMapRef.current.set(c.id, currentLevel)
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
            {/* Pestaña flotante a la izquierda: Contenedores al 100% */}
            <div
                className="absolute top-3 left-14 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200/80 hover:border-red-300 text-slate-800 px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-2.5 transition-all hover:shadow-lg select-none"
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
                                        {site.avgLevel !== undefined && (
                                            <p className="text-xs">
                                                <strong>Nivel promedio:</strong>{" "}
                                                <span className="font-bold" style={{ color: site.color }}>
                                                    {site.avgLevel}%
                                                </span>
                                            </p>
                                        )}
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

        </div>
    )
}