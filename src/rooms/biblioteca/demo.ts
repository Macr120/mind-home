/**
 * Año demo de la biblioteca: la carrera de Física de Pep@ vista desde su
 * enciclopedia personal. Las fichas y las charlas con el tutor vienen del
 * contenido generado; las sesiones de estudio son algorítmicas y siguen el
 * calendario académico — se disparan antes de cada parcial (meses 2, 5, 8 y 11)
 * y desaparecen las tres semanas de Japón.
 */
import {
  conversacionesBiblioRepo,
  entradasBiblioRepo,
  fijarObjetivoDiario,
  mensajesBiblioRepo,
  rutinasRepo,
  sesionesEstudioRepo,
  temasArbolRepo,
} from '../../core/data/repository'
import { rngDemo, type CtxDemo } from '../../demo/builders'
import { DEMO_BIBLIOTECA } from './demo.data'

/** El pilar al que pertenece cada tema del temario que usa el contenido. */
const pilarDe = (tema: string) => (tema.startsWith('mat-') ? 'matematicas' : 'naturales')

/** Semanas de parcial: los días previos Pep@ estudia casi a diario. */
const PARCIALES = [-330, -210, -150, -60]

function probabilidad(off: number): number {
  if (off < -352) return 0 // el hábito de registrar el estudio nace en el mes 1
  if (off >= -124 && off <= -100) return 0 // Japón: la carrera se queda en casa
  if (PARCIALES.some((p) => off >= p - 12 && off <= p)) return 0.9 // semanas de parcial
  if (off >= -184 && off <= -155) return 0.35 // el bache también pega aquí
  if (off < -305) return 0.3 // meses 1-2
  if (off < -185) return 0.55 // meses 3-6
  if (off < -125) return 0.5 // mes 8
  return 0.65 // meses 10-12
}

export async function construirDemoBiblioteca(ctx: CtxDemo): Promise<void> {
  const datos = DEMO_BIBLIOTECA[ctx.idioma]
  const es = ctx.idioma === 'es'
  const r = rngDemo(14031879)
  const enHora = (off: number, hora: string) => `${ctx.fecha(off)}T${hora}:00.000Z`

  // ── Charlas con el tutor: cada una deja su rama viva en el árbol ─────────
  // Se crean antes que las entradas para poder colgarles `conversacionId`.
  const convPorDia = new Map<number, number>()
  for (const [i, ch] of datos.charlas.entries()) {
    const convId = await conversacionesBiblioRepo.add({
      titulo: ch.titulo,
      pilarId: 'naturales',
      creadoEn: enHora(ch.dia, '19:00'),
      actualizadoEn: enHora(ch.dia, '19:12'),
      ramificadaEn: enHora(ch.dia, '19:12'),
    })
    convPorDia.set(ch.dia, convId)
    await mensajesBiblioRepo.bulkAdd([
      { conversacionId: convId, rol: 'usuario', texto: ch.pregunta, creado: enHora(ch.dia, '19:00') },
      { conversacionId: convId, rol: 'asistente', texto: ch.respuesta, creado: enHora(ch.dia, '19:01') },
    ])
    // Las ramas que abrió la charla, colgadas del campo (raíz del pilar).
    await temasArbolRepo.bulkAdd(
      ch.ramas.map((titulo, j) => ({
        temaId: `din-demo-bib-${i}-${j}`,
        pilarId: 'naturales',
        padreId: null,
        titulo,
        descripcion: es
          ? 'Salió hablando con el tutor; lo dejé apuntado para volver.'
          : 'Came up while talking with the tutor; noted it to come back to it.',
        creadoEn: enHora(ch.dia, '19:10'),
        conversacionId: convId,
      })),
    )
  }

  // ── Las fichas de la enciclopedia ────────────────────────────────────────
  const entradaPorDia = new Map<number, number>()
  for (const e of datos.entradas) {
    // `as const` del contenido generado: solo algunas entradas traen `foto`.
    const clave = 'foto' in e ? e.foto : undefined
    const imagen = clave ? await ctx.foto(`biblioteca/${clave}`) : null
    // Si ese día hubo charla, la ficha queda ligada a ella (así la app muestra
    // «destilada de una conversación»).
    const conversacionId = convPorDia.get(e.dia)
    const id = await entradasBiblioRepo.add({
      pilarId: pilarDe(e.tema),
      temaId: e.tema,
      titulo: e.titulo,
      resumen: e.resumen,
      puntosClave: [...e.puntosClave],
      ...(imagen ? { imagen } : {}),
      ...(conversacionId ? { conversacionId } : {}),
      creadoEn: enHora(e.dia, '20:00'),
      actualizadoEn: enHora(e.dia, '20:00'),
    })
    entradaPorDia.set(e.dia, id)
  }

  // ── Las sesiones de estudio del año ──────────────────────────────────────
  type Sesion = { pilarId: string; minutos: number; fecha: string; nota?: string; entradaId?: number }
  const sesiones: Sesion[] = []
  const porDia = new Map<number, Sesion>()

  const entradasOrdenadas = [...datos.entradas].sort((a, b) => a.dia - b.dia)
  /** La ficha que estaba escribiendo por esas fechas (la más reciente antes). */
  const entradaCercana = (off: number): number | undefined => {
    const previa = entradasOrdenadas.filter((e) => e.dia <= off && off - e.dia <= 20).pop()
    return previa ? entradaPorDia.get(previa.dia) : undefined
  }

  for (let off = -364; off <= 0; off++) {
    if (r() >= probabilidad(off)) continue
    const enParcial = PARCIALES.some((p) => off >= p - 12 && off <= p)
    const fila: Sesion = {
      pilarId: 'naturales',
      minutos: enParcial ? 45 + Math.floor(r() * 40) : 20 + Math.floor(r() * 25),
      fecha: ctx.fecha(off),
    }
    const ligada = entradaCercana(off)
    if (ligada != null && r() < 0.4) fila.entradaId = ligada
    sesiones.push(fila)
    porDia.set(off, fila)
  }

  // Las notas generadas se cuelgan de la sesión de su día (o crean una).
  for (const n of datos.notasEstudio) {
    const existente = porDia.get(n.dia)
    if (existente) {
      existente.nota = n.nota
      continue
    }
    const fila: Sesion = {
      pilarId: 'naturales',
      minutos: 30,
      fecha: ctx.fecha(n.dia),
      nota: n.nota,
    }
    sesiones.push(fila)
    porDia.set(n.dia, fila)
  }
  await sesionesEstudioRepo.bulkAdd(sesiones)

  await fijarObjetivoDiario('biblioteca', 25)

  // ── Cronograma: la meta que cumplió y la que tiene viva ──────────────────
  await rutinasRepo.bulkAdd([
    {
      nombre: datos.metas.termo,
      emoji: '🎯',
      dias: [],
      pasos: [],
      activa: true,
      esMeta: true,
      completada: true,
      // Como las metas de la app: una fecha objetivo, no un rango (un rango
      // pintaría la meta en TODOS los días del calendario).
      repeticion: 'una_vez',
      fechaInicio: ctx.fecha(-215),
      color: '#a78bfa',
      orden: 1,
      plantillaId: 'biblioteca',
      creadoEn: enHora(-272, '09:00'),
    },
    {
      nombre: datos.metas.posgrado,
      emoji: '🎯',
      dias: [],
      pasos: [],
      activa: true,
      esMeta: true,
      repeticion: 'una_vez',
      fechaInicio: ctx.fecha(90),
      color: '#3b82f6',
      orden: 0,
      plantillaId: 'biblioteca',
      creadoEn: enHora(-60, '09:00'),
    },
  ])
}
