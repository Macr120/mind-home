import type { CapaDibujo } from '../../core/data/db'
import { dibujosRepo } from '../../core/data/repository'
import { miniaturaFoto } from '../_shared/fotos'
import { porIdioma, retraducido, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { TEXTOS_ARTE } from './ejemplos.data'

/**
 * Ejemplo de fábrica del Studio de arte: un paisaje repartido en tres capas.
 *
 * El dibujo se PINTA aquí con canvas en vez de bajar un PNG de `public/`: lo
 * que hay que enseñar de esta app son las capas (esconder el cielo, bajarle la
 * opacidad a las colinas), y un archivo plano las dejaría fuera. Las formas son
 * a propósito simples y de trazo grande: es un ejemplo, no una lámina.
 */

const ID = 'arte.dibujos'

/** 16:9, el mismo preset apaisado de la galería (PRESETS_LIENZO). */
const ANCHO = 1280
const ALTO = 720

type Pintor = (ctx: CanvasRenderingContext2D) => void

function lienzo(pintar: Pintor, fondo?: string): Promise<Blob> {
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

type Clave = keyof (typeof TEXTOS_ARTE)['es']

/** ¿Ese valor es el texto de fábrica de esa clave en algún idioma? */
const deFabrica = (valor: string, clave: Clave) =>
  Object.values(TEXTOS_ARTE).some((rama) => rama[clave] === valor)

/** Las capas de abajo arriba, con el nombre que llevan en el panel. */
const CAPAS: { nombre: Clave; pintar: Pintor }[] = [
  { nombre: 'capaCielo', pintar: cielo },
  { nombre: 'capaColinas', pintar: colinas },
  { nombre: 'capaFrente', pintar: frente },
]

export const ejemploArte: PaqueteEjemplo = {
  id: ID,
  async materializar() {
    if (await yaMaterializado(ID, () => dibujosRepo.list())) return
    const T = porIdioma(TEXTOS_ARTE)
    const ahora = new Date().toISOString()

    const capas: CapaDibujo[] = []
    for (const [i, c] of CAPAS.entries()) {
      capas.push({
        capaId: `ca-ejemplo-${i}`,
        nombre: T[c.nombre],
        visible: true,
        opacidad: 1,
        imagen: await lienzo(c.pintar),
      })
    }
    // La composición aplanada sobre blanco: es la que leen galería, IA y export.
    const imagen = await lienzo((ctx) => CAPAS.forEach((c) => c.pintar(ctx)), '#ffffff')

    await dibujosRepo.add({
      nombre: T.dibujo,
      imagen,
      miniatura: await miniaturaFoto(imagen),
      ancho: ANCHO,
      alto: ALTO,
      capas,
      // Igual que `actualizadoEn`: manda la versión con capas (ver `Dibujo`).
      capasEn: ahora,
      creadoEn: ahora,
      actualizadoEn: ahora,
      ejemploDe: ID,
    })
  },

  async retraducir() {
    const T = porIdioma(TEXTOS_ARTE)
    for (const d of await dibujosRepo.list()) {
      if (d.ejemploDe !== ID || d.id == null) continue
      const nombre = retraducido(TEXTOS_ARTE, d.nombre, 'dibujo')
      // Los nombres de capa viven dentro de la fila: se reescribe el array
      // entero, respetando la capa que el usuario haya renombrado o añadido.
      const capas = d.capas?.map((c) => {
        const suya = CAPAS.find((x) => deFabrica(c.nombre, x.nombre))
        return suya && T[suya.nombre] !== c.nombre ? { ...c, nombre: T[suya.nombre] } : c
      })
      const cambiaCapas = capas?.some((c, i) => c !== d.capas?.[i])
      if (nombre || cambiaCapas) {
        await dibujosRepo.update(d.id, { ...(nombre && { nombre }), ...(cambiaCapas && { capas }) })
      }
    }
  },
}
