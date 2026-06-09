import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import type { MutableRefObject } from "react"
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet"
import { Container, Site } from "./utils/types"
import { fetchContainersBBox, getContainerFetchConfigByZoom, groupContainersBySite, createMapPinIcon } from "./utils/functions"
import type { Map as LeafletMap } from 'leaflet'

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

export default function InteractiveMap() {
    const [containers, setContainers] = useState<Container[]>([])
    const mapRef = useRef<LeafletMap | null>(null)
    const cacheRef = useRef<Map<string, Container[]>>(new Map())
    const pendingRef = useRef<Map<string, Promise<Container[]>>>(new Map())
    const debounceRef = useRef<number | null>(null)
    const mountedRef = useRef(true)

    const fetchForBounds = useCallback(async (lat_min: number, lat_max: number, lng_min: number, lng_max: number, zoom: number) => {
        // estas constantes no se que tan necesarias son, se pueden eliminar y usar directamente los valores, o se pueden ajustar para cambiar la cantidad de datos que pide el mapa
        const { backendZoom, limit } = { backendZoom: zoom, limit: 1000 }
        // aca cachea los resultados para no pedir los mismos datos varias veces, se puede eliminar si no se quiere cachear o ajustar la key para cachear de otra forma
        const key = `${lat_min.toFixed(5)}_${lat_max.toFixed(5)}_${lng_min.toFixed(5)}_${lng_max.toFixed(5)}_${backendZoom}`
        const cached = cacheRef.current.get(key)
        if (cached) {
            if (mountedRef.current) setContainers(cached)
            return
        }
        // Si ya hay una petición en curso para esa key, espera a que termine en vez de hacer otra igual
        const pending = pendingRef.current.get(key)
        if (pending) {
            try {
                const data = await pending
                if (mountedRef.current) setContainers(data)
            } catch (e) {
                console.error('Error awaiting pending fetch', e)
            }
            return
        }

        // Si no hay cache ni petición pendiente, hace una nueva petición
        const promise = fetchContainersBBox(lat_min, lat_max, lng_min, lng_max, backendZoom, limit)
        pendingRef.current.set(key, promise)

        try {
            const data = await promise
            cacheRef.current.set(key, data)
            if (mountedRef.current) setContainers(data)
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
        mountedRef.current = true
        void fetchForBounds(-90, 90, -180, 180, 5)

        return () => {
            mountedRef.current = false
            const currentDebounce = debounceRef.current
            if (currentDebounce) {
                window.clearTimeout(currentDebounce)
            }
        }
    }, [fetchForBounds])

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
                                                    <div key={container.id} className="h-full p-1  text-xs rounded-md bg-gray-100">
                                                        <p className="font-semibold">ID: {container.id}</p>
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