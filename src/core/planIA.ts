import { conversarIA, extraerJSON } from './chat/ia'
import type { EnlaceApp, EntradaPlan, MaterialPlan, NivelPartida } from './data/db'
import { DIA_MS, deIso } from './fechaLocal'
import { localeActual } from './i18n/useT'

/**
 * Le pide a la IA un cronograma para una meta grande ("preparar un maratón").
 *
 * Los días van RELATIVOS al día 0 del plan, no en fechas: un modelo cuenta enteros
 * pequeños bien y calendarios mal — con ISO absolutos devuelve días que no existen
 * y años equivocados, y validar eso es un pantano. Aquí la validación son dos
 * clamps, y quien guarda el plan ya sabe anclarlo (`inicioISO`).
 */

/** Un nodo tal como llega de la IA: anidado, con los días ya normalizados. */
export interface NodoPropuesto {
  nombre: string
  ini: number
  /** Inclusivo: la IA manda duración, aquí ya es el último día ocupado. */
  fin: number
  hijos: NodoPropuesto[]
  /** App de la casa donde se registra el paso; solo si existe en la oferta. */
  enlaceApp?: EnlaceApp
}

/**
 * Una app de la casa que se le ofrece a la IA para que enlace los pasos: «beber 2 L
 * de agua» → la cocina. Las secciones son los deep links que la app ya declara
 * (`Plantilla.comandos`); la IA elige por id y `validarEnlace` no se cree ninguno
 * que no esté aquí.
 */
export interface AppParaPlan {
  id: string
  nombre: string
  secciones: { id: string; etiqueta: string; dato?: string }[]
}

/** Rutina YA creada en la app que se le enseña a la IA para que elija de ahí. */
export interface RutinaParaPlan {
  nombre: string
  tipo: string
  duracionMin: number
}

/** Una pieza del material propio de la app (una receta, un mazo…) ofrecida al plan. */
export interface MaterialParaPlan {
  nombre: string
  /** Una línea que ayuda a elegir («420 kcal · P32 C40 G12»). */
  detalle?: string
}

/**
 * Acotamiento que la app dueña de la meta le da al planificador ✨: QUÉ clase de
 * plan produce esa app y con qué datos reales del usuario. La guía solo acota el
 * CONTENIDO — el contrato JSON y su validación no cambian; una guía que pidiera
 * otra estructura se toparía con `validarPlan`.
 */
export interface ContextoPlanApp {
  /** Líneas que se añaden al SYSTEM («Eres un nutriólogo; el plan es SIEMPRE…»). */
  guia: string[]
  /** Datos reales del usuario, una línea corta por dato; van al mensaje de usuario. */
  contexto?: string[]
  /** Punto de partida sugerido para preseleccionar en el formulario. */
  nivel?: NivelPartida
  /** Meta de ejemplo del dominio (ya localizada), editable antes de crearla. */
  ejemplo?: string
  /** Material que la app genera (recetas del recetario…): el plan elige de aquí,
   * lo reparte entre las actividades agendables y justifica cada elección. */
  material?: {
    /** Cómo llamar a la sección en la UI, ya localizado («Recetas del plan»). */
    titulo: string
    /** Qué es este material y cómo repartirlo; se añade al SYSTEM. */
    instruccion: string
    items: MaterialParaPlan[]
  }
}

/**
 * Cierre estándar de toda guía de app: fuera de dominio no se genera plan. El
 * rechazo viaja por la llave `rechazo` y `generarPlan` lo convierte en error, que
 * es el canal que el panel ya enseña con el motivo literal.
 */
export const CLAUSULA_RECHAZO = (dominio: string): string =>
  `Si la meta no tiene relación con ${dominio}, NO generes el plan: responde únicamente ` +
  '{"rechazo":"<una frase: por qué la meta no corresponde a esta app y dónde encajaría mejor>"} ' +
  'en el idioma que pida el mensaje.'

