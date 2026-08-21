import { useMemo, useState } from 'react'
import type {
  ImagenEjercicio,
  SesionEjercicio,
  SerieFuerza,
  SistemaUnidades,
} from '../../core/data/db'
import { VACIO,
  gruposFuerzaRepo,
  rutinasFuerzaRepo,
  sesionesEjercicioRepo,
  seriesFuerzaRepo,
} from '../../core/data/repository'
import type { PlanDelDia } from './agenda'
import { TarjetaRutina } from './TarjetaRutina'
import { AutocompleteEjercicio } from './AutocompleteEjercicio'
import { CheckFila } from './CheckFila'
import { aGrupoCatalogo } from './catalogo'
import { CrearRutinaFuerza } from './CrearRutinaFuerza'
import { useFocoRegistro } from './focoRegistro'
import { nombreEjercicio, nombreRutina } from './nombres'
import { GraficaProgreso } from './GraficaProgreso'
import { HeatmapMensual } from './HeatmapMensual'
import { useImagenesPorClave } from './imagenIA'
import { MiniaturaEjercicio } from './MiniaturaEjercicio'
import { StatCard } from './ResistenciaTab'
import { FiltroPeriodo } from './FiltroPeriodo'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'
import { acento } from '../_shared/acento'
import { C_FUERZA, TIPOS } from './constantes'

// El color de la MODALIDAD (no el rosa de la app): cada pestaña pinta el suyo.
const COLOR_FUERZA = TIPOS.find((x) => x.id === 'fuerza')!.color
import { hoyISO, nombreFecha } from './fecha'
import { metaDelPeriodo, sesionesPeriodo, type Periodo } from './periodo'
import {
  minutosTipo,
  normalizarEjercicio,
  progresionEjercicio,
  recordsFuerza,
  sesionesTipo,
  volumenSerie,
  volumenSesion,
} from './stats'
import { fmtPeso, fmtVolumen, numPeso, pesoAKg, unidadPeso } from './unidades'
import { Archivador } from '../_shared/Archivador'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

interface FilaEjercicio {
  ejercicio: string
  series: string
  repeticiones: string
  /** Peso en la unidad que ve el usuario (kg o lb); a la base va siempre en kg. */
  peso: string
  /** Marcado como hecho durante el entreno: sin todos los checks no se guarda. */
  hecho?: boolean
}

const filaVacia = (): FilaEjercicio => ({
  ejercicio: '',
  series: '3',
  repeticiones: '10',
  peso: '',
})

const SUBS = [
  { id: 'catalogo', icono: 'cuarto-biblioteca', labelEs: 'Catálogo' },
  { id: 'rutinas', icono: 'lista', labelEs: 'Rutinas' },
  { id: 'progreso', icono: 'tendencia', labelEs: 'Progreso' },
] as const

type SubFuerza = (typeof SUBS)[number]['id']

/** Rutina que se carga en el formulario de registro. */
type RutinaCargable = { nombre: string; duracionMin: number; ejercicios?: string[] }

