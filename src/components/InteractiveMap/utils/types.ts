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
