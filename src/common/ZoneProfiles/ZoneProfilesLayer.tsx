import { useCallback } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { GeoJSON } from "react-leaflet"
import type { Layer, Path, PathOptions } from "leaflet"
import type { Feature, Geometry } from "geojson"
import HourWeightsMiniChart from "./HourWeightsMiniChart"
import { colorForZoneType, labelForZoneType } from "../utils/functions"
import type { ZoneProfileCollection, ZoneProfileProperties } from "../utils/types"
import type { SelectedZoneRef } from "./useZoneProfiles"
import type { MutableRefObject } from "react"

interface ZoneProfilesLayerProps {
    data: ZoneProfileCollection | null
    visible: boolean
    selectedZoneRef: MutableRefObject<SelectedZoneRef | null>
}

// Capa de polígonos de radio censal coloreados por perfil de zona. Debe
// renderizarse como hijo de <MapContainer> (usa el contexto de Leaflet vía
// react-leaflet). Se muestra/oculta según `visible`, sin desmontar el mapa.
export default function ZoneProfilesLayer({ data, visible, selectedZoneRef }: ZoneProfilesLayerProps) {
    const zoneProfileStyle = useCallback((feature?: Feature<Geometry, ZoneProfileProperties>): PathOptions => {
        const color = colorForZoneType(feature?.properties.zone_type ?? "")
        return {
            color,
            weight: 0.6,
            opacity: 0.6,
            fillColor: color,
            fillOpacity: 0.35,
        }
    }, [])

    const onEachZoneFeature = useCallback((feature: Feature<Geometry, ZoneProfileProperties>, layer: Layer) => {
        const props = feature.properties
        const color = colorForZoneType(props.zone_type)
        layer.bindPopup(`
            <div style="min-width:200px;font-size:12px;line-height:1.5">
                <div style="font-weight:700;font-size:13px;color:${color};margin-bottom:2px;">
                    ${labelForZoneType(props.zone_type)}
                </div>
                <div style="color:#64748b;margin-bottom:6px;">
                    Radio ${props.radio_code} · ${props.barrio || props.department_name || "s/d"}
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                    <span style="color:#64748b;">Multiplicador de demanda</span>
                    <strong>${props.demand_multiplier.toFixed(2)}×</strong>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                    <span style="color:#64748b;">Factor fin de semana</span>
                    <strong>${props.weekend_factor.toFixed(2)}×</strong>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="color:#64748b;">Población del radio</span>
                    <strong>${props.population.toLocaleString()}</strong>
                </div>
                <div style="color:#64748b;font-size:10px;margin-top:4px;">Curva horaria (0-23hs)</div>
                ${renderToStaticMarkup(
                    <HourWeightsMiniChart hourWeights={props.hour_weights} color={color} />
                )}
            </div>
        `)

        // Resaltar el radio clickeado (borde grueso y oscuro) para que se
        // vean sus límites, y devolver el anterior a su estilo normal.
        const normalStyle = zoneProfileStyle(feature)
        const pathLayer = layer as Path
        layer.on("click", () => {
            const prev = selectedZoneRef.current
            if (prev && prev.layer !== pathLayer) {
                prev.layer.setStyle(prev.normalStyle)
            }
            pathLayer.setStyle({
                ...normalStyle,
                weight: 3,
                color: "#0f172a",
                opacity: 1,
                fillOpacity: (normalStyle.fillOpacity ?? 0.35) + 0.15,
            })
            pathLayer.bringToFront()
            selectedZoneRef.current = { layer: pathLayer, normalStyle }
        })
    }, [zoneProfileStyle, selectedZoneRef])

    if (!visible || !data) {
        return null
    }

    return (
        <GeoJSON
            data={data as unknown as GeoJSON.GeoJsonObject}
            style={zoneProfileStyle as never}
            onEachFeature={onEachZoneFeature as never}
        />
    )
}
