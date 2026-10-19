import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

// Cada cuánto se pregunta si llegaron lecturas nuevas.
export const CHANGES_POLL_MS = 5000

interface SiteChangesResponse {
  latest_cursor: number
  sites: Array<{ last_reading?: string | null }>
}

export interface DataChanges {
  // Sube cada vez que el backend registra lecturas nuevas (0 hasta el primer cambio).
  version: number
  // Fecha de la última lectura vista en el aviso de cambios (null si todavía no hay).
  latestReading: string | null
}

/**
 * Avisa cuando cambian los datos de los contenedores, vengan del simulador o de
 * sensores reales: pregunta al backend por su cursor de cambios cada `pollMs`,
 * espera la respuesta antes de la próxima consulta y no pregunta con la pestaña oculta.
 */
export function useDataChanges(pollMs: number = CHANGES_POLL_MS): DataChanges {
  const [changes, setChanges] = useState<DataChanges>({ version: 0, latestReading: null })

  useEffect(() => {
    let cancelled = false
    let timeoutId: number | undefined
    let cursor: number | null = null

    const poll = async () => {
      if (document.visibilityState !== 'hidden') {
        try {
          // Con limit=1 la respuesta trae el cursor y como mucho un sitio cambiado.
          const response = await api.get<SiteChangesResponse>(
            `/map/sites/changes?after=${cursor ?? 0}&limit=1`
          )
          if (cancelled) return
          const changed = cursor !== null && response.latest_cursor !== cursor
          cursor = response.latest_cursor
          const reading = response.sites[0]?.last_reading ?? null
          setChanges((previous) => ({
            version: changed ? previous.version + 1 : previous.version,
            latestReading: latest(previous.latestReading, reading),
          }))
        } catch {
          // Un fallo aislado no corta el aviso: se vuelve a preguntar en la próxima vuelta.
        }
      }
      if (!cancelled) timeoutId = window.setTimeout(() => void poll(), pollMs)
    }

    void poll()
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [pollMs])

  return changes
}

/** La más reciente de dos fechas ISO (cualquiera puede faltar). */
export function latest(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return Date.parse(asUtc(b)) > Date.parse(asUtc(a)) ? b : a
}

/** Las fechas del backend sin zona son UTC. */
export function asUtc(value: string): string {
  return /(Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`
}
