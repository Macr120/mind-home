import { useMemo } from 'react'
import type { ImagenEjercicio } from '../../core/data/db'
import { imagenesEjercicioRepo } from '../../core/data/repository'
import { generarImagen } from '../../core/imagenIA'
import { normalizarEjercicio } from './stats'

/**
 * Ilustraciones de ejercicios: lo específico de esta app (el prompt y dónde se
 * guarda). El motor (proveedores, transporte y compresión) vive en
 * `core/imagenIA.ts` y lo comparten las demás apps.
 */

// Reexportados para los componentes de la app (el motor es de core).
export { comprimirImagen, getProveedorImagen, imagenIaActiva } from '../../core/imagenIA'

/** Imágenes guardadas, indexadas por nombre normalizado (para buscar la de cada ejercicio). */
export function useImagenesPorClave(): Map<string, ImagenEjercicio> {
  const imagenes = imagenesEjercicioRepo.useAll() ?? []
  return useMemo(() => {
    const m = new Map<string, ImagenEjercicio>()
    for (const it of imagenes) m.set(it.clave, it)
    return m
  }, [imagenes])
}

/** Guarda (upsert) la imagen de un ejercicio por su nombre normalizado. */
export async function guardarImagenEjercicio(
  nombre: string,
  registro: ImagenEjercicio | undefined,
  blob: Blob,
): Promise<void> {
  if (registro?.id) await imagenesEjercicioRepo.update(registro.id, { imagen: blob })
  else await imagenesEjercicioRepo.add({ clave: normalizarEjercicio(nombre), imagen: blob })
}

/** Prompt de ilustración a partir del nombre y la técnica del ejercicio. */
function promptEjercicio(nombre: string, descripcion?: string): string {
  return [
    `Ilustración plana y minimalista de una persona demostrando el ejercicio "${nombre}".`,
    descripcion ? `Técnica: ${descripcion}` : '',
    'Figura completa clara y con la postura correcta, estilo limpio y amigable, colores suaves,',
    'fondo blanco puro, sin texto, sin números, sin marcas de agua.',
  ]
    .filter(Boolean)
    .join(' ')
}

/** Genera una ilustración del ejercicio con el proveedor elegido; devuelve un Blob comprimido. */
export async function generarImagenEjercicio(nombre: string, descripcion?: string): Promise<Blob> {
  return generarImagen(promptEjercicio(nombre, descripcion))
}
