import type { TarjetaIdioma } from '../../core/data/db'

/**
 * Generadores puros de ejercicios a partir de las tarjetas propias (sin IA):
 * opción múltiple (término → traducción), inverso (traducción → término) y
 * completar la frase (el ejemplo con el término tapado). Los distractores
 * salen de las demás tarjetas del idioma.
 */

export type ModoEjercicio = 'opcion' | 'inverso' | 'cloze'

export interface Ejercicio {
  tarjeta: TarjetaIdioma
  modo: ModoEjercicio
  enunciado: string
  opciones: string[]
  correcta: number
}

export function barajar<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const normalizar = (s: string) => s.trim().toLowerCase()

/** Tarjetas cuyo ejemplo contiene el término (sirven para completar la frase). */
export function tarjetasConCloze(tarjetas: TarjetaIdioma[]): TarjetaIdioma[] {
  return tarjetas.filter((t) => t.ejemplo && normalizar(t.ejemplo).includes(normalizar(t.termino)))
}

/** El ejemplo con el término tapado por ____ (búsqueda sin mayúsculas). */
function taparTermino(ejemplo: string, termino: string): string {
  const i = normalizar(ejemplo).indexOf(normalizar(termino))
  if (i < 0) return ejemplo
  return `${ejemplo.slice(0, i)}____${ejemplo.slice(i + termino.length)}`
}

/**
 * Genera hasta n ejercicios del modo dado. Requiere ≥4 tarjetas en el idioma
 * (3 distractores + la respuesta); las preguntas sin distractores suficientes
 * se descartan. Devuelve [] si no alcanza.
 *
 * `foco` acota lo que se PREGUNTA (las tarjetas de un tema del temario o las
 * vencidas hoy) sin tocar de dónde salen los distractores: si no, un tema con
 * cinco tarjetas se repetiría como opción en todas sus preguntas.
 */
export function generarEjercicios(
  tarjetas: TarjetaIdioma[],
  modo: ModoEjercicio,
  n: number,
  foco: TarjetaIdioma[] = tarjetas,
): Ejercicio[] {
  if (tarjetas.length < 4) return []
  const base = modo === 'cloze' ? tarjetasConCloze(foco) : foco
  return barajar(base)
    .slice(0, n)
    .map((t) => {
      const respuesta = modo === 'opcion' ? t.traduccion : t.termino
      const pool = [
        ...new Set(tarjetas.filter((x) => x.id !== t.id).map((x) => (modo === 'opcion' ? x.traduccion : x.termino))),
      ].filter((x) => normalizar(x) !== normalizar(respuesta))
      const opciones = barajar([respuesta, ...barajar(pool).slice(0, 3)])
      return {
        tarjeta: t,
        modo,
        enunciado:
          modo === 'opcion' ? t.termino : modo === 'inverso' ? t.traduccion : taparTermino(t.ejemplo ?? '', t.termino),
        opciones,
        correcta: opciones.indexOf(respuesta),
      }
    })
    .filter((e) => e.opciones.length === 4)
}
