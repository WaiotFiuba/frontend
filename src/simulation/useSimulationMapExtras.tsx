import type { MapExtras } from '@/common/mapExtras'
import { SIMULATOR_ENABLED } from './config'
import { useZoneProfiles } from './ZoneProfiles/useZoneProfiles'
import ZoneProfilesControls from './ZoneProfiles/ZoneProfilesControls'
import ZoneProfilesLayer from './ZoneProfiles/ZoneProfilesLayer'
import ZoneProfilesLegend from './ZoneProfiles/ZoneProfilesLegend'

/** Capa, botón y leyenda de los perfiles de zona para el mapa (nada si el simulador está apagado). */
export function useSimulationMapExtras(enabled: boolean = SIMULATOR_ENABLED): MapExtras | undefined {
  const zoneProfiles = useZoneProfiles()
  if (!enabled) return undefined

  return {
    layers: (
      <ZoneProfilesLayer
        data={zoneProfiles.data}
        visible={zoneProfiles.visible}
        selectedZoneRef={zoneProfiles.selectedZoneRef}
      />
    ),
    controls: (
      <ZoneProfilesControls
        visible={zoneProfiles.visible}
        loading={zoneProfiles.loading}
        onToggle={zoneProfiles.toggle}
      />
    ),
    overlays: <ZoneProfilesLegend visible={zoneProfiles.visible} error={zoneProfiles.error} />,
  }
}
