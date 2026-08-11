/**
 * Año demo del diario: el hábito de leer las noticias de la mañana.
 *
 * No hay contenido que sembrar —la edición se descarga cada día y es efímera—,
 * así que lo que cuenta la historia son las LECTURAS: cuándo Pep@ mantuvo el
 * hábito y cuándo lo soltó. Y el reparto por asistentes, para que el demo
 * enseñe la función estrella del cuarto sin tener que configurarla.
 */
import { lecturasDiarioRepo } from '../../core/data/repository'
import { rngDemo, type CtxDemo } from '../../demo/builders'
import { enJapon } from '../../demo/hitosPep'
import { sembrarMetasApp } from '../../demo/metasPep'
import { setProgramaciones } from './reparto'

/** Constancia del hábito según el mes del año. */
function probabilidad(off: number): number {
  if (off >= -20) return 1 // las últimas tres semanas: racha viva
  if (enJapon(off)) return 0.12 // en Japón las noticias de casa dan igual
  if (off >= -103) return 0.85 // meses 10-12, remontada
  if (off >= -154) return 0.6 // mes 8, recuperación
  if (off >= -184) return 0.35 // el bache del mes 7: lo abandona
  if (off >= -304) return 0.55 + ((off + 304) / 120) * 0.2 // meses 3-6, sube
  return 0.25 // meses 1-2: apenas lo descubre
}

export async function construirDemoDiario(ctx: CtxDemo): Promise<void> {
  const r = rngDemo(19570104)

  // `lecturasDiario` tiene índice único por fecha: un Set evita el choque.
  const dias = new Set<number>()
  for (let off = -364; off <= 0; off++) {
    if (r() < probabilidad(off)) dias.add(off)
  }
  // El día 0 SIEMPRE: al abrir el cuarto, `marcarVisto()` escribe la lectura de
  // hoy y sin ella la racha nacería rota.
  dias.add(0)

  await lecturasDiarioRepo.bulkAdd([...dias].sort((a, b) => a - b).map((off) => ({ fecha: ctx.fecha(off) })))

  // El reparto: el mago trae lo serio a primera hora y Laika lo ligero cuando
  // le da la gana (los dos asistentes que viven en la casa demo).
  setProgramaciones([
    {
      id: 'demo-manana',
      asistenteId: 'mago',
      secciones: ['mundo', 'tecnologia', 'economia'],
      modo: 'hora',
      hora: '07:30',
    },
    {
      id: 'demo-tarde',
      asistenteId: 'custom-laika',
      // Lo ligero: espectáculos, más la palabra, la frase y la especie del día.
      secciones: ['entretenimiento', 'ef:palabra', 'ef:frase', 'ef:especie'],
      modo: 'aleatoria',
    },
  ])

  // La racha viva de las últimas semanas, convertida en meta con su plan.
  await sembrarMetasApp(ctx, 'diario')
}
