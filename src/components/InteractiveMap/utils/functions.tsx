import L from "leaflet"
import { renderToStaticMarkup } from "react-dom/server"
import { MapPin } from "lucide-react"
import { Container, Site } from "./types"


export const groupContainersBySite = (containers: Container[]): Site[] => {
    const sitesMap: Record<string, Site> = {}

    containers.forEach((container) => {
        const { siteId } = container

        if (!sitesMap[siteId]) {
            sitesMap[siteId] = {
                id: siteId,
                lat: container.lat,
                long: container.long,
                type: container.type,
                color: container.color,
                containers: [],
            }
        }

        sitesMap[siteId].containers.push(container)
    })

    const colorPriority: Record<string, number> = {
        "#ef4444": 3,
        "#f59e0b": 2,
        "#10b981": 1,
    }

    Object.values(sitesMap).forEach((site) => {
        const counts: Record<string, number> = {}
        site.containers.forEach((c) => {
            counts[c.color] = (counts[c.color] || 0) + 1
        })

        let majorityColor = site.containers[0]?.color || "#10b981"
        let maxCount = 0

        Object.entries(counts).forEach(([color, count]) => {
            if (count > maxCount) {
                maxCount = count
                majorityColor = color
            } else if (count === maxCount) {
                const currentPri = colorPriority[color] || 0
                const majorityPri = colorPriority[majorityColor] || 0
                if (currentPri > majorityPri) {
                    majorityColor = color
                }
            }
        })

        site.color = majorityColor
    })

    return Object.values(sitesMap)
}

export const fetchContainers = async (): Promise<Container[]> => {
    try {
        const { api } = await import("../../../lib/api")
        const backendContainers = await api.get<any[]>(`/map/containers/?limit=1000&t=${Date.now()}`)
        if (backendContainers && backendContainers.length > 0) {
            return backendContainers.map(c => {
                let type: any = "indiferenciado"

                const typeName = (c.container_type?.name || "").toLowerCase()
                if (typeName.includes("seca") || typeName.includes("reciclaje")) {
                    type = "reciclaje"
                } else if (typeName.includes("humeda") || typeName.includes("húmeda") || typeName.includes("organico")) {
                    type = "organico"
                }

                // Color basado en el nivel de llenado
                const level = c.current_level
                let color = "#10b981" //(<50%)
                if (level >= 80) {
                    color = "#ef4444" //(>=80%)
                } else if (level >= 50) {
                    color = "#f59e0b" //(50% - 79%)
                }

                return {
                    id: String(c.id),
                    siteId: c.site_id || String(c.id),
                    lat: c.latitude,
                    long: c.longitude,
                    type: type,
                    color: color,
                    description: `${c.site_name || 'Contenedor'} - ${c.container_type?.name || 'Genérico'} (Nivel: ${c.current_level}%)`
                }
            })
        }
        return []
    } catch (error) {
        console.error("Error al obtener contenedores del backend:", error)
        return []
    }
}



//PROVISIONAL HASTA ENCONTRAR UNA LIBRERIA DE ICONOS PERSONALIZABLE
export const createMapPinIcon = (color: string, containerCount: number = 1) => {
    const iconHtml = renderToStaticMarkup(
        <div className="relative flex items-center justify-center w-12 h-12">
            {containerCount > 1 && (
                <div className="absolute inset-0 rounded-full animate-ping opacity-25" style={{ backgroundColor: color }} />
            )}

            <div className="relative drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] hover:scale-110 transition-transform duration-200">
                <MapPin size={42} color={color} fill={color} strokeWidth={1.5} stroke="white" />
                <div className="absolute inset-0 m-auto w-3 h-3 bg-white rounded-full" style={{ transform: "translateY(-5px)" }} />
            </div>

            {containerCount > 1 && (
                <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white border-2 border-white rounded-full shadow-md" style={{ backgroundColor: color }}>
                    {containerCount}
                </div>
            )}
        </div>
    )

    return L.divIcon({ html: iconHtml, iconSize: [48, 48], popupAnchor: [0, -20], className: "bg-transparent border-none", })
}
