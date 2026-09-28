export type ContainerType = "reciclaje" | "organico" | "indiferenciado"
export type MapWasteFilter = "all" | "organico" | "reciclaje"

export interface Container {
    id: string
    siteId: string
    lat: number
    long: number
    type: ContainerType
    color: string
    description: string
    wasteTypeName?: string | null
    currentLevel: number
    level?: number
}

export interface Site {
    id: string
    name?: string
    address?: string | null
    lat: number
    long: number
    type: ContainerType
    color: string
    wasteTypeName?: string | null
    currentLevel: number
    avgLevel?: number
    containerCount?: number
    max_containers?: number
    puede_ingresar?: boolean
    containers: Container[]
    isCluster?: boolean
}

export const labels: Record<ContainerType, string> = {
    reciclaje: "Reciclaje",
    organico: "Orgánico",
    indiferenciado: "Indiferenciado",
}

export type ZoneType =
    | "residential_multifamily"
    | "residential_singlefamily"
    | "residential"
    | "commercial"
    | "office"
    | "industrial"
    | "mixed"
    | string

export interface ZoneProfileProperties {
    radio_code: string
    barrio: string
    department_name: string
    population: number
    zone_type: ZoneType
    demand_multiplier: number
    weekend_factor: number
    hour_weights: Record<string, number>
    weekday_factors: Record<string, number>
}

export interface ZoneProfileFeature {
    type: "Feature"
    geometry: GeoJSON.Geometry
    properties: ZoneProfileProperties
}

export interface ZoneProfileCollection {
    type: "FeatureCollection"
    features: ZoneProfileFeature[]
}

export type BackendSiteContainer = {
    id: number
    serie_id?: string | null
    current_level: number
    device_imei?: string | null
    available?: boolean
    container_type?: string | null
    waste_type_name?: string | null
    height_cm?: number | null
    volume_m3?: number | null
    last_reading?: string | null
}

export type BackendSite = {
    id: number
    name: string
    address?: string | null
    latitude: number
    longitude: number
    current_level: number
    available?: boolean
    load_side_category?: string | null
    waste_type_id?: number | null
    waste_type_name?: string | null
    waste_type_color?: string | null
    container_count: number
    last_reading?: string | null
    last_pickup?: string | null
    updated_at: string
    containers: BackendSiteContainer[]
}

export type BackendSiteCluster = {
    cluster_id: string
    latitude: number
    longitude: number
    count: number
    avg_level: number
    max_level: number
    available_count: number
}

export type BackendContainer = {
    id: number | string
    site_id?: number | string
    site_name?: string | null
    latitude: number
    longitude: number
    current_level?: number
    available?: boolean
    container_type?: {
        name?: string
        waste_types?: Array<{ name?: string; color?: string }>
    }
}

export type BackendCluster = {
    latitude: number
    longitude: number
    total: number
    avg_level?: number
}

export type BackendSiteHistoryPoint = {
    timestamp: string
    avg_level: number
    max_level: number
    min_level: number
    measurement_count: number
}

export type BackendSiteHistory = {
    site_id: number
    simulation_id?: number | null
    window_start?: string | null
    window_end?: string | null
    points: BackendSiteHistoryPoint[]
}

export type BackendSiteProjectionPoint = {
    timestamp: string
    predicted_level: number
    lower_bound?: number | null
    upper_bound?: number | null
    reaches_critical: boolean
    reaches_full: boolean
    confidence: number
    reason?: string | null
}

export type BackendSiteProjection = {
    site_id: number
    model_key: string
    generated_at: string
    current_level: number
    horizon_hours: number
    interval_minutes: number
    critical_level: number
    level_aggregation: "avg" | "max"
    lookback_days: number
    stop_at_full: boolean
    confidence: number
    reason?: string | null
    critical_at?: string | null
    time_to_critical_hours?: number | null
    full_at?: string | null
    time_to_full_hours?: number | null
    points: BackendSiteProjectionPoint[]
}

export interface RouteDetails {
    route_id: string
    zone: number
    service_name: string
    site_ids: string[]
    waypoints: [number, number][]
    total_distance_m?: number
    collection_distance_m?: number
    deadheading_distance_m?: number
    repeated_segments_count?: number
    street_sequence?: string[]
    segments_count: number
}
