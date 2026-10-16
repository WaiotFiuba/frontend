import type { PinBadge } from "@/utils/functions"
import type { Site } from "@/utils/types"

interface BadgeMove {
    from_site_id: number
    to_site_id: number
    from_lat?: number
    from_lng?: number
    to_lat?: number
    to_lng?: number
}

export const MACRO_CLUSTER_ID = 'macro-cluster-all'

/**
 * Tamaño de celda (en grados) con el que el backend agrupa los sitios.
 * Debe coincidir con _zoom_to_grid_size del backend; null = sitios individuales.
 */
export const clusterGridSize = (backendZoom: number): number | null => {
    if (backendZoom < 11) return 0.15
    if (backendZoom < 13) return 0.05
    if (backendZoom < 15) return 0.015
    if (backendZoom < 17) return 0.003
    return null
}

// round() de Postgres redondea los .5 alejándose de cero; Math.round no.
const roundHalfAwayFromZero = (value: number): number => Math.sign(value) * Math.round(Math.abs(value))

const cellKey = (lat: number, lng: number, gridSize: number): string =>
    `${roundHalfAwayFromZero(lat / gridSize)}|${roundHalfAwayFromZero(lng / gridSize)}`

const add = (badges: Map<string, PinBadge>, key: string, field: keyof PinBadge) => {
    const badge = badges.get(key) ?? { out: 0, in: 0 }
    badge[field] += 1
    badges.set(key, badge)
}

/**
 * Cuántos contenedores salen y entran en cada pin del mapa según el plan.
 *
 * Los sitios individuales se identifican por id. Los grupos se identifican
 * por la celda de la grilla del backend: el centro de un grupo es el promedio
 * de sus sitios, así que cae dentro de la misma celda que ellos.
 */
export const buildPinBadges = (
    moves: BadgeMove[] | undefined,
    sites: Site[],
    backendZoom: number
): Map<string, PinBadge> => {
    const result = new Map<string, PinBadge>()
    if (!moves || moves.length === 0) return result

    const gridSize = clusterGridSize(backendZoom)
    const byKey = new Map<string, PinBadge>()
    for (const move of moves) {
        if (gridSize === null) {
            add(byKey, String(move.from_site_id), 'out')
            add(byKey, String(move.to_site_id), 'in')
            continue
        }
        if (move.from_lat != null && move.from_lng != null) {
            add(byKey, cellKey(move.from_lat, move.from_lng, gridSize), 'out')
        }
        if (move.to_lat != null && move.to_lng != null) {
            add(byKey, cellKey(move.to_lat, move.to_lng, gridSize), 'in')
        }
    }

    for (const site of sites) {
        if (site.id === MACRO_CLUSTER_ID) {
            result.set(site.id, { out: moves.length, in: moves.length })
            continue
        }
        const key = site.isCluster && gridSize !== null
            ? cellKey(site.lat, site.long, gridSize)
            : site.id
        const badge = byKey.get(key)
        if (badge) result.set(site.id, badge)
    }
    return result
}
