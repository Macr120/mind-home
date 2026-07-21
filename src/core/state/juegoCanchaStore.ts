import { create } from 'zustand'
import { db } from '../data/db'
import { sonar } from '../audio/sfx'
import type { ClaseCancha } from './canchasStore'

/**
 * Minijuego de cancha: al CAMINAR dentro de una cancha se pregunta el modo
 * (jugar solo o contra un asistente elegido) y la dificultad; al confirmar
 * aparecen la pelota y el rival. El marcador persiste por cancha en
 * db.marcadores (en tenis, con juegos y sets). La física corre en
 * `house/minijuegos.tsx` sobre `juegoFrame` (mutable por-frame, en coordenadas
 * LOCALES de la cancha); este store guarda lo reactivo (HUD).
 */

export type ModoJuego = 'solo' | 'ia'

/** Preferencia de dificultad (0 = muy fácil, 1 = experto). */
const LS_DIFICULTAD = 'mh.juegoDificultad'
const leerDificultad = (): number => {
  const v = parseFloat(localStorage.getItem(LS_DIFICULTAD) ?? '')
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5
}

/** Estado por-frame del minijuego activo (coordenadas locales de la cancha). */
export const juegoFrame = {
  // Pelota (rodando: fútbol) — posición y velocidad en el plano local.
  bx: 0,
  bz: 0,
  bvx: 0,
  bvz: 0,
  /** Vuelo parabólico en curso (tiros de básquet, peloteo de tenis). */
  vuelo: null as null | {
    x0: number
    y0: number
    z0: number
    x1: number
    y1: number
    z1: number
    t: number
    dur: number
    alto: number
  },
  /** Altura actual de la pelota sobre el piso local (0 = rodando). */
  by: 0,
  // Rival NPC (posición local, rumbo y fase de marcha propios).
  rx: 0,
  rz: 0,
  rHeading: 0,
  rFase: 0,
  rVel: 0,
  // Estado del juego por clase.
  duena: 'nadie' as 'nadie' | 'yo' | 'rival',
  /** ms época desde que el jugador está quieto con la pelota (básquet: tiro). */
  quietoDesde: 0,
  /** ms época del próximo evento programado (tiro del rival, saque de tenis…). */
  proximoEvento: 0,
  /** Lado del jugador en tenis (+1 = x local positiva). */
  ladoJugador: 1 as 1 | -1,
  /** Altura del frontón de tenis solo (anima al levantarse, 0→1). */
  muro: 0,
  /** Raquetazo en curso (1 → 0): anima la raqueta del jugador y del rival. */
  swing: 0,
  rSwing: 0,
  // ── Control por botón (BotonAccionCancha muta estos campos directamente) ──
  /** Botón mantenido presionado (fútbol/básquet: cargando fuerza). */
  cargando: false,
  /** Carga acumulada 0..1 (la sube el tick mientras `cargando`). */
  carga: 0,
  /** Flanco de "se soltó el botón": el tick lo consume y ejecuta el tiro/patada. */
  soltar: false,
  /** Flanco de tap (tenis): el tick lo consume e intenta golpear. */
  golpe: false,
  // ── Dribbling / efecto / rebote ──
  /** Aceleración lateral que curva la pelota rodando (chanfle); decae sola. */
  chanfle: 0,
  /** Velocidad lateral reciente del jugador (para calcular el chanfle al golpear). */
  strafe: 0,
  /** Fase del botecito del balón mientras lo llevas (fútbol). */
  bote: 0,
  /** Rebotes de la pelota en tu lado desde el último golpe (tenis). */
  botesTenis: 0,
  /** La pelota es golpeable ahora (tenis): lo lee el botón para resaltar. */
  enVentana: false,
}

