import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import type { MutableRefObject } from "react"
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet"
import { Container, Site } from "./utils/types"
import {
    createMapPinIcon,
    fetchContainerChanges,
    fetchContainersSnapshot,
    getContainerFetchConfigByZoom,
    groupContainersBySite,
} from "./utils/functions"
import type { ContainerBounds } from "./utils/functions"
import type { Map as LeafletMap } from 'leaflet'

type Viewport = ContainerBounds & {
    incremental: boolean
}

const formatContainerDate = (value?: string) => {
    if (!value) return "Sin datos"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "medium",
    })
}

function MapViewportController({
    mapRef,
    debounceRef,
    fetchForMap,
}: {
    mapRef: MutableRefObject<LeafletMap | null>
    debounceRef: MutableRefObject<number | null>
    fetchForMap: (map: LeafletMap) => void
}) {
    const map = useMapEvents({
        moveend: () => {
            mapRef.current = map
            fetchForMap(map)
        },
        zoomend: () => {
            mapRef.current = map
            fetchForMap(map)
        },
    })

    useEffect(() => {
        mapRef.current = map
        const currentDebounce = debounceRef.current
        fetchForMap(map)

        return () => {
            if (currentDebounce) {
                window.clearTimeout(currentDebounce)
            }
            mapRef.current = null
        }
    }, [map, mapRef, debounceRef, fetchForMap])

    return null
}

interface InteractiveMapProps {
    isSimulationActive?: boolean
    simulationInterval?: number
}

export default function InteractiveMap({ isSimulationActive = false, simulationInterval = 5000 }: InteractiveMapProps) {
    const [containers, setContainers] = useState<Container[]>([])
    const mapRef = useRef<LeafletMap | null>(null)
    const debounceRef = useRef<number | null>(null)
    const mountedRef = useRef(true)
    const cursorRef = useRef(0)
    const viewportRef = useRef<Viewport | null>(null)
    const requestVersionRef = useRef(0)
    const pollingRef = useRef(false)

    const fetchForBounds = useCallback(async (lat_min: number, lat_max: number, lng_min: number, lng_max: number, zoom: number) => {
        const { backendZoom, limit } = getContainerFetchConfigByZoom(zoom)
        const bounds = { lat_min, lat_max, lng_min, lng_max }
        const requestVersion = ++requestVersionRef.current

        try {
            const snapshot = await fetchContainersSnapshot(bounds, backendZoom, limit)
            if (!mountedRef.current || requestVersion !== requestVersionRef.current) return

            cursorRef.current = snapshot.cursor
            viewportRef.current = {
                ...bounds,
                incremental: !snapshot.clustered,
            }
            setContainers(snapshot.containers)
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
        mountedRef.current = true

        if (mapRef.current) {
            fetchForMap(mapRef.current)
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
    }, [fetchForBounds, fetchForMap])

    useEffect(() => {
        const pollingInterval = isSimulationActive ? simulationInterval : 15000

        const intervalId = window.setInterval(async () => {
            const viewport = viewportRef.current
            if (!viewport?.incremental || pollingRef.current) return

            pollingRef.current = true
            try {
                const changes = await fetchContainerChanges(viewport, cursorRef.current)
                if (!mountedRef.current || viewport !== viewportRef.current) return

                cursorRef.current = changes.cursor
                if (changes.containers.length === 0) return

                setContainers((current) => {
                    const byId = new Map(current.map((container) => [container.id, container]))
                    changes.containers.forEach((container) => byId.set(container.id, container))
                    return Array.from(byId.values())
                })
            } catch (error) {
                console.error('Error al sincronizar cambios de contenedores:', error)
            } finally {
                pollingRef.current = false
            }
        }, pollingInterval)

        return () => window.clearInterval(intervalId)
    }, [isSimulationActive, simulationInterval])

    // Calcular sitios agrupados. Se recalcula automáticamente cuando cambian los contenedores
    const sites: Site[] = useMemo(() => {
        return groupContainersBySite(containers)
    }, [containers])

    // Centro del mapa en CABA
    const cabaCenter: [number, number] = [-34.6037, -58.3816]

    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={cabaCenter}
                zoom={13}
                className="h-full w-full"
                maxZoom={18}
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
                />

                {sites.map((site) => {
                    const isCluster = site.containers.length === 1 && String(site.containers[0].id).startsWith('cluster-')
                    const clusterTotal = isCluster ? Number(site.containers[0].description) || 1 : 0
                    const containerCount = isCluster ? clusterTotal : site.containers.length

                    const handleMarkerClick = () => {
                        const map = mapRef.current
                        if (!map) return

                        if (isCluster) {
                            // Zoom in on cluster center to attempt expansion
                            const currentZoom = map.getZoom()
                            const targetZoom = Math.min(map.getMaxZoom(), Math.max(currentZoom + 3, 13))
                            map.flyTo([site.lat, site.long], targetZoom, { animate: true })
                        }
                    }
                    if (!isCluster) {
                        return (
                            <Marker
                                key={site.id}
                                position={[site.lat, site.long]}
                                icon={createMapPinIcon(site.color, containerCount)}
                                eventHandlers={{ click: handleMarkerClick }}
                            >
                                <Popup>
                                    <div className="p-2 space-y-2 max-w-xs">
                                        <h3 className="font-bold text-sm border-b pb-1">
                                            Sitio - {site.type}
                                        </h3>
                                        <p className="text-xs">
                                            <strong>Total:</strong> {containerCount} contenedor{containerCount > 1 ? "es" : ""}
                                        </p>
                                        <p className="text-xs">
                                            <strong>Coordenadas:</strong> ({site.lat.toFixed(4)}, {site.long.toFixed(4)})
                                        </p>

                                        <div className="border-t pt-1">
                                            <p className="text-xs font-semibold mb-1">Contenedores:</p>
                                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                                {site.containers.map((container) => (
                                                    <div key={container.id} className="h-full p-2 text-xs rounded-md bg-gray-100 space-y-0.5">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <p className="font-semibold">ID: {container.id}</p>
                                                            <span className={container.available ? "text-emerald-700" : "text-rose-700"}>
                                                                {container.available ? "Disponible" : "No disponible"}
                                                            </span>
                                                        </div>
                                                        <p><strong>Nivel:</strong> {container.currentLevel ?? 0}%</p>
                                                        <p><strong>Tipo:</strong> {container.type}</p>
                                                        {container.wasteTypes?.length ? (
                                                            <p><strong>Residuo:</strong> {container.wasteTypes.join(", ")}</p>
                                                        ) : null}
                                                        {container.zone ? <p><strong>Barrio:</strong> {container.zone}</p> : null}
                                                        {container.deviceImei ? <p><strong>Dispositivo:</strong> {container.deviceImei}</p> : null}
                                                        <p><strong>Última lectura:</strong> {formatContainerDate(container.lastReading)}</p>
                                                        <p><strong>Actualización backend:</strong> {formatContainerDate(container.updatedAt)}</p>
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
                                key={site.id}
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
