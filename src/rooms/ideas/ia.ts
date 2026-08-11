import { conversarIA, extraerJSON } from '../../core/chat/ia'
import type { FormaNodo, TipoMapa } from '../../core/data/db'
import { MAX_HIJOS_MAPA, MAX_NODOS_MAPA, MAX_PROF_MAPA, MAX_TEXTO_NODO } from './constantes'
import type { NodoPropuesto } from './layouts'
import { etiquetasRaiz } from './tiposMapa'

/**
 * Microtareas de IA de la app Ideas.
 *
 * `generarMapa` LANZA con el motivo real (la UI lo muestra tal cual: sin eso,
 * un fallo de clave, de red o de formato eran indistinguibles). `expandirNodo`
 * nunca lanza: mejor no proponer nada que romper el lienzo.
 * Los topes se aplican EN CÓDIGO, no solo en el prompt.
 */

const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')

/** Clave de comparación sin acentos ni mayúsculas (dedupe de propuestas). */
const clave = (s: string) =>
  s
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .toLocaleLowerCase()
    .trim()

/** Qué se le pide al modelo para cada formato de mapa. */
const CONTRATO: Record<TipoMapa, string[]> = {
  mental: [
    'De 4 a 6 ramas principales; cada rama con 2 a 4 sub-ramas; máximo 3 niveles bajo la raíz.',
    '{"raiz":"<tema central, máx. 4 palabras>","hijos":[{"texto":"<rama>","hijos":[{"texto":"<sub-rama>","hijos":[]}]}]}',
  ],
  arbol: [
    'Jerarquía de categorías, de lo general a lo concreto: de 3 a 5 ramas y cada una con 2 a 4 sub-elementos.',
    '{"raiz":"<tema, máx. 4 palabras>","hijos":[{"texto":"<categoría>","hijos":[{"texto":"<sub-elemento>","hijos":[]}]}]}',
  ],
  etimologia: [
    'Árbol etimológico de UNA palabra o concepto. Exactamente 4 ramas, llamadas así en el idioma del usuario: Origen (idioma y raíz de los que viene y su evolución, p. ej. «gr. idéa ‘forma’ → lat. → esp.»), Significados (sus acepciones principales), Usos (expresiones y ejemplos breves) y Familia léxica (palabras derivadas o emparentadas). Cada rama con 2 a 4 hojas.',
    '{"raiz":"<la palabra>","hijos":[{"texto":"Origen","hijos":[{"texto":"<raíz y evolución>","hijos":[]}]},{"texto":"Significados","hijos":[]},{"texto":"Usos","hijos":[]},{"texto":"Familia léxica","hijos":[]}]}',
  ],
  llaves: [
    'El TODO y sus PARTES físicas o estructurales: de 3 a 6 partes, cada una con 2 a 4 sub-partes.',
    '{"raiz":"<el todo, máx. 4 palabras>","hijos":[{"texto":"<parte>","hijos":[{"texto":"<sub-parte>","hijos":[]}]}]}',
  ],
  circulo: [
    'UN SOLO nivel: de 6 a 10 elementos que rodeen y describan el tema (contexto, ejemplos, lo que se sabe de él). Todos llevan "hijos": [].',
    '{"raiz":"<tema central, máx. 4 palabras>","hijos":[{"texto":"<elemento>","hijos":[]}]}',
  ],
  flujo: [
    'De 5 a 9 pasos EN ORDEN. El primero es "inicio" y el último "fin"; usa "decision" en las preguntas de sí/no.',
    '{"raiz":"<nombre del proceso, máx. 4 palabras>","pasos":[{"texto":"<paso, máx. 6 palabras>","forma":"inicio|proceso|decision|fin"}]}',
  ],
  venn: [
    'Elige 2 conjuntos (o 3 si el tema lo pide de verdad) que se solapen. De 3 a 5 elementos por región.',
    'Zonas válidas con 2 conjuntos: "a", "b", "ab". Con 3: "a", "b", "c", "ab", "ac", "bc", "abc".',
    '{"conjuntos":["<conjunto A>","<conjunto B>"],"elementos":[{"texto":"<elemento, máx. 6 palabras>","zona":"ab"}]}',
  ],
  comparacion: [
    'Dos temas del asunto dado, enfrentados. De 3 a 5 puntos por lista.',
    '{"izq":"<tema A>","der":"<tema B>","soloIzq":["<propio de A>"],"comunes":["<de ambos>"],"soloDer":["<propio de B>"]}',
  ],
  proscontras: [
    'Ventajas y desventajas REALES de la decisión dada, honestas por los dos lados: de 4 a 6 puntos en cada lista, concretos y sin repetirse. Cada punto lleva su PESO del 1 (menor) al 5 (decisivo): no los pongas todos iguales.',
    '{"opcion":"<la decisión, máx. 5 palabras>","ventajas":[{"texto":"<punto, máx. 8 palabras>","peso":3}],"desventajas":[{"texto":"<punto, máx. 8 palabras>","peso":4}]}',
  ],
  foda: [
    'FODA del asunto dado, de 3 a 5 puntos por cuadrante. Fortalezas y debilidades son INTERNAS (dependen de quien decide); oportunidades y amenazas son EXTERNAS (del entorno).',
    '{"asunto":"<el asunto, máx. 5 palabras>","fortalezas":[],"debilidades":[],"oportunidades":[],"amenazas":[]}',
  ],
  ishikawa: [
    'Causas del problema dado agrupadas por categorías (método, máquina, material, medio, mano de obra, medición… o las que pida el tema): de 4 a 6 categorías con 2 a 4 causas cada una. Causas, NO soluciones.',
    '{"problema":"<el efecto, máx. 6 palabras>","categorias":[{"texto":"<categoría, máx. 3 palabras>","causas":["<causa, máx. 7 palabras>"]}]}',
  ],
  fuerzas: [
    'Campo de fuerzas del cambio dado: de 3 a 5 fuerzas que lo EMPUJAN y de 3 a 5 que lo FRENAN, cada una con su peso del 1 (floja) al 5 (decisiva).',
    '{"cambio":"<el cambio, máx. 5 palabras>","empujan":[{"texto":"<fuerza, máx. 8 palabras>","peso":4}],"frenan":[{"texto":"<fuerza, máx. 8 palabras>","peso":3}]}',
  ],
  eisenhower: [
    'Reparte lo que hay que hacer en los cuatro cuadrantes: urgente e importante (hacer), importante sin urgencia (agendar), urgente pero poco importante (delegar) y ni lo uno ni lo otro (quitar). De 2 a 5 por cuadrante.',
    '{"asunto":"<el asunto, máx. 5 palabras>","hacer":["<tarea, máx. 7 palabras>"],"agendar":[],"delegar":[],"quitar":[]}',
  ],
  tier: [
    'Clasifica las cosas del tema dado por niveles: S es lo mejor y D lo peor. De 2 a 4 por nivel, y no dejes niveles vacíos si puedes evitarlo.',
    '{"tema":"<el tema, máx. 5 palabras>","s":["<cosa, máx. 5 palabras>"],"a":[],"b":[],"c":[],"d":[]}',
  ],
  piramide: [
    'Cuatro niveles del tema dado, de la CIMA a la BASE, donde cada uno se apoya en el de abajo. Da el nombre de cada nivel y de 1 a 3 elementos suyos.',
    '{"tema":"<el tema, máx. 5 palabras>","niveles":[{"nombre":"<nivel, máx. 3 palabras>","elementos":["<elemento, máx. 6 palabras>"]}]}',
  ],
  linea: [
    'De 5 a 8 hitos EN ORDEN cronológico, cada uno con su año o fecha y, si aporta, 1 o 2 detalles.',
    '{"tema":"<el tema, máx. 5 palabras>","hitos":[{"cuando":"<año o fecha>","texto":"<hito, máx. 6 palabras>","detalles":["<detalle, máx. 6 palabras>"]}]}',
  ],
  ciclo: [
    'De 4 a 7 etapas que se repiten en círculo (la última vuelve a la primera), en orden. Cada etapa con 0 a 2 detalles.',
    '{"ciclo":"<nombre del ciclo, máx. 4 palabras>","etapas":[{"texto":"<etapa, máx. 5 palabras>","detalles":["<detalle, máx. 6 palabras>"]}]}',
  ],
  decision: [
    'Árbol de decisión: de 2 a 4 opciones para la decisión dada y, colgando de cada una, de 2 a 3 consecuencias concretas.',
    '{"decision":"<la decisión, máx. 5 palabras>","opciones":[{"texto":"<opción, máx. 5 palabras>","consecuencias":["<consecuencia, máx. 7 palabras>"]}]}',
  ],
  matriz: [
    'Matriz de decisión ponderada: de 3 a 5 criterios con su peso del 1 (poco importante) al 5 (decisivo), y de 2 a 4 opciones con un puntaje del 1 al 5 en CADA criterio. Los puntajes van en el MISMO orden que los criterios y no todos iguales.',
    '{"decision":"<la decisión, máx. 5 palabras>","criterios":[{"texto":"<criterio, máx. 3 palabras>","peso":4}],"opciones":[{"texto":"<opción, máx. 4 palabras>","puntajes":[4,2,5]}]}',
  ],
}

