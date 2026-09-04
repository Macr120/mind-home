/**
 * Web MIDI del Studio de audio (no existe en ningún otro sitio del repo).
 *
 * Reglas duras: `conectarMidi()` SOLO desde un gesto del usuario (StrictMode
 * dispararía doble el prompt de permiso si viviera en un efecto de montaje) y
 * `sysex: false` SIEMPRE (evita el permiso fuerte y el RESOURCE_MIDI_SYSEX del
 * WebView). En iOS/WKWebView la API no existe: `haySoporteMidi()` lo dice y la
 * UI cae al teclado en pantalla.
 */

export interface EntradaMidi {
  id: string
  nombre: string
}

export function haySoporteMidi(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function'
}

/**
 * Pide acceso MIDI con timeout de 5 s: en el WebView de Capacitor la petición
 * puede quedarse muda para siempre. null = degradar con aviso.
 */
export async function conectarMidi(): Promise<MIDIAccess | null> {
  if (!haySoporteMidi()) return null
  try {
    return await Promise.race([
      navigator.requestMIDIAccess({ sysex: false }),
      new Promise<null>((res) => window.setTimeout(() => res(null), 5000)),
    ])
  } catch {
    return null
  }
}

export function listarEntradas(access: MIDIAccess): EntradaMidi[] {
  return [...access.inputs.values()].map((e) => ({ id: e.id, nombre: e.name ?? e.id }))
}

export interface OyenteMidi {
  /** `tMs` es `e.timeStamp` (reloj de `performance.now`). */
  onNota(tono: number, vel: number, tMs: number): void
  onFin(tono: number, tMs: number): void
  /** Un statechange (des/conexión de teclado): la lista fresca de entradas. */
  onCambioDispositivos?(entradas: EntradaMidi[]): void
}

/** Suscribe noteon/noteoff de una entrada (o de todas). Devuelve la limpieza. */
export function suscribirNotas(access: MIDIAccess, entradaId: string | 'todas', oyente: OyenteMidi): () => void {
  const manejador = (e: Event) => {
    const msg = e as MIDIMessageEvent
    const datos = msg.data
    if (!datos || datos.length < 3) return
    const tipo = datos[0] & 0xf0
    const tono = datos[1]
    const vel = datos[2]
    // 0x90 con velocidad 0 es un noteoff disfrazado (running status de muchos teclados).
    if (tipo === 0x90 && vel > 0) oyente.onNota(tono, vel, msg.timeStamp)
    else if (tipo === 0x80 || (tipo === 0x90 && vel === 0)) oyente.onFin(tono, msg.timeStamp)
  }
  const enganchar = () => {
    for (const input of access.inputs.values()) {
      if (entradaId === 'todas' || input.id === entradaId) input.addEventListener('midimessage', manejador)
      else input.removeEventListener('midimessage', manejador)
    }
  }
  const alCambiar = () => {
    enganchar()
    oyente.onCambioDispositivos?.(listarEntradas(access))
  }
  enganchar()
  access.addEventListener('statechange', alCambiar)
  return () => {
    access.removeEventListener('statechange', alCambiar)
    for (const input of access.inputs.values()) input.removeEventListener('midimessage', manejador)
  }
}
