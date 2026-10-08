import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import type { MutableRefObject } from "react"
import { useNavigate } from "react-router-dom"
import { MapContainer, Marker, Popup, TileLayer, Polyline, CircleMarker, useMapEvents, useMap } from "react-leaflet"
import { labels } from "./utils/types"
import type { Container, Site, ContainerType, MapWasteFilter, RouteDetails } from "./utils/types"
import {
    fetchSitesBBox,
    getContainerFetchConfigByZoom,
    createMapPinIcon,
    createArrowIcon,
    calculateBearing,
    colorForLevel,
    formatSimulatedTime,
} from "./utils/functions"
import { useZoneProfiles } from "./ZoneProfiles/useZoneProfiles"
import ZoneProfilesLayer from "./ZoneProfiles/ZoneProfilesLayer"
import ZoneProfilesControls from "./ZoneProfiles/ZoneProfilesControls"
import ZoneProfilesLegend from "./ZoneProfiles/ZoneProfilesLegend"
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
            if (onZoomChange) {
                onZoomChange(map.getZoom())
            }
            fetchForMap(map)
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

function MapMoveFocusController({
    highlightedMoveId,
    redistributionMoves,
}: {
    highlightedMoveId?: number | null
    redistributionMoves?: MapRedistributionMove[]
}) {
    const map = useMap()

    useEffect(() => {
        if (!highlightedMoveId || !redistributionMoves || redistributionMoves.length === 0) return

        const move = redistributionMoves.find((m) => m.container_id === highlightedMoveId)
        if (
            move &&
            move.from_lat != null &&
            move.from_lng != null &&
            move.to_lat != null &&
            move.to_lng != null
        ) {
            map.fitBounds(
                [
                    [move.from_lat, move.from_lng],
                    [move.to_lat, move.to_lng],
                ],
                { padding: [80, 80], maxZoom: 16, animate: true }
            )
        }
    }, [highlightedMoveId, redistributionMoves, map])

    return null
}

interface MapConfigResponse {
    city_name: string
    center: { lat: number; lng: number }
    default_zoom: number
    bounds: [[number, number], [number, number]] | null
}

function MapConfigController({
    config,
}: {
    config: MapConfigResponse | null
}) {
    const map = useMap()
    const appliedRef = useRef(false)

    useEffect(() => {
        if (!config || appliedRef.current) return
        appliedRef.current = true

        if (config.bounds) {
            map.fitBounds(config.bounds, { padding: [40, 40], maxZoom: 16 })
        } else if (config.center) {
            map.setView([config.center.lat, config.center.lng], config.default_zoom || 13)
        }
    }, [config, map])

    return null
}



function MovePolylineItem({
    move,
    isSelected,
}: {
    move: MapRedistributionMove
    isSelected: boolean
}) {
    const bearing = useMemo(() => {
        if (
            move.from_lat == null ||
            move.from_lng == null ||
            move.to_lat == null ||
            move.to_lng == null
        ) {
            return 0
        }
        return calculateBearing(move.from_lat, move.from_lng, move.to_lat, move.to_lng)
    }, [move.from_lat, move.from_lng, move.to_lat, move.to_lng])

    const arrowIcon = useMemo(() => {
        return createArrowIcon(bearing, isSelected)
    }, [bearing, isSelected])

    return (
        <>
            <Polyline
                positions={[[move.from_lat!, move.from_lng!], [move.to_lat!, move.to_lng!]]}
                pathOptions={{
                    color: isSelected ? '#2563eb' : '#4f46e5',
                    weight: isSelected ? 6 : 3.5,
                    dashArray: isSelected ? undefined : '6, 8',
                    opacity: isSelected ? 1 : 0.85,
                }}
            />

            <Marker
                position={[move.to_lat!, move.to_lng!]}
                icon={arrowIcon}
                interactive={false}
                zIndexOffset={isSelected ? 300 : 150}
            />

            {isSelected && (
                <>
                    <CircleMarker
                        center={[move.from_lat!, move.from_lng!]}
                        radius={7}
                        pathOptions={{
                            color: '#1d4ed8',
                            fillColor: '#3b82f6',
                            fillOpacity: 0.9,
                            weight: 3,
                        }}
                    />
                    <CircleMarker
                        center={[move.to_lat!, move.to_lng!]}
                        radius={7}
                        pathOptions={{
                            color: '#047857',
                            fillColor: '#10b981',
                            fillOpacity: 0.9,
                            weight: 3,
                        }}
                    />
                </>
            )}
        </>
    )
}

