import { create } from 'zustand'
import { abrirApp } from './abrirApp'
import { mediosVideoRepo } from './data/repository'
import { tGlobal } from './i18n/useT'
import { esEscritorio } from './plataforma'
import { useHouse } from './state/houseStore'
import { useHud } from './state/hudStore'
import { lanzarIntencionApp } from './state/intencionApp'
import { usePreviaPlantilla } from './state/previaPlantillaStore'

/**
 * Grabar la app en uso para el Studio de video. El editor pide la toma; aquí
 * se captura, el cuarto se cierra para que la casa quede libre (pasear, abrir
 * otras apps, lo que sea) y una píldora flotante (`GrabacionPantallaOverlay`)
 * lleva el reloj y el botón de parar. Al parar, la toma se guarda en
 * `mediosVideo` y el Studio vuelve a abrirse en el mismo proyecto, que la
 * recoge con `tomarResultadoGrabacion` y la mete en la pista principal.
 *
 * Qué se graba: en el shell de escritorio, la PESTAÑA entera por
 * `getDisplayMedia` (3D + HUD + apps, con su audio; el shell la concede sin
 * preguntar); en cualquier navegador y en Android/iOS, el lienzo 3D de la casa
 * por `captureStream` (sin la interfaz ni audio, pero sin selector ni permisos:
 * el botón dice «Grabar dentro de la app» y eso hace).
 *
 * Vive en core y no en el cuarto de video porque el cuarto se desmonta al
 * cerrarse: la sesión tiene que sobrevivirle.
 */

/** Tope de la toma (s): un webm a 4 Mb/s ronda los 150 MB a esta duración. */
export const MAX_SEG_GRABACION = 300
/** Cuenta regresiva (s) entre pedir la toma y empezar a rodar. */
const CUENTA_SEG_GRABACION = 3

export interface DestinoGrabacion {
  proyectoId: number
  /** Segundo del cursor al pedir la toma: ahí entra el clip. */
  cursor: number
}

export interface ResultadoGrabacion extends DestinoGrabacion {
  medioId: number
}

interface GrabacionPantallaState {
  /** `cuenta` = cuenta regresiva en el mapa (`inicioMs` = cuándo arranca la toma). */
  estado: 'inactivo' | 'cuenta' | 'grabando' | 'guardando'
  inicioMs: number
  /** Toma guardada esperando a que el Editor de su proyecto la recoja. */
  resultado: ResultadoGrabacion | null
}

export const useGrabacionPantalla = create<GrabacionPantallaState>(() => ({
  estado: 'inactivo',
  inicioMs: 0,
  resultado: null,
}))

/**
 * Primer contenedor que MediaRecorder sabe escribir, o null (lo comparten el
 * export del video y esta grabación). `preferirMp4` antepone MP4/H.264: es lo
 * que exige Instagram y lo que mejor aceptan las demás redes al publicar; sin
 * la opción manda webm, como siempre (la grabación de la app no cambia).
 */
export function formatoGrabacion(o?: { preferirMp4?: boolean }): { mime: string; extension: 'webm' | 'mp4' } | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return null
  const mp4: { mime: string; extension: 'webm' | 'mp4' }[] = [
    { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
    { mime: 'video/mp4', extension: 'mp4' },
  ]
  const webm: { mime: string; extension: 'webm' | 'mp4' }[] = [
    { mime: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mime: 'video/webm;codecs=vp8,opus', extension: 'webm' },
    { mime: 'video/webm', extension: 'webm' },
  ]
  const candidatos = o?.preferirMp4 ? [...mp4, ...webm] : [...webm, ...mp4]
  return candidatos.find((c) => MediaRecorder.isTypeSupported(c.mime)) ?? null
}

/** Desde dónde se pidió la toma, para volver al mismo sitio. */
type Origen = { tipo: 'previa' } | { tipo: 'cuarto'; roomId: string } | { tipo: 'ninguno' }

interface Sesion {
  rec: MediaRecorder
  stream: MediaStream
  trozos: Blob[]
  destino: DestinoGrabacion
  origen: Origen
  inicioPerf: number
  cancelada: boolean
  /** Ya se llamó a `rec.stop()`: el cierre llega por `onstop`. */
  parando: boolean
  /** Timeout de la cuenta regresiva (0 una vez rodando). */
  cuenta: number
  tope: number
  wakeLock: { release(): Promise<void> } | null
}

