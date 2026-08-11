/**
 * Las metas de Pep@, una carpeta por app de la casa.
 *
 * Están todas juntas y no repartidas por los `demo.ts` de cada cuarto porque lo
 * que hay que poder revisar de un vistazo es LA COHERENCIA: que la meta de la
 * cocina apunte al maratón que entrena el cuarto de ejercicio, que el fondo de
 * imprevistos del despacho hable de la misma avería que arregla el garaje, y que
 * dos metas no venzan el mismo día en el calendario. Repartidas por quince
 * archivos, esa lectura no existe (es lo mismo que ya justifica `hitosPep.ts`).
 *
 * Sembrar sí sigue siendo cosa de cada builder: llaman a `sembrarMetasApp` con
 * su clave, así que la carga perezosa por app se mantiene y una app construida
 * sola trae sus metas y ninguna otra.
 *
 * Lo que el conjunto tiene que enseñar —son los flujos que el visitante viene a
 * ver— es una de cada:
 *   · metas cumplidas, vivas y sin fecha (esas viven solo en la lista);
 *   · metas con pasos, con sub-metas y con plan;
 *   · planes PROPUESTOS (esperando en la pestaña Planes) y ya ACEPTADOS (con sus
 *     fases convertidas en sub-metas del cronograma);
 *   · metas de un sub-ámbito (un hobby, un idioma, el ahorro del despacho).
 */
import type { NivelPartida, PasoRutina } from '../core/data/db'
import { planesMetaRepo, rutinasRepo } from '../core/data/repository'
import { esMeta } from '../core/metas'
import { aceptarPlan } from '../core/planMeta'
import { colorPorProfundidad } from '../core/ui/coloresRutina'
import type { CtxDemo } from './builders'
import { PLANES_DEMO, sembrarPlanDemo, type ClavePlan } from './planesPep'

/** Un texto de la casa demo: se escribe en los dos idiomas o no se escribe. */
interface Texto {
  es: string
  en: string
}

/** El plan que cuelga de una meta, con el estado en que lo encuentra el visitante. */
interface PlanDeMeta {
  clave: ClavePlan
  /** Día 0 del plan en el calendario (offset respecto a hoy). */
  inicio: number
  /** Se pidió con fecha límite: la de su meta. Sin esto, «sin plazo». */
  conPlazo?: boolean
  horasSemana: number
  /** Días de la semana que Pep@ dijo poder dedicarle (0=domingo … 6=sábado). */
  dias: number[]
  nivel: NivelPartida
  /** Ya está en el cronograma: sus nodos son sub-metas reales con su periodo. */
  aceptado?: boolean
  /** Nodos cumplidos (ids de `NodoPlan`: pre-orden, la fase antes que sus hijos). */
  hechos?: number[]
}

interface MetaDemo {
  nombre: Texto
  /**
   * Día objetivo. SIN VALOR = la meta vive solo en la lista y no ocupa sitio en
   * el calendario; hay una así a propósito en varias apps.
   */
  dia?: number
  completada?: boolean
  /** Cuándo se escribió; por defecto, dos meses antes de su fecha objetivo. */
  nace?: number
  nota?: Texto
  pasos?: Texto[]
  /** Índices de `pasos` ya palomeados. */
  pasosHechos?: number[]
  /** Clave del sub-ámbito; la resuelve quien siembra (`hobby:3`, `ahorro`…). */
  ambito?: string
  hijas?: MetaDemo[]
  plan?: PlanDeMeta
}

interface CarpetaMetas {
  /** El de la plantilla: es el punto de color que el panel pinta en cada fila. */
  color: string
  metas: MetaDemo[]
}

/**
 * El año de Pep@ contado en metas. Las fechas objetivo van repartidas a
 * propósito (ninguna cae el mismo día que otra): amontonadas, la vista de mes
 * del calendario se leería como un solo bloque.
 */
