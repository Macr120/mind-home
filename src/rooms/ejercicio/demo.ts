/**
 * Año demo de ejercicio: de no poder trotar dos manzanas a terminar un maratón.
 *
 * El arco lo cuenta el propio dato, sin que nadie lo explique: el mes 1 está
 * casi vacío, la distancia crece hasta el mes 6, el bache del mes 7 deja la
 * carrera en CERO (pero la fuerza de tren superior sigue: la rodilla no impide
 * empujar en banca, y esa es la mejor parte de la historia), Japón son tres
 * semanas de caminatas y el mes 12 termina con el maratón y su descarga.
 *
 * Los textos vienen escritos; las distancias, los pesos y los ritmos se
 * calculan aquí. Los NOMBRES de ejercicio salen del catálogo de la app (que el
 * seed ya sembró en español): si los inventara la IA, los récords y la
 * progresión de 1RM agruparían por textos que no existen en el catálogo.
 */
import type { SerieFlex, SerieFuerza, SesionEjercicio, SplitCardio } from '../../core/data/db'
import {
  perfilEjercicioRepo,
  rutinasRepo,
  seriesFlexRepo,
  seriesFuerzaRepo,
  sesionesEjercicioRepo,
  splitsCardioRepo,
} from '../../core/data/repository'
import { rngDemo, type CtxDemo } from '../../demo/builders'
import { BACHE_FIN, BACHE_INICIO, enBache, enJapon, JAPON_FIN, JAPON_INICIO, MARATON_DIA } from '../../demo/hitosPep'
import { PLANES_DEMO, sembrarPlanDemo } from '../../demo/planesPep'
import { DEMO_EJERCICIO } from './demo.data'

type Sesion = Omit<SesionEjercicio, 'id'>
type Serie = Omit<SerieFuerza, 'id' | 'sesionId'>
type Split = Omit<SplitCardio, 'id' | 'sesionId'>
type Flex = Omit<SerieFlex, 'id' | 'sesionId'>

/** Una sesión con sus hijas, antes de conocer el `sesionId`. */
interface Bloque {
  sesion: Sesion
  series?: Serie[]
  splits?: Split[]
  flex?: Flex[]
}

/** Días clave con nombre propio (los `hitos` del contenido generado). */
const DIA_HITO: Record<string, number> = {
  primerTrote: -334,
  plan5k: -304,
  carrera5k: -262,
  carrera10k: -232,
  tirada15k: -200,
  ultimaAntesLesion: BACHE_INICIO,
  diaLesion: BACHE_INICIO + 1,
  primeraFisio: BACHE_FIN - 6,
  vueltaProgresiva: BACHE_FIN + 3,
  japonCaminata: JAPON_INICIO + 4,
  primer16k: -88,
  medioMaraton: -45,
  ritmoRecord: -21,
  tirada32k: -32,
  taper: -20,
  maraton: MARATON_DIA,
  vueltaTrasMaraton: -6,
}

/** Los 5 ejercicios de fuerza que Pep@ repite todo el año, con su peso inicial
 *  y el final (la rampa entre ambos es lo que dibuja la progresión de 1RM).
 *  `pesoKg: 0` en dominadas: la app lo muestra como «Peso corporal». */
const EJERCICIOS = [
  { nombre: 'Sentadilla', tren: 'inferior', de: 40, a: 72, reps: 8 },
  { nombre: 'Peso muerto rumano', tren: 'inferior', de: 45, a: 80, reps: 8 },
  { nombre: 'Hip thrust', tren: 'inferior', de: 40, a: 85, reps: 10 },
  { nombre: 'Press banca', tren: 'superior', de: 32, a: 55, reps: 8 },
  { nombre: 'Remo con barra', tren: 'superior', de: 30, a: 50, reps: 10 },
  { nombre: 'Press militar', tren: 'superior', de: 20, a: 35, reps: 8 },
  { nombre: 'Dominadas', tren: 'superior', de: 0, a: 0, reps: 6 },
  { nombre: 'Plancha', tren: 'superior', de: 0, a: 0, reps: 3 },
] as const

/** Enfoques de las sesiones de movilidad: los labels reales del catálogo. */
const ENFOQUES = ['Cuerpo completo', 'Cadera y piernas', 'Espalda y hombros', 'Post-entreno', 'Rodillas'] as const

/** Kilómetros de la tirada larga de la semana, por fase del año. */
function kmLargo(off: number): number {
  if (off < -334) return 0
  if (off < -304) return 3
  if (off < -274) return 5
  if (off < -244) return 8
  if (off < -214) return 12
  if (off < BACHE_INICIO) return 15
  if (off <= BACHE_FIN) return 0
  if (off < JAPON_INICIO) return 10
  if (off <= JAPON_FIN) return 0
  if (off < -70) return 16
  if (off < -40) return 20
  if (off < -25) return 28
  if (off < MARATON_DIA) return 14
  return 8
}

