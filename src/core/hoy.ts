import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Rutina } from './data/db'
import { visibles } from './data/ejemplos'
import { rutinasRepo } from './data/repository'
import { fechaLocalISO } from './fechaLocal'
import { tGlobal } from './i18n/useT'
import { estadoObjetivoDia, objetivosDiaDe } from './metaDiaria'
import { esMeta, rangoDe, vigenteEn } from './metas'
import type { AvanceDiario, ObjetivoDia, RegistroObjetivo } from './registry'
import { pasosHechosHoy, tocaFecha } from './rutinas'

/**
 * Los pasos de hoy de una app: lo que toca hacer ahí, en ese día, viniendo de
 * donde venga. Es la lista que sustituyó a la barra de meta diaria, y su regla
 * es una sola: **un paso se cumple porque el registro existe**, no porque nadie
 * lo palomee. Por eso todo se lee de la BD en cada consulta y nada se cachea:
 * dentro de `useLiveQuery` eso es lo que hace que el paso se tache solo en el
 * instante en que la app escribe el dato.
 *
 * Tres fuentes, una lista:
 * 1. Los objetivos del día que declara la app (`Plantilla.objetivosDia`).
 * 2. Sus bloques del calendario que tocan hoy — con sus pasos, que registran solos.
 * 3. Los pasos de las metas de esa app que están vigentes hoy (y con ellas los de
 *    las fases de un plan aceptado, que ya son metas reales).
 */

/** Cuánto after de su hora sigue teniendo sentido empujar un bloque (minutos). */
const VENTANA_TARDE_MIN = 120

export type OrigenPaso = 'objetivo' | 'rutina' | 'meta'

/**
 * Qué hacer con un paso al tocarlo. Lleva la fila entera y no su id porque quien
 * actúa (`togglePaso`, `toggleMeta`…) la necesita, y volver a leerla abriría una
 * ventana en la que el usuario ya la cambió.
 */
export type AccionPaso =
  | {
      tipo: 'objetivo'
      plantillaId: string
      clave: string
      registro?: RegistroObjetivo
      /** La cifra de hoy y su unidad, para poder cambiarla desde la fila. */
      objetivo: number
      unidad?: string
      ajustable?: boolean
    }
  | { tipo: 'rutina'; rutina: Rutina; idx?: number }
  | { tipo: 'meta'; meta: Rutina; idx?: number }

export interface PasoHoy {
  /** Estable entre repintados: `obj:cocina|clave`, `rut:12|0`, `meta:34|2`. */
  id: string
  origen: OrigenPaso
  /** Etiqueta ya traducida. */
  titulo: string
  /** Línea corta de avance («2.7 / 2.8 L»); sin valor, basta con el título. */
  detalle?: string
  /** 0..1 para la barra. */
  frac: number
  hecho: boolean
  /** De qué meta o fase de plan viene. */
  deQuien?: string
  /** Su hora, si la tiene («14:00»). */
  hora?: string
  /** Ya pasó su hora y sigue pendiente: se asoma aunque la lista esté plegada. */
  urgente?: boolean
  /** Sección de la app a la que lleva. */
  seccion?: string
  /** Palomeado a mano, contra lo que dice la actividad real. */
  manual?: boolean
  /**
   * Objetivo apagado (0). Sigue en la lista para poder volver a encenderlo, pero
   * no cuenta ni como pendiente ni como hecho: nadie se lo propuso.
   */
  apagado?: boolean
  accion: AccionPaso
}

/** El texto de avance de un objetivo: el suyo, la fracción, o nada si es de sí/no. */
function detalleObjetivo(o: ObjetivoDia, avance: AvanceDiario): string | undefined {
  if (avance.detalle) return avance.detalle
  // Un objetivo de hacerlo o no hacerlo: "1 / 1" no le dice nada a nadie.
  if (!o.unidad && avance.objetivo === 1) return undefined
  return `${avance.hecho} / ${avance.objetivo}${o.unidad ? ` ${o.unidad}` : ''}`
}

/** Minutos transcurridos desde su hora; negativo si aún no llega. */
function minutosDesde(hora: string, ahora: Date): number {
  return ahora.getHours() * 60 + ahora.getMinutes() - (Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5)))
}

/**
 * Los pasos de hoy de una app, en el orden en que se pintan. Sin hook, para poder
 * usarlo fuera de React; solo lee Dexie, así que dentro de `useLiveQuery` sigue
 * siendo reactivo.
 */
