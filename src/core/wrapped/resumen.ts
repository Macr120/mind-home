import type { Table } from 'dexie'
import { db } from '../data/db'
import type { TipoMedia } from '../data/db'
import { FUENTES, XP_POR_REGISTRO } from '../gamificacion/actividad'
import { DIA_MS, deIso, fechaLocalISO, isoMasDias } from '../fechaLocal'
import { periodoDe, type Periodo, type TipoPeriodo } from './periodo'

/**
 * Agregación del Wrapped: una FOTO del periodo pedido, calculada una vez por
 * apertura (sin useLiveQuery: re-agregar el año entero en cada escritura sería
 * un desperdicio). "Día activo" significa lo mismo que en el tamagotchi porque
 * reusa `FUENTES` de gamificacion/actividad.ts; los totales ricos (minutos, km,
 * kcal…) salen de las tablas crudas por su índice `fecha`.
 */

export type TipoHito =
  | 'lugares'
  | 'recuerdosViaje'
  | 'peliculas'
  | 'series'
  | 'libros'
  | 'videojuegos'
  | 'anecdotas'
  | 'proyectosTerminados'
  | 'mantenimientos'
  | 'rutinasCompletadas'

export interface Hito {
  tipo: TipoHito
  n: number
}

export interface ResumenWrapped {
  periodo: Periodo
  diasActivos: number
  /** Días del periodo, acotados a hoy si sigue en curso. */
  diasTotales: number
  registrosTotales: number
  xpGanado: number
  /** Mejor tanda de días consecutivos con actividad dentro del periodo. */
  mejorRacha: number
  /** Registros por día (alimenta el heatmap). */
  actividadPorDia: Map<string, number>
  /** Apps con actividad, de más a menos registros. */
  porApp: { plantillaId: string; registros: number; dias: number }[]
  dominios: {
    ejercicio?: { sesiones: number; minutos: number; km: number; volumenKg: number }
    calma?: { sesiones: number; minutos: number; gratitudes: number; deltaAnimo: number | null }
    estudio?: { sesiones: number; minutos: number; topPilarId?: string }
    idiomas?: { repasos: number; aciertos: number }
    hobbies?: {
      sesiones: number
      minutos: number
      top?: { nombre: string; emoji: string; color: string; minutos: number }
    }
    sueno?: { noches: number; horasProm: number; calidadProm: number }
    cocina?: { comidas: number; aguaLitros: number; pesoDelta: number | null }
    finanzas?: { ingresos: number; gastos: number; topCategoriaGasto?: string }
  }
  hitos: Hito[]
}

const suma = (ns: number[]) => ns.reduce((a, b) => a + b, 0)

const dec1 = (n: number) => Math.round(n * 10) / 10

function sumaPor<T, K>(filas: T[], clave: (f: T) => K, valor: (f: T) => number): Map<K, number> {
  const acc = new Map<K, number>()
  for (const f of filas) {
    const k = clave(f)
    acc.set(k, (acc.get(k) ?? 0) + valor(f))
  }
  return acc
}

function topDe<K>(m: Map<K, number>): { clave: K; valor: number } | undefined {
  let mejor: { clave: K; valor: number } | undefined
  for (const [clave, valor] of m) if (!mejor || valor > mejor.valor) mejor = { clave, valor }
  return mejor
}

/** Mejor tanda de días consecutivos dentro del conjunto (no mira fuera del rango). */
function mejorRachaEn(fechas: Set<string>): number {
  const orden = [...fechas].sort()
  let mejor = 0
  let actual = 0
  let prev = ''
  for (const f of orden) {
    actual = prev && isoMasDias(prev, 1) === f ? actual + 1 : 1
    mejor = Math.max(mejor, actual)
    prev = f
  }
  return mejor
}

