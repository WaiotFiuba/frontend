import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { renderToStaticMarkup } from "react-dom/server"
import { GeoJSON } from "react-leaflet"
import type { Layer, Path, PathOptions } from "leaflet"
import type { Feature, Geometry } from "geojson"
import HourWeightsMiniChart from "./HourWeightsMiniChart"
import { colorForZoneType, labelForZoneType } from "@/utils/functions"
import type { ZoneProfileCollection, ZoneProfileProperties } from "@/utils/types"
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
    const { t } = useTranslation()

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
        const zoneLabel = t(`zone_profiles.types.${props.zone_type}`, { defaultValue: labelForZoneType(props.zone_type) })
        const radiusText = t('zone_profiles.census_radius', {
            code: props.radio_code,
            location: props.barrio || props.department_name || "s/d",
        })

        layer.bindPopup(`
            <div style="min-width:200px;font-size:12px;line-height:1.5">
                <div style="font-weight:700;font-size:13px;color:${color};margin-bottom:2px;">
                    ${zoneLabel}
                </div>
                <div style="color:#64748b;margin-bottom:6px;">
                    ${radiusText}
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                    <span style="color:#64748b;">${t('zone_profiles.demand_multiplier')}</span>
                    <strong>${props.demand_multiplier.toFixed(2)}×</strong>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                    <span style="color:#64748b;">${t('zone_profiles.weekend_factor')}</span>
                    <strong>${props.weekend_factor.toFixed(2)}×</strong>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="color:#64748b;">${t('zone_profiles.population')}</span>
                    <strong>${props.population.toLocaleString()}</strong>
                </div>
                <div style="color:#64748b;font-size:10px;margin-top:4px;">${t('zone_profiles.hourly_curve')}</div>
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
    }, [zoneProfileStyle, selectedZoneRef, t])

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
