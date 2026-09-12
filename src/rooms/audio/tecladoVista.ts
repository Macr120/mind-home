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

// ─── Color de las teclas: claro, oscuro o personalizado (se elige bajo el octavador) ─
export type ModoTeclas = 'claro' | 'oscuro' | 'personalizado'
export interface ColoresTeclas {
  modo: ModoTeclas
  /** Colores del modo personalizado (los otros dos son fijos). */
  blancas: string
  negras: string
}
const PALETA: Record<Exclude<ModoTeclas, 'personalizado'>, { blancas: string; negras: string }> = {
  claro: { blancas: '#ffffff', negras: '#18181b' },
  oscuro: { blancas: '#3f3f46', negras: '#09090b' },
}
const LS_COLORES = 'mh.audio.tecladoColores'
const esHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)

function leerColores(): ColoresTeclas {
  const base: ColoresTeclas = { modo: 'claro', ...PALETA.claro }
  try {
    const v = JSON.parse(localStorage.getItem(LS_COLORES) ?? 'null') as Partial<ColoresTeclas> | null
    if (!v) return base
    return {
      modo: v.modo === 'oscuro' || v.modo === 'personalizado' ? v.modo : 'claro',
      blancas: esHex(v.blancas) ? v.blancas : base.blancas,
      negras: esHex(v.negras) ? v.negras : base.negras,
    }
  } catch {
    return base
  }
}

let colores = leerColores()
const oyentesColores = new Set<() => void>()

export const coloresTeclasStore = {
  subscribe(cb: () => void): () => void {
    oyentesColores.add(cb)
    return () => oyentesColores.delete(cb)
  },
  getSnapshot: (): ColoresTeclas => colores,
}

export function fijarColoresTeclas(patch: Partial<ColoresTeclas>): void {
  colores = { ...colores, ...patch }
  try {
    localStorage.setItem(LS_COLORES, JSON.stringify(colores))
  } catch {
    // sin almacenamiento: dura la sesión
  }
  for (const cb of oyentesColores) cb()
}

/** Colores efectivos de las teclas según el modo. */
export const paletaTeclas = (c: ColoresTeclas): { blancas: string; negras: string } =>
  c.modo === 'personalizado' ? { blancas: c.blancas, negras: c.negras } : PALETA[c.modo]
