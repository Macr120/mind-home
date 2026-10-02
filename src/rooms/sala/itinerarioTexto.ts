import { localeActual, tGlobal } from '../../core/i18n/useT'

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
  const columnas = [
    tGlobal('sala.hoja.dia', 'Día'),
    tGlobal('sala.hoja.fecha', 'Fecha'),
    tGlobal('sala.hoja.inicio', 'Inicio'),
    tGlobal('sala.hoja.destino', 'Destino'),
    tGlobal('sala.hoja.hospedaje', 'Hospedaje'),
    tGlobal('sala.hoja.actividades', 'Actividades'),
    tGlobal('sala.hoja.transporte', 'Transporte'),
    tGlobal('sala.hoja.presupuesto', 'Presupuesto'),
  ]
  lineas.push(`| ${columnas.join(' | ')} |`)
  lineas.push('|---|---|---|---|---|---|---|---|')
  for (const f of filas) {
    const presu = f.presupuesto ? `$${f.presupuesto.toLocaleString(localeActual())}` : ''
    lineas.push(
      `| ${f.dia} | ${c(f.fecha)} | ${c(f.inicio)} | ${c(f.destino)} | ${c(f.hospedaje)} | ${c(f.actividades)} | ${c(f.transporte)} | ${presu} |`,
    )
  }
  if (total > 0) {
    lineas.push('')
    lineas.push(`💵 ${tGlobal('sala.hoja.totalCompartir', 'Presupuesto total: {n}', { n: `$${total.toLocaleString(localeActual())}` })}`)
  }
  return lineas.join('\n').trim()
}