interface JuegoCanchaState {
  /** Cancha bajo los pies (id del objeto de mapa) o null. */
  canchaId: number | null
  clase: ClaseCancha | null
  /** 'eligiendo' = prompt de modo; 'jugando' = partido en curso. */
  fase: 'eligiendo' | 'jugando' | null
  modo: ModoJuego | null
  /** Dificultad del rival/frontón (0–1); preferencia persistente. */
  dificultad: number
  /** Asistente rival elegido (id para su modelo 3D, nombre para el HUD). */
  rivalId: string | null
  rivalNombre: string | null
  rivalColor: string | null
  /** Marcador: goles/puntos, o puntos del juego actual en tenis (0,1,2,3,AD…). */
  yo: number
  rival: number
  // Tenis contra la IA: juegos y sets del partido (al mejor de 3 sets).
  juegosYo: number
  juegosRival: number
  setsYo: number
  setsRival: number
  /** Tenis solo: récord de golpes seguidos contra el frontón. */
  mejorPeloteo: number
  /** Clave del mensaje transitorio del HUD ('gol', 'canasta3', …). */
  mensaje: string | null
  activar: (canchaId: number, clase: ClaseCancha) => Promise<void>
  elegirModo: (modo: ModoJuego, rival?: { id: string; nombre: string; color?: string }) => void
  setDificultad: (d: number) => void
  terminar: () => void
  /** Suma puntos (fútbol/básquet), persiste el marcador y muestra el mensaje. */
  anotar: (quien: 'yo' | 'rival', puntos: number, mensaje: string) => Promise<void>
  /** Punto de tenis contra la IA: escala puntos → juego → set → partido. */
  puntoTenis: (quien: 'yo' | 'rival') => Promise<string>
  /** Tenis solo: un golpe más al frontón (guarda el récord). */
  sumarPeloteo: () => Promise<void>
  avisar: (mensaje: string) => void
}

let avisoTimer = 0

/** Un juego de tenis se gana con 4 puntos y 2 de diferencia (ventaja incluida). */
const ganaJuego = (a: number, b: number) => a >= 4 && a - b >= 2
/** Un set se gana con 6 juegos y 2 de diferencia, o al llegar a 7. */
const ganaSet = (a: number, b: number) => (a >= 6 && a - b >= 2) || a >= 7

/** Etiqueta del punto de tenis (0/15/30/40/AD) para el marcador. */
export function etiquetaTenis(yo: number, rival: number): { yo: string; rival: string } {
  if (yo >= 3 && rival >= 3) {
    if (yo === rival) return { yo: '40', rival: '40' }
    return yo > rival ? { yo: 'AD', rival: '—' } : { yo: '—', rival: 'AD' }
  }
  const P = ['0', '15', '30', '40']
  return { yo: P[Math.min(yo, 3)], rival: P[Math.min(rival, 3)] }
}

