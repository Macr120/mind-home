import type { TEXTOS_ARTE } from './ejemplos.data'

/**
 * Los dos dibujos de fábrica del Studio de arte: un paisaje y un bodegón,
 * repartidos en capas. Los siembra `seed.ts` como dibujos normales (se
 * editan y se borran como cualquier otro).
 *
 * Se PINTAN aquí con canvas en vez de bajar un PNG de `public/`: lo que hay
 * que enseñar de esta app son las capas (esconder el cielo, bajarle la
 * opacidad a las colinas, mover una fruta o separar las tres en objetos), y un
 * archivo plano las dejaría fuera. Las formas son a propósito simples y de
 * trazo grande: son ejemplos, no láminas.
 */

/** 16:9, el mismo preset apaisado de la galería (PRESETS_LIENZO). */
export const ANCHO = 1280
export const ALTO = 720

export type Pintor = (ctx: CanvasRenderingContext2D) => void

export type ClaveTexto = keyof (typeof TEXTOS_ARTE)['es']

export interface DibujoFabrica {
  /** Sufijo del uid de siembra (`seed-dibujos-<clave>`). */
  clave: string
  nombre: ClaveTexto
  /** Las capas de abajo arriba, con el nombre que llevan en el panel. */
  capas: { nombre: ClaveTexto; pintar: Pintor }[]
}

/** Un PNG del tamaño del ejemplo con lo que pinte `pintar` (transparente salvo que se pida fondo). */
export function lienzo(pintar: Pintor, fondo?: string): Promise<Blob> {
  const c = document.createElement('canvas')
  c.width = ANCHO
  c.height = ALTO
  const ctx = c.getContext('2d')!
  if (fondo) {
    ctx.fillStyle = fondo
    ctx.fillRect(0, 0, ANCHO, ALTO)
  }
  pintar(ctx)
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob falló'))), 'image/png'))
}

// ─── «Tarde en el valle» ──────────────────────────────────────────────────

const cielo: Pintor = (ctx) => {
  const grad = ctx.createLinearGradient(0, 0, 0, ALTO)
  grad.addColorStop(0, '#7fb2e5')
  grad.addColorStop(0.55, '#cfe0ef')
  grad.addColorStop(1, '#f6d9b0')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, ANCHO, ALTO)
  // Sol bajo, ya cerca del horizonte.
  ctx.fillStyle = '#ffd9a0'
  ctx.beginPath()
  ctx.arc(960, 250, 66, 0, Math.PI * 2)
  ctx.fill()
  // Cada nube es UN solo trazado con sus tres bolas: dibujadas por separado, el
  // alfa se acumularía en los solapes y se verían los círculos por dentro.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  for (const nube of [
    [
      [260, 170, 46],
      [320, 158, 60],
      [390, 176, 40],
    ],
    [
      [800, 120, 34],
      [850, 112, 44],
      [896, 126, 30],
    ],
  ]) {
    ctx.beginPath()
    for (const [x, y, r] of nube) {
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
    ctx.fill()
  }
}

const colinas: Pintor = (ctx) => {
  ctx.fillStyle = '#8fae7a'
  ctx.beginPath()
  ctx.moveTo(0, 470)
  ctx.quadraticCurveTo(300, 330, 640, 455)
  ctx.quadraticCurveTo(980, 575, 1280, 420)
  ctx.lineTo(1280, ALTO)
  ctx.lineTo(0, ALTO)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#6d9060'
  ctx.beginPath()
  ctx.moveTo(0, 560)
  ctx.quadraticCurveTo(420, 470, 760, 570)
  ctx.quadraticCurveTo(1050, 655, 1280, 585)
  ctx.lineTo(1280, ALTO)
  ctx.lineTo(0, ALTO)
  ctx.closePath()
  ctx.fill()
}

const frente: Pintor = (ctx) => {
  // El camino sube desde el borde de abajo y se estrecha al fondo.
  ctx.fillStyle = '#e3cfa6'
  ctx.beginPath()
  ctx.moveTo(430, ALTO)
  ctx.quadraticCurveTo(600, 640, 690, 566)
  ctx.lineTo(742, 574)
  ctx.quadraticCurveTo(690, 660, 700, ALTO)
  ctx.closePath()
  ctx.fill()
  // El árbol, a la izquierda del camino.
  ctx.fillStyle = '#6b4b32'
  ctx.fillRect(268, 470, 30, 190)
  ctx.fillStyle = '#4f7a45'
  for (const [x, y, r] of [
    [283, 430, 92],
    [212, 470, 66],
    [352, 468, 70],
  ]) {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // Dos pájaros en el cielo, del tamaño justo para leerse como pájaros.
  ctx.strokeStyle = '#5b6b78'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  for (const [x, y, e] of [
    [560, 210, 22],
    [628, 176, 16],
  ]) {
    ctx.beginPath()
    ctx.moveTo(x - e, y)
    ctx.quadraticCurveTo(x - e / 2, y - e / 2, x, y)
    ctx.quadraticCurveTo(x + e / 2, y - e / 2, x + e, y)
    ctx.stroke()
  }
}

// ─── «Bodegón de frutas» ──────────────────────────────────────────────────
// Tres capas: el fondo, la jarra y las frutas. Las tres frutas van SEPARADAS
// dentro de su capa (con aire entre sombra y sombra) a propósito: es el caso
// de libro de «Separar en objetos», que las reparte en tres capas.

const mesa: Pintor = (ctx) => {
  // Pared cálida con la luz bajando, y la mesa de madera con su canto.
  const grad = ctx.createLinearGradient(0, 0, 0, 470)
  grad.addColorStop(0, '#f6e7cf')
  grad.addColorStop(1, '#e4cba6')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, ANCHO, 470)
  ctx.fillStyle = '#9c6b3f'
  ctx.fillRect(0, 470, ANCHO, ALTO - 470)
  ctx.fillStyle = '#b8845a'
  ctx.fillRect(0, 470, ANCHO, 26)
  // La veta: unas líneas claras que ondulan a lo largo del tablero.
  ctx.strokeStyle = 'rgba(255, 230, 200, 0.25)'
  ctx.lineWidth = 3
  for (const y of [540, 590, 650]) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.quadraticCurveTo(640, y + 18, 1280, y - 8)
    ctx.stroke()
  }
}

