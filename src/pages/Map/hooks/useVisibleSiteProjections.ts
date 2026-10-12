import { useEffect, useRef, useState } from 'react'
import type { BackendSiteProjection, Site } from '@/common/utils/types'
import { fetchSiteProjections } from '../services/projectionApi'

type ProjectionResult = BackendSiteProjection | null

export function useVisibleSiteProjections(
  sites: Site[],
  asOf: string | null,
  targetAt: string | null,
  modelKey: string
) {
  const key = asOf && targetAt ? `${asOf}|${targetAt}|${modelKey}` : ''
  const cache = useRef<{ key: string; values: Map<number, ProjectionResult> }>({
    key: '',
    values: new Map(),
  })
  const [result, setResult] = useState<{
    key: string
    values: Map<number, ProjectionResult>
  }>({ key: '', values: new Map() })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const visibleSiteIds = [...new Set(
    sites
      .filter((site) => !site.isCluster && /^\d+$/.test(site.id))
      .map((site) => Number(site.id))
  )].sort((left, right) => left - right).join(',')

  useEffect(() => {
    if (!asOf || !targetAt) {
      setLoading(false)
      setError(null)
      return
    }

    if (cache.current.key !== key) {
      cache.current = { key, values: new Map() }
      setResult({ key, values: new Map() })
    }

    const siteIds = visibleSiteIds ? visibleSiteIds.split(',').map(Number) : []
    const missing = siteIds.filter((siteId) => !cache.current.values.has(siteId))
    if (missing.length === 0) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const load = async () => {
      try {
        for (let index = 0; index < missing.length; index += 100) {
          if (cancelled) return
          const batch = missing.slice(index, index + 100)
          const response = await fetchSiteProjections(batch, asOf, targetAt, modelKey)
          if (cancelled || cache.current.key !== key) return

          for (const projection of response.sites) {
            cache.current.values.set(projection.site_id, projection)
          }
          for (const siteId of response.skipped_site_ids) {
            cache.current.values.set(siteId, null)
          }
          setResult({ key, values: new Map(cache.current.values) })
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las proyecciones.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [visibleSiteIds, asOf, targetAt, modelKey, key, retry])

  return {
    projections: result.key === key ? result.values : new Map<number, ProjectionResult>(),
    loading,
    error,
    retry: () => setRetry((value) => value + 1),
  }
}
