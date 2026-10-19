import type { DocSection, DocumentationRegistry } from '../types'
import { getMapDoc } from './mapDoc'
import { getForecastDoc } from './forecastDoc'
import { getOptimizationDoc } from './optimizationDoc'
import { getConfigurationsDoc } from './configurationsDoc'

export const getDocumentationRegistry = (lang: string): DocumentationRegistry => {
  return {
    map: getMapDoc(lang),
    forecast: getForecastDoc(lang),
    optimization: getOptimizationDoc(lang),
    configurations: getConfigurationsDoc(lang),
  }
}

export const getDocumentationForRoute = (pathname: string, lang: string): DocSection => {
  const registry = getDocumentationRegistry(lang)

  if (pathname.startsWith('/forecast-evaluation')) {
    return registry.forecast
  }
  if (pathname.startsWith('/optimization')) {
    return registry.optimization
  }
  if (pathname.startsWith('/configurations')) {
    return registry.configurations
  }
  // Por defecto para /map y rutas del mapa
  return registry.map
}
