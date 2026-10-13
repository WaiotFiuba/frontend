import { describe, it, expect } from 'vitest'

import { buildPinBadges, clusterGridSize, MACRO_CLUSTER_ID } from '@/common/redistributionBadges'
import type { Site } from '@/utils/types'

const site = (id: string, lat: number, long: number, isCluster = false): Site => ({
  id,
  lat,
  long,
  type: 'indiferenciado',
  color: '#000',
  currentLevel: 0,
  containers: [],
  isCluster,
})

// Sitio 1 cede dos contenedores: uno al 2 (a ~60 m) y otro al 3 (a ~2 km).
const moves = [
  { from_site_id: 1, to_site_id: 2, from_lat: -34.5990, from_lng: -58.4001, to_lat: -34.5995, to_lng: -58.4004 },
  { from_site_id: 1, to_site_id: 3, from_lat: -34.5990, from_lng: -58.4001, to_lat: -34.6201, to_lng: -58.4001 },
]

describe('buildPinBadges', () => {
  it('counts moves per individual site at street zoom', () => {
    const sites = [site('1', -34.5990, -58.4001), site('2', -34.5995, -58.4004), site('4', -34.61, -58.41)]

    const badges = buildPinBadges(moves, sites, 17)

    expect(badges.get('1')).toEqual({ out: 2, in: 0 })
    expect(badges.get('2')).toEqual({ out: 0, in: 1 })
    expect(badges.has('4')).toBe(false)
  })

  it('assigns moves to the cluster whose grid cell contains them', () => {
    expect(clusterGridSize(15)).toBe(0.003)
    // Los centros de los grupos son promedios de sus sitios: caen en su celda.
    const sites = [site('a', -34.5992, -58.4002, true), site('b', -34.6202, -58.4002, true)]

    const badges = buildPinBadges(moves, sites, 15)

    // Los sitios 1 y 2 están en la misma celda: sale 2 y entra 1.
    expect(badges.get('a')).toEqual({ out: 2, in: 1 })
    expect(badges.get('b')).toEqual({ out: 0, in: 1 })
  })

  it('shows every move on the whole-city pin', () => {
    const badges = buildPinBadges(moves, [site(MACRO_CLUSTER_ID, -34.6, -58.4, true)], 10)

    expect(badges.get(MACRO_CLUSTER_ID)).toEqual({ out: 2, in: 2 })
  })

  it('returns no badges without a plan', () => {
    expect(buildPinBadges(undefined, [site('1', -34.6, -58.4)], 17).size).toBe(0)
  })
})
