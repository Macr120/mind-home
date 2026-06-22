import { useRef, useState } from 'react'
import type { Rutina, EjecucionRutina } from '../data/db'
import { rutinasRepo, ejecucionesRutinaRepo } from '../data/repository'
import { getPlantilla } from '../registry'
import { fechaISO, hoyISO, tocaFecha, togglePaso, textoRepeticion } from '../rutinas'
import { useRutinasUI } from '../state/rutinasUiStore'
import { EditorRutina, rutinaNueva, COLORES_RUTINA } from './RutinasPanel'
import { useT } from '../i18n/useT'

/**
 * Calendario de rutinas (estilo Google Calendar, tema oscuro): vistas día /
 * semana / mes. En día/semana la rejilla es interactiva: clic+arrastre en un
 * hueco crea un evento con esa duración, los bloques se mueven con drag&drop
 * (cambian hora y día), se estiran desde el borde inferior, y un clic abre el
 * detalle con la checklist. Cada rutina tiene su color.
 */

type Vista = 'dia' | 'semana' | 'mes'

const DIA_MS = 86_400_000
const HORA_INI = 5
const HORA_FIN = 23
const ALTO_HORA = 44 // px por hora
const GUTTER = '3rem' // columna de etiquetas de hora
const SNAP = 15 // minutos (intervalo mínimo)
const TOTAL_MIN = (HORA_FIN - HORA_INI + 1) * 60

/** Lunes de la semana de una fecha (la semana se muestra L→D). */
function inicioSemana(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return new Date(x.getTime() - ((x.getDay() + 6) % 7) * DIA_MS)
}

const addDias = (d: Date, n: number) => new Date(d.getTime() + n * DIA_MS)

const aMin = (hhmm: string) => parseInt(hhmm.slice(0, 2)) * 60 + parseInt(hhmm.slice(3, 5))
const aHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** Minutos de inicio/fin del bloque de una rutina (fin por defecto: +60). */
function rangoMin(r: Rutina): { ini: number; fin: number } | null {
  if (!r.hora) return null
  const ini = aMin(r.hora)
  const fin = r.horaFin && aMin(r.horaFin) > ini ? aMin(r.horaFin) : ini + 60
  return { ini, fin }
}

/** Posición en columnas cuando varios eventos se traslapan (estilo Google Calendar). */
interface LayoutBloque {
  rutina: Rutina
  ini: number
  fin: number
  columna: number
  totalColumnas: number
}

