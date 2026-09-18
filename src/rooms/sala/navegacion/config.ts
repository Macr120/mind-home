/**
 * Servicios de «Cómo llegar»: todo con HERE (rutas, transporte público,
 * buscador de lugares y teselas del mapa) bajo una sola clave comercial.
 * La clave vive en `.env.local` como `VITE_HERE_KEY` (ver `docs/HERE.md`).
 * Sin clave, la pestaña muestra un aviso y no llama a ningún servicio.
 */
const env = import.meta.env as Record<string, string | undefined>

export const HERE_KEY = env.VITE_HERE_KEY ?? ''

export const claveConfigurada = () => HERE_KEY.length > 0

/** Teselas raster v3 de HERE, por base de la interfaz (clara/oscura) e idioma de las etiquetas. */
export function teselas(base: 'claro' | 'oscuro', idioma: string): string {
  const estilo = base === 'claro' ? 'explore.day' : 'explore.night'
  return `https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png8?size=256&style=${estilo}&lang=${idioma}&apiKey=${HERE_KEY}`
}

export const ATRIBUCION = '&copy; HERE Technologies'