interface InteractiveMapProps {
    refreshTrigger?: number
    redistributionMoves?: MapRedistributionMove[]
    highlightedMoveId?: number | null
    isPlayground?: boolean
}

export default function InteractiveMap({
    refreshTrigger = 0,
    redistributionMoves,
    highlightedMoveId,
    isPlayground = false,
}: InteractiveMapProps) {
    const [sites, setSites] = useState<Site[]>([])
    const [wasteFilter, setWasteFilter] = useState<MapWasteFilter>('all')
    const [activeSimulation, setActiveSimulation] = useState<ActiveSimulation | null>(null)
    const [selectedRoute] = useState<RouteDetails | null>(null)
    const zoneProfiles = useZoneProfiles()

    const navigate = useNavigate()
    const mapRef = useRef<LeafletMap | null>(null)
    const debounceRef = useRef<number | null>(null)
    const mountedRef = useRef(true)
    const latestRequestIdRef = useRef<number>(0)
    const latestAppliedIdRef = useRef<number>(0)

    const fetchForBounds = useCallback(async (lat_min: number, lat_max: number, lng_min: number, lng_max: number, zoom: number) => {

        const requestId = ++latestRequestIdRef.current
        const { backendZoom, limit } = { backendZoom: zoom, limit: 2000 }

        try {
            const distribution = isPlayground ? 'whatif' : 'real'
            const data = await fetchSitesBBox(lat_min, lat_max, lng_min, lng_max, backendZoom, limit, distribution, wasteFilter)
            if (mountedRef.current && requestId > latestAppliedIdRef.current) {
                latestAppliedIdRef.current = requestId
                setSites(data)
            }
        } catch (e) {
            console.error('Error al cargar sitios:', e)
        }
    }, [isPlayground, wasteFilter])

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
        }

        return () => {
            mountedRef.current = false
            const currentDebounce = debounceRef.current
            if (currentDebounce) {
                window.clearTimeout(currentDebounce)
            }
        }
    }, [refreshTrigger, fetchForBounds])

    useEffect(() => {
        let cancelled = false

        const fetchActiveSimulation = async () => {
            try {
                const data = await api.get<ActiveSimulation>('/digital-twin/simulations/active')
                if (!cancelled) {
                    setActiveSimulation(data)
                }
            } catch {
                // Mantener el ultimo estado conocido si falla un poll aislado.
                // En hosting gratuito la API puede demorar o cortar una consulta sin
                // que la simulacion haya terminado realmente.
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
        if (!mapRef.current) return
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
    }, [activeSimulation?.simulated_time, activeSimulation?.status, fetchForBounds])

    const simulatedClock = useMemo(
        () => formatSimulatedTime(activeSimulation?.simulated_time),
        [activeSimulation?.simulated_time]
    )

    // Sitios a desplegar: usa propContainers si fueron provistos, sino los sitios del backend directamente
    const displaySites = useMemo(() => {
        return sites
    }, [sites])

    // Cantidad de contenedores al 100% (en riesgo de colapso/desborde)
    const fullContainersCount = useMemo(() => {
        return displaySites.reduce((acc, s) => {
            return acc + (s.containers ? s.containers.filter((c: Container) => (c.currentLevel ?? c.level ?? 0) >= 100).length : 0)
        }, 0)
    }, [displaySites])

    const [mapConfig, setMapConfig] = useState<MapConfigResponse | null>(null)
    const [configLoading, setConfigLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        api.get<MapConfigResponse>('/map/config')
            .then((data) => {
                if (!cancelled && data) {
                    setMapConfig(data)
                }
            })
            .catch((err) => {
                console.error('Failed to load map config:', err)
                if (!cancelled) {
                    setMapConfig({
                        city_name: 'Default',
                        center: { lat: -34.6037, lng: -58.3816 },
                        default_zoom: 13,
                        bounds: null,
                    })
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setConfigLoading(false)
                }
            })
        return () => {
            cancelled = true
        }
    }, [])

    if (configLoading || !mapConfig) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cargando mapa...</span>
                </div>
            </div>
        )
    }

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
                                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${fullContainersCount > 0 ? "bg-red-500" : "bg-emerald-500"
                                    }`}
                            ></span>
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Al 100%
                        </span>
                        <span
                            className={`text-base font-extrabold leading-tight ${fullContainersCount > 0 ? "text-red-600 font-mono" : "text-slate-700 font-mono"
                                }`}
                        >
                            {fullContainersCount}
                        </span>
                    </div>
                </div>

                {/* Reloj de tiempo simulado */}
                <div className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-1.5 text-sm shadow-md backdrop-blur">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Reloj de Simulación
                    </p>
                    <p className="font-semibold text-slate-900 leading-tight">
                        {simulatedClock}
                    </p>
                </div>

                <ZoneProfilesControls
                    visible={zoneProfiles.visible}
                    loading={zoneProfiles.loading}
                    onToggle={zoneProfiles.toggle}
                />

                <div className="rounded-xl border border-slate-200/80 bg-white/95 p-1.5 shadow-md backdrop-blur flex items-center gap-1">
                    {[
                        ['all', 'Todos'],
                        ['organico', 'Húmedos'],
                        ['reciclaje', 'Reciclables'],
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setWasteFilter(value as MapWasteFilter)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                wasteFilter === value
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <ZoneProfilesLegend visible={zoneProfiles.visible} error={zoneProfiles.error} />

            <MapContainer
                center={[mapConfig.center.lat, mapConfig.center.lng]}
                zoom={mapConfig.default_zoom || 13}
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

                <MapConfigController config={mapConfig} />

                <MapViewportController
                    mapRef={mapRef}
                    debounceRef={debounceRef}
                    fetchForMap={fetchForMap}
                />

                <MapMoveFocusController
                    highlightedMoveId={highlightedMoveId}
                    redistributionMoves={redistributionMoves}
                />

                {/* Capa de perfiles de zona (radios censales), activable por el usuario */}
                <ZoneProfilesLayer
                    data={zoneProfiles.data}
                    visible={zoneProfiles.visible}
                    selectedZoneRef={zoneProfiles.selectedZoneRef}
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

                {displaySites.map((site) => {
                    const isCluster = site.isCluster ?? (site.containers.length === 1 && String(site.containers[0].id).startsWith('cluster-'))
                    const clusterTotal = isCluster ? site.containerCount ?? (Number(site.containers[0]?.description) || 1) : 0
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
                                icon={createMapPinIcon(site.color, containerCount, site.type)}
                                eventHandlers={{ click: handleMarkerClick }}
                            >
                                <Popup>
                                    <div className="p-2 space-y-2.5 max-w-xs min-w-[220px]">
                                        <div className="border-b pb-1.5 flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-sm text-slate-900 leading-tight">
                                                    {site.name || `Sitio #${site.id}`}
                                                </h3>
                                                {site.address && site.address !== site.name && (
                                                    <p className="text-[11px] text-slate-500 font-medium">
                                                        {site.address}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                    Sitio #{site.id} • {labels[site.type as ContainerType] || labels.indiferenciado} • {containerCount} cont.
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
                                                {site.containers.map((container: Container) => {
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
                                icon={createMapPinIcon(site.color, containerCount, site.type)}
                                eventHandlers={{ click: handleMarkerClick }}
                            />
                        )
                    }
                })}

                {redistributionMoves && redistributionMoves.map((m) => {
                    if (m.from_lat == null || m.from_lng == null || m.to_lat == null || m.to_lng == null) return null
                    const isSelected = highlightedMoveId === m.container_id
                    return (
                        <MovePolylineItem
                            key={`opt-move-${m.container_id}`}
                            move={m}
                            isSelected={isSelected}
                        />
                    )
                })}
            </MapContainer>
        </div>
    )
}
