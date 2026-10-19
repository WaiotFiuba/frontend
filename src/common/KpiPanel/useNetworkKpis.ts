import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { withRetry } from '@/lib/retry'
import { singleFlight } from '@/lib/singleFlight'
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

  const fetchMetrics = useCallback(async (withRetries: boolean = true) => {
    if (!enabled || externalMetrics !== undefined) return

    setLoading(true)
    setError(null)
    try {
      const query = whatif ? '?whatif=true' : ''
      const load = () => api.get<NetworkMetricsData>(`/map/kpis${query}`)
      const result = await (withRetries ? withRetry(load) : load())
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

  // Cargas de a una: la primera se reintenta (el backend puede estar despertándose);
  // los refrescos no, y si llega otro mientras corre uno se hace uno solo más al terminar.
  const fetchMetricsRef = useRef(fetchMetrics)
  useEffect(() => {
    fetchMetricsRef.current = fetchMetrics
  }, [fetchMetrics])
  const loadRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    let attempted = false
    loadRef.current = singleFlight(async () => {
      const firstLoad = !attempted
      attempted = true
      await fetchMetricsRef.current(firstLoad)
    })
  }, [])

  // Fetch cuando monta o cambia refreshTrigger
  useEffect(() => {
    isMountedRef.current = true
    if (externalMetrics === undefined) {
      loadRef.current?.()
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
