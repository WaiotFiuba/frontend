export interface WasteType {
  name: string
  color: string | null
}

export interface ContainersMapType {
  id: number | null
  name: string
  height_cm: number | null
  volume_m3: number | null
  overflow_zone_cm: number | null
  waste_types: WasteType[]
}

export interface BackendContainer {
  id: number
  site_id: string
  site_name: string | null
  device_imei: string | null
  latitude: number
  longitude: number
  current_level: number
  available: boolean
  container_type: ContainersMapType
  zone: string | null
  density_factor: number
}
