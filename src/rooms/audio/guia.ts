/**
 * Guía del modo práctica (pestaña Aprender): qué teclas se esperan y cómo salió
 * cada intento. Espejo de `sonando.ts` (useSyncExternalStore, vive fuera de
 * React); en el DAW el mapa está vacío y el teclado no cambia en nada.
 */

export type EstadoGuia = 'esperada' | 'acierto' | 'fallo'

const estados = new Map<number, EstadoGuia>()
// El set VIGENTE de esperadas: al expirar un destello, la tecla vuelve a
// 'esperada' si sigue aquí (p. ej. dos acordes seguidos con el mismo tono).
const esperadasVigentes = new Set<number>()
const timeouts = new Set<number>()
const oyentes = new Set<() => void>()
let actual: ReadonlyMap<number, EstadoGuia> = new Map()

function emitir() {
  actual = new Map(estados)
  for (const fn of oyentes) fn()
}

export const guiaStore = {
  subscribe(fn: () => void): () => void {
    oyentes.add(fn)
    return () => oyentes.delete(fn)
  },
  getSnapshot: (): ReadonlyMap<number, EstadoGuia> => actual,
}

/** Acierto/fallo fugaz: pinta y se apaga solo (o vuelve a 'esperada' si sigue vigente). */
export function marcarGuiaTemporal(tono: number, estado: EstadoGuia, durMs: number): void {
  estados.set(tono, estado)
  emitir()
  const timer = window.setTimeout(() => {
    timeouts.delete(timer)
    if (estados.get(tono) !== estado) return
    if (esperadasVigentes.has(tono)) estados.set(tono, 'esperada')
    else estados.delete(tono)
    emitir()
  }, durMs)
  timeouts.add(timer)
}

/** Sincroniza el conjunto de teclas esperadas SIN pisar los destellos de acierto/fallo. */
export function fijarEsperadas(tonos: ReadonlySet<number>): void {
  esperadasVigentes.clear()
  for (const tono of tonos) esperadasVigentes.add(tono)
  let cambio = false
  for (const [tono, estado] of estados) {
    if (estado === 'esperada' && !tonos.has(tono)) {
      estados.delete(tono)
      cambio = true
    }
  }
  for (const tono of tonos) {
    if (!estados.has(tono)) {
      estados.set(tono, 'esperada')
      cambio = true
    }
  }
  if (cambio) emitir()
}

export function limpiarGuia(): void {
  for (const timer of timeouts) window.clearTimeout(timer)
  timeouts.clear()
  estados.clear()
  esperadasVigentes.clear()
  emitir()
}
