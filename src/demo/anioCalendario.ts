/**
 * Año demo del calendario: los horarios de Pep@ y, sobre todo, EL ARCO DE
 * DISCIPLINA. Las palomitas no son un adorno: cuentan la historia del año en el
 * panel de Metas — arranca cumpliendo un tercio, agarra ritmo, se cae en el
 * bache del mes 7, desaparece las tres semanas de Japón y cierra en ~85 %.
 *
 * Vive aquí y no en `rooms/` porque el calendario ya no es una app de cuarto:
 * es del núcleo (el reloj del HUD). Sigue registrado en `BUILDERS_DEMO` con la
 * clave 'calendario' —una clave sin plantilla— y lo dispara el propio modal al
 * abrirse dentro del demo.
 *
 * Dos reglas duras del panel (`core/ui/calendario/metricas.ts`):
 *  - `naceEn` = max(fechaInicio, creadoEn) → sin retrofechar `creadoEn`, la
 *    rutina no aporta NADA al año (todo su pasado queda antes de nacer).
 *  - una rutina sin pasos solo cuenta con `hecho: true` en `ejecucionesRutina`.
 *    Nada deriva el cumplimiento pasado de los datos de las apps: el histórico
 *    se escribe aquí.
 */
import { ejecucionesRutinaRepo, rutinasRepo } from '../core/data/repository'
import { deIso } from '../core/fechaLocal'
import { idActividadSugerencia } from '../core/objetivosSugeridos'
import { rngDemo, type CtxDemo } from './builders'
import { bloqueFijo } from './horarioPep'
import { PLANES_DEMO, sembrarPlanDemo } from './planesPep'
import { enIdioma } from '../core/i18n/porIdioma'

/**
 * Los hábitos del año, con el mes en que Pep@ los adoptó. La HORA y los DÍAS no
 * se escriben aquí: salen de `SEMANA_PEP` (`horarioPep.ts`), que es lo que
 * garantiza que estos bloques no se pisen entre ellos ni con lo que proyectan
 * la agenda y el garaje.
 *
 * `app`/`sug` los atan al catálogo de objetivos sugeridos (`objetivosSugeridos.ts`):
 * con ellos, el hábito de Pep@ ES el objetivo de esa app —sale palomeado en su
 * catálogo y su fila lleva al sitio donde se registra—, en vez de una fila suelta
 * que no sabe de dónde viene. Turno y clases se quedan SIN app a propósito: son
 * los objetivos personales de la casa, y el catálogo no tiene (ni debe tener) un
 * equivalente honesto para un turno de cafetería.
 */
const HABITOS = [
  {
    clave: 'turno',
    nombre: { es: 'Turno en la cafetería', en: 'Shift at the coffee shop' },
    emoji: '☕',
    color: '#f59e0b',
    nace: -364,
  },
  {
    clave: 'clases',
    nombre: { es: 'Clases de física', en: 'Physics classes' },
    emoji: '📐',
    color: '#3b82f6',
    nace: -364,
  },
  {
    clave: 'estudiar',
    nombre: { es: 'Estudiar física', en: 'Study physics' },
    emoji: '📚',
    color: '#a78bfa',
    nace: -350,
    app: 'biblioteca',
    seccion: 'estudio',
    sug: 'estudiar',
  },
  {
    clave: 'pantallas',
    nombre: { es: 'Apagar todo y dormir', en: 'Screens off, sleep' },
    emoji: '😴',
    color: '#64748b',
    nace: -334,
    app: 'descanso',
    seccion: 'sueno',
    sug: 'pantallas',
  },
  {
    clave: 'piano',
    nombre: { es: 'Piano 20 minutos', en: 'Piano, 20 minutes' },
    emoji: '🎹',
    color: '#f472b6',
    nace: -334,
    app: 'hobbies',
    seccion: 'hobbies',
    sug: 'practicar',
  },
  {
    clave: 'idioma',
    nombre: { es: 'Repaso de idioma', en: 'Language review' },
    emoji: '🌐',
    color: '#14b8a6',
    nace: -320,
    app: 'idiomas',
    seccion: 'repaso',
    sug: 'repaso',
  },
  {
    clave: 'meditar',
    nombre: { es: 'Meditar antes de salir', en: 'Meditate before heading out' },
    emoji: '🧘',
    color: '#10b981',
    nace: -304,
    app: 'jardin',
    seccion: 'meditacion',
    sug: 'meditar',
  },
  {
    clave: 'correr',
    nombre: { es: 'Salir a correr', en: 'Go for a run' },
    emoji: '🏃',
    color: '#ef4444',
    nace: -300,
    app: 'ejercicio',
    seccion: 'resistencia',
    sug: 'cardio',
  },
] as const

