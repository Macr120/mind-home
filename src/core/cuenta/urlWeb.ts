/**
 * URL pública de la web de venta (suscripción y portal de cuenta).
 *
 * Los CTA de conversión («Quiero mi propia casa», «Suscríbete en la web»)
 * desaparecen EN SILENCIO si no hay URL — por eso se resuelve aquí, en un solo
 * punto, con fallback: manda `VITE_URL_WEB` (build de producción), luego la
 * constante de lanzamiento y, en dev, el portal local del segundo build Vite.
 */

// ⚠️ ESCRIBIR EL DOMINIO REAL AL PUBLICAR LA WEB (p. ej. 'https://mindplanner…').
const URL_WEB_LANZAMIENTO = ''

export const URL_WEB: string | undefined =
  (import.meta.env.VITE_URL_WEB as string | undefined) ||
  URL_WEB_LANZAMIENTO ||
  (import.meta.env.DEV ? 'http://localhost:5174' : undefined)

if (!URL_WEB) {
  console.warn(
    '[MPH] Sin VITE_URL_WEB ni URL de lanzamiento: los CTA de suscripción no se mostrarán.',
  )
}

/**
 * Base de los enlaces que abren LA APP (invitación a jugar, espacio compartido).
 * No es la web de venta: manda `VITE_URL_APP` y, sin ella, el origen desde el
 * que se está sirviendo la app (que en `localhost` es justo lo que se quiere).
 * Siempre SIN barra final.
 */
export function urlApp(): string {
  const base =
    (import.meta.env.VITE_URL_APP as string | undefined) ||
    (typeof location === 'undefined' ? '' : location.origin)
  return base.endsWith('/') ? base.slice(0, -1) : base
}