/** Minutos por kilómetro: 7:36 al empezar, 5:21 en su mejor día. */
function ritmo(off: number, r: () => number): number {
  const base = 7.6 - 2.25 * Math.min(1, Math.max(0, (off + 340) / 340))
  let extra = 0
  if (off > BACHE_FIN && off < BACHE_FIN + 25) extra += 0.55 // volviendo del fisio
  if (off > JAPON_FIN && off < JAPON_FIN + 14) extra += 0.35 // tres semanas parado
  if (off > MARATON_DIA) extra += 0.3 // piernas de después
  return base + extra + (r() - 0.5) * 0.36
}

/** Probabilidad de salir a correr ese día. */
function pCarrera(off: number): number {
  if (off < -334) return 0.05
  if (enBache(off)) return 0
  if (enJapon(off)) return 0.2 // caminatas, no entrenos
  if (off < -304) return 0.28
  if (off < -274) return 0.42
  if (off < BACHE_INICIO) return 0.5
  if (off < JAPON_INICIO) return 0.42
  if (off > MARATON_DIA) return 0.4
  return 0.55
}

/** Rampa de carga: 0 al empezar, 1 en el mes 12 (con descargas). */
function cargaFuerza(off: number): number {
  const base = Math.min(1, Math.max(0, (off + 300) / 300))
  let f = base
  if (off > JAPON_FIN && off < JAPON_FIN + 21) f *= 0.93
  if (off > MARATON_DIA) f *= 0.97
  return f
}

const redondear2 = (kg: number) => Math.round(kg / 2.5) * 2.5

