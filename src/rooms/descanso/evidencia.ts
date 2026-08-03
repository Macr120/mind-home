import { analizarImagenIA, extraerJSON, type ImagenAdjunta } from '../../core/chat/ia'
import { blobABase64, comprimirImagen } from '../../core/imagenIA'
import { localeActual } from '../../core/i18n/useT'

/**
 * Juez de la evidencia del despertador: la alarma solo se apaga si una foto
 * demuestra que el usuario hizo la tarea que él mismo se puso (tender la cama,
 * llenar el vaso de agua…). Una sola llamada de visión, sin herramientas.
 */

export interface Veredicto {
  cumple: boolean
  motivo: string
}

const SYSTEM = [
  'Eres el guardián de un despertador: el usuario solo puede apagarlo si demuestra con una foto que ya hizo la tarea que él mismo se puso.',
  'Mira la foto y decide si prueba que la tarea está HECHA. Sé exigente pero justo: si se ve cumplida aunque la foto sea mediocre (oscura, torcida, con cosas alrededor), apruébala; si muestra otra cosa, la tarea a medias o una pantalla con una imagen de internet, recházala.',
  'Responde SOLO con este JSON, sin markdown ni texto alrededor: {"cumple": true|false, "motivo": "una frase corta"}',
  'El motivo lo lee alguien recién despertado: una frase con qué viste y, si rechazas, qué le falta.',
].join('\n')

/** Deja la foto lista para el modelo: reducida, que la visión no necesita más. */
export async function fotoAAdjunta(archivo: File): Promise<ImagenAdjunta> {
  const blob = await comprimirImagen(archivo, 768)
  return { base64: await blobABase64(blob), mediaType: blob.type || 'image/jpeg' }
}

export async function verificarEvidencia(tarea: string, imagen: ImagenAdjunta): Promise<Veredicto> {
  const idioma = localeActual().startsWith('es') ? 'español' : 'inglés'
  const respuesta = await analizarImagenIA(
    SYSTEM,
    `Tarea que debe demostrar la foto: «${tarea}».\nEscribe el motivo en ${idioma}.`,
    imagen,
  )
  const json = extraerJSON(respuesta)
  return {
    cumple: json.cumple === true,
    motivo: typeof json.motivo === 'string' ? json.motivo.trim() : '',
  }
}
