import type { TFunc } from '../i18n/useT'
import { slugTexto } from '../../rooms/ejercicio/slug'

/**
 * Emotes de la rueda de herramientas («Bailar › …»): bailes populares que el
 * personaje hace en bucle con el rig del gym (ver `emotesPatrones.ts` y
 * `AvatarEmoteMapa.tsx`). Aquí solo lo ligero que necesitan la rueda, el panel
 * y el store; la etiqueta se traduce con `t(`herr.emote.${id}`, fallback)`.
 */
export type EmoteId =
  | 'seisSiete'
  | 'pescar'
  | 'floss'
  | 'griddy'
  | 'dab'
  | 'takeTheL'
  | 'orangeJustice'
  | 'danceMoves'
  | 'hype'
  | 'robot'
  | 'moonwalk'
  | 'gangnam'
  | 'electroShuffle'

/** Cómo pide la gente cada baile por el chat (además del id y del nombre traducido). */
const ALIAS_EMOTE: Record<EmoteId, string[]> = {
  seisSiete: ['67', 'seis siete', 'six seven'],
  pescar: ['pescar', 'fishing', 'pesca', 'caña'],
  floss: ['floss'],
  griddy: ['griddy'],
  dab: ['dab'],
  takeTheL: ['take the l', 'la ele'],
  orangeJustice: ['orange justice', 'orange'],
  danceMoves: ['dance moves', 'default', 'por defecto', 'fortnite'],
  hype: ['hype', 'shoot'],
  robot: ['robot', 'robotico'],
  moonwalk: ['moonwalk', 'moon walk', 'michael jackson'],
  gangnam: ['gangnam', 'gangnam style', 'psy'],
  electroShuffle: ['electro shuffle', 'electro', 'shuffle', 'running man'],
}

const compacto = (s: string) => slugTexto(s).replace(/-/g, '')

/** El emote que nombra un texto libre («que baile el floss», «take the L»): gana la coincidencia más larga. */
export function buscarEmote(texto: string, t: TFunc): EmoteId | null {
  const s = compacto(texto)
  if (!s) return null
  let mejor: EmoteId | null = null
  let largo = 0
  for (const e of EMOTES) {
    for (const alias of [e.id, e.fallback, t(`herr.emote.${e.id}`, e.fallback), ...ALIAS_EMOTE[e.id]]) {
      const a = compacto(alias)
      if (a.length >= 2 && a.length > largo && s.includes(a)) {
        mejor = e.id
        largo = a.length
      }
    }
  }
  return mejor
}

export const EMOTES: readonly { id: EmoteId; emoji: string; fallback: string }[] = [
  { id: 'seisSiete', emoji: '⚖️', fallback: '67' },
  { id: 'pescar', emoji: '🎣', fallback: 'Pescar' },
  { id: 'floss', emoji: '🧵', fallback: 'Floss' },
  { id: 'griddy', emoji: '🕶️', fallback: 'Griddy' },
  { id: 'dab', emoji: '🕺', fallback: 'Dab' },
  { id: 'takeTheL', emoji: '👎', fallback: 'Take the L' },
  { id: 'orangeJustice', emoji: '🍊', fallback: 'Orange Justice' },
  { id: 'danceMoves', emoji: '🪩', fallback: 'Dance Moves' },
  { id: 'hype', emoji: '🏀', fallback: 'Hype' },
  { id: 'robot', emoji: '🤖', fallback: 'Robot' },
  { id: 'moonwalk', emoji: '🌙', fallback: 'Moonwalk' },
  { id: 'gangnam', emoji: '🎤', fallback: 'Gangnam Style' },
  { id: 'electroShuffle', emoji: '🔀', fallback: 'Electro Shuffle' },
]
