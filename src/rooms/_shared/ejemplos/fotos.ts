import { IMAGENES_EJEMPLO } from './imagenes'

/**
 * La foto de fábrica de un ejemplo, ya como `Blob`.
 *
 * Las apps guardan sus fotos como Blob en la base (anécdotas, portadas de
 * viaje, proyectos de hobbies), así que el ejemplo baja la suya de `public/` y
 * la guarda igual que una foto subida a mano: a partir de ahí es un dato normal
 * del usuario, con su miniatura y su borrado.
 *
 * Devuelve `undefined` si esa clave no tiene foto o si falla la descarga: un
 * ejemplo sin foto se ve raro, pero uno que no se puede cargar no se ve nada.
 */
export async function fotoEjemplo(clave: string): Promise<Blob | undefined> {
  const ruta = IMAGENES_EJEMPLO[clave]
  if (!ruta) return undefined
  try {
    const r = await fetch(ruta)
    return r.ok ? await r.blob() : undefined
  } catch {
    return undefined
  }
}
