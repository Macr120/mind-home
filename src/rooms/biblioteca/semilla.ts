import { useMemo } from 'react'
import type { AjusteSemilla, EntradaBiblio, NivelIndice, TemaArbol } from '../../core/data/db'
import { VACIO, ajustesSemillaRepo, borrarRamaIndice, temasArbolRepo } from '../../core/data/repository'
import { PILARES } from './pilares'

/**
 * Campo comodín al que van a parar las entradas que se quedan sin el suyo.
 * Se repite aquí (en vez de importarlo de `constantes.ts`) porque ese módulo
 * importa este para `getPilar`, y el ciclo dejaría el valor sin definir.
 */
const ID_GENERAL = 'general'

/**
 * EL ÍNDICE VIVO de la biblioteca: el catálogo de fábrica (`pilares.ts`) ya
 * parcheado, más los nodos propios (`temasArbol`), en un solo árbol resuelto.
 *
 * El reparto es lo importante:
 *  - `pilares.ts` NUNCA se toca. La demo y los ejemplos cuelgan de ids fijos
 *    ('filosofia', 'fil-libre'…) y tienen que seguir resolviendo siempre.
 *  - `ajustesSemilla` es el PARCHE: una fila por nodo de fábrica renombrado,
 *    oculto, movido o reordenado. Ocultar no borra; «Restaurar» borra la fila.
 *  - `temasArbol` es lo MÍO: se crea, se mueve y se borra de verdad.
 *
 * Un nodo oculto sale de `campos` pero SIGUE en `porId`: si no, una entrada
 * cuyo tema se acaba de ocultar perdería su título.
 */

export interface NodoIndice {
  id: string
  nivel: NivelIndice
  /** Campo al que pertenece; en un campo, su propio id. */
  pilarId: string
  padreId: string | null
  titulo: string
  descripcion: string
  icono?: string
  /** De fábrica (no se borra) frente a propio (sí). */
  fabrica: boolean
  orden: number
  /** Solo los propios: cuándo nació (la insignia «nuevo» del árbol). */
  creadoEn?: string
  hijos: NodoIndice[]
}

export interface Indice {
  campos: NodoIndice[]
  porId: Map<string, NodoIndice>
}

const INDICE_VACIO: Indice = { campos: [], porId: new Map() }

/**
 * Última instantánea construida. La usa `campoDe` para responder SÍNCRONAMENTE
 * a los seis módulos que llaman a `getPilar` en pleno render; refrescarla en
 * `construirIndice` basta porque el `useLiveQuery` de Dexie dispara al instante.
 * El coste conocido: durante un render puede devolver el título de fábrica
 * justo después de renombrar.
 */
let instantanea: Indice = INDICE_VACIO

/**
 * Caché de un slot. `useIndice()` se llama desde cinco componentes a la vez y
 * dexie-react-hooks mantiene estables las referencias de los arrays, así que
 * con esto el árbol se arma UNA vez por cambio de datos y no cinco.
 */
let ultimo: { ajustes: AjusteSemilla[]; propios: TemaArbol[]; indice: Indice } | null = null

function ordenar(nodos: NodoIndice[]): NodoIndice[] {
  return nodos.sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo))
}

