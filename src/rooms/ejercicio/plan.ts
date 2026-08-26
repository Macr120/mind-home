import type { NivelPartida } from '../../core/data/db'
import {
  perfilEjercicioRepo,
  rutinasCardioRepo,
  rutinasFlexRepo,
  rutinasFuerzaRepo,
  sesionesEjercicioRepo,
} from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { CLAUSULA_RECHAZO, CLAUSULA_SALUD, type ContextoPlanApp } from '../../core/planIA'
import { tGlobal } from '../../core/i18n/useT'

/**
 * Acotamiento del planificador ✨ en ejercicio: plan de entrenamiento en
 * mesociclos, de UNA disciplina cuando la meta la nombra, calibrado con el
 * objetivo semanal y el historial real de sesiones.
 */

const GUIA = [
  'La meta es de la app de Ejercicio: eres un entrenador y el plan es SIEMPRE de entrenamiento físico (fuerza, resistencia o flexibilidad).',
  'Si la meta nombra una disciplina (fuerza/pesas, resistencia/cardio o flexibilidad/movilidad), el plan entero es SOLO de esa disciplina — y las rutinas que elijas, de ese mismo tipo; mixto únicamente si la meta es general.',
  'Las fases son mesociclos progresivos (adaptación, construcción, intensificación, pico o descarga).',
  'Los hijos son logros físicos medibles («Correr 5 km sin parar», «Sentadilla con 60 kg», «3 sesiones de fuerza por semana»).',
  'Progresa el volumen poco a poco y respeta días de descanso; nada de dietas ni temas ajenos al entrenamiento.',
  CLAUSULA_SALUD,
  CLAUSULA_RECHAZO('el ejercicio o el entrenamiento físico'),
]

/** Nivel de partida derivado del historial: sesiones en los últimos 60 días. */
const nivelPorSesiones = (n: number): NivelPartida =>
  n === 0 ? 'cero' : n < 8 ? 'algo' : n < 24 ? 'medio' : 'avanzado'

export async function planMetasEjercicio(): Promise<ContextoPlanApp> {
  const hoy = fechaLocalISO()
  const contexto: string[] = []

  const perfil = (await perfilEjercicioRepo.list())[0]
  if (perfil)
    contexto.push(
      `Objetivo semanal: ${perfil.sesionesFuerzaSemana} sesiones de fuerza, ${perfil.minutosResistenciaSemana} min de resistencia, ${perfil.minutosFlexibilidadSemana} min de flexibilidad, ${perfil.diasActivosSemana} días activos.`,
    )

  const sesiones = await sesionesEjercicioRepo.list()
  const d30 = isoMasDias(hoy, -29)
  const recientes = sesiones.filter((s) => s.fecha >= d30 && s.fecha <= hoy)
  if (recientes.length > 0) {
    const por = (tipo: string) => recientes.filter((s) => s.tipo === tipo).length
    const min = recientes.reduce((s, x) => s + x.duracionMin, 0)
    const conRpe = recientes.filter((s) => s.rpe != null)
    const rpe = conRpe.length
      ? ` RPE promedio ${(conRpe.reduce((s, x) => s + (x.rpe ?? 0), 0) / conRpe.length).toFixed(1)}.`
      : ''
    contexto.push(
      `Últimos 30 días: ${recientes.length} sesiones (${por('fuerza')} fuerza, ${por('resistencia')} resistencia, ${por('flexibilidad')} flexibilidad), ${min} min totales.${rpe}`,
    )
  }

  const d60 = isoMasDias(hoy, -59)
  const nivel = nivelPorSesiones(sesiones.filter((s) => s.fecha >= d60 && s.fecha <= hoy).length)

  // El material son las rutinas YA creadas (las mismas que se ofrecen como
  // agendables): aquí la IA además justifica el PAPEL de cada una en el plan.
  const [fuerza, cardio, flex] = await Promise.all([
    rutinasFuerzaRepo.list(),
    rutinasCardioRepo.list(),
    rutinasFlexRepo.list(),
  ])
  const item = (tipo: string) => (r: { nombre: string; duracionMin: number; ejercicios: string[] }) => ({
    nombre: r.nombre,
    detalle: `${tipo} · ${r.duracionMin} min · ${r.ejercicios.length} ejercicios`,
  })
  const items = [
    ...fuerza.map(item('fuerza')),
    ...cardio.map(item('resistencia')),
    ...flex.map(item('flexibilidad')),
  ]
  const material =
    items.length > 0
      ? {
          titulo: tGlobal('ejercicio.plan.material', 'Rutinas del plan'),
          instruccion:
            'El material son las rutinas de entrenamiento YA creadas del usuario. Elige las que sirven a la meta (de SU disciplina si la meta nombra una) y en el motivo di su papel en el plan: en qué fase encaja y qué desarrolla. Deja "rutina" vacía.',
          items,
        }
      : undefined

  return { guia: GUIA, contexto, nivel, ejemplo: tGlobal('ejercicio.plan.ejemplo', 'Correr 5 km sin parar'), material }
}