/**
 * GUARDARRAÍL LEGAL de salud, hermano del de finanzas (`rooms/despacho/plan.ts`)
 * y tan poco cosmético como él. MPH se declara ante Play como agenda personal y
 * NO como app médica —ninguna categoría de «Medicina» marcada—, y la política de
 * privacidad dice lo mismo. Lo que sostiene esa declaración es este texto: la IA
 * organiza hábitos, nunca diagnostica ni dosifica. Si se cae de aquí, la
 * declaración deja de ser cierta. Va en toda guía que roce cuerpo, comida, sueño
 * o medicamentos.
 */
export const CLAUSULA_SALUD =
  'Esto es organización personal, NO consejo médico: no diagnostiques, no ' +
  'interpretes síntomas, no nombres medicamentos ni ajustes sus dosis, y no ' +
  'plantees curar, tratar ni prevenir ninguna enfermedad. Si lo que se pide ' +
  'depende de una condición médica, un embarazo, una lesión o un trastorno ' +
  'alimenticio, dilo en una frase y remite a un profesional de la salud en vez ' +
  'de resolverlo tú.'

/** Elección validada: una rutina de la lista y sus días (0=domingo … 6=sábado). */
export interface SugerenciaRutina {
  nombre: string
  dias: number[]
}

export interface PlanPropuesto {
  resumen: string
  nodos: NodoPropuesto[]
  /** Rutinas existentes que acompañan al plan (vacío si no se ofrecieron o no encajan). */
  rutinas: SugerenciaRutina[]
  /** Material de la app elegido y justificado (vacío si no se ofreció o nada encaja). */
  material: MaterialPlan[]
}

// Topes duros: el modelo se emociona. Un plan de 60 nodos a 5 niveles no se lee en
// el eje y son 120 escrituras al aceptarlo.
const MAX_FASES = 8
const MAX_HIJOS = 8
const MAX_NODOS = 40
const MAX_DIAS = 365 * 5
const MAX_NOMBRE = 60
/** 0 = fase, 1 = sub-meta. Más profundo no se anida. */
const MAX_PROFUNDIDAD = 1
// Clamps para lo que aporta la app: una guía o un contexto desbocados inflarían la
// entrada sin acotar mejor.
const MAX_LINEAS_GUIA = 8
const MAX_LINEAS_CONTEXTO = 12
const MAX_LARGO_LINEA = 250
// El material también se acota: un recetario de 100 recetas no cabe en el prompt,
// y un plan con 30 piezas elegidas no se lee.
const MAX_MATERIAL_OFERTA = 30
const MAX_MATERIAL_ELEGIDO = 12
const MAX_MOTIVO = 160
// El catálogo de apps se manda entero en el mensaje: una casa con veinte apps y
// todas sus secciones ya son varios cientos de tokens.
const MAX_APPS_OFERTA = 20
const MAX_SECCIONES_APP = 8

const SYSTEM = [
  'Eres un entrenador que descompone una meta grande en un cronograma de sub-metas realista.',
  'Responde ÚNICAMENTE con un objeto JSON, sin texto ni markdown alrededor:',
  '{"resumen":"<una frase>","nodos":[{"nombre":"<fase>","ini":number,"dias":number,"hijos":[{"nombre":"<sub-meta>","ini":number,"dias":number}]}]}',
  '`ini` es el día en que empieza el nodo, contado SIEMPRE desde el día 0 del plan — también en los hijos, NUNCA respecto a su fase.',
  '`dias` es cuántos días dura el nodo, mínimo 1.',
  'Entre 3 y 6 fases, cada una con 2 a 5 hijos. Solo dos niveles (fase → sub-meta): no anides más.',
  'Las fases van en orden y se encadenan sin huecos grandes; los hijos caen DENTRO del periodo de su fase.',
  'Cada nombre es una acción concreta y medible de máximo 60 caracteres ("Correr 10 km sin parar"), no un consejo genérico ("mejorar la resistencia").',
  'Ajusta el volumen a las horas por semana y a los días disponibles: un plan que no cabe en su semana no sirve de nada.',
].join('\n')

