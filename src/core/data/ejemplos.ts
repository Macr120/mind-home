import { create } from 'zustand'
import { hayBackend } from '../cuenta/supabase'
import { claveLS, esProbar, tieneAcceso } from '../edicion'
import { db } from './db'

/**
 * Ejemplos de fábrica.
 *
 * Cada fila de ejemplo lleva `ejemploDe: '<sección>'` (p. ej. `'hobbies.hobbies'`)
 * y un uid fijo (`uidEjemplo`). La primera vez que se abre una sección vacía, su
 * ejemplo se pone solo; a partir de ahí son filas normales: se ven siempre, se
 * borran como cualquier otra y, cuando ya no queda ninguna, la sección ofrece
 * restaurarlas (ver `rooms/_shared/ejemplos/`).
 *
 * Lo único que se guarda aparte es qué secciones ya se DECIDIERON en este
 * dispositivo (se puso el ejemplo, o ya había datos): así, borrar el ejemplo es
 * definitivo y nunca vuelve a aparecer solo.
 */

/** Lo mínimo que hay que saber de cualquier fila para reconocer un ejemplo. */
export interface FilaEjemplo {
  /** Sección a la que pertenece la fila de ejemplo; ausente = dato del usuario. */
  ejemploDe?: string
  /** Marca vieja (agenda, despacho, ideas). OJO: solo cuenta `true` —en las
   * tarjetas de idiomas `ejemplo` es la frase de ejemplo, un texto. */
  ejemplo?: boolean | string
}

const LS_DECIDIDAS = claveLS('mh.ejemplosDecididos')

function leer(): string[] {
  try {
    const crudo = localStorage.getItem(LS_DECIDIDAS)
    const filas: unknown = crudo ? JSON.parse(crudo) : []
    return Array.isArray(filas) ? filas.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

interface EjemplosState {
  /** Secciones cuyo arranque ya se resolvió en este dispositivo. */
  decididas: string[]
  decidir(seccion: string): void
}

export const useEjemplos = create<EjemplosState>((set) => ({
  decididas: leer(),
  decidir: (seccion) =>
    set((s) => {
      if (s.decididas.includes(seccion)) return s
      const decididas = [...s.decididas, seccion]
      try {
        localStorage.setItem(LS_DECIDIDAS, JSON.stringify(decididas))
      } catch {
        // Sin almacenamiento la decisión vive lo que dure la sesión.
      }
      return { decididas }
    }),
}))

/** Hook: ¿el arranque de esta sección ya se resolvió? */
export const useSeccionDecidida = (seccion: string): boolean =>
  useEjemplos((s) => s.decididas.includes(seccion))

const PREFIJO_UID = 'seed-ej-'
const SEPARADOR = '__'

/**
 * uid fijo de una fila de ejemplo: el mismo en todos los dispositivos, así que
 * el servidor funde las copias en vez de duplicarlas, y el borrado hecho en uno
 * llega a los demás. Empieza por `seed-` a propósito: el sync lo trata como
 * semilla (ver `filaSeed` en `sync/syncables.ts`).
 */
export const uidEjemplo = (seccion: string, clave: string | number): string =>
  `${PREFIJO_UID}${seccion}${SEPARADOR}${clave}`

/**
 * Un borrado de ejemplo que llega de otro dispositivo decide la sección aquí
 * también: sin esto, abrirla por primera vez en este dispositivo volvería a
 * poner el ejemplo que el usuario ya tiró allá.
 */
export function decidirPorUid(uid: string): void {
  if (!uid.startsWith(PREFIJO_UID)) return
  const fin = uid.indexOf(SEPARADOR, PREFIJO_UID.length)
  if (fin > PREFIJO_UID.length) useEjemplos.getState().decidir(uid.slice(PREFIJO_UID.length, fin))
}

/**
 * ¿Se puede poner un ejemplo sin pisar lo que la nube todavía no bajó? Con sync
 * (Pro o el mes del unlock) hay que esperar al primer sync completo de este
 * dispositivo: antes, una sección vacía puede ser solo una sección sin bajar.
 */
export async function syncListoParaEjemplos(): Promise<boolean> {
  if (esProbar() || !hayBackend() || !tieneAcceso()) return true
  return (await db._syncMeta.get('bootstrap'))?.valor === true
}

// Las marcas van en filas de tablas muy distintas y `ejemploDe` es un campo sin
// índice: se leen con un molde en vez de atar el genérico a cada interfaz.
const marca = (fila: unknown) => fila as FilaEjemplo

/** ¿Es una fila de ejemplo, de cualquier sección? */
export const esEjemplo = (fila: unknown): boolean => !!marca(fila).ejemploDe || marca(fila).ejemplo === true

/**
 * Quita TODA fila de ejemplo. Lo que la app trae puesto no es del usuario: no
 * sube XP, racha ni la Montaña de Sísifo, no avisa y no se le cuenta a la IA.
 */
export const sinEjemplos = <T>(filas: T[]): T[] => filas.filter((f) => !esEjemplo(f))
