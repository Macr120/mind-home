/**
 * Grafo de memoria del asistente: qué memorias entran al prompt de cada
 * mensaje y cómo se conectan con las cosas de las apps (personas, recetas,
 * metas…). Antes entraban TODAS las memorias; con cientos, cada mensaje crecía
 * miles de tokens sin caché (docs/COSTOS.md). Aquí se eligen las relevantes.
 *
 * Los enlaces AUTOMÁTICOS no se guardan: se derivan al leer (palabras en común,
 * títulos mencionados). Así las memorias viejas se conectan solas y un enlace
 * nunca apunta a una receta borrada. En `enlacesGrafo` solo viven los que hace
 * el usuario a mano.
 *
 * Módulo PURO y sin imports a propósito: lo compila además `tsconfig.grafo.json`
 * con las opciones más estrictas (`noUncheckedIndexedAccess`,
 * `exactOptionalPropertyTypes`), y cualquier import arrastraría a esa revisión
 * archivos del resto de la app que no la pasan. Los datos llegan por parámetro
 * desde `core/data/repository.ts` y `core/grafoApps.ts`.
 */

/**
 * Tipos de nodo: memorias, apps (los «hubs»), las cosas que aportan las apps y
 * las de las cuatro vistas del chat (asistentes, amigos, lugares, navegador).
 * `categoria` es un hub genérico: categoría de lugares (`lugar-…`), país de
 * los viajes (`pais-…`) o categoría de sitios web (`web-…`).
 */
export type TipoNodo =
  | 'memoria'
  | 'app'
  | 'persona'
  | 'meta'
  | 'receta'
  | 'idea'
  | 'mapa'
  | 'obra'
  | 'lugar'
  | 'hobby'
  | 'proyecto'
  | 'ejercicio'
  | 'asistente'
  | 'amigo'
  | 'espacio'
  | 'ubicacion'
  | 'web'
  | 'categoria'

/** Lo que aporta una app al grafo (todo menos memorias y apps). */
export type TipoEntidad = Exclude<TipoNodo, 'memoria' | 'app'>

/**
 * Referencia estable entre dispositivos: el `uid` de la fila (el sync no lo
 * traduce) o, para las apps, el id de la plantilla.
 */
export type RefNodo = `${TipoNodo}:${string}`

export function refNodo(tipo: TipoNodo, id: string): RefNodo {
  return `${tipo}:${id}`
}

export function refMemoria(uid: string): RefNodo {
  return refNodo('memoria', uid)
}

export function refApp(appId: string): RefNodo {
  return refNodo('app', appId)
}

export function tipoDeRef(ref: RefNodo): TipoNodo {
  return ref.slice(0, ref.indexOf(':')) as TipoNodo
}

export function idDeRef(ref: RefNodo): string {
  return ref.slice(ref.indexOf(':') + 1)
}

export interface MemoriaNodo {
  uid: string
  hecho: string
  roomId?: string | undefined
  asistenteId?: string | undefined
  /** ISO. */
  creado: string
}

/** Las cuatro vistas del chat: cada una abre el grafo acotado a lo suyo. */
export type AmbitoGrafo = 'asistentes' | 'amigos' | 'lugares' | 'navegador'

/**
 * A qué vista pertenece un nodo; `null` = de ninguna en particular (las cosas
 * de las apps y las apps), que entran como vecinas de lo que sí es de la vista.
 */
export function ambitoDe(ref: RefNodo): AmbitoGrafo | null {
  switch (tipoDeRef(ref)) {
    case 'memoria':
    case 'asistente':
      return 'asistentes'
    case 'amigo':
    case 'espacio':
      return 'amigos'
    case 'ubicacion':
    case 'lugar':
      return 'lugares'
    case 'web':
      return 'navegador'
    case 'categoria':
      return idDeRef(ref).startsWith('web-') ? 'navegador' : 'lugares'
    default:
      return null
  }
}

/** Hubs y nombres propios de la app: no se enlazan por aparecer en una memoria. */
const SIN_MENCION = new Set<TipoNodo>(['categoria', 'asistente', 'espacio'])

/** Una fila de una app (o de una vista del chat) vista como nodo. */
export interface NodoEntidad {
  ref: RefNodo
  tipo: TipoEntidad
  titulo: string
  /**
   * App que la lleva (una meta cuelga de la app de su meta, no del cuarto
   * Metas). Sin valor, no se enlaza a ninguna app (un amigo, un sitio web).
   */
  appId?: string | undefined
  /** Vecinos explícitos: el sitio web y su categoría, el asistente y sus apps… */
  enlaces?: readonly RefNodo[] | undefined
  /** Dato corto para la IA (≤ 120 caracteres): «hermana · cumple 12 mar». */
  resumen?: string | undefined
  /** Otras formas de nombrarla: el nombre de pila de «Rosa Vidal» es «Rosa». */
  alias?: readonly string[] | undefined
}

