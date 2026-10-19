import type { ReactNode } from 'react'

// Lo que una página le agrega al mapa sin que el mapa lo conozca.
export interface MapExtras {
  // Capas dentro del mapa de Leaflet (pueden usar useMap).
  layers?: ReactNode
  // Botones en la barra flotante de arriba del mapa.
  controls?: ReactNode
  // Elementos superpuestos al mapa (leyendas, avisos), anclados a su contenedor.
  overlays?: ReactNode
}
