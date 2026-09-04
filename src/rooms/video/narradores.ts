import type { NarradorVideo, ProyectoVideo } from '../../core/data/db'
import type { TFunc } from '../../core/i18n/useT'
import { getAsistente } from '../../core/state/asistentesStore'
import { emojiActor, esJugador, nombreActor } from './actores'
import { nuevoNarradorId } from './constantes'
import { callarVoces, hablarConVoz, PREFIJO_DISPOSITIVO, vocesElegibles } from './voces'

/**
 * Los narradores del proyecto (`proyecto.narradores`): quién dice cada línea
 * del guion, con su voz IA y, si lo tiene, su personaje (entonces la línea va
 * a la pista avatar y el personaje aparece hablando; sin él es voz en off).
 * Aquí viven el nombre visible, el alta con una voz sensata y el reproductor
 * de «Escuchar el guion». Las reglas sobre los clips están en `modelo.ts`.
 */

/** El puesto por el usuario, el del personaje, o «Narrador». */
export function nombreNarrador(t: TFunc, n: NarradorVideo): string {
  if (n.nombre?.trim()) return n.nombre.trim()
  return n.asistenteId ? nombreActor(t, n.asistenteId) : t('video.narradores.enOff', 'Narrador')
}

export const emojiNarrador = (n: NarradorVideo): string | undefined =>
  n.asistenteId ? emojiActor(n.asistenteId) : undefined

/** Narrador nuevo: con personaje hereda la voz de su ficha (IA o del sistema) si sirve aquí; si no, la primera voz que nadie use. */
export function nuevoNarrador(p: ProyectoVideo, asistenteId?: string): NarradorVideo {
  const voces = vocesElegibles()
  const usadas = new Set((p.narradores ?? []).map((n) => n.voz))
  // Tu avatar no tiene ficha de voz: toma la primera libre, como un narrador en off.
  const a = asistenteId && !esJugador(asistenteId) ? getAsistente(asistenteId) : undefined
  const deFicha = [a?.vozIaVoz, a?.vozNombre ? PREFIJO_DISPOSITIVO + a.vozNombre : undefined].find((v) => v && voces.includes(v))
  const voz = deFicha ?? voces.find((v) => !usadas.has(v)) ?? voces[0]
  return asistenteId ? { id: nuevoNarradorId(), voz, asistenteId } : { id: nuevoNarradorId(), voz }
}

export interface LineaPrevia {
  id: string
  texto: string
  voz?: string
  /** Audio ya generado o elegido: suena tal cual, sin pedir nada a la IA. */
  blob?: Blob
}

/**
 * «Escuchar el guion»: reproduce las líneas en orden, cada una con su voz.
 * Las que traen audio suenan tal cual (gratis); las demás se leen con su voz
 * (IA con créditos, o la del dispositivo gratis) sin guardar nada. `onLinea`
 * recibe la que suena y `null` al terminar o parar; `onFallo` si una línea no
 * se pudo leer (la lectura se detiene ahí). Devuelve la función que para.
 */
export function reproducirLineas(lineas: LineaPrevia[], onLinea: (id: string | null) => void, onFallo?: () => void): () => void {
  let viva = true
  let audio: HTMLAudioElement | null = null
  const parar = () => {
    if (!viva) return
    viva = false
    audio?.pause()
    callarVoces()
    onLinea(null)
  }
  void (async () => {
    for (const l of lineas) {
      if (!viva) return
      onLinea(l.id)
      if (l.blob) {
        const url = URL.createObjectURL(l.blob)
        await new Promise<void>((resolver) => {
          const el = new Audio(url)
          audio = el
          // `pause` salta también al terminar (antes de `ended`) y al parar desde fuera.
          el.onpause = () => resolver()
          el.onerror = () => resolver()
          el.play().catch(() => resolver())
        })
        URL.revokeObjectURL(url)
      } else {
        const ok = await new Promise<boolean>((resolver) => {
          void hablarConVoz(l.texto.slice(0, 300), l.voz, { onFin: () => resolver(true) }).then((arranco) => {
            if (!arranco) resolver(false)
            else if (!viva) {
              callarVoces() // se paró mientras llegaba el audio
              resolver(false)
            }
          })
        })
        if (!ok) {
          if (viva) onFallo?.()
          break
        }
      }
    }
    parar()
  })()
  return parar
}
