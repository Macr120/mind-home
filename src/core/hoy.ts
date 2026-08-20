import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Rutina } from './data/db'
import { visibles } from './data/ejemplos'
import { rutinasRepo } from './data/repository'
import { appsParaEnlace } from './enlaceApp'
import { fechaLocalISO } from './fechaLocal'
import { tGlobal } from './i18n/useT'
import { estadoObjetivoDia, objetivosDiaDe } from './metaDiaria'
import { esMeta, rangoDe, vigenteEn } from './metas'
// Del contrato HOJA, no de `registry` (que importa los 22 cuartos): esto lo
// consumen las apps y cerrar el ciclo rompe el hot-reload en desarrollo.
import { esInfraestructura, getPlantilla } from './appContrato'
import { useDiseño } from './state/disenoStore'
import type { AvanceDiario, ObjetivoDia, Plantilla, RegistroObjetivo } from './registry'
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
 *
 * Y una cuarta que solo existe mientras las otras tres están vacías: la misión de
 * ARRANQUE, que pide ponerle sus misiones a la app.
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
  /**
   * La misión de ARRANQUE de una app que todavía no tiene ninguna. No se palomea:
   * se cumple creando la primera, y entonces desaparece sola. Tocarla abre el
   * catálogo de sugerencias de esa app.
   */
  | { tipo: 'sinMisiones'; plantillaId: string }

