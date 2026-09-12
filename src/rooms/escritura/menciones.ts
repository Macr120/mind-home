import type { Documento, Historia } from '../../core/data/db'

/**
 * Referencias del libro: los nombres de sus personajes, lugares y actos se
 * marcan en el texto de cualquier hoja y llevan a su ficha.
 *
 * Se pintan con la CSS Custom Highlight API (rangos sobre el DOM vivo), NUNCA
 * envolviendo el HTML: el documento guardado no cambia, el sanitizado no
 * necesita etiquetas nuevas, la pila nativa de deshacer no se rompe y los ids
 * (que difieren entre dispositivos) no viajan dentro del texto. Sin soporte del
 * navegador solo se pierde el color: el globo y ctrl+clic siguen funcionando.
 */

/** Las tres carpetas cuyas fichas se marcan (capítulos y tramas no son referencias). */
export type TipoRef = 'personaje' | 'lugar' | 'acto'
export const TIPOS_REF: TipoRef[] = ['personaje', 'lugar', 'acto']

export function esTipoRef(s?: string): s is TipoRef {
  return s === 'personaje' || s === 'lugar' || s === 'acto'
}

/** Color de fábrica de las menciones de cada carpeta (los tres están en PALETA_TEXTO: se recuperan eligiéndolos). */
export const COLOR_REF_FABRICA: Record<TipoRef, string> = {
  personaje: '#f472b6',
  lugar: '#4ade80',
  acto: '#fb923c',
}

/** Solo hex: el color se inyecta en una hoja de estilos y viaja por el sync. */
const COLOR_OK = /^#[0-9a-f]{3,8}$/i

/** Color de las menciones de una carpeta en un libro. */
export function colorDeCarpeta(tipo: TipoRef, historia?: Historia): string {
  const c = historia?.coloresRef?.[tipo]
  return c && COLOR_OK.test(c) ? c : COLOR_REF_FABRICA[tipo]
}

/** Color de las menciones de una ficha: el suyo, o el de su carpeta. */
export function colorDeFicha(d: Documento, tipo: TipoRef, historia?: Historia): string {
  return d.color && COLOR_OK.test(d.color) ? d.color : colorDeCarpeta(tipo, historia)
}

export interface FichaRef {
  id: number
  titulo: string
  /** Todo lo que se marca en el texto: el título, los nombres de pila y los alias del usuario. */
  nombres: string[]
  tipo: TipoRef
  color: string
  descripcion?: string
  imagen?: Blob
}

/** Partículas que no valen como nombre suelto («de», «la», «von»…). */
const PARTICULAS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'da', 'do', 'dos', 'das', 'di', 'von', 'van', 'der', 'den',
  'of', 'the', 'le', 'les', 'du', 'des', 'al', 'ibn', 'bin', 'san', 'santa', 'don', 'doña',
])

/**
 * Los nombres que marcan a una ficha: el título entero y, en los personajes,
 * cada palabra con mayúscula del título («Idoia Sáenz» también es «Idoia» y
 * «Sáenz»: en una novela se les llama por el nombre de pila), más los alias
 * que escriba el usuario en su ficha («la doctora, Ido»).
 */
export function nombresDe(titulo: string, tipo: TipoRef, alias?: string): string[] {
  const nombres = new Set<string>()
  const limpio = titulo.trim()
  if (limpio) nombres.add(limpio)
  if (tipo === 'personaje') {
    for (const palabra of limpio.split(/[\s·,()]+/)) {
      if (palabra.length >= 3 && /^\p{Lu}/u.test(palabra) && !PARTICULAS.has(palabra.toLowerCase())) nombres.add(palabra)
    }
  }
  for (const a of (alias ?? '').split(/[,;\n]/)) {
    const s = a.trim()
    if (s) nombres.add(s)
  }
  return [...nombres]
}

/** Las fichas de un libro que se marcan en el texto (sin la hoja abierta: no se enlaza a sí misma). */
export function fichasDe(documentos: Documento[], historiaId: number, historia?: Historia, excluirId?: number): FichaRef[] {
  const salida: FichaRef[] = []
  for (const d of documentos) {
    if (d.historiaId !== historiaId || d.id == null || d.id === excluirId || !esTipoRef(d.seccion)) continue
    const titulo = d.titulo.trim()
    if (!titulo) continue
    salida.push({
      id: d.id,
      titulo,
      nombres: nombresDe(titulo, d.seccion, d.alias),
      tipo: d.seccion,
      color: colorDeFicha(d, d.seccion, historia),
      descripcion: d.descripcion,
      imagen: d.imagen,
    })
  }
  return salida
}

const escaparRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Nombre → ficha. Un nombre que reclaman dos fichas (dos «Ana») solo vale si es
 * el título entero de una de ellas; si no, se descarta por ambiguo. El orden es
 * por longitud: la alternativa de la regex prueba en ese orden y así el nombre
 * más largo gana («Ana María» antes que «Ana»).
 */
function porNombre(fichas: FichaRef[]): Map<string, number> {
  const duenos = new Map<string, Set<number>>()
  for (const f of fichas) {
    for (const n of f.nombres) {
      let s = duenos.get(n)
      if (!s) {
        s = new Set()
        duenos.set(n, s)
      }
      s.add(f.id)
    }
  }
  const salida = new Map<string, number>()
  for (const [n, ids] of duenos) {
    if (ids.size === 1) salida.set(n, [...ids][0])
    else {
      const titular = fichas.find((f) => ids.has(f.id) && f.titulo === n)
      if (titular) salida.set(n, titular.id)
    }
  }
  return new Map([...salida].sort((a, b) => b[0].length - a[0].length))
}