export const METAS_PEP: Record<string, CarpetaMetas> = {
  // ── Cocina · Nutrición ────────────────────────────────────────────────────
  cocina: {
    color: '#f59e0b',
    metas: [
      {
        nombre: { es: 'Comer para el siguiente maratón', en: 'Eat for the next marathon' },
        dia: 150,
        nace: -16,
        plan: {
          clave: 'nutricion',
          inicio: -14,
          conPlazo: true,
          horasSemana: 3,
          dias: [0, 1, 2, 3, 4, 5, 6],
          nivel: 'medio',
          aceptado: true,
          hechos: [2],
        },
      },
      {
        nombre: { es: 'Llegar a 67 kg sin dejar de comer', en: 'Get to 67 kg without giving up food' },
        dia: -20,
        nace: -304,
        completada: true,
        nota: {
          es: 'Siete kilos en nueve meses. Ni una semana de hambre.',
          en: 'Seven kilos in nine months. Not one week of going hungry.',
        },
      },
      {
        // Sin fecha: es la meta que enseña que una meta puede vivir en la lista
        // y no pedirle nada al calendario.
        nombre: { es: 'Cocinar doce recetas nuevas del recetario', en: 'Cook twelve new recipes from the book' },
        nace: -60,
        pasos: [
          { es: 'Elegir tres recetas al empezar el mes', en: 'Pick three recipes at the start of the month' },
          { es: 'Cocinar una entre semana, no solo en domingo', en: 'Cook one on a weekday, not just on Sunday' },
          { es: 'Apuntar en la ficha qué cambiaría', en: 'Note on the card what I would change' },
          { es: 'Repetir las tres que salieron mejor', en: 'Repeat the three that came out best' },
        ],
        pasosHechos: [0, 1],
      },
    ],
  },

  // ── Recámara · Descanso ───────────────────────────────────────────────────
  descanso: {
    color: '#22d3ee',
    metas: [
      {
        nombre: { es: 'Dormirme en menos de 15 minutos', en: 'Fall asleep in under 15 minutes' },
        dia: 35,
        nace: -9,
        plan: {
          clave: 'sueno',
          inicio: -7,
          conPlazo: true,
          horasSemana: 2,
          dias: [0, 1, 2, 3, 4, 5, 6],
          nivel: 'algo',
          aceptado: true,
          hechos: [2],
        },
      },
      {
        nombre: { es: 'Un mes entero durmiendo 7:30 de media', en: 'A whole month averaging 7:30 of sleep' },
        dia: -35,
        nace: -120,
        completada: true,
      },
    ],
  },

  // ── Anecdotario ───────────────────────────────────────────────────────────
  anecdotario: {
    color: '#a78bfa',
    metas: [
      {
        nombre: { es: 'Cerrar el año con doce recuerdos escritos', en: 'Close the year with twelve memories written' },
        dia: 58,
        nace: -8,
        plan: {
          clave: 'memorias',
          inicio: -5,
          conPlazo: true,
          horasSemana: 2,
          dias: [0, 6],
          nivel: 'algo',
          aceptado: true,
          hechos: [2],
        },
      },
      {
        nombre: { es: 'Escribir tres veces por semana', en: 'Write three times a week' },
        dia: -66,
        nace: -240,
        completada: true,
        nota: {
          es: 'Lo que costó no fue escribir: fue no borrarlo al día siguiente.',
          en: 'The hard part was not writing: it was not deleting it the next day.',
        },
      },
    ],
  },

  // ── Jardín · Calma ────────────────────────────────────────────────────────
  // Aquí no hay rachas ni puntos a propósito (es el cuarto que no empuja), así
  // que su plan se queda PROPUESTO: está ahí por si lo quiere, no esperándolo.
  jardin: {
    color: '#4ade80',
    metas: [
      {
        nombre: { es: 'Diez minutos de calma todos los días', en: 'Ten minutes of calm every day' },
        dia: 30,
        nace: -2,
        plan: {
          clave: 'calma',
          inicio: 2,
          conPlazo: true,
          horasSemana: 2,
          dias: [0, 1, 2, 3, 4, 5, 6],
          nivel: 'algo',
        },
      },
      {
        nombre: { es: 'Volver a sentarme después del viaje', en: 'Sit back down after the trip' },
        dia: -95,
        nace: -110,
        completada: true,
        nota: {
          es: 'Tres semanas fuera y el cojín seguía donde lo dejé.',
          en: 'Three weeks away and the cushion was still where I left it.',
        },
      },
    ],
  },

  // ── Hobbies (ámbitos: el hobby 'piano' y sus proyectos 'clair' y 'lunas') ─
  hobbies: {
    color: '#8b5cf6',
    metas: [
      {
        nombre: { es: 'Tocar el Nocturno op. 9 n.º 2', en: 'Play the Nocturne op. 9 no. 2' },
        dia: 120,
        nace: -3,
        ambito: 'piano',
        plan: {
          clave: 'nocturno',
          inicio: 2,
          conPlazo: true,
          horasSemana: 4,
          dias: [1, 3, 5, 6],
          nivel: 'medio',
        },
      },
      {
        nombre: { es: 'Tocarla de memoria, sin partitura', en: 'Play it from memory, no score' },
        dia: -8,
        nace: -200,
        completada: true,
        ambito: 'clair',
      },
      {
        nombre: { es: 'Cazar las cuatro lunas que faltan', en: 'Catch the four moons still missing' },
        dia: 64,
        nace: -296,
        ambito: 'lunas',
        nota: {
          es: 'Van ocho de doce. Faltan las tres del invierno y la de agosto, que se nubló.',
          en: 'Eight of twelve. Missing the three winter ones and August, which clouded over.',
        },
      },
    ],
  },

  // ── Ideas ─────────────────────────────────────────────────────────────────
  ideas: {
    color: '#facc15',
    metas: [
      {
        nombre: { es: 'Convertir la idea del mapa en algo real', en: 'Turn the idea from the map into something real' },
        dia: 75,
        nace: -4,
        plan: {
          clave: 'prototipo',
          inicio: 2,
          conPlazo: true,
          horasSemana: 4,
          dias: [0, 6],
          nivel: 'algo',
          aceptado: true,
        },
      },
      {
        nombre: { es: 'Elegir a qué dedicar el verano', en: 'Decide what to spend the summer on' },
        dia: -140,
        nace: -170,
        completada: true,
        nota: {
          es: 'El diagrama de decisión dijo Japón. La lista de contras cabía en dos líneas.',
          en: 'The decision diagram said Japan. The cons fitted in two lines.',
        },
      },
    ],
  },

  // ── Biblioteca (ya tiene sus dos metas en su propio builder) ──────────────
  biblioteca: {
    color: '#818cf8',
    metas: [
      {
        nombre: { es: 'Cerrar la rama de astrofísica del árbol', en: 'Finish the astrophysics branch of the tree' },
        dia: 45,
        nace: -70,
        pasos: [
          { es: 'Escribir las cinco entradas que faltan', en: 'Write the five missing entries' },
          { es: 'Ilustrar las tres más largas', en: 'Illustrate the three longest ones' },
          { es: 'Enlazarlas con las de mecánica', en: 'Link them to the mechanics ones' },
        ],
        pasosHechos: [0],
      },
    ],
  },

  // ── Sala de cómputo ───────────────────────────────────────────────────────
  computo: {
    color: '#0ea5e9',
    metas: [
      {
        nombre: { es: 'Llevar el formulario de Física II completo al final', en: 'Get the Physics II formula book done by the end' },
        dia: 22,
        nace: -35,
        // Plan PROPUESTO y sin aceptar: en esta parte del año no hay otro así, y
        // es el estado que el visitante casi nunca ve.
        plan: {
          clave: 'formulario',
          inicio: -20,
          conPlazo: true,
          horasSemana: 4,
          dias: [1, 2, 3, 4],
          nivel: 'medio',
        },
      },
      {
        nombre: { es: 'Dejar el costeo de la cafetería en una hoja', en: 'Move the café costing into a spreadsheet' },
        dia: -78,
        nace: -110,
        completada: true,
        nota: {
          es: 'Antes lo hacía de memoria y siempre salía distinto. Ahora cambio el precio del kilo y ya.',
          en: 'I used to do it from memory and it never came out the same. Now I change the price per kilo and that is it.',
        },
        pasos: [
          { es: 'Apuntar lo que cuesta cada insumo', en: 'Write down what each supply costs' },
          { es: 'Montar la fórmula del costo por taza', en: 'Build the cost-per-cup formula' },
          { es: 'Comparar con lo que cobramos', en: 'Compare it with what we charge' },
        ],
        pasosHechos: [0, 1, 2],
      },
      {
        // Sin fecha: vive solo en la lista.
        nombre: { es: 'Entender de una vez la energía potencial', en: 'Finally understand potential energy' },
        nace: -50,
      },
    ],
  },

  // ── Idiomas (ámbitos: 'principal', 'japones') ─────────────────────────────
  idiomas: {
    color: '#f472b6',
    metas: [
      {
        nombre: { es: 'Presentar el B2', en: 'Sit the B2 exam' },
        dia: 180,
        nace: -5,
        ambito: 'principal',
        plan: {
          clave: 'b2',
          inicio: 7,
          conPlazo: true,
          horasSemana: 5,
          dias: [1, 2, 3, 4, 5],
          nivel: 'medio',
        },
      },
      {
        nombre: { es: 'Pedir de comer en japonés sin señalar', en: 'Order food in Japanese without pointing' },
        dia: -130,
        nace: -200,
        completada: true,
        ambito: 'japones',
      },
    ],
  },

  // ── Agenda ────────────────────────────────────────────────────────────────
  agenda: {
    color: '#a855f7',
    metas: [
      {
        nombre: { es: 'Entregar el proyecto semestral', en: 'Hand in the semester project' },
        dia: 16,
        nace: -44,
        plan: {
          clave: 'semestral',
          inicio: -40,
          conPlazo: true,
          horasSemana: 8,
          dias: [1, 2, 3, 4, 5],
          nivel: 'medio',
          aceptado: true,
          // Las dos primeras fases enteras: teoría y laboratorio ya están.
          hechos: [1, 2, 3, 4, 5, 6],
        },
      },
      {
        nombre: { es: 'Cerrar el semestre sin pendientes atrasados', en: 'End the term with no overdue tasks' },
        nace: -50,
        pasos: [
          { es: 'Vaciar la bandeja cada domingo', en: 'Empty the inbox every Sunday' },
          { es: 'Nada en el tablero más de dos semanas', en: 'Nothing on the board for over two weeks' },
          { es: 'Un día a la semana sin citas', en: 'One day a week with no appointments' },
        ],
        pasosHechos: [0],
      },
    ],
  },

  // ── Noticias (el cuarto del diario) ───────────────────────────────────────
  diario: {
    color: '#f472b6',
    metas: [
      {
        nombre: { es: 'Un mes leyendo la edición de la mañana', en: 'A month reading the morning edition' },
        dia: 28,
        nace: -2,
        plan: {
          clave: 'racha',
          inicio: 0,
          conPlazo: true,
          horasSemana: 2,
          dias: [1, 2, 3, 4, 5],
          nivel: 'algo',
          aceptado: true,
        },
      },
      {
        nombre: { es: 'Repartir la edición entre los asistentes', en: 'Share the edition out among the assistants' },
        dia: -30,
        nace: -60,
        completada: true,
      },
    ],
  },

  // ── Entretenimiento (ya tiene su programa de clásicos) ────────────────────
  entretenimiento: {
    color: '#34d399',
    metas: [
      {
        nombre: { es: 'Vaciar los pendientes del archivo', en: 'Empty the archive backlog' },
        dia: 96,
        nace: -6,
        plan: {
          clave: 'archivo',
          inicio: 3,
          conPlazo: true,
          horasSemana: 5,
          dias: [2, 4, 5, 6],
          nivel: 'algo',
        },
      },
    ],
  },

  // ── Garaje ────────────────────────────────────────────────────────────────
  garage: {
    color: '#fbbf24',
    metas: [
      {
        nombre: { es: 'Dejar el coche listo para el invierno', en: 'Get the car ready for winter' },
        dia: 60,
        nace: -14,
        plan: {
          clave: 'coche',
          inicio: -12,
          conPlazo: true,
          horasSemana: 3,
          dias: [0, 6],
          nivel: 'algo',
          aceptado: true,
          hechos: [2],
        },
      },
      {
        nombre: { es: 'Cambiar la transmisión de la bici a los 5 000 km', en: 'Change the bike drivetrain at 5,000 km' },
        dia: 40,
        nace: -40,
        pasos: [
          { es: 'Medir el desgaste de la cadena', en: 'Measure the chain wear' },
          { es: 'Pedir cadena, casete y platos', en: 'Order chain, cassette and chainrings' },
          { es: 'Montarlo en el taller de la esquina', en: 'Have the corner shop fit it' },
        ],
        pasosHechos: [0],
      },
    ],
  },

  // ── Sala · Viajes ─────────────────────────────────────────────────────────
  sala: {
    color: '#2dd4bf',
    metas: [
      {
        nombre: { es: 'Corea del Sur, doce días', en: 'South Korea, twelve days' },
        dia: 341,
        nace: -9,
        plan: {
          clave: 'corea',
          inicio: 330,
          conPlazo: true,
          horasSemana: 2,
          dias: [0, 6],
          nivel: 'cero',
        },
      },
      {
        nombre: { es: 'Tres semanas en Japón', en: 'Three weeks in Japan' },
        dia: -104,
        nace: -300,
        completada: true,
        nota: {
          es: 'Un año de quincenas cabía en veintiún días. Volvería mañana.',
          en: 'A year of paychecks fitted into twenty-one days. I would go back tomorrow.',
        },
      },
    ],
  },

  // ── Despacho · Finanzas (ámbitos fijos de la app: ahorro / deuda) ─────────
  despacho: {
    color: '#60a5fa',
    metas: [
      {
        nombre: { es: 'Fondo de imprevistos de tres meses', en: 'Three-month emergency fund' },
        dia: 175,
        nace: -16,
        ambito: 'ahorro',
        plan: {
          clave: 'fondo',
          inicio: -14,
          conPlazo: true,
          horasSemana: 1,
          dias: [5],
          nivel: 'algo',
          aceptado: true,
          hechos: [1, 2, 3],
        },
      },
      {
        nombre: { es: 'Ahorrar 45 000 para Japón', en: 'Save 45,000 for Japan' },
        dia: -130,
        nace: -280,
        completada: true,
        ambito: 'ahorro',
      },
      {
        nombre: { es: 'Terminar de pagar la reparación del coche', en: 'Finish paying off the car repair' },
        dia: -62,
        nace: -178,
        completada: true,
        ambito: 'deuda',
        nota: {
          es: 'Cuatro meses. Y la lección: sin fondo, la grúa la paga el viaje.',
          en: 'Four months. And the lesson: with no fund, the tow truck is paid by the trip.',
        },
      },
    ],
  },
}

