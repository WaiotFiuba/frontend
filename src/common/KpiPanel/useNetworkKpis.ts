import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import type { NetworkMetricsData } from './types'

interface UseNetworkKpisOptions {
  externalMetrics?: NetworkMetricsData | null
  refreshTrigger?: number
  enabled?: boolean
  whatif?: boolean
}

export function useNetworkKpis({
  externalMetrics,
  refreshTrigger = 0,
  enabled = true,
  whatif = false,
}: UseNetworkKpisOptions = {}) {
  const [data, setData] = useState<NetworkMetricsData | null>(externalMetrics ?? null)
  const [loading, setLoading] = useState<boolean>(!externalMetrics && enabled)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchMetrics = useCallback(async () => {
    if (!enabled || externalMetrics !== undefined) return

    setLoading(true)
    setError(null)
    try {
      const query = whatif ? '?whatif=true' : ''
      const result = await api.get<NetworkMetricsData>(`/map/kpis${query}`)
      if (isMountedRef.current) {
        setData(result)
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.warn('Error al obtener métricas de red para el KPI Panel:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar métricas')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [enabled, externalMetrics, whatif])

  // Sincronizar si llegan metrics por props externas
  useEffect(() => {
    if (externalMetrics !== undefined) {
      setData(externalMetrics)
      setLoading(false)
    }
  }, [externalMetrics])

  // Fetch cuando monta o cambia refreshTrigger
  useEffect(() => {
    isMountedRef.current = true
    if (externalMetrics === undefined) {
      void fetchMetrics()
    }
    return () => {
      isMountedRef.current = false
    }
  }, [fetchMetrics, refreshTrigger, externalMetrics])

  return {
    metrics: externalMetrics !== undefined ? externalMetrics : data,
    loading: externalMetrics !== undefined ? false : loading,
    error,
    refetch: fetchMetrics,
  }
}
