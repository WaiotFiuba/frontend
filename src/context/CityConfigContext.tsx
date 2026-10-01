import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from '@/lib/api'

export interface MapConfigResponse {
    city_name: string
    center: { lat: number; lng: number }
    default_zoom: number
    bounds: [[number, number], [number, number]] | null
    is_loaded?: boolean
}

interface CityConfigContextType {
    cityName: string
    config: MapConfigResponse | null
    isLoading: boolean
    error: Error | null
}

const CityConfigContext = createContext<CityConfigContextType>({
    cityName: '',
    config: null,
    isLoading: true,
    error: null,
})

export const CityConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<MapConfigResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        let isMounted = true

        api.get<MapConfigResponse>('/map/config')
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

    return (
        <CityConfigContext.Provider value={{ cityName, config, isLoading, error }}>
            {children}
        </CityConfigContext.Provider>
    )
}

export const useCityConfig = () => useContext(CityConfigContext)