/** La curva del año: el arco de disciplina que se lee en el panel de Metas. */
function base(off: number): number {
  if (off >= -124 && off <= -100) return 0.1 // Japón: la casa en pausa
  if (off >= -184 && off <= -155) return 0.15 // el bache del mes 7
  if (off < -305) return 0.38 // meses 1-2: empezar cuesta
  if (off < -185) return 0.52 // meses 3-6: agarra ritmo
  if (off < -125) return 0.55 // mes 8: recuperación
  return 0.85 // meses 10-12: ya es quien quería ser
}

/**
 * Ajuste por hábito. El bache y el viaje no golpean a todos igual: el piano y
 * la meditación son justo lo que lo sostiene, correr desaparece con la lesión,
 * y en Japón el idioma se practica más que nunca.
 *
 * Ojo con turno y clases: son obligaciones, pero lo que mide el panel no es si
 * Pep@ fue a trabajar, sino si lo REGISTRÓ. Los dos primeros meses aún no tenía
 * ese hábito, así que no llevan ventaja — es justo lo que hace que el año
 * arranque abajo.
 */
function probabilidad(clave: string, off: number): number {
  const enBache = off >= -184 && off <= -155
  const enJapon = off >= -124 && off <= -100
  const obligacion = clave === 'turno' || clave === 'clases'
  if (enJapon) {
    if (clave === 'idioma') return 0.7 // allí lo usa de verdad
    if (clave === 'meditar') return 0.2
    return 0 // turnos, clases, piano y carrera: pausados
  }
  if (enBache) {
    if (clave === 'correr') return 0 // tres semanas de rodilla
    if (clave === 'piano' || clave === 'meditar') return 0.8 // lo que lo sostiene
    if (obligacion) return 0.35 // va, pero apenas apunta nada
    return 0.15
  }
  const b = base(off)
  if (obligacion) return off < -305 ? b : Math.min(0.95, b + 0.22)
  // Volver a correr tras la lesión es progresivo.
  if (clave === 'correr' && off > -155 && off < -125) return 0.45
  return b
}

