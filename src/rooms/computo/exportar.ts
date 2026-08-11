/**
 * Exportar: PDF por impresión y .xlsx real.
 *
 * EL PDF SE IMPRIME EN UN IFRAME APARTE, no con un `@media print` sobre la app.
 * Motivo: `RoomOverlay` es `absolute inset-0` dentro de un contenedor de altura
 * fija con `overflow:hidden`, hermano del canvas de la casa. Imprimir eso sale
 * en blanco, y esconder `#root` con `display:none` colapsa el contenedor del
 * `<Canvas>`, cuyo ResizeObserver dispara un `setSize(0,0)` sobre el renderer —
 * con riesgo real de perder el contexto WebGL y volver a una casa negra.
 *
 * El marco clona los `<style>`/`<link>` del documento para que Tailwind y el CSS
 * de KaTeX valgan dentro, y añade su propia hoja de impresión.
 */
import type { HojaCalculo, VariableFormula } from '../../core/data/db'
import { tGlobal } from '../../core/i18n/useT'
import { COLORES_PASTEL } from './constantes'
import { datosDeGrafica, hayDatos } from './datosGrafica'
import { esFormula, nombreCol, pintar, recalcular, refA1 } from './hoja'
import type { Motor } from './motor'
import { construirXlsx, type CeldaXlsx } from './xlsx'
import type { GraficaXlsx } from './xlsxChart'

/** En Android/WebView `window.print()` no existe: hay que decirlo, no fallar. */
export const puedeImprimir = () => typeof window !== 'undefined' && typeof window.print === 'function'

const ESTILO_IMPRESION = `
@page { size: A4; margin: 14mm; }
:root, html, body {
  background: #fff !important; color: #111 !important;
  height: auto !important; overflow: visible !important;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
* { color: #111 !important; border-color: #ccc !important;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1 { font-size: 18px; margin: 0 0 4px; }
h2 { font-size: 13px; margin: 14px 0 4px; color: #444 !important; }
.mph-meta { font-size: 11px; color: #666 !important; margin: 0 0 12px; }
.mph-formula { break-inside: avoid; page-break-inside: avoid;
  border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; margin: 0 0 8px; }
.mph-formula .mph-tex { text-align: center; margin: 6px 0; font-size: 15px; }
.mph-vars { font-size: 11px; color: #555 !important; }
table { border-collapse: collapse; width: 100%; font-size: 11px; }
thead { display: table-header-group; }
th, td { border: 1px solid #ccc; padding: 3px 5px; text-align: left; }
th { background: #f1f1f1 !important; font-weight: 600; }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
`

/** Abre el diálogo de impresión con ese HTML, sin tocar el documento de la app. */
export async function imprimir(html: string, titulo: string): Promise<void> {
  if (!puedeImprimir()) {
    throw new Error('sin-impresion')
  }
  const marco = document.createElement('iframe')
  marco.setAttribute('aria-hidden', 'true')
  marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(marco)

  const doc = marco.contentDocument
  if (!doc) {
    marco.remove()
    throw new Error('sin-impresion')
  }
  doc.open()
  doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>')
  doc.close()
  // El título es el nombre que propone el diálogo al guardar como PDF.
  doc.title = titulo

  for (const nodo of document.head.querySelectorAll('style, link[rel="stylesheet"]')) {
    doc.head.appendChild(nodo.cloneNode(true))
  }
  const propio = doc.createElement('style')
  propio.textContent = ESTILO_IMPRESION
  doc.head.appendChild(propio)
  doc.body.innerHTML = html

  // Las fuentes de KaTeX se cargan bajo demanda: sin esperarlas, la fórmula se
  // mide con la fuente equivocada y sale descuadrada.
  try {
    await (doc as Document & { fonts?: FontFaceSet }).fonts?.ready
  } catch {
    /* el navegador no expone document.fonts */
  }

  marco.contentWindow?.focus()
  marco.contentWindow?.print()
  // Safari necesita que el marco siga vivo un momento después de imprimir.
  window.setTimeout(() => marco.remove(), 1000)
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Una fórmula lista para el papel: LaTeX compuesto y su tabla de variables. */
export function formulaHtml(
  f: { nombre: string; tex?: string; expresion: string; resultado: string; descripcion?: string; variables: VariableFormula[] },
  motor: Motor | null,
): string {
  const tex = f.tex ?? (motor ? `${f.resultado} = ${motor.aTex(f.expresion)}` : '')
  let cuerpo = `<div class="mph-tex" style="font-family:ui-monospace,monospace">${esc(`${f.resultado} = ${f.expresion}`)}</div>`
  if (motor && tex) {
    const caja = document.createElement('div')
    try {
      motor.pintarTex(caja, tex, true)
      cuerpo = `<div class="mph-tex">${caja.innerHTML}</div>`
    } catch {
      /* se queda el monoespaciado */
    }
  }
  const vars = f.variables
    .map((v) => `${esc(v.simbolo)} = ${esc(v.nombre)}${v.unidad ? ` (${esc(v.unidad)})` : ''}`)
    .join(' · ')
  return `<div class="mph-formula">
    <strong>${esc(f.nombre)}</strong>
    ${f.descripcion ? `<div class="mph-vars">${esc(f.descripcion)}</div>` : ''}
    ${cuerpo}
    ${vars ? `<div class="mph-vars">${vars}</div>` : ''}
  </div>`
}

/** Imprime una o varias fórmulas (una ficha, o una carpeta entera). */
export async function imprimirFormulas(
  titulo: string,
  formulas: Parameters<typeof formulaHtml>[0][],
  motor: Motor | null,
): Promise<void> {
  const html = `<h1>${esc(titulo)}</h1>
<p class="mph-meta">${esc(tGlobal('computo.export.pie', 'Mind Planner Home · Sala de cómputo'))}</p>
${formulas.map((f) => formulaHtml(f, motor)).join('')}`
  await imprimir(html, titulo)
}

/** Recorta la hoja a lo que de verdad tiene algo (nadie quiere 200 filas vacías). */
function usado(hoja: HojaCalculo): { filas: number; cols: number } {
  let filas = 0
  let cols = 0
  for (const ref of Object.keys(hoja.celdas)) {
    const m = /^([A-Z]{1,2})([0-9]{1,3})$/.exec(ref)
    if (!m) continue
    let c = 0
    for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64)
    filas = Math.max(filas, Number(m[2]))
    cols = Math.max(cols, c)
  }
  return { filas: Math.max(1, filas), cols: Math.max(1, cols) }
}

