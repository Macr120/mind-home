import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import type { ClipPrincipal, ClipVideo } from '../../core/data/db'
import { abrirVideo, irA } from './analisis'
import { redondear, velocidadDe } from './modelo'

/**
 * Reencuadre inteligente: para pasar un video horizontal a vertical (o al
 * revés) sin cortar a quien habla, se busca la cara en el cuadro cada medio
 * segundo y el encuadre la sigue (`ClipPrincipal.seguir`, en segundos DEL
 * MEDIO: dividir o recortar el clip no lo descuadra). Todo local y gratis: el
 * detector es el FaceLandmarker de MediaPipe que ya usa la máscara AR
 * (`public/mediapipe`).
 *
 * El encuadre no tiembla: se suaviza y solo se mueve cuando la cara se
 * desplaza de verdad (zona muerta); sin cara, se queda donde estaba.
 */

export type PuntoSeguir = { t: number; x: number; y: number }

const PASO = 0.5
const MAX_MUESTRAS = 900
const ANCHO_MUESTRA = 320
/** Lo que tiene que moverse la cara (fracción del cuadro) para que el encuadre la siga. */
const ZONA_MUERTA = 0.05
const VENTANA_SUAVE = 5

let detector: Promise<FaceLandmarker | null> | null = null

/** El detector, una vez por sesión (GPU y, si no hay, CPU). */
function detectorCaras(): Promise<FaceLandmarker | null> {
  detector ??= (async () => {
    try {
      const { FaceLandmarker: FL, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const base = `${import.meta.env.BASE_URL}mediapipe`
      const fileset = await FilesetResolver.forVisionTasks(base)
      const crear = (delegate: 'GPU' | 'CPU') =>
        FL.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: `${base}/face_landmarker.task`, delegate },
          runningMode: 'IMAGE',
          numFaces: 3,
        })
      return await crear('GPU').catch(() => crear('CPU'))
    } catch (e) {
      console.warn('[video] sin detector de caras:', e)
      detector = null
      return null
    }
  })()
  return detector
}

/** Centro (0–1) de la cara más grande del cuadro, o null. */
function caraMayor(lm: FaceLandmarker, lienzo: HTMLCanvasElement): { x: number; y: number } | null {
  const r = lm.detect(lienzo)
  let mejor: { x: number; y: number; area: number } | null = null
  for (const cara of r.faceLandmarks ?? []) {
    let x0 = 1
    let x1 = 0
    let y0 = 1
    let y1 = 0
    for (const p of cara) {
      x0 = Math.min(x0, p.x)
      x1 = Math.max(x1, p.x)
      y0 = Math.min(y0, p.y)
      y1 = Math.max(y1, p.y)
    }
    const area = (x1 - x0) * (y1 - y0)
    if (!mejor || area > mejor.area) mejor = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, area }
  }
  return mejor ? { x: mejor.x, y: mejor.y } : null
}

/**
 * Sigue la cara en [desde, hasta] (segundos del medio). null si no hay
 * detector o video; [] si no apareció ninguna cara.
 */