let sesion: Sesion | null = null

async function capturar(): Promise<{ stream: MediaStream } | 'cancelado' | 'sin-soporte'> {
  const dispositivos = navigator.mediaDevices as MediaDevices | undefined
  // La pestaña entera solo en el shell de escritorio, que la concede sin
  // preguntar: en el navegador el selector de pantalla es un paso de más para
  // «grabar dentro de la app», así que ahí va directo al lienzo de la casa.
  if (esEscritorio() && typeof dispositivos?.getDisplayMedia === 'function') {
    try {
      // `preferCurrentTab`: Chrome ofrece solo esta pestaña (un clic); las demás
      // opciones son dictados que los otros navegadores ignoran.
      const stream = await dispositivos.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        surfaceSwitching: 'exclude',
        systemAudio: 'exclude',
      } as DisplayMediaStreamOptions)
      return { stream }
    } catch {
      return 'cancelado' // cerró el selector (o lo bloqueó una política)
    }
  }
  // El lienzo 3D de la casa, sin la interfaz (y sin selector ni permisos).
  const lienzo = document.querySelector<HTMLCanvasElement>('[data-lienzo-casa] canvas')
  if (!lienzo || typeof lienzo.captureStream !== 'function') return 'sin-soporte'
  return { stream: lienzo.captureStream(30) }
}

function origenActual(): Origen {
  if (usePreviaPlantilla.getState().plantillaId === 'video') return { tipo: 'previa' }
  const roomId = useHouse.getState().activeRoom
  return roomId ? { tipo: 'cuarto', roomId } : { tipo: 'ninguno' }
}

/**
 * Pide la captura (debe venir de un gesto del usuario), cierra el Studio y
 * arranca la toma. 'cancelado' si el usuario cerró el selector o ya hay una
 * toma en curso; 'sin-soporte' si aquí no se puede grabar.
 */
export async function iniciarGrabacionPantalla(destino: DestinoGrabacion): Promise<'ok' | 'cancelado' | 'sin-soporte'> {
  if (sesion) return 'cancelado'
  const formato = formatoGrabacion()
  if (!formato) return 'sin-soporte'
  const captura = await capturar()
  if (typeof captura === 'string') return captura
  const { stream } = captura
  let rec: MediaRecorder
  try {
    rec = new MediaRecorder(stream, { mimeType: formato.mime, videoBitsPerSecond: 4_000_000 })
  } catch {
    for (const p of stream.getTracks()) p.stop()
    return 'sin-soporte'
  }
  const s: Sesion = {
    rec,
    stream,
    trozos: [],
    destino,
    origen: origenActual(),
    inicioPerf: performance.now(),
    cancelada: false,
    parando: false,
    cuenta: 0,
    tope: 0,
    wakeLock: null,
  }
  sesion = s
  rec.onstart = () => {
    s.inicioPerf = performance.now()
  }
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) s.trozos.push(e.data)
  }
  rec.onstop = () => void terminar()
  rec.onerror = () => {
    s.cancelada = true
    parar()
  }
  // «Dejar de compartir» desde la barra del navegador: vale como Detener.
  stream.getVideoTracks()[0]?.addEventListener('ended', detenerGrabacionPantalla)
  // Cuenta regresiva antes de rodar (da tiempo a soltar el botón y colocarse); Detener durante la cuenta la cancela.
  s.cuenta = window.setTimeout(() => {
    if (sesion !== s || s.parando) return
    rec.start(1000)
    s.tope = window.setTimeout(detenerGrabacionPantalla, MAX_SEG_GRABACION * 1000)
    useGrabacionPantalla.setState({ estado: 'grabando', inicioMs: Date.now() })
  }, CUENTA_SEG_GRABACION * 1000)
  // Best-effort: con la pantalla apagada el lienzo deja de pintar y la toma se congela.
  type NavegadorConWakeLock = Navigator & { wakeLock?: { request(tipo: 'screen'): Promise<{ release(): Promise<void> }> } }
  void (navigator as NavegadorConWakeLock).wakeLock
    ?.request('screen')
    .then((w) => {
      if (sesion === s) s.wakeLock = w
      else void w.release().catch(() => {})
    })
    .catch(() => {})
  // La casa queda libre: el cuarto (o la previa) se cierra y el Studio se desmonta (guarda al salir).
  usePreviaPlantilla.getState().cerrar()
  useHouse.getState().closeRoom()
  // Los menús laterales van cerrados: taparían el mapa en la toma.
  useHud.getState().setMenuAbierto(false)
  useGrabacionPantalla.setState({ estado: 'cuenta', inicioMs: Date.now() + CUENTA_SEG_GRABACION * 1000 })
  return 'ok'
}

