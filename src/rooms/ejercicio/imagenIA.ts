import { useEffect, useMemo, useState } from 'react'
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

/** URL temporal del Blob guardado (en efecto: con StrictMode un useMemo la revocaría antes de pintar). */
export function useUrlImagen(registro?: ImagenEjercicio): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!registro) return
    const u = URL.createObjectURL(registro.imagen)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la URL debe nacer en el efecto para sobrevivir el remount de StrictMode
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [registro])
  return registro ? url : null
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

/**
 * Prompt de ilustración a partir del nombre y la técnica del ejercicio. Es el
 * mismo que usa `scripts/generar-imagenes-ejercicios.mjs` para las imágenes de
 * fábrica: si cambia aquí, cámbialo allá para que el catálogo no se vea mezclado.
 */
function promptEjercicio(nombre: string, descripcion?: string): string {
  return [
    `Ilustración vectorial plana y minimalista de una persona demostrando el ejercicio «${nombre}».`,
    descripcion ? `Técnica: ${descripcion}` : '',
    'Una sola figura de cuerpo completo, centrada y con la postura anatómicamente correcta,',
    'trazo limpio y amigable, colores planos y suaves,',
    'fondo blanco liso sin formas ni círculos decorativos, sin sombras duras.',
    'IMPORTANTE: es una ilustración suelta, no una lámina didáctica:',
    'la imagen no debe contener ninguna letra, palabra, título, rótulo, número ni marca de agua.',
  ]
    .filter(Boolean)
    .join(' ')
}

/** Genera una ilustración del ejercicio con el proveedor elegido; devuelve un Blob comprimido. */
export async function generarImagenEjercicio(nombre: string, descripcion?: string): Promise<Blob> {
  return generarImagen(promptEjercicio(nombre, descripcion))
}