/**
 * Las menciones de cada ficha en el texto vivo: rangos sobre los nodos de texto,
 * palabra completa y tal cual está escrita (los nombres son propios). Los
 * rangos no se solapan.
 */
export function buscarMenciones(raiz: Node, fichas: FichaRef[]): Map<number, Range[]> {
  const menciones = new Map<number, Range[]>()
  const nombres = porNombre(fichas)
  if (nombres.size === 0) return menciones
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${[...nombres.keys()].map(escaparRe).join('|')})(?![\\p{L}\\p{N}])`, 'gu')
  const paseo = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
  for (let nodo = paseo.nextNode(); nodo; nodo = paseo.nextNode()) {
    const texto = nodo.textContent ?? ''
    re.lastIndex = 0
    for (let m = re.exec(texto); m; m = re.exec(texto)) {
      const id = nombres.get(m[0])!
      const r = document.createRange()
      r.setStart(nodo, m.index)
      r.setEnd(nodo, m.index + m[0].length)
      let lista = menciones.get(id)
      if (!lista) {
        lista = []
        menciones.set(id, lista)
      }
      lista.push(r)
    }
  }
  return menciones
}

const PREFIJO = 'mph-ref-'

const hayHighlights = () => typeof CSS !== 'undefined' && 'highlights' in CSS

/** Pinta las menciones (una capa por ficha, para que cada una lleve su color). */
export function pintarMenciones(menciones: Map<number, Range[]>): void {
  if (!hayHighlights()) return
  borrarPintado()
  for (const [id, rangos] of menciones) CSS.highlights.set(`${PREFIJO}${id}`, new Highlight(...rangos))
}

/** Quita todas las capas del editor (al cerrar la hoja). */
export function borrarPintado(): void {
  if (!hayHighlights()) return
  const nombres: string[] = []
  CSS.highlights.forEach((_, nombre) => {
    if (nombre.startsWith(PREFIJO)) nombres.push(nombre)
  })
  for (const n of nombres) CSS.highlights.delete(n)
}

/**
 * La hoja de estilos de las capas: el color de cada ficha (solo hex, ver
 * COLOR_OK). En modo claro el color se entinta como hace `.texto-vivo`
 * (index.css): un hex vivo tal cual se lava sobre fondo claro.
 */
export function cssMenciones(fichas: FichaRef[]): string {
  return fichas
    .map(
      (f) =>
        `.mph-doc::highlight(${PREFIJO}${f.id}){color:${f.color};text-decoration:underline;text-decoration-color:color-mix(in srgb, ${f.color} 55%, transparent)}\n` +
        `html[data-base-ui='claro'] .mph-doc::highlight(${PREFIJO}${f.id}){color:color-mix(in srgb, ${f.color} 55%, #1a2233)}`,
    )
    .join('\n')
}

/** La ficha cuya mención contiene el punto (nodo, offset) del caret, o null. */
export function mencionEn(menciones: Map<number, Range[]>, nodo: Node, offset: number): { id: number; rango: Range } | null {
  for (const [id, rangos] of menciones) {
    for (const r of rangos) if (r.isPointInRange(nodo, offset)) return { id, rango: r }
  }
  return null
}

/** El punto de texto bajo unas coordenadas de pantalla (ctrl+clic sobre una mención). */
export function puntoBajo(x: number, y: number): { nodo: Node; offset: number } | null {
  if (typeof document.caretPositionFromPoint === 'function') {
    const p = document.caretPositionFromPoint(x, y)
    return p ? { nodo: p.offsetNode, offset: p.offset } : null
  }
  const r = document.caretRangeFromPoint?.(x, y)
  return r ? { nodo: r.startContainer, offset: r.startOffset } : null
}

/** Proporción y tamaño de la imagen de cada tipo de ficha (retrato vs. escenario). */
export const IMAGEN_FICHA: Record<TipoRef, { aspecto: '1:1' | '16:9'; max: number; marco: string }> = {
  personaje: { aspecto: '1:1', max: 512, marco: 'aspect-square w-full' },
  lugar: { aspecto: '16:9', max: 1024, marco: 'aspect-video w-full' },
  acto: { aspecto: '16:9', max: 1024, marco: 'aspect-video w-full' },
}

/** Prompt de la ilustración de una ficha (estilo de los prompts de fotos de la casa). */
export function promptImagenFicha(tipo: TipoRef, titulo: string, descripcion: string | undefined, libro: string | undefined): string {
  const de = libro ? ` de la historia «${libro}»` : ''
  const detalle = descripcion?.trim() ? ` ${descripcion.trim().replace(/\.?$/, '.')}` : ''
  const cabeza =
    tipo === 'personaje'
      ? `Retrato de «${titulo}», personaje${de}.${detalle} Ilustración de personaje, plano medio, fondo sencillo.`
      : tipo === 'lugar'
        ? `Ilustración del lugar «${titulo}»${de}.${detalle} Escenario amplio, atmósfera cuidada.`
        : `Ilustración de una escena clave del acto «${titulo}»${de}.${detalle} Composición cinematográfica.`
  return `${cabeza} Sin texto, sin letras, sin marcas de agua.`
}
