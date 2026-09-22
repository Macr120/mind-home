import { create } from 'zustand'
import type * as THREE from 'three'
import { useLayout } from './layoutStore'
import { useHouse } from './houseStore'
import { useCam, setPitchLibre, type Vista } from './cameraStore'
import { playerPos } from './playerPosition'
import { setCuartoAbierto } from '../house/movement'
import { getAsistente, useAsistentes } from './asistentesStore'
import { useHerramienta, type Herramienta } from './herramientaStore'
import { claveLS } from '../edicion'
import { miraFrame } from './miraFrame'
import { SPACING } from '../house/walls'
import { sonar } from '../audio/sfx'
import * as arbitro from '../partida/arbitro'
import { cambiarJuego } from '../partida/api'
import { podarAsistente } from '../partida/aspecto'
import { aLocal, fijarBots, fijarEquipos, miEquipo, miRanura } from '../partida/ranuras'
import {
  anunciarBot,
  cuerposBot,
  emitir,
  fijarJuego,
  olvidarBots,
  pedirResync,
  salaViva,
  soyArbitro,
} from '../partida/sala'
import type { BotId, MsgFin, MsgVeredicto, MsgW, Ranura, Sala } from '../partida/tipos'

/**
 * Modo paintball (Infraestructura): el personaje contra los asistentes usando
 * la casa como mapa. Tres modos: 1 vs 1, 2 vs 2 (un asistente de compañero) y
 * batalla campal (todos contra todos). Cada quien aguanta 3 impactos; gana el
 * último equipo en pie. Nada se persiste en Dexie: solo el marcador de
 * victorias/derrotas en localStorage. La simulación por frame (bolas, bots,
 * manchas) vive en `house/paintball.tsx`; aquí está lo reactivo (HUD) más el
 * objeto mutable `paintballFrame` (patrón carreraFrame).
 */

type FasePaintball = null | 'config' | 'cuenta' | 'jugando' | 'fin'
export type ModoPaintball = '1v1' | '2v2' | 'royale'

/** Impactos que aguanta cada jugador antes de quedar fuera. */
export const VIDAS_PAINTBALL = 3
/** Asistentes máximos en la batalla campal. */
export const MAX_BOTS_ROYALE = 5
/** Cadencia de disparo del jugador (ms entre bolas). */
export const CADENCIA_JUGADOR = 450
/** Color de la pintura del jugador (los bots usan su color o la paleta). */
export const COLOR_JUGADOR = '#3b82f6'

/** Pintura de reserva para asistentes sin color propio (distintos entre sí). */
const PALETA_PINTURA = ['#ef4444', '#f59e0b', '#22c55e', '#a855f7', '#ec4899']

/**
 * Pintura por RANURA en la batalla en línea: el color de cada quien tiene que
 * ser el mismo en las cuatro pantallas, así que sale de la ranura y no del
 * gusto de cada cliente.
 */
const COLOR_RANURA = [COLOR_JUGADOR, '#ef4444', '#22c55e', '#a855f7']

/** Batalla en línea viva: la sostiene el árbitro y nadie la corta por su cuenta. */
let online = false
/**
 * Cómo me retiré de la batalla que sigue viva: por el BOTÓN (definitivo, no
 * vuelvo solo) o por un CONTEXTO roto (mientras dure: al cerrar el cuarto vuelvo
 * a mirarla). Sin esto el `w` de cada 2 s me volvería a meter en ella.
 */
let retirado: 'boton' | 'contexto' | null = null

export function hayBatallaOnline(): boolean {
  return online
}

export function retiroDeBatalla(): 'boton' | 'contexto' | null {
  return retirado
}

/** El contexto se arregló: el próximo `w` reconstruye la vista (de espectador si ya estoy fuera). */
export function volverAMirarBatalla(): void {
  retirado = null
}

/** Preferencia de dificultad de los bots (0–1); clave propia, como carrera/canchas. */
const LS_DIFICULTAD = 'mh.paintballDificultad'
const leerDificultad = (): number => {
  const v = parseFloat(localStorage.getItem(LS_DIFICULTAD) ?? '')
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5
}

/** Vista con la que se juega el combate; se elige en sus ajustes y se recuerda. */
export type VistaCombate = 'primera' | 'tercera'
const LS_VISTA = 'mh.paintballVista'
const leerVistaCombate = (): VistaCombate =>
  localStorage.getItem(LS_VISTA) === 'primera' ? 'primera' : 'tercera'

