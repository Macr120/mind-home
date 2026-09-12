/**
 * Cuántas blancas enseña el teclado en pantalla (2, 3 o 1 octavas más la tónica
 * siguiente): lo cicla el botón sobre la flecha › y lo comparten
 * `TecladoPantalla` y la `Cascada`, que replica su geometría. Se recuerda.
 */

export const BLANCAS_OPCIONES = [15, 22, 8] as const
const LS = 'mh.audio.tecladoBlancas'

function leer(): number {
  try {
    const v = Number(localStorage.getItem(LS))
    return (BLANCAS_OPCIONES as readonly number[]).includes(v) ? v : BLANCAS_OPCIONES[0]
  } catch {
    return BLANCAS_OPCIONES[0]
  }
}

let blancas = leer()
const oyentes = new Set<() => void>()

export const tecladoVistaStore = {
  subscribe(cb: () => void): () => void {
    oyentes.add(cb)
    return () => oyentes.delete(cb)
  },
  getSnapshot: (): number => blancas,
}

/** Siguiente cantidad de blancas del ciclo (15 → 22 → 8 → 15). */
export const siguientesBlancas = (n: number) =>
  BLANCAS_OPCIONES[((BLANCAS_OPCIONES as readonly number[]).indexOf(n) + 1) % BLANCAS_OPCIONES.length]

export function ciclarBlancas(): void {
  blancas = siguientesBlancas(blancas)
  try {
    localStorage.setItem(LS, String(blancas))
  } catch {
    // sin almacenamiento: dura la sesión
  }
  for (const cb of oyentes) cb()
}

/** Octava más alta que cabe con esas blancas: la última tecla es C8 (108). */
export const octavaMaxima = (n: number) => 108 - ((n - 1) / 7) * 12
