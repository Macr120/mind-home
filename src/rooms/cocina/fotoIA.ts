import { generarImagen } from '../../core/imagenIA'

/**
 * Portada generada con IA para lo que se acaba de crear (receta o dieta).
 *
 * Nunca lanza: la imagen es un extra del «crear con IA», así que si el
 * proveedor falla o no hay cuota, la receta se guarda igual y sin foto.
 */
export async function fotoIA(prompt: string): Promise<Blob | undefined> {
  try {
    return await generarImagen(prompt, 1024, undefined, '16:9')
  } catch (e) {
    console.warn('[MPH] No se pudo generar la portada:', e)
    return undefined
  }
}
