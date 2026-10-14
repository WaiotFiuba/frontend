import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import type { MutableRefObject } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { MapContainer, Marker, Popup, TileLayer, Polyline, CircleMarker, useMapEvents, useMap } from "react-leaflet"
import { labels } from "@/utils/types"
import type { Container, Site, ContainerType, MapWasteFilter, RouteDetails } from "@/utils/types"
import {
    fetchSitesBBox,
    getContainerFetchConfigByZoom,
    createMapPinIcon,
    createArrowIcon,
    calculateBearing,
    colorForLevel,
    formatSimulatedTime,
} from "@/utils/functions"
import { useZoneProfiles } from "./ZoneProfiles/useZoneProfiles"
import ZoneProfilesLayer from "./ZoneProfiles/ZoneProfilesLayer"
import ZoneProfilesLegend from "./ZoneProfiles/ZoneProfilesLegend"
import MapVisual from "./MapVisual"
import type { Map as LeafletMap } from 'leaflet'
import { api } from '@/lib/api'
import { useLevelThresholds } from '@/context/CityConfigContext'
import { Button } from "@/utils/ui/button"
import { Badge } from "@/utils/ui/badge"
import { ExternalLink, MapPin } from "lucide-react"

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
            if (onZoomChange) {
                onZoomChange(map.getZoom())
            }
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
    available_waste_types?: string[]
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
                    color: isSelected ? '#0284c7' : '#059669',
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
                            color: '#0284c7',
                            fillColor: '#38bdf8',
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
    const { t } = useTranslation()
    const [sites, setSites] = useState<Site[]>([])
    const [wasteFilter, setWasteFilter] = useState<MapWasteFilter>('all')
    const [activeSimulation, setActiveSimulation] = useState<ActiveSimulation | null>(null)
    const [selectedRoute] = useState<RouteDetails | null>(null)
    const [currentZoom, setCurrentZoom] = useState<number>(13)
    const zoneProfiles = useZoneProfiles()
    const thresholds = useLevelThresholds()

    const handleZoomChange = useCallback((newZoom: number) => {
        const rounded = Math.round(newZoom)
        setCurrentZoom((prev) => (prev === rounded ? prev : rounded))
    }, [])

    const handleZoomIn = useCallback(() => {
        mapRef.current?.zoomIn()
    }, [])

    const handleZoomOut = useCallback(() => {
        mapRef.current?.zoomOut()
    }, [])

    const navigate = useNavigate()
    const mapRef = useRef<LeafletMap | null>(null)
    const debounceRef = useRef<number | null>(null)
    const mountedRef = useRef(true)
    const latestRequestIdRef = useRef<number>(0)
    const latestAppliedIdRef = useRef<number>(0)

    const fetchForBounds = useCallback(async (lat_min: number, lat_max: number, lng_min: number, lng_max: number, zoom: number) => {

        const requestId = ++latestRequestIdRef.current
        const { backendZoom, limit } = getContainerFetchConfigByZoom(zoom)

        try {
            const distribution = isPlayground ? 'whatif' : 'real'
            const data = await fetchSitesBBox(lat_min, lat_max, lng_min, lng_max, backendZoom, limit, distribution, wasteFilter, thresholds)
            if (mountedRef.current && requestId > latestAppliedIdRef.current) {
                latestAppliedIdRef.current = requestId
                setSites(data)
            }
        } catch (e) {
            console.error('Error al cargar sitios:', e)
        }
    }, [isPlayground, wasteFilter, thresholds])

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

    const simDebounceRef = useRef<number | null>(null)
    // Refrescar automáticamente los contenedores visibles cuando avanza la simulación con debounce
    useEffect(() => {
        if (!mapRef.current) return

        if (simDebounceRef.current) {
            window.clearTimeout(simDebounceRef.current)
        }
        simDebounceRef.current = window.setTimeout(() => {
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
        }, 600)

        return () => {
            if (simDebounceRef.current) {
                window.clearTimeout(simDebounceRef.current)
            }
        }
    }, [activeSimulation?.simulated_time, activeSimulation?.status, fetchForBounds])

    const simulatedClock = useMemo(
        () => formatSimulatedTime(activeSimulation?.simulated_time),
        [activeSimulation?.simulated_time]
    )

    // Sitios a desplegar: cuando el zoom es el más alejado posible (zoom <= 10), se agrupan en uno solo
    const displaySites = useMemo(() => {
        if (!sites || sites.length === 0) return []

        if (currentZoom <= 10 && sites.length > 1) {
            let totalCount = 0
            let sumLevel = 0
            let sumLat = 0
            let sumLng = 0
            let totalWeight = 0

            for (const s of sites) {
                const count = s.containerCount ?? (s.containers?.length || 1)
                const level = s.currentLevel ?? s.avgLevel ?? 0
                totalCount += count
                sumLevel += level * count
                sumLat += s.lat * count
                sumLng += s.long * count
                totalWeight += count
            }

            const avgLevel = totalWeight > 0 ? Math.round(sumLevel / totalWeight) : 0
            const centerLat = totalWeight > 0 ? sumLat / totalWeight : -34.6037
            const centerLng = totalWeight > 0 ? sumLng / totalWeight : -58.3816

            return [{
                id: 'macro-cluster-all',
                name: `Total Ciudad (${totalCount} contenedores)`,
                address: null,
                lat: centerLat,
                long: centerLng,
                type: (wasteFilter === 'all' ? 'indiferenciado' : wasteFilter) as ContainerType,
                color: colorForLevel(avgLevel, thresholds),
                currentLevel: avgLevel,
                avgLevel: avgLevel,
                containerCount: totalCount,
                containers: [],
                isCluster: true,
            }]
        }

        return sites
    }, [sites, currentZoom, wasteFilter, thresholds])

    // Cantidad de contenedores al 100% (en riesgo de colapso/desborde)
    const fullContainersCount = useMemo(() => {
        return sites.reduce((acc, s) => {
            return acc + (s.containers ? s.containers.filter((c: Container) => (c.currentLevel ?? c.level ?? 0) >= 100).length : 0)
        }, 0)
    }, [sites])

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
            <MapVisual
                fullContainersCount={fullContainersCount}
                simulatedClock={simulatedClock}
                currentZoom={currentZoom}
                wasteFilter={wasteFilter}
                onWasteFilterChange={setWasteFilter}
                availableWasteTypes={mapConfig?.available_waste_types}
                zoneProfilesVisible={zoneProfiles.visible}
                zoneProfilesLoading={zoneProfiles.loading}
                onToggleZoneProfiles={zoneProfiles.toggle}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
            />

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
                    onZoomChange={handleZoomChange}
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
                            color: "#0284c7",
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
                    const markerKey = siteKey
                    if (!isCluster) {
                        return (
                            <Marker
                                key={markerKey}
                                position={[site.lat, site.long]}
                                icon={createMapPinIcon(site.color, containerCount, site.type, currentZoom)}
                                eventHandlers={{ click: handleMarkerClick }}
                            >
                                <Popup>
                                    <div className="p-2 space-y-2.5 max-w-xs min-w-[220px]">
                                        <div className="border-b pb-1.5 flex items-start justify-between gap-1.5">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                                    <h3 className="font-bold text-sm text-slate-900 leading-tight truncate">
                                                        {site.name || t('map.site_number', { id: site.id, defaultValue: `Sitio #${site.id}` })}
                                                    </h3>
                                                </div>
                                                {site.address && site.address !== site.name && (
                                                    <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                                        {site.address}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                                                        #{site.id}
                                                    </Badge>
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                                                        {t(`map.types.${site.type}`, { defaultValue: labels[site.type as ContainerType] || labels.indiferenciado })}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                                                        {t('map.container_count_short', { count: containerCount, defaultValue: `${containerCount} cont.` })}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-600 font-medium">{t('map.avg_level', { defaultValue: 'Nivel promedio:' })}</span>
                                                <span className="font-bold font-mono" style={{ color: colorForLevel(siteLevel, thresholds) }}>
                                                    {siteLevel}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${Math.min(100, Math.max(0, siteLevel))}%`,
                                                        backgroundColor: colorForLevel(siteLevel, thresholds),
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="border-t pt-2">
                                            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                                {t('map.containers', { defaultValue: 'Contenedores' })}
                                            </p>
                                            <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                                                {site.containers.map((container: Container) => {
                                                    const cLevel = container.currentLevel ?? container.level ?? 0
                                                    const cColor = colorForLevel(cLevel, thresholds)
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

                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => navigate(`/map/sites/${site.id}`)}
                                            className="mt-2 w-full h-8 text-xs font-bold bg-blue-200 hover:bg-blue-300 text-blue-950 border border-blue-300/80 gap-1.5 shadow-xs"
                                        >
                                            {t('map.view_site_detail', { defaultValue: 'Ver detalle del sitio' })}
                                            <ExternalLink className="w-3 h-3 text-blue-900" />
                                        </Button>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    }
                    else {
                        return (
                            <Marker
                                key={markerKey}
                                position={[site.lat, site.long]}
                                icon={createMapPinIcon(site.color, containerCount, site.type, currentZoom)}
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