/** Ámbitos que la app resuelve al sembrar (`piano` → `hobby:3`). */
export type AmbitosDemo = Record<string, string>

export interface OpcionesMetas {
  /**
   * Primer `orden` libre: las apps que ya siembran metas propias en su builder
   * (biblioteca, entretenimiento, idiomas) pasan cuántas llevan, o las nuevas
   * saldrían empatadas con ellas y el panel las ordenaría por fecha de creación.
   */
  ordenDesde?: number
  ambitos?: AmbitosDemo
}

/**
 * Siembra las metas de una app (y sus planes). La llama el builder de esa app,
 * al final de su año: las metas hablan de lo que ya está sembrado.
 */
export async function sembrarMetasApp(
  ctx: CtxDemo,
  app: string,
  opts: OpcionesMetas = {},
): Promise<void> {
  const carpeta = METAS_PEP[app]
  if (!carpeta) return
  const desde = opts.ordenDesde ?? 0
  for (const [i, meta] of carpeta.metas.entries()) {
    await sembrarMeta(ctx, app, meta, {
      color: carpeta.color,
      orden: desde + i,
      profundidad: 0,
      ambitos: opts.ambitos ?? {},
    })
  }
}

interface Sitio {
  color: string
  orden: number
  profundidad: number
  ambitos: AmbitosDemo
  padreId?: number
  /** El de la madre: una sub-meta no vuelve a declarar su ámbito. */
  ambitoId?: string
}