/** Marcador global de batallas (no va a Dexie: es un arcade local). */
const LS_MARCADOR = claveLS('mh.paintballMarcador')
export function leerMarcadorPaintball(): { victorias: number; derrotas: number } {
  try {
    const m = JSON.parse(localStorage.getItem(LS_MARCADOR) ?? '') as {
      victorias?: number
      derrotas?: number
    }
    return { victorias: m.victorias ?? 0, derrotas: m.derrotas ?? 0 }
  } catch {
    return { victorias: 0, derrotas: 0 }
  }
}
function guardarMarcador(resultado: 'ganaste' | 'perdiste') {
  const m = leerMarcadorPaintball()
  if (resultado === 'ganaste') m.victorias++
  else m.derrotas++
  localStorage.setItem(LS_MARCADOR, JSON.stringify(m))
}

export interface JugadorPaintball {
  /** 'yo' (el personaje) o el id del asistente. */
  id: string
  nombre: string
  /** Color de su pintura (bolas y manchas). */
  color: string
  /** 0 = equipo del jugador; en batalla campal cada bot lleva el suyo. */
  equipo: number
  vidas: number
  /** Impactos acertados a rivales (tabla del final). */
  impactos: number
  esBot: boolean
  fuera: boolean
}

/** Estado por-frame de un bot (lo mueve el runtime; el render solo lo lee). */
export interface BotPaintball {
  id: string
  x: number
  z: number
  h: number
  escala: number
  color: string
  equipo: number
  vivo: boolean
  /** Ajustar el spawn con el modelo de colisión en el primer frame del runtime. */
  recolocar: boolean
  objetivo: string | null
  strafe: 1 | -1
  pensarAcc: number
  cooldown: number
  /** performance.now() de su último disparo (fogonazo de la marcadora). */
  fogonazo: number
}

/** Datos por-frame de la batalla (mutables, patrón carreraFrame). */
export const paintballFrame = {
  /** Reloj en s: arranca en −3 (cuenta atrás); 0 = banderazo. */
  reloj: 0,
  jugando: false,
  /** Botón/tecla de disparo mantenidos (el runtime los consume con cadencia). */
  disparar: false,
  /** Momento del último disparo del jugador (performance.now()). */
  ultimoDisparo: 0,
  bots: [] as BotPaintball[],
}

/** El mundo 3D registra cómo limpiar bolas (y con `todo`, también manchas). */
let limpiadorMundo: ((todo: boolean) => void) | null = null
export function registrarLimpiadorPaintball(fn: (todo: boolean) => void): void {
  limpiadorMundo = fn
}

/**
 * Disparo de la marcadora fuera de la batalla (herramienta de la rueda). El
 * mundo 3D registra aquí cómo materializarlo y Character lo invoca al procesar
 * `disparoT`: así el avatar no depende del módulo de paintball (patrón
 * `registrarEjecutorItem` de carreraStore).
 */
let disparadorLibre: ((camera: THREE.Camera, nivel: number) => void) | null = null
export function registrarDisparoPintura(fn: (camera: THREE.Camera, nivel: number) => void): void {
  disparadorLibre = fn
}
export function dispararPinturaLibre(camera: THREE.Camera, nivel: number): void {
  disparadorLibre?.(camera, nivel)
}

/** Mensaje transitorio del HUD: clave i18n + nombre opcional del afectado. */
interface MensajePaintball {
  clave: 'fuera' | 'teDieron' | 'nivel' | 'sinAsistentes' | 'faltan'
  nombre?: string
}