export interface EnlaceNodo {
  desde: RefNodo
  hacia: RefNodo
  /** Lo hizo el usuario («Conectar con…»); los demás se derivan al leer. */
  manual?: boolean | undefined
}

export interface ContextoRecuperacion {
  /** Mensaje del usuario (y lo que convenga del turno). */
  texto: string
  /** Apps que toca el mensaje, si se saben; si no, las del asistente. */
  apps: readonly string[]
  asistenteId: string
  /** Cosas de las apps que el mensaje podría nombrar. */
  entidades: readonly NodoEntidad[]
  /** Cuántas memorias caben como máximo. */
  tope: number
  /** Tope de caracteres sumando los hechos (~4 chars por token). */
  maxChars: number
  /** Época ms de «ahora» (parámetro para que la función sea pura). */
  ahora: number
}

/** Escrituras sin espacios entre palabras: se comparan por pares de caracteres. */
const SIN_ESPACIOS = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u

/** Minúsculas y sin acentos (sirve igual en los 16 idiomas). */
export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

function tokens(texto: string): string[] {
  return normalizar(texto).match(/[\p{L}\p{N}]+/gu) ?? []
}

/**
 * Palabras con las que se comparan mensaje y memoria, en cualquiera de los 16
 * idiomas: minúsculas y sin acentos; las de 4 letras o más (así caen casi todos
 * los artículos y preposiciones sin listas por idioma) y, en chino, japonés,
 * coreano y tailandés, los pares de caracteres seguidos.
 */
export function palabrasClave(texto: string): Set<string> {
  const claves = new Set<string>()
  for (const token of tokens(texto)) {
    if (SIN_ESPACIOS.test(token)) {
      const letras = [...token]
      for (let i = 0; i < letras.length - 1; i++) claves.add(`${letras[i] ?? ''}${letras[i + 1] ?? ''}`)
    } else if (token.length >= 4) {
      claves.add(token)
    }
  }
  return claves
}

function enComun(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  let n = 0
  for (const x of a) if (b.has(x)) n++
  return n
}

/**
 * La memoria vigente que ya dice lo mismo: mismo texto normalizado o casi las
 * mismas palabras clave (Jaccard ≥ 0.8). Evita que el cupo del prompt se llene
 * de repetidas cuando el modelo vuelve a guardar algo que no tenía a la vista.
 */
export function duplicadaDe(hecho: string, memorias: readonly MemoriaNodo[]): MemoriaNodo | undefined {
  const plano = tokens(hecho).join(' ')
  const suyas = palabrasClave(hecho)
  return memorias.find((m) => {
    if (tokens(m.hecho).join(' ') === plano) return true
    const otras = palabrasClave(m.hecho)
    const comunes = enComun(suyas, otras)
    const union = suyas.size + otras.size - comunes
    return union > 0 && comunes >= 2 && comunes / union >= 0.8
  })
}

/** Texto preparado una sola vez para buscarle títulos dentro. */
interface TextoIndexado {
  /** Tokens unidos por un espacio y con espacio a los lados: « ana es alergica ». */
  plano: string
  claves: Set<string>
}

function indexar(texto: string): TextoIndexado {
  return { plano: ` ${tokens(texto).join(' ')} `, claves: palabrasClave(texto) }
}

interface TituloIndexado {
  /** « lasana » (palabras completas) o, en CJK/tailandés, la subcadena. */
  plano: string
  subcadena: boolean
  claves: Set<string>
}

function indexarTitulo(titulo: string): TituloIndexado | null {
  const partes = tokens(titulo)
  const junto = partes.join(' ')
  const subcadena = SIN_ESPACIOS.test(junto)
  if ([...junto].length < (subcadena ? 2 : 3)) return null
  return { plano: subcadena ? junto : ` ${junto} `, subcadena, claves: palabrasClave(titulo) }
}

/**
 * ¿El texto nombra este título? Entero y como palabras completas («Ana» no
 * casa con «banana»); en CJK y tailandés, como subcadena. Un título largo
 * (idea, meta: 3+ palabras clave) también cuenta si comparte 2 con el texto.
 */
function nombra(texto: TextoIndexado, titulo: TituloIndexado): boolean {
  if (texto.plano.includes(titulo.plano)) return true
  return titulo.claves.size >= 3 && enComun(texto.claves, titulo.claves) >= 2
}

