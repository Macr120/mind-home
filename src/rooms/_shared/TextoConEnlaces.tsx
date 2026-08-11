import { Fragment, useMemo } from 'react'
import { vivo } from '../../core/ui/estilos'

/**
 * Un texto de chat con ENLACES A TU ÍNDICE: cada término que ya existe en él
 * —un nodo de la semilla de la enciclopedia, un tema del temario de idiomas— se
 * vuelve un enlace que lo abre.
 *
 * Sin IA y sin coste: la charla no «marca» nada, se compara con el índice al
 * pintar. Por eso el mismo mensaje enseña enlaces nuevos conforme el índice
 * crece.
 *
 * `terminos` tiene que ser una referencia ESTABLE (memorizada por quien lo usa):
 * de ella cuelga la caché de la expresión regular, que si no se rearmaría con
 * cada repintado del chat.
 */

export interface TerminoEnlazable {
  id: string
  titulo: string
}

/** Títulos demasiado cortos («ser», «yo») enlazarían medio texto. */
const MIN_TITULO = 4
/** Tope de enlaces por mensaje: más que esto se lee como un campo de minas. */
const MAX_ENLACES = 6

const ESCAPE = /[.*+?^${}()|[\]\\]/g
const LETRA = /\p{L}/u

interface Buscador {
  re: RegExp
  /** Título en minúsculas → id. */
  porTitulo: Map<string, string>
}

const CACHE = new WeakMap<TerminoEnlazable[], Buscador | null>()

function buscador(terminos: TerminoEnlazable[]): Buscador | null {
  const guardado = CACHE.get(terminos)
  if (guardado !== undefined) return guardado
  const porTitulo = new Map<string, string>()
  for (const x of terminos) {
    const clave = x.titulo.trim().toLowerCase()
    if (clave.length < MIN_TITULO || porTitulo.has(clave)) continue
    porTitulo.set(clave, x.id)
  }
  // Del más largo al más corto: en la alternancia gana la primera que casa, y
  // así «Historia antigua» no se parte en «Historia».
  const titulos = [...porTitulo.keys()].sort((a, b) => b.length - a.length)
  const armado: Buscador | null = titulos.length
    ? { re: new RegExp(titulos.map((x) => x.replace(ESCAPE, '\\$&')).join('|'), 'gi'), porTitulo }
    : null
  CACHE.set(terminos, armado)
  return armado
}

/** Trozos del texto: cadenas sueltas y menciones enlazables, en orden. */
function partir(texto: string, terminos: TerminoEnlazable[]): (string | { id: string; texto: string })[] {
  const b = buscador(terminos)
  if (!b) return [texto]
  const salida: (string | { id: string; texto: string })[] = []
  const vistos = new Set<string>()
  let desde = 0
  for (const m of texto.matchAll(b.re)) {
    const i = m.index ?? 0
    const fin = i + m[0].length
    // Solo palabras completas: «arte» no debe encender dentro de «cuarteto».
    if (LETRA.test(texto[i - 1] ?? '') || LETRA.test(texto[fin] ?? '')) continue
    const id = b.porTitulo.get(m[0].toLowerCase())
    // Una vez por término y por mensaje: la primera mención es la que enlaza.
    if (!id || vistos.has(id)) continue
    vistos.add(id)
    if (i > desde) salida.push(texto.slice(desde, i))
    salida.push({ id, texto: m[0] })
    desde = fin
    if (vistos.size >= MAX_ENLACES) break
  }
  if (desde < texto.length) salida.push(texto.slice(desde))
  return salida
}

export function TextoConEnlaces({
  texto,
  terminos,
  color,
  onIr,
}: {
  texto: string
  terminos: TerminoEnlazable[]
  /** Color de la app para pintar los enlaces. */
  color: string
  onIr: (id: string) => void
}) {
  const trozos = useMemo(() => partir(texto, terminos), [texto, terminos])
  return (
    <p className="whitespace-pre-wrap break-words">
      {trozos.map((x, i) =>
        typeof x === 'string' ? (
          <Fragment key={i}>{x}</Fragment>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onIr(x.id)}
            className="texto-vivo rounded font-medium underline decoration-dotted underline-offset-2 transition hover:bg-white/10"
            style={vivo(color)}
          >
            {x.texto}
          </button>
        ),
      )}
    </p>
  )
}