/** Se añade al system SOLO cuando hay rutinas que ofrecer: sin lista, ni mencionarlo. */
const SYSTEM_RUTINAS = [
  'El mensaje trae una lista de actividades agendables que el usuario YA tiene en la app (rutinas, comidas, prácticas).',
  'Añade al JSON la llave "rutinas": [{"nombre":"<EXACTO, tal como aparece en la lista>","dias":[números]}].',
  'Elige de 2 a 4 que sirvan a la meta y reparte sus días entre los disponibles (0=domingo … 6=sábado), sin pasarte de las horas semanales.',
  'Un hábito diario (una comida, por ejemplo) va todos los días disponibles.',
  'Si ninguna le sirve a la meta, manda "rutinas": [].',
].join('\n')

/** Se añade SOLO cuando hay apps que ofrecer: sin casa montada, ni mencionarlo. */
const SYSTEM_APPS = [
  'El mensaje trae las apps que el usuario tiene en su casa, con sus secciones.',
  'A cada nodo que se REGISTRE en alguna de ellas añádele "app":"<id EXACTO de la lista>" y, si encaja una sección concreta, "seccion":"<id EXACTO de esa app>".',
  'Es dónde se apunta lo que pide el paso: «beber 2 L de agua» se registra en la cocina, «correr 5 km» en ejercicio.',
  'Elige SOLO de la lista y omite la llave en los pasos que no se registran en ninguna app (leer un correo, comprar unos tenis).',
].join('\n')

/** Se añade SOLO cuando la app ofrece material propio (recetas, mazos…). */
const SYSTEM_MATERIAL = [
  'El mensaje trae también el MATERIAL propio de la app: las piezas concretas que el plan debe usar.',
  'Añade al JSON la llave "material": [{"nombre":"<EXACTO, tal como aparece en la lista de material>","rutina":"<actividad agendable de la lista donde encaja, o vacío>","motivo":"<una frase: por qué esta pieza sirve a ESTA meta>"}].',
  'Elige SOLO material de la lista y reparte cada pieza donde toque; si nada encaja con la meta, manda "material": [].',
].join('\n')

const NOMBRE_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const TEXTO_NIVEL: Record<NivelPartida, string> = {
  cero: 'empieza desde cero, sin ninguna experiencia previa',
  algo: 'tiene algo de base pero es principiante',
  medio: 'nivel intermedio, ya practica con regularidad',
  avanzado: 'nivel avanzado, busca perfeccionarse',
}

/**
 * Cierra las llaves y corchetes que quedaron abiertos. Devuelve null si el corte
 * cayó dentro de una cadena (ese prefijo no se puede salvar tal cual).
 */
function cerrarPendientes(texto: string): string | null {
  const pila: string[] = []
  let enCadena = false
  let escape = false
  for (const c of texto) {
    if (escape) {
      escape = false
      continue
    }
    if (c === '\\') {
      escape = true
      continue
    }
    if (enCadena) {
      if (c === '"') enCadena = false
      continue
    }
    if (c === '"') enCadena = true
    else if (c === '{' || c === '[') pila.push(c === '{' ? '}' : ']')
    else if (c === '}' || c === ']') pila.pop()
  }
  if (enCadena) return null
  return texto + pila.reverse().join('')
}

/** Cuántos finales de nodo se prueban al reparar: de sobra para un plan cortado. */
const MAX_INTENTOS_REPARO = 400

/**
 * `extraerJSON`, pero rescatando la respuesta CORTADA a media llave: con el tope de
 * tokens, un plan largo llega sin cerrar y `JSON.parse` lo tira entero. Aquí se
 * retrocede hasta el último nodo completo y se cierra lo que falte — mejor un plan
 * con una fase menos que ningún plan.
 */