export interface PasoHoy {
  /** Estable entre repintados: `obj:cocina|clave`, `rut:12|0`, `meta:34|2`. */
  id: string
  origen: OrigenPaso
  /** Etiqueta ya traducida. */
  titulo: string
  /**
   * Emoji del bloque, APARTE del título. Iba pegado dentro del texto y por eso
   * el mismo objetivo se leía distinto aquí («😴 Apagar todo y dormir») que en la
   * matriz del calendario («Apagar todo y dormir»), además de saltarse el ajuste
   * de estilo de iconos: un emoji dentro de un string se pinta crudo siempre.
   */
  emoji?: string
  /** Línea corta de avance («2.7 / 2.8 L»); sin valor, basta con el título. */
  detalle?: string
  /** 0..1 para la barra. */
  frac: number
  hecho: boolean
  /** De qué meta o fase de plan viene. */
  deQuien?: string
  /**
   * La meta de la que DERIVA, si deriva de una: el bloque que ella agendó
   * (`Rutina.deMetaId`) o su propio paso. Es lo que lee `esDeMeta` para decidir
   * de qué lado de la lista cae; el nombre para leerlo va en `deQuien`.
   */
  metaId?: number
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
export async function armarPasosHoy(
  /** Sin valor: los objetivos PERSONALES, los que no son de ninguna app. */
  plantillaId: string | undefined,
  fecha: string,
): Promise<PasoHoy[]> {
  const pasos: PasoHoy[] = []
  const esHoy = fecha === fechaLocalISO()
  const ahora = new Date()

  // ── 1. Los objetivos del día de la app ────────────────────────────────────
  for (const o of objetivosDiaDe(plantillaId)) {
    if (!plantillaId) break
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
  // agenda ejercicio), así que se busca en todas y no solo en las de esta. Se
  // devuelve la FILA y no su nombre porque de ella salen las dos cosas: el rótulo
  // y el `metaId` con el que la lista separa lo del día de lo que sirve a una meta.
  const metaDe = (r: Rutina) => (r.deMetaId != null ? todas.find((m) => m.id === r.deMetaId) : undefined)

  // ── 2. Lo agendado que toca hoy ───────────────────────────────────────────
  for (const r of filas) {
    if (esMeta(r) || !tocaFecha(r, dia)) continue
    // Buscada contra `todas`, que ya viene filtrado por `visibles`: si la meta se
    // ocultó o se borró, el bloque se queda sin madre y cuenta como del día a día.
    const madre = metaDe(r)
    const hechos = pasosHechosHoy(r, ejecuciones)
    const tarde = esHoy && r.hora ? minutosDesde(r.hora, ahora) : -1
    const urgente = tarde >= 0 && tarde <= VENTANA_TARDE_MIN
    if (r.pasos.length === 0) {
      const hecho = ejecuciones.some((e) => e.rutinaId === r.id && e.hecho)
      pasos.push({
        id: `rut:${r.id}`,
        origen: 'rutina',
        titulo: r.nombre,
        emoji: r.emoji,
        deQuien: madre?.nombre,
        metaId: madre?.id,
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
        // es de dónde viene, y una meta manda sobre el nombre del bloque. Salvo que
        // el paso YA se llame como su bloque —lo que pasa con un objetivo del
        // catálogo, que es un bloque de un solo paso—: ahí repetirlo no dice nada.
        emoji: r.emoji,
        deQuien: madre?.nombre ?? (p.titulo === r.nombre ? undefined : `${r.emoji} ${r.nombre}`),
        metaId: madre?.id,
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
        titulo: m.nombre,
        emoji: m.emoji,
        metaId: m.id,
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
        metaId: m.id,
        frac: hechos.has(i) ? 1 : 0,
        hecho: hechos.has(i),
        seccion: m.seccion,
        accion: { tipo: 'meta', meta: m, idx: i },
      })
    })
  }

  // ── 4. La misión de ARRANQUE, solo si la app está vacía ───────────────────
  //
  // Un cuarto recién asignado no pedía nada: el panel decía «Aún no te has
  // propuesto nada aquí» y ahí se acababa. Su primera misión es justamente
  // ponerle las suyas, y en cuanto existe una (`filas`) esa misión ya está
  // cumplida y desaparece — nunca convive con las de verdad, así que ni engorda
  // la cuenta del día ni puede completar una lista por sí sola.
  //
  // «Vacía» es sin objetivos declarados por la plantilla Y sin ninguna fila suya
  // en `rutinas`, no «hoy no toca nada»: una misión de los lunes no debe hacerla
  // reaparecer el martes. La infraestructura queda fuera: no tiene panel donde
  // ofrecer el catálogo.
  const plantilla = plantillaId ? getPlantilla(plantillaId) : undefined
  if (
    plantillaId &&
    plantilla &&
    !esInfraestructura(plantilla) &&
    filas.length === 0 &&
    objetivosDiaDe(plantillaId).length === 0
  ) {
    pasos.push({
      id: `sinMisiones:${plantillaId}`,
      // 'objetivo' y no 'rutina' a propósito: `avisarObjetivos` (core/avisos.ts)
      // solo notifica las de origen 'rutina', y esto no es para dar la lata por
      // notificación, sino para que el cuarto no se vea mudo al entrar.
      origen: 'objetivo',
      titulo: tGlobal('hoy.primera', 'Ponle sus misiones a esta app'),
      frac: 0,
      hecho: false,
      accion: { tipo: 'sinMisiones', plantillaId },
    })
  }

  // Lo urgente arriba; luego por hora (lo que no la tiene, al final de su grupo).
  return pasos.sort((a, b) => {
    if (!!a.urgente !== !!b.urgente) return a.urgente ? -1 : 1
    return (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99')
  })
}

/**
 * ¿El paso DERIVA de una meta, o es del día a día? Es el único sitio donde se
 * decide: las dos listas de Misiones —la de cada app y la de toda la casa— se
 * parten en dos con esta función, así que el criterio no puede divergir.
 *
 * El objetivo del día de la app no cuenta como de meta aunque una haya subido su
 * cifra (eso es lo que pone su `deQuien`): la meta movió el listón, no inventó la
 * misión — el agua de cada día sigue siendo el agua de cada día.
 */
export function esDeMeta(p: PasoHoy): boolean {
  return p.origen === 'meta' || p.metaId != null
}

/**
 * Reparte los pasos como los pintan las listas: los apagados no cuentan en ningún
 * lado, y «lista completa» = hay pasos que cuentan y ninguno pendiente. Única
 * definición — de aquí sale también el XP por lista cumplida.
 */
export function repartirPasos(pasos: PasoHoy[]) {
  const cuentan = pasos.filter((p) => !p.apagado)
  const pendientes = cuentan.filter((p) => !p.hecho)
  return {
    cuentan,
    pendientes,
    hechos: cuentan.filter((p) => p.hecho),
    apagados: pasos.filter((p) => p.apagado),
    completa: cuentan.length > 0 && pendientes.length === 0,
  }
}

/** Los pasos de hoy de una app (reactivo): se repintan solos al registrar. */
export function usePasosHoy(plantillaId: string, fecha?: string): PasoHoy[] | undefined {
  const dia = fecha ?? fechaLocalISO()
  return useLiveQuery(() => armarPasosHoy(plantillaId, dia), [plantillaId, dia])
}

/** Lo que una app pide hoy, para la lista global del reloj. */
export interface PasosDeApp {
  /** Sin valor: el grupo de los objetivos PERSONALES, que no son de ninguna app. */
  app?: Plantilla
  pasos: PasoHoy[]
}

/**
 * La checklist del día de TODAS las apps que el usuario tiene en su casa: lo que
 * pinta el botón «Objetivos» del reloj. Es el mismo contenido que el panel de
 * cada cuarto, pero junto y en un solo sitio, para poder ver el día entero sin
 * entrar cuarto por cuarto.
 *
 * **Más el grupo sin app**: un objetivo personal («turno en la cafetería») no es
 * de ningún cuarto, así que recorrer solo las apps lo dejaba fuera de la única
 * vista que dice enseñarlo todo — salía en la rejilla del calendario y no aquí.
 *
 * Las apps que hoy no piden nada se tiran: con quince cuartos, la lista sería
 * media pantalla de títulos vacíos.
 */
export async function armarPasosDeTodas(fecha: string): Promise<PasosDeApp[]> {
  const apps = appsParaEnlace()
  const listas = await Promise.all([
    ...apps.map((p) => armarPasosHoy(p.id, fecha)),
    armarPasosHoy(undefined, fecha),
  ])
  const grupos: PasosDeApp[] = apps.map((app, i) => ({ app, pasos: listas[i] }))
  grupos.push({ pasos: listas[apps.length] })
  return grupos.filter((x) => x.pasos.length > 0)
}

/**
 * La lista global (reactiva). Depende de la fecha y de qué apps tiene la casa:
 * esas salen del DISEÑO, no de la base, así que Dexie no rehace la consulta al
 * cargarse la casa ni al asignar una app nueva. Sin esa dependencia, quien
 * pregunte antes de que la casa exista (la sonda de la raíz) se quedaría para
 * siempre con la lista vacía de aquel instante.
 */
export function usePasosDeTodas(fecha?: string): PasosDeApp[] | undefined {
  const dia = fecha ?? fechaLocalISO()
  const apps = useDiseño((s) => {
    const ids = new Set<string>()
    for (const o of s.objetos) if (o.plantillaId) ids.add(o.plantillaId)
    return [...ids].sort().join(',')
  })
  return useLiveQuery(() => armarPasosDeTodas(dia), [dia, apps])
}

/** Lo que le queda a una app por hacer hoy: el globo de notificación de su tarjeta. */
export interface PendientesApp {
  cuantos: number
  /** Algún bloque agendado se pasó de su hora hace poco: el globo va en ámbar. */
  urgente: boolean
}

/**
 * Lo que le queda hoy a TODA la casa, sumando también las misiones personales
 * (las que no son de ninguna app): el globo del botón Misiones del calendario.
 * Cuando no queda nada devuelve 0 y el globo desaparece, como el de un cuarto.
 */
export function usePendientesCasaHoy(fecha?: string): PendientesApp {
  const porApp = usePasosDeTodas(fecha)
  return useMemo(() => {
    let cuantos = 0
    let urgente = false
    for (const g of porApp ?? []) {
      const { pendientes } = repartirPasos(g.pasos)
      cuantos += pendientes.length
      urgente ||= pendientes.some((p) => p.urgente)
    }
    return { cuantos, urgente }
  }, [porApp])
}

/**
 * Las misiones que quedan hoy, por app, para las tarjetas de la pantalla de inicio
 * y del menú lateral. Una sola suscripción: pedirlas con `usePasosHoy` en cada
 * tarjeta serían quince consultas rehaciéndose con cada registro que se guarda.
 */
export function usePendientesPorApp(fecha?: string): Map<string, PendientesApp> {
  const porApp = usePasosDeTodas(fecha)
  return useMemo(() => {
    const m = new Map<string, PendientesApp>()
    for (const g of porApp ?? []) {
      if (!g.app) continue
      const { pendientes } = repartirPasos(g.pasos)
      if (pendientes.length > 0) {
        m.set(g.app.id, { cuantos: pendientes.length, urgente: pendientes.some((p) => p.urgente) })
      }
    }
    return m
  }, [porApp])
}