/** Arma el índice resuelto. Determinista: mismas entradas, mismo árbol. */
export function construirIndice(ajustes: AjusteSemilla[], propios: TemaArbol[]): Indice {
  if (ultimo && ultimo.ajustes === ajustes && ultimo.propios === propios) return ultimo.indice
  const porId = new Map<string, NodoIndice>()
  const parche = new Map(ajustes.map((a) => [a.nodoId, a]))

  const nuevo = (base: Omit<NodoIndice, 'hijos'>): NodoIndice => {
    const a = base.fabrica ? parche.get(base.id) : undefined
    const nodo: NodoIndice = {
      ...base,
      titulo: a?.titulo ?? base.titulo,
      descripcion: a?.descripcion ?? base.descripcion,
      icono: a?.icono ?? base.icono,
      orden: a?.orden ?? base.orden,
      hijos: [],
    }
    porId.set(nodo.id, nodo)
    return nodo
  }

  // 1) El catálogo de fábrica, tal cual está en el código.
  for (const [iP, p] of PILARES.entries()) {
    nuevo({ id: p.id, nivel: 'campo', pilarId: p.id, padreId: null, titulo: p.titulo, descripcion: p.descripcion, icono: p.icon, fabrica: true, orden: iP })
    for (const [iR, r] of p.ramas.entries()) {
      nuevo({ id: r.id, nivel: 'rama', pilarId: p.id, padreId: p.id, titulo: r.titulo, descripcion: '', fabrica: true, orden: iR })
      for (const [iT, tema] of r.temas.entries()) {
        nuevo({ id: tema.id, nivel: 'tema', pilarId: p.id, padreId: r.id, titulo: tema.titulo, descripcion: tema.descripcion, fabrica: true, orden: iT })
      }
    }
  }

  // 2) Los nodos propios. `nivel` ausente = 'tema': es lo que son todas las
  //    filas que nacieron de una charla, anteriores a la semilla editable.
  for (const [i, n] of propios.entries()) {
    if (porId.has(n.temaId)) continue // colisión rarísima de id: gana la fábrica
    nuevo({
      id: n.temaId,
      nivel: n.nivel ?? 'tema',
      pilarId: n.pilarId,
      padreId: n.padreId,
      titulo: n.titulo,
      descripcion: n.descripcion,
      icono: n.icono,
      fabrica: false,
      orden: n.orden ?? 1000 + i,
      creadoEn: n.creadoEn,
    })
  }

  // 3) Colgar cada nodo de su padre. Un padre irresoluble (o un ciclo que se
  //    haya colado) hace que el nodo se adopte como hijo directo de su campo,
  //    igual que ya hacía el árbol antes de existir este archivo.
  const raices: NodoIndice[] = []
  for (const nodo of porId.values()) {
    if (nodo.nivel === 'campo' || nodo.padreId == null) {
      if (nodo.nivel === 'campo') raices.push(nodo)
      else porId.get(nodo.pilarId)?.hijos.push(nodo)
      continue
    }
    const padre = porId.get(nodo.padreId)
    if (padre && padre.id !== nodo.id) padre.hijos.push(nodo)
    else porId.get(nodo.pilarId)?.hijos.push(nodo)
  }

  // 4) Ordenar los hermanos de cada nivel.
  for (const nodo of porId.values()) ordenar(nodo.hijos)
  let campos = ordenar(raices)

  // 5) Lo borrado desaparece con todo lo que colgaba, también de `porId`: una
  //    entrada que aún apunte ahí (por ejemplo, llegada de otro dispositivo)
  //    cae como hoja suelta de su campo en vez de resucitar la rama.
  const borrados = new Set(ajustes.filter((a) => a.borrado).map((a) => a.nodoId))
  if (borrados.size > 0) {
    const olvidar = (n: NodoIndice) => {
      porId.delete(n.id)
      for (const h of n.hijos) olvidar(h)
    }
    const podar = (lista: NodoIndice[]): NodoIndice[] =>
      lista.filter((n) => {
        if (borrados.has(n.id)) {
          olvidar(n)
          return false
        }
        n.hijos = podar(n.hijos)
        return true
      })
    campos = podar(campos)
  }

  const indice: Indice = { campos, porId }
  instantanea = indice
  ultimo = { ajustes, propios, indice }
  return indice
}

/** El índice vivo, reactivo. */
export function useIndice(): Indice {
  const ajustes = ajustesSemillaRepo.useAll() ?? VACIO
  const propios = temasArbolRepo.useAll() ?? VACIO
  return useMemo(() => construirIndice(ajustes, propios), [ajustes, propios])
}

/** Gemelo asíncrono para quien no es un componente (arbol.ts, sabio.ts). */
export async function cargarIndice(): Promise<Indice> {
  const [ajustes, propios] = await Promise.all([ajustesSemillaRepo.list(), temasArbolRepo.list()])
  return construirIndice(ajustes, propios)
}

// ----- Lecturas -----

export function nodo(ix: Indice, id: string | undefined): NodoIndice | undefined {
  return id ? ix.porId.get(id) : undefined
}

/** Los campos visibles (sustituye a `PILARES` en los selectores). */
export function campos(ix: Indice): NodoIndice[] {
  return ix.campos
}

/** Todos los nodos visibles de un campo, aplanados y con su profundidad. */
export function temasDelCampo(ix: Indice, pilarId: string): { nodo: NodoIndice; prof: number }[] {
  const campo = ix.campos.find((c) => c.id === pilarId)
  if (!campo) return []
  const salida: { nodo: NodoIndice; prof: number }[] = []
  const bajar = (n: NodoIndice, prof: number) => {
    salida.push({ nodo: n, prof })
    for (const h of n.hijos) bajar(h, prof + 1)
  }
  for (const h of campo.hijos) bajar(h, 0)
  return salida
}

