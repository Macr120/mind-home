/** Fila de un plan día a día (compatible con DiaItinerario y FilaItinerarioGuardado). */
export interface FilaPlan {
  dia: number
  fecha?: string
  inicio?: string
  destino?: string
  hospedaje?: string
  actividades?: string
  transporte?: string
  presupuesto?: number
}

/** Arma el plan como tabla en Markdown, lista para compartir o copiar. */
export function tablaItinerario(
  titulo: string,
  contexto: string | undefined,
  filas: FilaPlan[],
  total: number,
): string {
  const c = (v?: string) => (v ?? '').replace(/\|/g, '/')
  const lineas = [`✈️ ${titulo}`]
  if (contexto) lineas.push(contexto)
  lineas.push('')
  lineas.push('| Día | Fecha | Inicio | Destino | Hospedaje | Actividades | Transporte | Presupuesto |')
  lineas.push('|---|---|---|---|---|---|---|---|')
  for (const f of filas) {
    const presu = f.presupuesto ? `$${f.presupuesto.toLocaleString()}` : ''
    lineas.push(
      `| ${f.dia} | ${c(f.fecha)} | ${c(f.inicio)} | ${c(f.destino)} | ${c(f.hospedaje)} | ${c(f.actividades)} | ${c(f.transporte)} | ${presu} |`,
    )
  }
  if (total > 0) {
    lineas.push('')
    lineas.push(`💵 Presupuesto total: $${total.toLocaleString()}`)
  }
  return lineas.join('\n').trim()
}

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
