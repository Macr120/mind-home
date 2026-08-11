import { useEffect, useMemo, useRef, useState } from 'react'
import type { Rutina, Alcance } from '../data/db'
import { ejecucionesRutinaRepo, rutinasRepo } from '../data/repository'
import { getPlantilla } from '../registry'
import { useEventosApps, type EventoResuelto } from '../eventosApps'
import { abrirApp } from '../abrirApp'
import { construirAppDemo } from '../../demo/construir'
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
import { addDias, deIso, inicioSemana } from '../fechaLocal'
import {
  aHHMM,
  aMin,
  agendada,
  alcanceDe,
  borrarMetaConDescendencia,
  crearMeta,
  descendientes,
  esMeta,
  profundidadDe,
  raizDe,
  rangoDe,
  toggleMeta,
  togglePasoMeta,
  vigenteEn,
} from '../metas'
import { useRutinasUI } from '../state/rutinasUiStore'
import { colorDe, colorPorProfundidad } from './coloresRutina'
import { Cronograma } from './metas/Cronograma'
import { PildoraCuenta } from './metas/CuentaRegresiva'
import { EditorRutina, rutinaNueva } from './RutinasPanel'
import { localeActual, useT } from '../i18n/useT'
import { confirmar } from '../state/confirmarStore'
import { Icono } from './iconos/Icono'
import {
  columnasPorDia,
  columnasPorMes,
  columnasPorSemana,
  cumplidaEn,
  indexarEjecuciones,
  SEMANA,
  type ColumnaRango,
  type IndiceEjecuciones,
} from './calendario/metricas'
import { appDeRutina, pasa } from './calendario/apps'
import { useCalendarioFiltro } from '../state/calendarioFiltroStore'
import { FiltroApps } from './calendario/FiltroApps'
import { PanelMetricas } from './calendario/PanelMetricas'
import {
  capaTiempoDia,
  capaTiempoMes,
  COLOR_TIEMPO,
  componerFondo,
  fraccionAnio,
  fraccionDia,
  fraccionMes,
  fraccionSemana,
  useAhora,
} from './calendario/tiempoTranscurrido'
import { BarraTiempo } from './calendario/BarraTiempo'

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

// La rejilla cubre las 24 h: el sueño cruza la madrugada y tiene que verse.
const HORA_INI = 0
const HORA_FIN = 23
const HORA_ARRANQUE = 5 // la vista abre aquí (la madrugada existe, pero no estorba)
const ALTO_HORA = 44 // px por hora
const GUTTER = '3rem' // columna de etiquetas de hora
const SNAP = 15 // minutos (intervalo mínimo)
const ASA = 8 // px de las asas del bloque (lados = repetir en días; abajo = duración)
const ALTO_CARRIL = 18 // px por fila de la banda de arriba (lo que no tiene hora)
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
  if (esMeta(r)) return vigenteEn(r, fechaISO(d))
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
    // Sin franja horaria NO se lava la columna: lo que dura días enteros se
    // anuncia en la banda de arriba (ver `tramosBanda`). Antes una sola meta de
    // varias semanas teñía los 1056 px de cada columna y el eje dejaba de leerse.
    if (!rango) return
    bandas.push({
      color: `${colorDe(r)}${ALFA_CAPA[a]}`,
      ini: rango.ini,
      fin: Math.min(rango.fin, 1440),
      z: i + 1, // el orden del arreglo ya es de atrás hacia el frente
    })
  })
  return bandas
}

/**
 * Metas agendadas a partir de las cuales Semana y Mes arrancan plegadas.
 *
 * Con un par de metas, la barra con su nombre y su cuenta atrás es lo mejor que
 * se puede enseñar; con quince (aceptar un plan crea una docena de sub-metas, y
 * todas ocupan su periodo) la banda se come la rejilla y el día deja de verse.
 * Pasado el tope se resumen en un contador por día, hasta que se despliegue.
 */
const METAS_ANTES_DE_PLEGAR = 6

/** Un tramo continuo de la banda superior: de qué columna a qué columna llega. */
interface TramoBanda {
  clave: string
  nombre: string
  emoji: string
  color: string
  colIni: number
  colFin: number
  /** Fila dentro de la banda: los tramos que se cruzan no comparten carril. */
  carril: number
  /** Sigue antes del primer día visible / después del último. */
  cortaIzq: boolean
  cortaDer: boolean
  rutina?: Rutina
  evento?: EventoResuelto
}

/** ¿Qué días de la ventana ocupa? Una meta cubre TODO su periodo, no solo su inicio. */
function cubreDia(r: Rutina, d: Date): boolean {
  return esMeta(r) ? vigenteEn(r, fechaISO(d)) : tocaFecha(r, d)
}

