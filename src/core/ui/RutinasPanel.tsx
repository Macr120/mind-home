import { useEffect, useState } from 'react'
import type { Rutina, PasoRutina, RepeticionRutina } from '../data/db'
import { rutinasRepo, useEjecucionesDeFecha } from '../data/repository'
import { getPlantilla } from '../registry'
import { appsAsignadas } from '../chat/dispatcher'
import { hoyISO, tocaHoy, togglePaso, pasosHechosHoy, estaPendiente, revisarRecordatorios, textoRepeticion, DIAS_SEMANA } from '../rutinas'
import { useRutinasUI } from '../state/rutinasUiStore'
import { useT } from '../i18n/useT'

/** Etiquetas cortas de los días (índice = getDay(): 0=domingo). */
const DIAS = [...DIAS_SEMANA]

const PASO_VACIO: PasoRutina = { titulo: '', roomId: 'cocina' }

const aMin = (hhmm: string) => parseInt(hhmm.slice(0, 2)) * 60 + parseInt(hhmm.slice(3, 5))
const aHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
/** Redondea al múltiplo de 15 min más cercano. */
const redondear15 = (hhmm: string) => aHHMM(Math.round(aMin(hhmm) / 15) * 15)

/**
 * Panel rápido de rutinas: checklist del día (cada paso puede auto-registrar
 * en su cuarto) y gestor para crear/editar/borrar rutinas a mano. Se abre
 * desde el botón ⏰ del RelojWidget; el calendario completo es `Calendario`.
 * También dispara los recordatorios (el asistente anuncia a la hora).
 */
