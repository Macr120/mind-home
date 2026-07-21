import { useMemo, useState } from 'react'
import type { ImagenEjercicio, SesionEjercicio, SerieFuerza } from '../../core/data/db'
import {
  gruposFuerzaRepo,
  rutinasFuerzaRepo,
  sesionesEjercicioRepo,
  seriesFuerzaRepo,
} from '../../core/data/repository'
import type { PlanDelDia } from './agenda'
import { TarjetaRutina } from './TarjetaRutina'
import { AutocompleteEjercicio } from './AutocompleteEjercicio'
import { aGrupoCatalogo } from './catalogo'
import { CrearRutinaFuerza } from './CrearRutinaFuerza'
import { GraficaProgreso } from './GraficaProgreso'
import { HeatmapMensual } from './HeatmapMensual'
import { useImagenesPorClave } from './imagenIA'
import { MiniaturaEjercicio } from './MiniaturaEjercicio'
import { StatCard } from './ResistenciaTab'
import { hoyISO, nombreFecha } from './fecha'
import {
  minutosTipo,
  normalizarEjercicio,
  progresionEjercicio,
  recordsFuerza,
  sesionesSemana,
  sesionesTipo,
  volumenSerie,
  volumenSesion,
} from './stats'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

interface FilaEjercicio {
  ejercicio: string
  series: string
  repeticiones: string
  pesoKg: string
}

