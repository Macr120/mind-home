import { useMemo, useState } from 'react'
import type { SesionEjercicio, SistemaUnidades, SplitCardio } from '../../core/data/db'
import { VACIO,
  gruposCardioRepo,
  rutinasCardioRepo,
  sesionesEjercicioRepo,
  splitsCardioRepo,
} from '../../core/data/repository'
import type { PlanDelDia } from './agenda'
import { TarjetaRutina } from './TarjetaRutina'
import { AutocompleteEjercicio } from './AutocompleteEjercicio'
import { CardioEnVivo } from './CardioEnVivo'
import { DialogoEstadisticas, RutaSvg } from './EstadisticasCardio'
import { CheckFila } from './CheckFila'
import { aGrupoCatalogo } from './catalogo'
import { CrearRutinaCardio } from './CrearRutinaCardio'
import { HeatmapMensual } from './HeatmapMensual'
import { useImagenesPorClave } from './imagenIA'
import { MiniaturaEjercicio } from './MiniaturaEjercicio'
import { FiltroPeriodo } from './FiltroPeriodo'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'
import { acento } from '../_shared/acento'
import { C_CARDIO, TIPOS } from './constantes'

// El color de la MODALIDAD (no el rosa de la app): cada pestaña pinta el suyo.
const COLOR_RESISTENCIA = TIPOS.find((x) => x.id === 'resistencia')!.color
import { hoyISO, nombreFecha } from './fecha'
import { metaDelPeriodo, sesionesPeriodo, type Periodo } from './periodo'
import {
  minutosTipo,
  normalizarEjercicio,
  sesionesTipo,
  statsResistencia,
} from './stats'
import {
  distanciaAKm,
  fmtDistancia,
  fmtRitmo,
  numDistancia,
  unidadDistancia,
} from './unidades'
import { Archivador } from '../_shared/Archivador'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

const SUBS_R = [
  { id: 'catalogo', icono: 'cuarto-biblioteca', labelEs: 'Catálogo' },
  { id: 'rutinas', icono: 'lista', labelEs: 'Rutinas' },
  { id: 'progreso', icono: 'tendencia', labelEs: 'Progreso' },
] as const

type SubResistencia = (typeof SUBS_R)[number]['id']


const TITULO_DEFECTO = 'Carrera'

/** Un tramo del formulario: actividad + minutos + distancia (la sesión es la suma). */
interface FilaCardio {
  actividad: string
  minutos: string
  /** Distancia en la unidad que ve el usuario (km o mi); a la base va en km. */
  dist: string
  /** Marcado como hecho durante el entreno: sin todos los checks no se guarda. */
  hecho?: boolean
}

const filaVacia = (): FilaCardio => ({ actividad: '', minutos: '30', dist: '' })

