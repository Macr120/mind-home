/**
 * Compartir texto: utilidad genérica del chrome (no de un cuarto concreto),
 * usada por Wrapped y por el itinerario de viajes.
 */

export type ResultadoCompartir = { tipo: 'compartido' | 'copiado' } | { tipo: 'manual'; texto: string }

/** Comparte un texto: Web Share → portapapeles → si ambos fallan, lo devuelve para mostrarlo a mano. */
export async function compartirTexto(titulo: string, texto: string): Promise<ResultadoCompartir> {
  if (navigator.share) {
    try {
      await navigator.share({ title: titulo, text: texto })
      return { tipo: 'compartido' }
    } catch {
      // Cancelado por el usuario o sin permiso: cae al portapapeles.
    }
  }
  try {
    await navigator.clipboard.writeText(texto)
    return { tipo: 'copiado' }
  } catch {
    return { tipo: 'manual', texto }
  }
}