function jsonDePlan(bruto: string): Record<string, unknown> {
  try {
    return extraerJSON(bruto)
  } catch {
    // Sigue: se intenta reparar abajo.
  }
  const ini = bruto.indexOf('{')
  if (ini < 0) throw new Error('La IA no devolvió un plan usable')
  const cuerpo = bruto.slice(ini)
  let intentos = 0
  for (let i = cuerpo.length - 1; i >= 0 && intentos < MAX_INTENTOS_REPARO; i--) {
    const c = cuerpo[i]
    if (c !== '}' && c !== ']') continue
    intentos++
    // La coma colgante del elemento que se descarta también sobra.
    const cerrado = cerrarPendientes(cuerpo.slice(0, i + 1).replace(/,\s*$/, ''))
    if (!cerrado) continue
    try {
      const obj: unknown = JSON.parse(cerrado)
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj as Record<string, unknown>
    } catch {
      // Ese corte no servía: se prueba el anterior.
    }
  }
  throw new Error('La IA devolvió una respuesta incompleta')
}

/** Días que caben entre hoy y la fecha objetivo, contando los dos extremos. */
function topeDe(entrada: EntradaPlan, hoyIso: string): number {
  if (!entrada.fechaObjetivo || entrada.fechaObjetivo <= hoyIso) return MAX_DIAS
  const d = Math.round((deIso(entrada.fechaObjetivo).getTime() - deIso(hoyIso).getTime()) / DIA_MS) + 1
  return Math.max(1, Math.min(d, MAX_DIAS))
}

/**
 * El chip de app de un nodo, solo si la app (y su sección) están en la oferta: el
 * modelo se inventa ids con soltura, y un enlace a una app que no está en la casa
 * es un chip que no abre nada.
 */
function validarEnlace(o: Record<string, unknown>, apps: AppParaPlan[]): EnlaceApp | undefined {
  if (apps.length === 0 || typeof o.app !== 'string') return undefined
  const id = o.app.trim().toLowerCase()
  const app = apps.find((a) => a.id.toLowerCase() === id)
  if (!app) return undefined
  const pedida = typeof o.seccion === 'string' ? o.seccion.trim().toLowerCase() : ''
  const seccion = app.secciones.find((s) => s.id.toLowerCase() === pedida)
  return { plantillaId: app.id, seccion: seccion?.id, dato: seccion?.dato }
}

/** Valida nodo a nodo lo que devolvió la IA: nada de aquí se cree sin comprobar. */
function validarPlan(json: Record<string, unknown>, tope: number, apps: AppParaPlan[]): PlanPropuesto {
  let restantes = MAX_NODOS
  const entero = (v: unknown, min: number, max: number, porDefecto: number) => {
    const n = Math.round(Number(v))
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : porDefecto
  }
  const nodo = (x: unknown, profundidad: number): NodoPropuesto | null => {
    if (restantes <= 0) return null
    const o = (x ?? {}) as Record<string, unknown>
    const nombre = typeof o.nombre === 'string' ? o.nombre.trim().slice(0, MAX_NOMBRE) : ''
    if (!nombre) return null
    restantes--
    const ini = entero(o.ini, 0, tope - 1, 0)
    const dura = entero(o.dias, 1, tope - ini, 1)
    // El corte de profundidad va aquí y no solo en el prompt: el modelo anida de más.
    const brutos = profundidad >= MAX_PROFUNDIDAD || !Array.isArray(o.hijos) ? [] : (o.hijos as unknown[])
    const hijos = brutos
      .slice(0, MAX_HIJOS)
      .map((h) => nodo(h, profundidad + 1))
      .filter((h): h is NodoPropuesto => h != null)
    return { nombre, ini, fin: ini + dura - 1, hijos, enlaceApp: validarEnlace(o, apps) }
  }

  const brutas = Array.isArray(json.nodos) ? (json.nodos as unknown[]) : []
  const nodos = brutas
    .slice(0, MAX_FASES)
    .map((x) => nodo(x, 0))
    .filter((n): n is NodoPropuesto => n != null)
  if (nodos.length === 0) throw new Error('La IA no devolvió un plan usable')

  return {
    resumen: typeof json.resumen === 'string' ? json.resumen.trim().slice(0, 200) : '',
    nodos,
    rutinas: [],
    material: [],
  }
}