/** Todos los nodos visibles del árbol (sustituye a `todosLosTemas()`). */
export function listaNodos(ix: Indice): NodoIndice[] {
  const salida: NodoIndice[] = []
  const bajar = (n: NodoIndice) => {
    salida.push(n)
    for (const h of n.hijos) bajar(h)
  }
  for (const c of ix.campos) bajar(c)
  return salida
}

/** Migas de pan hasta el nodo: campo › rama › tema. */
export function ruta(ix: Indice, id: string): NodoIndice[] {
  const salida: NodoIndice[] = []
  let actual = ix.porId.get(id)
  const vistos = new Set<string>()
  while (actual && !vistos.has(actual.id)) {
    vistos.add(actual.id)
    salida.unshift(actual)
    actual = actual.padreId ? ix.porId.get(actual.padreId) : undefined
  }
  return salida
}

/**
 * Cuántos nodos cuelgan de cada uno, contando TODA su descendencia. Es lo que
 * enseña cada fila del árbol, y se ve aunque no haya ni una entrada: dice
 * cuánto índice tienes debajo, que es otra cosa que cuánto has escrito.
 *
 * Misma pasada post-orden iterativa que `contarEntradas`.
 */
export function contarSubindices(ix: Indice): Map<string, number> {
  const total = new Map<string, number>()
  for (const campo of ix.campos) {
    const pila: { n: NodoIndice; visto: boolean }[] = [{ n: campo, visto: false }]
    while (pila.length) {
      const marco = pila.pop()!
      if (!marco.visto) {
        pila.push({ n: marco.n, visto: true })
        for (const h of marco.n.hijos) pila.push({ n: h, visto: false })
        continue
      }
      let suma = marco.n.hijos.length
      for (const h of marco.n.hijos) suma += total.get(h.id) ?? 0
      total.set(marco.n.id, suma)
    }
  }
  return total
}

/**
 * Entradas por nodo en UNA pasada, O(N + E). `propias` son las colgadas del
 * nodo mismo; `total` incluye su subárbol, que es lo que enseña la insignia.
 *
 * Sustituye al `entradas.filter()` por campo que había en `EnciclopediaTab`
 * (O(campos × entradas)) y de paso permite contar también ramas y temas, que
 * antes no tenían número.
 */
export function contarEntradas(
  ix: Indice,
  entradas: EntradaBiblio[],
): { propias: Map<string, number>; total: Map<string, number> } {
  const propias = new Map<string, number>()
  const sumar = (id: string) => propias.set(id, (propias.get(id) ?? 0) + 1)
  for (const e of entradas) {
    // Sin tema resoluble la entrada cuelga suelta de su campo (es como se pinta).
    if (e.temaId && ix.porId.has(e.temaId)) sumar(e.temaId)
    else sumar(e.pilarId)
  }

  // Post-orden ITERATIVO (pila explícita): el árbol puede ser profundo y la
  // recursión aquí correría en cada render del diagrama.
  const total = new Map<string, number>()
  for (const campo of ix.campos) {
    const pila: { n: NodoIndice; visto: boolean }[] = [{ n: campo, visto: false }]
    while (pila.length) {
      const marco = pila.pop()!
      if (!marco.visto) {
        pila.push({ n: marco.n, visto: true })
        for (const h of marco.n.hijos) pila.push({ n: h, visto: false })
        continue
      }
      let suma = propias.get(marco.n.id) ?? 0
      for (const h of marco.n.hijos) suma += total.get(h.id) ?? 0
      total.set(marco.n.id, suma)
    }
  }
  return { propias, total }
}

/** Cuántos campos, ramas y temas tiene el índice AHORA (fábrica + propios). */
export function contarIndiceVivo(ix: Indice): { campos: number; ramas: number; temas: number } {
  let ramas = 0
  let temas = 0
  for (const n of listaNodos(ix)) {
    if (n.nivel === 'rama') ramas++
    else if (n.nivel === 'tema') temas++
  }
  return { campos: ix.campos.length, ramas, temas }
}

/**
 * Campo por id contra la última instantánea, con caída al catálogo de fábrica.
 * Existe para que `getPilar` siga siendo síncrono (ver el comentario de
 * `instantanea`); si el índice aún no se ha construido, responde como antes.
 */