export async function resumenPeriodo(tipo: TipoPeriodo, ancla: string): Promise<ResumenWrapped> {
  const periodo = periodoDe(tipo, ancla)
  const { desde, hasta } = periodo
  const rango = <T>(t: Table<T, number>) =>
    t.where('fecha').between(desde, hasta, true, true).toArray()
  const cuenta = <T>(t: Table<T, number>) =>
    t.where('fecha').between(desde, hasta, true, true).count()

  const [
    sesEj,
    sesMind,
    nGratitud,
    sesEst,
    reps,
    sesHob,
    noches,
    comidas,
    aguas,
    pesos,
    trans,
    nMant,
    ejec,
    media,
    nAnecdotas,
    nRecuerdos,
    lugares,
    proyectos,
    hobbies,
  ] = await Promise.all([
    rango(db.sesionesEjercicio),
    rango(db.sesionesMindfulness),
    cuenta(db.gratitudDiaria),
    rango(db.sesionesEstudio),
    rango(db.repasosIdioma),
    rango(db.sesionesHobby),
    rango(db.sueno),
    rango(db.registrosComida),
    rango(db.registrosAgua),
    rango(db.registrosPeso),
    rango(db.transacciones),
    cuenta(db.registrosMantenimiento),
    rango(db.ejecucionesRutina),
    rango(db.mediaArchivo),
    cuenta(db.anecdotas),
    cuenta(db.bitacoraViaje),
    db.lugaresViaje.toArray(),
    db.proyectosHobby.toArray(),
    db.hobbies.toArray(),
  ])

  // Actividad global con la misma definición que el tamagotchi (FUENTES).
  const actividadPorDia = new Map<string, number>()
  const porApp: ResumenWrapped['porApp'] = []
  let registrosTotales = 0
  await Promise.all(
    Object.entries(FUENTES).map(async ([plantillaId, fuente]) => {
      const fechas = (await fuente()).filter((f) => f >= desde && f <= hasta)
      if (!fechas.length) return
      registrosTotales += fechas.length
      porApp.push({ plantillaId, registros: fechas.length, dias: new Set(fechas).size })
      for (const f of fechas) actividadPorDia.set(f, (actividadPorDia.get(f) ?? 0) + 1)
    }),
  )
  porApp.sort((a, b) => b.registros - a.registros)

  const dominios: ResumenWrapped['dominios'] = {}

  if (sesEj.length)
    dominios.ejercicio = {
      sesiones: sesEj.length,
      minutos: suma(sesEj.map((s) => s.duracionMin)),
      km: dec1(suma(sesEj.map((s) => s.distanciaKm ?? 0))),
      volumenKg: Math.round(suma(sesEj.map((s) => s.volumenKg ?? 0))),
    }

  if (sesMind.length || nGratitud) {
    const conAnimo = sesMind.filter((s) => s.animoAntes != null && s.animoDespues != null)
    dominios.calma = {
      sesiones: sesMind.length,
      minutos: suma(sesMind.map((s) => s.duracionMin)),
      gratitudes: nGratitud,
      deltaAnimo: conAnimo.length
        ? dec1(suma(conAnimo.map((s) => s.animoDespues! - s.animoAntes!)) / conAnimo.length)
        : null,
    }
  }

  if (sesEst.length)
    dominios.estudio = {
      sesiones: sesEst.length,
      minutos: suma(sesEst.map((s) => s.minutos)),
      topPilarId: topDe(sumaPor(sesEst, (s) => s.pilarId, (s) => s.minutos))?.clave,
    }

  if (reps.length)
    dominios.idiomas = {
      repasos: suma(reps.map((r) => r.repasos)),
      aciertos: suma(reps.map((r) => r.aciertos)),
    }

  if (sesHob.length) {
    const top = topDe(sumaPor(sesHob, (s) => s.hobbyId, (s) => s.minutos))
    const hobby = top && hobbies.find((h) => h.id === top.clave)
    dominios.hobbies = {
      sesiones: sesHob.length,
      minutos: suma(sesHob.map((s) => s.minutos)),
      top:
        top && hobby
          ? { nombre: hobby.nombre, emoji: hobby.emoji, color: hobby.color, minutos: top.valor }
          : undefined,
    }
  }

  if (noches.length)
    dominios.sueno = {
      noches: noches.length,
      horasProm: dec1(suma(noches.map((n) => n.horas)) / noches.length),
      calidadProm: dec1(suma(noches.map((n) => n.calidad)) / noches.length),
    }

  if (comidas.length || aguas.length || pesos.length) {
    const ordenPeso = [...pesos].sort((a, b) => a.fecha.localeCompare(b.fecha))
    dominios.cocina = {
      comidas: comidas.length,
      aguaLitros: dec1(suma(aguas.map((a) => a.ml)) / 1000),
      pesoDelta:
        ordenPeso.length >= 2 ? dec1(ordenPeso[ordenPeso.length - 1].kg - ordenPeso[0].kg) : null,
    }
  }

  if (trans.length) {
    const gastos = trans.filter((t) => t.tipo === 'gasto')
    dominios.finanzas = {
      ingresos: suma(trans.filter((t) => t.tipo === 'ingreso').map((t) => t.monto)),
      gastos: suma(gastos.map((t) => t.monto)),
      topCategoriaGasto: topDe(sumaPor(gastos, (t) => t.categoria, (t) => t.monto))?.clave,
    }
  }

  const nMedia = (t: TipoMedia) =>
    media.filter((m) => m.tipo === t && m.estado === 'completado').length
  const candidatos: Hito[] = [
    {
      tipo: 'lugares',
      n: lugares.filter(
        (l) => l.visitado === 1 && !!l.fechaVisita && l.fechaVisita >= desde && l.fechaVisita <= hasta,
      ).length,
    },
    { tipo: 'recuerdosViaje', n: nRecuerdos },
    { tipo: 'peliculas', n: nMedia('pelicula') },
    { tipo: 'series', n: nMedia('serie') },
    { tipo: 'libros', n: nMedia('libro') },
    { tipo: 'videojuegos', n: nMedia('videojuego') },
    { tipo: 'anecdotas', n: nAnecdotas },
    {
      tipo: 'proyectosTerminados',
      n: proyectos.filter((p) => !!p.terminadoEn && p.terminadoEn >= desde && p.terminadoEn <= hasta)
        .length,
    },
    { tipo: 'mantenimientos', n: nMant },
    // Cuenta días de rutina con avance (palomita entera o pasos marcados); no se
    // calcula % contra lo agendado: exigiría reproducir tocaFecha rutina×día.
    { tipo: 'rutinasCompletadas', n: ejec.filter((e) => e.hecho || e.pasosHechos.length > 0).length },
  ]

  const hoy = fechaLocalISO()
  const finEfectivo = hasta > hoy ? hoy : hasta
  const diasTotales = Math.max(
    0,
    Math.round((deIso(finEfectivo).getTime() - deIso(desde).getTime()) / DIA_MS) + 1,
  )

  return {
    periodo,
    diasActivos: actividadPorDia.size,
    diasTotales,
    registrosTotales,
    xpGanado: registrosTotales * XP_POR_REGISTRO,
    mejorRacha: mejorRachaEn(new Set(actividadPorDia.keys())),
    actividadPorDia,
    porApp,
    dominios,
    hitos: candidatos.filter((h) => h.n > 0),
  }
}
