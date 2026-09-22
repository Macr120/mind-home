/**
 * Catálogo de los juegos que se pueden proponer por el chat («jugar tenis con
 * @ana»): qué nombres entiende el parser, dónde vive cada juego en la casa y
 * qué viaja en el mensaje del buzón.
 *
 * Módulo HOJA a propósito: sin imports de 3D ni de `db` (solo `urlApp`, que
 * resuelve una variable de entorno). Lo leen el chat, la tarjeta del buzón, el lado
 * anfitrión de la visita y el volcado del plano —que corre dentro del
 * `db.on('ready')` y no puede arrastrar la escena ni la base de datos—.
 *
 * Los dos ids que se repiten aquí (`__mapa__` y `cancha:`) son copia
 * deliberada de `state/disenoStore` y `state/canchasStore`: importarlos traería
 * la casa entera a este módulo. Si alguno cambia allá, cambia también aquí.
 */
import { urlApp } from '../cuenta/urlWeb'
import type { TFunc } from '../i18n/useT'
import type { ClaseCancha } from '../state/canchasStore'

/** `roomId` de los objetos libres del mapa (espejo de `disenoStore.MAPA_ROOM`). */
const MAPA_ROOM = '__mapa__'
/** Prefijo del `tipo` de una cancha (espejo de `canchasStore.TIPO_CANCHA_PREFIJO`). */
const TIPO_CANCHA = 'cancha:'

/** Id del juego, tal cual viaja en `datos.juego` y en `?juego=` de la URL. */
export type JuegoInvitable =
  | 'paintball'
  | 'futbol'
  | 'basquet'
  | 'tenis'
  | 'cuatroenlinea'
  | 'damas'
  | 'ajedrez'
  | 'conocerse'
  | 'debates'

export interface DefJuegoInvitable {
  emoji: string
  /** Nombre en español: respaldo de la clave de traducción. */
  es: string
  /** Clave i18n del nombre (reutiliza las que ya traducen canchas y mesa). */
  clave: string
  /** Nombres normalizados que acepta el parser del chat (sin acentos, en minúsculas). */
  nombres: readonly string[]
  /** Juego de cancha: la clase del objeto `cancha:<clase>` del mapa. */
  cancha?: ClaseCancha
  /** Juego de mesa: el `dato` de `abrirApp('entretenimiento', 'mesa', dato)`. */
  mesa?: string
}

export const JUEGOS_INVITABLES: Record<JuegoInvitable, DefJuegoInvitable> = {
  paintball: {
    emoji: '🥎',
    es: 'Paintball',
    clave: 'paintball.titulo',
    nombres: ['paintball', 'gotcha'],
  },
  futbol: {
    emoji: '⚽',
    es: 'Fútbol',
    clave: 'canchas.clase.futbol',
    nombres: ['futbol', 'futbolito', 'futsal', 'soccer', 'football'],
    cancha: 'futbol',
  },
  basquet: {
    emoji: '🏀',
    es: 'Básquet',
    clave: 'canchas.clase.basket',
    nombres: ['basquet', 'basquetbol', 'basket', 'basketball', 'baloncesto'],
    cancha: 'basket',
  },
  tenis: {
    emoji: '🎾',
    es: 'Tenis',
    clave: 'canchas.clase.tenis',
    nombres: ['tenis', 'tennis'],
    cancha: 'tenis',
  },
  cuatroenlinea: {
    emoji: '🟡',
    es: '4 en línea',
    clave: 'entre.j.cuatroenlinea.nombre',
    nombres: ['4 en linea', 'cuatro en linea', 'conecta 4', 'conecta cuatro', 'connect 4', 'connect four'],
    mesa: 'cuatroenlinea',
  },
  damas: {
    emoji: '🔴',
    es: 'Damas',
    clave: 'entre.j.damas.nombre',
    nombres: ['damas', 'checkers'],
    mesa: 'damas',
  },
  ajedrez: {
    emoji: '♟️',
    es: 'Ajedrez',
    clave: 'entre.j.ajedrez.nombre',
    nombres: ['ajedrez', 'chess'],
    mesa: 'ajedrez',
  },
  conocerse: {
    emoji: '💬',
    es: 'Para conocerse',
    clave: 'entre.j.conocerse.nombre',
    nombres: ['cartas de preguntas', 'para conocerse', 'conocerse', 'cartas'],
    mesa: 'conocerse',
  },
  debates: {
    emoji: '🔥',
    es: 'Debates',
    clave: 'entre.j.debates.nombre',
    nombres: ['debates'],
    mesa: 'debates',
  },
}

