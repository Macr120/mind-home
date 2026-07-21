import { useEffect, useMemo, useRef, useState } from 'react'
import type { Rutina, EjecucionRutina, Alcance } from '../data/db'
import { ejecucionesRutinaRepo, rutinasRepo } from '../data/repository'
import { getPlantilla } from '../registry'
import { useEventosApps, type EventoResuelto } from '../eventosApps'
import { abrirApp } from '../abrirApp'
import {
  esSerie,
  fechaISO,
  guardarHorarioRutina,
  hoyISO,
  tocaFecha,
  toggleHecho,
  togglePaso,
  textoRepeticion,
  agendarMetaEnRango,
  extenderRutinaARango,
} from '../rutinas'
import { addDias, inicioSemana } from '../fechaLocal'
import { aHHMM, aMin, alcanceDe, esMeta, progresoPasos, rangoDe, toggleMeta } from '../metas'
import { useRutinasUI } from '../state/rutinasUiStore'
import { colorDe } from './coloresRutina'
import { Cronograma } from './metas/Cronograma'
import { EditorRutina, rutinaNueva } from './RutinasPanel'
import { localeActual, useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * Calendario de rutinas (estilo Google Calendar, tema oscuro): vistas día /
 * semana / mes. En día/semana la rejilla es interactiva: clic+arrastre en un
 * hueco crea un evento con esa duración, los bloques se mueven con drag&drop
 * (cambian hora y día), se estiran desde el borde inferior, y un clic abre el
 * detalle con la checklist. Cada rutina tiene su color.
 */

type Vista = 'dia' | 'semana' | 'mes' | 'anio' | 'cronograma'

/**
 * Las vistas que pintan la rejilla del calendario. Cronograma queda fuera: no tiene
 * rejilla ni lista de lo agendado, así que los ajustes que solo valen ahí se tipan
 * contra esto y no hay que inventarle un valor.
 */
type VistaRejilla = Exclude<Vista, 'cronograma'>

/** Unidad en la que Metas agrupa lo agendado. */
type Agrupacion = 'hora' | 'dia' | 'semana' | 'mes'

/** Agrupaciones que ofrece cada vista (la primera es la de por defecto). */
const AGRUPACIONES: Record<VistaRejilla, Agrupacion[]> = {
  dia: ['hora'],
  semana: ['dia'],
  mes: ['semana', 'dia'],
  anio: ['mes', 'semana', 'dia'],
}

// La rejilla cubre las 24 h: el sueño cruza la madrugada y tiene que verse.
const HORA_INI = 0
const HORA_FIN = 23
const HORA_ARRANQUE = 5 // la vista abre aquí (la madrugada existe, pero no estorba)
const ALTO_HORA = 44 // px por hora
const GUTTER = '3rem' // columna de etiquetas de hora
const SNAP = 15 // minutos (intervalo mínimo)
const ASA = 8 // px de las asas del bloque (lados = repetir en días; abajo = duración)
const TOTAL_MIN = (HORA_FIN - HORA_INI + 1) * 60

/**
 * Minutos de inicio/fin del bloque de una rutina (fin por defecto: +60).
 * Si cruza medianoche (dormir 23:00 → 07:00) el `fin` viene en minutos del día
 * siguiente, o sea > 1440; quien pinta lo parte en dos.
 */
function rangoMin(r: Rutina): { ini: number; fin: number } | null {
  if (!r.hora) return null
  const ini = aMin(r.hora)
  if (!r.horaFin) return { ini, fin: ini + 60 }
  const fin = aMin(r.horaFin)
  return { ini, fin: fin > ini ? fin : fin + 1440 }
}

/** Un bloque tal como se pinta en la columna de un día. */
interface ItemDia {
  rutina: Rutina
  ini: number
  fin: number
  /** Es el trozo de después de medianoche de una rutina que empezó la víspera. */
  cola: boolean
}

/**
 * Bloques de la columna de `d`: los que empiezan ese día (recortados a
 * medianoche) más la cola de los que vienen cruzando desde la víspera.
 */
function itemsDia(rutinas: Rutina[], d: Date): ItemDia[] {
  const ayer = addDias(d, -1)
  const items: ItemDia[] = []
  for (const r of rutinas) {
    const rango = rangoMin(r)
    if (!rango) continue
    if (tocaFecha(r, d)) {
      items.push({ rutina: r, ini: rango.ini, fin: Math.min(rango.fin, 1440), cola: false })
    }
    if (rango.fin > 1440 && tocaFecha(r, ayer)) {
      items.push({ rutina: r, ini: 0, fin: rango.fin - 1440, cola: true })
    }
  }
  return items
}

/** Posición en columnas cuando varios eventos se traslapan (estilo Google Calendar). */
interface LayoutBloque extends ItemDia {
  columna: number
  totalColumnas: number
}

function layoutBloquesDia(items: ItemDia[]): LayoutBloque[] {
  const ordenados = [...items].sort((a, b) => a.ini - b.ini || b.fin - a.fin - (a.fin - a.ini))

  const result: LayoutBloque[] = []
  let cluster: ItemDia[] = []
  let clusterFin = 0

  const asignarCluster = () => {
    if (cluster.length === 0) return
    const finPorCol: number[] = []
    const asignados: { item: ItemDia; columna: number }[] = []
    for (const item of cluster) {
      let col = finPorCol.findIndex((fin) => fin <= item.ini)
      if (col === -1) {
        col = finPorCol.length
        finPorCol.push(item.fin)
      } else {
        finPorCol[col] = item.fin
      }
      asignados.push({ item, columna: col })
    }
    const totalColumnas = finPorCol.length
    for (const { item, columna } of asignados) {
      result.push({ ...item, columna, totalColumnas })
    }
    cluster = []
  }

  for (const item of ordenados) {
    if (cluster.length === 0) {
      cluster = [item]
      clusterFin = item.fin
    } else if (item.ini < clusterFin) {
      cluster.push(item)
      clusterFin = Math.max(clusterFin, item.fin)
    } else {
      asignarCluster()
      cluster = [item]
      clusterFin = item.fin
    }
  }
  asignarCluster()
  return result
}


/**
 * Días que ocupa hoy el evento (para saber de qué extremo se tira al estirarlo).
 * Solo un 'rango' abarca varios; el resto vive en el día del bloque agarrado.
 */
function tramoDe(r: Rutina, isoBloque: string): { ini: string; fin: string } {
  if (r.repeticion === 'rango' && r.fechaInicio && r.fechaFin) return { ini: r.fechaInicio, fin: r.fechaFin }
  return { ini: isoBloque, fin: isoBloque }
}

/**
 * ¿La capa de `r` cubre el día `d`?
 *
 * Una meta pinta su periodo tal cual, sin más: es lo que la mantiene sincronizada
 * con el cronograma en los dos sentidos — darle fechas allí (trazando sobre el eje
 * o arrastrando su barra) la hace aparecer aquí, y quitárselas la retira. No hay
 * paso de "agendar": la fecha es lo único que decide.
 *
 * Lo demás no cambia: para los peldaños finos ('dia' y 'hora') manda `tocaFecha`
 * (la fecha exacta o su repetición), y para año/mes/semana la capa lava TODO ese
 * periodo a partir de `fechaInicio` — si no, una rutina "anual" solo pintaría su
 * aniversario y la capa "año" nunca se vería como tal.
 */
function capaCubre(r: Rutina, d: Date): boolean {
  if (esMeta(r)) {
    const rango = r.activa ? rangoDe(r) : null
    if (!rango) return false
    const iso = fechaISO(d)
    return iso >= rango.ini && iso <= rango.fin
  }
  const alcance = alcanceDe(r)
  if (alcance === 'dia' || alcance === 'hora') return tocaFecha(r, d)
  if (!r.activa || r.suelta || !r.fechaInicio) return false
  const inicio = new Date(r.fechaInicio + 'T12:00')
  if (alcance === 'anio') return d.getFullYear() === inicio.getFullYear()
  if (alcance === 'mes') return d.getFullYear() === inicio.getFullYear() && d.getMonth() === inicio.getMonth()
  const iniSemana = inicioSemana(inicio)
  const finSemana = addDias(iniSemana, 6)
  return d >= iniSemana && d <= finSemana
}

/**
 * Jerarquía de capas: de la más amplia (atrás) a la más específica (al frente).
 * OJO: es un arreglo, así que olvidar un peldaño aquí no rompe la compilación —
 * esa capa simplemente dejaría de pintar en silencio.
 */
const ORDEN_CAPAS: Alcance[] = ['anio', 'mes', 'semana', 'dia', 'hora']
/** Opacidad de cada capa: la amplia lava suave, la específica pinta más fuerte. */
const ALFA_CAPA: Record<Alcance, string> = { anio: '30', mes: '40', semana: '55', dia: '66', hora: '7a' }

/** Primera rutina de cada alcance que cubre el día (una capa a lo mucho por alcance). */
function rutinaDeCapa(rutinas: Rutina[], d: Date, a: Alcance): Rutina | undefined {
  return rutinas.find((r) => alcanceDe(r) === a && capaCubre(r, d))
}

/**
 * Fondo en capas de una celda de día (Mes/Año): año atrás, luego mes, semana y
 * día al frente. Sin rutinas en una capa, esa capa no pinta. En CSS el primer
 * fondo de la lista queda ARRIBA, así que se recorre del frente hacia atrás.
 */
function capasFondo(rutinas: Rutina[], d: Date): string | undefined {
  const capas = [...ORDEN_CAPAS]
    .reverse()
    .map((a) => {
      const r = rutinaDeCapa(rutinas, d, a)
      if (!r) return null
      const c = `${colorDe(r)}${ALFA_CAPA[a]}`
      return `linear-gradient(${c}, ${c})`
    })
    .filter((x): x is string => x != null)
  return capas.length ? capas.join(', ') : undefined
}

/** Una capa pintada en la columna de un día de la rejilla, con su franja vertical. */
interface BandaCapa {
  color: string
  ini: number
  fin: number
  z: number
}

/**
 * Capas de la columna de un día (vistas Día y Semana). Las capas de contexto
 * (año/mes/semana) lavan la columna entera; los peldaños finos respetan su
 * horario, así se ven las horas y minutos exactos que ocupan. Misma jerarquía que
 * en Mes/Año.
 *
 * `rangoMin` ya devuelve null sin `hora`, así que una carpeta de día (que nunca
 * lleva hora) lava su columna entera y la hoja pinta solo su franja.
 */
function bandasCapas(rutinas: Rutina[], d: Date): BandaCapa[] {
  const bandas: BandaCapa[] = []
  ORDEN_CAPAS.forEach((a, i) => {
    const r = rutinaDeCapa(rutinas, d, a)
    if (!r) return
    const rango = a === 'dia' || a === 'hora' ? rangoMin(r) : null
    bandas.push({
      color: `${colorDe(r)}${ALFA_CAPA[a]}`,
      ini: rango ? rango.ini : 0,
      fin: rango ? Math.min(rango.fin, 1440) : 1440,
      z: i + 1, // el orden del arreglo ya es de atrás hacia el frente
    })
  })
  return bandas
}

/**
 * Estado de una rutina en una fecha (colorea el bloque).
 *
 * Una meta lleva su estado en sí misma, no por día: se cumple UNA vez, y su
 * periodo puede durar semanas — palomearla el martes y que el miércoles vuelva a
 * salir pendiente no querría decir nada. Así, palomearla en la lista de Metas se
 * ve al momento en la rejilla, que es lo que se espera de dos vistas de lo mismo.
 */
function estadoEnFecha(r: Rutina, fecha: string, ejecuciones: EjecucionRutina[] | undefined) {
  if (esMeta(r)) {
    const p = progresoPasos(r)
    if (r.completada || (p.total > 0 && p.hechos >= p.total)) return 'completa' as const
    return fecha === hoyISO() ? ('pendiente' as const) : ('normal' as const)
  }
  const e = ejecuciones?.find((x) => x.rutinaId === r.id && x.fecha === fecha)
  // Palomeada entera desde Metas: cuenta como completa aunque no tenga pasos.
  if (e?.hecho) return 'completa' as const
  if (r.pasos.length === 0) return 'normal' as const
  if (e && e.pasosHechos.length >= r.pasos.length) return 'completa' as const
  if (fecha === hoyISO()) return 'pendiente' as const
  return 'normal' as const
}

const SEMANA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

/** Con qué precisión se traza el rango en cada vista (lo dice el aviso de la meta armada). */
const AYUDA_TRAZO: Record<VistaRejilla, string> = {
  dia: 'Traza en la rejilla: horas y minutos',
  semana: 'Traza en la rejilla: días, horas y minutos',
  mes: 'Traza sobre los días: semanas y días',
  anio: 'Traza sobre los días: meses, semanas y días',
}

/** Modal del calendario: el atajo desde el reloj del HUD (la app del cuarto usa `CalendarioVista`). */
export function Calendario() {
  const abierto = useRutinasUI((s) => s.calendario)
  const cerrar = useRutinasUI((s) => s.cerrarCalendario)
  if (!abierto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={cerrar}>
      <div
        className="ui-panel-glass ui-pop flex h-[min(85vh,46rem)] w-[min(94vw,62rem)] flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <CalendarioVista onCerrar={cerrar} />
      </div>
    </div>
  )
}

/**
 * El calendario en sí (cabecera + rejilla). Lo comparten el modal del reloj y la
 * app del cuarto; sin `onCerrar` no se dibuja la ✕ (la app vive en el overlay del cuarto).
 */
export function CalendarioVista({ onCerrar, vistaInicial }: { onCerrar?: () => void; vistaInicial?: string }) {
  const t = useT()
  const [vista, setVista] = useState<Vista>(() =>
    vistaInicial && ['dia', 'semana', 'mes', 'anio', 'cronograma'].includes(vistaInicial)
      ? (vistaInicial as Vista)
      : 'semana',
  )
  const [fecha, setFecha] = useState(() => new Date())
  // Agrupación de Metas elegida en cada vista; sin elección manda la de por defecto
  // (mes → semanas, año → meses), y cada vista recuerda la suya por separado.
  const [agrupaciones, setAgrupaciones] = useState<Partial<Record<Vista, Agrupacion>>>({})
  const [editando, setEditando] = useState<Rutina | null>(null)
  const [detalle, setDetalle] = useState<{ rutina: Rutina; fecha: string } | null>(null)
  // Meta armada: la siguiente vez que se trace un rango en el calendario, se le
  // dan esas fechas a ESA meta en vez de crearse un evento nuevo.
  const [metaArmada, setMetaArmada] = useState<Rutina | null>(null)
  // Estabilizado: el `?? []` crearía un arreglo nuevo en cada render y tiraría por
  // tierra los memos que cuelgan de él (el eje del cronograma se recalcularía entero).
  const rutinasCargadas = rutinasRepo.useAll()
  const rutinas = useMemo(() => rutinasCargadas ?? [], [rutinasCargadas])
  const ejecuciones = ejecucionesRutinaRepo.useAll()
  /** La lista de Metas: solo la consume el cronograma. */
  const metas = useMemo(() => rutinas.filter(esMeta), [rutinas])

  // Lo que aportan las apps con fecha propia (viajes, y cualquiera que declare
  // `eventos`): el calendario ya no sabe de qué app viene cada cosa.
  const eventos = useEventosApps()

  const navegar = (dir: -1 | 1) => {
    if (vista === 'dia') setFecha(addDias(fecha, dir))
    else if (vista === 'semana') setFecha(addDias(fecha, dir * 7))
    else if (vista === 'anio') setFecha(new Date(fecha.getFullYear() + dir, 0, 1))
    // El cronograma no se navega por aquí: su eje lo mueve su propio scroll.
    else if (vista !== 'cronograma') setFecha(new Date(fecha.getFullYear(), fecha.getMonth() + dir, 1))
  }

  const titulo =
    vista === 'cronograma'
      ? t('cal.cronograma', 'Cronograma')
      : vista === 'anio'
      ? String(fecha.getFullYear())
      : vista === 'mes'
        ? fecha.toLocaleDateString(localeActual(), { month: 'long', year: 'numeric' })
        : vista === 'semana'
          ? `${inicioSemana(fecha).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })} – ${addDias(inicioSemana(fecha), 6).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short', year: 'numeric' })}`
          : fecha.toLocaleDateString(localeActual(), { weekday: 'long', day: 'numeric', month: 'long' })

  const vistas: { id: Vista; label: string }[] = [
    { id: 'dia', label: t('cal.dia', 'Día') },
    { id: 'semana', label: t('cal.semana', 'Semana') },
    { id: 'mes', label: t('cal.mes', 'Mes') },
    { id: 'anio', label: t('cal.anio', 'Año') },
    { id: 'cronograma', label: t('cal.cronograma', 'Cronograma') },
  ]

  const abrirDia = (d: Date) => {
    setFecha(d)
    setVista('dia')
  }

  /** Clic en un mes de la vista Año. */
  const abrirMes = (m: number) => {
    setFecha(new Date(fecha.getFullYear(), m, 1))
    setVista('mes')
  }

  /**
   * Trazo en la rejilla (Día/Semana): con una meta armada la agenda en ese
   * hueco — el rango va con precisión de minutos; si no, abre el editor para
   * un evento nuevo, como siempre.
   */
  const crearEn = (d: Date, ini: number, fin: number) => {
    const iso = fechaISO(d)
    if (metaArmada) {
      void agendarMetaEnRango(metaArmada, {
        fechaInicio: iso,
        fechaFin: iso,
        hora: aHHMM(ini),
        horaFin: aHHMM(fin),
      })
      setMetaArmada(null)
      return
    }
    setEditando(
      rutinaNueva({
        hora: aHHMM(ini),
        horaFin: aHHMM(fin),
        dias: [d.getDay()],
        repeticion: 'semanal',
        fechaInicio: iso,
      }),
    )
  }

  /** Estirón de un evento a lo ancho (Mes/Año): se repite en los días del tramo. */
  const extender = (r: Rutina, isoAncla: string, isoDestino: string) => {
    void extenderRutinaARango(r, isoAncla, isoDestino)
  }

  /**
   * Trazo en Mes/Año: rango de días (sin eje de horas). Con meta armada la
   * agenda de punta a punta; si no, abre el editor con esas fechas.
   */
  const trazarDias = (isoA: string, isoB: string) => {
    const [fechaInicio, fechaFin] = isoA <= isoB ? [isoA, isoB] : [isoB, isoA]
    if (metaArmada) {
      void agendarMetaEnRango(metaArmada, { fechaInicio, fechaFin })
      setMetaArmada(null)
      return
    }
    setEditando(
      rutinaNueva({
        fechaInicio,
        fechaFin: fechaInicio === fechaFin ? undefined : fechaFin,
        repeticion: fechaInicio === fechaFin ? 'una_vez' : 'rango',
        dias: [],
      }),
    )
  }

  return (
    <>
      <div data-tut="cal.panel" className="relative flex h-full min-h-0 flex-col">
        {/* Cabecera */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <span className="text-lg"><Icono nombre="calendario" /></span>
          <button
            type="button"
            data-tut="cal.hoy"
            onClick={() => setFecha(new Date())}
            className="rounded-lg border border-white/15 px-2.5 py-1 text-xs font-semibold text-white/75 transition hover:bg-white/10"
          >
            {t('cal.hoy', 'Hoy')}
          </button>
          <div className="flex">
            <button type="button" onClick={() => navegar(-1)} className="px-2 py-1 text-white/55 transition hover:text-white">
              ‹
            </button>
            <button type="button" onClick={() => navegar(1)} className="px-2 py-1 text-white/55 transition hover:text-white">
              ›
            </button>
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-bold capitalize text-white/90">{titulo}</p>
          <div data-tut="cal.vistas" className="flex rounded-lg border border-white/10 p-0.5">
            {vistas.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVista(v.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  vista === v.id ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-tut="cal.nueva"
            onClick={() => setEditando(rutinaNueva())}
            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold texto-cta transition hover:bg-emerald-600"
          >
            + {t('rutinas.nueva', 'Nueva')}
          </button>
          {onCerrar && (
            <button type="button" onClick={onCerrar} className="px-1.5 text-white/40 transition hover:text-white/85" title={t('rutinas.cerrar', 'Cerrar')}>
              ✕
            </button>
          )}
        </div>

        {/* El cronograma se come el cuerpo entero: ni rejilla ni lista de lo agendado. */}
        {vista === 'cronograma' ? (
          <Cronograma
            metas={metas}
            metaArmada={metaArmada}
            onArmar={(r) => setMetaArmada((prev) => (prev?.id === r.id ? null : r))}
          />
        ) : (
        /* Cuerpo: la rejilla sigue visible debajo (el editor flota como notificación, ver abajo) */
        <div data-scroll-cal className="min-h-0 flex-1 overflow-y-auto p-3">
          {vista === 'anio' ? (
            <VistaAño
              fecha={fecha}
              rutinas={rutinas}
              ejecuciones={ejecuciones}
              onDia={abrirDia}
              onMes={abrirMes}
              onTrazar={trazarDias}
              onExtender={extender}
              metaArmada={metaArmada}
            />
          ) : vista === 'mes' ? (
            <VistaMes
              fecha={fecha}
              rutinas={rutinas}
              eventos={eventos}
              ejecuciones={ejecuciones}
              onDia={abrirDia}
              onTrazar={trazarDias}
              onExtender={extender}
            />
          ) : (
            <RejillaTiempo
              dias={vista === 'semana' ? Array.from({ length: 7 }, (_, i) => addDias(inicioSemana(fecha), i)) : [fecha]}
              rutinas={rutinas}
              eventos={eventos}
              ejecuciones={ejecuciones}
              onDia={vista === 'semana' ? abrirDia : undefined}
              onDetalle={(rutina, f) => setDetalle({ rutina, fecha: f })}
              onCrear={crearEn}
            />
          )}
          <SeccionMetas
            vista={vista}
            fecha={fecha}
            rutinas={rutinas}
            ejecuciones={ejecuciones}
            agrupacion={agrupaciones[vista]}
            onAgrupacion={(a) => setAgrupaciones((s) => ({ ...s, [vista]: a }))}
            onDetalle={(rutina, f) => setDetalle({ rutina, fecha: f })}
          />
        </div>
        )}

        {/* Meta armada: recuerda que el siguiente trazo la agenda (y deja cancelar) */}
        {metaArmada && (
          <div className="ui-notif pointer-events-none absolute inset-x-0 top-14 z-30 flex justify-center">
            <div
              className="ui-panel-glass pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-lg backdrop-blur-md"
              style={{ borderColor: `${colorDe(metaArmada)}aa` }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorDe(metaArmada) }} />
              <span className="text-white/90">
                <Icono emoji={metaArmada.emoji} /> {metaArmada.nombre}
              </span>
              {/* En el cronograma no se traza: el periodo se pone en la barra o en las fechas. */}
              {vista !== 'cronograma' && (
                <span className="text-white/45">{t(`cal.traza.${vista}`, AYUDA_TRAZO[vista])}</span>
              )}
              <button
                type="button"
                onClick={() => setMetaArmada(null)}
                className="px-0.5 text-white/40 transition hover:text-white/85"
                title={t('cal.cancelarTrazo', 'Cancelar')}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Editor de evento: notificación flotante (no bloquea ni empuja la rejilla) */}
        {editando && (
          <div className="ui-notif pointer-events-none absolute inset-x-3 top-3 z-30 flex justify-end sm:inset-x-auto sm:right-3">
            <div className="ui-panel-glass pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border border-white/10 shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                <span className="text-amber-400/90"><Icono nombre="campana" /></span>
                <p className="flex-1 text-xs font-bold text-white/85">
                  {editando.id != null ? t('cal.editarEvento', 'Editar evento') : t('cal.nuevoEvento', 'Nuevo evento')}
                </p>
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="px-1 text-white/40 transition hover:text-white/85"
                  title={t('rutinas.cerrar', 'Cerrar')}
                >
                  ✕
                </button>
              </div>
              <div className="p-3">
                <EditorRutina rutina={editando} onCerrar={() => setEditando(null)} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detalle del evento (clic en un bloque) */}
      {detalle && (
        <DetalleRutina
          rutina={rutinas.find((r) => r.id === detalle.rutina.id) ?? detalle.rutina}
          fecha={detalle.fecha}
          ejecuciones={ejecuciones}
          onEditar={() => {
            setEditando({ ...detalle.rutina, pasos: detalle.rutina.pasos.map((p) => ({ ...p })) })
            setDetalle(null)
          }}
          onCerrar={() => setDetalle(null)}
        />
      )}
    </>
  )
}

// ---------- Rejilla interactiva (día y semana) ----------

/**
 * Interacción de puntero en curso sobre la rejilla. El eje decide la naturaleza:
 * 'estirar' (asa de abajo) alarga la duración continua; 'repetir' (asas de los
 * lados) extiende el evento a días consecutivos, conservando su hora.
 */
type Gesto =
  | { tipo: 'crear'; col: number; ini: number; fin: number }
  | { tipo: 'mover'; rutina: Rutina; dur: number; agarre: number; col: number; ini: number; movio: boolean; colOrigen: number }
  | { tipo: 'estirar'; rutina: Rutina; col: number; ini: number; fin: number }
  /**
   * `isoAncla` es el extremo que NO se mueve (el opuesto al asa de la que se
   * tira). Va en ISO, no en columna: un tramo que empieza antes de la semana
   * visible se encogería si el ancla fuera una columna de la rejilla.
   */
  | { tipo: 'repetir'; rutina: Rutina; isoAncla: string; col: number }

function RejillaTiempo({
  dias,
  rutinas,
  eventos,
  ejecuciones,
  onDia,
  onDetalle,
  onCrear,
}: {
  dias: Date[]
  rutinas: Rutina[]
  /** Lo que aportan las apps por fecha (solo lectura, van en la fila "sin hora"). */
  eventos: Map<string, EventoResuelto[]>
  ejecuciones: EjecucionRutina[] | undefined
  onDia?: (d: Date) => void
  onDetalle: (r: Rutina, fechaIso: string) => void
  onCrear: (d: Date, ini: number, fin: number) => void
}) {
  const t = useT()
  const gridRef = useRef<HTMLDivElement>(null)
  const [gesto, setGesto] = useState<Gesto | null>(null)
  const nCols = dias.length
  const hoy = hoyISO()
  const horas = Array.from({ length: HORA_FIN - HORA_INI + 1 }, (_, i) => HORA_INI + i)
  // Cambio sobre una serie en espera de que se decida a qué días aplica.
  const [pendiente, setPendiente] = useState<{
    rutina: Rutina
    cambios: Partial<Rutina>
    origen: string
    destino: string
  } | null>(null)

  const aplicarPendiente = async (soloHoy: boolean) => {
    if (!pendiente) return
    const { rutina, cambios, origen, destino } = pendiente
    setPendiente(null)
    await guardarHorarioRutina(rutina, cambios, soloHoy ? { origen, destino } : undefined)
  }

  // La rejilla empieza a medianoche, pero abrir el calendario en la madrugada
  // vacía sería absurdo: arranca a la altura de HORA_ARRANQUE.
  useEffect(() => {
    const cont = gridRef.current?.closest('[data-scroll-cal]')
    if (cont) cont.scrollTop = HORA_ARRANQUE * ALTO_HORA
  }, [])

  // Geometría: posición del puntero → columna (día) y minuto (snap 30).
  const localizar = (e: PointerEvent | React.PointerEvent) => {
    const rect = gridRef.current!.getBoundingClientRect()
    const gutterPx = 48
    const colW = (rect.width - gutterPx) / nCols
    const col = Math.max(0, Math.min(nCols - 1, Math.floor((e.clientX - rect.left - gutterPx) / colW)))
    const minCrudo = HORA_INI * 60 + ((e.clientY - rect.top) / ALTO_HORA) * 60
    const min = Math.max(HORA_INI * 60, Math.min(HORA_INI * 60 + TOTAL_MIN, Math.round(minCrudo / SNAP) * SNAP))
    return { col, min }
  }

  /** Escucha movimiento/suelta en window mientras dura el gesto. */
  const seguirGesto = (inicial: Gesto) => {
    setGesto(inicial)
    let actual = inicial
    const onMove = (e: PointerEvent) => {
      const { col, min } = localizar(e)
      if (actual.tipo === 'crear') {
        actual = { ...actual, fin: Math.max(actual.ini + SNAP, min) }
      } else if (actual.tipo === 'mover') {
        // El inicio se queda dentro del día; el fin puede cruzar medianoche
        // (si no, un bloque de 8 h como el sueño no podría ponerse a las 23:00).
        const ini = Math.max(0, Math.min(1440 - SNAP, min - actual.agarre))
        const movio = actual.movio || ini !== actual.ini || col !== actual.col
        actual = { ...actual, col, ini, movio }
      } else if (actual.tipo === 'repetir') {
        // Solo cuenta la columna: el tramo son días, la hora no se toca.
        actual = { ...actual, col }
      } else {
        actual = { ...actual, fin: Math.max(actual.ini + SNAP, min) }
      }
      setGesto(actual)
    }
    const onUp = async () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setGesto(null)
      if (actual.tipo === 'crear') {
        onCrear(dias[actual.col], actual.ini, actual.fin)
      } else if (actual.tipo === 'mover') {
        if (!actual.movio) {
          onDetalle(actual.rutina, fechaISO(dias[actual.col]))
          return
        }
        const r = actual.rutina
        const cambios: Partial<Rutina> = { hora: aHHMM(actual.ini), horaFin: aHHMM(actual.ini + actual.dur) }
        // Mover a otra columna: ajustar día (series) o fecha (evento único).
        if (actual.col !== actual.colOrigen) {
          if (r.repeticion === 'una_vez') {
            cambios.fechaInicio = fechaISO(dias[actual.col])
          } else if (r.dias.length > 0) {
            const de = dias[actual.colOrigen].getDay()
            const a = dias[actual.col].getDay()
            cambios.dias = [...new Set(r.dias.map((d) => (d === de ? a : d)))].sort()
          }
        }
        const fechas = {
          origen: fechaISO(dias[actual.colOrigen]),
          destino: fechaISO(dias[actual.col]),
        }
        // Una serie afecta a muchos días: hay que preguntar antes de tocarla.
        if (esSerie(r)) setPendiente({ rutina: r, cambios, ...fechas })
        else await guardarHorarioRutina(r, cambios)
      } else if (actual.tipo === 'repetir') {
        await extenderRutinaARango(actual.rutina, actual.isoAncla, fechaISO(dias[actual.col]))
      } else {
        const r = actual.rutina
        const cambios: Partial<Rutina> = { horaFin: aHHMM(actual.fin) }
        const iso = fechaISO(dias[actual.col])
        if (esSerie(r)) setPendiente({ rutina: r, cambios, origen: iso, destino: iso })
        else await guardarHorarioRutina(r, cambios)
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const izquierda = (col: number) => `calc(${GUTTER} + ${col} * ((100% - ${GUTTER}) / ${nCols}))`
  const ancho = `calc((100% - ${GUTTER}) / ${nCols} - 4px)`
  const izquierdaBloque = (col: number, subCol: number, totalSub: number) =>
    `calc(${GUTTER} + ${col} * ((100% - ${GUTTER}) / ${nCols}) + ${subCol} * ((100% - ${GUTTER}) / ${nCols} / ${totalSub}) + 2px)`
  const anchoBloque = (totalSub: number) => `calc((100% - ${GUTTER}) / ${nCols} / ${totalSub} - 4px)`
  const arriba = (min: number) => ((min - HORA_INI * 60) / 60) * ALTO_HORA

  return (
    <div className={nCols > 1 ? 'min-w-[640px]' : ''}>
      {/* Cabecera de días */}
      <div className="grid border-b border-white/10 pb-1" style={{ gridTemplateColumns: `${GUTTER} repeat(${nCols}, 1fr)` }}>
        <div />
        {dias.map((d, i) => {
          const esHoy = fechaISO(d) === hoy
          const contenido = (
            <>
              <p className="text-[10px] uppercase text-white/40">{SEMANA[(d.getDay() + 6) % 7]}</p>
              <p className={`mx-auto grid h-6 w-6 place-items-center rounded-full text-sm font-bold ${esHoy ? 'bg-emerald-600 texto-cta' : 'text-white/80'}`}>
                {d.getDate()}
              </p>
            </>
          )
          return onDia ? (
            <button key={i} type="button" data-dia={fechaISO(d)} onClick={() => onDia(d)} className="text-center transition hover:bg-white/5">
              {contenido}
            </button>
          ) : (
            <div key={i} data-dia={fechaISO(d)} className="text-center">{contenido}</div>
          )
        })}
      </div>

      {/* Fila "sin hora" */}
      <div className="grid border-b border-white/10" style={{ gridTemplateColumns: `${GUTTER} repeat(${nCols}, 1fr)` }}>
        <div className="py-1 pr-2 text-right text-[9px] text-white/30">⋯</div>
        {dias.map((d, i) => (
          <div key={i} className="space-y-0.5 border-l border-white/5 p-0.5">
            {rutinas
              .filter((r) => tocaFecha(r, d) && !r.hora)
              .map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onDetalle(r, fechaISO(d))}
                  className="block w-full truncate rounded border px-1 text-left text-[10px] leading-4 text-white/90 transition hover:brightness-125"
                  style={{ backgroundColor: `${colorDe(r)}33`, borderColor: `${colorDe(r)}66` }}
                >
                  <Icono emoji={r.emoji} /> {r.nombre}
                </button>
              ))}
            {(eventos.get(fechaISO(d)) ?? []).map((e, j) => (
              <button
                key={`e${j}`}
                type="button"
                title={e.texto}
                onClick={() => abrirApp(e.plantillaId, e.seccion)}
                className="block w-full truncate rounded border px-1 text-left text-[10px] leading-4 text-white/90 transition hover:brightness-125"
                style={{ backgroundColor: `${e.color}22`, borderColor: `${e.color}55` }}
              >
                <Icono emoji={e.emoji} /> {e.texto}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Rejilla por horas: clic+arrastre crea; bloques se mueven y estiran */}
      <div
        ref={gridRef}
        className="relative cursor-crosshair touch-none select-none"
        style={{ height: (TOTAL_MIN / 60) * ALTO_HORA }}
        onPointerDown={(e) => {
          if (e.button !== 0 || (e.target as HTMLElement).closest('[data-bloque]')) return
          const { col, min } = localizar(e)
          seguirGesto({ tipo: 'crear', col, ini: min, fin: min + SNAP })
        }}
      >
        {/* Líneas de hora y etiquetas */}
        {horas.map((h, i) => (
          <div key={h} className="absolute left-0 right-0 border-t border-white/5" style={{ top: i * ALTO_HORA }}>
            <span className="absolute -top-1.5 w-10 pr-2 text-right text-[9px] tabular-nums text-white/30">
              {String(h).padStart(2, '0')}:00
            </span>
          </div>
        ))}
        {/* Líneas verticales de columnas */}
        {dias.map((_, i) => (
          <div key={i} className="absolute bottom-0 top-0 border-l border-white/5" style={{ left: izquierda(i) }} />
        ))}

        {/* Capas de color por día: contexto (año/mes/semana) + la franja horaria del día */}
        {dias.map((d, col) =>
          bandasCapas(rutinas, d).map((b, i) => (
            <div
              key={`capa-${col}-${i}`}
              className="pointer-events-none absolute"
              style={{
                left: izquierda(col),
                width: ancho,
                top: arriba(b.ini),
                height: ((b.fin - b.ini) / 60) * ALTO_HORA,
                backgroundColor: b.color,
                zIndex: b.z,
              }}
            />
          )),
        )}

        {/* Bloques de rutina (escalonados si se traslapan) */}
        {dias.map((d, col) =>
          layoutBloquesDia(itemsDia(rutinas, d)).map((bloque) => {
              const r = bloque.rutina
              // El gesto se hace sobre el rango REAL (sin recortar a medianoche):
              // si no, mover el sueño lo encogería al trozo visible del día.
              const rango = rangoMin(r)!
              // La fecha del bloque es la de la víspera cuando es una cola.
              const fechaBloque = fechaISO(bloque.cola ? addDias(d, -1) : d)
              // Mientras se mueve/estira, el bloque sigue al puntero. La cola no
              // participa: se repinta sola cuando el gesto se confirma.
              const enGesto =
                !bloque.cola && gesto && gesto.tipo !== 'crear' && gesto.rutina.id === r.id
              const movEsta = enGesto && gesto.tipo === 'mover' && col === gesto.colOrigen
              // Guarda que SÍ estrecha el tipo a la variante 'mover' (gesto.movio existe).
              const moviendoEste = gesto?.tipo === 'mover' && gesto.movio && gesto.rutina.id === r.id
              if (movEsta && gesto.col !== col && gesto.movio) return null // se dibuja en la columna destino
              // Pintado: el trozo que cae en ESTE día (ya recortado en `bloque`).
              const ini = movEsta ? gesto.ini : enGesto && gesto.tipo === 'estirar' && col === gesto.col ? gesto.ini : bloque.ini
              const fin = movEsta ? gesto.ini + gesto.dur : enGesto && gesto.tipo === 'estirar' && col === gesto.col ? gesto.fin : bloque.fin
              const colRender = movEsta && gesto.movio ? gesto.col : col
              // Al mover, el bloque se colapsa a una sola columna (ancho completo).
              const subCol = moviendoEste ? 0 : bloque.columna
              const totalSub = moviendoEste ? 1 : bloque.totalColumnas
              const estado = estadoEnFecha(r, fechaBloque, ejecuciones)
              const color = colorDe(r)
              return (
                <div
                  key={`${r.id}-${col}-${bloque.cola ? 'cola' : 'ini'}`}
                  data-bloque
                  onPointerDown={(e) => {
                    if (e.button !== 0) return
                    e.stopPropagation()
                    // La cola solo se consulta: se mueve desde su bloque de origen.
                    if (bloque.cola) {
                      onDetalle(r, fechaBloque)
                      return
                    }
                    const { min } = localizar(e)
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    // Los lados mandan sobre el borde inferior: en un bloque corto
                    // las esquinas se pisan, y estirar a lo ancho es lo específico.
                    const tramo = tramoDe(r, fechaBloque)
                    if (nCols > 1 && e.clientX < rect.left + ASA) {
                      seguirGesto({ tipo: 'repetir', rutina: r, isoAncla: tramo.fin, col })
                    } else if (nCols > 1 && e.clientX > rect.right - ASA) {
                      seguirGesto({ tipo: 'repetir', rutina: r, isoAncla: tramo.ini, col })
                    } else if (e.clientY > rect.bottom - ASA) {
                      seguirGesto({ tipo: 'estirar', rutina: r, col, ini: rango.ini, fin: rango.fin })
                    } else {
                      seguirGesto({ tipo: 'mover', rutina: r, dur: rango.fin - rango.ini, agarre: min - rango.ini, col, ini: rango.ini, movio: false, colOrigen: col })
                    }
                  }}
                  className={`absolute z-10 cursor-grab overflow-hidden rounded-md border px-1 py-0.5 text-[10px] leading-tight text-white/95 transition-[filter] hover:brightness-125 ${
                    estado === 'completa' ? 'opacity-60' : ''
                  } ${estado === 'pendiente' ? 'ring-1 ring-amber-400/80' : ''} ${enGesto ? 'cursor-grabbing brightness-125' : ''}`}
                  style={{
                    left: izquierdaBloque(colRender, subCol, totalSub),
                    width: anchoBloque(totalSub),
                    top: arriba(ini),
                    height: Math.max(18, ((Math.min(fin, 1440) - ini) / 60) * ALTO_HORA - 2),
                    backgroundColor: `${color}40`,
                    borderColor: `${color}aa`,
                  }}
                >
                  <p className="truncate font-semibold">
                    {estado === 'completa' ? '✓ ' : ''}<Icono emoji={r.emoji} /> {r.nombre}
                  </p>
                  {/* La etiqueta muestra el rango completo, aunque el trozo pintado se corte. */}
                  <p className="truncate tabular-nums opacity-70">
                    {aHHMM(enGesto ? ini : rango.ini)} – {aHHMM(enGesto ? fin : rango.fin)}
                  </p>
                  {/* Asa de duración (borde inferior) */}
                  <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize" />
                  {/* Asas de repetir en días seguidos (lados); en vista Día no hay a dónde estirar */}
                  {nCols > 1 && !bloque.cola && (
                    <>
                      <div
                        className="absolute inset-y-0 left-0 w-2 cursor-ew-resize"
                        title={t('cal.estirarRepetir', 'Estira para repetirlo en días seguidos')}
                      />
                      <div
                        className="absolute inset-y-0 right-0 w-2 cursor-ew-resize"
                        title={t('cal.estirarRepetir', 'Estira para repetirlo en días seguidos')}
                      />
                    </>
                  )}
                </div>
              )
            }),
        )}

        {/* Fantasma de creación */}
        {gesto?.tipo === 'crear' && (
          <div
            className="pointer-events-none absolute z-20 rounded-md border-2 border-dashed border-emerald-400/70 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-400"
            style={{ left: izquierda(gesto.col), width: ancho, top: arriba(gesto.ini), height: ((gesto.fin - gesto.ini) / 60) * ALTO_HORA }}
          >
            {aHHMM(gesto.ini)} – {aHHMM(gesto.fin)} · {t('cal.nueva', 'nuevo evento')}
          </div>
        )}

        {/* Fantasma del tramo: el evento repetido en cada día que abarca el estirón */}
        {gesto?.tipo === 'repetir' && (() => {
          const rango = rangoMin(gesto.rutina)
          const isoDestino = fechaISO(dias[gesto.col])
          const [ini, fin] = gesto.isoAncla <= isoDestino ? [gesto.isoAncla, isoDestino] : [isoDestino, gesto.isoAncla]
          const color = colorDe(gesto.rutina)
          return dias.map((d, i) => {
            const iso = fechaISO(d)
            if (iso < ini || iso > fin) return null
            // Sin hora el evento ocupa el día entero: el fantasma cubre la columna.
            const top = rango ? arriba(rango.ini) : 0
            const alto = rango
              ? Math.max(18, ((Math.min(rango.fin, 1440) - rango.ini) / 60) * ALTO_HORA - 2)
              : (TOTAL_MIN / 60) * ALTO_HORA
            return (
              <div
                key={`rep-${i}`}
                className="pointer-events-none absolute z-20 overflow-hidden rounded-md border-2 border-dashed px-1 py-0.5 text-[10px] leading-tight text-white/95"
                style={{ left: izquierda(i), width: ancho, top, height: alto, backgroundColor: `${color}55`, borderColor: color }}
              >
                <p className="truncate font-semibold">
                  <Icono emoji={gesto.rutina.emoji} /> {gesto.rutina.nombre}
                </p>
              </div>
            )
          })
        })()}
      </div>

      {/* Alcance del cambio: una serie afecta a muchos días, así que se pregunta */}
      {pendiente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="ui-panel-2 ui-pop w-full max-w-xs rounded-xl border border-white/10 p-4 shadow-2xl">
            <p className="truncate text-sm font-bold">
              <Icono emoji={pendiente.rutina.emoji} /> {pendiente.rutina.nombre}
            </p>
            <p className="mt-0.5 tabular-nums text-xs text-white/50">
              {pendiente.cambios.hora ?? pendiente.rutina.hora} –{' '}
              {pendiente.cambios.horaFin ?? pendiente.rutina.horaFin}
            </p>
            <p className="mt-2.5 text-xs text-white/70">
              {t('cal.alcance.pregunta', '¿A qué días aplica el cambio?')}
            </p>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => void aplicarPendiente(true)}
                className="w-full rounded-lg border border-white/15 bg-white/5 py-2 text-xs font-bold transition hover:bg-white/10"
              >
                {t('cal.alcance.dia', 'Solo este día')}
              </button>
              <button
                type="button"
                onClick={() => void aplicarPendiente(false)}
                className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold texto-cta transition hover:brightness-110"
              >
                {pendiente.rutina.dias.length === 0
                  ? t('cal.alcance.todosDias', 'Todos los días')
                  : t('cal.alcance.serie', 'Toda la serie')}
              </button>
              <button
                type="button"
                onClick={() => setPendiente(null)}
                className="w-full py-1 text-xs font-semibold text-white/40 transition hover:text-white/80"
              >
                {t('cal.alcance.cancelar', 'Cancelar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Detalle del evento (popover) ----------

function DetalleRutina({
  rutina,
  fecha,
  ejecuciones,
  onEditar,
  onCerrar,
}: {
  rutina: Rutina
  fecha: string
  ejecuciones: EjecucionRutina[] | undefined
  onEditar: () => void
  onCerrar: () => void
}) {
  const t = useT()
  const esHoy = fecha === hoyISO()
  const ejec = ejecuciones?.find((x) => x.rutinaId === rutina.id && x.fecha === fecha)
  const hechos = new Set(ejec?.pasosHechos ?? [])
  const color = colorDe(rutina)

  return (
    // stopPropagation: este fondo vive dentro del fondo del calendario; sin él,
    // cerrar el detalle cerraría también el calendario.
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={(e) => {
        e.stopPropagation()
        onCerrar()
      }}
    >
      <div
        className="ui-panel-glass ui-pop w-80 rounded-2xl border p-3 shadow-2xl backdrop-blur-md"
        style={{ borderColor: `${color}66` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <p className="flex-1 truncate text-sm font-bold text-white/90">
            <Icono emoji={rutina.emoji} /> {rutina.nombre}
          </p>
          <button type="button" onClick={onEditar} className="px-1 text-xs text-white/40 transition hover:text-white/85" title={t('rutinas.editar', 'Editar')}>
            <Icono nombre="editar" />
          </button>
          <button
            type="button"
            onClick={async () => {
              if (rutina.id != null) await rutinasRepo.remove(rutina.id)
              onCerrar()
            }}
            className="px-1 text-xs text-white/40 transition hover:text-red-400"
            title={t('rutinas.borrar', 'Borrar')}
          >
            <Icono nombre="basura" />
          </button>
          <button type="button" onClick={onCerrar} className="px-1 text-sm text-white/40 transition hover:text-white/85">
            ✕
          </button>
        </div>
        <p className="mb-2 text-[11px] capitalize text-white/45">
          {new Date(fecha + 'T12:00').toLocaleDateString(localeActual(), { weekday: 'long', day: 'numeric', month: 'long' })}
          {rutina.hora && ` · ${rutina.hora}${rutina.horaFin ? ` – ${rutina.horaFin}` : ''}`}
        </p>
        <p className="mb-2 text-[10px] text-white/35"><Icono nombre="repetir" /> {textoRepeticion(rutina)}</p>
        {rutina.nota && (
          <p className="mb-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white/60">
            <Icono nombre="nota" /> {rutina.nota}
          </p>
        )}
        <div className="space-y-0.5">
          {rutina.pasos.length === 0 ? (
            <p className="py-2 text-center text-[11px] text-white/40">
              {t('cal.eventoSimple', 'Evento del calendario (sin checklist).')}
            </p>
          ) : (
            rutina.pasos.map((p, i) => {
            const hecho = hechos.has(i)
            const room = getPlantilla(p.roomId)
            const fila = (
              <>
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${hecho ? 'border-emerald-400 bg-emerald-500/30 text-emerald-400' : 'border-white/25'}`}>
                  {hecho ? '✓' : ''}
                </span>
                <span className={`flex-1 truncate text-left text-xs text-white/80 ${hecho ? 'line-through opacity-50' : ''}`}>{p.titulo}</span>
                {p.esquemaId && <span className="text-[10px] text-amber-400/80"><Icono nombre="energia" /></span>}
                <span className="text-xs opacity-60">{room && <Icono emoji={room.icon} />}</span>
              </>
            )
            return esHoy ? (
              <button key={i} type="button" onClick={() => togglePaso(rutina, i)} className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-white/10">
                {fila}
              </button>
            ) : (
              <div key={i} className="flex w-full items-center gap-2 px-1.5 py-1 opacity-80">
                {fila}
              </div>
            )
          })
          )}
        </div>
        {!esHoy && rutina.pasos.length > 0 && (
          <p className="mt-2 text-center text-[10px] text-white/30">
            {t('cal.soloHoy', 'Los pasos solo se palomean el día de hoy.')}
          </p>
        )}
      </div>
    </div>
  )
}

// ---------- Sección METAS ----------

/** Una cosa agendada en una fecha concreta (una ocurrencia de la rutina). */
interface Ocurrencia {
  rutina: Rutina
  d: Date
  iso: string
}

/** Días que abarca la vista: el rango que Metas resume. */
function rangoVista(vista: Vista, fecha: Date): Date[] {
  if (vista === 'dia') return [fecha]
  if (vista === 'semana') return Array.from({ length: 7 }, (_, i) => addDias(inicioSemana(fecha), i))
  if (vista === 'mes') {
    const n = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate()
    return Array.from({ length: n }, (_, i) => new Date(fecha.getFullYear(), fecha.getMonth(), i + 1))
  }
  const dias: Date[] = []
  for (let m = 0; m < 12; m++) {
    const n = new Date(fecha.getFullYear(), m + 1, 0).getDate()
    for (let i = 1; i <= n; i++) dias.push(new Date(fecha.getFullYear(), m, i))
  }
  return dias
}

/** Clave y etiqueta del grupo al que cae una ocurrencia, según la unidad. */
function grupoDe(o: Ocurrencia, agr: Agrupacion, locale: string, sinHora: string): { clave: string; etiqueta: string } {
  if (agr === 'hora') {
    const h = o.rutina.hora ?? ''
    return { clave: h, etiqueta: h || sinHora }
  }
  if (agr === 'dia') {
    return { clave: o.iso, etiqueta: o.d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' }) }
  }
  if (agr === 'semana') {
    const ini = inicioSemana(o.d)
    const fin = addDias(ini, 6)
    return {
      clave: fechaISO(ini),
      etiqueta: `${ini.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${fin.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`,
    }
  }
  return {
    clave: `${o.d.getFullYear()}-${o.d.getMonth()}`,
    etiqueta: o.d.toLocaleDateString(locale, { month: 'long' }),
  }
}

/** Cuántas ocurrencias se listan por grupo antes de plegar el resto. */
const TOPE_GRUPO = 20

/**
 * Metas: todo lo agendado del rango que muestra el calendario, como checklist.
 * La unidad de agrupación depende de la vista (día → horas, semana → días,
 * mes → semanas o días, año → meses, semanas o días). Palomear marca la
 * ocurrencia entera de ese día, y el bloque de la rejilla se tacha con ella.
 * Los eventos de viaje no salen: son de otra app y no se palomean.
 */
function SeccionMetas({
  vista,
  fecha,
  rutinas,
  ejecuciones,
  agrupacion,
  onAgrupacion,
  onDetalle,
}: {
  vista: VistaRejilla
  fecha: Date
  rutinas: Rutina[]
  ejecuciones: EjecucionRutina[] | undefined
  /** Sin valor (o si no aplica a la vista) manda la agrupación por defecto de la vista. */
  agrupacion: Agrupacion | undefined
  onAgrupacion: (a: Agrupacion) => void
  onDetalle: (r: Rutina, iso: string) => void
}) {
  const t = useT()
  const locale = localeActual()
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const opciones = AGRUPACIONES[vista]
  const agr = agrupacion && opciones.includes(agrupacion) ? agrupacion : opciones[0]
  const sinHora = t('cal.sinHora', 'Sin hora')

  const grupos = useMemo(() => {
    const ocurrencias: Ocurrencia[] = []
    for (const d of rangoVista(vista, fecha)) {
      const iso = fechaISO(d)
      for (const r of rutinas) if (tocaFecha(r, d)) ocurrencias.push({ rutina: r, d, iso })
    }
    const mapa = new Map<string, { etiqueta: string; items: Ocurrencia[] }>()
    for (const o of ocurrencias) {
      const { clave, etiqueta } = grupoDe(o, agr, locale, sinHora)
      const g = mapa.get(clave) ?? { etiqueta, items: [] }
      g.items.push(o)
      mapa.set(clave, g)
    }
    const lista = [...mapa.entries()].map(([clave, g]) => ({ clave, ...g }))
    // Por hora los grupos nacen desordenados (se recorre por fecha) y "sin hora" va al final.
    if (agr === 'hora') {
      lista.sort((a, b) => (a.clave === '' ? 1 : b.clave === '' ? -1 : a.clave.localeCompare(b.clave)))
    }
    for (const g of lista) {
      g.items.sort((a, b) => a.iso.localeCompare(b.iso) || (a.rutina.hora ?? '').localeCompare(b.rutina.hora ?? ''))
    }
    return lista
  }, [vista, fecha, rutinas, agr, locale, sinHora])

  // Una meta se palomea en sí misma; una rutina, en el día que toca (ver `estadoEnFecha`).
  const hechoDe = (o: Ocurrencia) =>
    esMeta(o.rutina)
      ? !!o.rutina.completada
      : !!ejecuciones?.find((e) => e.rutinaId === o.rutina.id && e.fecha === o.iso)?.hecho
  const total = grupos.reduce((n, g) => n + g.items.length, 0)
  const hechas = grupos.reduce((n, g) => n + g.items.filter(hechoDe).length, 0)

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm text-amber-400/80"><Icono nombre="objetivo" /></span>
        <p className="text-xs font-bold uppercase tracking-wider text-white/70">{t('cal.metas', 'Metas')}</p>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white/60">
          {hechas}/{total}
        </span>
        {opciones.length > 1 && (
          <div className="ml-auto flex rounded-lg border border-white/10 p-0.5">
            {opciones.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => onAgrupacion(o)}
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                  agr === o ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/80'
                }`}
              >
                {t(`cal.agr.${o}`, { hora: 'Horas', dia: 'Días', semana: 'Semanas', mes: 'Meses' }[o])}
              </button>
            ))}
          </div>
        )}
      </div>

      {total === 0 ? (
        <p className="py-4 text-center text-[11px] text-white/35">
          {t('cal.sinMetas', 'Nada agendado en este periodo.')}
        </p>
      ) : (
        <div className="space-y-2">
          {grupos.map((g) => {
            const hechasG = g.items.filter(hechoDe).length
            const abierto = abiertos.has(g.clave)
            const visibles = abierto ? g.items : g.items.slice(0, TOPE_GRUPO)
            return (
              <div key={g.clave} className="ui-panel-2 rounded-xl border border-white/10 p-2">
                <div className="mb-1 flex items-center gap-2 px-0.5">
                  <p className="flex-1 truncate text-[11px] font-bold capitalize text-white/70">{g.etiqueta}</p>
                  <span className="text-[10px] tabular-nums text-white/40">
                    {hechasG}/{g.items.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {visibles.map((o) => {
                    const hecho = hechoDe(o)
                    return (
                      <div key={`${o.rutina.id}-${o.iso}`} className="flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-white/5">
                        <button
                          type="button"
                          onClick={() => (esMeta(o.rutina) ? void toggleMeta(o.rutina) : void toggleHecho(o.rutina, o.iso))}
                          title={t('cal.marcarHecho', 'Marcar como hecho')}
                          className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] transition ${
                            hecho ? 'border-emerald-400 bg-emerald-500/30 text-emerald-400' : 'border-white/25 hover:border-white/50'
                          }`}
                        >
                          {hecho ? '✓' : ''}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDetalle(o.rutina, o.iso)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorDe(o.rutina) }} />
                          {o.rutina.hora && agr !== 'hora' && (
                            <span className="shrink-0 text-[10px] tabular-nums text-white/40">{o.rutina.hora}</span>
                          )}
                          <span className={`min-w-0 flex-1 truncate text-xs text-white/85 ${hecho ? 'line-through opacity-50' : ''}`}>
                            <Icono emoji={o.rutina.emoji} /> {o.rutina.nombre}
                          </span>
                          {/* El grupo abarca varios días: hay que decir cuál. */}
                          {(agr === 'semana' || agr === 'mes') && (
                            <span className="shrink-0 text-[10px] text-white/35">
                              {o.d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
                {g.items.length > TOPE_GRUPO && (
                  <button
                    type="button"
                    onClick={() =>
                      setAbiertos((s) => {
                        const n = new Set(s)
                        if (abierto) n.delete(g.clave)
                        else n.add(g.clave)
                        return n
                      })
                    }
                    className="mt-1 w-full rounded-lg py-0.5 text-[10px] font-semibold text-white/40 transition hover:bg-white/5 hover:text-white/70"
                  >
                    {abierto
                      ? t('cal.verMenos', 'Ver menos')
                      : t('cal.verMas', '+{n} más', { n: g.items.length - TOPE_GRUPO })}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- Gestos sobre días (Mes y Año) ----------

/** Día (`data-dia`) que hay bajo el puntero, o null. Lo comparten el trazo y el estirón. */
function diaBajoPuntero(x: number, y: number): string | null {
  return (
    ((document.elementFromPoint(x, y) as HTMLElement | null)?.closest('[data-dia]') as HTMLElement | null)?.dataset
      .dia ?? null
  )
}

/**
 * Estirar un evento a lo ancho sobre las celdas de día: se agarra un asa lateral
 * del chip y se arrastra hasta otro día. `isoAncla` es el extremo que no se
 * mueve. Devuelve el tramo en curso para pintar el fantasma.
 */
function useEstiron(onExtender: (r: Rutina, isoAncla: string, isoDestino: string) => void) {
  const [estiron, setEstiron] = useState<{ rutina: Rutina; isoAncla: string; iso: string } | null>(null)

  const iniciar = (e: React.PointerEvent, rutina: Rutina, isoAncla: string, isoBloque: string) => {
    if (e.button !== 0) return
    e.stopPropagation() // que no lo tome el trazo de rangos del contenedor
    let actual = { rutina, isoAncla, iso: isoBloque }
    setEstiron(actual)
    const onMove = (ev: PointerEvent) => {
      const iso = diaBajoPuntero(ev.clientX, ev.clientY)
      if (!iso || iso === actual.iso) return
      actual = { ...actual, iso }
      setEstiron(actual)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setEstiron(null)
      onExtender(actual.rutina, actual.isoAncla, actual.iso)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  /** ¿El día cae dentro del tramo que se está estirando? */
  const enEstiron = (iso: string) => {
    if (!estiron) return false
    const [ini, fin] = estiron.isoAncla <= estiron.iso ? [estiron.isoAncla, estiron.iso] : [estiron.iso, estiron.isoAncla]
    return iso >= ini && iso <= fin
  }

  return { iniciar, enEstiron, estirando: estiron?.rutina.id ?? null }
}

/**
 * Trazar un rango sobre las celdas de día: se aprieta en una, se arrastra hasta
 * otra y se suelta. Solo avisa si hubo movimiento real; un clic simple lo deja
 * pasar para que la celda haga lo suyo (navegar al día). Las celdas se ubican
 * por `data-dia` bajo el puntero, así sirve igual con 42 celdas (Mes) que con
 * los 12 mini-meses del Año.
 */
function useTrazoDias(onTrazar: (a: string, b: string) => void) {
  const [trazo, setTrazo] = useState<{ a: string; b: string } | null>(null)
  const diaEn = diaBajoPuntero

  const onPointerDown = (e: React.PointerEvent) => {
    // Las asas del chip de evento mandan sobre el trazo (patrón de `data-bloque`).
    if (e.button !== 0 || (e.target as HTMLElement).closest('[data-evento]')) return
    const a = diaEn(e.clientX, e.clientY)
    if (!a) return
    let actual = { a, b: a }
    let movio = false
    const onMove = (ev: PointerEvent) => {
      const b = diaEn(ev.clientX, ev.clientY)
      if (!b || b === actual.b) return
      movio = true
      actual = { ...actual, b }
      setTrazo(actual)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setTrazo(null)
      if (movio) onTrazar(actual.a, actual.b)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  /** ¿El día cae dentro del trazo en curso? (para pintar el fantasma). */
  const enTrazo = (iso: string) => {
    if (!trazo) return false
    const [ini, fin] = trazo.a <= trazo.b ? [trazo.a, trazo.b] : [trazo.b, trazo.a]
    return iso >= ini && iso <= fin
  }

  return { onPointerDown, enTrazo }
}

// ---------- Vista AÑO ----------

/**
 * Los 12 meses del año en miniatura. Cada día se tiñe con el color del primer
 * evento que le toca (un punto sería ilegible a este tamaño), hoy va en círculo.
 */
function VistaAño({
  fecha,
  rutinas,
  ejecuciones,
  onDia,
  onMes,
  onTrazar,
  onExtender,
  metaArmada,
}: {
  fecha: Date
  rutinas: Rutina[]
  ejecuciones: EjecucionRutina[] | undefined
  onDia: (d: Date) => void
  onMes: (m: number) => void
  /** Rango trazado sobre los días (meses, semanas y días). */
  onTrazar: (isoA: string, isoB: string) => void
  /** Evento estirado a lo ancho: se repite en los días del tramo. */
  onExtender: (r: Rutina, isoAncla: string, isoDestino: string) => void
  /** Con una meta armada el gesto siempre traza (la UI está en modo "traza esto"). */
  metaArmada: Rutina | null
}) {
  const t = useT()
  const año = fecha.getFullYear()
  const hoy = hoyISO()
  const locale = localeActual()
  const trazo = useTrazoDias(onTrazar)
  const { iniciar, enEstiron } = useEstiron(onExtender)

  /** Rutinas que tocan un día (aquí no hay chips: el día ES el asa del evento). */
  const rutinasDe = (iso: string) => rutinas.filter((r) => tocaFecha(r, new Date(iso + 'T12:00')))

  /**
   * Con celdas de 16 px no caben asas, así que el día entero hace de asa. Se lee
   * como una frase: con meta armada siempre se traza; un día vacío se traza; un
   * día con UN evento lo estira. Con varios el gesto sería ambiguo (¿cuál?), así
   * que se traza y el `title` dice que hay que entrar al mes.
   */
  const alApretar = (e: React.PointerEvent) => {
    const iso = diaBajoPuntero(e.clientX, e.clientY)
    const delDia = iso ? rutinasDe(iso) : []
    if (!metaArmada && !e.shiftKey && iso && delDia.length === 1) {
      iniciar(e, delDia[0], tramoDe(delDia[0], iso).ini, iso)
      return
    }
    trazo.onPointerDown(e)
  }

  return (
    <div
      className="grid grid-cols-1 gap-3 select-none sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      onPointerDown={alApretar}
    >
      {Array.from({ length: 12 }, (_, m) => {
        const primero = new Date(año, m, 1)
        const inicio = inicioSemana(primero)
        // 6 semanas cubren cualquier mes; las celdas de fuera se dejan vacías.
        const celdas = Array.from({ length: 42 }, (_, i) => addDias(inicio, i))
        return (
          <div key={m} className="ui-panel rounded-xl border border-white/10 p-2">
            <button
              type="button"
              onClick={() => onMes(m)}
              className="mb-1 w-full truncate text-left text-xs font-bold capitalize text-white/80 transition hover:text-white"
            >
              {primero.toLocaleDateString(locale, { month: 'long' })}
            </button>
            <div className="grid grid-cols-7 gap-px">
              {SEMANA.map((d) => (
                <div key={d} className="text-center text-[8px] font-bold uppercase text-white/30">
                  {d[0]}
                </div>
              ))}
              {celdas.map((d) => {
                if (d.getMonth() !== m) return <div key={fechaISO(d)} />
                const iso = fechaISO(d)
                const delDia = rutinas.filter((r) => tocaFecha(r, d))
                const todasHechas =
                  delDia.length > 0 && delDia.every((r) => estadoEnFecha(r, iso, ejecuciones) === 'completa')
                const fondo = capasFondo(rutinas, d)
                const nombres = delDia.map((r) => r.nombre).join(', ')
                const titulo = !delDia.length
                  ? undefined
                  : delDia.length === 1
                    ? `${d.getDate()}: ${nombres} — ${t('cal.estirarRepetir', 'Estira para repetirlo en días seguidos')}`
                    : `${d.getDate()}: ${nombres} — ${t('cal.estirarAmbiguo', 'Este día tiene varios eventos: entra al mes para estirar uno')}`
                return (
                  <button
                    key={iso}
                    type="button"
                    data-dia={iso}
                    onClick={() => onDia(d)}
                    title={titulo}
                    className={`grid h-4 place-items-center rounded text-[9px] leading-none transition hover:bg-white/15 ${
                      iso === hoy ? 'bg-emerald-600 font-bold texto-cta' : 'text-white/55'
                    } ${todasHechas ? 'opacity-50' : ''} ${
                      trazo.enTrazo(iso) || enEstiron(iso) ? 'ring-2 ring-emerald-400 ring-inset' : ''
                    } ${delDia.length === 1 ? 'cursor-ew-resize' : ''}`}
                    style={
                      iso !== hoy && fondo
                        ? { backgroundImage: fondo, color: '#fff' }
                        : undefined
                    }
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------- Vista MES ----------

function VistaMes({
  fecha,
  rutinas,
  eventos,
  ejecuciones,
  onDia,
  onTrazar,
  onExtender,
}: {
  fecha: Date
  rutinas: Rutina[]
  /** Lo que aportan las apps por fecha (solo lectura). */
  eventos: Map<string, EventoResuelto[]>
  ejecuciones: EjecucionRutina[] | undefined
  onDia: (d: Date) => void
  /** Rango trazado sobre los días (semanas y días). */
  onTrazar: (isoA: string, isoB: string) => void
  /** Evento estirado a lo ancho: se repite en los días del tramo. */
  onExtender: (r: Rutina, isoAncla: string, isoDestino: string) => void
}) {
  const primero = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const inicio = inicioSemana(primero)
  const hoy = hoyISO()
  const celdas = Array.from({ length: 42 }, (_, i) => addDias(inicio, i))
  const t = useT()
  const { onPointerDown, enTrazo } = useTrazoDias(onTrazar)
  const { iniciar, enEstiron, estirando } = useEstiron(onExtender)

  return (
    <div
      className="grid h-full select-none grid-rows-[auto_repeat(6,1fr)] gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10"
      onPointerDown={onPointerDown}
    >
      <div className="grid grid-cols-7 gap-px">
        {SEMANA.map((d) => (
          <div key={d} className="ui-panel px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-white/40">
            {d}
          </div>
        ))}
      </div>
      {Array.from({ length: 6 }, (_, sem) => (
        <div key={sem} className="grid grid-cols-7 gap-px">
          {celdas.slice(sem * 7, sem * 7 + 7).map((d) => {
            const iso = fechaISO(d)
            const esMes = d.getMonth() === fecha.getMonth()
            const esHoy = iso === hoy
            const delDia = rutinas.filter((r) => tocaFecha(r, d))
            const eventosDia = eventos.get(iso) ?? []
            const total = delDia.length + eventosDia.length
            const rutinasVisibles = delDia.slice(0, 3)
            const eventosVisibles = eventosDia.slice(0, Math.max(0, 3 - rutinasVisibles.length))
            return (
              <button
                key={iso}
                type="button"
                data-dia={iso}
                onClick={() => onDia(d)}
                className={`ui-panel flex min-h-0 flex-col items-stretch gap-0.5 overflow-hidden p-1 text-left transition hover:bg-white/5 ${esMes ? '' : 'opacity-40'} ${
                  enTrazo(iso) || enEstiron(iso) ? 'ring-1 ring-emerald-400 ring-inset' : ''
                }`}
                style={{ backgroundImage: capasFondo(rutinas, d) }}
              >
                <span className={`mb-0.5 grid h-5 w-5 place-items-center self-start rounded-full text-[11px] font-bold ${esHoy ? 'bg-emerald-600 texto-cta' : 'text-white/60'}`}>
                  {d.getDate()}
                </span>
                {rutinasVisibles.map((r) => {
                  const completa = estadoEnFecha(r, iso, ejecuciones) === 'completa'
                  const tramo = tramoDe(r, iso)
                  return (
                    <span
                      key={r.id}
                      data-evento={r.id}
                      className={`relative truncate rounded border px-1 text-[10px] leading-4 text-white/90 ${completa ? 'opacity-60' : ''} ${
                        estirando === r.id ? 'ring-1 ring-emerald-400' : ''
                      }`}
                      style={{ backgroundColor: `${colorDe(r)}33`, borderColor: `${colorDe(r)}66` }}
                    >
                      {completa ? '✓ ' : ''}<Icono emoji={r.emoji} /> {r.nombre}
                      {/* Asas de repetir en días seguidos (mismo gesto que en Semana) */}
                      <span
                        className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize touch-none"
                        title={t('cal.estirarRepetir', 'Estira para repetirlo en días seguidos')}
                        onPointerDown={(e) => iniciar(e, r, tramo.fin, iso)}
                      />
                      <span
                        className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize touch-none"
                        title={t('cal.estirarRepetir', 'Estira para repetirlo en días seguidos')}
                        onPointerDown={(e) => iniciar(e, r, tramo.ini, iso)}
                      />
                    </span>
                  )
                })}
                {/* Va en <span>: la celda del mes ya es un botón que abre el día. */}
                {eventosVisibles.map((e, j) => (
                  <span
                    key={`e${j}`}
                    title={e.texto}
                    className="truncate rounded border px-1 text-[10px] leading-4 text-white/90"
                    style={{ backgroundColor: `${e.color}22`, borderColor: `${e.color}55` }}
                  >
                    <Icono emoji={e.emoji} /> {e.texto}
                  </span>
                ))}
                {total > 3 && <span className="px-1 text-[9px] text-white/35">+{total - 3}</span>}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
