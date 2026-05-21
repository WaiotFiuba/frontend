
import React from "react"
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet"

export default function InteractiveMap() {

    return (

        <MapContainer center={[-34.6037, -58.3816]} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={[-34.6037, -58.3816]}>
                <Popup>
                    
                </Popup>
            </Marker>
        </MapContainer>
    )

}