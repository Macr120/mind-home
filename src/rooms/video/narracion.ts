import { langVoz } from '../../core/audio/voz'
import { sintetizarArchivo } from '../../core/audio/vozArchivo'
import { generarVozIA } from '../../core/audio/vozIA'
import { quitarEmojis } from '../../core/chat/texto'
import { mediosVideoRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import { analizarVoz } from './envolvente'
import { duracionAudio } from './importar'
import { esVozDispositivo, nombreVozDispositivo, usaDispositivo } from './voces'

/** Lo que un clip de voz o de avatar necesita saber de su audio. */
export interface AudioNarracion {
  medioId: number
  duracion: number
  envolvente?: number[]
  hz?: number
}

/**
 * TTS con la voz dada → medio local con duración medida (y envolvente para la
 * boca del avatar). Voz IA por el proveedor; voz del dispositivo por el shell
 * o el plugin nativo (`sintetizarArchivo`), que lanza donde no hay tal cosa.
 */
export async function generarAudioNarracion(
  texto: string,
  voz: string | undefined,
  opts: { envolvente?: boolean } = {},
): Promise<AudioNarracion> {
  const frase = texto.trim().slice(0, 1000)
  const blob = usaDispositivo(voz)
    ? await sintetizarArchivo(quitarEmojis(frase).trim(), voz && esVozDispositivo(voz) ? nombreVozDispositivo(voz) : undefined, langVoz())
    : await generarVozIA(frase, voz)
  return registrarAudio(blob, `${tGlobal('video.escena.narracion', 'Narración')}: ${frase.slice(0, 40)}`, 'tts', opts)
}

/** Guarda un audio como medio y mide lo que hace falta. */
export async function registrarAudio(
  blob: Blob,
  nombre: string,
  origen: 'tts' | 'importado',
  opts: { envolvente?: boolean } = {},
): Promise<AudioNarracion> {
  const duracion = await duracionAudio(blob)
  const medioId = await mediosVideoRepo.add({
    tipo: 'audio',
    nombre,
    blob,
    duracion: duracion || undefined,
    origen,
    creadoEn: new Date().toISOString(),
  })
  const analisis = opts.envolvente ? await analizarVoz(blob).catch(() => undefined) : undefined
  return { medioId, duracion: analisis?.duracion ?? duracion, envolvente: analisis?.envolvente, hz: analisis?.hz }
}

/** Envolvente de un audio ya existente (importado elegido para un avatar); vacío si no se pudo decodificar. */
export async function envolventeDe(blob: Blob): Promise<{ envolvente?: number[]; hz?: number; duracion?: number }> {
  try {
    return await analizarVoz(blob)
  } catch {
    return {}
  }
}