/**
 * Formatos por zonas cuyo JSON es «una lista por región»: qué campo pide cada
 * uno y en qué región cae. Los pesos solo los traen los que los usan.
 */
const LISTAS_ZONA: Partial<Record<TipoMapa, [string, string][]>> = {
  proscontras: [
    ['ventajas', 'izq'],
    ['desventajas', 'der'],
  ],
  fuerzas: [
    ['empujan', 'izq'],
    ['frenan', 'der'],
  ],
  foda: [
    ['fortalezas', 'f'],
    ['debilidades', 'd'],
    ['oportunidades', 'o'],
    ['amenazas', 'a'],
  ],
  eisenhower: [
    ['hacer', 'hacer'],
    ['agendar', 'agendar'],
    ['delegar', 'delegar'],
    ['quitar', 'quitar'],
  ],
  tier: [
    ['s', 's'],
    ['a', 'a'],
    ['b', 'b'],
    ['c', 'c'],
    ['d', 'd'],
  ],
}

/** Mapa completo propuesto por la IA, ya validado y normalizado. */
export interface MapaPropuesto {
  /** Nodo raíz de los formatos jerárquicos (en los de zonas queda de título). */
  raiz: string
  /** Nombre del mapa cuando la raíz no sirve de título (flujo: es su primer paso). */
  titulo?: string
  /** Figura de la raíz en el diagrama de flujo. */
  formaRaiz?: FormaNodo
  /** Formatos jerárquicos y flujo (la cadena de pasos ya viene anidada). */
  ramas: NodoPropuesto[]
  /** Venn y comparación: los conjuntos/temas que serán las raíces. */
  conjuntos?: string[]
  /** Elementos de los formatos por zonas, con la región a la que pertenecen. */
  elementos?: { texto: string; zona: string; peso?: number }[]
  /** Matriz de decisión: criterios con su peso… */
  criterios?: { texto: string; peso: number }[]
  /** …y opciones con un puntaje por criterio, en el mismo orden. */
  opciones?: { texto: string; puntajes: number[] }[]
}