export function RutinasPanel() {
  const t = useT()
  const abierto = useRutinasUI((s) => s.panel)
  const [editando, setEditando] = useState<Rutina | null>(null)
  const rutinas = rutinasRepo.useAll()
  const ejecuciones = useEjecucionesDeFecha(hoyISO())

  // Recordatorios: el asistente avisa cuando una rutina llega a su hora.
  useEffect(() => {
    const id = setInterval(revisarRecordatorios, 30_000)
    revisarRecordatorios()
    return () => clearInterval(id)
  }, [])

  const deHoy = (rutinas ?? []).filter(tocaHoy)

  return (
    <>
      {abierto && (
        <div className="ui-panel-glass absolute right-3 top-24 z-20 flex max-h-[70vh] w-80 flex-col rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
            <p className="flex-1 text-sm font-semibold">⏰ {t('rutinas.titulo', 'Rutinas')}</p>
            <button
              type="button"
              onClick={() => setEditando(rutinaNueva())}
              className="rounded-lg bg-emerald-500/90 px-2 py-1 text-[11px] font-bold text-white transition hover:bg-emerald-400"
            >
              + {t('rutinas.nueva', 'Nueva')}
            </button>
            <button
              type="button"
              onClick={() => useRutinasUI.getState().cerrarPanel()}
              className="px-1 text-sm text-white/40 transition hover:text-white/80"
              title={t('rutinas.cerrar', 'Cerrar')}
            >
              ✕
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {editando ? (
              <EditorRutina
                rutina={editando}
                onCerrar={() => setEditando(null)}
              />
            ) : (
              <>
                {/* Hoy: checklist */}
                {deHoy.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                      {t('rutinas.hoy', 'Hoy')}
                    </p>
                    {deHoy.map((r) => (
                      <TarjetaHoy key={r.id} rutina={r} hechos={pasosHechosHoy(r, ejecuciones)} pendiente={estaPendiente(r, ejecuciones)} />
                    ))}
                  </div>
                )}

                {/* Todas: gestionar */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                    {t('rutinas.todas', 'Todas las rutinas')}
                  </p>
                  {(rutinas ?? []).length === 0 && (
                    <p className="py-2 text-center text-xs leading-relaxed text-white/35">
                      {t(
                        'rutinas.vacio',
                        'Aún no hay rutinas. Crea una con «+ Nueva» o pídesela a tu asistente: «créame una rutina de mañana con agua, estiramiento y gratitud».',
                      )}
                    </p>
                  )}
                  {(rutinas ?? []).map((r) => (
                    <div key={r.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                      <span>{r.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-xs font-semibold ${r.activa ? 'text-white/85' : 'text-white/35 line-through'}`}>
                          {r.nombre}
                        </p>
                        <p className="text-[10px] text-white/35">
                          {r.hora || t('rutinas.sinHora', 'sin hora')} · {textoRepeticion(r)} ·{' '}
                          {r.pasos.length} {t('rutinas.pasos', 'pasos')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => r.id != null && rutinasRepo.update(r.id, { activa: !r.activa })}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition ${
                          r.activa ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40'
                        }`}
                        title={r.activa ? t('rutinas.pausar', 'Pausar') : t('rutinas.activar', 'Activar')}
                      >
                        {r.activa ? 'ON' : 'OFF'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditando({ ...r, pasos: r.pasos.map((p) => ({ ...p })) })}
                        className="px-1 text-[11px] text-white/30 transition hover:text-white/80"
                        title={t('rutinas.editar', 'Editar')}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => r.id != null && rutinasRepo.remove(r.id)}
                        className="px-1 text-[11px] text-white/30 transition hover:text-red-400"
                        title={t('rutinas.borrar', 'Borrar')}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/** Tarjeta del día: pasos palomeables; el auto-registro muestra ⚡. */
function TarjetaHoy({ rutina, hechos, pendiente }: { rutina: Rutina; hechos: Set<number>; pendiente: boolean }) {
  const t = useT()
  const total = rutina.pasos.length
  const completada = total > 0 && hechos.size >= total

  return (
    <div className={`rounded-xl border p-2 ${pendiente ? 'border-amber-400/40 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}>
      <div className="mb-1.5 flex items-center gap-2">
        <span>{rutina.emoji}</span>
        <p className="flex-1 truncate text-xs font-semibold text-white/85">{rutina.nombre}</p>
        {rutina.hora && <span className="text-[10px] text-white/40">{rutina.hora}</span>}
        {total > 0 && (
          <span className={`text-[10px] font-bold ${completada ? 'text-emerald-400' : 'text-white/40'}`}>
            {hechos.size}/{total}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {total === 0 ? (
          <p className="px-1.5 py-1 text-xs text-white/45">{t('rutinas.eventoSimple', 'Evento del calendario.')}</p>
        ) : (
          rutina.pasos.map((p, i) => {
          const hecho = hechos.has(i)
          const room = getPlantilla(p.roomId)
          return (
            <button
              key={i}
              type="button"
              onClick={() => togglePaso(rutina, i)}
              className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition hover:bg-white/10"
            >
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${
                  hecho ? 'border-emerald-400 bg-emerald-500/30 text-emerald-200' : 'border-white/25'
                }`}
              >
                {hecho ? '✓' : ''}
              </span>
              <span className={`flex-1 truncate text-xs ${hecho ? 'text-white/35 line-through' : 'text-white/75'}`}>
                {p.titulo}
              </span>
              {p.esquemaId && (
                <span className="text-[10px] text-amber-300/80" title={t('rutinas.autoRegistro', 'Registra automáticamente en el cuarto')}>
                  ⚡
                </span>
              )}
              <span className="text-xs opacity-60">{room?.icon}</span>
            </button>
          )
        })
        )}
      </div>
      {completada && (
        <p className="mt-1 text-center text-[10px] text-emerald-400">✓ {t('rutinas.completada', '¡Rutina completada!')}</p>
      )}
    </div>
  )
}

/** Paleta de colores de evento (estilo Google Calendar, tema oscuro). */
export const COLORES_RUTINA = [
  '#10b981', '#3b82f6', '#a78bfa', '#f472b6',
  '#f59e0b', '#ef4444', '#14b8a6', '#64748b',
]

/** Rutina en blanco para el editor (la usa también el calendario). */
export function rutinaNueva(base: Partial<Rutina> = {}): Rutina {
  return {
    nombre: '',
    emoji: '⏰',
    hora: '',
    dias: [],
    repeticion: 'indefinido',
    fechaInicio: hoyISO(),
    pasos: [],
    activa: true,
    creadoEn: new Date().toISOString(),
    ...base,
  }
}

const MODOS_REPETICION: { id: Exclude<RepeticionRutina, 'personalizado'>; labelKey: string; fallback: string }[] = [
  { id: 'una_vez', labelKey: 'rutinas.rep.unaVez', fallback: 'Solo una vez' },
  { id: 'semanal', labelKey: 'rutinas.rep.semanal', fallback: 'Cada semana' },
  { id: 'indefinido', labelKey: 'rutinas.rep.indefinido', fallback: 'Indefinidamente' },
]

/** Editor manual: nombre, emoji, hora, días y pasos (cuarto + título). */
export function EditorRutina({ rutina, onCerrar }: { rutina: Rutina; onCerrar: () => void }) {
  const t = useT()
  const [r, setR] = useState<Rutina>(rutina)

  const setPaso = (i: number, cambios: Partial<PasoRutina>) =>
    setR({ ...r, pasos: r.pasos.map((p, j) => (j === i ? { ...p, ...cambios } : p)) })

  const guardar = async () => {
    if (!r.nombre.trim()) return
    const pasos = r.pasos.filter((p) => p.titulo.trim())
    const hora = r.hora ? redondear15(r.hora) : undefined
    let horaFin =
      hora && r.horaFin && r.horaFin > hora ? redondear15(r.horaFin) : undefined
    if (hora && horaFin && aMin(horaFin) <= aMin(hora)) {
      horaFin = aHHMM(aMin(hora) + 15)
    }

    const repRaw = r.repeticion ?? 'indefinido'
    const rep = repRaw === 'personalizado' ? 'semanal' : repRaw
    let dias = [...r.dias].sort()
    let fechaInicio = r.fechaInicio || hoyISO()
    let fechaFin = r.fechaFin

    if (rep === 'una_vez') {
      dias = []
      fechaFin = undefined
    } else if (rep === 'indefinido') {
      fechaFin = undefined
    } else if (rep === 'semanal' && dias.length === 0) {
      dias = [new Date(fechaInicio + 'T12:00').getDay()]
    }

    const datos: Rutina = {
      ...r,
      nombre: r.nombre.trim(),
      hora,
      horaFin,
      pasos,
      repeticion: rep,
      dias,
      fechaInicio,
      fechaFin: fechaFin || undefined,
    }
    if (r.id != null) await rutinasRepo.update(r.id, datos as Partial<Rutina>)
    else await rutinasRepo.add(datos)
    onCerrar()
  }

  const repRaw = r.repeticion ?? 'indefinido'
  const rep = repRaw === 'personalizado' ? 'semanal' : repRaw
  const muestraDias = rep === 'semanal' || rep === 'indefinido'
  const muestraFin = rep === 'semanal'

  const cambiarRepeticion = (modo: Exclude<RepeticionRutina, 'personalizado'>) => {
    setR((prev) => {
      const next: Rutina = { ...prev, repeticion: modo }
      if (modo === 'una_vez') {
        next.fechaFin = undefined
        next.dias = []
        if (!next.fechaInicio) next.fechaInicio = hoyISO()
      } else if (modo === 'indefinido') {
        next.fechaFin = undefined
      } else if (modo === 'semanal' && prev.dias.length === 0 && prev.fechaInicio) {
        next.dias = [new Date(prev.fechaInicio + 'T12:00').getDay()]
      }
      return next
    })
  }

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <input
          value={r.emoji}
          onChange={(e) => setR({ ...r, emoji: e.target.value })}
          className="w-12 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-center text-sm focus:outline-none"
        />
        <input
          value={r.nombre}
          onChange={(e) => setR({ ...r, nombre: e.target.value })}
          placeholder={t('rutinas.nombre', 'Nombre de la rutina/evento')}
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/25 focus:outline-none"
        />
      </div>

      {/* Horario: inicio – fin (el fin dibuja la duración en el calendario) */}
      <div className="flex items-center gap-1.5">
        <input
          type="time"
          step={900}
          value={r.hora ?? ''}
          onChange={(e) => setR({ ...r, hora: e.target.value })}
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 focus:outline-none"
        />
        <span className="text-xs text-white/35">–</span>
        <input
          type="time"
          step={900}
          value={r.horaFin ?? ''}
          onChange={(e) => setR({ ...r, horaFin: e.target.value })}
          disabled={!r.hora}
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 focus:outline-none disabled:opacity-30"
        />
      </div>

      {/* Color del evento */}
      <div className="flex items-center gap-1.5">
        {COLORES_RUTINA.map((c) => {
          const activo = (r.color ?? COLORES_RUTINA[0]) === c
          return (
            <button
              key={c}
              type="button"
              onClick={() => setR({ ...r, color: c })}
              className={`h-6 w-6 rounded-full border-2 transition ${
                activo ? 'scale-110 border-white' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          )
        })}
      </div>

      {/* Repetición */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('rutinas.rep.titulo', 'Repetición')}
        </p>
        <div className="grid grid-cols-3 gap-1">
          {MODOS_REPETICION.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => cambiarRepeticion(m.id)}
              className={`rounded-md border px-2 py-1.5 text-[10px] font-semibold transition ${
                rep === m.id
                  ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-white/45 hover:text-white/75'
              }`}
            >
              {t(m.labelKey, m.fallback)}
            </button>
          ))}
        </div>

        {rep === 'una_vez' && (
          <input
            type="date"
            value={r.fechaInicio ?? hoyISO()}
            onChange={(e) => setR({ ...r, fechaInicio: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 focus:outline-none"
          />
        )}

        {muestraDias && (
          <>
            <div className="flex gap-1">
              {DIAS.map((d, i) => {
                const activo = r.dias.includes(i)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setR({
                        ...r,
                        dias: activo ? r.dias.filter((x) => x !== i) : [...r.dias, i].sort(),
                      })
                    }
                    className={`h-7 flex-1 rounded-md border text-[11px] font-bold transition ${
                      activo
                        ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                        : 'border-white/10 bg-white/5 text-white/40'
                    }`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-white/30">
              {rep === 'indefinido'
                ? t('rutinas.rep.hintIndefinido', 'Sin días marcados = todos los días, sin fecha de fin.')
                : t('rutinas.rep.hintSemanal', 'Se repite cada semana en los días marcados.')}
            </p>
          </>
        )}

        {muestraFin && (
          <label className="flex items-center gap-2 text-[11px] text-white/50">
            <span className="shrink-0">{t('rutinas.rep.termina', 'Termina el')}</span>
            <input
              type="date"
              value={r.fechaFin ?? ''}
              onChange={(e) => setR({ ...r, fechaFin: e.target.value || undefined })}
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/85 focus:outline-none"
            />
            {r.fechaFin && (
              <button
                type="button"
                onClick={() => setR({ ...r, fechaFin: undefined })}
                className="shrink-0 text-white/35 hover:text-white/70"
                title={t('rutinas.rep.sinFin', 'Sin fecha de fin')}
              >
                ✕
              </button>
            )}
          </label>
        )}
      </div>

      {/* Pasos (opcionales: eventos simples no necesitan checklist) */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('rutinas.pasosTitulo', 'Pasos')} <span className="font-normal normal-case text-white/25">({t('rutinas.pasosOpcional', 'opcional')})</span>
        </p>
        {r.pasos.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <select
              value={p.roomId}
              onChange={(e) => setPaso(i, { roomId: e.target.value })}
              className="rounded-md border border-white/10 bg-white/5 px-1 py-1.5 text-xs text-white/85 focus:outline-none [&>option]:bg-neutral-900"
            >
              {appsAsignadas().map((room) => (
                <option key={room.id} value={room.id}>
                  {room.icon}
                </option>
              ))}
            </select>
            <input
              value={p.titulo}
              onChange={(e) => setPaso(i, { titulo: e.target.value })}
              placeholder={t('rutinas.pasoPh', 'Qué hacer…')}
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/25 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setR({ ...r, pasos: r.pasos.filter((_, j) => j !== i) })}
              className="px-1 text-[11px] text-white/30 transition hover:text-red-400"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setR({ ...r, pasos: [...r.pasos, { ...PASO_VACIO, roomId: appsAsignadas()[0]?.id ?? '' }] })}
          className="w-full rounded-md border border-dashed border-white/15 py-1.5 text-[11px] text-white/40 transition hover:bg-white/5 hover:text-white/70"
        >
          + {t('rutinas.agregarPaso', 'Agregar paso')}
        </button>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCerrar}
          className="flex-1 rounded-lg bg-white/10 py-1.5 text-xs font-semibold transition hover:bg-white/20"
        >
          {t('rutinas.cancelar', 'Cancelar')}
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={!r.nombre.trim()}
          className="flex-1 rounded-lg bg-emerald-500/90 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-400 disabled:opacity-30"
        >
          {t('rutinas.guardar', 'Guardar')}
        </button>
      </div>
    </div>
  )
}
