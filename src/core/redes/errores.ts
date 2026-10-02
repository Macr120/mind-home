/**
 * Errores de «publicar en redes» en el idioma de la app. Aparte de `tipos.ts` a
 * propósito: `tipos` lo importa la web /cuenta (por `sesionStore` → `retorno`) y
 * `useT` le metería el estado de la app entero. La app se lo pasa al almacén de
 * redes al arrancar (`arrancarRedes` en main.tsx).
 */
import { idiomaActual, tGlobal } from '../i18n/useT'
import { ErrorRedes, type CodigoErrorRedes } from './tipos'

/** Texto genérico por código, para los idiomas que no son el del servidor. */
const TEXTO_ERROR: Record<CodigoErrorRedes, string> = {
  'sin-sesion': 'Inicia sesión para publicar.',
  limite: 'Ya publicaste varias veces hoy en esa red; inténtalo mañana.',
  'peticion-invalida': 'Revisa los datos de la publicación e inténtalo de nuevo.',
  proveedor: 'La red social no respondió. Inténtalo de nuevo en unos minutos.',
  configuracion: 'Esa red no está disponible por ahora.',
  plataforma: 'Red desconocida.',
  'sin-cuenta': 'Conecta la cuenta antes de publicar.',
  caducada: 'El acceso caducó: vuelve a conectar la cuenta.',
  permisos: 'Faltan permisos: vuelve a conectar la cuenta y acéptalos todos.',
  formato: 'Esa red no admite este video (formato o duración).',
  'demasiado-grande': 'El video pesa más de lo que admite esa red.',
  'cuota-youtube': 'Hoy ya no quedan subidas a YouTube en la app; inténtalo mañana o descarga el video.',
  orden: 'La subida se desordenó: vuelve a publicar.',
  'sesion-caducada': 'La subida caducó: vuelve a publicar.',
  'sin-unlock': 'Desbloquea la casa para usar las redes.',
  cancelado: 'Cancelado.',
}

/**
 * El error para mostrarlo. En español se queda el texto concreto (el del servidor
 * o el de la app); en los demás idiomas, el de su código, que sí está traducido.
 */
export function mensajeErrorRedes(e: unknown): string {
  const es = idiomaActual() === 'es'
  if (e instanceof ErrorRedes) return es ? e.message : tGlobal(`redes.err.${e.codigo}`, TEXTO_ERROR[e.codigo] ?? e.message)
  if (es && e instanceof Error && e.message) return e.message
  return tGlobal('redes.err.generico', 'No se pudo completar la publicación. Inténtalo de nuevo.')
}
