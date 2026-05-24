import L from "leaflet"
import { renderToStaticMarkup } from "react-dom/server"
import { MapPin } from "lucide-react"
import { Container, Site } from "./types"
import containersData from "../../../api/containers.json"


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

    return Object.values(sitesMap)
}

export const fetchContainers = async (): Promise<Container[]> => {
    try {
        return containersData as Container[]
    } catch (error) {
        console.error("Error al obtener contenedores:", error)
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