export function campoDe(id: string): { id: string; titulo: string; icon: string } | undefined {
  const vivo = instantanea.porId.get(id)
  if (vivo?.nivel === 'campo') return { id: vivo.id, titulo: vivo.titulo, icon: vivo.icono ?? '📚' }
  const p = PILARES.find((x) => x.id === id)
  return p ? { id: p.id, titulo: p.titulo, icon: p.icon } : undefined
}

// ----- Escrituras -----

/** Id único para un nodo propio; comparte espacio con los ids de pilares.ts. */
export function nuevoNodoId(): string {
  return `din-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Crea (o actualiza) el parche de un nodo de fábrica. */
async function parchear(nodoId: string, cambios: Partial<Omit<AjusteSemilla, 'id' | 'nodoId'>>) {
  const fila = (await ajustesSemillaRepo.list()).find((a) => a.nodoId === nodoId)
  const actualizadoEn = new Date().toISOString()
  if (fila?.id != null) await ajustesSemillaRepo.update(fila.id, { ...cambios, actualizadoEn })
  else await ajustesSemillaRepo.add({ nodoId, ...cambios, actualizadoEn })
}

/** Actualiza un nodo propio por su id estable. */
async function tocarPropio(id: string, cambios: Partial<TemaArbol>) {
  const fila = (await temasArbolRepo.list()).find((n) => n.temaId === id)
  if (fila?.id != null) await temasArbolRepo.update(fila.id, cambios)
}

export async function renombrarNodo(
  ix: Indice,
  id: string,
  cambios: { titulo?: string; descripcion?: string; icono?: string },
): Promise<void> {
  const n = ix.porId.get(id)
  if (!n) return
  if (n.fabrica) await parchear(id, cambios)
  else await tocarPropio(id, cambios)
}

/** Crea un nodo propio a cualquier altura y devuelve su id. */
export async function crearNodo(datos: {
  nivel: NivelIndice
  /** En un campo nuevo se ignora: el campo es su propio pilarId. */
  pilarId: string
  padreId: string | null
  titulo: string
  descripcion?: string
  icono?: string
  orden?: number
}): Promise<string> {
  const temaId = nuevoNodoId()
  await temasArbolRepo.add({
    temaId,
    pilarId: datos.nivel === 'campo' ? temaId : datos.pilarId,
    padreId: datos.nivel === 'campo' ? null : datos.padreId,
    titulo: datos.titulo,
    descripcion: datos.descripcion ?? '',
    creadoEn: new Date().toISOString(),
    nivel: datos.nivel,
    icono: datos.icono,
    orden: datos.orden,
  })
  return temaId
}

/** Un nodo y toda su descendencia (ids), sobre el árbol ya resuelto. */
function subarbol(n: NodoIndice): NodoIndice[] {
  const salida: NodoIndice[] = []
  const bajar = (x: NodoIndice) => {
    salida.push(x)
    for (const h of x.hijos) bajar(h)
  }
  bajar(n)
  return salida
}

/**
 * Borra una rama del índice con todo lo que cuelga de ella, venga de fábrica o
 * la hayas creado tú. Las entradas NUNCA se borran: pierden el tema y quedan
 * sueltas en su campo, y si el que se va es el campo entero se mudan a General.
 *
 * Lo de fábrica no tiene fila que borrar (está en `pilares.ts`), así que se
 * tacha con un `ajustesSemilla.borrado`; los nodos propios que colgaran de él
 * sí se borran de verdad, porque si no reaparecerían adoptados por su campo.
 */
export async function borrarNodo(ix: Indice, id: string): Promise<void> {
  const n = ix.porId.get(id)
  if (!n) return
  const dentro = subarbol(n)
  await borrarRamaIndice({
    temaIds: dentro.map((x) => x.id),
    propiosIds: dentro.filter((x) => !x.fabrica).map((x) => x.id),
    ...(n.nivel === 'campo' ? { campoBorrado: n.id, campoRefugio: ID_GENERAL } : {}),
  })
  if (n.fabrica) await parchear(id, { borrado: true })
}

/** Fija el orden de un grupo de hermanos (los ▲▼ del modo edición). */
export async function reordenarHermanos(ix: Indice, idsEnOrden: string[]): Promise<void> {
  for (const [orden, id] of idsEnOrden.entries()) {
    const n = ix.porId.get(id)
    if (!n || n.orden === orden) continue
    if (n.fabrica) await parchear(id, { orden })
    else await tocarPropio(id, { orden })
  }
}
