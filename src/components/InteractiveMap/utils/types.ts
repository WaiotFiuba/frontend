export type ContainerType = "reciclaje" | "organico" | "indiferenciado"

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

// Tipos de respuesta del backend para el mapa, pueden ser contenedores individuales o clusters de contenedores según el zoom
export type BackendContainer = {
    id: number | string
    site_id?: number | string
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