function layoutBloquesDia(rutinas: Rutina[]): LayoutBloque[] {
  const items = rutinas
    .map((r) => {
      const rango = rangoMin(r)
      if (!rango) return null
      return { rutina: r, ini: rango.ini, fin: rango.fin }
    })
    .filter((x): x is { rutina: Rutina; ini: number; fin: number } => x != null)
    .sort((a, b) => a.ini - b.ini || b.fin - a.fin - (a.fin - a.ini))

  const result: LayoutBloque[] = []
  let cluster: typeof items = []
  let clusterFin = 0

  const asignarCluster = () => {
    if (cluster.length === 0) return
    const finPorCol: number[] = []
    const asignados: { item: (typeof items)[0]; columna: number }[] = []
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
      result.push({ rutina: item.rutina, ini: item.ini, fin: item.fin, columna, totalColumnas })
    }
    cluster = []
  }

  for (const item of items) {
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

function colorDe(r: Rutina): string {
  return r.color || COLORES_RUTINA[0]
}

/** Estado de una rutina en una fecha (colorea el bloque). */
function estadoEnFecha(r: Rutina, fecha: string, ejecuciones: EjecucionRutina[] | undefined) {
  if (r.pasos.length === 0) return 'normal' as const
  const e = ejecuciones?.find((x) => x.rutinaId === r.id && x.fecha === fecha)
  if (e && e.pasosHechos.length >= r.pasos.length) return 'completa' as const
  if (fecha === hoyISO()) return 'pendiente' as const
  return 'normal' as const
}

const SEMANA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

export function Calendario() {
  const t = useT()
  const abierto = useRutinasUI((s) => s.calendario)
  const cerrar = useRutinasUI((s) => s.cerrarCalendario)
  const [vista, setVista] = useState<Vista>('semana')
  const [fecha, setFecha] = useState(() => new Date())
  const [editando, setEditando] = useState<Rutina | null>(null)
  const [detalle, setDetalle] = useState<{ rutina: Rutina; fecha: string } | null>(null)
  const rutinas = rutinasRepo.useAll() ?? []
  const ejecuciones = ejecucionesRutinaRepo.useAll()

  if (!abierto) return null

  const navegar = (dir: -1 | 1) => {
    if (vista === 'dia') setFecha(addDias(fecha, dir))
    else if (vista === 'semana') setFecha(addDias(fecha, dir * 7))
    else setFecha(new Date(fecha.getFullYear(), fecha.getMonth() + dir, 1))
  }

  const titulo =
    vista === 'mes'
      ? fecha.toLocaleDateString('es', { month: 'long', year: 'numeric' })
      : vista === 'semana'
        ? `${inicioSemana(fecha).toLocaleDateString('es', { day: 'numeric', month: 'short' })} – ${addDias(inicioSemana(fecha), 6).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : fecha.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

  const vistas: { id: Vista; label: string }[] = [
    { id: 'dia', label: t('cal.dia', 'Día') },
    { id: 'semana', label: t('cal.semana', 'Semana') },
    { id: 'mes', label: t('cal.mes', 'Mes') },
  ]

  const abrirDia = (d: Date) => {
    setFecha(d)
    setVista('dia')
  }

  /** Crear desde la rejilla: día + rango arrastrado. */
  const crearEn = (d: Date, ini: number, fin: number) => {
    setEditando(
      rutinaNueva({
        hora: aHHMM(ini),
        horaFin: aHHMM(fin),
        dias: [d.getDay()],
        repeticion: 'semanal',
        fechaInicio: fechaISO(d),
      }),
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={cerrar}>
      <div
        className="flex h-[min(85vh,46rem)] w-[min(94vw,62rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12151c]/95 shadow-2xl backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <span className="text-lg">📅</span>
          <button
            type="button"
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
          <div className="flex rounded-lg border border-white/10 p-0.5">
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
            onClick={() => setEditando(rutinaNueva())}
            className="rounded-lg bg-emerald-500/90 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-emerald-400"
          >
            + {t('rutinas.nueva', 'Nueva')}
          </button>
          <button type="button" onClick={cerrar} className="px-1.5 text-white/40 transition hover:text-white/85" title={t('rutinas.cerrar', 'Cerrar')}>
            ✕
          </button>
        </div>

        {/* Cuerpo: el editor flota arriba; la rejilla sigue visible para cambiar vista sin cancelar */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {editando && (
            <div className="mx-auto mb-3 max-w-sm rounded-xl border border-white/10 bg-[#0f1115]/90 p-3 shadow-lg">
              <EditorRutina rutina={editando} onCerrar={() => setEditando(null)} />
            </div>
          )}
          {vista === 'mes' ? (
            <VistaMes fecha={fecha} rutinas={rutinas} ejecuciones={ejecuciones} onDia={abrirDia} />
          ) : (
            <RejillaTiempo
              dias={vista === 'semana' ? Array.from({ length: 7 }, (_, i) => addDias(inicioSemana(fecha), i)) : [fecha]}
              rutinas={rutinas}
              ejecuciones={ejecuciones}
              onDia={vista === 'semana' ? abrirDia : undefined}
              onDetalle={(rutina, f) => setDetalle({ rutina, fecha: f })}
              onCrear={crearEn}
            />
          )}
        </div>
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
    </div>
  )
}

// ---------- Rejilla interactiva (día y semana) ----------

/** Interacción de puntero en curso sobre la rejilla. */
type Gesto =
  | { tipo: 'crear'; col: number; ini: number; fin: number }
  | { tipo: 'mover'; rutina: Rutina; dur: number; agarre: number; col: number; ini: number; movio: boolean; colOrigen: number }
  | { tipo: 'estirar'; rutina: Rutina; col: number; ini: number; fin: number }

function RejillaTiempo({
  dias,
  rutinas,
  ejecuciones,
  onDia,
  onDetalle,
  onCrear,
}: {
  dias: Date[]
  rutinas: Rutina[]
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
        const ini = Math.max(HORA_INI * 60, Math.min(HORA_INI * 60 + TOTAL_MIN - actual.dur, min - actual.agarre))
        const movio = actual.movio || ini !== actual.ini || col !== actual.col
        actual = { ...actual, col, ini, movio }
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
        if (r.id != null) await rutinasRepo.update(r.id, cambios)
      } else {
        const r = actual.rutina
        if (r.id != null) await rutinasRepo.update(r.id, { horaFin: aHHMM(actual.fin) })
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
              <p className={`mx-auto grid h-6 w-6 place-items-center rounded-full text-sm font-bold ${esHoy ? 'bg-emerald-500 text-black' : 'text-white/80'}`}>
                {d.getDate()}
              </p>
            </>
          )
          return onDia ? (
            <button key={i} type="button" onClick={() => onDia(d)} className="text-center transition hover:bg-white/5">
              {contenido}
            </button>
          ) : (
            <div key={i} className="text-center">{contenido}</div>
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
                  {r.emoji} {r.nombre}
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

        {/* Bloques de rutina (escalonados si se traslapan) */}
        {dias.map((d, col) =>
          layoutBloquesDia(rutinas.filter((r) => tocaFecha(r, d) && r.hora)).map((bloque) => {
              const r = bloque.rutina
              const rango = { ini: bloque.ini, fin: bloque.fin }
              // Mientras se mueve/estira, el bloque sigue al puntero.
              const enGesto =
                gesto && gesto.tipo !== 'crear' && gesto.rutina.id === r.id
              const movEsta = enGesto && gesto.tipo === 'mover' && col === gesto.colOrigen
              // Guarda que SÍ estrecha el tipo a la variante 'mover' (gesto.movio existe).
              const moviendoEste = gesto?.tipo === 'mover' && gesto.movio && gesto.rutina.id === r.id
              if (movEsta && gesto.col !== col && gesto.movio) return null // se dibuja en la columna destino
              const ini = movEsta ? gesto.ini : enGesto && gesto.tipo === 'estirar' && col === gesto.col ? gesto.ini : rango.ini
              const fin = movEsta ? gesto.ini + gesto.dur : enGesto && gesto.tipo === 'estirar' && col === gesto.col ? gesto.fin : rango.fin
              const colRender = movEsta && gesto.movio ? gesto.col : col
              // Al mover, el bloque se colapsa a una sola columna (ancho completo).
              const subCol = moviendoEste ? 0 : bloque.columna
              const totalSub = moviendoEste ? 1 : bloque.totalColumnas
              const estado = estadoEnFecha(r, fechaISO(d), ejecuciones)
              const color = colorDe(r)
              return (
                <div
                  key={`${r.id}-${col}`}
                  data-bloque
                  onPointerDown={(e) => {
                    if (e.button !== 0) return
                    e.stopPropagation()
                    const { min } = localizar(e)
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const esBorde = e.clientY > rect.bottom - 8
                    if (esBorde) seguirGesto({ tipo: 'estirar', rutina: r, col, ini: rango.ini, fin: rango.fin })
                    else seguirGesto({ tipo: 'mover', rutina: r, dur: rango.fin - rango.ini, agarre: min - rango.ini, col, ini: rango.ini, movio: false, colOrigen: col })
                  }}
                  className={`absolute z-10 cursor-grab overflow-hidden rounded-md border px-1 py-0.5 text-[10px] leading-tight text-white/95 transition-[filter] hover:brightness-125 ${
                    estado === 'completa' ? 'opacity-60' : ''
                  } ${estado === 'pendiente' ? 'ring-1 ring-amber-400/80' : ''} ${enGesto ? 'cursor-grabbing brightness-125' : ''}`}
                  style={{
                    left: izquierdaBloque(colRender, subCol, totalSub),
                    width: anchoBloque(totalSub),
                    top: arriba(ini),
                    height: Math.max(18, ((fin - ini) / 60) * ALTO_HORA - 2),
                    backgroundColor: `${color}40`,
                    borderColor: `${color}aa`,
                  }}
                >
                  <p className="truncate font-semibold">
                    {estado === 'completa' ? '✓ ' : ''}{r.emoji} {r.nombre}
                  </p>
                  <p className="truncate tabular-nums opacity-70">
                    {aHHMM(ini)} – {aHHMM(fin)}
                  </p>
                  {/* Asa de estirar (borde inferior) */}
                  <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize" />
                </div>
              )
            }),
        )}

        {/* Fantasma de creación */}
        {gesto?.tipo === 'crear' && (
          <div
            className="pointer-events-none absolute z-20 rounded-md border-2 border-dashed border-emerald-400/70 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-100"
            style={{ left: izquierda(gesto.col), width: ancho, top: arriba(gesto.ini), height: ((gesto.fin - gesto.ini) / 60) * ALTO_HORA }}
          >
            {aHHMM(gesto.ini)} – {aHHMM(gesto.fin)} · {t('cal.nueva', 'nuevo evento')}
          </div>
        )}
      </div>
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
        className="w-80 rounded-2xl border bg-[#12151c]/95 p-3 shadow-2xl backdrop-blur-md"
        style={{ borderColor: `${color}66` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <p className="flex-1 truncate text-sm font-bold text-white/90">
            {rutina.emoji} {rutina.nombre}
          </p>
          <button type="button" onClick={onEditar} className="px-1 text-xs text-white/40 transition hover:text-white/85" title={t('rutinas.editar', 'Editar')}>
            ✏️
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
            🗑️
          </button>
          <button type="button" onClick={onCerrar} className="px-1 text-sm text-white/40 transition hover:text-white/85">
            ✕
          </button>
        </div>
        <p className="mb-2 text-[11px] capitalize text-white/45">
          {new Date(fecha + 'T12:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
          {rutina.hora && ` · ${rutina.hora}${rutina.horaFin ? ` – ${rutina.horaFin}` : ''}`}
        </p>
        <p className="mb-2 text-[10px] text-white/35">🔁 {textoRepeticion(rutina)}</p>
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
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${hecho ? 'border-emerald-400 bg-emerald-500/30 text-emerald-200' : 'border-white/25'}`}>
                  {hecho ? '✓' : ''}
                </span>
                <span className={`flex-1 truncate text-left text-xs text-white/80 ${hecho ? 'line-through opacity-50' : ''}`}>{p.titulo}</span>
                {p.esquemaId && <span className="text-[10px] text-amber-300/80">⚡</span>}
                <span className="text-xs opacity-60">{room?.icon}</span>
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

// ---------- Vista MES ----------

function VistaMes({
  fecha,
  rutinas,
  ejecuciones,
  onDia,
}: {
  fecha: Date
  rutinas: Rutina[]
  ejecuciones: EjecucionRutina[] | undefined
  onDia: (d: Date) => void
}) {
  const primero = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const inicio = inicioSemana(primero)
  const hoy = hoyISO()
  const celdas = Array.from({ length: 42 }, (_, i) => addDias(inicio, i))

  return (
    <div className="grid h-full grid-rows-[auto_repeat(6,1fr)] gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
      <div className="grid grid-cols-7 gap-px">
        {SEMANA.map((d) => (
          <div key={d} className="bg-[#12151c] px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-white/40">
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
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onDia(d)}
                className={`flex min-h-0 flex-col items-stretch gap-0.5 overflow-hidden bg-[#12151c] p-1 text-left transition hover:bg-white/5 ${esMes ? '' : 'opacity-40'}`}
              >
                <span className={`mb-0.5 grid h-5 w-5 place-items-center self-start rounded-full text-[11px] font-bold ${esHoy ? 'bg-emerald-500 text-black' : 'text-white/60'}`}>
                  {d.getDate()}
                </span>
                {delDia.slice(0, 3).map((r) => {
                  const completa = estadoEnFecha(r, iso, ejecuciones) === 'completa'
                  return (
                    <span
                      key={r.id}
                      className={`truncate rounded border px-1 text-[10px] leading-4 text-white/90 ${completa ? 'opacity-60' : ''}`}
                      style={{ backgroundColor: `${colorDe(r)}33`, borderColor: `${colorDe(r)}66` }}
                    >
                      {completa ? '✓ ' : ''}{r.emoji} {r.nombre}
                    </span>
                  )
                })}
                {delDia.length > 3 && <span className="px-1 text-[9px] text-white/35">+{delDia.length - 3}</span>}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