interface PaintballState {
  fase: FasePaintball
  modo: ModoPaintball
  jugadores: JugadorPaintball[]
  resultado: null | 'ganaste' | 'perdiste'
  mensaje: MensajePaintball | null
  dificultad: number
  /** Vista del combate (elegida en sus ajustes): 1ª o 3ª persona. */
  vistaCombate: VistaCombate
  /** Abre el menú de batalla (desde el catálogo de Complementos); `modo` preselecciona la pestaña. */
  iniciar: (modo?: ModoPaintball) => void
  /** Cambia la pestaña de modo elegida en la pantalla de configuración. */
  setModo: (m: ModoPaintball) => void
  /** Arma equipos y arranca la cuenta atrás. `rivales`: compañero primero en 2v2. */
  empezar: (modo: ModoPaintball, rivales: string[]) => void
  /**
   * Hermana en línea de `empezar`, SOLO en el árbitro: reparte equipos entre las
   * ranuras de la sala, rellena con bots y abre la batalla. Nadie entra en
   * cuenta atrás por su cuenta: se entra al recibir el `w` que sale de aquí.
   */
  empezarOnline: (sala: Sala, modo: ModoPaintball) => void
  /** El mundo que dicta el árbitro (`w`): fase, reloj, vidas y bots. */
  aplicarMundo: (w: MsgW) => void
  /**
   * Un veredicto del árbitro. Corre en TODOS, incluido el propio árbitro (un
   * solo camino de código), y no decide el final: eso lo dice `fin`.
   */
  aplicarVeredicto: (v: MsgVeredicto) => void
  /** Fin en línea: último equipo en pie, traducido a ganaste/perdiste. */
  terminarOnline: (eq: number, js: MsgFin['js']) => void
  /** Cuenta atrás en 0: se abre fuego. */
  banderazo: () => void
  /**
   * Un impacto de pintura: resta vida, cuenta el acierto y decide el final.
   * Devuelve qué pasó para que el runtime reaccione (mancha/sonido/caída).
   */
  registrarImpacto: (deId: string, victimaId: string) => null | 'impacto' | 'fuera'
  terminar: (resultado: 'ganaste' | 'perdiste') => void
  setDificultad: (d: number) => void
  /** Cambia la vista del combate (y la aplica al vuelo si ya se está jugando). */
  setVistaCombate: (v: VistaCombate) => void
  /** Única salida/limpieza del modo (abandono, contexto roto o botón Salir). */
  cancelar: () => void
  avisar: (m: MensajePaintball) => void
}

let avisoTimer = 0
/** Vista de cámara previa a la batalla (para restaurarla al salir). */
let vistaPrevia: Vista | null = null
/** Última configuración jugada (para «Otra vez»). */
let ultimaConfig: { modo: ModoPaintball; rivales: string[] } | null = null
export const configAnterior = () => ultimaConfig

/** Herramientas que llevaba el jugador antes de la batalla (se devuelven al salir). */
let herramientasPrevias: Herramienta[] | null = null

/** Entra a la batalla con la marcadora en la mano (guardando lo que llevaba). */
function empunarMarcadora() {
  const her = useHerramienta.getState()
  if (herramientasPrevias === null) herramientasPrevias = [...her.equipadas]
  her.soltarTodo()
  her.equipar('pintura')
}

/** Devuelve las herramientas de antes de la batalla. */
function devolverHerramientas() {
  const her = useHerramienta.getState()
  her.soltarTodo()
  for (const h of herramientasPrevias ?? []) her.equipar(h)
  herramientasPrevias = null
}

/**
 * Salida de la batalla en línea sin cortársela a los demás. Un INVITADO se
 * retira solo (`salir`, y el árbitro lo da por fuera); el ÁRBITRO no puede
 * retirarse, porque la batalla entera vive en su frame (bots, bolas y reloj):
 * si se va de verdad, la cierra con `fin` y la sala vuelve a pasear.
 */
export function dejarBatallaOnline(motivo: 'boton' | 'contexto'): void {
  if (!online) return
  online = false
  retirado = motivo
  if (!soyArbitro()) {
    // `r:'batalla'`: me salgo del JUEGO, no de la SALA. Sigo en la casa del
    // anfitrión y mi cuerpo se sigue viendo ahí; de darme por fuera del combate
    // se encarga el árbitro al recibirlo. Terminada la batalla no hay a quién
    // avisar: la cerró él.
    if (usePaintball.getState().fase !== 'fin') emitir('salir', { j: miRanura(), r: 'batalla' })
    return
  }
  arbitro.terminarPor('abandono')
  arbitro.parar()
  olvidarBots()
  fijarBots([])
  const sala = salaViva()
  if (!sala) return
  fijarJuego('visita')
  void cambiarJuego(sala.partidaId, 'visita').catch(() => undefined)
}