/** Imprime una hoja como tabla, con su cabecera repetida en cada página. */
export async function imprimirHoja(hoja: HojaCalculo, motor: Motor | null): Promise<void> {
  const res = recalcular(hoja.celdas, motor)
  const { filas, cols } = usado(hoja)
  const cabecera = Array.from({ length: cols }, (_, c) => `<th>${nombreCol(c)}</th>`).join('')
  const cuerpo = Array.from({ length: filas }, (_, f) => {
    const celdas = Array.from({ length: cols }, (_, c) => {
      const ref = refA1(f, c)
      const celda = hoja.celdas[ref]
      const r = res[ref]
      const texto = r?.error ?? pintar(r?.valor, celda)
      const clase = typeof r?.valor === 'number' ? ' class="num"' : ''
      return `<td${clase}>${esc(texto)}</td>`
    }).join('')
    return `<tr><th style="width:28px">${f + 1}</th>${celdas}</tr>`
  }).join('')

  const html = `<h1>${esc(hoja.nombre)}</h1>
<p class="mph-meta">${esc(tGlobal('computo.export.pie', 'Mind Planner Home · Sala de cómputo'))}</p>
<table><thead><tr><th></th>${cabecera}</tr></thead><tbody>${cuerpo}</tbody></table>`
  await imprimir(html, hoja.nombre)
}

/** Descarga la hoja como .xlsx, conservando las fórmulas vivas. */
export async function descargarXlsx(hoja: HojaCalculo, motor: Motor | null): Promise<void> {
  const res = recalcular(hoja.celdas, motor)
  const celdas: CeldaXlsx[] = []
  for (const [ref, celda] of Object.entries(hoja.celdas)) {
    if (celda.crudo === '') continue
    const r = res[ref]
    if (esFormula(celda)) {
      celdas.push({
        ref,
        formula: celda.crudo.slice(1),
        valor: typeof r?.valor === 'number' ? r.valor : undefined,
        negrita: celda.fmt?.neg,
      })
      continue
    }
    const n = Number(celda.crudo.replace(',', '.'))
    celdas.push({
      ref,
      valor: Number.isFinite(n) && celda.crudo.trim() !== '' ? n : celda.crudo,
      negrita: celda.fmt?.neg,
    })
  }

  const blob = await construirXlsx([{ nombre: hoja.nombre, celdas, graficas: graficasXlsx(hoja, res) }])
  descargar(blob, `${hoja.nombre.replace(/[\\/:*?"<>|]/g, '-')}.xlsx`)
}

/** '#38BDF8' → '38BDF8': OOXML quiere el hex pelado. */
const hex = (c: string) => c.replace('#', '').toUpperCase()

/**
 * Las gráficas de la hoja, traducidas a gráficas de Excel. Se colocan a la
 * derecha de los datos y en columna, una debajo de otra.
 *
 * Una gráfica con el rango roto se DESCARTA en silencio: que un rango mal
 * escrito impidiera exportar la hoja entera sería el peor intercambio posible.
 */
function graficasXlsx(hoja: HojaCalculo, res: ReturnType<typeof recalcular>): GraficaXlsx[] {
  const { cols } = usado(hoja)
  const salida: GraficaXlsx[] = []
  for (const g of hoja.graficas ?? []) {
    const d = datosDeGrafica(g, hoja.celdas, res)
    if (!d || !hayDatos(d)) continue
    salida.push({
      tipo: d.tipo,
      titulo: d.titulo || undefined,
      rangoCat: d.rangoCat,
      etiquetas: d.etiquetas,
      valoresCat: d.numerosCat,
      series: d.series.map((s) => ({ ...s, color: hex(s.color) })),
      colores: COLORES_PASTEL.map(hex),
      ancla: {
        col: cols + 1,
        fila: salida.length * 16,
        colFin: cols + 9,
        filaFin: salida.length * 16 + 15,
      },
    })
  }
  return salida
}

/** Blob → archivo en el disco (mismo baile que el respaldo de datos). */
export function descargar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}