/** El título y los alias de una cosa, listos para `nombra`. */
function nombresDe(e: NodoEntidad): TituloIndexado[] {
  return [e.titulo, ...(e.alias ?? [])].map(indexarTitulo).filter((t): t is TituloIndexado => t !== null)
}

function nombraAlguno(texto: TextoIndexado, nombres: readonly TituloIndexado[]): boolean {
  return nombres.some((n) => nombra(texto, n))
}

/** Las cosas de las apps que nombra un texto, de título más largo a más corto. */
export function mencionadas(texto: string, entidades: readonly NodoEntidad[]): NodoEntidad[] {
  const t = indexar(texto)
  return entidades
    .filter((e) => !SIN_MENCION.has(e.tipo) && nombraAlguno(t, nombresDe(e)))
    .sort((a, b) => b.titulo.length - a.titulo.length)
}

/** Tope de cosas enlazadas a una sola memoria (si no, el grafo es una maraña). */
const MAX_ENTIDADES_POR_MEMORIA = 6

/**
 * Todos los enlaces que se derivan de los datos, sin guardar nada:
 * - memoria ↔ memoria con ≥ 2 palabras clave en común;
 * - memoria → cosa de una app cuando la nombra (ver `nombra`);
 * - memoria → app por su `roomId`, y cosa → app por su `appId`;
 * - memoria → el asistente que la guardó, si está entre las cosas;
 * - los vecinos explícitos de cada cosa (`enlaces`).
 *
 * Un título que sale en más del 40 % de las memorias (y en más de 8) no
 * enlaza: es una palabra demasiado común para decir algo. Las personas no
 * cuentan: que alguien salga en muchas memorias es justo lo que importa.
 */
export function enlacesImplicitos(memorias: readonly MemoriaNodo[], entidades: readonly NodoEntidad[]): EnlaceNodo[] {
  const enlaces: EnlaceNodo[] = []
  const textos = memorias.map((m) => indexar(m.hecho))

  const hay = new Set(entidades.map((e) => e.ref))
  for (let i = 0; i < memorias.length; i++) {
    const a = memorias[i]
    const ta = textos[i]
    if (!a || !ta) continue
    const suAsistente = a.asistenteId ? refNodo('asistente', a.asistenteId) : null
    if (suAsistente && hay.has(suAsistente)) enlaces.push({ desde: refMemoria(a.uid), hacia: suAsistente })
    for (let j = i + 1; j < memorias.length; j++) {
      const b = memorias[j]
      const tb = textos[j]
      if (b && tb && enComun(ta.claves, tb.claves) >= 2) {
        enlaces.push({ desde: refMemoria(a.uid), hacia: refMemoria(b.uid) })
      }
    }
    if (a.roomId) enlaces.push({ desde: refMemoria(a.uid), hacia: refApp(a.roomId) })
  }

  // Por cada cosa, las memorias que la nombran.
  const porMemoria = new Map<string, NodoEntidad[]>()
  const limiteComun = Math.max(8, memorias.length * 0.4)
  for (const e of entidades) {
    if (e.appId) enlaces.push({ desde: e.ref, hacia: refApp(e.appId) })
    for (const v of e.enlaces ?? []) if (v !== e.ref) enlaces.push({ desde: e.ref, hacia: v })
    if (SIN_MENCION.has(e.tipo)) continue
    const nombres = nombresDe(e)
    if (!nombres.length) continue
    const la: string[] = []
    for (let i = 0; i < memorias.length; i++) {
      const m = memorias[i]
      const tm = textos[i]
      if (m && tm && nombraAlguno(tm, nombres)) la.push(m.uid)
    }
    // Una persona nombrada en muchas memorias sí dice algo (es alguien cercano).
    if (la.length === 0 || (e.tipo !== 'persona' && la.length > limiteComun)) continue
    for (const uid of la) porMemoria.set(uid, [...(porMemoria.get(uid) ?? []), e])
  }
  for (const [uid, cosas] of porMemoria) {
    cosas
      .sort((a, b) => b.titulo.length - a.titulo.length)
      .slice(0, MAX_ENTIDADES_POR_MEMORIA)
      .forEach((e) => enlaces.push({ desde: refMemoria(uid), hacia: e.ref }))
  }
  return enlaces
}

