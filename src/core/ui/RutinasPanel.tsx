import { useState } from 'react'
import type { Rutina, PasoRutina, RepeticionRutina } from '../data/db'
import { rutinasRepo } from '../data/repository'
import { getPlantilla, plantillasAgendables } from '../registry'
import { appsAsignadas } from '../chat/dispatcher'
import { hoyISO, textoRepeticion, DIAS_SEMANA } from '../rutinas'
import { pedirPermiso, permisoNotificaciones } from '../notificaciones'
import { useT } from '../i18n/useT'
import { COLORES_RUTINA } from './coloresRutina'
import { FilaAviso } from './FilaAviso'
import { Icono } from './iconos/Icono'

/**
 * El editor manual de rutinas/eventos y sus piezas compartidas (`rutinaNueva`,
 * `MODOS_REPETICION`, `DIAS`). Lo usan el calendario (+ Nueva y editar un
 * bloque), las Misiones de cada app y de la casa (la «checklist» del camino
 * largo) y `HorarioActividad`.
 *
 * El panel rápido ⏰ que dio nombre al archivo se retiró: crear una rutina vive
 * en Misiones (`AnadirObjetivo` y este editor) y la gestión —pausar, editar,
 * borrar— en la fila del calendario (`DespliegueFila`).
 */

/** Etiquetas cortas de los días (índice = getDay(): 0=domingo). */
export const DIAS = [...DIAS_SEMANA]

const PASO_VACIO: PasoRutina = { titulo: '', roomId: 'cocina' }

const aMin = (hhmm: string) => parseInt(hhmm.slice(0, 2)) * 60 + parseInt(hhmm.slice(3, 5))
const aHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
/** Redondea al múltiplo de 15 min más cercano. */
const redondear15 = (hhmm: string) => aHHMM(Math.round(aMin(hhmm) / 15) * 15)

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

export const MODOS_REPETICION: { id: Exclude<RepeticionRutina, 'personalizado'>; labelKey: string; fallback: string }[] = [
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
    const fechaInicio = r.fechaInicio || hoyISO()
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

      {/* App a la que pertenece: le da color en el calendario, la mete en el
          cronograma de esa app y decide qué aviso se calla desde Configuraciones. */}
      <select
        value={r.plantillaId ?? ''}
        onChange={(e) => {
          const id = e.target.value || undefined
          const p = id ? getPlantilla(id) : undefined
          // Hereda la identidad de la app solo si el evento aún no la tocó.
          setR((prev) => ({
            ...prev,
            plantillaId: id,
            // La fila deja de ser el espejo de aquella actividad: sin esto, el
            // control de la app vieja seguiría adoptando un evento que ya no es suyo.
            actividadId: undefined,
            emoji: p && prev.emoji === '⏰' ? p.icon : prev.emoji,
            color: p && !prev.color ? p.color : prev.color,
          }))
        }}
        className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 focus:outline-none"
      >
        <option value="">{t('rutinas.sinApp', 'Sin app (evento de la casa)')}</option>
        {plantillasAgendables().map((p) => (
          <option key={p.id} value={p.id}>
            {p.icon} {t(`room.${p.id}.nombre`, p.nombre).split(' · ')[0]}
          </option>
        ))}
      </select>

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

      {/* Aviso a su hora: va aquí porque es la hora lo que gobierna (sin hora no
          hay a qué avisar). `avisar` sin valor = avisa, como lee `debeAvisar`. */}
      <div data-tut="rutinas.avisar" className={r.hora ? '' : 'pointer-events-none opacity-30'}>
        <FilaAviso
          icono="alarma"
          texto={t('rutinas.avisar', 'Avisarme a su hora')}
          hint={
            permisoNotificaciones() === 'granted'
              ? t('rutinas.avisar.hint', 'Te llegará una notificación.')
              : t('rutinas.avisar.hintSinPermiso', 'Te avisaremos dentro de la app.')
          }
          activo={r.avisar !== false}
          onCambio={(v) => {
            if (v) void pedirPermiso()
            setR({ ...r, avisar: v })
          }}
          on={t('rutinas.avisar.on', 'Sí')}
          off={t('rutinas.avisar.off', 'No')}
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
      <div data-tut="rutinas.repeticion" className="space-y-1.5">
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
                  ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-400'
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

        {/* Mensual/anual/rango: salen de trazar la meta en el calendario (ver Calendario.tsx). */}
        {(rep === 'mensual' || rep === 'anual' || rep === 'rango') && (
          <p className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] text-white/50">
            <Icono nombre="repetir" /> {textoRepeticion(r)} — {t('rutinas.rep.soloTrazo', 'se agendó trazándola en el calendario; vuelve a trazarla para cambiar las fechas')}
          </p>
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
                        ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-400'
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
              className="rounded-md border border-white/10 bg-white/5 px-1 py-1.5 text-xs text-white/85 focus:outline-none [&>option]:bg-[var(--ui-panel)]"
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
          className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-bold texto-cta transition hover:bg-emerald-600 disabled:opacity-30"
        >
          {t('rutinas.guardar', 'Guardar')}
        </button>
      </div>
    </div>
  )
}
