import { descargarArchivo } from '../../descargarArchivo'
import { imprimir, puedeImprimir } from '../../imprimir'
import type { PlanCorte } from '../../muebles/corte'
import type { Presupuesto } from '../../muebles/costos'
import type { Despiece } from '../../muebles/tipos'
import { PALETA_PAPEL, svgTexto, type OpcsDibujo } from './corteSvg'
import type { HojaCorte } from '../../muebles/corte'

/**
 * Salidas del taller: imprimir (que es como se hace un PDF en esta app, sin
 * meter una librería de 300 KB), descargar el dibujo como SVG o PNG, y el
 * presupuesto como hoja de cálculo.
 */

const OPCS_PAPEL: OpcsDibujo = { cotas: true, etiquetas: true, cantos: true }

/** Hoja de estilos del documento impreso: A4 apaisado, una hoja de corte por página. */
const ESTILO_IMPRESION = `
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: system-ui, sans-serif; color: #18181b; background: #fff; }
  h1 { font-size: 16pt; margin: 0 0 2mm; }
  h2 { font-size: 12pt; margin: 4mm 0 2mm; }
  .meta { font-size: 9pt; color: #52525b; margin-bottom: 4mm; }
  .hoja { break-after: page; }
  .hoja:last-child { break-after: auto; }
  .hoja svg { width: 100%; height: auto; max-height: 150mm; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-top: 3mm; }
  th, td { border: 1px solid #d4d4d8; padding: 1.2mm 2mm; text-align: start; }
  th { background: #f4f4f5; font-weight: 600; }
  td.num { text-align: end; font-variant-numeric: tabular-nums; }
  tfoot td { font-weight: 700; background: #fafafa; }
`

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Nombre de archivo seguro a partir del nombre del mueble. */
function nombreArchivo(base: string, sufijo: string, ext: string): string {
  const limpio = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `${limpio || 'mueble'}-${sufijo}.${ext}`
}

export const sePuedeImprimir = (): boolean => puedeImprimir()

