import { registerPlugin } from '@capacitor/core'
import { esAppNativa, nombrePlataforma } from '../plataforma'
import { obtenerSupabase } from './supabase'

/**
 * El recibo de la tienda: la prueba de que esta instalación se compró.
 *
 * La app se publica como app de PAGO, así que lo que se demuestra no es una
 * compra in-app sino la LICENCIA de la instalación. En Android la da la Play
 * Integrity API (plugin local `ReciboTienda`); en iOS será el recibo de
 * aplicación cuando exista el proyecto. Aquí solo se recoge el token: quien
 * decide es el servidor (`alta-tienda`), que exige el veredicto `LICENSED`.
 *
 * El **nonce** es `sha256(access_token)` de la sesión, y la llamada al alta
 * viaja con ese mismo access_token: así el veredicto queda atado a esta sesión
 * y no vale en otra cuenta ni pasado un rato.
 */

interface ReciboTiendaPlugin {
  pedirToken(opciones: { nonce: string }): Promise<{ token: string }>
}

const ReciboTienda = registerPlugin<ReciboTiendaPlugin>('ReciboTienda')

async function nonceDeSesion(): Promise<string | null> {
  const sb = await obtenerSupabase()
  const jwt = (await sb?.auth.getSession())?.data.session?.access_token
  if (!jwt) return null
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jwt))
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Token de la tienda para el alta, o null si esta plataforma no puede darlo
 * (navegador, iOS todavía, sin Play Services o sin red). Sin token el alta se
 * queda sin hacer y se reintenta en el próximo arranque.
 */
export async function tokenTienda(): Promise<string | null> {
  if (!esAppNativa() || nombrePlataforma() !== 'android') return null
  const nonce = await nonceDeSesion()
  if (!nonce) return null
  try {
    const { token } = await ReciboTienda.pedirToken({ nonce })
    return token || null
  } catch {
    return null
  }
}