/**
 * Lo que no tiene hora, como barras continuas sobre los días que ocupa.
 *
 * Antes cada día pintaba su propio chip, así que una meta de tres semanas salía
 * como siete recuadros sueltos en la vista Semana (y ninguno decía que fueran el
 * mismo). Aquí se detectan las rachas y se reparten en carriles, como hace
 * `layoutBloquesDia` con los solapes del eje.
 *
 * Los eventos de las apps son siempre de un día (`EventoApp.fecha` es una fecha
 * suelta), así que entran como tramos de una sola columna.
 */
function tramosBanda(
  rutinas: Rutina[],
  eventos: Map<string, EventoResuelto[]>,
  dias: Date[],
  /** Plegadas: las metas no traen barra (las resume el contador por día). */
  sinMetas = false,
): TramoBanda[] {
  const crudos: Omit<TramoBanda, 'carril'>[] = []

  for (const r of rutinas) {
    if (r.hora) continue
    if (sinMetas && esMeta(r)) continue
    let ini = -1
    for (let i = 0; i <= dias.length; i++) {
      const dentro = i < dias.length && cubreDia(r, dias[i])
      if (dentro && ini === -1) ini = i
      else if (!dentro && ini !== -1) {
        const rango = esMeta(r) ? rangoDe(r) : null
        crudos.push({
          clave: `r${r.id}-${ini}`,
          nombre: r.nombre,
          emoji: r.emoji,
          color: colorDe(r),
          colIni: ini,
          colFin: i - 1,
          cortaIzq: !!rango && rango.ini < fechaISO(dias[ini]),
          cortaDer: !!rango && rango.fin > fechaISO(dias[i - 1]),
          rutina: r,
        })
        ini = -1
      }
    }
  }

  dias.forEach((d, i) => {
    for (const [j, e] of (eventos.get(fechaISO(d)) ?? []).entries())
      crudos.push({
        clave: `e${i}-${j}`,
        nombre: e.texto,
        emoji: e.emoji,
        color: e.color,
        colIni: i,
        colFin: i,
        cortaIzq: false,
        cortaDer: false,
        evento: e,
      })
  })

  // Los más largos arriba: leerlos primero es lo que da la sensación de "esto
  // enmarca la semana". A igualdad, por columna de inicio.
  crudos.sort((a, b) => b.colFin - b.colIni - (a.colFin - a.colIni) || a.colIni - b.colIni)
  const finPorCarril: number[] = []
  return crudos.map((tr) => {
    let carril = finPorCarril.findIndex((fin) => fin < tr.colIni)
    if (carril === -1) carril = finPorCarril.length
    finPorCarril[carril] = tr.colFin
    return { ...tr, carril }
  })
}

/**
 * Estado de una rutina en una fecha (colorea el bloque).
 *
 * Una meta lleva su estado en sí misma, no por día: se cumple UNA vez, y su
 * periodo puede durar semanas — palomearla el martes y que el miércoles vuelva a
 * salir pendiente no querría decir nada. Así, palomearla en la lista de Metas se
 * ve al momento en la rejilla, que es lo que se espera de dos vistas de lo mismo.
 */
function estadoEnFecha(r: Rutina, fecha: string, idx: IndiceEjecuciones) {
  if (cumplidaEn(r, fecha, idx)) return 'completa' as const
  if (esMeta(r)) return fecha === hoyISO() ? ('pendiente' as const) : ('normal' as const)
  if (r.pasos.length === 0) return 'normal' as const
  if (fecha === hoyISO()) return 'pendiente' as const
  return 'normal' as const
}

/** Con qué precisión se traza el rango en cada vista (lo dice el aviso de la meta armada). */
const AYUDA_TRAZO: Record<VistaRejilla, string> = {
  dia: 'Traza en la rejilla: horas y minutos',
  semana: 'Traza en la rejilla: días, horas y minutos',
  mes: 'Traza sobre los días: semanas y días',
  anio: 'Traza sobre los días: meses, semanas y días',
}

/**
 * El calendario de la casa: se abre desde el reloj del HUD y ocupa la pantalla.
 * Es su ÚNICO acceso desde que dejó de ser una app de cuarto.
 */
export function Calendario() {
  const abierto = useRutinasUI((s) => s.calendario)
  const vista = useRutinasUI((s) => s.vistaCalendario)
  const cerrar = useRutinasUI((s) => s.cerrarCalendario)

  // En la casa demo, el año de Pep@ se construye por app al abrirla (GateAppDemo).
  // El calendario ya no tiene cuarto que lo dispare, así que lo pide él mismo.
  // `construirAppDemo` es idempotente y no hace nada fuera del demo.
  useEffect(() => {
    if (abierto) void construirAppDemo('calendario')
  }, [abierto])

  if (!abierto) return null
  return (
    <div className="fixed inset-0 z-50 flex bg-black/60" onClick={cerrar}>
      {/* A pantalla completa: el calendario es una app entera (rejilla de 24 h, metas,
          planes y el eje del cronograma), no un diálogo — recortarlo a 62 rem obligaba
          a hacer scroll lateral en la semana y dejaba el eje en una rendija. */}
      <div
        className="ui-panel-glass ui-pop flex h-full w-full flex-col overflow-hidden backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <CalendarioVista onCerrar={cerrar} vistaInicial={vista} />
      </div>
    </div>
  )
}

