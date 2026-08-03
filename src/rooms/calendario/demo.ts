/**
 * Año demo del calendario: los horarios de Pep@ y, sobre todo, EL ARCO DE
 * DISCIPLINA. Las palomitas no son un adorno: cuentan la historia del año en el
 * panel de Metas — arranca cumpliendo un tercio, agarra ritmo, se cae en el
 * bache del mes 7, desaparece las tres semanas de Japón y cierra en ~85 %.
 *
 * Dos reglas duras del panel (`core/ui/calendario/metricas.ts`):
 *  - `naceEn` = max(fechaInicio, creadoEn) → sin retrofechar `creadoEn`, la
 *    rutina no aporta NADA al año (todo su pasado queda antes de nacer).
 *  - una rutina sin pasos solo cuenta con `hecho: true` en `ejecucionesRutina`.
 *    Nada deriva el cumplimiento pasado de los datos de las apps: el histórico
 *    se escribe aquí.
 */
import { ejecucionesRutinaRepo, rutinasRepo } from '../../core/data/repository'
import { deIso } from '../../core/fechaLocal'
import { rngDemo, type CtxDemo } from '../../demo/builders'

/** Los hábitos del año, con el mes en que Pep@ los adoptó. */
const HABITOS = [
  {
    clave: 'turno',
    nombre: { es: 'Turno en la cafetería', en: 'Shift at the coffee shop' },
    emoji: '☕',
    hora: '07:00',
    horaFin: '13:00',
    dias: [1, 3, 5],
    color: '#f59e0b',
    nace: -364,
  },
  {
    clave: 'clases',
    nombre: { es: 'Clases de física', en: 'Physics classes' },
    emoji: '📐',
    hora: '16:00',
    horaFin: '19:00',
    dias: [2, 4],
    color: '#3b82f6',
    nace: -364,
  },
  {
    clave: 'estudiar',
    nombre: { es: 'Estudiar física', en: 'Study physics' },
    emoji: '📚',
    hora: '19:30',
    horaFin: '20:30',
    dias: [1, 2, 3, 4],
    color: '#a78bfa',
    nace: -350,
  },
  {
    clave: 'dormir',
    nombre: { es: 'Apagar todo y dormir', en: 'Screens off, sleep' },
    emoji: '😴',
    hora: '23:30',
    horaFin: '23:45',
    dias: [],
    color: '#64748b',
    nace: -334,
  },
  {
    clave: 'piano',
    nombre: { es: 'Piano 20 minutos', en: 'Piano, 20 minutes' },
    emoji: '🎹',
    hora: '20:45',
    horaFin: '21:05',
    dias: [],
    color: '#f472b6',
    nace: -334,
  },
  {
    clave: 'idioma',
    nombre: { es: 'Repaso de idioma', en: 'Language review' },
    emoji: '🌐',
    hora: '21:15',
    horaFin: '21:30',
    dias: [],
    color: '#14b8a6',
    nace: -320,
  },
  {
    clave: 'meditar',
    nombre: { es: 'Meditar antes de salir', en: 'Meditate before heading out' },
    emoji: '🧘',
    hora: '07:45',
    horaFin: '08:00',
    dias: [1, 2, 3, 4, 5],
    color: '#10b981',
    nace: -304,
  },
  {
    clave: 'correr',
    nombre: { es: 'Salir a correr', en: 'Go for a run' },
    emoji: '🏃',
    hora: '06:30',
    horaFin: '07:30',
    dias: [1, 3, 6],
    color: '#ef4444',
    nace: -300,
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
  const DIA_MOVIDO = -47

  for (const h of HABITOS) {
    const rutinaId = await rutinasRepo.add({
      nombre: h.nombre[idioma],
      emoji: h.emoji,
      hora: h.hora,
      horaFin: h.horaFin,
      dias: [...h.dias],
      repeticion: h.dias.length > 0 ? 'semanal' : 'indefinido',
      fechaInicio: ctx.fecha(h.nace),
      color: h.color,
      pasos: [],
      activa: true,
      avisar: true,
      // Retrofechado: es lo que decide `naceEn` y, con él, todo el histórico.
      creadoEn: `${ctx.fecha(h.nace)}T09:00:00.000Z`,
      ...(h.clave === 'turno' ? { excepciones: [ctx.fecha(DIA_MOVIDO)] } : {}),
    })

    const hechos: { rutinaId: number; fecha: string; pasosHechos: number[]; hecho: boolean }[] = []
    const dias: readonly number[] = h.dias
    for (let off: number = h.nace; off <= 0; off++) {
      if (h.clave === 'turno' && off === DIA_MOVIDO) continue // ese día se movió
      if (dias.length > 0 && !dias.includes(deIso(ctx.fecha(off)).getDay())) continue
      if (r() >= probabilidad(h.clave, off)) continue
      hechos.push({ rutinaId, fecha: ctx.fecha(off), pasosHechos: [], hecho: true })
    }
    await ejecucionesRutinaRepo.bulkAdd(hechos)
  }

  // El turno movido: bloque suelto de un solo día, ya cumplido.
  const movidoId = await rutinasRepo.add({
    nombre: idioma === 'es' ? 'Turno en la cafetería' : 'Shift at the coffee shop',
    emoji: '☕',
    hora: '10:00',
    horaFin: '16:00',
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
}
