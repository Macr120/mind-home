import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PlanMeta, Rutina } from '../../data/db'
import { planesMetaRepo } from '../../data/repository'
import { iaHabilitada } from '../../edicion'
import { fechaLocalISO } from '../../fechaLocal'
import { localeActual, useT } from '../../i18n/useT'
import {
  crearMeta,
  filasVisibles,
  hijasDe,
  moverMeta,
  puedeSoltarEn,
  raices,
  rangoConHijas,
} from '../../metas'
import { COLORES_RUTINA } from '../coloresRutina'
import { Icono } from '../iconos/Icono'
import { filasPlan, rangoDePlan, type FilaPlan } from '../../planMeta'
import { CabeceraPlan } from './CabeceraPlan'
import { anchoTotal, columnasDe, isoMasDias, NIVELES_ZOOM, nivelQueEncuadra, ventana, xDeIso } from './escala'
import { FilaMeta } from './FilaMeta'
import { FilaPlanNodo } from './FilaPlanNodo'
import { PistaMeta } from './PistaMeta'
import { PistaPlan } from './PistaPlan'
import { PlanIAPanel } from './PlanIAPanel'

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

/**
 * Vista Cronograma: la lista de Metas a la izquierda y sus periodos como barras a
 * la derecha, sobre un eje de tiempo con zoom.
 *
 * Truco del layout: la barra de una meta va en la MISMA fila del DOM que la meta,
 * no en un panel aparte. Las filas de la lista tienen alto variable (detalle,
 * pasos, nota), así que alinearlas por separado obligaría a medirlas; siendo
 * hermanas de la misma fila flex, la alineación sale sola. La columna de la lista
 * es `sticky` y necesita fondo opaco (`ui-panel-2`), o las barras se le verían por
 * debajo.
 */