/** ¿La vista pedida por quien abre el calendario es una de las que existen? */
const esVista = (v?: string): v is Vista =>
  !!v && ['dia', 'semana', 'mes', 'anio', 'cronograma'].includes(v)

/**
 * El calendario en sí (cabecera + rejilla). Lo monta el modal del reloj; sin
 * `onCerrar` no se dibuja la ✕.
 */
export function CalendarioVista({ onCerrar, vistaInicial }: { onCerrar?: () => void; vistaInicial?: string }) {
  const t = useT()
  const [vista, setVista] = useState<Vista>(() => (esVista(vistaInicial) ? vistaInicial : 'semana'))
  // Pedir una vista con el calendario YA abierto («abre el cronograma» desde el
  // chat) también tiene que cambiarla: el estado inicial solo se lee al montar.
  // Ajuste en render, sin efecto (mismo patrón que la intención del chat en
  // `RoomOverlay`); lo que el usuario elija después manda hasta la próxima orden.
  const [vistaPedida, setVistaPedida] = useState(vistaInicial)
  if (vistaInicial !== vistaPedida) {
    setVistaPedida(vistaInicial)
    if (esVista(vistaInicial)) setVista(vistaInicial)
  }
  const [fecha, setFecha] = useState(() => new Date())
  const [editando, setEditando] = useState<Rutina | null>(null)
  const [detalle, setDetalle] = useState<{ rutina: Rutina; fecha: string } | null>(null)
  // Meta armada: la siguiente vez que se trace un rango en el calendario, se le
  // dan esas fechas a ESA meta en vez de crearse un evento nuevo.
  const [metaArmada, setMetaArmada] = useState<Rutina | null>(null)
  // Metas plegadas en Semana y Mes. Arranca en null —lo decide el número de
  // metas agendadas— y se queda en lo que el usuario elija: quien tiene tres
  // metas no debería tener que desplegarlas cada vez que abre el calendario.
  const [metasPlegadas, setMetasPlegadas] = useState<boolean | null>(null)
  // Estabilizado: el `?? []` crearía un arreglo nuevo en cada render y tiraría por
  // tierra los memos que cuelgan de él (el eje del cronograma se recalcularía entero).
  const rutinasCargadas = rutinasRepo.useAll()
  const rutinas = useMemo(() => rutinasCargadas ?? [], [rutinasCargadas])
  const ejecuciones = ejecucionesRutinaRepo.useAll()
  const idx = useMemo(() => indexarEjecuciones(ejecuciones), [ejecuciones])
  const ahora = useAhora()

  // Lo que aportan las apps con fecha propia (viajes, y cualquiera que declare
  // `eventos`): el calendario ya no sabe de qué app viene cada cosa.
  const eventos = useEventosApps()

  // Filtro por app: se aplica AQUÍ y en ningún otro sitio. Todo lo de abajo
  // (rejilla, mes, año, cronograma, metas y métricas) recibe ya lo filtrado, así
  // que ninguna vista puede quedarse sin filtrar por descuido.
  const apps = useCalendarioFiltro((s) => s.apps)
  const rutinasVis = useMemo(() => rutinas.filter((r) => pasa(appDeRutina(r), apps)), [rutinas, apps])
  const eventosVis = useMemo(() => {
    if (apps.size === 0) return eventos
    const m = new Map<string, EventoResuelto[]>()
    for (const [iso, lista] of eventos) {
      const quedan = lista.filter((e) => pasa(e.plantillaId, apps))
      if (quedan.length > 0) m.set(iso, quedan)
    }
    return m
  }, [eventos, apps])

  /** La lista de Metas: solo la consume el cronograma. */
  const metas = useMemo(() => rutinasVis.filter(esMeta), [rutinasVis])

  // Si se pliegan las metas de Semana y Mes lo decide quien mira, y mientras no
  // lo haya decidido, cuántas metas hay puestas en el calendario. Se resuelve
  // aquí (y no dentro de cada vista) para que el botón de la cabecera diga
  // siempre lo mismo que se ve debajo.
  const plegarMetas = metasPlegadas ?? metas.filter(agendada).length > METAS_ANTES_DE_PLEGAR

  const navegar = (dir: -1 | 1) => {
    if (vista === 'dia') setFecha(addDias(fecha, dir))
    else if (vista === 'semana') setFecha(addDias(fecha, dir * 7))
    else if (vista === 'anio') setFecha(new Date(fecha.getFullYear() + dir, 0, 1))
    // El cronograma no se navega por aquí: su eje lo mueve su propio scroll.
    else if (vista !== 'cronograma') setFecha(new Date(fecha.getFullYear(), fecha.getMonth() + dir, 1))
  }

  const titulo =
    vista === 'cronograma'
      ? t('cal.metas', 'Metas')
      : vista === 'anio'
      ? String(fecha.getFullYear())
      : vista === 'mes'
        ? fecha.toLocaleDateString(localeActual(), { month: 'long', year: 'numeric' })
        : vista === 'semana'
          ? `${inicioSemana(fecha).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })} – ${addDias(inicioSemana(fecha), 6).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short', year: 'numeric' })}`
          : fecha.toLocaleDateString(localeActual(), { weekday: 'long', day: 'numeric', month: 'long' })

  // Hoy y Día se fusionan en un solo botón: mientras la fecha elegida sea hoy
  // dice «Hoy» (así se lee como el salto rápido que era); en cuanto se navega a
  // otro día, pasa a decir «Día» — es la vista en la que sigue estando, solo que
  // ya no es la de hoy. El resto de vistas no tocan la fecha al cambiar.
  const esHoy = fechaISO(fecha) === hoyISO()
  const vistas: { id: Vista; label: string }[] = [
    { id: 'dia', label: esHoy ? t('cal.hoy', 'Hoy') : t('cal.dia', 'Día') },
    { id: 'semana', label: t('cal.semana', 'Semana') },
    { id: 'mes', label: t('cal.mes', 'Mes') },
    { id: 'anio', label: t('cal.anio', 'Año') },
  ]

  // Columnas del panel de métricas. Día y Semana van día a día (se palomean);
  // Mes resume por semana y Año por mes, que es como se lee "cómo me fue".
  const columnasMetricas = useMemo((): ColumnaRango[] => {
    if (vista === 'dia') return columnasPorDia([fecha])
    if (vista === 'semana') return columnasPorDia(Array.from({ length: 7 }, (_, i) => addDias(inicioSemana(fecha), i)))
    if (vista === 'mes') return columnasPorSemana(fecha.getFullYear(), fecha.getMonth(), t)
    return columnasPorMes(fecha.getFullYear(), localeActual())
  }, [vista, fecha, t])

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
          {/* El salto a Hoy y la vista Día comparten un solo botón: el primero de
              este grupo. Su acción es siempre la misma (fecha de hoy + vista Día);
              lo que cambia es cómo se llama — «Hoy» mientras la fecha elegida sea
              hoy, «Día» en cuanto se navega a otra (ver `esHoy` arriba). */}
          <div data-tut="cal.vistas" className="flex rounded-lg border border-white/10 p-0.5">
            {vistas.map((v) => (
              <button
                key={v.id}
                type="button"
                data-tut={v.id === 'dia' ? 'cal.hoy' : `cal.vista.${v.id}`}
                onClick={() => {
                  if (v.id === 'dia') setFecha(new Date())
                  setVista(v.id)
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  vista === v.id ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex">
            <button type="button" onClick={() => navegar(-1)} className="px-2 py-1 text-white/55 transition hover:text-white">
              ‹
            </button>
            <button type="button" onClick={() => navegar(1)} className="px-2 py-1 text-white/55 transition hover:text-white">
              ›
            </button>
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-bold capitalize text-white/90">{titulo}</p>
          {/* Metas va SEPARADO del resto: no es otra rejilla del mismo calendario,
              es la sección de metas/planes/cronograma. El rojo la distingue del
              grupo verde-neutro de la izquierda para que no se lea como una vista
              más. El id se queda en 'cronograma' (lo guardan las intenciones de
              chat y los tutoriales); lo que cambió es cómo se llama: la sección
              son las Metas, y dentro están sus tres vistas (metas, planes y el eje
              de tiempo). */}
          <button
            type="button"
            data-tut="cal.vista.cronograma"
            onClick={() => setVista('cronograma')}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              vista === 'cronograma'
                ? 'border-red-500 bg-red-500/90 text-white'
                : 'border-red-500/40 text-red-400 hover:bg-red-500/10'
            }`}
          >
            {t('cal.metas', 'Metas')}
          </button>
          {/* Filtro por app: vive aquí para que valga también en el cronograma; entre
              las vistas y "+ Nueva" en vez de su propia fila, para no gastar alto. */}
          <div data-tut="cal.filtro">
            <FiltroApps rutinas={rutinas} eventos={eventos} />
          </div>
          {/* Plegar las metas NO tiene botón en la cabecera: el gesto vive donde
              están las metas — el ▸/▾ del margen de la banda en Semana y el chip
              «N metas» de cada celda en Mes. Un tercer mando arriba repetía lo que
              ya se ve debajo. */}
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
          {/* Mes y Año coronan su rejilla con el avance del periodo; en Día y Semana
              la marca vive dentro de la propia rejilla (barra del margen y línea de hora). */}
          {(vista === 'mes' || vista === 'anio') && (
            <BarraTiempo
              className="mb-2"
              frac={
                vista === 'mes'
                  ? fraccionMes(fecha.getFullYear(), fecha.getMonth(), ahora)
                  : fraccionAnio(fecha.getFullYear(), ahora)
              }
            />
          )}
          {vista === 'anio' ? (
            <VistaAño
              fecha={fecha}
              rutinas={rutinasVis}
              idx={idx}
              ahora={ahora}
              onDia={abrirDia}
              onMes={abrirMes}
              onTrazar={trazarDias}
              onExtender={extender}
              metaArmada={metaArmada}
            />
          ) : vista === 'mes' ? (
            <VistaMes
              fecha={fecha}
              ahora={ahora}
              rutinas={rutinasVis}
              eventos={eventosVis}
              idx={idx}
              onDia={abrirDia}
              onTrazar={trazarDias}
              onExtender={extender}
              metasPlegadas={plegarMetas}
              onPlegarMetas={setMetasPlegadas}
            />
          ) : (
            <RejillaTiempo
              dias={vista === 'semana' ? Array.from({ length: 7 }, (_, i) => addDias(inicioSemana(fecha), i)) : [fecha]}
              rutinas={rutinasVis}
              eventos={eventosVis}
              idx={idx}
              ahora={ahora}
              onDia={vista === 'semana' ? abrirDia : undefined}
              onDetalle={(rutina, f) => setDetalle({ rutina, fecha: f })}
              onCrear={crearEn}
              metasPlegadas={plegarMetas}
              onPlegarMetas={setMetasPlegadas}
            />
          )}
          <PanelMetricas
            rutinas={rutinasVis}
            idx={idx}
            columnas={columnasMetricas}
            detalle={vista === 'dia' || vista === 'semana'}
            onToggle={(r, iso) => (esMeta(r) ? void toggleMeta(r) : void toggleHecho(r, iso))}
            onEditar={(r) => setEditando({ ...r, pasos: r.pasos.map((p) => ({ ...p })) })}
            onIrACronograma={() => setVista('cronograma')}
            onAbrir={(c) => (vista === 'mes' ? abrirDia(deIso(c.isos[0])) : abrirMes(deIso(c.isos[0]).getMonth()))}
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
          idx={idx}
          metas={rutinas.filter(esMeta)}
          onIrACronograma={() => {
            setVista('cronograma')
            setDetalle(null)
          }}
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
  idx,
  ahora,
  onDia,
  onDetalle,
  onCrear,
  metasPlegadas,
  onPlegarMetas,
}: {
  dias: Date[]
  rutinas: Rutina[]
  /** Lo que aportan las apps por fecha (solo lectura, van en la fila "sin hora"). */
  eventos: Map<string, EventoResuelto[]>
  idx: IndiceEjecuciones
  /** Se refresca cada minuto: mueve la sombra del tiempo ya vivido. */
  ahora: Date
  onDia?: (d: Date) => void
  onDetalle: (r: Rutina, fechaIso: string) => void
  onCrear: (d: Date, ini: number, fin: number) => void
  /** Las metas se resumen en un contador por día en vez de una barra cada una. */
  metasPlegadas: boolean
  onPlegarMetas: (plegadas: boolean) => void
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

  // Lo que ocupa días enteros va arriba, no sobre el eje de horas.
  // Cuántas metas cubren cada día: es el número que se enseña plegado, y también
  // lo que decide si la banda se pliega sola cuando nadie ha tocado el botón.
  const metasPorDia = useMemo(
    () => dias.map((d) => rutinas.filter((r) => !r.hora && esMeta(r) && cubreDia(r, d)).length),
    [rutinas, dias],
  )
  const tramos = useMemo(
    () => tramosBanda(rutinas, eventos, dias, metasPlegadas),
    [rutinas, eventos, dias, metasPlegadas],
  )
  // Plegada, la fila de contadores es el carril 0 y lo demás baja uno.
  const filaMetas = metasPlegadas && metasPorDia.some((n) => n > 0)
  const desplazo = filaMetas ? 1 : 0
  const carriles = tramos.reduce((m, tr) => Math.max(m, tr.carril + desplazo), desplazo ? 0 : -1)

  const izquierda = (col: number) => `calc(${GUTTER} + ${col} * ((100% - ${GUTTER}) / ${nCols}))`
  const ancho = `calc((100% - ${GUTTER}) / ${nCols} - 4px)`
  const izquierdaBloque = (col: number, subCol: number, totalSub: number) =>
    `calc(${GUTTER} + ${col} * ((100% - ${GUTTER}) / ${nCols}) + ${subCol} * ((100% - ${GUTTER}) / ${nCols} / ${totalSub}) + 2px)`
  const anchoBloque = (totalSub: number) => `calc((100% - ${GUTTER}) / ${nCols} / ${totalSub} - 4px)`
  const arriba = (min: number) => ((min - HORA_INI * 60) / 60) * ALTO_HORA

  return (
    <div className={nCols > 1 ? 'min-w-[640px]' : ''}>
      {/* Los días y lo que dura días enteros se quedan pegados arriba: el eje se
          desplaza por debajo, así que a media tarde se sigue sabiendo en qué día
          estás y qué lo ocupa. Fondo opaco o las barras se verían por detrás.
          El `-mt-3 pt-3` se come el padding superior del contenedor de scroll: si no,
          por esa rendija de 12 px se veían pasar los bloques por encima de los días.
          El `-top-3` va con ello: `sticky` mide su `top` desde el PADDING box, así que
          con `top-0` la cabecera se pegaba justo por debajo de la rendija. */}
      <div className="ui-panel-2 sticky -top-3 z-40 -mt-3 pt-3">
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

      {/* Semana: barra de avance bajo los días — dice por dónde va la semana sin
          apagar ninguna columna (en Día ese papel lo hace la barra del margen). */}
      {nCols > 1 && <BarraTiempo frac={fraccionSemana(dias[0], ahora)} className="ml-12" />}

      {/* Banda "sin hora": lo que ocupa días enteros, arriba y de una pieza. Antes
          cada día pintaba su propio chip y, además, la columna entera se lavaba de
          color — una meta de tres semanas apagaba el eje de horas de la semana. */}
      {(tramos.length > 0 || filaMetas) && (
        <div
          className="relative border-b border-white/10"
          style={{ height: (carriles + 1) * ALTO_CARRIL + 4 }}
        >
          {/* El margen de la banda pliega y despliega las metas. Solo aparece si
              hay alguna: sin metas no hay nada que plegar y sería un botón mudo. */}
          {metasPorDia.some((n) => n > 0) ? (
            <button
              type="button"
              onClick={() => onPlegarMetas(!metasPlegadas)}
              title={
                metasPlegadas
                  ? t('cal.metas.desplegar', 'Ver las metas de estos días')
                  : t('cal.metas.plegar', 'Plegar las metas')
              }
              className="absolute left-0 top-1 w-10 pr-2 text-right text-[9px] text-white/40 transition hover:text-white/80"
            >
              {metasPlegadas ? '▸' : '▾'}
            </button>
          ) : (
            <div className="absolute left-0 top-1 w-10 pr-2 text-right text-[9px] text-white/30">⋯</div>
          )}
          {dias.map((_, i) => (
            <div key={i} className="absolute bottom-0 top-0 border-l border-white/5" style={{ left: izquierda(i) }} />
          ))}
          {/* Plegadas: una sola fila con cuántas metas ocupan cada día. */}
          {filaMetas &&
            metasPorDia.map((n, i) =>
              n === 0 ? null : (
                <button
                  key={`m${i}`}
                  type="button"
                  onClick={() => onPlegarMetas(false)}
                  title={t('cal.metas.desplegar', 'Ver las metas de estos días')}
                  className="absolute flex items-center gap-1 truncate rounded border border-white/15 bg-white/10 px-1 text-left text-[10px] font-semibold leading-4 text-white/70 transition hover:bg-white/15 hover:text-white/90"
                  style={{
                    left: `calc(${izquierda(i)} + 2px)`,
                    width: ancho,
                    top: 2,
                    height: ALTO_CARRIL - 2,
                  }}
                >
                  <Icono nombre="objetivo" />
                  {n === 1
                    ? t('cal.metas.una', '1 meta')
                    : t('cal.metas.n', '{n} metas', { n })}
                </button>
              ),
            )}
          {tramos.map((tr) => (
            <button
              key={tr.clave}
              type="button"
              title={tr.nombre}
              onClick={() =>
                tr.rutina
                  ? onDetalle(tr.rutina, fechaISO(dias[tr.colIni]))
                  : tr.evento && abrirApp(tr.evento.plantillaId, tr.evento.seccion)
              }
              className={`absolute flex items-center gap-1 border px-1 text-left text-[10px] leading-4 text-white/90 transition hover:brightness-125 ${
                // Sin esquina del lado por el que el tramo se sale de la ventana:
                // se lee que sigue más allá sin escribirlo.
                tr.cortaIzq ? 'rounded-r' : tr.cortaDer ? 'rounded-l' : 'rounded'
              }`}
              style={{
                left: `calc(${izquierda(tr.colIni)} + 2px)`,
                width: `calc((100% - ${GUTTER}) / ${nCols} * ${tr.colFin - tr.colIni + 1} - 4px)`,
                top: 2 + (tr.carril + desplazo) * ALTO_CARRIL,
                height: ALTO_CARRIL - 2,
                backgroundColor: `${tr.color}33`,
                borderColor: `${tr.color}66`,
              }}
            >
              <span className="min-w-0 flex-1 truncate">
                <Icono emoji={tr.emoji} /> {tr.nombre}
              </span>
              {/* Al final de la barra, lo que falta para su plazo (solo metas: una
                  rutina no se "acaba", se repite). */}
              {tr.rutina && esMeta(tr.rutina) && !tr.rutina.completada && (
                <PildoraCuenta meta={tr.rutina} sobreColor />
              )}
            </button>
          ))}
        </div>
      )}
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
          <div key={h} className="absolute left-0 right-0 border-t border-white/10" style={{ top: i * ALTO_HORA }}>
            <span className="absolute -top-1.5 w-10 pr-2 text-right text-[9px] tabular-nums text-white/30">
              {String(h).padStart(2, '0')}:00
            </span>
          </div>
        ))}
        {/* Líneas verticales de columnas */}
        {dias.map((_, i) => (
          <div key={i} className="absolute bottom-0 top-0 border-l border-white/10" style={{ left: izquierda(i) }} />
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
              const estado = estadoEnFecha(r, fechaBloque, idx)
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

        {/* Marcas del tiempo vivido. Van al final (encima de los bloques) y sin
            capturar el puntero: son una referencia, no un elemento con el que se
            interactúe. En Día, la barra del margen izquierdo; en las dos vistas,
            la línea de la hora actual sobre la columna de hoy. */}
        {nCols === 1 && fraccionDia(fechaISO(dias[0]), ahora) > 0 && (
          <div
            className="pointer-events-none absolute left-0 top-0 z-30 w-1 rounded-full"
            style={{
              height: fraccionDia(fechaISO(dias[0]), ahora) * (TOTAL_MIN / 60) * ALTO_HORA,
              backgroundColor: COLOR_TIEMPO,
            }}
          />
        )}
        {(() => {
          const col = dias.findIndex((d) => fechaISO(d) === hoy)
          if (col === -1) return null
          const top = arriba(ahora.getHours() * 60 + ahora.getMinutes())
          return (
            <div className="pointer-events-none absolute z-30" style={{ left: izquierda(col), width: ancho, top }}>
              <div className="h-px w-full" style={{ backgroundColor: COLOR_TIEMPO }} />
              <div
                className="absolute -left-0.5 -top-1 h-2 w-2 rounded-full"
                style={{ backgroundColor: COLOR_TIEMPO }}
              />
            </div>
          )
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
  idx,
  onEditar,
  metas,
  onIrACronograma,
  onCerrar,
}: {
  rutina: Rutina
  fecha: string
  idx: IndiceEjecuciones
  /** Para poder agregarle una sub-meta (necesita el árbol completo). */
  metas: Rutina[]
  onIrACronograma: () => void
  onEditar: () => void
  onCerrar: () => void
}) {
  const t = useT()
  const esHoy = fecha === hoyISO()
  const color = colorDe(rutina)
  const meta = esMeta(rutina)
  const ejec = idx.por.get(`${fecha}|${rutina.id}`)
  const hechos = new Set(meta ? (rutina.pasosHechos ?? []) : (ejec?.pasosHechos ?? []))
  const [agregandoHija, setAgregandoHija] = useState(false)
  const [nombreHija, setNombreHija] = useState('')

  const borrar = async () => {
    if (rutina.id == null) return
    if (meta) {
      const hijas = descendientes(metas, rutina.id)
      const ok = await confirmar({
        titulo: hijas.length
          ? t('cal.meta.borrarConHijas', '¿Borrar esta meta y todas sus sub-metas?')
          : t('cal.meta.borrar', '¿Borrar esta meta?'),
        mensaje: rutina.nombre,
        textoOk: t('ui.borrar', 'Borrar'),
        peligro: true,
      })
      if (!ok) return
      await borrarMetaConDescendencia(rutina.id)
    } else {
      await rutinasRepo.remove(rutina.id)
    }
    onCerrar()
  }

  const confirmarHija = () => {
    if (!nombreHija.trim() || rutina.id == null) return
    const colorPrincipal = colorDe(raizDe(metas, rutina))
    void crearMeta(metas, nombreHija, rutina, colorPorProfundidad(colorPrincipal, profundidadDe(metas, rutina) + 1))
    setNombreHija('')
    setAgregandoHija(false)
  }

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
          {meta ? (
            <button
              type="button"
              onClick={onIrACronograma}
              className="px-1 text-xs text-white/40 transition hover:text-white/85"
              title={t('cal.meta.verEnCronograma', 'Ver en el Cronograma')}
            >
              <Icono nombre="derecha" />
            </button>
          ) : (
            <button type="button" onClick={onEditar} className="px-1 text-xs text-white/40 transition hover:text-white/85" title={t('rutinas.editar', 'Editar')}>
              <Icono nombre="editar" />
            </button>
          )}
          <button
            type="button"
            onClick={borrar}
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
        {!meta && <p className="mb-2 text-[10px] text-white/35"><Icono nombre="repetir" /> {textoRepeticion(rutina)}</p>}
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
            return meta || esHoy ? (
              <button
                key={i}
                type="button"
                onClick={() => (meta ? void togglePasoMeta(rutina, i) : togglePaso(rutina, i))}
                className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-white/10"
              >
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
        {!meta && !esHoy && rutina.pasos.length > 0 && (
          <p className="mt-2 text-center text-[10px] text-white/30">
            {t('cal.soloHoy', 'Los pasos solo se palomean el día de hoy.')}
          </p>
        )}
        {meta && (
          <div className="mt-2 border-t border-white/10 pt-2">
            {agregandoHija ? (
              <input
                autoFocus
                value={nombreHija}
                onChange={(e) => setNombreHija(e.target.value)}
                onBlur={confirmarHija}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmarHija()
                  else if (e.key === 'Escape') setAgregandoHija(false)
                }}
                placeholder={t('cal.meta.nuevaHija', 'Sub-meta…')}
                className="w-full rounded border border-white/15 bg-black/30 px-1.5 py-0.5 text-xs text-white/90 placeholder:text-white/25 focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setAgregandoHija(true)}
                className="text-[11px] text-white/40 transition hover:text-white/80"
              >
                + {t('cal.meta.agregarHija', 'Agregar una sub-meta')}
              </button>
            )}
          </div>
        )}
      </div>
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
  idx,
  ahora,
  onDia,
  onMes,
  onTrazar,
  onExtender,
  metaArmada,
}: {
  fecha: Date
  rutinas: Rutina[]
  idx: IndiceEjecuciones
  ahora: Date
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
        // Un mes cerrado se sombrea entero; el mes en curso lo hacen sus días.
        const mesVivido = capaTiempoMes(año, m, ahora)
        return (
          <div
            key={m}
            className="ui-panel rounded-xl border border-white/10 p-2"
            style={{ backgroundImage: componerFondo(mesVivido) }}
          >
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
                  delDia.length > 0 && delDia.every((r) => estadoEnFecha(r, iso, idx) === 'completa')
                const capas = capasFondo(rutinas, d)
                const fondo = componerFondo(mesVivido ? null : capaTiempoDia(iso, ahora), capas)
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
                      iso !== hoy
                        ? // El blanco forzado es por las capas de color, no por la sombra del tiempo.
                          { backgroundImage: fondo, color: capas ? '#fff' : undefined }
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
  ahora,
  rutinas,
  eventos,
  idx,
  onDia,
  onTrazar,
  onExtender,
  metasPlegadas,
  onPlegarMetas,
}: {
  fecha: Date
  ahora: Date
  rutinas: Rutina[]
  /** Lo que aportan las apps por fecha (solo lectura). */
  eventos: Map<string, EventoResuelto[]>
  idx: IndiceEjecuciones
  onDia: (d: Date) => void
  /** Rango trazado sobre los días (semanas y días). */
  onTrazar: (isoA: string, isoB: string) => void
  /** Evento estirado a lo ancho: se repite en los días del tramo. */
  onExtender: (r: Rutina, isoAncla: string, isoDestino: string) => void
  /** Las metas se resumen en un contador por celda en vez de una línea cada una. */
  metasPlegadas: boolean
  onPlegarMetas: (plegadas: boolean) => void
}) {
  const primero = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const inicio = inicioSemana(primero)
  const hoy = hoyISO()
  const celdas = Array.from({ length: 42 }, (_, i) => addDias(inicio, i))
  const t = useT()
  const { onPointerDown, enTrazo } = useTrazoDias(onTrazar)
  const { iniciar, enEstiron, estirando } = useEstiron(onExtender)
  // Igual que la banda de Semana: en una celda de mes caben tres líneas, así que
  // un día con media docena de metas las esconde TODAS tras un «+n» mudo. Antes
  // de llegar a eso, se resumen en un contador que se puede desplegar.
  const metasPorDia = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of celdas) m.set(fechaISO(d), rutinas.filter((r) => esMeta(r) && tocaFecha(r, d)).length)
    return m
  }, [rutinas, celdas])
  const plegadas = metasPlegadas

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
            // Plegadas, las metas salen del listado: las cuenta su chip.
            const nMetas = metasPorDia.get(iso) ?? 0
            const delDia = rutinas.filter((r) => tocaFecha(r, d) && !(plegadas && esMeta(r)))
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
                style={{ backgroundImage: componerFondo(capaTiempoDia(iso, ahora), capasFondo(rutinas, d)) }}
              >
                <span className={`mb-0.5 grid h-5 w-5 place-items-center self-start rounded-full text-[11px] font-bold ${esHoy ? 'bg-emerald-600 texto-cta' : 'text-white/60'}`}>
                  {d.getDate()}
                </span>
                {/* Las metas del día, resumidas. En <span> con rol de botón: la
                    celda ya es un botón y anidar dos no es HTML válido. */}
                {plegadas && nMetas > 0 && (
                  <span
                    role="button"
                    tabIndex={0}
                    title={t('cal.metas.desplegar', 'Ver las metas de estos días')}
                    onClick={(e) => {
                      e.stopPropagation()
                      onPlegarMetas(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.stopPropagation()
                      onPlegarMetas(false)
                    }}
                    className="truncate rounded border border-white/15 bg-white/10 px-1 text-[10px] font-semibold leading-4 text-white/70 transition hover:bg-white/15 hover:text-white/90"
                  >
                    <Icono nombre="objetivo" />{' '}
                    {nMetas === 1 ? t('cal.metas.una', '1 meta') : t('cal.metas.n', '{n} metas', { n: nMetas })}
                  </span>
                )}
                {rutinasVisibles.map((r) => {
                  const completa = estadoEnFecha(r, iso, idx) === 'completa'
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