export const useJuegoCancha = create<JuegoCanchaState>((set, get) => ({
  canchaId: null,
  clase: null,
  fase: null,
  modo: null,
  dificultad: leerDificultad(),
  rivalId: null,
  rivalNombre: null,
  rivalColor: null,
  yo: 0,
  rival: 0,
  juegosYo: 0,
  juegosRival: 0,
  setsYo: 0,
  setsRival: 0,
  mejorPeloteo: 0,
  mensaje: null,

  activar: async (canchaId, clase) => {
    if (get().canchaId === canchaId) return
    const f = await db.marcadores.where('canchaId').equals(canchaId).first()
    set({
      canchaId,
      clase,
      fase: 'eligiendo',
      modo: null,
      rivalId: null,
      rivalNombre: null,
      rivalColor: null,
      yo: f?.yo ?? 0,
      rival: f?.rival ?? 0,
      juegosYo: f?.juegosYo ?? 0,
      juegosRival: f?.juegosRival ?? 0,
      setsYo: f?.setsYo ?? 0,
      setsRival: f?.setsRival ?? 0,
      mejorPeloteo: f?.mejorPeloteo ?? 0,
      mensaje: null,
    })
  },

  elegirModo: (modo, rival) => {
    if (get().fase !== 'eligiendo') return
    sonar('silbato')
    // El tenis arranca cada partido desde 0-0 (en solo, `yo` cuenta el peloteo).
    const reset = get().clase === 'tenis' ? { yo: 0, rival: 0 } : {}
    set({
      fase: 'jugando',
      modo,
      rivalId: rival?.id ?? null,
      rivalNombre: rival?.nombre ?? null,
      rivalColor: rival?.color ?? null,
      ...reset,
    })
  },

  setDificultad: (dificultad) => {
    const d = Math.min(1, Math.max(0, dificultad))
    localStorage.setItem(LS_DIFICULTAD, String(d))
    set({ dificultad: d })
  },

  terminar: () => {
    if (get().canchaId == null) return
    window.clearTimeout(avisoTimer)
    set({
      canchaId: null,
      clase: null,
      fase: null,
      modo: null,
      rivalId: null,
      rivalNombre: null,
      rivalColor: null,
      mensaje: null,
    })
  },

  anotar: async (quien, puntos, mensaje) => {
    if (quien === 'yo') sonar('anotacion')
    const yo = get().yo + (quien === 'yo' ? puntos : 0)
    const rival = get().rival + (quien === 'rival' ? puntos : 0)
    set({ yo, rival })
    get().avisar(mensaje)
    await persistir(get())
  },

  puntoTenis: async (quien) => {
    if (quien === 'yo') sonar('anotacion')
    let { yo, rival, juegosYo, juegosRival, setsYo, setsRival } = get()
    if (quien === 'yo') yo++
    else rival++
    let mensaje = quien === 'yo' ? 'puntoTenis' : 'puntoTenisRival'
    if (ganaJuego(yo, rival) || ganaJuego(rival, yo)) {
      const g = ganaJuego(yo, rival) ? 'yo' : 'rival'
      yo = 0
      rival = 0
      if (g === 'yo') juegosYo++
      else juegosRival++
      mensaje = g === 'yo' ? 'juegoTuyo' : 'juegoRival'
      if (ganaSet(juegosYo, juegosRival) || ganaSet(juegosRival, juegosYo)) {
        const s = ganaSet(juegosYo, juegosRival) ? 'yo' : 'rival'
        juegosYo = 0
        juegosRival = 0
        if (s === 'yo') setsYo++
        else setsRival++
        mensaje = s === 'yo' ? 'setTuyo' : 'setRival'
        // Partido al mejor de 3 sets: al ganarlo, el marcador arranca de nuevo.
        if (setsYo >= 2 || setsRival >= 2) {
          mensaje = setsYo >= 2 ? 'partidoTuyo' : 'partidoRival'
          setsYo = 0
          setsRival = 0
        }
      }
    }
    set({ yo, rival, juegosYo, juegosRival, setsYo, setsRival })
    get().avisar(mensaje)
    await persistir(get())
    return mensaje
  },

  sumarPeloteo: async () => {
    const yo = get().yo + 1
    const mejorPeloteo = Math.max(get().mejorPeloteo, yo)
    set({ yo, mejorPeloteo })
    get().avisar(yo === mejorPeloteo && yo > 2 ? 'nuevoRecord' : 'peloteo')
    await persistir(get())
  },

  avisar: (mensaje) => {
    set({ mensaje })
    window.clearTimeout(avisoTimer)
    avisoTimer = window.setTimeout(() => set({ mensaje: null }), 2200)
  },
}))

/** Vuelca el marcador de la cancha activa a la BD (una fila por cancha). */
async function persistir(s: JuegoCanchaState) {
  const { canchaId, yo, rival, juegosYo, juegosRival, setsYo, setsRival, mejorPeloteo } = s
  if (canchaId == null) return
  const datos = { yo, rival, juegosYo, juegosRival, setsYo, setsRival, mejorPeloteo }
  const fila = await db.marcadores.where('canchaId').equals(canchaId).first()
  if (fila?.id != null) await db.marcadores.update(fila.id, datos)
  else await db.marcadores.add({ canchaId, ...datos })
}
