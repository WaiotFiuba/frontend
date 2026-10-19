// Esperas entre reintentos. Alcanza para que se recupere un backend que se está
// despertando en el hosting (los primeros pedidos responden 502 o tardan).
export const RETRY_DELAYS_MS = [1000, 3000, 7000]

/**
 * Hace la carga y, si falla, la reintenta después de cada espera de `delays`.
 * Si falla también el último intento, propaga ese error.
 */
export async function withRetry<T>(
  load: () => Promise<T>,
  delays: readonly number[] = RETRY_DELAYS_MS
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await load()
    } catch (error) {
      if (attempt >= delays.length) throw error
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]))
    }
  }
}