export async function construirDemoCalendario(ctx: CtxDemo): Promise<void> {
  const r = rngDemo(12071905)
  const idioma = ctx.idioma

  // Un turno que Pep@ movió un día concreto: la serie salta esa fecha
  // (`excepciones`) y en su lugar queda un bloque suelto al día siguiente.
  // Tiene que caer en un día DE TURNO —si no, la excepción no salta nada y el
  // bloque suelto acaba encimado sobre el turno del día siguiente—, así que se
  // busca el primero hacia atrás desde la tercera semana.
  const diasTurno = bloqueFijo('turno').dias
  let DIA_MOVIDO = -47
  while (!diasTurno.includes(deIso(ctx.fecha(DIA_MOVIDO)).getDay())) DIA_MOVIDO--

  for (const h of HABITOS) {
    const fijo = bloqueFijo(h.clave)
    const rutinaId = await rutinasRepo.add({
      nombre: enIdioma(h.nombre, idioma),
      emoji: h.emoji,
      hora: fijo.hora,
      horaFin: fijo.horaFin,
      dias: [...fijo.dias],
      repeticion: fijo.dias.length > 0 ? 'semanal' : 'indefinido',
      fechaInicio: ctx.fecha(h.nace),
      color: h.color,
      // SIN pasos, y no es un olvido: el año de cumplimiento se escribe abajo con
      // `hecho: true` y `pasosHechos: []`, y una rutina CON pasos deja de mirar
      // `hecho` para mirar `pasosHechos` (ver la cabecera de este archivo). Darles
      // registro de un toque tiraría el 81 % del panel a cero de un plumazo.
      pasos: [],
      activa: true,
      avisar: true,
      // Lo que los ata a su app: el objetivo del catálogo que Pep@ ya tenía puesto.
      ...('app' in h ? { plantillaId: h.app, seccion: h.seccion, actividadId: idActividadSugerencia(h.app, h.sug) } : {}),
      // Retrofechado: es lo que decide `naceEn` y, con él, todo el histórico.
      creadoEn: `${ctx.fecha(h.nace)}T09:00:00.000Z`,
      ...(h.clave === 'turno' ? { excepciones: [ctx.fecha(DIA_MOVIDO)] } : {}),
    })

    const hechos: { rutinaId: number; fecha: string; pasosHechos: number[]; hecho: boolean }[] = []
    const dias: readonly number[] = fijo.dias
    for (let off: number = h.nace; off <= 0; off++) {
      if (h.clave === 'turno' && off === DIA_MOVIDO) continue // ese día se movió
      if (dias.length > 0 && !dias.includes(deIso(ctx.fecha(off)).getDay())) continue
      if (r() >= probabilidad(h.clave, off)) continue
      hechos.push({ rutinaId, fecha: ctx.fecha(off), pasosHechos: [], hecho: true })
    }
    await ejecucionesRutinaRepo.bulkAdd(hechos)
  }

  // El turno movido: bloque suelto de un solo día, ya cumplido. Cae en un día
  // sin turno (el siguiente a uno de turno) y termina antes de la toma de
  // vitamina de las 14:00, así que no se encima con nada.
  const movidoId = await rutinasRepo.add({
    nombre: idioma === 'es' ? 'Turno en la cafetería' : 'Shift at the coffee shop',
    emoji: '☕',
    hora: '09:00',
    horaFin: '14:00',
    dias: [],
    repeticion: 'una_vez',
    fechaInicio: ctx.fecha(DIA_MOVIDO + 1),
    color: '#f59e0b',
    pasos: [],
    activa: true,
    nota: idioma === 'es' ? 'Cambié el turno con Nuria.' : 'Swapped shifts with Nuria.',
    creadoEn: `${ctx.fecha(DIA_MOVIDO - 2)}T18:00:00.000Z`,
  })
  await ejecucionesRutinaRepo.bulkAdd([
    { rutinaId: movidoId, fecha: ctx.fecha(DIA_MOVIDO + 1), pasosHechos: [], hecho: true },
  ])

  // ── La obra de la cocina: la única meta SIN app de toda la casa ───────────
  // No la agenda ninguna plantilla, la escribió Pep@ a mano en el calendario, y
  // la puso en una categoría suya. Es lo que enseña en el panel de Metas que los
  // grupos no son solo las apps. Color explícito: `colorDe` no lo deriva de la
  // plantilla, así que sin él saldría con el primero de la paleta.
  const cocina = enIdioma(PLANES_DEMO, idioma).cocina
  const cocinaId = await rutinasRepo.add({
    nombre: cocina.meta!,
    emoji: '🎯',
    dias: [],
    pasos: [],
    activa: true,
    esMeta: true,
    repeticion: 'una_vez',
    // Una fecha objetivo sola, no un rango: coincide con el último día del plan.
    fechaInicio: ctx.fecha(70),
    color: '#f59e0b',
    orden: 0,
    categoriaMeta: cocina.categoria,
    creadoEn: `${ctx.fecha(-24)}T21:00:00.000Z`,
  })
  // Este sí llevaba fecha límite: 13 semanas para llegar a la fecha de la meta.
  await sembrarPlanDemo({
    metaId: cocinaId,
    clave: 'cocina',
    plan: cocina,
    inicioISO: ctx.fecha(-20),
    entrada: {
      fechaInicio: ctx.fecha(-20),
      fechaObjetivo: ctx.fecha(70),
      horasSemana: 5,
      dias: [0, 6],
      nivel: 'algo',
    },
    creadoEn: `${ctx.fecha(-22)}T21:30:00.000Z`,
    hechos: [2, 3],
  })
}
