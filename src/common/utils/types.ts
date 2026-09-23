export type ContainerType = "reciclaje" | "organico" | "indiferenciado"

export interface Container {
    id: string
    siteId: string
    lat: number
    long: number
    type: ContainerType
    color: string
    description: string
    currentLevel: number
    level?: number
}

export interface Site {
    id: string
    lat: number
    long: number
    type: ContainerType
    color: string
    currentLevel: number
    avgLevel?: number
    containerCount?: number
    containers: Container[]
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