/** Los nodos a `saltos` de distancia (o menos) de `ref`, él incluido. */
export function vecindario(ref: RefNodo, enlaces: readonly EnlaceNodo[], saltos: number): Set<RefNodo> {
  const dentro = new Set<RefNodo>([ref])
  let borde = new Set<RefNodo>([ref])
  for (let s = 0; s < saltos && borde.size; s++) {
    const siguiente = new Set<RefNodo>()
    for (const e of enlaces) {
      if (borde.has(e.desde) && !dentro.has(e.hacia)) siguiente.add(e.hacia)
      if (borde.has(e.hacia) && !dentro.has(e.desde)) siguiente.add(e.desde)
    }
    for (const r of siguiente) dentro.add(r)
    borde = siguiente
  }
  return dentro
}

/**
 * Las memorias que entran al prompt, de la más a la menos relevante. Con pocas
 * memorias entran todas (nada cambia para quien tiene pocas). Si no, puntúa:
 * palabras en común con el mensaje (lo que más pesa), nombrar algo a lo que la
 * memoria está enlazada, misma app, hechos generales sobre el usuario, mismo
 * asistente y recencia; después, las vecinas en el grafo de las que ya
 * puntuaron suben un poco.
 *
 * `manuales` son los enlaces que hizo el usuario; los automáticos se derivan
 * aquí mismo, solo desde las memorias que ya importan (sin recorrer n²).
 */
export function memoriasRelevantes(
  memorias: readonly MemoriaNodo[],
  manuales: readonly EnlaceNodo[],
  ctx: ContextoRecuperacion,
): MemoriaNodo[] {
  const totalChars = memorias.reduce((s, m) => s + m.hecho.length, 0)
  if (memorias.length <= ctx.tope && totalChars <= ctx.maxChars) return [...memorias]

  const nombradas = mencionadas(ctx.texto, ctx.entidades)
  const apps = new Set([...ctx.apps, ...nombradas.flatMap((e) => (e.appId ? [e.appId] : []))])
  const titulos = nombradas.flatMap(nombresDe)
  const refsNombradas = new Set(nombradas.map((e) => e.ref))
  const conManual = new Set<string>()
  for (const e of manuales) {
    if (refsNombradas.has(e.hacia) && tipoDeRef(e.desde) === 'memoria') conManual.add(idDeRef(e.desde))
    if (refsNombradas.has(e.desde) && tipoDeRef(e.hacia) === 'memoria') conManual.add(idDeRef(e.hacia))
  }

  const delMensaje = palabrasClave(ctx.texto)
  const textos = new Map(memorias.map((m) => [m.uid, indexar(m.hecho)]))
  const puntos = new Map<string, number>()
  for (const m of memorias) {
    const t = textos.get(m.uid)
    const dias = Math.max(0, (ctx.ahora - Date.parse(m.creado)) / 86_400_000)
    let p = t ? 3 * enComun(delMensaje, t.claves) : 0
    if (conManual.has(m.uid) || (t && nombraAlguno(t, titulos))) p += 3
    if (m.roomId && apps.has(m.roomId)) p += 2
    if (!m.roomId) p += 1
    if (m.asistenteId === ctx.asistenteId) p += 1
    p += Number.isFinite(dias) ? Math.exp(-dias / 90) : 0
    puntos.set(m.uid, p)
  }

  // Un salto en el grafo: la vecina de una memoria que ya importa también importa.
  const extra = new Map<string, number>()
  const suben = (uid: string) => extra.set(uid, Math.max(extra.get(uid) ?? 0, 1.5))
  const importantes = memorias.filter((m) => (puntos.get(m.uid) ?? 0) >= 3)
  for (const a of importantes) {
    const ta = textos.get(a.uid)
    for (const b of memorias) {
      const tb = textos.get(b.uid)
      if (b.uid !== a.uid && ta && tb && enComun(ta.claves, tb.claves) >= 2) suben(b.uid)
    }
  }
  const importa = new Set(importantes.map((m) => refMemoria(m.uid)))
  for (const e of manuales) {
    if (importa.has(e.desde) && tipoDeRef(e.hacia) === 'memoria') suben(idDeRef(e.hacia))
    if (importa.has(e.hacia) && tipoDeRef(e.desde) === 'memoria') suben(idDeRef(e.desde))
  }

  const total = (uid: string) => (puntos.get(uid) ?? 0) + (extra.get(uid) ?? 0)
  const ordenadas = [...memorias].sort((x, y) => total(y.uid) - total(x.uid))
  const elegidas: MemoriaNodo[] = []
  let chars = 0
  for (const m of ordenadas) {
    if (elegidas.length >= ctx.tope) break
    if (chars + m.hecho.length > ctx.maxChars) continue
    elegidas.push(m)
    chars += m.hecho.length
  }
  return elegidas
}