/** Solo sobreviven las que existen de verdad en la lista ofrecida (nombre exacto). */
function validarRutinas(json: Record<string, unknown>, disponibles: RutinaParaPlan[]): SugerenciaRutina[] {
  if (disponibles.length === 0 || !Array.isArray(json.rutinas)) return []
  const porNombre = new Map(disponibles.map((r) => [r.nombre.trim().toLowerCase(), r.nombre]))
  const vistas = new Set<string>()
  const salida: SugerenciaRutina[] = []
  for (const x of json.rutinas as unknown[]) {
    const o = (x ?? {}) as Record<string, unknown>
    const nombre = typeof o.nombre === 'string' ? porNombre.get(o.nombre.trim().toLowerCase()) : undefined
    if (!nombre || vistas.has(nombre)) continue
    vistas.add(nombre)
    const dias = Array.isArray(o.dias)
      ? [...new Set(o.dias.map((d) => Math.round(Number(d))).filter((d) => d >= 0 && d <= 6))].sort()
      : []
    salida.push({ nombre, dias })
    if (salida.length >= 6) break
  }
  return salida
}

/** Solo sobrevive el material que existe en la oferta; la rutina, solo si es de la lista. */
function validarMaterial(
  json: Record<string, unknown>,
  oferta: MaterialParaPlan[],
  rutinas: RutinaParaPlan[],
): MaterialPlan[] {
  if (oferta.length === 0 || !Array.isArray(json.material)) return []
  const porNombre = new Map(oferta.map((m) => [m.nombre.trim().toLowerCase(), m.nombre]))
  const rutinaDe = new Map(rutinas.map((r) => [r.nombre.trim().toLowerCase(), r.nombre]))
  const vistos = new Set<string>()
  const salida: MaterialPlan[] = []
  for (const x of json.material as unknown[]) {
    const o = (x ?? {}) as Record<string, unknown>
    const nombre = typeof o.nombre === 'string' ? porNombre.get(o.nombre.trim().toLowerCase()) : undefined
    if (!nombre || vistos.has(nombre)) continue
    vistos.add(nombre)
    const rutina = typeof o.rutina === 'string' ? rutinaDe.get(o.rutina.trim().toLowerCase()) : undefined
    const motivo = typeof o.motivo === 'string' ? o.motivo.trim().slice(0, MAX_MOTIVO) : ''
    salida.push({ nombre, rutina, motivo })
    if (salida.length >= MAX_MATERIAL_ELEGIDO) break
  }
  return salida
}

/** Palabras que delatan la familia de una meta (sin acentos: ya normalizado). */
const CLAVES_TIPO: [string, RegExp][] = [
  ['resistencia', /marat|corr|carrer|cardio|resisten|triatl|bici|cicl|nad|camin|trote|run|hiit|\b(5|10|21|42)\s*k/],
  ['fuerza', /muscul|fuerza|hipertrof|pesas|gym|gimnasio|masa|fuerte|strength|press|sentadilla/],
  ['flexibilidad', /flex|movilidad|yoga|estir|split|stretch|contorsion/],
  ['comida', /diet|aliment|nutri|adelgaz|kilo|peso|grasa|comer|comida|macro|calor|ayun/],
]

/**
 * Capa sin IA: si el nombre de la meta delata su familia («maratón» → resistencia),
 * propone las primeras rutinas de ese tipo. Es el fallback cuando la IA no eligió
 * ninguna — y lo que hace útil la sugerencia aunque el modelo se la salte.
 */