export async function construirDemoEjercicio(ctx: CtxDemo): Promise<void> {
  const datos = DEMO_EJERCICIO[ctx.idioma]
  const r = rngDemo(19470923)
  const uno = <T,>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]

  // ── Perfil: las metas semanales de alguien que entrena para un maratón ──
  const META = {
    sesionesFuerzaSemana: 2,
    minutosResistenciaSemana: 180,
    minutosFlexibilidadSemana: 60,
    diasActivosSemana: 5,
    unidades: 'internacional' as const,
  }
  const [perfil] = await perfilEjercicioRepo.list()
  if (perfil?.id != null) await perfilEjercicioRepo.update(perfil.id, META)
  else await perfilEjercicioRepo.add(META)

  // ── El año, día a día, todavía en memoria ───────────────────────────────
  const plan = new Map<number, Bloque[]>()
  const push = (off: number, b: Bloque) => plan.set(off, [...(plan.get(off) ?? []), b])

  for (let off = -364; off <= 0; off++) {
    const dia = new Date(`${ctx.fecha(off)}T12:00`).getDay()

    // Carrera: la tirada larga cae en domingo; el resto son rodajes cortos.
    if (r() < pCarrera(off)) {
      const largo = kmLargo(off)
      const esLarga = dia === 0 && largo > 0
      const km = enJapon(off)
        ? 6 + Math.round(r() * 8) // caminar por la ciudad
        : Math.max(2, Math.round((esLarga ? largo : largo * (0.35 + r() * 0.2)) * 10) / 10)
      if (km > 0) {
        const min = enJapon(off) ? km * 11 : km * ritmo(off, r)
        push(off, {
          sesion: {
            fecha: ctx.fecha(off),
            tipo: 'resistencia',
            titulo: enJapon(off) ? datos.actividades.caminar : uno(datos.titulos.resistencia),
            duracionMin: Math.round(min),
            distanciaKm: km,
            rpe: enJapon(off) ? 3 : esLarga ? 7 : 5 + Math.round(r() * 2),
            ppmProm: 132 + Math.round(r() * 18),
            ppmMax: 158 + Math.round(r() * 20),
          },
        })
      }
    }

    // Fuerza: 2 por semana; en el bache SOLO tren superior (la rodilla).
    const diaFuerza = dia === 2 || dia === 5
    if (off >= -304 && diaFuerza && r() < (enJapon(off) ? 0 : 0.72)) {
      const carga = cargaFuerza(off)
      const soloArriba = enBache(off)
      const elegidos = EJERCICIOS.filter((e) => (soloArriba ? e.tren === 'superior' : true)).slice(0, 4)
      const series: Serie[] = elegidos.map((e, i) => ({
        ejercicio: e.nombre,
        series: 3 + (r() < 0.3 ? 1 : 0),
        repeticiones: e.reps,
        pesoKg: e.a > 0 ? redondear2(e.de + (e.a - e.de) * carga) : 0,
        orden: i,
      }))
      push(off, {
        sesion: {
          fecha: ctx.fecha(off),
          tipo: 'fuerza',
          titulo: uno(datos.titulos.fuerza),
          duracionMin: 40 + Math.round(r() * 20),
          rpe: 6 + Math.round(r() * 2),
          volumenKg: series.reduce((acc, s) => acc + s.series * s.repeticiones * s.pesoKg, 0),
        },
        series,
      })
    }

    // Movilidad: 1-2 por semana, y casi a diario durante la rehabilitación.
    const pFlex = enBache(off) ? 0.55 : enJapon(off) ? 0.1 : 0.22
    if (off >= -320 && r() < pFlex) {
      const posturas = 3 + Math.round(r() * 2)
      const flex: Flex[] = Array.from({ length: posturas }, (_, i) => ({
        ejercicio: uno(datos.enfoquesFlex),
        segundos: 30 + Math.round(r() * 3) * 15,
        repeticiones: 2,
        orden: i,
      }))
      const segundos = flex.reduce((acc, f) => acc + f.segundos * f.repeticiones, 0)
      push(off, {
        sesion: {
          fecha: ctx.fecha(off),
          tipo: 'flexibilidad',
          titulo: uno(datos.titulos.flexibilidad),
          duracionMin: Math.max(1, Math.round(segundos / 60)),
          enfoque: enBache(off) ? 'Rodillas' : uno(ENFOQUES),
          rpe: 3,
        },
        flex,
      })
    }
  }

  // ── Las sesiones con nombre propio mandan sobre lo generado ─────────────
  const hito = (clave: string) => datos.hitos.find((h) => h.clave === clave)
  const carreraFija = (clave: string, km: number, minPorKm: number, conRuta = true) => {
    const h = hito(clave)
    const off = DIA_HITO[clave]
    if (!h || off == null) return
    const sesion: Sesion = {
      fecha: ctx.fecha(off),
      tipo: 'resistencia',
      titulo: h.titulo,
      nota: h.nota,
      duracionMin: Math.round(km * minPorKm),
      distanciaKm: km,
      rpe: 9,
      ppmProm: 158,
      ppmMax: 182,
      ...(conRuta ? { ruta: rutaSintetica(km, r) } : {}),
    }
    // Los tramos de 10 km son lo que hace que el desglose de la carrera exista.
    const tramos = Math.max(2, Math.round(km / 10))
    const splits: Split[] = Array.from({ length: tramos }, (_, i) => ({
      actividad: datos.actividades.correr,
      minutos: Math.round((km * minPorKm) / tramos),
      km: Math.round((km / tramos) * 10) / 10,
      orden: i,
    }))
    plan.set(off, [{ sesion, splits }, ...(plan.get(off) ?? []).filter((b) => b.sesion.tipo !== 'resistencia')])
  }

  carreraFija('carrera5k', 5, 6.55)
  carreraFija('carrera10k', 10, 6.3)
  carreraFija('tirada15k', 15, 6.4)
  carreraFija('ultimaAntesLesion', 12, 6.1)
  carreraFija('primer16k', 16, 6.2)
  carreraFija('medioMaraton', 21.1, 5.55)
  carreraFija('ritmoRecord', 10, 5.35)
  carreraFija('tirada32k', 32, 6.15)
  carreraFija('maraton', 42.2, 6.05)

  // El resto de hitos solo prestan su título y su nota a la sesión de ese día.
  for (const clave of ['primerTrote', 'plan5k', 'diaLesion', 'primeraFisio', 'vueltaProgresiva', 'japonCaminata', 'taper', 'vueltaTrasMaraton']) {
    const h = hito(clave)
    const off = DIA_HITO[clave]
    if (!h || off == null) continue
    const bloques = plan.get(off)
    const b = bloques?.[0]
    if (b) {
      b.sesion.titulo = h.titulo
      b.sesion.nota = h.nota
    } else {
      // El día de la lesión y el del fisio no siempre caían en día de entreno.
      push(off, {
        sesion: {
          fecha: ctx.fecha(off),
          tipo: clave === 'primeraFisio' || clave === 'diaLesion' ? 'flexibilidad' : 'resistencia',
          titulo: h.titulo,
          nota: h.nota,
          duracionMin: 30,
          rpe: 4,
          ...(clave === 'primeraFisio' || clave === 'diaLesion' ? { enfoque: 'Rodillas' } : { distanciaKm: 4 }),
        },
      })
    }
  }

  // ── Las notas sueltas se cuelgan de la sesión de su día y tipo ──────────
  for (const n of datos.notas) {
    const bloques = plan.get(n.dia)
    // Una nota de correr no puede caer en el bache: ahí no se corrió.
    const b = bloques?.find((x) => x.sesion.tipo === n.tipo) ?? bloques?.[0]
    if (b && !b.sesion.nota) b.sesion.nota = n.nota
  }

  // ── La racha se cuenta hacia atrás desde HOY: sin sesión hoy, sale 0 ────
  for (let off = -4; off <= 0; off++) {
    if (plan.get(off)?.length) continue
    push(off, {
      sesion: {
        fecha: ctx.fecha(off),
        tipo: 'flexibilidad',
        titulo: uno(datos.titulos.flexibilidad),
        duracionMin: 20,
        enfoque: 'Post-entreno',
        rpe: 3,
      },
      flex: [{ ejercicio: uno(datos.enfoquesFlex), segundos: 45, repeticiones: 2, orden: 0 }],
    })
  }

  // ── A la base: la sesión primero (necesito su id para las hijas) ────────
  const series: Omit<SerieFuerza, 'id'>[] = []
  const splits: Omit<SplitCardio, 'id'>[] = []
  const flexes: Omit<SerieFlex, 'id'>[] = []
  for (const off of [...plan.keys()].sort((a, b) => a - b)) {
    for (const b of plan.get(off) ?? []) {
      const sesionId = await sesionesEjercicioRepo.add(b.sesion)
      for (const s of b.series ?? []) series.push({ ...s, sesionId })
      for (const s of b.splits ?? []) splits.push({ ...s, sesionId })
      for (const f of b.flex ?? []) flexes.push({ ...f, sesionId })
    }
  }
  await seriesFuerzaRepo.bulkAdd(series)
  await splitsCardioRepo.bulkAdd(splits)
  await seriesFlexRepo.bulkAdd(flexes)

  // ── Las metas del año en el cronograma: cuatro cumplidas y una viva ─────
  const meta = (nombre: string, off: number, completada: boolean, orden: number) => ({
    nombre,
    emoji: '🏃',
    dias: [] as number[],
    pasos: [],
    activa: true,
    esMeta: true,
    completada,
    repeticion: 'una_vez' as const,
    fechaInicio: ctx.fecha(off),
    color: '#f43f5e',
    orden,
    plantillaId: 'ejercicio',
    creadoEn: `${ctx.fecha(Math.max(-364, off - 60))}T09:00:00.000Z`,
  })
  // Una por una y no `bulkAdd`: la última necesita su id para colgarle el plan
  // (`bulkAdd` no devuelve ids). El orden de inserción es el mismo, así que los
  // ids resultantes tampoco cambian.
  await rutinasRepo.add(meta(datos.metas.cinco, DIA_HITO.carrera5k, true, 1))
  await rutinasRepo.add(meta(datos.metas.diez, DIA_HITO.carrera10k, true, 2))
  await rutinasRepo.add(meta(datos.metas.medio, DIA_HITO.medioMaraton, true, 3))
  await rutinasRepo.add(meta(datos.metas.maraton, MARATON_DIA, true, 4))
  const siguienteId = await rutinasRepo.add(meta(datos.metas.siguiente, 150, false, 5))

  // El plan del maratón que viene: se pidió SIN fecha límite y la IA calculó que
  // exige 24 semanas — termina cuatro días antes de la carrera de la meta.
  await sembrarPlanDemo({
    metaId: siguienteId,
    clave: 'maraton',
    plan: PLANES_DEMO[ctx.idioma].maraton,
    inicioISO: ctx.fecha(-21),
    entrada: { fechaInicio: ctx.fecha(-21), horasSemana: 10, dias: [1, 2, 3, 4, 5, 6], nivel: 'avanzado' },
    creadoEn: `${ctx.fecha(-22)}T20:15:00.000Z`,
    hechos: [2, 3],
  })
}

/** Un circuito cerrado alrededor de un punto fijo: lo justo para que la app
 *  dibuje el trazo de la carrera (solo lo pinta con más de un punto). */
function rutaSintetica(km: number, r: () => number): { lat: number; lng: number }[] {
  const radio = 0.0009 * Math.sqrt(km) * 3
  return Array.from({ length: 46 }, (_, i) => {
    const a = (i / 45) * Math.PI * 2
    const deform = 0.75 + r() * 0.5
    return {
      lat: 19.4326 + Math.sin(a) * radio * deform,
      lng: -99.1332 + Math.cos(a) * radio * deform * 1.4,
    }
  })
}
