import type { HojaCorte, PiezaColocada } from '../../muebles/corte'
import type { Mm } from '../../muebles/tipos'

/**
 * Dibujo de una hoja de corte. La geometría se calcula UNA vez como lista de
 * primitivas y de ahí salen los dos formatos que hacen falta: el JSX de la
 * pantalla (con los colores del tema) y un `<svg>` autónomo de texto (con tinta
 * sobre papel) para imprimir, descargar o convertir a PNG.
 *
 * Duplicar la geometría en dos pintores sería la forma segura de que el dibujo
 * de pantalla y el impreso acabaran diciendo cosas distintas.
 */

export type Primitiva =
  | {
      t: 'rect'
      x: number
      y: number
      w: number
      h: number
      relleno?: string
      borde?: string
      grosor?: number
      guion?: string
      rayado?: boolean
      piezaId?: string
    }
  | {
      t: 'texto'
      x: number
      y: number
      txt: string
      color: string
      tam: number
      ancla?: 'start' | 'middle' | 'end'
      girado?: boolean
      peso?: number
    }
  | { t: 'linea'; x1: number; y1: number; x2: number; y2: number; color: string; grosor: number; guion?: string }
  | { t: 'circulo'; cx: number; cy: number; r: number; borde: string; grosor: number; guion?: string }

export interface PaletaCorte {
  fondo: string
  hoja: string
  hojaBorde: string
  util: string
  texto: string
  textoTenue: string
  canto: string
  sobrante: string
  cota: string
}

/** Tinta sobre papel: para imprimir, exportar SVG y rasterizar a PNG. */
export const PALETA_PAPEL: PaletaCorte = {
  fondo: '#ffffff',
  hoja: '#fbfaf7',
  hojaBorde: '#3f3f46',
  util: '#a1a1aa',
  texto: '#18181b',
  textoTenue: '#71717a',
  canto: '#b45309',
  sobrante: '#d4d4d8',
  cota: '#52525b',
}

/**
 * Paleta del visor. Sale del tema activo pero se resuelve a color literal aquí:
 * un `var(--ui-*)` dentro de un SVG exportado no significa nada fuera de la app.
 */
export function paletaCorte(claro: boolean): PaletaCorte {
  if (claro) return PALETA_PAPEL
  return {
    fondo: '#0d0f13',
    hoja: '#1a1d25',
    hojaBorde: '#3f4551',
    util: '#4b5563',
    texto: '#e5e7eb',
    textoTenue: '#9ca3af',
    canto: '#fbbf24',
    sobrante: '#374151',
    cota: '#9ca3af',
  }
}

/** Margen alrededor de la hoja, en mm, para que quepan las cotas. */
export const MARGEN_MM = 170

const conAlfa = (hex: string, alfa: number): string => {
  const n = Math.round(Math.max(0, Math.min(1, alfa)) * 255)
  return `${hex}${n.toString(16).padStart(2, '0')}`
}

/** Tamaño de letra proporcional a la pieza, acotado para que siempre se lea. */
const tamTexto = (p: PiezaColocada): number =>
  Math.max(16, Math.min(46, Math.min(p.ancho, p.alto) * 0.13))

/** Trazo del canto en el lado que lleva cinta (por dentro del borde). */
function lineasCanto(p: PiezaColocada, color: string): Primitiva[] {
  const d = 10
  const fuera: Primitiva[] = []
  if (p.forma === 'circular') {
    // El disco se cantea entero: un segundo círculo por dentro del corte.
    if (p.cantos.arriba || p.cantos.abajo || p.cantos.izq || p.cantos.der) {
      fuera.push({ t: 'circulo', cx: p.x + p.ancho / 2, cy: p.y + p.alto / 2, r: Math.min(p.ancho, p.alto) / 2 - d, borde: color, grosor: 7 })
    }
    return fuera
  }
  const linea = (x1: Mm, y1: Mm, x2: Mm, y2: Mm): Primitiva => ({
    t: 'linea',
    x1,
    y1,
    x2,
    y2,
    color,
    grosor: 7,
  })
  if (p.cantos.arriba) fuera.push(linea(p.x + d, p.y + d, p.x + p.ancho - d, p.y + d))
  if (p.cantos.abajo) fuera.push(linea(p.x + d, p.y + p.alto - d, p.x + p.ancho - d, p.y + p.alto - d))
  if (p.cantos.izq) fuera.push(linea(p.x + d, p.y + d, p.x + d, p.y + p.alto - d))
  if (p.cantos.der) fuera.push(linea(p.x + p.ancho - d, p.y + d, p.x + p.ancho - d, p.y + p.alto - d))
  return fuera
}