/**
 * Genera un mapa completo desde un tema. Lanza con el mensaje del proveedor si
 * la llamada falla, y reintenta UNA vez cuando el modelo no devuelve un JSON
 * usable (es el fallo más común y casi siempre se corrige solo).
 */
export async function generarMapa(tema: string, tipo: TipoMapa): Promise<MapaPropuesto> {
  const [guia, ...formato] = CONTRATO[tipo]
  const system = [
    'Eres un cartógrafo de ideas: conviertes un tema en un mapa o diagrama claro y útil.',
    guia,
    'Cada texto es corto, concreto y sin numeración.',
    'Responde ÚNICAMENTE con un objeto JSON, sin texto ni markdown alrededor, con esta forma:',
    ...formato,
    'Escribe en el idioma del usuario.',
  ].join('\n')

  let ultimo: unknown = null
  for (let intento = 0; intento < 2; intento++) {
    const respuesta = await conversarIA(system, [{ rol: 'usuario', texto: `Tema: ${tema}` }], 2000)
    try {
      return interpretar(extraerJSON(respuesta), tipo, tema)
    } catch (e) {
      // Los errores de FORMATO se reintentan; los del proveedor ya salieron por
      // `conversarIA` (que lanza) y no llegan hasta aquí.
      ultimo = e
      console.warn('[ideas] respuesta de IA no usable, reintentando:', respuesta.slice(0, 300))
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error('La IA no devolvió un mapa usable')
}

/** Valida y normaliza el JSON del modelo según el formato pedido. */
function interpretar(obj: Record<string, unknown>, tipo: TipoMapa, tema: string): MapaPropuesto {
  const texto = (v: unknown, max = MAX_TEXTO_NODO) =>
    typeof v === 'string' ? v.trim().slice(0, max) : ''
  const raiz = texto(obj.raiz) || tema.slice(0, MAX_TEXTO_NODO)

  if (tipo === 'flujo') {
    const crudos = Array.isArray(obj.pasos) ? (obj.pasos as unknown[]) : []
    const pasos: NodoPropuesto[] = []
    for (const x of crudos.slice(0, 12)) {
      const o = (x ?? {}) as Record<string, unknown>
      const t = texto(o.texto)
      if (!t) continue
      const f = texto(o.forma, 12)
      const forma: FormaNodo =
        f === 'inicio' || f === 'decision' || f === 'fin' ? (f as FormaNodo) : 'proceso'
      pasos.push({ texto: t, forma, hijos: [] })
    }
    if (pasos.length === 0) throw new Error('La IA no devolvió pasos')
    // Cadena: cada paso cuelga del anterior, así el layout los alinea en orden.
    // El primer paso ES la raíz (el nombre del proceso queda como título del
    // mapa, para no dibujar dos nodos de arranque seguidos).
    for (let i = pasos.length - 1; i > 0; i--) pasos[i - 1].hijos = [pasos[i]]
    return { raiz: pasos[0].texto, titulo: raiz, formaRaiz: pasos[0].forma, ramas: pasos[0].hijos }
  }

  // Formatos de dos niveles: una lista de ramas, cada una con su sublista.
  const RAMAS: Partial<Record<TipoMapa, [string, string, number]>> = {
    ishikawa: ['categorias', 'causas', MAX_HIJOS_MAPA],
    linea: ['hitos', 'detalles', 8],
    ciclo: ['etapas', 'detalles', 7],
    decision: ['opciones', 'consecuencias', 4],
  }
  const pedido = RAMAS[tipo]
  if (pedido) {
    const [campo, campoHijos, maxRamas] = pedido
    const ramas: NodoPropuesto[] = []
    for (const x of (Array.isArray(obj[campo]) ? (obj[campo] as unknown[]) : []).slice(0, maxRamas)) {
      const o = (x ?? {}) as Record<string, unknown>
      // En la línea del tiempo el «cuándo» va pegado al hito: es lo primero que
      // se busca al leerla y no cabe en un nodo aparte.
      const cuando = tipo === 'linea' ? texto(o.cuando, 16) : ''
      const t = texto(o.texto, 40)
      if (!t) continue
      const hijos = (Array.isArray(o[campoHijos]) ? (o[campoHijos] as unknown[]) : [])
        .map((h) => texto(h))
        .filter(Boolean)
        .slice(0, 4)
        .map((h) => ({ texto: h, hijos: [] }))
      ramas.push({ texto: cuando ? `${cuando} · ${t}` : t, hijos })
    }
    if (ramas.length === 0) throw new Error('La IA no devolvió las ramas del diagrama')
    const titulo =
      texto(obj.problema) || texto(obj.decision) || texto(obj.ciclo) || texto(obj.tema) || raiz
    return { raiz: titulo, ramas }
  }

  if (tipo === 'matriz') {
    const nota = (v: unknown, def: number) => {
      const x = Math.round(Number(v))
      return x >= 1 && x <= 5 ? x : def
    }
    const criterios = (Array.isArray(obj.criterios) ? (obj.criterios as unknown[]) : [])
      .slice(0, 6)
      .map((x) => {
        const o = (x ?? {}) as Record<string, unknown>
        return { texto: texto(o.texto, 28), peso: nota(o.peso, 3) }
      })
      .filter((c) => c.texto)
    const opciones = (Array.isArray(obj.opciones) ? (obj.opciones as unknown[]) : [])
      .slice(0, 4)
      .map((x) => {
        const o = (x ?? {}) as Record<string, unknown>
        const crudos = Array.isArray(o.puntajes) ? (o.puntajes as unknown[]) : []
        // Un puntaje por criterio: lo que falte queda neutro.
        return {
          texto: texto(o.texto, 28),
          puntajes: criterios.map((_, i) => nota(crudos[i], 3)),
        }
      })
      .filter((o) => o.texto)
    if (criterios.length === 0 || opciones.length < 2) {
      throw new Error('La IA no devolvió criterios y opciones suficientes')
    }
    return { raiz: texto(obj.decision, 40) || tema, ramas: [], criterios, opciones }
  }

  if (tipo === 'piramide') {
    // Aquí los niveles los NOMBRA la IA (Maslow, capas, prioridades…), así que
    // los conjuntos vienen de su respuesta y no del catálogo.
    const crudos = (Array.isArray(obj.niveles) ? (obj.niveles as unknown[]) : []).slice(0, 4)
    const conjuntos: string[] = []
    const elementos: { texto: string; zona: string }[] = []
    crudos.forEach((x, i) => {
      const o = (x ?? {}) as Record<string, unknown>
      conjuntos.push(texto(o.nombre, 28) || etiquetasRaiz('piramide', tema)[i])
      for (const el of (Array.isArray(o.elementos) ? (o.elementos as unknown[]) : []).slice(0, 3)) {
        const t = texto(el)
        if (t) elementos.push({ texto: t, zona: `p${i + 1}` })
      }
    })
    if (conjuntos.length < 2) throw new Error('La IA no devolvió los niveles')
    return { raiz: texto(obj.tema, 40) || tema, ramas: [], conjuntos, elementos }
  }

  const listas = LISTAS_ZONA[tipo]
  if (listas) {
    // Cada punto llega como texto suelto o como {texto, peso}: donde hay pesos
    // se le piden, pero el modelo a veces manda la lista pelada.
    const elementos = listas.flatMap(([campo, zona]) =>
      (Array.isArray(obj[campo]) ? (obj[campo] as unknown[]) : [])
        .slice(0, 6)
        .map((x) => {
          const o = typeof x === 'string' ? { texto: x } : ((x ?? {}) as Record<string, unknown>)
          const p = Math.round(Number(o.peso))
          return {
            texto: texto(o.texto),
            zona,
            ...(p >= 1 && p <= 5 ? { peso: p } : {}),
          }
        })
        .filter((e) => e.texto),
    )
    if (elementos.length === 0) throw new Error('La IA no devolvió elementos')
    const asunto =
      texto(obj.opcion, 40) || texto(obj.cambio, 40) || texto(obj.asunto, 40) || texto(obj.tema, 40) || tema
    return { raiz: asunto, ramas: [], conjuntos: etiquetasRaiz(tipo, asunto), elementos }
  }

  if (tipo === 'venn') {
    const conjuntos = (Array.isArray(obj.conjuntos) ? (obj.conjuntos as unknown[]) : [])
      .map((c) => texto(c, 28))
      .filter(Boolean)
      .slice(0, 3)
    if (conjuntos.length < 2) throw new Error('La IA no devolvió conjuntos')
    const validas = conjuntos.length >= 3 ? ['a', 'b', 'c', 'ab', 'ac', 'bc', 'abc'] : ['a', 'b', 'ab']
    const elementos = elementosConZona(obj.elementos, validas, texto)
    if (elementos.length === 0) throw new Error('La IA no devolvió elementos')
    return { raiz: raiz || tema, ramas: [], conjuntos, elementos }
  }

  if (tipo === 'comparacion') {
    const izq = texto(obj.izq, 28)
    const der = texto(obj.der, 28)
    if (!izq || !der) throw new Error('La IA no devolvió los dos temas')
    const lista = (v: unknown, zona: string) =>
      (Array.isArray(v) ? (v as unknown[]) : [])
        .map((x) => texto(x))
        .filter(Boolean)
        .slice(0, 6)
        .map((t) => ({ texto: t, zona }))
    const elementos = [
      ...lista(obj.soloIzq, 'izq'),
      ...lista(obj.comunes, 'centro'),
      ...lista(obj.soloDer, 'der'),
    ]
    if (elementos.length === 0) throw new Error('La IA no devolvió elementos')
    return { raiz: raiz || tema, ramas: [], conjuntos: [izq, der], elementos }
  }

  const restantes = { n: tipo === 'circulo' ? 12 : MAX_NODOS_MAPA }
  const profMax = tipo === 'circulo' ? 1 : tipo === 'llaves' ? 2 : MAX_PROF_MAPA
  const ramas = validarHijos(obj.hijos, 1, restantes, profMax)
  if (ramas.length === 0) throw new Error('La IA no devolvió ramas')
  return { raiz, ramas }
}

function elementosConZona(
  v: unknown,
  validas: string[],
  texto: (v: unknown, max?: number) => string,
): { texto: string; zona: string }[] {
  const lista = Array.isArray(v) ? (v as unknown[]) : []
  const res: { texto: string; zona: string }[] = []
  for (const x of lista.slice(0, 30)) {
    const o = (x ?? {}) as Record<string, unknown>
    const t = texto(o.texto)
    const z = texto(o.zona, 4).toLowerCase()
    if (!t || !validas.includes(z)) continue
    res.push({ texto: t, zona: z })
  }
  return res
}

/** Valida el árbol propuesto recursivamente aplicando los topes duros. */
function validarHijos(
  v: unknown,
  profundidad: number,
  restantes: { n: number },
  profMax: number,
): NodoPropuesto[] {
  if (!Array.isArray(v) || profundidad > profMax) return []
  const res: NodoPropuesto[] = []
  for (const x of v) {
    if (restantes.n <= 0 || res.length >= MAX_HIJOS_MAPA + 4) break
    const o = (x ?? {}) as Record<string, unknown>
    const texto = typeof o.texto === 'string' ? o.texto.trim().slice(0, MAX_TEXTO_NODO) : ''
    if (!texto) continue
    restantes.n -= 1
    res.push({ texto, hijos: validarHijos(o.hijos, profundidad + 1, restantes, profMax) })
  }
  return res
}

/**
 * Propone ideas nuevas para colgar de un nodo (o para una región, en los mapas
 * por zonas). Devuelve [] si algo falla: el botón simplemente no trae nada.
 */
/** Voz del prompt según lo que se esté ampliando. */
const VOZ_EXPANDIR = {
  nodos: [
    'Eres un cartógrafo de ideas: amplías un mapa conceptual con elementos nuevos.',
    'Propón de 3 a 5 elementos específicos y distintos entre sí.',
  ],
  puntos: [
    'Desarrollas una idea suelta: propones los puntos que le faltan para estar completa.',
    'Propón de 3 a 5 puntos concretos y accionables que DESARROLLEN esa misma idea (no ideas distintas).',
  ],
  hermanas: [
    'Propones ideas COMPLEMENTARIAS a una que ya existe: otras ideas distintas que la acompañan bien.',
    'Propón de 3 a 5 ideas nuevas y hermanas de la dada, ninguna repetida ni una simple variante.',
  ],
} as const

/** Tope de texto: un punto de una idea respira más que la etiqueta de un nodo. */
const TOPE_TEXTO = { nodos: MAX_TEXTO_NODO, puntos: 120, hermanas: 90 } as const

export async function expandirNodo(
  contexto: string,
  existentes: string[],
  matiz: keyof typeof VOZ_EXPANDIR = 'nodos',
): Promise<string[]> {
  try {
    const tope = TOPE_TEXTO[matiz]
    const system = [
      ...VOZ_EXPANDIR[matiz],
      existentes.length ? `PROHIBIDO repetir (ni reformulados): ${existentes.slice(0, 60).join(' · ')}` : '',
      `Responde ÚNICAMENTE con JSON (sin texto extra ni markdown): {"ideas":["<máx. ${tope} caracteres>"]}`,
      'Escribe en el idioma del usuario.',
    ]
      .filter(Boolean)
      .join('\n')
    const r = await conversarIA(system, [{ rol: 'usuario', texto: contexto }], 400)
    const ideas = extraerJSON(r).ideas
    const lista = Array.isArray(ideas) ? (ideas as unknown[]) : []
    const vistas = new Set(existentes.map(clave))
    const res: string[] = []
    for (const x of lista) {
      if (typeof x !== 'string') continue
      const tx = x.trim().slice(0, tope)
      if (!tx || vistas.has(clave(tx))) continue
      vistas.add(clave(tx))
      res.push(tx)
    }
    return res.slice(0, 5)
  } catch {
    return []
  }
}

/** Más PUNTOS dentro de la misma idea. Nunca lanza (devuelve []). */
export async function desarrollarIdea(idea: { texto: string; puntos: string[] }): Promise<string[]> {
  return expandirNodo(`Idea: ${idea.texto}`, idea.puntos, 'puntos')
}

/** Ideas HERMANAS nuevas para la misma carpeta. Nunca lanza (devuelve []). */
export async function ideasComplementarias(ctx: {
  idea: string
  carpeta?: string
  hermanas: string[]
}): Promise<string[]> {
  const contexto = ctx.carpeta
    ? `Idea: ${ctx.idea}\nEstá en la carpeta «${ctx.carpeta}» del diario de ideas.`
    : `Idea: ${ctx.idea}`
  return expandirNodo(contexto, [ctx.idea, ...ctx.hermanas], 'hermanas')
}
