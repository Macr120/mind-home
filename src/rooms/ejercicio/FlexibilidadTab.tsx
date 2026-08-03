import { useMemo, useState } from 'react'
import type { RutinaFlex, SerieFlex, SesionEjercicio } from '../../core/data/db'
import { VACIO,
  gruposFlexRepo,
  rutinasFlexRepo,
  seriesFlexRepo,
  sesionesEjercicioRepo,
} from '../../core/data/repository'
import type { PlanDelDia } from './agenda'
import { TarjetaRutina } from './TarjetaRutina'
import { AutocompleteEjercicio } from './AutocompleteEjercicio'
import { CheckFila } from './CheckFila'
import { aGrupoCatalogo } from './catalogo'
import { CrearRutinaFlex } from './CrearRutinaFlex'
import { HeatmapMensual } from './HeatmapMensual'
import { useImagenesPorClave } from './imagenIA'
import { MiniaturaEjercicio } from './MiniaturaEjercicio'
import { ReproductorFlex } from './ReproductorFlex'
import { Timer } from './Timer'
import { minutosTipo, normalizarEjercicio, sesionesTipo } from './stats'
import { FiltroPeriodo } from './FiltroPeriodo'
import { metaDelPeriodo, sesionesPeriodo, type Periodo } from './periodo'
import { HistorialSesiones, StatCard } from './ResistenciaTab'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

const SUBS_F = [
  { id: 'catalogo', icono: 'cuarto-biblioteca', labelEs: 'Catálogo' },
  { id: 'rutinas', icono: 'lista', labelEs: 'Rutinas' },
  { id: 'progreso', icono: 'tendencia', labelEs: 'Progreso' },
] as const

type SubFlex = (typeof SUBS_F)[number]['id']


interface FilaFlex {
  ejercicio: string
  segundos: string
  repeticiones: string
  /** Marcado como hecho durante la sesión (no se guarda, solo apoyo visual). */
  hecho?: boolean
}

const filaVacia = (): FilaFlex => ({ ejercicio: '', segundos: '30', repeticiones: '3' })

