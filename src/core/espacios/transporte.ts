/**
 * Canal del espacio compartido: `espacio:<id>` por Realtime, o un
 * BroadcastChannel cuando se está probando en modo local (`?espacioLocal=`).
 *
 * Reutiliza el transporte de las partidas (`core/partida/transporte*.ts`)
 * parametrizado por el alfabeto de eventos: la forma del canal es la misma y no
 * tiene sentido tener dos.
 */
import type { Transporte } from '../partida/transporte'
import { transporteLocal } from '../partida/transporteLocal'
import type { EventoEspacio } from './tipos'

const LS_ESPACIO_LOCAL = 'mh.espacioLocal'

// Congelado a la carga, como `partidaLocal`: el modo de una pestaña no cambia a
// media sesión. El parámetro de URL NO se persiste, para que una prueba no deje
// el modo pegado al perfil real.
const codigoLocal = (() => {
  if (typeof window === 'undefined') return null
  const enUrl = new URLSearchParams(window.location.search).get('espacioLocal')
  if (enUrl) return enUrl
  try {
    return localStorage.getItem(LS_ESPACIO_LOCAL)
  } catch {
    return null
  }
})()

/** Código del «servidor» LOCAL de pruebas (dos pestañas sin backend), o null. */
export function espacioLocal(): string | null {
  return codigoLocal
}

/** Nombre del BroadcastChannel que emula el topic `espacio:<id>` en modo local. */
export function canalLocalEspacio(espacioId: string): string {
  return `mph.espacio.${codigoLocal}.${espacioId}`
}

/**
 * `puedePublicar === false` (los lectores) ni siquiera lo intenta: la policy de
 * Realtime lo rechazaría en silencio.
 */
export async function abrirCanalEspacio(
  espacioId: string,
  puedePublicar: boolean,
): Promise<Transporte<EventoEspacio>> {
  if (codigoLocal === null) {
    // Perezoso: fuera de un espacio abierto el chunk de Realtime no entra en el arranque.
    const { transporteRealtimeTopic } = await import('../partida/transporteRealtime')
    return transporteRealtimeTopic<EventoEspacio>(`espacio:${espacioId}`, puedePublicar)
  }
  // Sin red simulada: aquí no se ejercita el interpolador, se prueba la lógica.
  return transporteLocal<EventoEspacio>(canalLocalEspacio(espacioId), puedePublicar, {
    simular: false,
  })
}
