/**
 * Servicios de «Cómo llegar»: todo con HERE (rutas, transporte público,
 * buscador de lugares y teselas del mapa) bajo una clave comercial.
 * La clave vive en `.env.local` como `VITE_HERE_KEY` y se pega con
 * `npm run here:clave` (ver `docs/HERE.md`). Sin clave, la pestaña muestra un
 * aviso y no llama a ningún servicio.
 */
const env = import.meta.env as Record<string, string | undefined>

/**
 * Una sola variable, pero NO una sola clave: HERE exige un App ID por
 * aplicación y cuenta como distintas la web, Android, iOS y el escritorio, así
 * que cada canal se compila con la suya (`npm run build:android` la saca de
 * `.env.android.local` vía `scripts/build-canal.mjs`; la web, de `.env.local`).
 * Al elegirla el build y no el runtime, cada artefacto lleva ÚNICAMENTE su
 * clave: la filtración de un APK no compromete los demás canales. Ver
 * `docs/HERE.md`.
 */
export const HERE_KEY = env.VITE_HERE_KEY ?? ''

export const claveConfigurada = () => HERE_KEY.length > 0

/** Teselas raster v3 de HERE, por base de la interfaz (clara/oscura) e idioma de las etiquetas. */
export function teselas(base: 'claro' | 'oscuro', idioma: string): string {
  const estilo = base === 'claro' ? 'explore.day' : 'explore.night'
  return `https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png8?size=256&style=${estilo}&lang=${idioma}&apiKey=${HERE_KEY}`
}

export const ATRIBUCION = '&copy; HERE Technologies'

/**
 * Días que puede vivir una respuesta de HERE guardada en el dispositivo.
 * El plan Base prohíbe cachearlas fuera de su plataforma por más tiempo
 * (HERE Platform Terms, cláusula 8 j), así que los trayectos guardados sueltan
 * su itinerario al cumplir el plazo y se recalculan al abrirlos.
 */
export const DIAS_CACHE = 30

export const cacheVencida = (iso: string) => Date.now() - new Date(iso).getTime() > DIAS_CACHE * 86_400_000

