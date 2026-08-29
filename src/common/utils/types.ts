export type ContainerType = "reciclaje" | "organico" | "indiferenciado"
export type LevelAggregation = "avg" | "max"

export interface Container {
    id: string
    siteId: string
    lat: number
    long: number
    type: ContainerType
    color: string
    description: string
}

export interface Site {
    id: string
    lat: number
    long: number
    type: ContainerType
    color: string
    containers: Container[]
}

export const labels: Record<ContainerType, string> = {
    reciclaje: "Reciclaje",
    organico: "Orgánico",
    indiferenciado: "Indiferenciado",
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
}

export interface SiteContainer {
    id: number
    serie_id: string | null
    current_level: number
    device_imei: string | null
    available: boolean
    container_type: string | null
    height_cm: number | null
    volume_m3: number | null
    last_reading: string | null
}

export interface BackendSite {
    id: number
    name: string
    address: string | null
    latitude: number
    longitude: number
    current_level: number
    available: boolean
    load_side_category: "IZQUIERDA" | "DERECHA" | "BILATERAL" | string | null
    waste_type_id: number | null
    waste_type_name: string | null
    waste_type_color: string | null
    container_count: number
    last_reading: string | null
    last_pickup: string | null
    updated_at: string
    containers: SiteContainer[]
}

export interface SiteCluster {
    cluster_id: string
    latitude: number
    longitude: number
    count: number
    avg_level: number
    max_level: number
    available_count: number
}

export interface SiteMapSnapshot {
    sites: BackendSite[]
    latest_cursor: number
    total: number
}

export interface SiteChanges {
    sites: BackendSite[]
    latest_cursor: number
    has_more: boolean
}