const filaVacia = (): FilaEjercicio => ({
  ejercicio: '',
  series: '3',
  repeticiones: '10',
  pesoKg: '',
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
}: {
  fecha: string
  sesiones: SesionEjercicio[]
  todasSeries: SerieFuerza[]
  planDia: PlanDelDia[]
  metaMinutos: number
  metaSesiones: number
}) {
  const [sub, setSub] = useState<SubFuerza>('catalogo')
  const [rutinasAbierto, setRutinasAbierto] = useState(true)
  const [titulo, setTitulo] = useState('Entrenamiento de fuerza')
  const [duracion, setDuracion] = useState('45')
  const [nota, setNota] = useState('')
  const [rpe, setRpe] = useState('7')
  const [filas, setFilas] = useState<FilaEjercicio[]>([filaVacia(), filaVacia()])
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [ejercicioGrafica, setEjercicioGrafica] = useState('')

  const rutinasLista = rutinasFuerzaRepo.useAll() ?? []
  const gruposFuerza = gruposFuerzaRepo.useAll() ?? []
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
  const fuerzaTotales = sesiones.filter((s) => s.tipo === 'fuerza')
  const totalMinFuerza = fuerzaTotales.reduce((a, s) => a + s.duracionMin, 0)
  const semanaF = sesionesSemana(sesiones)
  const semanaMinFuerza = minutosTipo(semanaF, 'fuerza')
  const semanaSesFuerza = sesionesTipo(semanaF, 'fuerza')

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
          pesoKg: prev.pesoKg ? String(prev.pesoKg) : '',
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
  }

  const usarProgramada = (p: PlanDelDia) => {
    const r = rutinasLista.find((x) => x.nombre === p.rutinaNombre)
    aplicarRutina(r ?? { nombre: p.rutinaNombre, duracionMin: p.duracionMin })
  }

  const agregarFila = () => setFilas((f) => [...f, filaVacia()])

  const cancelarEdicion = () => {
    setEditandoId(null)
    setTitulo('Entrenamiento de fuerza')
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
        ? suyas.map((x) => ({
            ejercicio: x.ejercicio,
            series: String(x.series),
            repeticiones: String(x.repeticiones),
            pesoKg: x.pesoKg ? String(x.pesoKg) : '',
          }))
        : [filaVacia(), filaVacia()],
    )
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const validas = filas.filter((f) => f.ejercicio.trim())
    if (validas.length === 0) return

    const seriesData = validas.map((f, i) => ({
      ejercicio: f.ejercicio.trim(),
      series: parseInt(f.series, 10) || 1,
      repeticiones: parseInt(f.repeticiones, 10) || 1,
      pesoKg: parseFloat(f.pesoKg) || 0,
      orden: i,
    }))
    const vol = seriesData.reduce((a, s) => a + volumenSerie(s), 0)
    const datos = {
      titulo: titulo.trim() || 'Fuerza',
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

  const t = useT()

  return (
    <div className="space-y-5">
      <div data-tut="ejercicio.fuerza.subs" className="flex gap-1.5">
        {SUBS.map((s) => (
          <button
            key={s.id}
            type="button"
            data-tut={`ejercicio.sub.${s.id}`}
            onClick={() => setSub(s.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold ${
              sub === s.id
                ? 'bg-orange-500/25 text-orange-400 border border-orange-500/40'
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
            }`}
          >
            <Icono nombre={s.icono} /> {t(`ejercicio.sub.${s.id}`, s.labelEs)}
          </button>
        ))}
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
                {p.rutinaNombre} · {p.duracionMin} min
              </p>
              <button
                type="button"
                onClick={() => usarProgramada(p)}
                className="shrink-0 rounded-lg bg-orange-600 px-3 py-1 text-xs font-bold texto-cta"
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
                    acento={{ boton: 'bg-orange-600', hoverBorde: 'hover:border-orange-500/50' }}
                    imgPorClave={imgPorClave}
                    onUsar={() => aplicarRutina(r)}
                    onBorrar={() => r.id && rutinasFuerzaRepo.remove(r.id)}
                    hechoHoy={delDia.length > 0}
                  />
                ))}
              </div>
            )}
          </div>

          <SesionForm
            titulo={titulo}
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
            catalogoNombres={catalogoNombres}
            imgPorClave={imgPorClave}
          />

          <ListaSesiones
            fecha={fecha}
            sesiones={delDia}
            todasSeries={todasSeries}
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
          <div className="grid grid-cols-2 gap-3">
            <HeatmapMensual sesiones={sesiones} tipo="fuerza" color="#f97316" />
            <div className="grid grid-rows-2 gap-3">
              <StatCard
                label={t('ejercicio.stats.minutos', 'Minutos totales')}
                valor={String(totalMinFuerza)}
                semana={semanaMinFuerza}
                meta={metaMinutos}
                color="#f97316"
              />
              <StatCard
                label={t('ejercicio.stats.sesiones', 'Sesiones')}
                valor={String(fuerzaTotales.length)}
                semana={semanaSesFuerza}
                meta={metaSesiones}
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
            <div className="rounded-xl bg-white/5 p-4 border border-white/10">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-base font-bold"><Icono nombre="tendencia" /> {t('ejercicio.progresion', 'Progresión')}</p>
                <select
                  value={seleccionGrafica}
                  onChange={(e) => setEjercicioGrafica(e.target.value)}
                  className="max-w-[55%] rounded-lg bg-black/30 border border-white/10 px-2 py-1 text-xs"
                >
                  {recientes.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              {puntosGrafica.length >= 2 ? (
                <>
                  <p className="mb-1 text-xs text-white/45">
                    {t('ejercicio.e1rm', '1RM estimado (Epley)')}:{' '}
                    <span className="font-semibold text-orange-400">
                      {Math.round(puntosGrafica[puntosGrafica.length - 1].valor)} kg
                    </span>
                  </p>
                  <GraficaProgreso puntos={puntosGrafica} color="#f97316" />
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
              <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                <p className="text-base font-bold mb-2"><Icono nombre="trofeo" /> {t('ejercicio.records', 'Records personales')}</p>
                <ul className="space-y-1.5">
                  {records.slice(0, 6).map((r) => (
                    <li key={r.ejercicio} className="flex justify-between text-sm">
                      <span className="text-white/85">{r.ejercicio}</span>
                      <span className="font-semibold text-orange-400">
                        {r.pesoKg > 0 ? `${r.pesoKg} kg × ${r.repeticiones}` : `${r.repeticiones} reps`}
                      </span>
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
  catalogoNombres,
  imgPorClave,
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
  catalogoNombres: ReturnType<typeof aGrupoCatalogo>
  imgPorClave: Map<string, ImagenEjercicio>
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
                    value={f.pesoKg}
                    onChange={(e) => actualizarFila(i, { pesoKg: e.target.value })}
                    placeholder="kg"
                    className="col-span-3 rounded-lg bg-black/30 px-1 py-1.5 border border-white/10 text-center"
                  />
                </div>
              </div>
              {ult && (
                <p className="pl-1 text-[10px] text-white/35">
                  {t('ejercicio.ultimaVez', 'Última vez')}: {ult.series}×{ult.repeticiones}
                  {ult.pesoKg ? ` @ ${ult.pesoKg} kg` : ''} · {ult.fecha.slice(8)}/{ult.fecha.slice(5, 7)}
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
          className="flex-1 rounded-xl py-2.5 font-bold bg-orange-600 texto-cta"
        >
          {editandoId !== null
            ? t('ejercicio.actualizar', 'Actualizar sesión')
            : t('ejercicio.fuerza.guardar', 'Guardar entreno')}
        </button>
      </div>
    </form>
  )
}

function ListaSesiones({
  fecha,
  sesiones,
  todasSeries,
  onEditar,
  onEliminar,
}: {
  fecha: string
  sesiones: SesionEjercicio[]
  todasSeries: SerieFuerza[]
  onEditar: (s: SesionEjercicio) => void
  onEliminar: (id: number) => void
}) {
  const t = useT()
  if (sesiones.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-base font-bold capitalize">
        {fecha === hoyISO() ? t('ejercicio.hoy', 'Hoy') : nombreFecha(fecha)}
      </p>
      {sesiones.map((s) => {
        const series = todasSeries
          .filter((x) => x.sesionId === s.id)
          .sort((a, b) => a.orden - b.orden)
        const vol = s.volumenKg ?? volumenSesion(series)
        return (
          <div
            key={s.id}
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="flex-1 font-medium">{s.titulo}</span>
              <span className="text-white/40">{s.duracionMin} min</span>
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
              {t('ejercicio.f.volumen', 'Volumen')} {vol.toLocaleString()} kg · RPE {s.rpe ?? '—'}
            </p>
            <ul className="mt-1 text-xs text-white/55">
              {series.map((x) => (
                <li key={x.id}>
                  {x.ejercicio}: {x.series}×{x.repeticiones} @ {x.pesoKg} kg
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
