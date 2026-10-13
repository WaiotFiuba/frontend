// Interpola linealmente entre las dos horas ancla más cercanas definidas en
// hourWeights (cíclico, da la vuelta a la medianoche) — la misma lógica que
// ZoneProfile.get_hour_weight() en zone_classifier.py. La mayoría de las
// zonas solo definen unas pocas horas "ancla"; el resto el motor las infiere
// así, nunca las trata como cero.
export function interpolatedHourWeight(hourWeights: Record<string, number>, hour: number): number {
    if (hour in hourWeights) {
        return hourWeights[hour]
    }
    const definedHours = Object.keys(hourWeights).map(Number).sort((a, b) => a - b)
    if (definedHours.length === 0) {
        return 1
    }
    const before = definedHours.filter((h) => h < hour)
    const after = definedHours.filter((h) => h > hour)
    const prevHour = before.length > 0 ? Math.max(...before) : definedHours[definedHours.length - 1] - 24
    const nextHour = after.length > 0 ? Math.min(...after) : definedHours[0] + 24
    const prevWeight = hourWeights[((prevHour % 24) + 24) % 24]
    const nextWeight = hourWeights[((nextHour % 24) + 24) % 24]
    const t = (hour - prevHour) / (nextHour - prevHour)
    return prevWeight + (nextWeight - prevWeight) * t
}

import { useTranslation } from "react-i18next"

// Curva horaria en miniatura para el popup de perfil de zona (24 barras).
// Muestra el valor efectivo de cada hora (interpolado donde la zona no
// define una hora ancla), no un lookup directo — si no, la mayoría de las
// horas aparecen como "sin dato" aunque el motor sí les asigna un valor.
export default function HourWeightsMiniChart({ hourWeights, color }: { hourWeights: Record<string, number>; color: string }) {
    const { t } = useTranslation()
    const values = Array.from({ length: 24 }, (_, hour) => interpolatedHourWeight(hourWeights, hour))
    const isAnchor = Array.from({ length: 24 }, (_, hour) => hour in hourWeights)
    const max = Math.max(...values, 0.1)

    return (
        <div className="flex items-end gap-[1.5px] h-8 mt-1">
            {values.map((value, hour) => {
                const height = Math.max(6, (value / max) * 100)
                return (
                    <div
                        key={hour}
                        title={`${hour}hs: ${value.toFixed(2)}${isAnchor[hour] ? "" : ` (${t('zone_profiles.interpolated')})`}`}
                        className="flex-1 rounded-t-sm"
                        style={{
                            height: `${height}%`,
                            backgroundColor: color,
                            opacity: isAnchor[hour] ? 0.9 : 0.45,
                        }}
                    />
                )
            })}
        </div>
    )
}