const IDS = Object.keys(JUEGOS_INVITABLES) as JuegoInvitable[]

export function esJuegoInvitable(x: unknown): x is JuegoInvitable {
  return typeof x === 'string' && (IDS as string[]).includes(x)
}

/** El nombre del juego en el idioma de la app. */
export function nombreJuego(juego: JuegoInvitable, t: TFunc): string {
  const def = JUEGOS_INVITABLES[juego]
  return t(def.clave, def.es)
}

/**
 * Enlace web a la sala YA en el juego. Abierto en frío entra por el camino que
 * ya existe (`?visita=` → `partida_entrar`); `?juego=` es el respaldo de
 * `juegoPendienteVisita()` cuando no hay `sessionStorage` que sobreviva.
 */
export function enlaceJuego(partidaId: string, juego: JuegoInvitable, apps: readonly string[]): string {
  const raiz = `${urlApp()}/`
  const extra = apps.length ? `&visitaApps=${encodeURIComponent(apps.join(','))}` : ''
  return `${raiz}?visita=${encodeURIComponent(partidaId)}&juego=${juego}${extra}`
}

/**
 * Dónde se planta el jugador para este juego. Solo las canchas tienen sitio
 * propio (el paintball es la casa entera y la mesa se abre como app): el punto
 * es el centro de la cancha corrido `lado * 2` en x, para que anfitrión e
 * invitado no aparezcan uno encima del otro.
 *
 * `objetos` se lee DEFENSIVAMENTE: uno de los dos que llaman le pasa las filas
 * del plano de otra persona.
 */
export function posicionDeJuego(
  juego: JuegoInvitable,
  objetos: readonly unknown[],
  lado: -1 | 1,
): { x: number; z: number } | null {
  const clase = JUEGOS_INVITABLES[juego].cancha
  if (!clase) return null
  const tipo = TIPO_CANCHA + clase
  for (const bruto of objetos) {
    if (typeof bruto !== 'object' || bruto === null) continue
    const o = bruto as { roomId?: unknown; tipo?: unknown; x?: unknown; z?: unknown }
    if (o.roomId !== MAPA_ROOM || o.tipo !== tipo) continue
    const x = typeof o.x === 'number' && Number.isFinite(o.x) ? o.x : 0
    const z = typeof o.z === 'number' && Number.isFinite(o.z) ? o.z : 0
    return { x: x + lado * 2, z }
  }
  return null
}

/** Lo que viaja en `contenido.datos` del mensaje, validado: viene de otra persona. */
export function leerDatosJuego(
  datos: unknown,
): { partidaId: string; juego: JuegoInvitable; apps: string[] } | null {
  if (typeof datos !== 'object' || datos === null) return null
  const d = datos as { partidaId?: unknown; juego?: unknown; apps?: unknown }
  if (typeof d.partidaId !== 'string' || !d.partidaId || d.partidaId.length > 64) return null
  if (!esJuegoInvitable(d.juego)) return null
  const apps = Array.isArray(d.apps)
    ? d.apps.filter((a): a is string => typeof a === 'string').slice(0, 32)
    : []
  return { partidaId: d.partidaId, juego: d.juego, apps }
}
