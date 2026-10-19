/**
 * Envuelve una carga para que nunca haya dos en curso. Si se pide otra mientras
 * corre una, se hace una sola más al terminar, así queda con los datos más nuevos
 * sin apilar pedidos cuando el backend responde lento.
 */
export function singleFlight(run: () => Promise<unknown>): () => void {
  let running = false
  let pending = false

  const start = (): void => {
    if (running) {
      pending = true
      return
    }
    running = true
    run()
      .catch(() => {})
      .finally(() => {
        running = false
        if (pending) {
          pending = false
          start()
        }
      })
  }

  return start
}