export const usePaintball = create<PaintballState>((set, get) => ({
  fase: null,
  modo: 'royale',
  jugadores: [],
  resultado: null,
  mensaje: null,
  dificultad: leerDificultad(),
  vistaCombate: leerVistaCombate(),

  iniciar: (modo) => {
    const layout = useLayout.getState()
    if (get().fase || layout.editMode) return
    // El editor de cuarto puede estar solo OCULTO (menú abierto): salir de él
    // para que al cerrarse el menú no se restaure encima (patrón canchasStore).
    if (layout.editingRoomId) layout.editRoom(null)
    const casa = useHouse.getState()
    if (casa.activeRoom) casa.closeRoom()
    set({ fase: 'config', jugadores: [], resultado: null, mensaje: null, modo: modo ?? get().modo })
    setCuartoAbierto(true)
    casa.target.set(playerPos.x, 0, playerPos.z)
  },

  setModo: (modo) => set({ modo }),

  empezar: (modo, rivales) => {
    const s = get()
    if (s.fase !== 'config' && s.fase !== 'fin') return
    if (rivales.length === 0) {
      get().avisar({ clave: 'sinAsistentes' })
      return
    }
    if (useHouse.getState().playerLevel !== 0) {
      get().avisar({ clave: 'nivel' })
      return
    }
    const jugadores: JugadorPaintball[] = [
      {
        id: 'yo',
        nombre: '',
        color: COLOR_JUGADOR,
        equipo: 0,
        vidas: VIDAS_PAINTBALL,
        impactos: 0,
        esBot: false,
        fuera: false,
      },
    ]
    rivales.forEach((id, i) => {
      const a = getAsistente(id)
      // 2v2: el primero es el compañero (equipo 0); campal: cada bot su equipo.
      const equipo = modo === '2v2' ? (i === 0 ? 0 : 1) : modo === 'royale' ? i + 1 : 1
      jugadores.push({
        id,
        nombre: a.nombre,
        color: a.color || PALETA_PINTURA[i % PALETA_PINTURA.length],
        equipo,
        vidas: VIDAS_PAINTBALL,
        impactos: 0,
        esBot: true,
        fuera: false,
      })
    })
    // Spawns en anillo alrededor del jugador (el runtime los ajusta a un punto
    // libre con el modelo de colisión real en su primer frame).
    const layout = useLayout.getState()
    const halfW = (layout.gridCols * SPACING) / 2 - 1.2
    const halfH = (layout.gridRows * SPACING) / 2 - 1.2
    paintballFrame.bots = rivales.map((id, i) => {
      const a = getAsistente(id)
      const ang = (i / rivales.length) * Math.PI * 2 + Math.random() * 0.6
      const dist = 8 + Math.random() * 5
      const x = Math.max(-halfW, Math.min(halfW, playerPos.x + Math.sin(ang) * dist))
      const z = Math.max(-halfH, Math.min(halfH, playerPos.z + Math.cos(ang) * dist))
      return {
        id,
        x,
        z,
        h: Math.atan2(playerPos.x - x, playerPos.z - z),
        escala: a.escala ?? 1,
        color: jugadores.find((j) => j.id === id)?.color ?? COLOR_JUGADOR,
        equipo: jugadores.find((j) => j.id === id)?.equipo ?? 1,
        vivo: true,
        recolocar: true,
        objetivo: null,
        strafe: Math.random() < 0.5 ? 1 : -1,
        pensarAcc: Math.random() * 0.3,
        cooldown: 1.2 + Math.random() * 1.5,
        fogonazo: 0,
      }
    })
    ultimaConfig = { modo, rivales: [...rivales] }
    paintballFrame.reloj = -3
    paintballFrame.jugando = false
    paintballFrame.disparar = false
    paintballFrame.ultimoDisparo = 0
    limpiadorMundo?.(true)
    empunarMarcadora()
    set({ fase: 'cuenta', modo, jugadores, resultado: null, mensaje: null })
    setCuartoAbierto(false)
    // Cámara del combate: la vista elegida en sus ajustes (1ª o 3ª persona).
    // También se puede cambiar en marcha desde el HUD o con la tecla V. En 3ª
    // persona la inclinación va LIBRE mientras dura la batalla: con el tope
    // normal la cámara se queda siempre por encima y no se puede apuntar arriba.
    const cam = useCam.getState()
    if (vistaPrevia === null) vistaPrevia = cam.vista
    setPitchLibre(true)
    cam.setVista(get().vistaCombate)
  },

  empezarOnline: (sala, modo) => {
    // El reparto de equipos y el relleno de bots los decide el ÁRBITRO: si cada
    // cliente barajara los suyos, cada pantalla tendría una batalla distinta.
    if (!soyArbitro()) return
    if (useHouse.getState().playerLevel !== 0) {
      get().avisar({ clave: 'nivel' })
      return
    }
    const ranuras = sala.jugadores.filter((j) => j.estado === 'dentro').map((j) => j.ranura).sort()
    const humanos = modo === '1v1' ? ranuras.slice(0, 2) : ranuras.slice(0, 4)
    if (humanos.length < 2) {
      get().avisar({ clave: 'faltan' })
      return
    }
    // Relleno: el 2 vs 2 completa los cuatro puestos y la campal mete hasta
    // cinco asistentes más, cada uno con su propio equipo.
    const faltan = modo === '1v1' ? 0 : modo === '2v2' ? Math.max(0, 4 - humanos.length) : MAX_BOTS_ROYALE
    const elegidos = [...useAsistentes.getState().lista].sort(() => Math.random() - 0.5).slice(0, faltan)
    fijarBots(elegidos.map((a) => a.id))
    const cuerpos: { j: Ranura | BotId; eq: number; col: string; bot: boolean }[] = []
    humanos.forEach((r, i) => {
      cuerpos.push({
        j: r,
        eq: modo === 'royale' ? i : i % 2,
        col: COLOR_RANURA[i % COLOR_RANURA.length],
        bot: false,
      })
    })
    elegidos.forEach((a, k) => {
      cuerpos.push({
        j: `b${k}` as BotId,
        eq: modo === 'royale' ? humanos.length + k : (humanos.length + k) % 2,
        col: a.color || PALETA_PINTURA[k % PALETA_PINTURA.length],
        bot: true,
      })
    })
    // Mismos spawns en anillo que la batalla de un jugador (el runtime los
    // ajusta al modelo de colisión en su primer frame).
    const layout = useLayout.getState()
    const halfW = (layout.gridCols * SPACING) / 2 - 1.2
    const halfH = (layout.gridRows * SPACING) / 2 - 1.2
    paintballFrame.bots = elegidos.map((a, k) => {
      const ang = (k / Math.max(1, elegidos.length)) * Math.PI * 2 + Math.random() * 0.6
      const dist = 8 + Math.random() * 5
      const x = Math.max(-halfW, Math.min(halfW, playerPos.x + Math.sin(ang) * dist))
      const z = Math.max(-halfH, Math.min(halfH, playerPos.z + Math.cos(ang) * dist))
      const cuerpo = cuerpos.find((c) => c.j === `b${k}`)
      return {
        id: a.id,
        x,
        z,
        h: Math.atan2(playerPos.x - x, playerPos.z - z),
        escala: a.escala ?? 1,
        color: cuerpo?.col ?? COLOR_JUGADOR,
        equipo: cuerpo?.eq ?? 1,
        vivo: true,
        recolocar: true,
        objetivo: null,
        strafe: Math.random() < 0.5 ? 1 : -1,
        pensarAcc: Math.random() * 0.3,
        cooldown: 1.2 + Math.random() * 1.5,
        fogonazo: 0,
      }
    })
    // El aspecto de cada bot viaja UNA vez: `asistentes` va podada del plano a
    // propósito, así que sin esto el invitado los dibujaría con el avatar base.
    elegidos.forEach((a, k) => {
      anunciarBot({ j: `b${k}` as BotId, al: a.nombre, em: a.emoji || '🤖', av: podarAsistente(a) })
    })
    fijarJuego('paintball')
    online = true
    retirado = null
    set({ modo })
    arbitro.arrancar(cuerpos, VIDAS_PAINTBALL)
  },

  aplicarMundo: (w) => {
    const s = get()
    // Un `w` en vuelo puede llegar DESPUÉS del `fin` (cada mensaje lleva su
    // propio retardo). Con la batalla terminada solo la reabre un `w` de cuenta
    // atrás, que es como empieza la siguiente; lo demás es correo viejo.
    if (s.fase === 'fin' && w.fa !== 'cuenta') return
    // Me retiré: el mundo sigue llegando cada 2 s y sin esto me volvería a
    // meter en la batalla (y el contexto roto me sacaría otra vez, en bucle).
    // Una cuenta atrás sí entra: es una batalla NUEVA.
    if (w.fa === 'cuenta') retirado = null
    else if (retirado) return
    // El árbitro sigue contando el final un rato: si llega `fa:'fin'` estando
    // todavía en juego es que se perdió el `fin`, y se pide otra vez.
    if (w.fa === 'fin' && (s.fase === 'cuenta' || s.fase === 'jugando')) {
      pedirResync(['w'])
      return
    }
    fijarEquipos(w.js)
    const nuevo = s.fase === null || s.fase === 'config' || s.fase === 'fin'
    const roster = salaViva()?.jugadores ?? []
    const etiquetas = cuerposBot()
    const jugadores: JugadorPaintball[] = w.js.map((f) => {
      const id = aLocal(f.j)
      const quien = roster.find((r) => r.ranura === f.j)
      return {
        id,
        nombre: quien?.nombre || (quien?.alias ? `@${quien.alias}` : f.j),
        color: COLOR_RANURA[Number(f.j.slice(1)) % COLOR_RANURA.length],
        equipo: f.eq,
        vidas: f.vid,
        impactos: f.imp,
        esBot: false,
        fuera: f.fue === 1,
      }
    })
    for (const b of w.bo ?? []) {
      const id = aLocal(b.j)
      // Las vidas de un bot no viajan en `w` (solo si sigue en pie): las lleva
      // el veredicto, que es quien las baja de una en una.
      const previo = s.jugadores.find((j) => j.id === id)
      jugadores.push({
        id,
        nombre: etiquetas.find((e) => e.j === b.j)?.al ?? b.j,
        color: b.col,
        equipo: b.eq,
        vidas: b.vivo ? (previo?.vidas ?? VIDAS_PAINTBALL) : 0,
        impactos: previo?.impactos ?? 0,
        esBot: true,
        fuera: b.vivo === 0,
      })
      const cuerpo = paintballFrame.bots.find((x) => x.id === id)
      if (cuerpo) cuerpo.vivo = b.vivo === 1
    }
    paintballFrame.reloj = w.rel
    if (!nuevo) {
      if (w.fa === 'jugando' && s.fase === 'cuenta') {
        paintballFrame.jugando = true
        sonar('silbato')
      }
      set({ jugadores, fase: w.fa === 'fin' ? s.fase : w.fa })
      return
    }
    // Primera noticia de la batalla: se entra en ella como en `empezar`, pero
    // con la fase y el reloj que dicta el árbitro.
    online = true
    // La sala pasa a paintball también aquí: con backend lo dirá el servidor un
    // momento después, pero la marcadora de los cuerpos remotos y la tasa de
    // pose no pueden esperar a ese rebote.
    fijarJuego('paintball')
    paintballFrame.jugando = w.fa === 'jugando'
    paintballFrame.disparar = false
    paintballFrame.ultimoDisparo = 0
    limpiadorMundo?.(true)
    empunarMarcadora()
    set({ fase: w.fa, jugadores, resultado: null, mensaje: null })
    setCuartoAbierto(false)
    const cam = useCam.getState()
    if (vistaPrevia === null) vistaPrevia = cam.vista
    setPitchLibre(true)
    cam.setVista(get().vistaCombate)
  },

  aplicarVeredicto: (v) => {
    const s = get()
    // Con la batalla cerrada las vidas las fija `fin`: un veredicto rezagado
    // (mismo caso que el `w` de arriba) cambiaría la tabla ya publicada.
    if (!s.fase || s.fase === 'config' || s.fase === 'fin') return
    const victimaId = aLocal(v.vi)
    const tiradorId = aLocal(v.de)
    const victima = s.jugadores.find((j) => j.id === victimaId)
    if (!victima) return
    set({
      jugadores: s.jugadores.map((j) =>
        j.id === victimaId
          ? { ...j, vidas: v.vid, fuera: v.fue === 1 }
          : j.id === tiradorId
            ? { ...j, impactos: j.impactos + 1 }
            : j,
      ),
    })
    if (v.fue) {
      const bot = paintballFrame.bots.find((b) => b.id === victimaId)
      if (bot) bot.vivo = false
      get().avisar({ clave: 'fuera', nombre: victimaId === 'yo' ? undefined : victima.nombre })
    } else if (victimaId === 'yo') {
      get().avisar({ clave: 'teDieron' })
    }
  },

  terminarOnline: (eq, js) => {
    const s = get()
    // Idempotente: el árbitro repite el `fin` ante un `resync` (con `seq`
    // nuevo), así que a quien ya lo aplicó no le pasa nada.
    if (!s.fase || s.fase === 'config' || s.fase === 'fin') return
    fijarEquipos(js)
    paintballFrame.jugando = false
    paintballFrame.disparar = false
    // Las bolas en vuelo se recogen; las manchas se quedan hasta salir.
    limpiadorMundo?.(false)
    // En línea NO se llama a `guardarMarcador`: ese marcador es el arcade local
    // y aquí el resultado lo reporta otro cliente.
    const mio = miEquipo()
    const resultado = mio !== null && mio === eq ? 'ganaste' : 'perdiste'
    sonar(resultado === 'ganaste' ? 'anotacion' : 'silbato')
    window.clearTimeout(avisoTimer)
    set({
      fase: 'fin',
      resultado,
      mensaje: null,
      // La tabla final la cierra el árbitro: quien se enganchó tarde la ve bien.
      jugadores: s.jugadores.map((j) => {
        const f = js.find((x) => aLocal(x.j) === j.id)
        return f ? { ...j, vidas: f.vid, impactos: f.imp, fuera: f.vid <= 0 } : j
      }),
    })
  },

  banderazo: () => {
    if (get().fase !== 'cuenta') return
    paintballFrame.jugando = true
    sonar('silbato')
    set({ fase: 'jugando' })
  },

  registrarImpacto: (deId, victimaId) => {
    const s = get()
    if (s.fase !== 'jugando') return null
    const victima = s.jugadores.find((j) => j.id === victimaId)
    if (!victima || victima.fuera) return null
    const vidas = victima.vidas - 1
    const fuera = vidas <= 0
    const jugadores = s.jugadores.map((j) =>
      j.id === victimaId
        ? { ...j, vidas, fuera }
        : j.id === deId
          ? { ...j, impactos: j.impactos + 1 }
          : j,
    )
    set({ jugadores })
    if (fuera) {
      const bot = paintballFrame.bots.find((b) => b.id === victimaId)
      if (bot) bot.vivo = false
      get().avisar({ clave: 'fuera', nombre: victima.esBot ? victima.nombre : undefined })
    } else if (victimaId === 'yo') {
      get().avisar({ clave: 'teDieron' })
    }
    // ¿Terminó la batalla?
    const yo = jugadores.find((j) => j.id === 'yo')
    if (yo?.fuera) {
      get().terminar('perdiste')
    } else if (!jugadores.some((j) => j.equipo !== 0 && !j.fuera)) {
      get().terminar('ganaste')
    }
    return fuera ? 'fuera' : 'impacto'
  },

  terminar: (resultado) => {
    if (get().fase !== 'jugando') return
    paintballFrame.jugando = false
    paintballFrame.disparar = false
    // Las bolas en vuelo se recogen; las manchas se quedan hasta salir.
    limpiadorMundo?.(false)
    guardarMarcador(resultado)
    sonar(resultado === 'ganaste' ? 'anotacion' : 'silbato')
    window.clearTimeout(avisoTimer)
    set({ fase: 'fin', resultado, mensaje: null })
  },

  setDificultad: (dificultad) => {
    const d = Math.min(1, Math.max(0, dificultad))
    localStorage.setItem(LS_DIFICULTAD, String(d))
    set({ dificultad: d })
  },

  setVistaCombate: (vistaCombate) => {
    localStorage.setItem(LS_VISTA, vistaCombate)
    set({ vistaCombate })
    // Con la batalla en marcha el cambio es inmediato; en los ajustes se aplicará
    // al empezar (`empezar` la lee), sin tocar la cámara del mapa.
    const fase = get().fase
    if (fase === 'cuenta' || fase === 'jugando') useCam.getState().setVista(vistaCombate)
  },

  cancelar: () => {
    if (!get().fase) return
    dejarBatallaOnline('boton')
    paintballFrame.jugando = false
    paintballFrame.disparar = false
    paintballFrame.bots = []
    miraFrame.apuntando = false
    useHerramienta.setState({ apuntando: false })
    devolverHerramientas()
    limpiadorMundo?.(true)
    setPitchLibre(false)
    if (vistaPrevia !== null) {
      useCam.getState().setVista(vistaPrevia)
      vistaPrevia = null
    }
    setCuartoAbierto(false)
    window.clearTimeout(avisoTimer)
    set({ fase: null, jugadores: [], resultado: null, mensaje: null })
  },

  avisar: (mensaje) => {
    set({ mensaje })
    window.clearTimeout(avisoTimer)
    avisoTimer = window.setTimeout(() => set({ mensaje: null }), 2200)
  },
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { usePaintball: typeof usePaintball }).usePaintball = usePaintball
  ;(window as unknown as { paintballFrame: typeof paintballFrame }).paintballFrame = paintballFrame
}