export interface OpcsDibujo {
  cotas: boolean
  etiquetas: boolean
  cantos: boolean
}

export function primitivasHoja(hoja: HojaCorte, pal: PaletaCorte, o: OpcsDibujo): Primitiva[] {
  const out: Primitiva[] = []
  out.push({ t: 'rect', x: 0, y: 0, w: hoja.ancho, h: hoja.alto, relleno: pal.hoja, borde: pal.hojaBorde, grosor: 4 })

  // Sobrantes primero: las piezas se pintan encima.
  for (const s of hoja.sobrantes) {
    if (!s.utilizable) continue
    out.push({ t: 'rect', x: s.x, y: s.y, w: s.ancho, h: s.alto, rayado: true, borde: pal.sobrante, grosor: 2 })
    if (Math.min(s.ancho, s.alto) > 180) {
      out.push({
        t: 'texto',
        x: s.x + s.ancho / 2,
        y: s.y + s.alto / 2 + 9,
        txt: `${s.ancho} × ${s.alto}`,
        color: pal.textoTenue,
        tam: 24,
        ancla: 'middle',
      })
    }
  }

  for (const p of hoja.piezas) {
    out.push({
      t: 'rect',
      x: p.x,
      y: p.y,
      w: p.ancho,
      h: p.alto,
      relleno: conAlfa(p.color, 0.5),
      borde: p.color,
      grosor: 3,
      piezaId: p.piezaId,
    })
    if (p.forma === 'circular') {
      // El cuadrado es lo que se corta en la seccionadora; el círculo, lo que
      // sale de él con la caladora. Va punteado para que no parezca otra pieza.
      out.push({
        t: 'circulo',
        cx: p.x + p.ancho / 2,
        cy: p.y + p.alto / 2,
        r: Math.min(p.ancho, p.alto) / 2,
        borde: p.color,
        grosor: 3,
        guion: '14 10',
      })
    }
    if (o.cantos) out.push(...lineasCanto(p, pal.canto))
    if (!o.etiquetas) continue
    const tam = tamTexto(p)
    const vertical = p.alto > p.ancho * 1.6
    const cx = p.x + p.ancho / 2
    const cy = p.y + p.alto / 2
    out.push({
      t: 'texto',
      x: cx,
      y: vertical ? cy : cy - 4,
      txt: p.etiqueta,
      color: pal.texto,
      tam,
      ancla: 'middle',
      girado: vertical,
      peso: 700,
    })
    if (Math.min(p.ancho, p.alto) >= 140) {
      out.push({
        t: 'texto',
        x: vertical ? cx + tam * 1.1 : cx,
        y: vertical ? cy : cy + tam * 1.05,
        txt: p.forma === 'circular' ? `Ø ${p.ancho}` : `${p.ancho} × ${p.alto}`,
        color: pal.textoTenue,
        tam: tam * 0.72,
        ancla: 'middle',
        girado: vertical,
      })
    }
  }

  if (o.cotas) {
    const c = pal.cota
    // Riel superior: cada corte vertical de la primera fila de piezas.
    const xs = [...new Set(hoja.piezas.map((p) => Math.round(p.x)))].sort((a, b) => a - b)
    for (const x of xs) out.push({ t: 'linea', x1: x, y1: -30, x2: x, y2: -6, color: c, grosor: 2 })
    const ys = [...new Set(hoja.piezas.map((p) => Math.round(p.y)))].sort((a, b) => a - b)
    for (const y of ys) out.push({ t: 'linea', x1: -30, y1: y, x2: -6, y2: y, color: c, grosor: 2 })
    out.push({ t: 'linea', x1: 0, y1: -46, x2: hoja.ancho, y2: -46, color: c, grosor: 3 })
    out.push({
      t: 'texto',
      x: hoja.ancho / 2,
      y: -62,
      txt: `${hoja.ancho} mm`,
      color: c,
      tam: 40,
      ancla: 'middle',
    })
    out.push({ t: 'linea', x1: -46, y1: 0, x2: -46, y2: hoja.alto, color: c, grosor: 3 })
    out.push({
      t: 'texto',
      x: -62,
      y: hoja.alto / 2,
      txt: `${hoja.alto} mm`,
      color: c,
      tam: 40,
      ancla: 'middle',
      girado: true,
    })
  }
  return out
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function primitivaATexto(p: Primitiva): string {
  if (p.t === 'rect') {
    const relleno = p.rayado ? 'url(#rayado)' : (p.relleno ?? 'none')
    return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${relleno}" stroke="${
      p.borde ?? 'none'
    }" stroke-width="${p.grosor ?? 1}"${p.guion ? ` stroke-dasharray="${p.guion}"` : ''}/>`
  }
  if (p.t === 'linea') {
    return `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="${p.color}" stroke-width="${
      p.grosor
    }"${p.guion ? ` stroke-dasharray="${p.guion}"` : ''} stroke-linecap="round"/>`
  }
  if (p.t === 'circulo') {
    return `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="none" stroke="${p.borde}" stroke-width="${
      p.grosor
    }"${p.guion ? ` stroke-dasharray="${p.guion}"` : ''}/>`
  }
  const giro = p.girado ? ` transform="rotate(-90 ${p.x} ${p.y})"` : ''
  return `<text x="${p.x}" y="${p.y}" fill="${p.color}" font-size="${p.tam}" font-weight="${
    p.peso ?? 400
  }" text-anchor="${p.ancla ?? 'start'}" font-family="system-ui, sans-serif"${giro}>${esc(p.txt)}</text>`
}

/** `viewBox` de una hoja, con el margen de las cotas. */
export const viewBoxHoja = (hoja: HojaCorte): string =>
  `${-MARGEN_MM} ${-MARGEN_MM} ${hoja.ancho + MARGEN_MM * 2} ${hoja.alto + MARGEN_MM * 2}`

/**
 * SVG autónomo de una hoja: colores literales y sin CSS externo, para que el
 * archivo se vea igual en cualquier visor. `width`/`height` explícitos porque
 * Safari no rasteriza un SVG que solo trae `viewBox`.
 */
export function svgTexto(hoja: HojaCorte, pal: PaletaCorte, o: OpcsDibujo, pie?: string): string {
  const prims = primitivasHoja(hoja, pal, o)
  const w = hoja.ancho + MARGEN_MM * 2
  const h = hoja.alto + MARGEN_MM * 2
  const cuerpo = prims.map(primitivaATexto).join('')
  const leyenda = pie
    ? primitivaATexto({
        t: 'texto',
        x: 0,
        y: hoja.alto + 100,
        txt: pie,
        color: pal.textoTenue,
        tam: 36,
        ancla: 'start',
      })
    : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxHoja(hoja)}" width="${Math.round(
      w / 4,
    )}" height="${Math.round(h / 4)}">` +
    `<defs><pattern id="rayado" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<line x1="0" y1="0" x2="0" y2="40" stroke="${pal.sobrante}" stroke-width="12"/></pattern></defs>` +
    `<rect x="${-MARGEN_MM}" y="${-MARGEN_MM}" width="${w}" height="${h}" fill="${pal.fondo}"/>` +
    cuerpo +
    leyenda +
    `</svg>`
  )
}
