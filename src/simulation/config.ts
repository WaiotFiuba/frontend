// Herramientas del simulador (panel de control y perfiles de zona). Están
// activadas salvo que VITE_ENABLE_SIMULATOR sea "false" (por ejemplo, en un
// despliegue que solo recibe datos de sensores reales).
export const SIMULATOR_ENABLED = import.meta.env.VITE_ENABLE_SIMULATOR !== 'false'