export function sugerirRutinasPorNombre(
  nombreMeta: string,
  disponibles: RutinaParaPlan[],
): SugerenciaRutina[] {
  // Con UNA sola candidata no hay nada que adivinar: es la actividad propia del
  // ámbito de la meta (el hobby de este cronograma) y siempre viene al caso.
  if (disponibles.length === 1) return [{ nombre: disponibles[0].nombre, dias: [] }]
  const n = nombreMeta.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  // Solo se consideran las familias que esta app ofrece: las claves se pisan unas a
  // otras («bajar 5 kilos» cae en el «5 k» de las carreras), y sin este filtro una
  // meta de dieta se clasificaría como cardio y en cocina no sugeriría nada.
  const tipos = new Set(disponibles.map((r) => r.tipo))
  const tipo = CLAVES_TIPO.find(([t, re]) => tipos.has(t) && re.test(n))?.[0]
  if (!tipo) return []
  return disponibles
    .filter((r) => r.tipo === tipo)
    .slice(0, 3)
    .map((r) => ({ nombre: r.nombre, dias: [] }))
}

/**
 * Propone un cronograma para la meta. LANZA si la IA no está activa, si el proveedor
 * falla o si no devuelve un árbol usable: no hay fallback determinista a propósito
 * — inventar fases sin saber de qué va la meta sería peor que no proponer nada, así
 * que el caller enseña el aviso y deja el alta a mano.
 *
 * El prompt va en español fijo aunque la UI esté en inglés (el diccionario es UI, y
 * el contrato JSON no se traduce); lo que sí sigue al idioma activo es la RESPUESTA,
 * porque esos nombres acaban siendo metas reales.
 */
