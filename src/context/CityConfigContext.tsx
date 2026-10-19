import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { withRetry } from '@/lib/retry'

/** Umbrales de nivel de llenado (%): límite inferior inclusive de cada categoría. */
export interface LevelThresholds {
    normal: number
    high: number
    critical: number
    full: number
}

/** Valores usados mientras /map/config no respondió o si no envía umbrales. */
export const DEFAULT_LEVEL_THRESHOLDS: LevelThresholds = {
    normal: 40,
    high: 70,
    critical: 80,
    full: 100,
}

export interface MapConfigResponse {
    city_name: string
    center: { lat: number; lng: number }
    default_zoom: number
    bounds: [[number, number], [number, number]] | null
    thresholds?: LevelThresholds
    is_loaded?: boolean
    available_waste_types?: string[]
}

interface CityConfigContextType {
    cityName: string
    config: MapConfigResponse | null
    thresholds: LevelThresholds
    isLoading: boolean
    error: Error | null
}

const CityConfigContext = createContext<CityConfigContextType>({
    cityName: '',
    config: null,
    thresholds: DEFAULT_LEVEL_THRESHOLDS,
    isLoading: true,
    error: null,
})

// Esperas entre reintentos de la configuración (cerca de un minuto en total).
const CONFIG_RETRY_DELAYS_MS = [1000, 3000, 7000, 15000, 30000]

export const CityConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<MapConfigResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        let isMounted = true

        // Sin botón para reintentar: insiste más que las cargas de las pantallas,
        // porque mientras no llega toda la app usa los umbrales por defecto.
        withRetry(() => api.get<MapConfigResponse>('/map/config'), CONFIG_RETRY_DELAYS_MS)
            .then(data => {
                if (isMounted && data) {
                    setConfig(data)
                }
            })
            .catch(err => {
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error(String(err)))
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [])

    const cityName = config?.city_name || ''
    const thresholds = config?.thresholds ?? DEFAULT_LEVEL_THRESHOLDS

    return (
        <CityConfigContext.Provider value={{ cityName, config, thresholds, isLoading, error }}>
            {children}
        </CityConfigContext.Provider>
    )
}

export const useCityConfig = () => useContext(CityConfigContext)

/** Umbrales de nivel definidos por el backend (única fuente de verdad). */
export const useLevelThresholds = () => useContext(CityConfigContext).thresholds
