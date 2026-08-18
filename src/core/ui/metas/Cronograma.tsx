import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PlanMeta, Rutina } from '../../data/db'
import { planesMetaRepo } from '../../data/repository'
import { claveLS, iaHabilitada } from '../../edicion'
import { useCategoriasMeta } from '../../state/categoriasMetaStore'
import { pedirTexto } from '../../state/confirmarStore'
import { fechaLocalISO } from '../../fechaLocal'
import { localeActual, useT, type TFunc } from '../../i18n/useT'
import {
  crearMeta,
  descendientes,
  filasVisibles,
  hijasDe,
  moverMeta,
  profundidadDe,
  puedeSoltarEn,
  raices,
  raizDe,
  rangoConHijas,
} from '../../metas'
import { colorDe, colorPorProfundidad, COLORES_RUTINA } from '../coloresRutina'
import { useArrastre } from '../comun/arrastre'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/catalogo'
import { filasPlan, rangoDePlan, type FilaPlan } from '../../planMeta'
import { CabeceraPlan } from './CabeceraPlan'
import { etiquetasDePlanes, textoEtiquetaPlan } from './carpetas'
import { anchoTotal, columnasDe, isoMasDias, NIVELES_ZOOM, nivelQueEncuadra, ventana, xDeIso } from './escala'
import { FilaMeta } from './FilaMeta'
import { FilaPlanNodo } from './FilaPlanNodo'
import { GeneradorPlan } from './GeneradorPlan'
import { HojaMeta } from './HojaMeta'
import { HojaPlan } from './HojaPlan'
import { TableroMetas } from './TableroMetas'
import { PistaMeta } from './PistaMeta'
import { PistaPlan } from './PistaPlan'
import { VistaMetas } from './VistaMetas'
import { VistaPlanes } from './VistaPlanes'
import { PestanasCarpeta, type ItemPestana } from '../../../rooms/_shared/PestanasCarpeta'
import { COLOR } from '../../../rooms/metas/constantes'

/** Color de lo propuesto: fijo y fuera de la paleta de metas, para que "esto todavía
 *  no es tuyo" se lea sin pensar. */
const COLOR_PLAN = '#a78bfa'

/**
 * Una fila del cuerpo: una meta real, o el bloque de un plan superpuesto. Los nodos
 * propuestos NO son `Rutina` a propósito — falsearlas con ids negativos para colarlas
 * por `filasVisibles` las metería en el drag&drop y en `rutinasRepo.update(-3)`.
 */
type FilaCron =
  | { tipo: 'meta'; meta: Rutina; profundidad: number }
  | { tipo: 'planCabecera'; plan: PlanMeta }
  | ({ tipo: 'plan' } & FilaPlan)

/** Clase marcadora de la columna de la lista; el ancho es ajustable (ver `anchoArbol`). */
const COL_ARBOL = 'col-arbol-sticky'
const ANCHO_ARBOL_DEFECTO = 19 * 16
const ANCHO_ARBOL_MIN = 12 * 16
const ANCHO_ARBOL_MAX = 32 * 16

/** Alto de cada fila de la cabecera (contexto y detalle). */
const ALTO_FILA_EJE = 16

/** Los tres menús del cuarto, en el orden en que se recorren. */
type Modo = 'metas' | 'planes' | 'cronograma'

/**
 * Los menús como los de cualquier otra app de la casa (`PestanasCarpeta`). Van con
 * `clave` propia porque sus rótulos ya estaban traducidos bajo esos nombres desde
 * que esto vivía en el calendario.
 */
const MENUS: ItemPestana<Modo>[] = [
  { id: 'metas', icono: 'objetivo', clave: 'cal.metas', labelEs: 'Metas' },
  { id: 'planes', icono: 'brillo', clave: 'cal.plan.menu', labelEs: 'Planes' },
  { id: 'cronograma', icono: 'calendario', clave: 'cal.cronograma', labelEs: 'Cronograma' },
]

/**
 * Lo que se está mirando DENTRO del menú activo. `lista` es la portada de cada
 * menú (las metas, los planes o el eje completo); el resto son las pantallas de
 * detalle, que se abren desde cualquiera de los tres y al cerrarse devuelven al
 * menú del que salieron.
 *
 * Cada id se resuelve contra la lista viva: si la meta o el plan se borran, la
 * vista vuelve sola a su portada sin un efecto que lo vigile.
 */
type Pantalla =
  | { tipo: 'lista' }
  | { tipo: 'hojaMeta'; metaId: number }
  | { tipo: 'hojaPlan'; planId: number }
  | { tipo: 'generar'; metaId: number; desde: Pantalla }
  /** El eje ACOTADO a una meta: su subárbol y su plan, sin el resto de la casa. */
  | { tipo: 'eje'; metaId: number }

/** Cómo se disponen las metas en el panel. */
type Disposicion = 'lista' | 'rejilla' | 'tablero'
const DISPOSICIONES: Disposicion[] = ['lista', 'rejilla', 'tablero']
const LS_COLUMNAS = claveLS('mh.metas.columnas')

const ICONO_DISPOSICION: Record<Disposicion, NombreIcono> = {
  lista: 'lista',
  rejilla: 'rejilla',
  tablero: 'tablero',
}

const TITULO_DISPOSICION: Record<Disposicion, (t: TFunc) => string> = {
  lista: (t) => t('cal.metas.enLista', 'Ver en una lista'),
  rejilla: (t) => t('cal.metas.enColumnas', 'Ver en dos columnas'),
  tablero: (t) => t('cal.metas.enTablero', 'Ver como tablero'),
}

/**
 * El planificador de la casa, en tres menús: **Metas** (la lista, agrupada por
 * app), **Planes** (los cronogramas que la IA propuso) y **Cronograma** (el eje
 * del tiempo con todas). Desde cualquiera se entra a la hoja de una meta o de su
 * plan, y desde la hoja al eje ACOTADO a esa meta — su subárbol solo.
 *
 * Truco del layout del eje: la barra de una meta va en la MISMA fila del DOM que
 * la meta, no en un panel aparte. Las filas de la lista tienen alto variable
 * (detalle, pasos, nota), así que alinearlas por separado obligaría a medirlas;
 * siendo hermanas de la misma fila flex, la alineación sale sola. La columna de
 * la lista es `sticky` y necesita fondo opaco (`ui-panel-2`), o las barras se le
 * verían por debajo.
 */