export async function seguirCara(
  medioId: number,
  desde: number,
  hasta: number,
  alProgreso?: (hecho: number, total: number) => void,
): Promise<PuntoSeguir[] | null> {
  const lm = await detectorCaras()
  if (!lm) return null
  const abierto = await abrirVideo(medioId)
  if (!abierto) return null
  const { v, cerrar } = abierto
  try {
    const paso = Math.max(PASO, (hasta - desde) / MAX_MUESTRAS)
    const n = Math.max(1, Math.floor((hasta - desde) / paso) + 1)
    const lienzo = document.createElement('canvas')
    lienzo.width = ANCHO_MUESTRA
    lienzo.height = Math.round((ANCHO_MUESTRA * (v.videoHeight || 9)) / (v.videoWidth || 16))
    const ctx = lienzo.getContext('2d')!
    const crudos: (PuntoSeguir | null)[] = []
    for (let i = 0; i < n; i++) {
      const t = Math.min(hasta, desde + i * paso)
      await irA(v, t)
      ctx.drawImage(v, 0, 0, lienzo.width, lienzo.height)
      const c = caraMayor(lm, lienzo)
      crudos.push(c ? { t, ...c } : null)
      alProgreso?.(i + 1, n)
    }
    if (!crudos.some(Boolean)) return []
    // Huecos sin cara: se queda en la última vista (o en la primera que aparezca).
    let ultima = crudos.find(Boolean)!
    const llenos = crudos.map((c, i) => {
      if (c) ultima = c
      return { t: desde + i * paso, x: ultima.x, y: ultima.y }
    })
    // Suavizado (media móvil) y zona muerta: un punto solo cuando el encuadre de verdad se mueve.
    const suaves = llenos.map((p, i) => {
      const ventana = llenos.slice(Math.max(0, i - VENTANA_SUAVE), i + VENTANA_SUAVE + 1)
      return { t: p.t, x: ventana.reduce((s, q) => s + q.x, 0) / ventana.length, y: ventana.reduce((s, q) => s + q.y, 0) / ventana.length }
    })
    const salida: PuntoSeguir[] = [suaves[0]]
    for (const p of suaves.slice(1)) {
      const u = salida[salida.length - 1]
      if (Math.abs(p.x - u.x) > ZONA_MUERTA || Math.abs(p.y - u.y) > ZONA_MUERTA) salida.push(p)
    }
    const ultimo = suaves[suaves.length - 1]
    if (salida[salida.length - 1].t < ultimo.t) salida.push({ ...ultimo, x: salida[salida.length - 1].x, y: salida[salida.length - 1].y })
    return salida.map((p) => ({ t: redondear(p.t), x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 }))
  } finally {
    cerrar()
  }
}

/** Tramo DEL MEDIO que muestra un clip principal. */
export const tramoMedio = (c: ClipPrincipal): [number, number] => [c.desde ?? 0, (c.desde ?? 0) + c.duracion * velocidadDe(c)]

/**
 * Reencuadra todos los clips de video de la principal (una pasada por medio,
 * sobre el tramo que se usa de él). Devuelve los clips con `seguir` puesto y
 * cuántos lo recibieron; un medio sin caras se deja centrado.
 */
export async function reencuadrarClips(
  clips: ClipVideo[],
  alProgreso?: (hecho: number, total: number) => void,
): Promise<{ clips: ClipVideo[]; reencuadrados: number }> {
  const principal = clips.filter((c): c is ClipPrincipal & { fuente: { tipo: 'video'; medioId: number } } => c.pista === 'video' && c.fuente.tipo === 'video')
  const rangos = new Map<number, [number, number]>()
  for (const c of principal) {
    const [a, b] = tramoMedio(c)
    const r = rangos.get(c.fuente.medioId)
    rangos.set(c.fuente.medioId, r ? [Math.min(r[0], a), Math.max(r[1], b)] : [a, b])
  }
  const puntos = new Map<number, PuntoSeguir[]>()
  let hecho = 0
  const total = [...rangos.values()].reduce((s, [a, b]) => s + (b - a), 0)
  for (const [medioId, [a, b]] of rangos) {
    const base = hecho
    const lista = await seguirCara(medioId, a, b, (n, tot) => alProgreso?.(Math.round(base + ((b - a) * n) / tot), Math.round(total)))
    hecho += b - a
    if (lista?.length) puntos.set(medioId, lista)
  }
  let reencuadrados = 0
  const salida = clips.map((c) => {
    if (c.pista !== 'video' || c.fuente.tipo !== 'video') return c
    const lista = puntos.get(c.fuente.medioId)
    if (!lista) return c
    const [a, b] = tramoMedio(c)
    // Los puntos del tramo y el de cada lado, para interpolar bien en los bordes.
    const primero = lista.findIndex((p) => p.t >= a)
    const desdeI = primero < 0 ? lista.length - 1 : Math.max(0, primero - 1)
    const tras = lista.findIndex((p) => p.t > b)
    const hastaI = tras < 0 ? lista.length - 1 : tras
    const dentro = lista.slice(desdeI, hastaI + 1)
    if (!dentro.length) return c
    reencuadrados++
    return { ...c, seguir: dentro }
  })
  return { clips: salida, reencuadrados }
}
