import { useEffect, useMemo, useState } from "react"
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet"
import { Container, Site, labels } from "./utils/types"
import { fetchContainers, groupContainersBySite, createMapPinIcon } from "./utils/functions"

export default function InteractiveMap() {
    const [containers, setContainers] = useState<Container[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadContainers = async () => {
            setLoading(true)

            try {
                const data = await fetchContainers()
                setContainers(data)

            } catch (error) {
                console.error("Error al cargar contenedores:", error)

            } finally {
                setLoading(false)
            }
        }

        loadContainers()
    }, [])

    // Calcular sitios agrupados. Se recalcula automáticamente cuando cambian los contenedores
    const sites: Site[] = useMemo(() => {
        return groupContainersBySite(containers)
    }, [containers])

    // Centro del mapa en CABA
    const cabaCenter: [number, number] = [-34.6037, -58.3816]

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <p className="text-lg font-semibold">Cargando mapa...</p>
            </div>
        )
    }

    return (
        <MapContainer
            center={cabaCenter}
            zoom={13}
            className="h-full w-full"
            maxZoom={18}
            minZoom={10}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {sites.map((site) => {
                const containerCount = site.containers.length

                return (
                    <Marker
                        key={site.id}
                        position={[site.lat, site.long]}
                        icon={createMapPinIcon(site.color, containerCount)}
                    >
                        <Popup>
                            <div className="p-2 space-y-2 max-w-xs">
                                <h3 className="font-bold text-sm border-b pb-1">
                                    Sitio - {labels[site.type]}
                                </h3>
                                <p className="text-xs">
                                    <strong>Total:</strong> {containerCount} contenedor{containerCount > 1 ? "es" : ""}
                                </p>
                                <p className="text-xs">
                                    <strong>Coordenadas:</strong> ({site.lat.toFixed(4)}, {site.long.toFixed(4)})
                                </p>

                                <div className="border-t pt-1">
                                    <p className="text-xs font-semibold mb-1">Contenedores:</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {site.containers.map((container) => (
                                            <div key={container.id} className="h-full p-1  text-xs rounded-md bg-gray-100">
                                                <p className="font-semibold">ID: {container.id}</p>
                                                <p className="font-semibold">Descripción: {container.description}</p>
                                                <p className="font-semibold">Tipo: {labels[container.type]}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                )
            })}
        </MapContainer>
    )
}