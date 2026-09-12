import type { ClipAvatar, ClipVideo, EscenaActor } from '../../core/data/db'
import type { TFunc } from '../../core/i18n/useT'
import { esModelo, getAsistente, MODELOS_PERSONAJE } from '../../core/state/asistentesStore'
import { ES_JUGADOR } from '../../core/state/peliculaStore'
import { playerPos } from '../../core/state/playerPosition'
import { posAsistentes } from '../../core/state/posAsistentes'
import { EMOJIS } from '../../core/ui/iconos/catalogo'

/**
 * Quién es un personaje del Studio: un asistente (por su id), un modelo del
 * editor de personajes (`modelo:<id>`) o tu avatar (`ES_JUGADOR`). Único sitio
 * del editor que traduce un id a nombre, emoji y punto del mapa:
 * `getAsistente('jugador')` caería en silencio al primer asistente de la lista.
 */

export const esJugador = (id: string) => id === ES_JUGADOR

export function nombreActor(t: TFunc, id: string): string {
  if (esJugador(id)) return t('video.pelicula.tu', 'Tú')
  const modelo = esModelo(id) ? MODELOS_PERSONAJE.find((m) => m.id === id) : undefined
  return modelo ? t(modelo.claveNombre, modelo.es) : getAsistente(id).nombre
}

export function emojiActor(id: string): string {
  return esJugador(id) ? EMOJIS.persona : getAsistente(id).emoji
}

/** Un clip de avatar que vive en la casa 3D (y no en el PIP). */
export const esActorEscena = (c: ClipVideo | null | undefined): c is ClipAvatar & { modo: 'escena'; escena: EscenaActor } =>
  !!c && c.pista === 'avatar' && c.modo === 'escena' && !!c.escena

/** Dónde está el actor ahora mismo en el mapa («Aquí», y donde nace una línea que baja del guion). */
export function puntoActor(id: string): { x: number; z: number } {
  if (esJugador(id)) return { x: playerPos.x, z: playerPos.z }
  const p = posAsistentes[id]
  return p ? { x: p.x, z: p.z } : { x: playerPos.x + 2, z: playerPos.z }
}