export function Cronograma({
  metas,
  metaArmada,
  onArmar,
  ambito,
  ambitoId,
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
  const [nombre, setNombre] = useState('')
  const [agregandoRaiz, setAgregandoRaiz] = useState(false)
  const [arrastrada, setArrastrada] = useState<Rutina | null>(null)
  const [enRaiz, setEnRaiz] = useState(false)
  const [anchoArbol, setAnchoArbol] = useState(ANCHO_ARBOL_DEFECTO)
  const [planPara, setPlanPara] = useState<Rutina | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Los planes son cosa del cronograma: `Calendario` no tiene por qué enterarse
  // (`FilaMeta` ya lee su repo directo por lo mismo). La lista se estabiliza aquí
  // para que el `?? []` de la carga inicial no invalide lo que cuelga de ella.
  const planesVivos = planesMetaRepo.useAll()
  const planes = useMemo(() => planesVivos ?? [], [planesVivos])
  const conIA = iaHabilitada()
  const [planVisibleId, setPlanVisibleId] = useState<number | null>(null)
  // Se resuelve contra la lista viva: si el plan se borra, la vista vuelve sola a
  // "Real" sin un efecto que lo vigile.
  const planVisible = useMemo(
    () => planes.find((p) => p.id === planVisibleId) ?? null,
    [planes, planVisibleId],
  )

  // `rangoConHijas` recorre la descendencia de cada meta: llamarlo por fila y por
  // gesto sería cuadrático. Se resuelve una vez por cambio de datos.
  //
  // El plan visible entra aquí: si no, un plan que se sale de los periodos reales se
  // cortaría en el borde del eje, y "Ajustar" lo ignoraría justo cuando lo que se
  // quiere es encuadrar los dos para compararlos.
  const rangos = useMemo(() => {
    const reales = metas
      .map((m) => rangoConHijas(metas, m))
      .filter((r): r is { ini: string; fin: string } => r != null)
    const delPlan = planVisible ? rangoDePlan(planVisible) : null
    return delPlan ? [...reales, delPlan] : reales
  }, [metas, planVisible])

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
    () => filasVisibles(metas, plegados, { ocultarHechas, busca }),
    [metas, plegados, ocultarHechas, busca],
  )

  /**
   * Las filas reales más, si hay un plan a la vista, su bloque fantasma. El bloque va
   * DESPUÉS de la rama completa de su meta, no pegado a ella: colarlo entre la meta y
   * sus sub-metas partiría el subárbol en dos. Si la meta no está a la vista (la
   * escondió el filtro), el plan cae al final en vez de desaparecer sin explicación.
   */
  const filas = useMemo(() => {
    const reales: FilaCron[] = base.map((f) => ({ tipo: 'meta', ...f }))
    if (!planVisible) return reales
    const i = reales.findIndex((f) => f.tipo === 'meta' && f.meta.id === planVisible.metaId)
    let at = reales.length
    if (i !== -1) {
      const prof = (reales[i] as { profundidad: number }).profundidad
      const j = reales.findIndex((f, k) => k > i && f.tipo === 'meta' && f.profundidad <= prof)
      at = j === -1 ? reales.length : j
    }
    const bloque: FilaCron[] = [
      { tipo: 'planCabecera', plan: planVisible },
      ...filasPlan(planVisible).map((f): FilaCron => ({ tipo: 'plan', ...f })),
    ]
    return [...reales.slice(0, at), ...bloque, ...reales.slice(at)]
  }, [base, planVisible])

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

  // Arrancar centrado en hoy, una sola vez: sin este guard, cada zoom (que también
  // cambia `xHoy`) volvería a saltar a hoy y taparía el recentrado de `irANivel`.
  const centradoInicial = useRef(false)
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
    () => metas.filter((m) => m.id != null && hijasDe(metas, m.id).length > 0).map((m) => m.id!),
    [metas],
  )
  const todoPlegado = conHijas.length > 0 && conHijas.every((id) => plegados.has(id))
  const plegarTodo = () => setPlegados(todoPlegado ? new Set() : new Set(conHijas))

  const confirmarAlta = async (): Promise<Rutina | undefined> => {
    if (!nombre.trim()) return
    const nueva = await crearMeta(
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
    if (nueva) setPlanPara(nueva)
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
  const soltarEnFila = (destino: Rutina) => {
    const r = arrastrada
    setArrastrada(null)
    if (!r || destino.id == null || r.id === destino.id) return
    if (r.padreId === destino.padreId) void moverMeta(metas, r, destino.padreId, destino.id)
    else if (puedeSoltarEn(metas, r, destino)) void moverMeta(metas, r, destino.id)
  }

  /** Soltar en el fondo de la lista: la meta sube al primer nivel. */
  const soltarEnRaiz = () => {
    const r = arrastrada
    setArrastrada(null)
    setEnRaiz(false)
    if (r && r.padreId != null) void moverMeta(metas, r, undefined)
  }

  const filtrando = busca.trim() !== '' || ocultarHechas

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pt-2">
        <span className="text-sm text-amber-400/80">
          <Icono nombre="objetivo" />
        </span>
        <p className="text-xs font-bold uppercase tracking-wider text-white/70">{t('cal.metas', 'Metas')}</p>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t('cal.cron.buscar', 'Buscar…')}
          className="w-28 rounded-lg border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] text-white/85 placeholder:text-white/25 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setOcultarHechas((v) => !v)}
          title={t('cal.cron.ocultarHechas', 'Ocultar las completadas')}
          className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition ${
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
          className="rounded-lg border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/45 transition hover:text-white/80 disabled:opacity-25"
        >
          {todoPlegado ? '▸▸' : '▾▾'}
        </button>

        {/* Qué se ve sobre el eje: tu cronograma, o uno de los planes propuestos
            encima de él. Uno a la vez: comparar tres a la vez no se lee. */}
        {planes.length > 0 && (
          <select
            value={planVisibleId ?? ''}
            onChange={(e) => setPlanVisibleId(e.target.value ? Number(e.target.value) : null)}
            title={t('cal.plan.vista', 'Qué cronograma ves')}
            className={`rounded-lg border bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold outline-none transition ${
              planVisible ? 'border-violet-400/50 text-violet-200' : 'border-white/10 text-white/45'
            }`}
          >
            <option value="">{t('cal.plan.real', 'Real')}</option>
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
                ✨ {p.nombre}
                {p.aceptadoEn ? ' ✓' : ''} · {metas.find((m) => m.id === p.metaId)?.nombre ?? '—'}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={irAHoy}
            className="rounded-lg border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/75 transition hover:bg-white/10"
          >
            {t('cal.hoy', 'Hoy')}
          </button>
          <button
            type="button"
            onClick={ajustar}
            disabled={rangos.length === 0}
            title={t('cal.cron.ajustarAyuda', 'Encuadrar todos los periodos')}
            className="rounded-lg border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/75 transition hover:bg-white/10 disabled:opacity-25"
          >
            {t('cal.cron.ajustar', 'Ajustar')}
          </button>
          <button
            type="button"
            onClick={() => setRejilla((v) => !v)}
            title={rejilla ? t('cal.cron.apagarRejilla', 'Apagar la rejilla') : t('cal.cron.encenderRejilla', 'Encender la rejilla')}
            className={`rounded-lg border p-1 text-[11px] transition ${
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
              className="w-6 rounded-md py-0.5 text-xs font-bold text-white/60 transition hover:bg-white/10 disabled:opacity-25"
            >
              −
            </button>
            <span className="w-16 truncate text-center text-[10px] font-semibold text-white/50">
              {t(`cal.cron.nivel.${NIVELES_ZOOM[nivel].clave}`, NIVELES_ZOOM[nivel].nombre)}
            </span>
            <button
              type="button"
              onClick={() => irANivel(nivel - 1)}
              disabled={nivel <= 0}
              title={t('cal.cron.acercar', 'Acercar')}
              className="w-6 rounded-md py-0.5 text-xs font-bold text-white/60 transition hover:bg-white/10 disabled:opacity-25"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
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
                  className={`${COL_ARBOL} ui-panel-2 relative sticky left-0 z-10 flex items-center border-r px-1 border-white/10 ${
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
                      aquí arriba sin más. Botón que revela el input al pulsarlo, mismo
                      patrón que "+ paso"/"+ nota" en FilaMeta. */}
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
                          placeholder={t('cal.metaPlaceholder', 'Agregar una meta…')}
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
                        className="rounded px-1.5 py-0.5 text-xs font-bold leading-none text-emerald-300/90 transition hover:bg-emerald-500/15 hover:text-emerald-200"
                      >
                        + {t('cal.meta.etiquetaMeta', 'meta')}
                      </button>
                    ))}
                </div>
                <div className="ui-panel-2 flex" style={{ width: ancho, height: ALTO_FILA_EJE }}>
                  {columnas.map((c, i) => (
                    <div
                      key={i}
                      style={{ width: c.ancho }}
                      className={`shrink-0 truncate border-r px-1 text-[9px] tabular-nums ${
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

          <div
            onDragOver={(e) => {
              if (!arrastrada || arrastrada.padreId == null) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setEnRaiz(true)
            }}
            onDragLeave={() => setEnRaiz(false)}
            onDrop={(e) => {
              if (!arrastrada || arrastrada.padreId == null) return
              e.preventDefault()
              soltarEnRaiz()
            }}
            className={enRaiz ? 'bg-emerald-500/5' : ''}
          >
            {/* Meta y barra son hermanas de la MISMA fila flex (ver el truco de
                layout de arriba): la fila de un plan reutiliza el envoltorio tal
                cual y solo cambia sus dos hijos. */}
            {filas.map((f) => (
              <div key={claveFila(f)} className={`flex ${rejilla ? 'border-b border-white/5' : ''}`}>
                <div
                  className={`${COL_ARBOL} ui-panel-2 sticky left-0 z-10 border-r border-white/10`}
                  style={{ minWidth: anchoArbol, maxWidth: anchoArbol }}
                >
                  {f.tipo === 'meta' && (
                    <FilaMeta
                      metas={metas}
                      meta={f.meta}
                      profundidad={f.profundidad}
                      abierta={f.meta.id == null || !plegados.has(f.meta.id)}
                      onPlegar={(a) => f.meta.id != null && plegar(f.meta.id, a)}
                      metaArmada={metaArmada}
                      onArmar={onArmar}
                      arrastrada={arrastrada}
                      onArrastrar={setArrastrada}
                      onSoltar={soltarEnFila}
                      onPlanIA={conIA ? setPlanPara : undefined}
                      sinArrastre={!!ambito}
                    />
                  )}
                  {f.tipo === 'planCabecera' && (
                    <CabeceraPlan
                      plan={f.plan}
                      metas={metas}
                      onAceptado={() => setPlanVisibleId(null)}
                      onBorrado={() => setPlanVisibleId(null)}
                    />
                  )}
                  {f.tipo === 'plan' && (
                    <FilaPlanNodo nodo={f.nodo} profundidad={f.profundidad} color={COLOR_PLAN} />
                  )}
                </div>

                {f.tipo === 'meta' ? (
                  <PistaMeta
                    metas={metas}
                    meta={f.meta}
                    ancho={ancho}
                    desde={desde}
                    pxPerDia={pxPerDia}
                    armada={metaArmada?.id === f.meta.id}
                    hoyIso={hoyIso}
                    onArmar={onArmar}
                  />
                ) : f.tipo === 'plan' ? (
                  <PistaPlan
                    rango={f.rango}
                    nombre={f.nodo.nombre}
                    color={COLOR_PLAN}
                    ancho={ancho}
                    desde={desde}
                    pxPerDia={pxPerDia}
                  />
                ) : (
                  <div style={{ width: ancho }} />
                )}
              </div>
            ))}

            {/* Un plan sobre una lista filtrada a cero sigue teniendo que verse. */}
            {base.length === 0 && !planVisible && (
              <div className="flex">
                <div
                  className={`${COL_ARBOL} ui-panel-2 sticky left-0 z-10 border-r border-white/10 py-2 text-center text-[10px] text-white/25`}
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

      {planPara && <PlanIAPanel meta={planPara} planes={planes} onCerrar={() => setPlanPara(null)} />}
    </div>
  )
}
