export type ContainerType = "reciclaje" | "organico" | "indiferenciado"

export interface Container {
    id: string
    siteId: string
    lat: number
    long: number
    type: ContainerType
    color: string
    description: string
    currentLevel?: number
    available?: boolean
    deviceImei?: string
    zone?: string
    wasteTypes?: string[]
    lastReading?: string
    updatedAt?: string
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
    device_imei?: string | null
    zone?: string | null
    last_reading?: string | null
    updated_at?: string | null
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

export type BackendContainerSnapshot = {
    cursor: number
    containers: BackendContainer[]
    clusters: BackendCluster[]
}

export type BackendContainerChanges = {
    cursor: number
    containers: BackendContainer[]
}