async function sembrarMeta(ctx: CtxDemo, app: string, meta: MetaDemo, sitio: Sitio): Promise<void> {
  const idioma = ctx.idioma
  const enHora = (off: number, hora: string) => `${ctx.fecha(off)}T${hora}:00.000Z`
  // Sin `nace`, se da por escrita dos meses antes de su fecha (o hace uno, si no
  // tiene): `creadoEn` es lo que ordena la lista cuando el `orden` empata.
  const nace = meta.nace ?? (meta.dia != null ? Math.max(-364, meta.dia - 60) : -30)
  const ambitoId = sitio.ambitoId ?? (meta.ambito ? sitio.ambitos[meta.ambito] : undefined)
  const pasos: PasoRutina[] = (meta.pasos ?? []).map((p) => ({ titulo: p[idioma], roomId: '' }))

  const id = await rutinasRepo.add({
    nombre: meta.nombre[idioma],
    emoji: '🎯',
    dias: [],
    pasos,
    ...(meta.pasosHechos ? { pasosHechos: [...meta.pasosHechos] } : {}),
    activa: true,
    esMeta: true,
    repeticion: 'una_vez',
    ...(meta.completada ? { completada: true } : {}),
    // Fecha objetivo suelta, nunca un rango: un rango pintaría la meta en todos
    // los días que abarca.
    ...(meta.dia != null ? { fechaInicio: ctx.fecha(meta.dia) } : {}),
    ...(meta.nota ? { nota: meta.nota[idioma] } : {}),
    color: sitio.profundidad === 0 ? sitio.color : colorPorProfundidad(sitio.color, sitio.profundidad),
    orden: sitio.orden,
    ...(sitio.padreId != null ? { padreId: sitio.padreId } : {}),
    plantillaId: app,
    ...(ambitoId ? { ambitoId } : {}),
    creadoEn: enHora(nace, '09:00'),
  })
  if (typeof id !== 'number') return

  for (const [i, hija] of (meta.hijas ?? []).entries()) {
    await sembrarMeta(ctx, app, hija, {
      ...sitio,
      orden: i,
      profundidad: sitio.profundidad + 1,
      padreId: id,
      ambitoId,
    })
  }

  if (meta.plan) await sembrarPlan(ctx, meta, meta.plan, id, sitio.color)
}

