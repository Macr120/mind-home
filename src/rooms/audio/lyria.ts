import { contextoAudio } from '../../core/audio/motor'
import { getIaKey } from '../../core/chat/ia'
import { iaMusicaCuenta, usarViaCuenta } from '../../core/cuenta/api'
import { useGastoByok } from '../../core/cuenta/gastoByok'
import type { InstrumentoAudio, PistaAudio, ProyectoAudio } from '../../core/data/db'
import { grabacionesAudioRepo } from '../../core/data/repository'
import { datosIdioma } from '../../core/i18n/idiomas'
import { idiomaActual, tGlobal } from '../../core/i18n/useT'
import { MAX_COMPASES, PASOS_POR_COMPAS, nuevaPistaId, nuevoClipId, segPorPaso } from './constantes'
import { calcularPicos } from './grabadorClip'
import * as motor from './motor'

/**
 * Versión CANTADA de una canción del Studio (fase 2 de «Canción con IA»): el
 * proyecto MIDI (tempo, duración, instrumentos y la letra con sus tiempos) se
 * convierte en un prompt para Google Lyria 3.5, que devuelve un MP3 con voz
 * real. El MP3 se guarda como toma local y entra como pista de audio, así que
 * se mezcla, se exporta y se borra como cualquier grabación de micrófono.
 *
 * Con cuenta va por `ia-musica` (16 créditos); con clave propia de Gemini,
 * directo a la API desde el navegador.
 */

const MODELO = 'lyria-3.5'
const USD_POR_CANCION = 0.08

/** Nombres en inglés para el prompt (Lyria entiende mejor la instrumentación así). */
const INSTR_EN: Record<InstrumentoAudio, string> = {
  piano: 'piano',
  organo: 'organ',
  campanas: 'bells',
  pad: 'synth pad',
  lead: 'lead synth',
  guitarra: 'guitar',
  bajo: 'bass',
  arpa: 'harp',
  violines: 'strings',
  pluck: 'plucked synth',
  flauta: 'flute',
  trompeta: 'trumpet',
  sax: 'saxophone',
  bateria: 'acoustic drums',
  bateria808: '808 drums',
  voz: '',
  coro: '',
}

const mmss = (seg: number) => `${Math.floor(seg / 60)}:${String(Math.floor(seg % 60)).padStart(2, '0')}`
const aSeg = (m: string) => {
  const [min, s] = m.split(':').map(Number)
  return min * 60 + s
}

/**
 * La letra del proyecto, con las cabeceras `[Nombre · m:ss]` que escribe la
 * composición, pasa a rangos de tiempo `[0:29 - 0:48] Coro:` (el formato que
 * documenta Lyria). Si el usuario borró las cabeceras, va la letra tal cual.
 */
function estructura(letra: string, totalSeg: number, segSeccion: number): string {
  const partes = [...letra.matchAll(/^\[([^\]·]+?)\s*·\s*(\d+:\d{2})\]\s*$/gm)]
  if (!partes.length) return letra.trim()
  const bloques: string[] = []
  if (aSeg(partes[0][2]) > 2) bloques.push(`[0:00 - ${partes[0][2]}] Intro (instrumental)`)
  partes.forEach((m, i) => {
    const desde = aSeg(m[2])
    const hasta = i + 1 < partes.length ? aSeg(partes[i + 1][2]) : Math.min(totalSeg, desde + segSeccion)
    const fin = i + 1 < partes.length ? partes[i + 1].index! : letra.length
    const versos = letra.slice(m.index! + m[0].length, fin).trim()
    bloques.push(`[${mmss(desde)} - ${mmss(hasta)}] ${m[1].trim()}:\n${versos}`)
  })
  const ultimo = partes[partes.length - 1]
  const finLetra = Math.min(totalSeg, aSeg(ultimo[2]) + segSeccion)
  if (totalSeg - finLetra > 4) bloques.push(`[${mmss(finLetra)} - ${mmss(totalSeg)}] Outro (instrumental)`)
  return bloques.join('\n\n')
}

/** El prompt de Lyria a partir del proyecto. */
export function promptLyria(p: ProyectoAudio, estilo: string, conVoz: boolean): string {
  const totalSeg = p.compases * PASOS_POR_COMPAS * segPorPaso(p.bpm)
  const instrumentos = [
    ...new Set(p.pistas.filter((x) => x.tipo !== 'audio').map((x) => INSTR_EN[x.instrumento])),
  ].filter(Boolean)
  const lineas = [estilo.trim() || 'A catchy pop song.', `Tempo: ${p.bpm} BPM, 4/4. Length: about ${mmss(totalSeg)}.`]
  if (instrumentos.length) lineas.push(`Instrumentation: ${instrumentos.join(', ')}.`)
  if (conVoz && p.letra?.trim()) {
    lineas.push(
      'Lead vocalist sings these exact lyrics, in their original language, with backing vocals in the choruses:',
      '',
      estructura(p.letra, totalSeg, 8 * PASOS_POR_COMPAS * segPorPaso(p.bpm)),
    )
  } else if (conVoz) {
    // Sin letra en el proyecto: Lyria la escribe en el idioma de la interfaz.
    lineas.push(`Lead vocalist sings original lyrics written in ${datosIdioma(idiomaActual()).endonimo}, with verses, a catchy chorus and backing vocals in the choruses.`)
  } else {
    lineas.push('Instrumental only, no vocals.')
  }
  return lineas.join('\n').slice(0, 6000)
}

