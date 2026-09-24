import type { TFunc } from '../i18n/useT'
import type { MensajeBuzon } from './tipos'

/**
 * «Responder» a un mensaje. La cita viaja como PRIMERA LÍNEA del texto
 * (`↩ @alias: extracto`), sin cambiar el servidor: una versión vieja de la app
 * la muestra tal cual y se sigue entendiendo.
 */
export interface Cita {
  /** `@alias` de quien escribió el mensaje citado. */
  autor: string
  extracto: string
}

const MARCA = '↩ '
const CITA = /^↩ (@[a-z0-9_]{3,20}): ([^\n]*)\n?([\s\S]*)$/
const LARGO = 80

export function citar(c: Cita, texto: string): string {
  return `${MARCA}${c.autor}: ${c.extracto}\n${texto}`
}

export function separarCita(texto: string): { cita: Cita | null; cuerpo: string } {
  const r = CITA.exec(texto)
  return r ? { cita: { autor: r[1], extracto: r[2] }, cuerpo: r[3] } : { cita: null, cuerpo: texto }
}

/** Una línea que representa el mensaje (para la cita y para buscarlo al tocarla). */
export function extractoDe(m: MensajeBuzon, t: TFunc): string {
  const cuerpo = separarCita(m.texto).cuerpo.replace(/\s+/g, ' ').trim()
  const base =
    m.tipo === 'imagen'
      ? `📷 ${t('buzon.adjunto.imagen', 'Imagen')}`
      : m.tipo === 'pdf'
        ? `📄 ${m.adjunto?.nombre || 'PDF'}`
        : m.tipo === 'audio'
          ? `🎵 ${m.adjunto?.nombre || t('buzon.adjunto.audio', 'Audio')}`
          : m.tipo === 'video'
            ? `🎬 ${m.adjunto?.nombre || t('buzon.adjunto.video', 'Video')}`
            : m.tipo === 'contenido'
              ? `${m.contenido?.emoji ?? '📦'} ${m.contenido?.nombre ?? ''}`
              : ''
  const linea = [base, cuerpo].filter(Boolean).join(' · ')
  return linea.length > LARGO ? `${linea.slice(0, LARGO - 1)}…` : linea
}
