import type { BackendSiteProjectionBatch, BackendSiteProjectionModels } from '@/utils/types'
import { api } from '@/lib/api'

export const fetchProjectionModels = (): Promise<BackendSiteProjectionModels> =>
  api.get<BackendSiteProjectionModels>('/map/site-projections/models')

export const fetchSiteProjections = (
  siteIds: number[],
  asOf: string,
  targetAt: string,
  modelKey = 'baseline_operational'
): Promise<BackendSiteProjectionBatch> =>
  api.post<BackendSiteProjectionBatch>('/map/site-projections', {
    site_ids: siteIds,
    as_of: asOf,
    target_at: targetAt,
    model_key: modelKey,
  })