/**
 * El prompt de Lyria SIN composición previa (cuando no se pidió el MIDI
 * editable): solo la descripción, la duración y, si hay voz, la letra del
 * usuario o el idioma en que Lyria debe escribirla.
 */
export function promptLyriaDirecto(o: {
  estilo: string
  letra: string
  conVoz: boolean
  segundos: number
  bpm?: number
  /** Endónimo del idioma («English», «日本語»…). */
  idioma: string
}): string {
  const lineas = [o.estilo.trim() || 'A catchy pop song.', `${o.bpm ? `Tempo: ${o.bpm} BPM, 4/4. ` : ''}Length: about ${mmss(o.segundos)}.`]
  if (!o.conVoz) lineas.push('Instrumental only, no vocals.')
  else if (o.letra.trim()) {
    lineas.push('Lead vocalist sings these exact lyrics, in their original language, with backing vocals in the choruses:', '', o.letra.trim())
  } else {
    lineas.push(`Lead vocalist sings original lyrics written in ${o.idioma}, with verses, a catchy chorus and backing vocals in the choruses.`)
  }
  return lineas.join('\n').slice(0, 6000)
}

/** Lyria directo con la clave propia de Gemini (BYOK). */
async function porClavePropia(prompt: string): Promise<{ base64: string; mime: string }> {
  const key = getIaKey('gemini')
  if (!key) throw new Error(tGlobal('audio.lyria.sinClave', 'La versión cantada necesita créditos de tu cuenta o una clave de Gemini.'))
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/interactions?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODELO, input: prompt }),
    },
  )
  if (!res.ok) throw new Error(`Lyria ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as {
    steps?: { type?: string; content?: { type?: string; data?: string; mime_type?: string }[] }[]
  }
  const audio = (data.steps ?? [])
    .filter((s) => s.type === 'model_output')
    .flatMap((s) => s.content ?? [])
    .find((b) => b.type === 'audio' && b.data)
  if (!audio?.data) throw new Error(tGlobal('audio.lyria.sinAudio', 'La IA no devolvió audio para esta canción.'))
  useGastoByok.getState().sumar('musica', USD_POR_CANCION)
  return { base64: audio.data, mime: audio.mime_type || 'audio/mpeg' }
}

/**
 * Genera la versión cantada y la deja lista como pista de audio nueva (la toma
 * ya guardada y su buffer en el caché del motor). Quien llama la añade al
 * proyecto.
 */
export async function producirVersionCantada(p: ProyectoAudio, estilo: string, conVoz: boolean): Promise<PistaAudio> {
  return producirConLyria(promptLyria(p, estilo, conVoz), p.nombre, conVoz)
}

/** Lo mismo desde un prompt ya armado; `nombreCancion` nombra la toma guardada. */
export async function producirConLyria(prompt: string, nombreCancion: string, conVoz: boolean): Promise<PistaAudio> {
  const r = usarViaCuenta() ? await iaMusicaCuenta(prompt) : await porClavePropia(prompt)
  const bin = atob(r.base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const blob = new Blob([bytes], { type: r.mime })

  const ctx = contextoAudio()
  if (!ctx) throw new Error(tGlobal('audio.lyria.sinAudio', 'La IA no devolvió audio para esta canción.'))
  const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0))
  const nombre = conVoz
    ? tGlobal('audio.lyria.pistaVoz', 'Versión cantada')
    : tGlobal('audio.lyria.pistaInstr', 'Versión producida')
  const creadoEn = new Date().toISOString()
  const grabacionId = await grabacionesAudioRepo.add({
    nombre: `${nombreCancion} · ${nombre}`,
    blob,
    duracionSeg: buffer.duration,
    picos: calcularPicos(buffer, 0),
    creadoEn,
  })
  motor.registrarBufferClip(grabacionId, buffer)
  return {
    pistaId: nuevaPistaId(),
    nombre,
    instrumento: 'voz', // obligatorio en el tipo; en pistas de clips no suena
    volumen: 0.9,
    notas: [],
    tipo: 'audio',
    clips: [
      {
        clipId: nuevoClipId(),
        grabacionId,
        sello: creadoEn,
        inicio: 0,
        duracionSeg: buffer.duration,
        recorteSeg: 0,
        nombre,
      },
    ],
  }
}

/**
 * El proyecto con la versión producida añadida: las pistas MIDI quedan
 * SILENCIADAS (Lyria ya trae su propia instrumentación y no cuadraría nota a
 * nota) y los compases se alargan si el MP3 dura más. Se desmutean a mano.
 */
export function conVersionProducida(p: ProyectoAudio, pista: PistaAudio): ProyectoAudio {
  const dur = pista.clips?.[0]?.duracionSeg ?? 0
  const compasesAudio = Math.ceil(dur / segPorPaso(p.bpm) / PASOS_POR_COMPAS)
  return {
    ...p,
    compases: Math.max(p.compases, Math.min(MAX_COMPASES, compasesAudio)),
    pistas: [...p.pistas.map((x) => (x.tipo === 'audio' ? x : { ...x, silenciada: true })), pista],
  }
}