/** Sombra alargada sobre la mesa, pegada al pie de cada objeto. */
const sombra = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number) => {
  ctx.fillStyle = 'rgba(60, 30, 10, 0.22)'
  ctx.beginPath()
  ctx.ellipse(x, y, rx, 12, 0, 0, Math.PI * 2)
  ctx.fill()
}

const jarra: Pintor = (ctx) => {
  sombra(ctx, 950, 476, 120)
  // Cuerpo: boca, cuello y panza en un solo trazado.
  ctx.fillStyle = '#5b7fa6'
  ctx.beginPath()
  ctx.moveTo(900, 240)
  ctx.lineTo(985, 240)
  ctx.quadraticCurveTo(985, 300, 1020, 330)
  ctx.quadraticCurveTo(1060, 420, 1000, 470)
  ctx.lineTo(880, 470)
  ctx.quadraticCurveTo(820, 420, 860, 330)
  ctx.quadraticCurveTo(900, 300, 900, 240)
  ctx.closePath()
  ctx.fill()
  // El pico.
  ctx.beginPath()
  ctx.moveTo(900, 240)
  ctx.lineTo(878, 216)
  ctx.lineTo(928, 232)
  ctx.closePath()
  ctx.fill()
  // El asa.
  ctx.strokeStyle = '#4a6a8c'
  ctx.lineWidth = 22
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(1030, 350, 55, -Math.PI / 2, Math.PI / 2)
  ctx.stroke()
  // El brillo.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.beginPath()
  ctx.ellipse(890, 380, 14, 60, 0, 0, Math.PI * 2)
  ctx.fill()
}

const frutas: Pintor = (ctx) => {
  // La manzana.
  sombra(ctx, 380, 470, 78)
  ctx.fillStyle = '#d63b3b'
  ctx.beginPath()
  ctx.arc(380, 400, 70, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f08a8a'
  ctx.beginPath()
  ctx.ellipse(352, 372, 16, 24, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#5a3a1e'
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(384, 336)
  ctx.quadraticCurveTo(392, 310, 404, 300)
  ctx.stroke()
  ctx.fillStyle = '#5c9a3c'
  ctx.beginPath()
  ctx.ellipse(414, 322, 26, 11, -0.6, 0, Math.PI * 2)
  ctx.fill()

  // La pera: un solo trazado que se ensancha hacia abajo.
  sombra(ctx, 560, 472, 70)
  ctx.fillStyle = '#b5cf4f'
  ctx.beginPath()
  ctx.moveTo(560, 302)
  ctx.bezierCurveTo(595, 302, 598, 360, 618, 395)
  ctx.bezierCurveTo(650, 450, 610, 478, 560, 478)
  ctx.bezierCurveTo(510, 478, 470, 450, 502, 395)
  ctx.bezierCurveTo(522, 360, 525, 302, 560, 302)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#5a3a1e'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(560, 304)
  ctx.lineTo(566, 272)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.beginPath()
  ctx.ellipse(535, 420, 14, 30, 0, 0, Math.PI * 2)
  ctx.fill()

  // La naranja, con sus poros y una hoja.
  sombra(ctx, 750, 474, 64)
  ctx.fillStyle = '#f39c2b'
  ctx.beginPath()
  ctx.arc(750, 418, 58, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(180, 90, 10, 0.35)'
  for (const [dx, dy] of [
    [-22, -14],
    [10, -30],
    [26, 8],
    [-8, 22],
    [-30, 18],
    [18, 30],
  ]) {
    ctx.beginPath()
    ctx.arc(750 + dx, 418 + dy, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#4f8a2f'
  ctx.beginPath()
  ctx.ellipse(772, 358, 22, 9, -0.7, 0, Math.PI * 2)
  ctx.fill()
}

export const DIBUJOS_FABRICA: DibujoFabrica[] = [
  {
    clave: 'valle',
    nombre: 'dibujo',
    capas: [
      { nombre: 'capaCielo', pintar: cielo },
      { nombre: 'capaColinas', pintar: colinas },
      { nombre: 'capaFrente', pintar: frente },
    ],
  },
  {
    clave: 'bodegon',
    nombre: 'bodegon',
    capas: [
      { nombre: 'capaMesa', pintar: mesa },
      { nombre: 'capaJarra', pintar: jarra },
      { nombre: 'capaFrutas', pintar: frutas },
    ],
  },
]