export function ResistenciaTab({
  fecha,
  sesiones,
  planDia,
  metaMinutos,
  metaSesiones,
  unidades,
  periodo,
  setPeriodo,
}: {
  fecha: string
  sesiones: SesionEjercicio[]
  planDia: PlanDelDia[]
  metaMinutos: number
  metaSesiones: number
  unidades: SistemaUnidades | undefined
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
}) {
  const [subR, setSubR] = useState<SubResistencia>('catalogo')
  const [titulo, setTitulo] = useState(TITULO_DEFECTO)
  const [filas, setFilas] = useState<FilaCardio[]>([{ ...filaVacia(), actividad: TITULO_DEFECTO }])
  const [ppm, setPpm] = useState('')
  const [rpe, setRpe] = useState('6')
  const [nota, setNota] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [rutinasAbierto, setRutinasAbierto] = useState(true)

  const rutinas = rutinasCardioRepo.useAll() ?? VACIO
  const gruposCardio = gruposCardioRepo.useAll() ?? VACIO
  const catalogoNombres = useMemo(() => aGrupoCatalogo(gruposCardio), [gruposCardio])
  const imgPorClave = useImagenesPorClave()
  const todosSplits = splitsCardioRepo.useAll() ?? VACIO

  // Al cambiar de día se descarta la edición en curso (ajuste en render, sin efecto)
  const [prevFecha, setPrevFecha] = useState(fecha)
  if (fecha !== prevFecha) {
    setPrevFecha(fecha)
    setEditandoId(null)
  }

  const todasCardio = sesiones.filter((s) => s.tipo === 'resistencia')
  const delDia = todasCardio.filter((s) => s.fecha === fecha)
  // El filtro Semana/Mes/Año/Todo recorta las estadísticas de Progreso.
  const delPeriodo = sesionesPeriodo(todasCardio, periodo)
  const stats = statsResistencia(delPeriodo)
  const totalMin = minutosTipo(delPeriodo, 'resistencia')
  const totalSes = sesionesTipo(delPeriodo, 'resistencia')
  const metaMinPeriodo = metaDelPeriodo(metaMinutos, periodo, sesiones)
  const metaSesPeriodo = metaDelPeriodo(metaSesiones, periodo, sesiones)

  const splitsPorSesion = useMemo(() => {
    const m = new Map<number, SplitCardio[]>()
    for (const s of todosSplits) {
      const lista = m.get(s.sesionId)
      if (lista) lista.push(s)
      else m.set(s.sesionId, [s])
    }
    for (const lista of m.values()) lista.sort((a, b) => a.orden - b.orden)
    return m
  }, [todosSplits])

  // La sesión es la suma de sus tramos (como los parciales de un triatlón).
  const sumaMin = filas.reduce(
    (a, f) => a + (f.actividad.trim() ? parseInt(f.minutos, 10) || 0 : 0),
    0,
  )
  const sumaDist = filas.reduce(
    (a, f) => a + (f.actividad.trim() ? parseFloat(f.dist) || 0 : 0),
    0,
  )

  // El entreno solo se guarda cuando todos sus tramos están palomeados.
  const conNombre = filas.filter((f) => f.actividad.trim())
  const todoHecho = conNombre.length > 0 && conNombre.every((f) => f.hecho)

  const recientes = useMemo(() => {
    const vistos = new Set<string>()
    const res: string[] = []
    for (const s of sesiones) {
      if (s.tipo !== 'resistencia') continue
      const clave = normalizarEjercicio(s.titulo)
      if (!clave || vistos.has(clave)) continue
      vistos.add(clave)
      res.push(s.titulo)
    }
    return res
  }, [sesiones])

  const actualizarFila = (i: number, patch: Partial<FilaCardio>) =>
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))

  const agregarFila = () => setFilas((f) => [...f, filaVacia()])

  const aplicarRutina = (r: { nombre: string; duracionMin: number; ejercicios?: string[] }) => {
    setTitulo(r.nombre)
    if (r.ejercicios?.length) {
      // Reparte la duración de la rutina entre sus tramos como punto de partida.
      const porTramo = Math.max(1, Math.round(r.duracionMin / r.ejercicios.length))
      setFilas(r.ejercicios.map((a) => ({ actividad: a, minutos: String(porTramo), dist: '' })))
    } else {
      setFilas([{ actividad: r.nombre, minutos: String(r.duracionMin), dist: '' }])
    }
    if (subR !== 'rutinas') setSubR('rutinas')
  }

  const usarProgramada = (p: PlanDelDia) => {
    const r = rutinas.find((x) => x.nombre === p.rutinaNombre)
    aplicarRutina(r ?? { nombre: p.rutinaNombre, duracionMin: p.duracionMin })
  }

  const editarSesion = (s: SesionEjercicio) => {
    if (!s.id) return
    setEditandoId(s.id)
    setTitulo(s.titulo)
    setPpm(s.ppmProm ? String(s.ppmProm) : '')
    setRpe(s.rpe ? String(s.rpe) : '')
    setNota(s.nota ?? '')
    const suyos = splitsPorSesion.get(s.id) ?? []
    // Lo ya guardado se da por hecho: si no, no se podría volver a guardar.
    setFilas(
      suyos.length
        ? suyos.map((x) => ({
            actividad: x.actividad,
            minutos: String(x.minutos),
            dist: x.km ? String(numDistancia(x.km, unidades)) : '',
            hecho: true,
          }))
        : // Sesión sin tramos (p. ej. grabada en vivo): se edita como un tramo único.
          [
            {
              actividad: s.titulo,
              minutos: String(s.duracionMin),
              dist: s.distanciaKm ? String(numDistancia(s.distanciaKm, unidades)) : '',
              hecho: true,
            },
          ],
    )
    setSubR('rutinas')
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setTitulo(TITULO_DEFECTO)
    setFilas([{ ...filaVacia(), actividad: TITULO_DEFECTO }])
    setPpm('')
    setRpe('6')
    setNota('')
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const validas = filas.filter((f) => f.actividad.trim())
    if (validas.length === 0 || sumaMin <= 0 || !todoHecho) return

    const sumaKm = distanciaAKm(sumaDist, unidades)
    const datos = {
      titulo: titulo.trim() || 'Cardio',
      duracionMin: sumaMin,
      distanciaKm: sumaKm > 0 ? +sumaKm.toFixed(2) : undefined,
      ppmProm: parseInt(ppm, 10) || undefined,
      rpe: parseInt(rpe, 10) || undefined,
      nota: nota.trim() || undefined,
    }

    let sesionId: number
    if (editandoId !== null) {
      sesionId = editandoId
      await sesionesEjercicioRepo.update(editandoId, datos)
      const viejos = todosSplits.filter((x) => x.sesionId === editandoId)
      await Promise.all(viejos.map((x) => x.id && splitsCardioRepo.remove(x.id)))
    } else {
      sesionId = await sesionesEjercicioRepo.add({ fecha, tipo: 'resistencia', ...datos })
    }
    await splitsCardioRepo.bulkAdd(
      validas.map((f, i) => ({
        sesionId,
        actividad: f.actividad.trim(),
        minutos: parseInt(f.minutos, 10) || 0,
        km: f.dist ? +distanciaAKm(parseFloat(f.dist) || 0, unidades).toFixed(3) : undefined,
        orden: i,
      })),
    )
    cancelarEdicion()
  }

  const t = useT()

  return (
    <div className="space-y-5">
      {planDia.length > 0 && (
        <div className="space-y-1.5">
          {planDia.map((p) => (
            <div
              key={p.rutinaId}
              className="flex items-center gap-2 rounded-xl bg-sky-500/10 border border-sky-500/25 px-3 py-2 text-sm"
            >
              <p className="flex-1 min-w-0 truncate">
                <span className="font-semibold text-sky-400">
                  <Icono nombre="calendario" /> {t('ejercicio.plan.dia', 'Plan del día')}
                  {p.hora ? ` · ${p.hora}` : ''}:
                </span>{' '}
                {p.rutinaNombre} · {p.duracionMin} min
              </p>
              <button
                type="button"
                onClick={() => usarProgramada(p)}
                className="ui-accent-bg shrink-0 rounded-lg px-3 py-1 text-xs font-bold"
                style={acento(C_CARDIO)}
              >
                {t('ejercicio.rutina.usar', 'Usar rutina')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div data-tut="ejercicio.resistencia.subs">
        <PestanasCarpeta
          items={[...SUBS_R]}
          activo={subR}
          onCambio={setSubR}
          prefijoClave="ejercicio.sub"
          color={COLOR_RESISTENCIA}
          variante="sub"
        />
      </div>

      {subR === 'catalogo' && <CrearRutinaCardio />}

      {subR === 'rutinas' && (
        <>
          <div data-tut="ejercicio.resistencia.rutinas" className="rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setRutinasAbierto((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5"
            >
              <span className="text-base font-bold">
                <Icono nombre="lista" /> {t('ejercicio.rutinas.biblioteca', 'Mis rutinas')}{' '}
                <span className="text-white/40">({rutinas.length})</span>
              </span>
              <Icono nombre={rutinasAbierto ? 'subir' : 'bajar'} className="text-white/40" />
            </button>
            {rutinasAbierto && (
              <div className="space-y-2 px-3 pb-3">
                {rutinas.length === 0 && (
                  <p className="text-xs text-white/40">
                    {t('ejercicio.rutinas.vacio', 'No tienes rutinas. Créalas en Catálogo.')}
                  </p>
                )}
                {rutinas.map((r) => (
                  <TarjetaRutina
                    key={r.id ?? r.nombre}
                    rutina={r}
                    tipo="resistencia"
                    acento={{ color: C_CARDIO, hoverBorde: 'hover:border-sky-500/50' }}
                    imgPorClave={imgPorClave}
                    onUsar={() => aplicarRutina(r)}
                    onBorrar={() => r.id && rutinasCardioRepo.remove(r.id)}
                    hechoHoy={delDia.length > 0}
                  />
                ))}
              </div>
            )}
          </div>

          {fecha === hoyISO() ? (
            <CardioEnVivo actividad={titulo} unidades={unidades} />
          ) : (
            <p className="rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-white/40">
              {t('ejercicio.vivo.soloHoy', 'El entrenamiento en vivo solo está disponible para hoy.')}
            </p>
          )}

          <form onSubmit={guardar} className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10">
            <p className="text-base font-bold">
              <Icono nombre={editandoId !== null ? 'editar' : 'tab-cardio'} />{' '}
              {editandoId !== null
                ? t('ejercicio.cardio.editando', 'Editando sesión de cardio')
                : t('ejercicio.cardio.registrar', 'Registrar cardio / resistencia')}
            </p>

            <label className="block text-xs font-semibold text-white/70">
              {t('ejercicio.cardio.titulo', 'Título de la actividad')}
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="mt-0.5 w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
                placeholder={t('ejercicio.cardio.ph.titulo', 'Título de la sesión')}
              />
            </label>

            <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
              <span className="text-xs font-semibold text-white/70">
                {t('ejercicio.cardio.suma', 'Suma de los tramos')}
              </span>
              <span className="text-base font-bold text-sky-400">
                {sumaMin} min
                {sumaDist > 0 ? ` · ${sumaDist.toFixed(2)} ${unidadDistancia(unidades)}` : ''}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-white/50">
                {t('ejercicio.cardio.tramos2', 'Tramos · actividad, minutos y distancia')}
              </p>
              {filas.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <CheckFila
                    hecho={!!f.hecho}
                    onToggle={() => actualizarFila(i, { hecho: !f.hecho })}
                    acento={C_CARDIO}
                  />
                  <MiniaturaEjercicio
                    nombre={f.actividad}
                    registro={imgPorClave.get(normalizarEjercicio(f.actividad))}
                    hoverBorde="hover:border-sky-500/50"
                    tamano="sm"
                  />
                  <div className="grid flex-1 grid-cols-12 gap-1 text-xs">
                    <AutocompleteEjercicio
                      className="col-span-6"
                      value={f.actividad}
                      onChange={(v) => actualizarFila(i, { actividad: v })}
                      onSelect={(nombre) => actualizarFila(i, { actividad: nombre })}
                      grupos={catalogoNombres}
                      recientes={recientes}
                      placeholder={t('ejercicio.cardio.ph.actividad', 'Actividad')}
                    />
                    <input
                      value={f.minutos}
                      onChange={(e) => actualizarFila(i, { minutos: e.target.value })}
                      placeholder={t('ejercicio.cardio.ph.min', 'min')}
                      className="col-span-3 rounded-lg bg-black/30 px-1 py-1.5 border border-white/10 text-center"
                    />
                    <input
                      value={f.dist}
                      onChange={(e) => actualizarFila(i, { dist: e.target.value })}
                      placeholder={unidadDistancia(unidades)}
                      className="col-span-3 rounded-lg bg-black/30 px-1 py-1.5 border border-white/10 text-center"
                    />
                  </div>
                </div>
              ))}
              <button type="button" onClick={agregarFila} className="text-xs text-sky-400 hover:underline">
                {t('ejercicio.cardio.anadirTramo', '+ Añadir tramo')}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-white/70">
                {t('ejercicio.ppm', 'PPM (opc.)')}
                <input
                  type="number"
                  value={ppm}
                  onChange={(e) => setPpm(e.target.value)}
                  className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
                />
              </label>
              <label className="text-xs font-semibold text-white/70">
                {t('ejercicio.rpe', 'RPE')}
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                  className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
                />
              </label>
            </div>
            <p className="text-[10px] text-white/35">
              {t('ejercicio.zonas', 'Zonas: RPE 1–4 recuperación · 5–6 aeróbico · 7–8 umbral · 9–10 máximo')}
            </p>
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={t('ejercicio.ph.notas.cardio', 'Notas (ritmo, pendiente, sensación...)')}
              className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
            />
            <div className="flex gap-2">
              {editandoId !== null && (
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="flex-1 rounded-xl py-2.5 font-bold bg-white/10 text-white/70"
                >
                  {t('ejercicio.cancelar', 'Cancelar')}
                </button>
              )}
              <button
                type="submit"
                disabled={!todoHecho}
                className="ui-accent-bg flex-1 rounded-xl py-2.5 font-bold disabled:cursor-not-allowed disabled:opacity-40"
                style={acento(C_CARDIO)}
              >
                {editandoId !== null
                  ? t('ejercicio.actualizar', 'Actualizar sesión')
                  : t('ejercicio.guardar', 'Guardar sesión')}
              </button>
            </div>
            {!todoHecho && (
              <p className="text-center text-[10px] text-white/40">
                {t('ejercicio.checks.faltan', 'Marca todos los ejercicios para guardar el entreno.')}
              </p>
            )}
          </form>

          <HistorialSesiones
            fecha={fecha}
            sesiones={todasCardio}
            delDia={delDia}
            color="text-sky-400"
            resaltado="bg-sky-500/10 border-sky-500/30"
            unidades={unidades}
            splitsPorSesion={splitsPorSesion}
            conEstadisticas
            onEditar={editarSesion}
            onEliminar={async (id) => {
              if (editandoId === id) cancelarEdicion()
              const suyos = todosSplits.filter((x) => x.sesionId === id)
              await Promise.all(suyos.map((x) => x.id && splitsCardioRepo.remove(x.id)))
              await sesionesEjercicioRepo.remove(id)
            }}
          />
        </>
      )}

      {subR === 'progreso' && (
        <>
          <FiltroPeriodo valor={periodo} onChange={setPeriodo} color={COLOR_RESISTENCIA} />
          <div data-tut="ejercicio.resistencia.progreso" className="grid grid-cols-2 gap-3">
            <HeatmapMensual sesiones={sesiones} tipo="resistencia" color="#38bdf8" />
            <div className="grid grid-rows-2 gap-3">
              <StatCard
                label={t('ejercicio.stats.minutos', 'Minutos totales')}
                valor={String(totalMin)}
                semana={totalMin}
                meta={metaMinPeriodo}
                rango={periodo}
                color="#38bdf8"
              />
              <StatCard
                label={t('ejercicio.stats.sesiones', 'Sesiones')}
                valor={String(totalSes)}
                semana={totalSes}
                meta={metaSesPeriodo}
                rango={periodo}
                color="#38bdf8"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label={t('ejercicio.stats.distancia', 'Distancia total')}
              valor={fmtDistancia(stats.totalKm, unidades)}
            />
            <StatCard
              label={t('ejercicio.stats.masLarga', 'Más larga')}
              valor={stats.masLarga > 0 ? fmtDistancia(stats.masLarga, unidades) : '—'}
            />
            <StatCard
              label={t('ejercicio.stats.mejorRitmo', 'Mejor ritmo')}
              valor={stats.mejorRitmo > 0 ? fmtRitmo(stats.mejorRitmo, 1, unidades) : '—'}
            />
          </div>
        </>
      )}
    </div>
  )
}

export function StatCard({
  label,
  valor,
  semana,
  meta,
  color,
  rango,
}: {
  label: string
  valor: string
  /** Valor del periodo elegido (para la barra de progreso vs meta). */
  semana?: number
  meta?: number
  color?: string
  /** Periodo al que corresponde la meta; sin él se asume la semana. */
  rango?: Periodo
}) {
  const t = useT()
  const conBarra = meta !== undefined && meta > 0
  const pct = conBarra ? Math.min(100, ((semana ?? 0) / meta) * 100) : 0
  const sufijo =
    rango && rango !== 'semana'
      ? `· ${t(`ejercicio.periodo.${rango}`, rango).toLowerCase()}`
      : t('ejercicio.r.porSemana', '· sem')
  return (
    <div className="flex flex-col justify-center rounded-xl bg-white/5 p-3 border border-white/10">
      <p className="text-xs font-semibold text-white/70">{label}</p>
      <p className="text-lg font-bold text-white/90">{valor}</p>
      {conBarra && (
        <div className="mt-1.5">
          <p className="text-[10px] text-white/45">
            {semana ?? 0} / {meta} {sufijo}
          </p>
          <div className="mt-0.5 h-1.5 w-full rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: color ?? '#888' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Historial completo de una modalidad en carpetas año › mes › semana.
 * Lo comparten Resistencia y Flexibilidad; las sesiones del día elegido se
 * resaltan para no perderlas de vista al cambiar de fecha.
 */
export function HistorialSesiones({
  fecha,
  sesiones,
  delDia,
  color,
  resaltado,
  unidades,
  splitsPorSesion,
  conEstadisticas,
  onEditar,
  onEliminar,
}: {
  fecha: string
  sesiones: SesionEjercicio[]
  delDia: SesionEjercicio[]
  color: string
  /** Clases de fondo/borde con las que se marcan las del día elegido. */
  resaltado: string
  unidades?: SistemaUnidades
  /** Solo resistencia: los tramos de cada sesión, para desglosarla. */
  splitsPorSesion?: Map<number, SplitCardio[]>
  /** Solo resistencia: botón para abrir la ficha de estadísticas de la sesión. */
  conEstadisticas?: boolean
  onEditar: (s: SesionEjercicio) => void
  onEliminar: (id: number) => void
}) {
  const t = useT()
  const [verStats, setVerStats] = useState<SesionEjercicio | null>(null)
  const idsDelDia = new Set(delDia.map((s) => s.id))
  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10">
      <p className="text-base font-bold mb-2">
        {t('ejercicio.historial', 'Tus sesiones')}{' '}
        <span className="text-xs font-normal text-white/40 capitalize">
          · {fecha === hoyISO() ? t('ejercicio.hoy', 'Hoy') : nombreFecha(fecha)}
        </span>
      </p>
      <Archivador
        items={sesiones}
        fecha={(s) => s.fecha}
        clave={(s) => s.id ?? s.fecha}
        vacio={t('ejercicio.sinEntrenos', 'Aún no hay entrenos registrados.')}
        resumen={(ses) => `${ses.reduce((acc, s) => acc + s.duracionMin, 0)} min`}
      >
        {(s) => {
          const splits = s.id ? (splitsPorSesion?.get(s.id) ?? []) : []
          return (
            <div
              className={`rounded-xl border px-3 py-2.5 text-sm ${
                idsDelDia.has(s.id) ? resaltado : 'bg-black/20 border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{s.titulo}</p>
                  <p className="text-xs text-white/40">
                    {s.fecha.slice(5)} · {s.duracionMin} min
                    {s.distanciaKm ? ` · ${fmtDistancia(s.distanciaKm, unidades, 2)}` : ''}
                    {s.distanciaKm ? ` · ${fmtRitmo(s.duracionMin, s.distanciaKm, unidades)}` : ''}
                    {s.ppmProm ? ` · ⌀${s.ppmProm} ppm` : ''}
                    {s.rpe ? ` · RPE ${s.rpe}` : ''}
                  </p>
                </div>
                {s.ruta && s.ruta.length > 1 && (
                  <RutaSvg puntos={s.ruta} color="#38bdf8" className="h-9 w-14 shrink-0" />
                )}
                <span className={`font-semibold ${color}`}>{s.duracionMin}′</span>
                {conEstadisticas && (
                  <button
                    type="button"
                    onClick={() => setVerStats(s)}
                    title={t('ejercicio.det.ver', 'Ver estadísticas')}
                    className="text-white/30 hover:text-sky-400"
                  >
                    <Icono nombre="tendencia" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onEditar(s)}
                  title={t('ejercicio.editar', 'Editar')}
                  className="text-white/30 hover:text-white/80"
                >
                  <Icono nombre="editar" />
                </button>
                <button
                  type="button"
                  onClick={() => s.id && onEliminar(s.id)}
                  className="text-white/30 hover:text-red-400"
                >
                  ×
                </button>
              </div>
              {splits.length > 1 && (
                <ul className="mt-1 text-xs text-white/55">
                  {splits.map((x) => (
                    <li key={x.id}>
                      {x.actividad}: {x.minutos} min
                      {x.km ? ` · ${fmtDistancia(x.km, unidades, 2)}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        }}
      </Archivador>
      {verStats && (
        <DialogoEstadisticas
          sesion={verStats}
          unidades={unidades}
          onCerrar={() => setVerStats(null)}
        />
      )}
    </div>
  )
}