export function FuerzaTab({
  fecha,
  sesiones,
  todasSeries,
  planDia,
  metaMinutos,
  metaSesiones,
  unidades,
  periodo,
  setPeriodo,
}: {
  fecha: string
  sesiones: SesionEjercicio[]
  todasSeries: SerieFuerza[]
  planDia: PlanDelDia[]
  metaMinutos: number
  metaSesiones: number
  unidades: SistemaUnidades | undefined
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
}) {
  const t = useT()
  // Vacío = «sin tocar»: el nombre por defecto se resuelve al pintar, así sigue al
  // idioma (el diccionario llega perezoso, después del primer render).
  const tituloDefecto = t('ejercicio.fuerza.tituloDefecto', 'Entrenamiento de fuerza')

  const [sub, setSub] = useState<SubFuerza>('catalogo')
  const [rutinasAbierto, setRutinasAbierto] = useState(true)
  const [titulo, setTitulo] = useState('')
  const [duracion, setDuracion] = useState('45')
  const [nota, setNota] = useState('')
  const [rpe, setRpe] = useState('7')
  const [filas, setFilas] = useState<FilaEjercicio[]>([filaVacia(), filaVacia()])
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [ejercicioGrafica, setEjercicioGrafica] = useState('')

  const { refRegistro, irAlRegistro } = useFocoRegistro()

  const rutinasLista = rutinasFuerzaRepo.useAll() ?? VACIO
  const gruposFuerza = gruposFuerzaRepo.useAll() ?? VACIO
  const catalogoNombres = useMemo(() => aGrupoCatalogo(gruposFuerza), [gruposFuerza])
  const imgPorClave = useImagenesPorClave()

  // Al cambiar de día se descarta la edición en curso (ajuste en render, sin efecto)
  const [prevFecha, setPrevFecha] = useState(fecha)
  if (fecha !== prevFecha) {
    setPrevFecha(fecha)
    setEditandoId(null)
  }

  const delDia = sesiones.filter(
    (s) => s.fecha === fecha && s.tipo === 'fuerza',
  )
  const records = recordsFuerza(todasSeries)
  const todasFuerza = sesiones.filter((s) => s.tipo === 'fuerza')
  // El filtro Semana/Mes/Año/Todo recorta las estadísticas de Progreso.
  const fuerzaTotales = sesionesPeriodo(todasFuerza, periodo)
  const totalMinFuerza = minutosTipo(fuerzaTotales, 'fuerza')
  const totalSesFuerza = sesionesTipo(fuerzaTotales, 'fuerza')
  const metaMinPeriodo = metaDelPeriodo(metaMinutos, periodo, sesiones)
  const metaSesPeriodo = metaDelPeriodo(metaSesiones, periodo, sesiones)

  const fechaPorSesion = useMemo(
    () => new Map(sesiones.filter((s) => s.id).map((s) => [s.id!, s.fecha])),
    [sesiones],
  )

  // Nombres de ejercicio ya usados, del más reciente al más antiguo
  const recientes = useMemo(() => {
    const orden = [...todasSeries].sort((a, b) => {
      const fa = fechaPorSesion.get(a.sesionId) ?? ''
      const fb = fechaPorSesion.get(b.sesionId) ?? ''
      return fb.localeCompare(fa) || (b.id ?? 0) - (a.id ?? 0)
    })
    const vistos = new Set<string>()
    const res: string[] = []
    for (const s of orden) {
      const clave = normalizarEjercicio(s.ejercicio)
      if (!clave || vistos.has(clave)) continue
      vistos.add(clave)
      res.push(s.ejercicio)
    }
    return res
  }, [todasSeries, fechaPorSesion])

  const ultimaVez = (nombre: string): (SerieFuerza & { fecha: string }) | undefined => {
    const clave = normalizarEjercicio(nombre)
    if (!clave) return undefined
    const candidatas = todasSeries
      .filter(
        (s) =>
          normalizarEjercicio(s.ejercicio) === clave &&
          (editandoId === null || s.sesionId !== editandoId),
      )
      .map((s) => ({ ...s, fecha: fechaPorSesion.get(s.sesionId) ?? '' }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.id ?? 0) - (a.id ?? 0))
    // Se prefiere la última serie con peso registrado (más útil para precargar)
    return candidatas.find((s) => s.pesoKg > 0) ?? candidatas[0]
  }

  const seleccionGrafica = ejercicioGrafica || recientes[0] || ''
  const puntosGrafica = useMemo(
    () => progresionEjercicio(seleccionGrafica, todasSeries, fechaPorSesion).slice(-15),
    [seleccionGrafica, todasSeries, fechaPorSesion],
  )

  const actualizarFila = (i: number, patch: Partial<FilaEjercicio>) => {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))
  }

  // Fila precargada con series/reps/peso de la última vez que se hizo el ejercicio
  const filaConHistorial = (nombre: string): FilaEjercicio => {
    const prev = ultimaVez(nombre)
    return prev
      ? {
          ejercicio: nombre,
          series: String(prev.series),
          repeticiones: String(prev.repeticiones),
          peso: prev.pesoKg ? String(numPeso(prev.pesoKg, unidades)) : '',
        }
      : { ...filaVacia(), ejercicio: nombre }
  }

  // Carga una rutina en el formulario de registro de sesión
  const aplicarRutina = (r: RutinaCargable) => {
    setTitulo(r.nombre)
    setDuracion(String(r.duracionMin))
    if (r.ejercicios?.length) {
      setFilas(r.ejercicios.map(filaConHistorial))
    }
    if (sub !== 'rutinas') setSub('rutinas')
    irAlRegistro()
  }

  const usarProgramada = (p: PlanDelDia) => {
    const r = rutinasLista.find((x) => x.nombre === p.rutinaNombre)
    aplicarRutina(r ?? { nombre: p.rutinaNombre, duracionMin: p.duracionMin })
  }

  const agregarFila = () => setFilas((f) => [...f, filaVacia()])

  const cancelarEdicion = () => {
    setEditandoId(null)
    setTitulo('')
    setDuracion('45')
    setRpe('7')
    setNota('')
    setFilas([filaVacia(), filaVacia()])
  }

  const editarSesion = (s: SesionEjercicio) => {
    if (!s.id) return
    setEditandoId(s.id)
    setTitulo(s.titulo)
    setDuracion(String(s.duracionMin))
    setRpe(s.rpe ? String(s.rpe) : '')
    setNota(s.nota ?? '')
    const suyas = todasSeries
      .filter((x) => x.sesionId === s.id)
      .sort((a, b) => a.orden - b.orden)
    setFilas(
      suyas.length
        ? // Lo ya guardado se da por hecho: si no, no se podría volver a guardar.
          suyas.map((x) => ({
            ejercicio: x.ejercicio,
            series: String(x.series),
            repeticiones: String(x.repeticiones),
            peso: x.pesoKg ? String(numPeso(x.pesoKg, unidades)) : '',
            hecho: true,
          }))
        : [filaVacia(), filaVacia()],
    )
  }

  // El entreno solo se guarda cuando todos sus ejercicios están palomeados.
  const conNombre = filas.filter((f) => f.ejercicio.trim())
  const todoHecho = conNombre.length > 0 && conNombre.every((f) => f.hecho)

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const validas = filas.filter((f) => f.ejercicio.trim())
    if (validas.length === 0 || !todoHecho) return

    const seriesData = validas.map((f, i) => ({
      ejercicio: f.ejercicio.trim(),
      series: parseInt(f.series, 10) || 1,
      repeticiones: parseInt(f.repeticiones, 10) || 1,
      pesoKg: +pesoAKg(parseFloat(f.peso) || 0, unidades).toFixed(2),
      orden: i,
    }))
    const vol = seriesData.reduce((a, s) => a + volumenSerie(s), 0)
    const datos = {
      titulo: titulo.trim() || tituloDefecto,
      duracionMin: parseInt(duracion, 10) || 45,
      nota: nota.trim() || undefined,
      rpe: parseInt(rpe, 10) || undefined,
      volumenKg: Math.round(vol),
    }

    let sesionId: number
    if (editandoId !== null) {
      sesionId = editandoId
      await sesionesEjercicioRepo.update(editandoId, datos)
      const viejas = todasSeries.filter((s) => s.sesionId === editandoId)
      await Promise.all(viejas.map((s) => s.id && seriesFuerzaRepo.remove(s.id)))
    } else {
      sesionId = await sesionesEjercicioRepo.add({ fecha, tipo: 'fuerza', ...datos })
    }
    await seriesFuerzaRepo.bulkAdd(seriesData.map((s) => ({ ...s, sesionId })))

    cancelarEdicion()
  }

  return (
    <div className="space-y-5">
      <div data-tut="ejercicio.fuerza.subs">
        <PestanasCarpeta
          items={[...SUBS]}
          activo={sub}
          onCambio={setSub}
          prefijoClave="ejercicio.sub"
          color={COLOR_FUERZA}
          variante="sub"
        />
      </div>

      {planDia.length > 0 && (
        <div className="space-y-1.5">
          {planDia.map((p) => (
            <div
              key={p.rutinaId}
              className="flex items-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/25 px-3 py-2 text-sm"
            >
              <p className="flex-1 min-w-0 truncate">
                <span className="font-semibold text-orange-400">
                  <Icono nombre="calendario" /> {t('ejercicio.plan.dia', 'Plan del día')}
                  {p.hora ? ` · ${p.hora}` : ''}:
                </span>{' '}
                {nombreRutina(t, p.rutinaNombre)} · {p.duracionMin} min
              </p>
              <button
                type="button"
                onClick={() => usarProgramada(p)}
                className="ui-accent-bg shrink-0 rounded-lg px-3 py-1 text-xs font-bold"
                style={acento(C_FUERZA)}
              >
                {t('ejercicio.rutina.usar', 'Usar rutina')}
              </button>
            </div>
          ))}
        </div>
      )}

      {sub === 'catalogo' && <CrearRutinaFuerza />}

      {sub === 'rutinas' && (
        <>
          <div data-tut="ejercicio.fuerza.rutinas" className="rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setRutinasAbierto((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5"
            >
              <span className="text-base font-bold">
                <Icono nombre="lista" /> {t('ejercicio.rutinas.biblioteca', 'Mis rutinas')}{' '}
                <span className="text-white/40">({rutinasLista.length})</span>
              </span>
              <Icono nombre={rutinasAbierto ? 'subir' : 'bajar'} className="text-white/40" />
            </button>
            {rutinasAbierto && (
              <div className="space-y-2 px-3 pb-3">
                {rutinasLista.length === 0 && (
                  <p className="text-xs text-white/40">
                    {t('ejercicio.rutinas.vacio', 'No tienes rutinas. Créalas en Catálogo.')}
                  </p>
                )}
                {rutinasLista.map((r) => (
                  <TarjetaRutina
                    key={r.id ?? r.nombre}
                    rutina={r}
                    tipo="fuerza"
                    acento={{ color: C_FUERZA, hoverBorde: 'hover:border-orange-500/50' }}
                    imgPorClave={imgPorClave}
                    onUsar={() => aplicarRutina(r)}
                    onBorrar={() => r.id && rutinasFuerzaRepo.remove(r.id)}
                    hechoHoy={delDia.length > 0}
                  />
                ))}
              </div>
            )}
          </div>

          <div ref={refRegistro}>
            <SesionForm
              titulo={titulo || tituloDefecto}
              setTitulo={setTitulo}
              duracion={duracion}
              setDuracion={setDuracion}
              rpe={rpe}
              setRpe={setRpe}
              nota={nota}
              setNota={setNota}
              filas={filas}
              actualizarFila={actualizarFila}
              agregarFila={agregarFila}
              filaConHistorial={filaConHistorial}
              ultimaVez={ultimaVez}
              recientes={recientes}
              editandoId={editandoId}
              cancelarEdicion={cancelarEdicion}
              guardar={guardar}
              todoHecho={todoHecho}
              catalogoNombres={catalogoNombres}
              imgPorClave={imgPorClave}
              unidades={unidades}
            />
          </div>

          <ListaSesiones
            fecha={fecha}
            sesiones={todasFuerza}
            delDia={delDia}
            todasSeries={todasSeries}
            unidades={unidades}
            onEditar={editarSesion}
            onEliminar={async (id) => {
              if (editandoId === id) cancelarEdicion()
              const suyas = todasSeries.filter((s) => s.sesionId === id)
              await Promise.all(suyas.map((s) => s.id && seriesFuerzaRepo.remove(s.id)))
              await sesionesEjercicioRepo.remove(id)
            }}
          />
        </>
      )}

      {sub === 'progreso' && (
        <>
          <FiltroPeriodo valor={periodo} onChange={setPeriodo} color={COLOR_FUERZA} />
          <div data-tut="ejercicio.fuerza.progreso" className="grid grid-cols-2 gap-3">
            <HeatmapMensual sesiones={sesiones} tipo="fuerza" color="#f97316" />
            <div className="grid grid-rows-2 gap-3">
              <StatCard
                label={t('ejercicio.stats.minutos', 'Minutos totales')}
                valor={String(totalMinFuerza)}
                semana={totalMinFuerza}
                meta={metaMinPeriodo}
                rango={periodo}
                color="#f97316"
              />
              <StatCard
                label={t('ejercicio.stats.sesiones', 'Sesiones')}
                valor={String(totalSesFuerza)}
                semana={totalSesFuerza}
                meta={metaSesPeriodo}
                rango={periodo}
                color="#f97316"
              />
            </div>
          </div>
          {recientes.length === 0 ? (
          <p className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/40">
            {t(
              'ejercicio.progreso.vacio',
              'Registra entrenos de fuerza para ver tus records y progresión.',
            )}
          </p>
        ) : (
          <>
            <div data-tut="ejercicio.fuerza.progresion" className="rounded-xl bg-white/5 p-4 border border-white/10">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-base font-bold"><Icono nombre="tendencia" /> {t('ejercicio.progresion', 'Progresión')}</p>
                <select
                  value={seleccionGrafica}
                  onChange={(e) => setEjercicioGrafica(e.target.value)}
                  className="max-w-[55%] rounded-lg bg-black/30 border border-white/10 px-2 py-1 text-xs"
                >
                  {recientes.map((n) => (
                    <option key={n} value={n}>
                      {nombreEjercicio(t, n)}
                    </option>
                  ))}
                </select>
              </div>
              {puntosGrafica.length >= 2 ? (
                <>
                  <p className="mb-1 text-xs text-white/45">
                    {t('ejercicio.e1rm', '1RM estimado (Epley)')}:{' '}
                    <span className="font-semibold text-orange-400">
                      {fmtPeso(puntosGrafica[puntosGrafica.length - 1].valor, unidades, 0)}
                    </span>
                  </p>
                  <GraficaProgreso
                    puntos={puntosGrafica.map((p) => ({
                      ...p,
                      valor: numPeso(p.valor, unidades, 0),
                    }))}
                    color="#f97316"
                    unidad={unidadPeso(unidades)}
                  />
                </>
              ) : (
                <p className="text-xs text-white/40">
                  {t(
                    'ejercicio.progresion.pocosDatos',
                    'Registra este ejercicio con peso en al menos 2 sesiones para ver su progresión.',
                  )}
                </p>
              )}
            </div>

            {records.length > 0 && (
              <div data-tut="ejercicio.fuerza.records" className="rounded-xl bg-white/5 p-4 border border-white/10">
                <p className="text-base font-bold mb-2"><Icono nombre="trofeo" /> {t('ejercicio.records', 'Records personales')}</p>
                <ul className="space-y-2">
                  {records.slice(0, 6).map((r) => (
                    <li key={r.ejercicio} className="text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="truncate text-white/85">{nombreEjercicio(t, r.ejercicio)}</span>
                        <span className="shrink-0 font-semibold text-orange-400">
                          {r.pesoKg > 0
                            ? `${fmtPeso(r.pesoKg, unidades)} × ${r.repeticiones}`
                            : t('ejercicio.records.corporal', 'Peso corporal')}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/40">
                        {t('ejercicio.records.maxReps', 'Máx. reps')}: {r.maxReps}
                        {r.maxRepsPesoKg > 0 ? ` @ ${fmtPeso(r.maxRepsPesoKg, unidades)}` : ''}
                        {r.e1rmKg > 0
                          ? ` · ${t('ejercicio.records.e1rm', '1RM')} ${fmtPeso(r.e1rmKg, unidades, 0)}`
                          : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        </>
      )}
    </div>
  )
}

function SesionForm({
  titulo,
  setTitulo,
  duracion,
  setDuracion,
  rpe,
  setRpe,
  nota,
  setNota,
  filas,
  actualizarFila,
  agregarFila,
  filaConHistorial,
  ultimaVez,
  recientes,
  editandoId,
  cancelarEdicion,
  guardar,
  todoHecho,
  catalogoNombres,
  imgPorClave,
  unidades,
}: {
  titulo: string
  setTitulo: (v: string) => void
  duracion: string
  setDuracion: (v: string) => void
  rpe: string
  setRpe: (v: string) => void
  nota: string
  setNota: (v: string) => void
  filas: FilaEjercicio[]
  actualizarFila: (i: number, patch: Partial<FilaEjercicio>) => void
  agregarFila: () => void
  filaConHistorial: (nombre: string) => FilaEjercicio
  ultimaVez: (nombre: string) => (SerieFuerza & { fecha: string }) | undefined
  recientes: string[]
  editandoId: number | null
  cancelarEdicion: () => void
  guardar: (e: React.FormEvent) => void
  todoHecho: boolean
  catalogoNombres: ReturnType<typeof aGrupoCatalogo>
  imgPorClave: Map<string, ImagenEjercicio>
  unidades: SistemaUnidades | undefined
}) {
  const t = useT()
  return (
    <form
      onSubmit={guardar}
      className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
    >
      <p className="text-base font-bold">
        <Icono nombre={editandoId !== null ? 'editar' : 'tab-fuerza'} />{' '}
        {editandoId !== null
          ? t('ejercicio.fuerza.editando', 'Editando entreno')
          : t('ejercicio.fuerza.registrar', 'Registrar sesión de fuerza')}
      </p>
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
        placeholder={t('ejercicio.fuerza.ph.nombre', 'Nombre del entreno')}
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-white/70">
          {t('ejercicio.duracion', 'Duración (min)')}
          <input
            type="number"
            value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
            className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
          />
        </label>
        <label className="text-xs font-semibold text-white/70">
          {t('ejercicio.rpe', 'RPE (1–10)')}
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

      <div className="space-y-2">
        <p className="text-xs font-semibold text-white/50">{t('ejercicio.ejercicios', 'Ejercicios')}</p>
        {filas.map((f, i) => {
          const ult = ultimaVez(f.ejercicio)
          return (
            <div key={i} className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <CheckFila
                  hecho={!!f.hecho}
                  onToggle={() => actualizarFila(i, { hecho: !f.hecho })}
                  acento={C_FUERZA}
                />
                <MiniaturaEjercicio
                  nombre={f.ejercicio}
                  registro={imgPorClave.get(normalizarEjercicio(f.ejercicio))}
                  hoverBorde="hover:border-orange-500/50"
                  tamano="sm"
                />
                <div className="grid flex-1 grid-cols-12 gap-1 text-xs">
                  <AutocompleteEjercicio
                    className="col-span-5"
                    value={f.ejercicio}
                    onChange={(v) => actualizarFila(i, { ejercicio: v })}
                    onSelect={(nombre) => actualizarFila(i, filaConHistorial(nombre))}
                    grupos={catalogoNombres}
                    recientes={recientes}
                    placeholder={t('ejercicio.fuerza.ph.ej', 'Ejercicio')}
                  />
                  <input
                    value={f.series}
                    onChange={(e) => actualizarFila(i, { series: e.target.value })}
                    placeholder="S"
                    className="col-span-2 rounded-lg bg-black/30 px-1 py-1.5 border border-white/10 text-center"
                  />
                  <input
                    value={f.repeticiones}
                    onChange={(e) => actualizarFila(i, { repeticiones: e.target.value })}
                    placeholder="R"
                    className="col-span-2 rounded-lg bg-black/30 px-1 py-1.5 border border-white/10 text-center"
                  />
                  <input
                    value={f.peso}
                    onChange={(e) => actualizarFila(i, { peso: e.target.value })}
                    placeholder={unidadPeso(unidades)}
                    className="col-span-3 rounded-lg bg-black/30 px-1 py-1.5 border border-white/10 text-center"
                  />
                </div>
              </div>
              {ult && (
                <p className="ps-1 text-[10px] text-white/35">
                  {t('ejercicio.ultimaVez', 'Última vez')}: {ult.series}×{ult.repeticiones}
                  {ult.pesoKg ? ` @ ${fmtPeso(ult.pesoKg, unidades)}` : ''} · {ult.fecha.slice(8)}/
                  {ult.fecha.slice(5, 7)}
                </p>
              )}
            </div>
          )
        })}
        <button
          type="button"
          onClick={agregarFila}
          className="text-xs text-orange-400 hover:underline"
        >
          {t('ejercicio.fuerza.añadir', '+ Añadir ejercicio')}
        </button>
      </div>

      <input
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder={t('ejercicio.ph.notas.fuerza', 'Notas (progresión, sensaciones...)')}
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
          style={acento(C_FUERZA)}
        >
          {editandoId !== null
            ? t('ejercicio.actualizar', 'Actualizar sesión')
            : t('ejercicio.fuerza.guardar', 'Guardar entreno')}
        </button>
      </div>
      {!todoHecho && (
        <p className="text-center text-[10px] text-white/40">
          {t('ejercicio.checks.faltan', 'Marca todos los ejercicios para guardar el entreno.')}
        </p>
      )}
    </form>
  )
}

/** Historial completo de fuerza en carpetas año › mes › semana. */
function ListaSesiones({
  fecha,
  sesiones,
  delDia,
  todasSeries,
  unidades,
  onEditar,
  onEliminar,
}: {
  fecha: string
  sesiones: SesionEjercicio[]
  /** Las del día elegido: se resaltan dentro del archivador. */
  delDia: SesionEjercicio[]
  todasSeries: SerieFuerza[]
  unidades: SistemaUnidades | undefined
  onEditar: (s: SesionEjercicio) => void
  onEliminar: (id: number) => void
}) {
  const t = useT()
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
          const series = todasSeries
            .filter((x) => x.sesionId === s.id)
            .sort((a, b) => a.orden - b.orden)
          const vol = s.volumenKg ?? volumenSesion(series)
          return (
            <div
              className={`rounded-xl border px-3 py-2.5 text-sm ${
                idsDelDia.has(s.id)
                  ? 'bg-orange-500/10 border-orange-500/30'
                  : 'bg-black/20 border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate font-medium">{s.titulo}</span>
                <span className="shrink-0 text-xs text-white/40">{s.fecha.slice(5)}</span>
                <span className="shrink-0 text-white/40">{s.duracionMin} min</span>
                <button
                  type="button"
                  onClick={() => onEditar(s)}
                  title={t('ejercicio.editar', 'Editar')}
                  className="text-white/30 hover:text-orange-400"
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
              <p className="text-xs text-white/40 mt-1">
                {t('ejercicio.f.volumen', 'Volumen')} {fmtVolumen(vol, unidades)} · RPE {s.rpe ?? '—'}
              </p>
              <ul className="mt-1 text-xs text-white/55">
                {series.map((x) => (
                  <li key={x.id}>
                    {nombreEjercicio(t, x.ejercicio)}: {x.series}×{x.repeticiones} @ {fmtPeso(x.pesoKg, unidades)}
                  </li>
                ))}
              </ul>
            </div>
          )
        }}
      </Archivador>
    </div>
  )
}