export function FlexibilidadTab({
  fecha,
  sesiones,
  planDia,
  todasSeriesFlex,
  metaMinutos,
  metaSesiones,
  periodo,
  setPeriodo,
}: {
  fecha: string
  sesiones: SesionEjercicio[]
  planDia: PlanDelDia[]
  todasSeriesFlex: SerieFlex[]
  metaMinutos: number
  metaSesiones: number
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
}) {
  const gruposFlex = gruposFlexRepo.useAll() ?? VACIO
  const catalogoNombres = useMemo(() => aGrupoCatalogo(gruposFlex), [gruposFlex])
  const imgPorClave = useImagenesPorClave()

  const [subF, setSubF] = useState<SubFlex>('catalogo')
  const [titulo, setTitulo] = useState('Sesión de movilidad')
  const [enfoque, setEnfoque] = useState(catalogoNombres[0]?.label ?? '')
  const [filas, setFilas] = useState<FilaFlex[]>([filaVacia(), filaVacia()])
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [rutinasAbierto, setRutinasAbierto] = useState(true)
  const [timerSeg, setTimerSeg] = useState(30)
  const [timerNonce, setTimerNonce] = useState(0)
  // Rutina que se está reproduciendo en el modo guiado (imagen + contador).
  const [rutinaFlexActiva, setRutinaFlexActiva] = useState<RutinaFlex | null>(null)

  const rutinas = rutinasFlexRepo.useAll() ?? VACIO

  // Al cambiar de día se descarta la edición en curso (ajuste en render, sin efecto)
  const [prevFecha, setPrevFecha] = useState(fecha)
  if (fecha !== prevFecha) {
    setPrevFecha(fecha)
    setEditandoId(null)
  }

  const todasFlex = sesiones.filter((s) => s.tipo === 'flexibilidad')
  const delDia = todasFlex.filter((s) => s.fecha === fecha)
  // El filtro Semana/Mes/Año/Todo recorta las estadísticas de Progreso.
  const flexTotales = sesionesPeriodo(todasFlex, periodo)
  const totalMin = minutosTipo(flexTotales, 'flexibilidad')
  const totalSes = sesionesTipo(flexTotales, 'flexibilidad')
  const metaMinPeriodo = metaDelPeriodo(metaMinutos, periodo, sesiones)
  const metaSesPeriodo = metaDelPeriodo(metaSesiones, periodo, sesiones)

  // "Suma de los ejercicios": tiempo total = Σ(segundos × repeticiones) de las posturas con nombre.
  const sumaSeg = filas.reduce(
    (acc, f) =>
      acc +
      (f.ejercicio.trim() ? (parseInt(f.segundos, 10) || 0) * (parseInt(f.repeticiones, 10) || 0) : 0),
    0,
  )
  const fmtSuma = `${Math.floor(sumaSeg / 60)}:${String(sumaSeg % 60).padStart(2, '0')}`

  // La sesión solo se guarda cuando todas sus posturas están palomeadas.
  const conNombre = filas.filter((f) => f.ejercicio.trim())
  const todoHecho = conNombre.length > 0 && conNombre.every((f) => f.hecho)

  const recientes = useMemo(() => {
    const vistos = new Set<string>()
    const res: string[] = []
    for (const s of sesiones) {
      if (s.tipo !== 'flexibilidad') continue
      const clave = normalizarEjercicio(s.titulo)
      if (!clave || vistos.has(clave)) continue
      vistos.add(clave)
      res.push(s.titulo)
    }
    return res
  }, [sesiones])

  const cargarTimer = (seg: number) => {
    setTimerSeg(seg > 0 ? seg : 30)
    setTimerNonce((n) => n + 1)
  }

  const actualizarFila = (i: number, patch: Partial<FilaFlex>) =>
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))

  const agregarFila = () => setFilas((f) => [...f, filaVacia()])

  const filasDeRutina = (nombres: string[]): FilaFlex[] =>
    nombres.map((n) => ({ ejercicio: n, segundos: '30', repeticiones: '3' }))

  const aplicarRutina = (
    r: Pick<RutinaFlex, 'nombre'> & Partial<Pick<RutinaFlex, 'enfoque' | 'ejercicios'>>,
  ) => {
    setTitulo(r.nombre)
    if (r.enfoque) setEnfoque(r.enfoque)
    if (r.ejercicios?.length) setFilas(filasDeRutina(r.ejercicios))
    if (subF !== 'rutinas') setSubF('rutinas')
  }

  const usarProgramada = (p: PlanDelDia) => {
    const r = rutinas.find((x) => x.nombre === p.rutinaNombre)
    aplicarRutina(r ?? { nombre: p.rutinaNombre })
  }

  const editarSesion = (s: SesionEjercicio) => {
    if (!s.id) return
    setEditandoId(s.id)
    setTitulo(s.titulo)
    if (s.enfoque) setEnfoque(s.enfoque)
    const suyas = todasSeriesFlex
      .filter((x) => x.sesionId === s.id)
      .sort((a, b) => a.orden - b.orden)
    // Lo ya guardado se da por hecho: si no, no se podría volver a guardar.
    setFilas(
      suyas.length
        ? suyas.map((x) => ({
            ejercicio: x.ejercicio,
            segundos: String(x.segundos),
            repeticiones: String(x.repeticiones),
            hecho: true,
          }))
        : [filaVacia(), filaVacia()],
    )
    setSubF('rutinas')
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setTitulo('Sesión de movilidad')
    setEnfoque(catalogoNombres[0]?.label ?? '')
    setFilas([filaVacia(), filaVacia()])
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    // La duración de la sesión es la suma de tiempo de las posturas.
    const mins = sumaSeg > 0 ? Math.max(1, Math.round(sumaSeg / 60)) : 0
    if (!mins || !todoHecho) return
    const datos = {
      titulo: titulo.trim() || 'Flexibilidad',
      duracionMin: mins,
      enfoque,
    }
    const validas = filas.filter((f) => f.ejercicio.trim())
    const posturas = validas.map((f, i) => ({
      ejercicio: f.ejercicio.trim(),
      segundos: parseInt(f.segundos, 10) || 0,
      repeticiones: parseInt(f.repeticiones, 10) || 1,
      orden: i,
    }))

    let sesionId: number
    if (editandoId !== null) {
      sesionId = editandoId
      await sesionesEjercicioRepo.update(editandoId, datos)
      const viejas = todasSeriesFlex.filter((x) => x.sesionId === editandoId)
      await Promise.all(viejas.map((x) => x.id && seriesFlexRepo.remove(x.id)))
    } else {
      sesionId = await sesionesEjercicioRepo.add({ fecha, tipo: 'flexibilidad', ...datos })
    }
    if (posturas.length) {
      await seriesFlexRepo.bulkAdd(posturas.map((p) => ({ ...p, sesionId })))
    }
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
              className="flex items-center gap-2 rounded-xl bg-violet-500/10 border border-violet-500/25 px-3 py-2 text-sm"
            >
              <p className="flex-1 min-w-0 truncate">
                <span className="font-semibold text-violet-400">
                  <Icono nombre="calendario" /> {t('ejercicio.plan.dia', 'Plan del día')}
                  {p.hora ? ` · ${p.hora}` : ''}:
                </span>{' '}
                {p.rutinaNombre} · {p.duracionMin} min
              </p>
              <button
                type="button"
                onClick={() => usarProgramada(p)}
                className="shrink-0 rounded-lg bg-violet-600 px-3 py-1 text-xs font-bold texto-cta"
              >
                {t('ejercicio.rutina.usar', 'Usar rutina')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div data-tut="ejercicio.flex.subs" className="flex gap-1.5">
        {SUBS_F.map((s) => (
          <button
            key={s.id}
            type="button"
            data-tut={`ejercicio.sub.${s.id}`}
            onClick={() => setSubF(s.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold ${
              subF === s.id
                ? 'bg-violet-500/25 text-violet-400 border border-violet-500/40'
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
            }`}
          >
            <Icono nombre={s.icono} /> {t(`ejercicio.sub.${s.id}`, s.labelEs)}
          </button>
        ))}
      </div>

      {subF === 'catalogo' && <CrearRutinaFlex />}

      {subF === 'rutinas' && (
        <>
          <div className="rounded-xl bg-white/5 border border-white/10">
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
                    tipo="flexibilidad"
                    acento={{ boton: 'bg-violet-600', hoverBorde: 'hover:border-violet-500/50' }}
                    imgPorClave={imgPorClave}
                    onUsar={() => aplicarRutina(r)}
                    onIniciar={() => setRutinaFlexActiva(r)}
                    onBorrar={() => r.id && rutinasFlexRepo.remove(r.id)}
                    hechoHoy={delDia.length > 0}
                  />
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={guardar}
            className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
          >
            <p className="text-base font-bold">
              <Icono nombre={editandoId !== null ? 'editar' : 'cuarto-jardin'} />{' '}
              {editandoId !== null
                ? t('ejercicio.flex.editando', 'Editando sesión de flexibilidad')
                : t('ejercicio.flex.registrar', 'Registrar flexibilidad')}
            </p>
            <AutocompleteEjercicio
              value={titulo}
              onChange={setTitulo}
              onSelect={(nombre, grupo) => {
                setTitulo(nombre)
                if (grupo) setEnfoque(grupo.label)
              }}
              grupos={catalogoNombres}
              recientes={recientes}
              placeholder={t('ejercicio.flex.ph.nombre', 'Nombre de la sesión')}
            />
            <Timer segundos={timerSeg} nonce={timerNonce} color="#a78bfa" />

            <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
              <span className="text-xs font-semibold text-white/70">
                {t('ejercicio.flex.suma', 'Suma de los ejercicios')}
              </span>
              <span className="text-base font-bold text-violet-400">{fmtSuma}</span>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-white/50">
                {t('ejercicio.flex.posturas', 'Posturas · tiempo × reps')}
              </p>
              {filas.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <CheckFila
                    hecho={!!f.hecho}
                    onToggle={() => actualizarFila(i, { hecho: !f.hecho })}
                    acento="bg-violet-600"
                  />
                  <MiniaturaEjercicio
                    nombre={f.ejercicio}
                    registro={imgPorClave.get(normalizarEjercicio(f.ejercicio))}
                    hoverBorde="hover:border-violet-500/50"
                    tamano="sm"
                  />
                  <div className="grid flex-1 grid-cols-12 gap-1 text-xs">
                    <AutocompleteEjercicio
                      className="col-span-5"
                      value={f.ejercicio}
                      onChange={(v) => actualizarFila(i, { ejercicio: v })}
                      onSelect={(nombre) => actualizarFila(i, { ejercicio: nombre })}
                      grupos={catalogoNombres}
                      recientes={recientes}
                      placeholder={t('ejercicio.flex.ph.postura', 'Postura')}
                    />
                    <input
                      value={f.segundos}
                      onChange={(e) => actualizarFila(i, { segundos: e.target.value })}
                      placeholder={t('ejercicio.flex.ph.seg', 'seg')}
                      className="col-span-2 rounded-lg bg-black/30 px-1 py-1.5 border border-white/10 text-center"
                    />
                    <input
                      value={f.repeticiones}
                      onChange={(e) => actualizarFila(i, { repeticiones: e.target.value })}
                      placeholder={t('ejercicio.flex.ph.reps', 'reps')}
                      className="col-span-2 rounded-lg bg-black/30 px-1 py-1.5 border border-white/10 text-center"
                    />
                    <button
                      type="button"
                      onClick={() => cargarTimer(parseInt(f.segundos, 10) || 30)}
                      title={t('ejercicio.flex.cronometrar', 'Cronometrar')}
                      className="col-span-3 rounded-lg bg-white/10 py-1.5 hover:bg-violet-500/25"
                    >
                      <Icono nombre="alarma" /> {t('ejercicio.flex.timer', 'Timer')}
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={agregarFila}
                className="text-xs text-violet-400 hover:underline"
              >
                {t('ejercicio.flex.añadirPostura', '+ Añadir postura')}
              </button>
            </div>

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
                className="flex-1 rounded-xl py-2.5 font-bold bg-violet-600 texto-cta disabled:cursor-not-allowed disabled:opacity-40"
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
            sesiones={todasFlex}
            delDia={delDia}
            color="text-violet-400"
            resaltado="bg-violet-500/10 border-violet-500/30"
            onEditar={editarSesion}
            onEliminar={async (id) => {
              if (editandoId === id) cancelarEdicion()
              const suyas = todasSeriesFlex.filter((x) => x.sesionId === id)
              await Promise.all(suyas.map((x) => x.id && seriesFlexRepo.remove(x.id)))
              await sesionesEjercicioRepo.remove(id)
            }}
          />
        </>
      )}

      {subF === 'progreso' && (
        <>
          <FiltroPeriodo
            valor={periodo}
            onChange={setPeriodo}
            acento="bg-violet-500/25 text-violet-400 border border-violet-500/40"
          />
          <div className="grid grid-cols-2 gap-3">
            <HeatmapMensual sesiones={sesiones} tipo="flexibilidad" color="#a78bfa" />
            <div className="grid grid-rows-2 gap-3">
              <StatCard
                label={t('ejercicio.stats.minutos', 'Minutos totales')}
                valor={String(totalMin)}
                semana={totalMin}
                meta={metaMinPeriodo}
                rango={periodo}
                color="#a78bfa"
              />
              <StatCard
                label={t('ejercicio.stats.sesiones', 'Sesiones')}
                valor={String(totalSes)}
                semana={totalSes}
                meta={metaSesPeriodo}
                rango={periodo}
                color="#a78bfa"
              />
            </div>
          </div>
        </>
      )}

      {rutinaFlexActiva && (
        <ReproductorFlex
          rutina={rutinaFlexActiva}
          imgPorClave={imgPorClave}
          onCerrar={() => setRutinaFlexActiva(null)}
        />
      )}
    </div>
  )
}