async function sembrarPlan(
  ctx: CtxDemo,
  meta: MetaDemo,
  def: PlanDeMeta,
  metaId: number,
  color: string,
): Promise<void> {
  const enHora = (off: number, hora: string) => `${ctx.fecha(off)}T${hora}:00.000Z`
  const planId = await sembrarPlanDemo({
    metaId,
    clave: def.clave,
    plan: PLANES_DEMO[ctx.idioma][def.clave],
    inicioISO: ctx.fecha(def.inicio),
    entrada: {
      fechaInicio: ctx.fecha(def.inicio),
      ...(def.conPlazo && meta.dia != null ? { fechaObjetivo: ctx.fecha(meta.dia) } : {}),
      horasSemana: def.horasSemana,
      dias: [...def.dias],
      nivel: def.nivel,
    },
    // Se generó la víspera de su día 0 (o de hoy, si el plan empieza más
    // adelante: nadie pide un plan y lo guarda un año antes de generarlo).
    creadoEn: enHora(Math.min(-1, def.inicio - 1), '20:00'),
    hechos: def.hechos,
  })
  if (!def.aceptado) return

  // Aceptar de verdad, con la misma función que la hoja del plan: es quien sabe
  // crear las sub-metas al derecho, ponerles el periodo y amarrar cada nodo con
  // la meta que nació de él (ver `aceptarPlan`).
  const vivas = (await rutinasRepo.list()).filter(esMeta)
  const guardado = (await planesMetaRepo.list()).find((p) => p.id === planId)
  const origen = vivas.find((m) => m.id === metaId)
  if (guardado && origen)
    await aceptarPlan(vivas, guardado, origen, (p) => colorPorProfundidad(color, p + 1))
  await planesMetaRepo.update(planId, { aceptadoEn: enHora(Math.min(0, def.inicio), '09:30') })
}