export async function armarPasosHoy(plantillaId: string, fecha: string): Promise<PasoHoy[]> {
  const pasos: PasoHoy[] = []
  const esHoy = fecha === fechaLocalISO()
  const ahora = new Date()

  // ── 1. Los objetivos del día de la app ────────────────────────────────────
  for (const o of objetivosDiaDe(plantillaId)) {
    const estado = await estadoObjetivoDia(plantillaId, o.clave, fecha)
    if (!estado) continue
    const { avance, cumplida } = estado
    // Sin objetivo (0) no se pide lo que nadie se propuso. El que se puede ajustar
    // se queda igualmente en la lista: si desapareciera al ponerlo a 0, no habría
    // desde dónde volver a encenderlo.
    const apagado = avance.objetivo <= 0
    if (apagado && !o.ajustable) continue
    pasos.push({
      id: `obj:${plantillaId}|${o.clave}`,
      origen: 'objetivo',
      titulo: tGlobal(o.clave, o.etiquetaEs),
      detalle: apagado ? undefined : detalleObjetivo(o, avance),
      frac: cumplida ? 1 : Math.min(1, avance.hecho / Math.max(1, avance.objetivo)),
      hecho: cumplida,
      apagado,
      deQuien: estado.deMeta,
      manual: estado.manual,
      seccion: o.seccion,
      accion: {
        tipo: 'objetivo',
        plantillaId,
        clave: o.clave,
        registro: o.registro,
        objetivo: Math.max(0, avance.objetivo),
        unidad: o.unidad,
        // Con una meta empujando, la cifra la manda ella: dejar el campo abierto
        // haría creer que se puede bajar, y `objetivoVigente` lo ignoraría.
        ajustable: o.ajustable && !estado.deMeta,
      },
    })
  }

  const dia = new Date(`${fecha}T12:00`)
  const todas = visibles(await rutinasRepo.list())
  const filas = todas.filter((r) => r.plantillaId === plantillaId)
  const ejecuciones = await db.ejecucionesRutina.where('fecha').equals(fecha).toArray()
  // De qué meta salió el bloque: la meta puede ser de otra app (una de cocina que
  // agenda ejercicio), así que se busca en todas y no solo en las de esta.
  const deMeta = (r: Rutina) => (r.deMetaId != null ? todas.find((m) => m.id === r.deMetaId)?.nombre : undefined)

  // ── 2. Lo agendado que toca hoy ───────────────────────────────────────────
  for (const r of filas) {
    if (esMeta(r) || !tocaFecha(r, dia)) continue
    const hechos = pasosHechosHoy(r, ejecuciones)
    const tarde = esHoy && r.hora ? minutosDesde(r.hora, ahora) : -1
    const urgente = tarde >= 0 && tarde <= VENTANA_TARDE_MIN
    if (r.pasos.length === 0) {
      const hecho = ejecuciones.some((e) => e.rutinaId === r.id && e.hecho)
      pasos.push({
        id: `rut:${r.id}`,
        origen: 'rutina',
        titulo: `${r.emoji} ${r.nombre}`,
        deQuien: deMeta(r),
        frac: hecho ? 1 : 0,
        hecho,
        hora: r.hora,
        urgente: urgente && !hecho,
        seccion: r.seccion,
        accion: { tipo: 'rutina', rutina: r },
      })
      continue
    }
    r.pasos.forEach((p, i) => {
      const hecho = hechos.has(i)
      pasos.push({
        id: `rut:${r.id}|${i}`,
        origen: 'rutina',
        titulo: p.titulo,
        // El paso solo dice qué se hace («Registrar 45 min»): lo que le da sentido
        // es de dónde viene, y una meta manda sobre el nombre del bloque.
        deQuien: deMeta(r) ?? `${r.emoji} ${r.nombre}`,
        frac: hecho ? 1 : 0,
        hecho,
        hora: r.hora,
        urgente: urgente && !hecho,
        seccion: r.seccion,
        accion: { tipo: 'rutina', rutina: r, idx: i },
      })
    })
  }

  // ── 3. Los pasos de las metas vigentes hoy ────────────────────────────────
  //
  // Solo sus PASOS: una meta de tres meses no es algo que se haga hoy, y ponerla
  // cada día sería ruido. La excepción es la meta de un solo día sin pasos — eso
  // es un hito de hoy y sí toca.
  for (const m of filas) {
    if (!esMeta(m) || !vigenteEn(m, fecha)) continue
    const rango = rangoDe(m)
    if (m.pasos.length === 0) {
      if (!rango || rango.ini !== rango.fin) continue
      pasos.push({
        id: `meta:${m.id}`,
        origen: 'meta',
        titulo: `${m.emoji} ${m.nombre}`,
        frac: m.completada ? 1 : 0,
        hecho: !!m.completada,
        hora: m.hora,
        seccion: m.seccion,
        accion: { tipo: 'meta', meta: m },
      })
      continue
    }
    const hechos = new Set(m.pasosHechos ?? [])
    m.pasos.forEach((p, i) => {
      pasos.push({
        id: `meta:${m.id}|${i}`,
        origen: 'meta',
        titulo: p.titulo,
        deQuien: m.nombre,
        frac: hechos.has(i) ? 1 : 0,
        hecho: hechos.has(i),
        seccion: m.seccion,
        accion: { tipo: 'meta', meta: m, idx: i },
      })
    })
  }

  // Lo urgente arriba; luego por hora (lo que no la tiene, al final de su grupo).
  return pasos.sort((a, b) => {
    if (!!a.urgente !== !!b.urgente) return a.urgente ? -1 : 1
    return (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99')
  })
}

/** Los pasos de hoy de una app (reactivo): se repintan solos al registrar. */
export function usePasosHoy(plantillaId: string, fecha?: string): PasoHoy[] | undefined {
  const dia = fecha ?? fechaLocalISO()
  return useLiveQuery(() => armarPasosHoy(plantillaId, dia), [plantillaId, dia])
}