export function Cronograma({
  metas,
  metaArmada,
  onArmar,
  ambito,
  ambitoId,
  ejemplo,
}: {
  metas: Rutina[]
  metaArmada: Rutina | null
  onArmar: (r: Rutina) => void
  /**
   * Embebido en una app: `metas` ya viene filtrada y re-enraizada a ella, y las
   * nuevas nacen con este `plantillaId`.
   *
   * Con ámbito se apaga el arrastre. Las filas re-enraizadas mienten sobre su
   * `padreId` (a propósito, para que se vean), así que `moverMeta` escribiría ese
   * `padreId: undefined` de mentira y desgajaría la rama del árbol real. Reordenar
   * el árbol entero es trabajo del calendario, que lo ve completo.
   */
  ambito?: string
  /** Sub-ámbito (`hobby:3`, `proyecto:7`) con el que nacen las nuevas metas. */
  ambitoId?: string
  /** Meta de ejemplo del dominio de la app (ya localizada): se ofrece como chip y
   * placeholder del alta para que el usuario la personalice antes de crearla. */
  ejemplo?: string
}) {
  const t = useT()
  // Índice en NIVELES_ZOOM, no un px/día suelto: los botones −/+ saltan de nivel en
  // nivel con nombre (días, semanas, meses, años), no escalan de forma continua.
  const [nivel, setNivel] = useState(1)
  const pxPerDia = NIVELES_ZOOM[nivel].pxPerDia
  const [rejilla, setRejilla] = useState(true)
  const [plegados, setPlegados] = useState<Set<number>>(new Set())
  const [busca, setBusca] = useState('')
  const [ocultarHechas, setOcultarHechas] = useState(false)
  // Mandos del eje a la vista (palomear, colgar sub-metas, detalle, borrar y el
  // arrastre). Apagados, cada fila es solo su nombre y su plazo. Como en el
  // índice de Biblioteca, no se recuerda: se enciende para retocar y se apaga.
  const [edicion, setEdicion] = useState(false)
  const [nombre, setNombre] = useState('')
  const [agregandoRaiz, setAgregandoRaiz] = useState(false)
  const [anchoArbol, setAnchoArbol] = useState(ANCHO_ARBOL_DEFECTO)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Rangos por encuadrar en cuanto el eje exista: se entra desde una hoja, y
  // encuadrar necesita medir el área visible del eje ya montado.
  const encuadrePendiente = useRef<{ ini: string; fin: string }[] | null>(null)
  // Arrancar centrado en hoy, una sola vez por eje: sin este guard, cada zoom (que
  // también cambia `xHoy`) volvería a saltar a hoy y taparía el recentrado de `irANivel`.
  const centradoInicial = useRef(false)
  // El recorrido se lee en este orden: primero las metas, luego los planes que las
  // desarrollan y al final el eje donde caen. Abre en Metas, que es el menú que
  // nunca está vacío.
  const [modo, setModo] = useState<Modo>('metas')
  // Re-pulsar el menú activo esconde su cuerpo, como en el resto de las apps.
  const [plegado, setPlegado] = useState(false)
  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: 'lista' })
  // Qué plan se superpone al eje GLOBAL (en el acotado manda el de su meta).
  const [planVisibleId, setPlanVisibleId] = useState<number | null>(null)

  /** Cambiar de menú cierra lo que hubiera abierto encima. */
  const irAModo = (m: Modo) => {
    setModo(m)
    setPantalla({ tipo: 'lista' })
    // El eje global se centra en hoy al abrirlo, aunque antes se haya mirado el
    // de una meta (ese consumió el guard con su propio encuadre).
    if (m === 'cronograma') centradoInicial.current = false
  }

  // Disposición del panel de Metas. Es preferencia del dispositivo, como el zoom:
  // se recuerda sin pasar por la BD.
  const [disposicion, setDisposicion] = useState<Disposicion>(() => {
    const guardado = localStorage.getItem(LS_COLUMNAS)
    // '2' y '1' son de cuando esto era un interruptor de una o dos columnas.
    if (guardado === '2') return 'rejilla'
    return DISPOSICIONES.includes(guardado as Disposicion) ? (guardado as Disposicion) : 'lista'
  })
  const cambiarDisposicion = (v: Disposicion) => {
    setDisposicion(v)
    localStorage.setItem(LS_COLUMNAS, v)
  }

  const nuevaCategoria = async () => {
    const nom = await pedirTexto({ titulo: t('cal.metas.categoria.nueva', 'Nueva categoría') })
    if (nom) useCategoriasMeta.getState().agregar(nom)
  }

  // Los planes son cosa del cronograma: `Calendario` no tiene por qué enterarse
  // (`FilaMeta` ya lee su repo directo por lo mismo). La lista se estabiliza aquí
  // para que el `?? []` de la carga inicial no invalide lo que cuelga de ella.
  const planesVivos = planesMetaRepo.useAll()
  const planes = useMemo(() => planesVivos ?? [], [planesVivos])
  // Solo los planes de las metas que ESTA vista sostiene. Sin este filtro, dentro de
  // una app (o con el filtro del calendario puesto) se ofrecían planes cuya meta
  // origen no está en la lista, y su bloque salía sin nombre y sin poder aceptarse.
  const planesMios = useMemo(() => {
    const ids = new Set(metas.map((m) => m.id))
    return planes.filter((p) => ids.has(p.metaId))
  }, [planes, metas])
  // Cómo se llama cada plan aquí: la misma etiqueta que en la vista Planes, sacada
  // de la misma lista, así que un plan lleva el mismo número en las dos.
  const etiquetasPlan = useMemo(() => etiquetasDePlanes(planesMios, metas, t), [planesMios, metas, t])
  const conIA = iaHabilitada()

  /**
   * El plan que ofrece la fila de cada meta en el panel de Metas. Una meta puede
   * tener varios (Plan A, B…): manda el aceptado — es el que ya se volvió cronograma
   * real — y, entre propuestas, la más reciente.
   */
  const planPorMeta = useMemo(() => {
    const orden = [...planesMios].sort(
      (a, b) => Number(!!b.aceptadoEn) - Number(!!a.aceptadoEn) || b.creadoEn.localeCompare(a.creadoEn),
    )
    const m = new Map<number, PlanMeta>()
    for (const p of orden) if (!m.has(p.metaId)) m.set(p.metaId, p)
    return m
  }, [planesMios])

  // Cada pantalla se resuelve contra la lista viva: borrar la meta (o el plan)
  // desde su hoja devuelve solo a la lista, sin dejar una hoja huérfana en pantalla.
  const hojaMeta = pantalla.tipo === 'hojaMeta' ? (metas.find((m) => m.id === pantalla.metaId) ?? null) : null
  const hojaPlan = pantalla.tipo === 'hojaPlan' ? (planesMios.find((p) => p.id === pantalla.planId) ?? null) : null
  const metaGenerar = pantalla.tipo === 'generar' ? (metas.find((m) => m.id === pantalla.metaId) ?? null) : null
  const metaEje = pantalla.tipo === 'eje' ? (metas.find((m) => m.id === pantalla.metaId) ?? null) : null
  // La portada del menú activo; es también el fondo al que se cae cuando el id de
  // una pantalla ya no existe.
  const enLista = !hojaMeta && !hojaPlan && !metaGenerar && !metaEje
  /** El eje se pinta acotado a una meta, o entero desde el menú Cronograma. */
  const ejeGlobal = enLista && modo === 'cronograma'
  const enEje = !!metaEje || ejeGlobal
  /** Su fila entera sobra en Planes, en las hojas y con el menú plegado: no hay
   *  sobre qué buscar ni qué encuadrar. */
  const conHerramientas = !plegado && ((enLista && modo !== 'planes') || enEje)

  /**
   * Lo que ve el eje: el subárbol de la meta acotada (que `filasVisibles`
   * re-enraíza solo) o el árbol entero en el menú Cronograma.
   */
  const metasEje = useMemo(
    () => (!enEje ? [] : metaEje?.id != null ? [metaEje, ...descendientes(metas, metaEje.id)] : metas),
    [metas, metaEje, enEje],
  )
  /**
   * El plan superpuesto: acotado manda el de SU meta (propuesta o aceptado — el
   * eje de una meta se abre justo para ver su plan sobre lo real); en el eje
   * global lo elige el selector de la barra.
   */
  const planVisible = useMemo(
    () => planesMios.find((p) => p.id === planVisibleId) ?? null,
    [planesMios, planVisibleId],
  )
  const planEje = metaEje?.id != null ? (planPorMeta.get(metaEje.id) ?? null) : planVisible

  /**
   * Un clic en una meta del panel abre SU HOJA: la del plan si lo tiene (ahí están
   * las fases y las sub-metas, propuesta o ya aceptada) y, si no, la de la meta.
   * Al eje se llega desde la hoja, nunca de golpe: aterrizar en él se llevaba por
   * delante lo que se venía a mirar — el desglose.
   */
  const abrirMeta = (r: Rutina) => {
    if (r.id == null) return
    const plan = planPorMeta.get(r.id)
    if (plan?.id != null) setPantalla({ tipo: 'hojaPlan', planId: plan.id })
    else setPantalla({ tipo: 'hojaMeta', metaId: r.id })
  }

  /**
   * Abre el eje acotado a una meta dejando pedido su encuadre: el subárbol y su
   * plan, que es lo que se viene a ver. El centrado en hoy se re-arma por si esos
   * rangos no existen (meta sin fechas).
   */
  const irAlEje = (metaId: number) => {
    const m = metas.find((x) => x.id === metaId)
    const plan = planPorMeta.get(metaId)
    encuadrePendiente.current = [m ? rangoConHijas(metas, m) : null, plan ? rangoDePlan(plan) : null].filter(
      (r): r is { ini: string; fin: string } => r != null,
    )
    centradoInicial.current = false
    setPantalla({ tipo: 'eje', metaId })
  }

  // `rangoConHijas` recorre la descendencia de cada meta: llamarlo por fila y por
  // gesto sería cuadrático. Se resuelve una vez por cambio de datos, y solo sobre
  // el subárbol acotado: la ventana temporal del eje se estrecha sola.
  //
  // El plan superpuesto entra aquí: si no, un plan que se sale de los periodos
  // reales se cortaría en el borde del eje, y "Ajustar" lo ignoraría justo cuando
  // lo que se quiere es encuadrar los dos para compararlos.
  const rangos = useMemo(() => {
    const reales = metasEje
      .map((m) => rangoConHijas(metasEje, m))
      .filter((r): r is { ini: string; fin: string } => r != null)
    const delPlan = planEje ? rangoDePlan(planEje) : null
    return delPlan ? [...reales, delPlan] : reales
  }, [metasEje, planEje])

  const hoy = useMemo(() => new Date(), [])
  const hoyIso = fechaLocalISO(hoy)
  // La ventana SÍ depende del zoom: se ensancha en días al alejar, para llenar
  // siempre el mismo ancho en píxeles en vez de compactarse en una esquina.
  const { desde, hasta } = useMemo(() => ventana(rangos, hoy, pxPerDia), [rangos, hoy, pxPerDia])
  const locale = localeActual()
  const filasEje = useMemo(
    () =>
      NIVELES_ZOOM[nivel].filas.map((u) => ({ unidad: u, columnas: columnasDe(u, desde, hasta, pxPerDia, locale) })),
    [nivel, desde, hasta, pxPerDia, locale],
  )
  const ancho = useMemo(() => anchoTotal(filasEje[0].columnas), [filasEje])
  const xHoy = xDeIso(desde, hoyIso, pxPerDia)

  const base = useMemo(
    () => filasVisibles(metasEje, plegados, { ocultarHechas, busca }),
    [metasEje, plegados, ocultarHechas, busca],
  )

  /**
   * Las filas reales más, si hay un plan a la vista, su bloque fantasma. El bloque va
   * DESPUÉS de la rama completa de su meta, no pegado a ella: colarlo entre la meta y
   * sus sub-metas partiría el subárbol en dos. Si la meta no está a la vista (la
   * escondió el filtro), el plan cae al final en vez de desaparecer sin explicación.
   */
  const filas = useMemo(() => {
    const reales: FilaCron[] = base.map((f) => ({ tipo: 'meta', ...f }))
    if (!planEje) return reales
    const i = reales.findIndex((f) => f.tipo === 'meta' && f.meta.id === planEje.metaId)
    let at = reales.length
    if (i !== -1) {
      const prof = (reales[i] as { profundidad: number }).profundidad
      const j = reales.findIndex((f, k) => k > i && f.tipo === 'meta' && f.profundidad <= prof)
      at = j === -1 ? reales.length : j
    }
    const bloque: FilaCron[] = [
      { tipo: 'planCabecera', plan: planEje },
      ...filasPlan(planEje).map((f): FilaCron => ({ tipo: 'plan', ...f })),
    ]
    return [...reales.slice(0, at), ...bloque, ...reales.slice(at)]
  }, [base, planEje])

  const claveFila = (f: FilaCron) =>
    f.tipo === 'meta' ? `m${f.meta.id}` : f.tipo === 'plan' ? `p${f.nodo.id}` : `ph${f.plan.id}`

  // Las líneas de la rejilla: los bordes de la unidad de detalle de este nivel. Se
  // reutilizan las columnas ya calculadas para esa fila de la cabecera — nada que
  // recalcular, y a zoom bajo la unidad ya es ancha (mes/trimestre), así que salen
  // pocas líneas. Los findes se sombrean aparte, solo cuando la unidad es el día.
  const unidadRejilla = NIVELES_ZOOM[nivel].unidadRejilla
  const lineasRejilla = useMemo(() => {
    if (!rejilla) return []
    const columnas = filasEje.find((f) => f.unidad === unidadRejilla)?.columnas ?? []
    const xs: { x: number; ancho: number; finde: boolean }[] = []
    let x = 0
    for (const c of columnas) {
      xs.push({ x, ancho: c.ancho, finde: c.finde === true })
      x += c.ancho
    }
    return xs
  }, [rejilla, filasEje, unidadRejilla])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || centradoInicial.current) return
    centradoInicial.current = true
    el.scrollLeft = Math.max(0, xHoy - (el.clientWidth - anchoArbol) / 3)
  }, [xHoy, anchoArbol])

  const irAHoy = () => {
    const el = scrollRef.current
    if (el) el.scrollLeft = Math.max(0, xHoy - (el.clientWidth - anchoArbol) / 3)
  }

  /**
   * Zoom que no marea: recuerda qué FECHA está bajo el cursor (o el centro del área
   * visible, en los botones) y recoloca el scroll para que esa misma fecha se quede
   * bajo el mismo punto de pantalla tras cambiar de nivel. Guarda una fecha absoluta,
   * no un día relativo a `desde` — `desde` también puede moverse al cambiar de nivel
   * (la ventana se ensancha), así que un desplazamiento relativo apuntaría a la
   * fecha equivocada. El recoloque tiene que esperar a que React repinte con el
   * ancho y el `desde` nuevos — por eso vive en un efecto.
   */
  const zoomObjetivo = useRef<{ iso: string; offset: number } | null>(null)
  const irANivel = (destino: number, clientX?: number) => {
    const objetivo = Math.min(NIVELES_ZOOM.length - 1, Math.max(0, destino))
    if (objetivo === nivel) return
    const el = scrollRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const offset = (clientX ?? rect.left + anchoArbol + (rect.width - anchoArbol) / 2) - rect.left - anchoArbol
    const dias = Math.round((el.scrollLeft + offset) / pxPerDia)
    zoomObjetivo.current = { iso: isoMasDias(fechaLocalISO(desde), dias), offset }
    setNivel(objetivo)
  }
  useLayoutEffect(() => {
    const el = scrollRef.current
    const z = zoomObjetivo.current
    if (el && z) el.scrollLeft = xDeIso(desde, z.iso, pxPerDia) - z.offset
    zoomObjetivo.current = null
  }, [pxPerDia, desde])

  /** Encuadra todos los periodos: elige el zoom que los mete en el área visible. */
  const ajustar = () => {
    const el = scrollRef.current
    if (!el || rangos.length === 0) return
    setNivel(nivelQueEncuadra(rangos, el.clientWidth - anchoArbol))
    // El scroll se recoloca al repintar, cuando ya existe el ancho nuevo.
    zoomObjetivo.current = { iso: rangos.map((r) => r.ini).reduce((a, b) => (a < b ? a : b)), offset: 24 }
  }

  /**
   * El encuadre que dejó pedido `irAlEje`, ya con el eje montado y medible. Se
   * encuadra el subárbol de la meta y su plan, no «todo» como hace «Ajustar» —
   * es lo que se vino a ver. Sin rangos (meta sin fechas ni plan fechado), el
   * eje se centra en hoy.
   */
  useLayoutEffect(() => {
    const pendientes = encuadrePendiente.current
    const el = scrollRef.current
    if (!pendientes || pantalla.tipo !== 'eje' || !el) return
    encuadrePendiente.current = null
    // Este posicionamiento manda sobre el centrado de arranque: sin el guard, un
    // cambio posterior de deps del otro efecto saltaría a hoy por su cuenta.
    centradoInicial.current = true
    if (pendientes.length === 0) {
      el.scrollLeft = Math.max(0, xHoy - (el.clientWidth - anchoArbol) / 3)
      return
    }
    const destino = nivelQueEncuadra(pendientes, el.clientWidth - anchoArbol)
    const ini = pendientes.map((r) => r.ini).reduce((a, b) => (a < b ? a : b))
    // Al mismo zoom no hay repintado que esperar: el scroll se pone ya.
    if (destino === nivel) el.scrollLeft = Math.max(0, xDeIso(desde, ini, pxPerDia) - 24)
    else {
      zoomObjetivo.current = { iso: ini, offset: 24 }
      setNivel(destino)
    }
  }, [pantalla, anchoArbol, nivel, desde, pxPerDia, xHoy])

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    irANivel(e.deltaY < 0 ? nivel - 1 : nivel + 1, e.clientX)
  }

  // Arrastrar el fondo desliza el tiempo. `:active` (CSS puro, sin estado) ya basta
  // para el cursor de agarre; el guard evita que se dispare sobre la lista, sus
  // controles o una barra, que tienen su propio gesto.
  const pan = useRef<{ x0: number; left0: number } | null>(null)
  const iniciarPan = (e: React.PointerEvent) => {
    const el = e.target as HTMLElement
    if (el.closest('.col-arbol-sticky, input, button, [data-barra]')) return
    pan.current = { x0: e.clientX, left0: scrollRef.current?.scrollLeft ?? 0 }
  }
  const moverPan = (e: React.PointerEvent) => {
    if (!pan.current || !scrollRef.current) return
    scrollRef.current.scrollLeft = pan.current.left0 - (e.clientX - pan.current.x0)
  }
  const soltarPan = () => {
    pan.current = null
  }

  const plegar = (id: number, abierta: boolean) =>
    setPlegados((p) => {
      const s = new Set(p)
      if (abierta) s.delete(id)
      else s.add(id)
      return s
    })

  /** Con alguna abierta, plegar todo; con todas plegadas, abrirlas. */
  const conHijas = useMemo(
    () => metasEje.filter((m) => m.id != null && hijasDe(metasEje, m.id).length > 0).map((m) => m.id!),
    [metasEje],
  )
  const todoPlegado = conHijas.length > 0 && conHijas.every((id) => plegados.has(id))
  const plegarTodo = () => setPlegados(todoPlegado ? new Set() : new Set(conHijas))

  const confirmarAlta = async (): Promise<Rutina | undefined> => {
    if (!nombre.trim()) return
    // En el eje acotado el alta crea una SUB-meta de la meta enfocada: una raíz
    // nueva sería invisible en la pantalla en la que estás.
    const nueva = metaEje
      ? await crearMeta(
          metas,
          nombre,
          metaEje,
          colorPorProfundidad(colorDe(raizDe(metas, metaEje)), profundidadDe(metas, metaEje) + 1),
          ambito,
          ambitoId,
        )
      : await crearMeta(
          metas,
          nombre,
          undefined,
          COLORES_RUTINA[raices(metas).length % COLORES_RUTINA.length],
          ambito,
          ambitoId,
        )
    setNombre('')
    return nueva
  }

  const cerrarAlta = () => {
    void confirmarAlta()
    setAgregandoRaiz(false)
  }

  /**
   * ✨ con la meta a medio escribir: se crea ya (mismo efecto que Enter) y el panel
   * se abre para ella. Si el usuario cancela el panel, la meta se queda — la
   * escribió, la quería. El botón se guarda de su propio `onMouseDown` para no
   * disparar el `onBlur` del input, que crearía la meta por segunda vez.
   */
  const abrirPlanIA = async () => {
    const nueva = await confirmarAlta()
    setAgregandoRaiz(false)
    if (nueva?.id != null) setPantalla({ tipo: 'generar', metaId: nueva.id, desde: pantalla })
  }

  /** Arrastra la manija de la cabecera para ensanchar o angostar la lista. */
  const arrastreCol = useRef<{ x0: number; ancho0: number } | null>(null)
  const iniciarResizeCol = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation() // si no, el paneo del fondo también arranca
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Sin captura el gesto sigue igual; ver `capturarPointer` en BarraMeta.
    }
    arrastreCol.current = { x0: e.clientX, ancho0: anchoArbol }
  }
  const moverResizeCol = (e: React.PointerEvent) => {
    if (!arrastreCol.current) return
    const { x0, ancho0 } = arrastreCol.current
    setAnchoArbol(Math.min(ANCHO_ARBOL_MAX, Math.max(ANCHO_ARBOL_MIN, ancho0 + (e.clientX - x0))))
  }
  const soltarResizeCol = () => {
    arrastreCol.current = null
  }

  /** Soltar sobre una fila: dentro de ella, o antes si son hermanas. */
  const soltarEnFila = (r: Rutina, destino: Rutina) => {
    if (destino.id == null || r.id === destino.id) return
    if (r.padreId === destino.padreId) void moverMeta(metas, r, destino.padreId, destino.id)
    else if (puedeSoltarEn(metas, r, destino)) void moverMeta(metas, r, destino.id)
  }

  // El gesto de arrastre del árbol (el compartido de la casa, sin asa): soltar
  // sobre una fila mete la meta dentro (o antes, si son hermanas) y soltar en el
  // fondo de la lista la sube al primer nivel.
  const arrFilas = useArrastre<{ tipo: 'fila'; fila: Rutina } | { tipo: 'raiz' }>(
    (e, mano) => {
      const r = metas.find((m) => String(m.id) === mano)
      if (!r) return null
      const bajo = document.elementFromPoint(e.clientX, e.clientY)
      const fila = bajo?.closest('[data-rama]')
      if (fila) {
        const destino = metas.find((m) => String(m.id) === fila.getAttribute('data-rama'))
        if (!destino || destino.id === r.id) return null
        if (r.padreId === destino.padreId || puedeSoltarEn(metas, r, destino))
          return { tipo: 'fila', fila: destino }
        return null
      }
      // En el eje acotado la zona raíz significa «al primer nivel del ámbito»:
      // colgar la fila directo de la meta enfocada, nunca desgajarla del árbol.
      if (bajo?.closest('[data-zona-raiz]')) {
        if (metaEje ? r.padreId !== metaEje.id : r.padreId != null) return { tipo: 'raiz' }
      }
      return null
    },
    (mano, d) => {
      const r = metas.find((m) => String(m.id) === mano)
      if (!r) return
      if (d.tipo === 'raiz') {
        if (metaEje?.id != null) {
          if (r.padreId !== metaEje.id) void moverMeta(metas, r, metaEje.id)
        } else if (r.padreId != null) void moverMeta(metas, r, undefined)
      } else soltarEnFila(r, d.fila)
    },
  )
  const metaEnMano = arrFilas.enMano ? metas.find((m) => String(m.id) === arrFilas.enMano) ?? null : null
  const enRaiz = arrFilas.destino?.tipo === 'raiz'

  const filtrando = busca.trim() !== '' || ocultarHechas

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Metas → Planes → Cronograma: el borrador va antes que el eje, no al revés. */}
      <div className="mx-auto w-full max-w-2xl shrink-0 px-3 pt-1">
        <PestanasCarpeta
          items={MENUS}
          activo={modo}
          onCambio={irAModo}
          prefijoTut="cal.cron.modo"
          variante="raiz"
          color={COLOR}
          plegado={plegado}
          onAlternarPliegue={() => setPlegado((v) => !v)}
        />
      </div>

      {/* Las herramientas de la pantalla activa, en su propia fila: compartiendo la
          de los menús no se distinguía el «dónde estoy» del «qué puedo hacer aquí». */}
      {conHerramientas && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pt-2">
        {/* El eje acotado es de UNA meta: se entra desde su hoja y este es el
            camino de vuelta (el global no lo lleva: su vuelta son las pestañas). */}
        {metaEje && (
          <button
            type="button"
            data-tut="cal.cron.volver"
            onClick={() => abrirMeta(metaEje)}
            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-white/45 transition hover:bg-white/10 hover:text-white/85"
          >
            ‹ {t('cal.cron.volver', 'Volver a la meta')}
          </button>
        )}

        {/* El buscador sale en todas las pantallas de esta fila (metas y eje): es la
            misma condición que la de la fila, así que no lleva guardia propia. */}
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t('cal.cron.buscar', 'Buscar…')}
          className="w-36 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] text-white/85 placeholder:text-white/25 focus:outline-none"
        />

        {enLista && modo === 'metas' && !ambito && (
          <>
            <button
              type="button"
              onClick={() => void nuevaCategoria()}
              className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
            >
              + {t('cal.metas.categoria', 'categoría')}
            </button>
            {/* Las tres disposiciones, cada una con su botón: un solo icono que
                iba ciclando no dejaba ver que el tablero existía. */}
            <div className="flex items-center rounded-lg border border-white/10 p-0.5">
              {DISPOSICIONES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => cambiarDisposicion(d)}
                  title={TITULO_DISPOSICION[d](t)}
                  className={`rounded-md px-2 py-1 text-[11px] transition ${
                    disposicion === d ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  <Icono nombre={ICONO_DISPOSICION[d]} />
                </button>
              ))}
            </div>
          </>
        )}

        {enEje && (
        <>
        {/* El eje se lee de corrido —nombre y plazo— y solo enseña sus mandos
            cuando se pide: con doce filas, siete botones por fila tapaban lo
            único que se viene a mirar aquí, que son las barras. */}
        <button
          type="button"
          onClick={() => setEdicion((v) => !v)}
          title={t('cal.cron.editar', 'Editar las metas')}
          aria-label={t('cal.cron.editar', 'Editar las metas')}
          aria-pressed={edicion}
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
            edicion ? 'ui-accent-bg border-transparent' : 'border-white/10 text-white/45 hover:text-white/80'
          }`}
        >
          <Icono nombre="editar" />
        </button>
        <button
          type="button"
          onClick={() => setOcultarHechas((v) => !v)}
          title={t('cal.cron.ocultarHechas', 'Ocultar las completadas')}
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
            ocultarHechas ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300' : 'border-white/10 text-white/45 hover:text-white/80'
          }`}
        >
          {t('cal.cron.hechas', 'Hechas')}
        </button>
        <button
          type="button"
          onClick={plegarTodo}
          disabled={conHijas.length === 0}
          title={todoPlegado ? t('cal.cron.desplegarTodo', 'Desplegar todo') : t('cal.cron.plegarTodo', 'Plegar todo')}
          className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/45 transition hover:text-white/80 disabled:opacity-25"
        >
          {todoPlegado ? '▸▸' : '▾▾'}
        </button>

        {/* Qué se ve sobre el eje entero: tu cronograma real, o uno de los planes
            propuestos encima de él. Uno a la vez: comparar tres no se lee. En el
            eje de UNA meta no hace falta — ahí manda el plan de esa meta. */}
        {ejeGlobal && planesMios.length > 0 && (
          <select
            value={planVisibleId ?? ''}
            onChange={(e) => setPlanVisibleId(e.target.value ? Number(e.target.value) : null)}
            title={t('cal.plan.vista', 'Qué cronograma ves')}
            className={`rounded-lg border bg-black/30 px-2 py-1 text-[11px] font-semibold outline-none transition ${
              planVisible ? 'border-violet-400/50 text-violet-200' : 'border-white/10 text-white/45'
            }`}
          >
            <option value="">{t('cal.plan.real', 'Real')}</option>
            {planesMios.map((p) => (
              <option key={p.id} value={p.id}>
                {/* El mismo nombre que en Planes («Jardín · Plan 1»): «Plan A» se
                    repetía en todas las opciones y no decía de quién era cada una. */}
                ✨ {textoEtiquetaPlan(etiquetasPlan.get(p.id ?? -1), p.nombre, t)}
                {p.aceptadoEn ? ' ✓' : ''} · {metas.find((m) => m.id === p.metaId)?.nombre}
              </option>
            ))}
          </select>
        )}

        <div className="ms-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={irAHoy}
            className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/75 transition hover:bg-white/10"
          >
            {t('cal.hoy', 'Hoy')}
          </button>
          <button
            type="button"
            onClick={ajustar}
            disabled={rangos.length === 0}
            title={t('cal.cron.ajustarAyuda', 'Encuadrar todos los periodos')}
            className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/75 transition hover:bg-white/10 disabled:opacity-25"
          >
            {t('cal.cron.ajustar', 'Ajustar')}
          </button>
          <button
            type="button"
            onClick={() => setRejilla((v) => !v)}
            title={rejilla ? t('cal.cron.apagarRejilla', 'Apagar la rejilla') : t('cal.cron.encenderRejilla', 'Encender la rejilla')}
            className={`rounded-lg border p-1.5 text-[11px] transition ${
              rejilla ? 'border-white/25 bg-white/10 text-white/80' : 'border-white/10 text-white/40 hover:text-white/70'
            }`}
          >
            <Icono nombre="rejilla" />
          </button>
          <div className="flex items-center rounded-lg border border-white/10 p-0.5">
            <button
              type="button"
              onClick={() => irANivel(nivel + 1)}
              disabled={nivel >= NIVELES_ZOOM.length - 1}
              title={t('cal.cron.alejar', 'Alejar')}
              className="w-7 rounded-md py-1 text-xs font-bold text-white/60 transition hover:bg-white/10 disabled:opacity-25"
            >
              −
            </button>
            <span className="w-16 truncate text-center text-[11px] font-semibold text-white/50">
              {t(`cal.cron.nivel.${NIVELES_ZOOM[nivel].clave}`, NIVELES_ZOOM[nivel].nombre)}
            </span>
            <button
              type="button"
              onClick={() => irANivel(nivel - 1)}
              disabled={nivel <= 0}
              title={t('cal.cron.acercar', 'Acercar')}
              className="w-7 rounded-md py-1 text-xs font-bold text-white/60 transition hover:bg-white/10 disabled:opacity-25"
            >
              +
            </button>
          </div>
        </div>
        </>
        )}
        </div>
      )}

      {plegado ? null : hojaMeta ? (
        <HojaMeta
          meta={hojaMeta}
          metas={metas}
          onVolver={() => setPantalla({ tipo: 'lista' })}
          onPlanIA={
            conIA
              ? (r) => r.id != null && setPantalla({ tipo: 'generar', metaId: r.id, desde: pantalla })
              : undefined
          }
          onVerCronograma={() => hojaMeta.id != null && irAlEje(hojaMeta.id)}
        />
      ) : hojaPlan ? (
        <HojaPlan
          plan={hojaPlan}
          metas={metas}
          onVolver={() => setPantalla({ tipo: 'lista' })}
          volverA={modo === 'planes' ? t('cal.plan.volverLista', 'Volver a los planes') : undefined}
          onVerEnCronograma={() => irAlEje(hojaPlan.metaId)}
          onVerMeta={(r) => r.id != null && setPantalla({ tipo: 'hojaMeta', metaId: r.id })}
          etiqueta={textoEtiquetaPlan(etiquetasPlan.get(hojaPlan.id ?? -1), hojaPlan.nombre, t)}
        />
      ) : metaGenerar ? (
        <GeneradorPlan
          meta={metaGenerar}
          // `planesMios`, no `planes`: con el filtro del calendario puesto (o dentro
          // de una app) se numeraría contra planes de metas que ya no se ven.
          planes={planesMios}
          onCancelar={() => setPantalla(pantalla.tipo === 'generar' ? pantalla.desde : { tipo: 'lista' })}
          // Los planes anteriores de la meta se conservan (el menú Planes los
          // sigue listando): la fila de la meta ofrece el aceptado, o el más
          // reciente si aún ninguno lo está.
          onGuardado={(id) => setPantalla({ tipo: 'hojaPlan', planId: id })}
        />
      ) : enLista && modo === 'planes' ? (
        <VistaPlanes
          metas={metas}
          // `planesMios`, no `planes`: con el filtro del calendario puesto (o dentro
          // de una app) la lista enseñaba planes de metas que ya no se ven, y su
          // tarjeta salía sin meta a la que volver.
          planes={planesMios}
          metaArmada={metaArmada}
          onAbrirPlan={(id) => setPantalla({ tipo: 'hojaPlan', planId: id })}
          onGenerar={(m) => m.id != null && setPantalla({ tipo: 'generar', metaId: m.id, desde: pantalla })}
          onIrACronograma={() => irAModo('cronograma')}
        />
      ) : enLista && modo === 'metas' ? (
        disposicion === 'tablero' && !ambito ? (
          <TableroMetas
            metas={metas}
            busca={busca}
            planPorMeta={planPorMeta}
            onAbrirMeta={abrirMeta}
          />
        ) : (
          <VistaMetas
            metas={metas}
            busca={busca}
            dosColumnas={disposicion === 'rejilla'}
            planPorMeta={planPorMeta}
            onAbrirMeta={abrirMeta}
            ambito={ambito}
            ambitoId={ambitoId}
            ejemplo={ejemplo}
          />
        )
      ) : (
      <div
        ref={scrollRef}
        data-tut="cal.cron.eje"
        onWheel={onWheel}
        onPointerDown={iniciarPan}
        onPointerMove={moverPan}
        onPointerUp={soltarPan}
        onPointerLeave={soltarPan}
        className="relative mt-2 min-h-0 flex-1 cursor-grab overflow-auto active:cursor-grabbing"
      >
        <div className="w-max min-w-full">
          {/* Cabecera: dos filas, la pareja que se lee a este zoom (contexto y detalle). */}
          <div className="sticky top-0 z-20 flex flex-col">
            {filasEje.map(({ unidad, columnas }, fila) => (
              <div key={unidad} className="flex">
                <div
                  className={`${COL_ARBOL} ui-panel-2 relative sticky start-0 z-10 flex items-center border-e px-1 border-white/10 ${
                    fila === filasEje.length - 1 ? 'border-b' : ''
                  }`}
                  style={{ minWidth: anchoArbol, maxWidth: anchoArbol, height: ALTO_FILA_EJE }}
                >
                  {/* Manija para ajustar el ancho de la lista, anclada a la celda
                      (sticky, se queda pinneada al hacer scroll) en vez de a `anchoArbol`
                      en px: así sigue el ancho real sin recalcular nada. Solo alcanza la
                      altura de la cabecera, pero `setPointerCapture` hace que el arrastre
                      siga funcionando aunque el cursor baje sobre las filas. */}
                  {fila === 0 && (
                    <div
                      onPointerDown={iniciarResizeCol}
                      onPointerMove={moverResizeCol}
                      onPointerUp={soltarResizeCol}
                      onPointerCancel={soltarResizeCol}
                      title={t('cal.cron.ajustarAncho', 'Arrastra para ajustar el ancho de la lista')}
                      style={{ right: -3, top: 0, height: ALTO_FILA_EJE * filasEje.length }}
                      className="absolute z-30 w-1.5 cursor-col-resize touch-none rounded-full bg-white/10 transition hover:bg-emerald-400/60 active:bg-emerald-400"
                    />
                  )}
                  {/* Alta a la altura de la fila de fechas, no en su propia fila:
                      `crearMeta` ya inserta la nueva primera en `orden`, así que se ve
                      aquí arriba sin más. En el eje acotado siempre nace una SUB-meta
                      de la meta enfocada (el chip de ejemplo es cosa de la lista). */}
                  {fila === filasEje.length - 1 &&
                    (agregandoRaiz ? (
                      <div className="flex w-full items-center gap-1">
                        <input
                          autoFocus
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          onBlur={cerrarAlta}
                          // Enter deja la caja abierta: así se encadenan varias metas de un tirón.
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void confirmarAlta()
                            else if (e.key === 'Escape') setAgregandoRaiz(false)
                          }}
                          placeholder={
                            metaEje
                              ? t('cal.meta.nuevaHija', 'Sub-meta…')
                              : ejemplo
                                ? t('cal.meta.ejemplo', 'Ej.: {ejemplo}', { ejemplo })
                                : t('cal.metaPlaceholder', 'Agregar una meta…')
                          }
                          className="min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-1.5 text-[10px] leading-none text-white/90 placeholder:text-white/25 focus:border-white/25 focus:outline-none"
                        />
                        {conIA && (
                          <button
                            type="button"
                            // Sin esto el input pierde el foco antes del clic y su
                            // `onBlur` crea la meta por su cuenta: saldrían dos.
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => void abrirPlanIA()}
                            disabled={!nombre.trim()}
                            title={t('cal.plan.ia', 'Planear con IA')}
                            className="shrink-0 rounded-full border border-violet-400/50 bg-violet-500/20 px-1.5 py-0.5 text-[10px] leading-none text-violet-200 transition hover:bg-violet-500/35 hover:text-violet-100 disabled:opacity-25 disabled:hover:bg-violet-500/20"
                          >
                            <Icono nombre="brillo" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAgregandoRaiz(true)}
                        className="shrink-0 rounded px-1.5 py-0.5 text-xs font-bold leading-none text-emerald-300/90 transition hover:bg-emerald-500/15 hover:text-emerald-200"
                      >
                        +{' '}
                        {metaEje
                          ? t('cal.meta.prefijoSub', 'sub') + t('cal.meta.sufijoMeta', 'meta')
                          : t('cal.meta.etiquetaMeta', 'meta')}
                      </button>
                    ))}
                </div>
                <div className="ui-panel-2 flex" style={{ width: ancho, height: ALTO_FILA_EJE }}>
                  {columnas.map((c, i) => (
                    <div
                      key={i}
                      style={{ width: c.ancho }}
                      className={`shrink-0 truncate border-e px-1 text-[9px] tabular-nums ${
                        c.finde ? 'bg-white/[0.04] text-white/25' : 'text-white/40'
                      } ${
                        fila === 0 ? 'border-white/10 font-bold uppercase tracking-wider' : 'border-white/5'
                      } ${fila === filasEje.length - 1 ? 'border-b border-b-white/10' : ''}`}
                    >
                      {c.etiqueta}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div data-zona-raiz="1" className={enRaiz ? 'bg-accent/5' : ''}>
            {/* Meta y barra son hermanas de la MISMA fila flex (ver el truco de
                layout de arriba): la fila de un plan reutiliza el envoltorio tal
                cual y solo cambia sus dos hijos. */}
            {filas.map((f) => (
              <div key={claveFila(f)} className={`flex ${rejilla ? 'border-b border-white/5' : ''}`}>
                <div
                  className={`${COL_ARBOL} ui-panel-2 sticky start-0 z-10 border-e border-white/10`}
                  style={{ minWidth: anchoArbol, maxWidth: anchoArbol }}
                >
                  {f.tipo === 'meta' && (
                    <FilaMeta
                      metas={metasEje}
                      meta={f.meta}
                      profundidad={f.profundidad}
                      abierta={f.meta.id == null || !plegados.has(f.meta.id)}
                      onPlegar={(a) => f.meta.id != null && plegar(f.meta.id, a)}
                      metaArmada={metaArmada}
                      onArmar={onArmar}
                      edicion={edicion}
                      // Reordenar es editar: sin el modo puesto, arrastrar una fila
                      // solo servía para moverla sin querer mientras se lee el eje.
                      // Tampoco lo lleva la meta enfocada (soltarla en la zona raíz
                      // la desgajaría) ni el cronograma embebido en una app, donde
                      // el `padreId` re-enraizado es de mentira.
                      gesto={
                        !edicion || ambito || f.meta.id == null || f.meta.id === metaEje?.id
                          ? undefined
                          : arrFilas.props(String(f.meta.id))
                      }
                      enMano={metaEnMano?.id === f.meta.id}
                      encima={
                        arrFilas.destino?.tipo === 'fila' && arrFilas.destino.fila.id === f.meta.id
                          ? metaEnMano?.padreId === f.meta.padreId
                            ? 'antes'
                            : 'dentro'
                          : null
                      }
                      onPlanIA={
                        conIA
                          ? (r) => r.id != null && setPantalla({ tipo: 'generar', metaId: r.id, desde: pantalla })
                          : undefined
                      }
                    />
                  )}
                  {f.tipo === 'planCabecera' && (
                    <CabeceraPlan
                      plan={f.plan}
                      etiqueta={textoEtiquetaPlan(etiquetasPlan.get(f.plan.id ?? -1), f.plan.nombre, t)}
                      // El bloque se resuelve vivo contra `planPorMeta`: al aceptar se
                      // queda (marcado), y al borrarse desaparece solo.
                      onAceptado={() => {}}
                      onBorrado={() => {}}
                      onAbrirHoja={() => f.plan.id != null && setPantalla({ tipo: 'hojaPlan', planId: f.plan.id })}
                    />
                  )}
                  {f.tipo === 'plan' && (
                    <FilaPlanNodo
                      nodo={f.nodo}
                      profundidad={f.profundidad}
                      color={COLOR_PLAN}
                      // Personalizable mientras sea propuesta; aceptado, lo editable
                      // son las sub-metas reales que nacieron de él.
                      plan={planEje && !planEje.aceptadoEn ? planEje : undefined}
                    />
                  )}
                </div>

                {f.tipo === 'meta' ? (
                  <PistaMeta
                    metas={metasEje}
                    meta={f.meta}
                    ancho={ancho}
                    desde={desde}
                    pxPerDia={pxPerDia}
                    armada={metaArmada?.id === f.meta.id}
                    hoyIso={hoyIso}
                    onArmar={onArmar}
                  />
                ) : f.tipo === 'plan' && planEje ? (
                  <PistaPlan
                    plan={planEje}
                    nodo={f.nodo}
                    color={COLOR_PLAN}
                    ancho={ancho}
                    desde={desde}
                    pxPerDia={pxPerDia}
                    editable={!planEje.aceptadoEn}
                  />
                ) : (
                  <div style={{ width: ancho }} />
                )}
              </div>
            ))}

            {/* Un plan sobre una lista filtrada a cero sigue teniendo que verse. */}
            {base.length === 0 && !planEje && (
              <div className="flex">
                <div
                  className={`${COL_ARBOL} ui-panel-2 sticky start-0 z-10 border-e border-white/10 py-2 text-center text-[10px] text-white/25`}
                  style={{ minWidth: anchoArbol, maxWidth: anchoArbol }}
                >
                  {filtrando
                    ? t('cal.cron.sinResultados', 'Ninguna meta coincide.')
                    : t('cal.cron.vacio', 'Todavía no hay metas.')}
                </div>
                <div style={{ width: ancho }} />
              </div>
            )}
          </div>

          {/* La rejilla: los bordes de la unidad de este nivel, sobre todo el cuerpo. */}
          {lineasRejilla.map((l, i) => (
            <div
              key={i}
              className={`pointer-events-none absolute top-0 h-full ${l.finde ? 'bg-white/[0.03]' : ''}`}
              style={{ left: anchoArbol + l.x, width: l.ancho, borderRight: '1px solid color-mix(in srgb, var(--ui-ink) 9%, transparent)' }}
            />
          ))}

          {/* La línea de hoy, sobre todo el cuerpo. */}
          <div
            className="pointer-events-none absolute top-0 h-full w-px bg-amber-400/50"
            style={{ left: anchoArbol + xHoy + pxPerDia / 2 }}
          />
        </div>
      </div>
      )}
    </div>
  )
}
