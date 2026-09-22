import { esperarSesion, useSesion } from '../cuenta/sesionStore'
import { urlApp } from '../cuenta/urlWeb'
import { tGlobal } from '../i18n/useT'
import { notificar } from '../notificaciones'
import { mensajeErrorEspacio, entrar } from './api'
import { refrescarEspacios } from './conectar'
import { espacioLocal } from './transporte'
import type { Espacio, TipoEspacio } from './tipos'

/**
 * Los dos enlaces de un espacio (ver / editar) y su aterrizaje: abrir la app
 * que corresponde al tipo con el contenido ya delante.
 *
 * Los cuartos NO se importan desde aquí (`core/` no depende de `rooms/`): cada
 * app registra su aterrizaje al cargarse con `registrarAterrizaje`.
 */

const SS_TOKEN = 'mh.espacio.token'

/**
 * El enlace que se copia y se manda por el buzón. En modo de pruebas local la
 * base es el ORIGEN de esta pestaña, no `VITE_URL_APP`: el «servidor» local
 * vive en este puerto y mandar el enlace a otro abriría otra base de datos.
 */
export function enlaceEspacio(token: string): string {
  const local = espacioLocal()
  const raiz = local && typeof location !== 'undefined' ? location.origin : urlApp()
  const extra = local ? `&espacioLocal=${encodeURIComponent(local)}` : ''
  return `${raiz}/?espacio=${encodeURIComponent(token)}${extra}`
}

// ─── aterrizaje por tipo ─────────────────────────────────────────────────────

type Aterrizaje = (e: Espacio) => void | Promise<void>

const aterrizajes = new Map<TipoEspacio, Aterrizaje>()

/** Lo llama cada app del Studio (y el calendario) al cargarse. */
export function registrarAterrizaje(tipo: TipoEspacio, fn: Aterrizaje): void {
  aterrizajes.set(tipo, fn)
}

/**
 * Lleva al usuario a lo que acaba de abrir. Sin app asignada en la casa no hay
 * cuarto al que entrar: se dice y ya (el contenido sigue en la lista).
 */
export async function aterrizar(e: Espacio): Promise<void> {
  const fn = aterrizajes.get(e.tipo)
  if (!fn) {
    void notificar({
      clave: `espacio:${e.espacioId}`,
      titulo: e.titulo || tGlobal('esp.sinTitulo', 'Sin título'),
      cuerpo: tGlobal('esp.aterrizar.sinApp', 'Coloca la app {n} en tu casa para abrirlo', {
        n: nombreTipo(e.tipo),
      }),
      efimero: true,
    })
    return
  }
  await fn(e)
}

export function nombreTipo(tipo: TipoEspacio): string {
  switch (tipo) {
    case 'calendario':
      return tGlobal('esp.tipo.calendario', 'Calendario')
    case 'documento':
      return tGlobal('esp.tipo.documento', 'Escritura')
    case 'dibujo':
      return tGlobal('esp.tipo.dibujo', 'Arte')
    case 'audio':
      return tGlobal('esp.tipo.audio', 'Audio')
    default:
      return tGlobal('esp.tipo.video', 'Video')
  }
}

// ─── deep link `?espacio=<token>` ────────────────────────────────────────────

/**
 * El enlace abrió la app. El token se guarda en `sessionStorage` porque entre
 * el clic y el aterrizaje puede haber un login entero (que recarga la página).
 */
export async function atenderDeepLinkEspacio(token: string): Promise<void> {
  try {
    sessionStorage.setItem(SS_TOKEN, token)
  } catch {
    // Sin sessionStorage solo se puede intentar aquí y ahora.
  }
  await esperarSesion()
  if (await intentar()) return
  // Aún sin sesión: un solo reintento, cuando el usuario aparezca.
  const quitar = useSesion.subscribe((s, prev) => {
    if (!s.usuario || prev.usuario) return
    quitar()
    void intentar()
  })
}

/** Devuelve false si todavía no se puede (falta sesión). */
async function intentar(): Promise<boolean> {
  let token: string | null
  try {
    token = sessionStorage.getItem(SS_TOKEN)
  } catch {
    token = null
  }
  if (!token) return true
  if (!espacioLocal() && !useSesion.getState().usuario) return false
  try {
    sessionStorage.removeItem(SS_TOKEN)
  } catch {
    // Da igual: el fallo solo repetiría el intento.
  }
  try {
    const r = await entrar(token)
    await refrescarEspacios()
    await aterrizar(r.espacio)
  } catch (e) {
    void notificar({
      clave: 'espacio:enlace',
      titulo: tGlobal('esp.enlace.fallo', 'No se pudo abrir el enlace'),
      cuerpo: mensajeErrorEspacio(e, tGlobal),
      efimero: true,
    })
  }
  return true
}