export async function generarPlan(
  nombreMeta: string,
  entrada: EntradaPlan,
  hoyIso: string,
  rutinas: RutinaParaPlan[] = [],
  app?: ContextoPlanApp,
  apps: AppParaPlan[] = [],
): Promise<PlanPropuesto> {
  // El día 0 del plan es el inicio elegido, no hoy: el plan puede arrancar a futuro.
  const inicioIso = entrada.fechaInicio ?? hoyIso
  const tope = topeDe(entrada, inicioIso)
  const idioma = localeActual().startsWith('es') ? 'español' : 'inglés'
  const recorta = (l: string) => l.slice(0, MAX_LARGO_LINEA)
  const guia = (app?.guia ?? []).slice(0, MAX_LINEAS_GUIA).map(recorta)
  const contexto = (app?.contexto ?? []).slice(0, MAX_LINEAS_CONTEXTO).map(recorta)
  const material = (app?.material?.items ?? []).slice(0, MAX_MATERIAL_OFERTA)
  // Una sección repetida es el mismo destino con otro dato (los juegos de mesa):
  // a la IA se le ofrece una sola vez, y `validarEnlace` resuelve el dato.
  const catalogo = apps.slice(0, MAX_APPS_OFERTA).map((a) => ({
    ...a,
    secciones: [...new Map(a.secciones.map((s) => [s.id, s])).values()].slice(0, MAX_SECCIONES_APP),
  }))
  const usuario = [
    `Meta: ${nombreMeta}`,
    inicioIso === hoyIso
      ? `Hoy es ${hoyIso} y el día 0 del plan es hoy.`
      : `Hoy es ${hoyIso} y el día 0 del plan es ${inicioIso}.`,
    entrada.fechaObjetivo
      ? `Fecha objetivo: ${entrada.fechaObjetivo}. El plan dura ${tope} días COMO MÁXIMO: ningún nodo puede pasar del día ${tope - 1}.`
      : 'SIN fecha objetivo: el plazo lo decides TÚ. Calcula cuánto tiempo exige de verdad esta meta ' +
        'con esas horas por semana y ese punto de partida, y no lo estires ni lo aprietes para que dé ' +
        'un número redondo. Empieza el resumen diciendo cuántas semanas necesita y por qué.',
    `Dispone de ${entrada.horasSemana} horas por semana.`,
    entrada.dias.length > 0 && entrada.dias.length < 7
      ? `Solo puede dedicarle estos días: ${entrada.dias.map((d) => NOMBRE_DIA[d]).join(', ')}.`
      : 'Puede dedicarle cualquier día de la semana.',
    `Punto de partida: ${TEXTO_NIVEL[entrada.nivel]}.`,
    ...(contexto.length > 0
      ? [
          'Datos reales del usuario en la app (calibra el plan con ellos, no los repitas como sub-metas):',
          ...contexto.map((l) => `- ${l}`),
        ]
      : []),
    ...(rutinas.length > 0
      ? [
          `Rutinas ya creadas (elige SOLO de aquí, con el nombre exacto): ${rutinas
            .map((r) => `«${r.nombre}» (${r.tipo}, ${r.duracionMin} min)`)
            .join(', ')}.`,
        ]
      : []),
    ...(material.length > 0
      ? [
          `Material de la app (elige SOLO de aquí, con el nombre exacto): ${material
            .map((m) => `«${m.nombre}»${m.detalle ? ` (${recorta(m.detalle)})` : ''}`)
            .join(', ')}.`,
        ]
      : []),
    ...(catalogo.length > 0
      ? [
          `Apps de la casa (para "app", usa el id de la izquierda): ${catalogo
            .map(
              (a) =>
                `${a.id} = ${a.nombre}${
                  a.secciones.length > 0
                    ? ` [secciones: ${a.secciones.map((s) => `${s.id} = ${s.etiqueta}`).join('; ')}]`
                    : ''
                }`,
            )
            .join(' | ')}.`,
        ]
      : []),
    `Escribe los nombres, el resumen y los motivos en ${idioma}.`,
  ].join('\n')

  // El plan más largo que permiten los topes ronda los 1.5k tokens de JSON, y las
  // rutinas sugeridas suman otro poco. Si aun así se corta, `jsonDePlan` rescata
  // lo que llegó completo en vez de perder la respuesta entera.
  // Orden del system: el contrato JSON manda, la guía de la app acota el contenido y
  // SYSTEM_RUTINAS/SYSTEM_MATERIAL quedan pegados a las listas que anuncia el mensaje.
  const system = [
    SYSTEM,
    ...guia,
    ...(rutinas.length > 0 ? [SYSTEM_RUTINAS] : []),
    ...(catalogo.length > 0 ? [SYSTEM_APPS] : []),
    ...(material.length > 0 && app?.material ? [SYSTEM_MATERIAL, recorta(app.material.instruccion)] : []),
  ].join('\n')
  // Con material, el JSON crece (nombre + motivo por pieza): más margen de salida.
  // Los enlaces de app suman dos llaves cortas por nodo, que en 40 nodos se notan.
  const respuesta = await conversarIA(
    system,
    [{ rol: 'usuario', texto: usuario }],
    (material.length > 0 ? 4000 : 3000) + (catalogo.length > 0 ? 500 : 0),
  )
  const json = jsonDePlan(respuesta)
  // La guía de la app permite rechazar metas fuera de su dominio: el motivo viaja
  // como error porque el panel ya enseña motivos literales.
  if (typeof json.rechazo === 'string' && json.rechazo.trim())
    throw new Error(recorta(json.rechazo.trim()))
  const plan = validarPlan(json, tope, catalogo)
  plan.rutinas = validarRutinas(json, rutinas)
  // La IA no eligió ninguna (o mandó nombres inventados): decide la capa sin IA.
  if (plan.rutinas.length === 0) plan.rutinas = sugerirRutinasPorNombre(nombreMeta, rutinas)
  plan.material = validarMaterial(json, material, rutinas)
  return plan
}