/**
 * Una toma hecha en otro sitio (máscara AR, chat AR) para el proyecto que la
 * pidió: se guarda en Medios y queda esperando al Editor, que sigue montado
 * debajo del overlay y la mete en la principal como la grabación de la app.
 */
export async function entregarTomaAlStudio(
  destino: DestinoGrabacion,
  toma: { blob: Blob; duracion: number; nombre: string },
): Promise<boolean> {
  try {
    const medioId = await mediosVideoRepo.add({
      tipo: 'video',
      nombre: toma.nombre,
      blob: toma.blob,
      duracion: toma.duracion,
      origen: 'grabacion',
      creadoEn: new Date().toISOString(),
    })
    useGrabacionPantalla.setState({ resultado: { ...destino, medioId } })
    return true
  } catch {
    return false // sin espacio: la toma se pierde
  }
}

function parar() {
  const s = sesion
  if (!s || s.parando) return
  s.parando = true
  if (s.rec.state !== 'inactive') s.rec.stop() // → onstop → terminar
  else void terminar()
}

/** Para la toma y la guarda; el Studio vuelve solo. */
export function detenerGrabacionPantalla() {
  parar()
}

/** Descarta la toma; el Studio vuelve solo, sin clip. */
export function cancelarGrabacionPantalla() {
  if (sesion) sesion.cancelada = true
  parar()
}

async function terminar() {
  const s = sesion
  if (!s) return
  sesion = null
  window.clearTimeout(s.cuenta)
  window.clearTimeout(s.tope)
  for (const p of s.stream.getTracks()) p.stop()
  void s.wakeLock?.release().catch(() => {})
  // La duración se mide aquí: los webm de MediaRecorder no la traen.
  const duracion = Math.round((performance.now() - s.inicioPerf) / 10) / 100
  const blob = new Blob(s.trozos, { type: s.rec.mimeType || 'video/webm' })
  let resultado: ResultadoGrabacion | null = null
  if (!s.cancelada && blob.size > 0 && duracion >= 0.5) {
    useGrabacionPantalla.setState({ estado: 'guardando' })
    const ahora = new Date()
    try {
      const medioId = await mediosVideoRepo.add({
        tipo: 'video',
        nombre: tGlobal('video.grabar.nombreMedio', 'Grabación de la app · {h}', {
          h: ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }),
        blob,
        duracion,
        origen: 'grabacion',
        creadoEn: ahora.toISOString(),
      })
      resultado = { ...s.destino, medioId }
    } catch {
      resultado = null // sin espacio: la toma se pierde, pero el Studio vuelve
    }
  }
  useGrabacionPantalla.setState({ estado: 'inactivo', inicioMs: 0, resultado })
  volverAlStudio(s.destino, s.origen)
}

/** Reabre el Studio donde estaba, en el proyecto que pidió la toma (VideoApp lee la intención). */
function volverAlStudio(destino: DestinoGrabacion, origen: Origen) {
  const dato = `proyecto:${destino.proyectoId}`
  lanzarIntencionApp({ appId: 'video', seccion: 'videos', dato })
  if (origen.tipo === 'previa') usePreviaPlantilla.getState().abrir('video')
  else if (origen.tipo === 'cuarto') useHouse.getState().openRoom(origen.roomId)
  else if (!abrirApp('video', 'videos', dato)) usePreviaPlantilla.getState().abrir('video')
}

/** La toma pendiente de este proyecto (y la consume), o null. */
export function tomarResultadoGrabacion(proyectoId: number): ResultadoGrabacion | null {
  const r = useGrabacionPantalla.getState().resultado
  if (!r || r.proyectoId !== proyectoId) return null
  useGrabacionPantalla.setState({ resultado: null })
  return r
}
