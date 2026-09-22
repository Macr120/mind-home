/**
 * Mapeo ranura ↔ id local. Es la ÚNICA frontera donde `'yo'` significa algo:
 * los juegos siguen siendo egocéntricos y nada fuera de este módulo traduce.
 */
import type { BotId, Marcador, Ranura } from './tipos'

/** Marcador de una cancha como lo entiende el juego: egocéntrico. */
export interface MarcadorPartido {
  yo: number
  rival: number
  juegosYo: number
  juegosRival: number
  setsYo: number
  setsRival: number
}

let mia: Ranura | null = null
const equipos = new Map<Ranura, number>()
/** BotId → id local del asistente que lo encarna (solo en el anfitrión). */
const bots = new Map<string, string>()

/** La fija `sala.ts` al conectar (y la limpia al salir). */
export function fijarMiRanura(r: Ranura | null): void {
  mia = r
  if (r === null) {
    equipos.clear()
    bots.clear()
  }
}

/**
 * Bots de la batalla, en orden `b0..b4`. Solo los tiene el ANFITRIÓN, que es
 * quien los mueve: en el invitado un bot es un cuerpo remoto más y su id local
 * ya es el `BotId` que viaja.
 */
export function fijarBots(ids: readonly string[]): void {
  bots.clear()
  ids.forEach((id, i) => bots.set(`b${i}`, id))
}

/** Mi ranura en la sala viva, o null fuera de partida. */
export function miRanura(): Ranura | null {
  return mia
}

/** Ranura → id que entiende el juego local: 'yo' si es la mía, 'j2' si no. */
export function aLocal(r: Ranura | BotId): string {
  if (r === mia) return 'yo'
  return bots.get(r) ?? r
}

/** Id local → ranura para emitir ('yo' → mi ranura; 'j2' → 'j2'; bot → su BotId). */
export function aRanura(id: string): Ranura | BotId | null {
  if (id === 'yo') return mia
  if (/^j[0-3]$/.test(id) || /^b[0-4]$/.test(id)) return id as Ranura | BotId
  for (const [bot, local] of bots) if (local === id) return bot as BotId
  return null
}

/**
 * Guarda el reparto de equipos que llega en `w`/`fin`. Es autoridad del ÁRBITRO:
 * `partida_jugadores.equipo` es informativo y no manda aquí.
 */
export function fijarEquipos(js: { j: Ranura; eq: number }[]): void {
  equipos.clear()
  for (const x of js) equipos.set(x.j, x.eq)
}

/** ¿La ranura es de mi equipo? */
export function esMiEquipo(r: Ranura): boolean {
  if (mia === null) return false
  const mio = equipos.get(mia)
  return mio !== undefined && equipos.get(r) === mio
}

/**
 * Marcador SLOT-RELATIVO → egocéntrico. Es la otra mitad de la frontera (con
 * `aLocal`): en el cable cada fila lleva su ranura y aquí se decide cuál es la
 * mía, así que el juego sigue leyendo `yo`/`rival` sin saber de ranuras. Lo que
 * no venga en el mensaje se queda en cero: el árbitro manda el marcador entero.
 */
export function marcadorLocal(mk: readonly Marcador[]): MarcadorPartido {
  const mio = mk.find((f) => f.j === mia)
  const suyo = mk.find((f) => f.j !== mia)
  return {
    yo: mio?.p ?? 0,
    rival: suyo?.p ?? 0,
    juegosYo: mio?.ju ?? 0,
    juegosRival: suyo?.ju ?? 0,
    setsYo: mio?.se ?? 0,
    setsRival: suyo?.se ?? 0,
  }
}

/** Mi equipo según el último reparto del árbitro, o null si no hay ninguno. */
export function miEquipo(): number | null {
  return mia === null ? null : (equipos.get(mia) ?? null)
}