/** Letra de columna de Excel (A, B, … Z, AA) a partir de su índice 0. */
function columna(i: number): string {
  let n = i
  let s = ''
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

/** Tabla por filas a las celdas con referencia A1 que pide `construirXlsx`. */
function celdasDeFilas(filas: (string | number)[][]) {
  return filas.flatMap((fila, f) =>
    fila
      .map((valor, c) => ({ ref: `${columna(c)}${f + 1}`, valor, negrita: f === 0 }))
      .filter((celda) => celda.valor !== ''),
  )
}

/** Documento imprimible con una hoja de corte por página y su lista de piezas. */
export async function imprimirPlanCorte(
  plan: PlanCorte,
  despiece: Despiece,
  titulo: string,
  textos: { hoja: string; aprov: string; pieza: string; medidas: string; cant: string; material: string },
): Promise<void> {
  const secciones: string[] = []
  for (const g of plan.grupos) {
    for (const h of g.hojas) {
      const filas = h.piezas
        .map(
          (p) =>
            `<tr><td>${esc(p.etiqueta)}</td><td>${esc(p.nombreEs)}</td><td class="num">${
              p.forma === 'circular' ? `Ø ${p.ancho}` : `${p.ancho} × ${p.alto}`
            }</td></tr>`,
        )
        .join('')
      secciones.push(
        `<section class="hoja"><h2>${esc(g.materialId)} ${g.grosor} mm · ${esc(textos.hoja)} ${
          h.indice
        }/${g.hojas.length} · ${esc(textos.aprov)} ${Math.round(h.aprovechamiento * 100)} %</h2>` +
          svgTexto(h, PALETA_PAPEL, OPCS_PAPEL) +
          `<table><thead><tr><th>#</th><th>${esc(textos.pieza)}</th><th>${esc(
            textos.medidas,
          )}</th></tr></thead><tbody>${filas}</tbody></table></section>`,
      )
    }
  }
  const total = despiece.tableros.reduce((a, t) => a + t.cantidad, 0)
  const html =
    `<h1>${esc(titulo)}</h1>` +
    `<p class="meta">${total} ${esc(textos.cant)} · ${new Date().toLocaleDateString()}</p>` +
    secciones.join('')
  await imprimir(html, titulo, ESTILO_IMPRESION)
}

/** Documento imprimible del presupuesto. */
export async function imprimirPresupuesto(
  p: Presupuesto,
  titulo: string,
  fmt: (n: number) => string,
  textos: { concepto: string; cant: string; unitario: string; importe: string; total: string; impuesto: string },
): Promise<void> {
  const filas = p.renglones
    .map(
      (r) =>
        `<tr><td>${esc(r.concepto)}${
          r.detalle ? ` <span style="color:#71717a">· ${esc(r.detalle)}</span>` : ''
        }</td><td class="num">${r.cantidad} ${esc(r.unidad)}</td><td class="num">${esc(
          fmt(r.unitario),
        )}</td><td class="num">${esc(fmt(r.subtotal))}</td></tr>`,
    )
    .join('')
  const html =
    `<h1>${esc(titulo)}</h1>` +
    `<p class="meta">${new Date().toLocaleDateString()}</p>` +
    `<table><thead><tr><th>${esc(textos.concepto)}</th><th>${esc(textos.cant)}</th><th>${esc(
      textos.unitario,
    )}</th><th>${esc(textos.importe)}</th></tr></thead><tbody>${filas}</tbody>` +
    (p.impuesto > 0
      ? `<tr><td colspan="3" class="num">${esc(textos.impuesto)}</td><td class="num">${esc(
          fmt(p.impuesto),
        )}</td></tr>`
      : '') +
    `<tfoot><tr><td colspan="3" class="num">${esc(textos.total)}</td><td class="num">${esc(
      fmt(p.total),
    )}</td></tr></tfoot></table>`
  await imprimir(html, titulo, ESTILO_IMPRESION)
}

/** Descarga el dibujo de una hoja como SVG (tinta sobre papel, archivo autónomo). */
export async function descargarHojaSvg(hoja: HojaCorte, nombre: string, pie?: string): Promise<void> {
  const txt = svgTexto(hoja, PALETA_PAPEL, OPCS_PAPEL, pie)
  await descargarArchivo(
    new Blob([txt], { type: 'image/svg+xml;charset=utf-8' }),
    nombreArchivo(nombre, `corte-${hoja.id}`, 'svg'),
  )
}

/** Máximo lado de la imagen rasterizada (los canvas enormes fallan en móvil). */
const MAX_PX = 4096

/**
 * Descarga el dibujo como PNG. Es *best effort*: rasterizar un SVG desde un
 * `blob:` es irregular en WKWebView, así que si algo falla se entrega el SVG,
 * que siempre funciona.
 */
export async function descargarHojaPng(hoja: HojaCorte, nombre: string): Promise<void> {
  const txt = svgTexto(hoja, PALETA_PAPEL, OPCS_PAPEL)
  const url = URL.createObjectURL(new Blob([txt], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const escala = Math.min(4, MAX_PX / Math.max(hoja.ancho, hoja.alto))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(hoja.ancho * escala)
    canvas.height = Math.round(hoja.alto * escala)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('sin canvas 2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
    if (!blob) throw new Error('sin blob')
    await descargarArchivo(blob, nombreArchivo(nombre, `corte-${hoja.id}`, 'png'))
  } catch {
    await descargarHojaSvg(hoja, nombre)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Presupuesto + despiece + acomodo en un .xlsx. Reutiliza el escritor OOXML de
 * la sala de cómputo tal cual (carga diferida: son ~40 KB de `fflate`).
 */
export async function descargarPresupuestoXlsx(
  p: Presupuesto,
  d: Despiece,
  plan: PlanCorte | null,
  nombre: string,
  textos: {
    presupuesto: string
    despiece: string
    acomodo: string
    concepto: string
    detalle: string
    cant: string
    unidad: string
    unitario: string
    importe: string
    total: string
    pieza: string
    ancho: string
    alto: string
    grosor: string
    material: string
    veta: string
    hoja: string
    girada: string
  },
): Promise<void> {
  const { construirXlsx } = await import('../../../rooms/computo/xlsx')
  const hojas = [
    {
      nombre: textos.presupuesto,
      filas: [
        [textos.concepto, textos.detalle, textos.cant, textos.unidad, textos.unitario, textos.importe],
        ...p.renglones.map((r) => [r.concepto, r.detalle ?? '', r.cantidad, r.unidad, r.unitario, r.subtotal]),
        [textos.total, '', '', '', '', p.total],
      ],
    },
    {
      nombre: textos.despiece,
      filas: [
        [textos.pieza, textos.cant, textos.ancho, textos.alto, textos.grosor, textos.material, textos.veta],
        ...d.tableros.map((t) => [t.nombreEs, t.cantidad, t.ancho, t.alto, t.grosor, t.materialId, t.veta]),
      ],
    },
  ]
  if (plan) {
    hojas.push({
      nombre: textos.acomodo,
      filas: [
        [textos.hoja, '#', textos.pieza, 'X', 'Y', textos.ancho, textos.alto, textos.girada],
        ...plan.grupos.flatMap((g) =>
          g.hojas.flatMap((h) =>
            h.piezas.map((pc) => [h.id, pc.etiqueta, pc.nombreEs, pc.x, pc.y, pc.ancho, pc.alto, pc.rotada ? 1 : 0]),
          ),
        ),
      ],
    })
  }
  const blob = await construirXlsx(
    hojas.map((h) => ({ nombre: h.nombre, celdas: celdasDeFilas(h.filas) })),
  )
  await descargarArchivo(blob, nombreArchivo(nombre, 'presupuesto', 'xlsx'))
}
