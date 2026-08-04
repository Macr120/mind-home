import { useEffect, useState } from 'react'
import type { Rutina } from '../data/db'
import { rutinasRepo } from '../data/repository'
import { getPlantilla } from '../registry'
import {
  buscarAgenda,
  hoyISO,
  marcarActividadHecha,
  toggleHecho,
  togglePaso,
  tocaHoy,
} from '../rutinas'
import { pedirPermiso, permisoNotificaciones } from '../notificaciones'
import { useT } from '../i18n/useT'
import { FilaAviso } from './FilaAviso'
import { Icono } from './iconos/Icono'
import { DIAS, EditorRutina, MODOS_REPETICION, rutinaNueva } from './RutinasPanel'
import { vivo } from './estilos'

/**
 * El control con el que una app le pone hora a UNA de sus actividades: esta rutina
 * de pierna, la cena, este hobby. Escribe una fila de `rutinas` — la misma que
 * pinta el calendario —, así que agendar aquí y ver el bloque allá son la misma
 * cosa, no dos sistemas que se sincronizan.
 *
 * Es un control compacto propio y NO un envoltorio de `EditorRutina`: el editor
 * completo pregunta emoji, nombre, app y color, y para poner la hora de la cena eso
 * es un formulario de administración donde el usuario quería un reloj (la cena ya
 * sabe cómo se llama). Lo que sí reusa: `rutinaNueva`, `MODOS_REPETICION`, `DIAS`,
 * los toggles, y el editor entero detrás de «Más opciones» para la cola larga.
 */

/** Lo que se escribe de un toque. Reusa PasoRutina + togglePaso: nada nuevo. */
export interface RegistroRapido {
  /** Esquema de captura de la app dueña (`Plantilla.esquemas[].id`). */
  esquemaId: string
  /** Valores del esquema; la `fecha` la pone `togglePaso`. */
  valores: Record<string, unknown>
  /** Etiqueta del botón, ya traducida («Registrar 45 min»). */
  etiqueta: string
}

/** Una actividad concreta de una app a la que se le puede poner hora. */
export interface Actividad {
  /** Llave estable `tipo:id` — se arma con `actividadId()` de core/rutinas.ts. */
  actividadId: string
  /** App dueña → `Rutina.plantillaId`: color, cronograma y silencio por app. */
  plantillaId: string
  /** Nombre del bloque en el calendario, YA traducido. */
  nombre: string
  /** Emoji del bloque; sin valor, el de la plantilla. */
  emoji?: string
  /** Hora con la que nace al agendarla; sin valor, '08:00'. */
  horaSugerida?: string
  /** Duración → `horaFin`; sin valor, el bloque no dibuja duración. */
  duracionMin?: number
  /** Sección de la app a la que salta el aviso. */
  seccion?: string
  /** Registro de un toque; SIN valor, el aviso solo ofrece abrir (cocina, idiomas). */
  registroRapido?: RegistroRapido
  /** Sin interruptor de aviso: nace y se queda en `avisar: false` (jardín). */
  sinAviso?: boolean
}

const HORA_DEFECTO = '08:00'

/** 'HH:mm' + minutos → 'HH:mm' (recortado a las 23:59: el bloque no cruza el día). */
export function sumarMin(hora: string, min: number): string {
  const total = Math.min(Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5)) + min, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/**
 * Escribe el bloque de calendario de una actividad: es lo que hace el botón
 * «Agendar» de este control, expuesto para que otros caminos (el planificador ✨
 * del cronograma) agenden exactamente la misma fila. `extra` ajusta campos del
 * bloque (p. ej. `dias`).
 */
export async function agendarActividad(a: Actividad, extra: Partial<Rutina> = {}): Promise<number> {
  const plantilla = getPlantilla(a.plantillaId)
  const hora = a.horaSugerida ?? HORA_DEFECTO
  return rutinasRepo.add(
    rutinaNueva({
      nombre: a.nombre,
      emoji: a.emoji ?? plantilla?.icon ?? '⏰',
      color: plantilla?.color ?? '#34d399',
      hora,
      horaFin: a.duracionMin ? sumarMin(hora, a.duracionMin) : undefined,
      plantillaId: a.plantillaId,
      actividadId: a.actividadId,
      seccion: a.seccion,
      avisar: !a.sinAviso,
      pasos: a.registroRapido
        ? [
            {
              titulo: a.registroRapido.etiqueta,
              roomId: a.plantillaId,
              esquemaId: a.registroRapido.esquemaId,
              valores: a.registroRapido.valores,
            },
          ]
        : [],
      ...extra,
    }),
  )
}

export function HorarioActividad({
  actividad,
  hechoHoy,
}: {
  actividad: Actividad
  /**
   * ¿La app ya tiene el registro de hoy? Es lo que evita el doble registro: sin
   * esto, cenar a las 19:30 y tocar «Registrar» a las 20:00 crearía una cena
   * fantasma de 0 kcal. En los enganches este dato ya está en scope.
   */
  hechoHoy?: boolean
}) {
  const t = useT()
  const rutinas = rutinasRepo.useAll()
  const fila = buscarAgenda(rutinas, actividad.actividadId)
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<Rutina | null>(null)

  const plantilla = getPlantilla(actividad.plantillaId)
  const color = plantilla?.color ?? '#34d399'
  const filaId = fila?.id

  // Lo registrado en la app manda sobre la palomita del bloque. Depende de `filaId`
  // y no de `fila`: la fila entera es un objeto nuevo en cada escritura de
  // `useLiveQuery`, así que volvería a dispararse a cada rato sin nada que hacer.
  useEffect(() => {
    if (hechoHoy === undefined || !fila || !tocaHoy(fila)) return
    void marcarActividadHecha(fila, hoyISO(), hechoHoy)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ver comentario de arriba
  }, [filaId, hechoHoy])

  const agendar = async () => {
    await agendarActividad(actividad)
    setAbierto(true)
  }

  const guardar = (cambios: Partial<Rutina>) => {
    if (filaId != null) void rutinasRepo.update(filaId, cambios)
  }

  if (!fila) {
    return (
      <button
        type="button"
        onClick={() => void agendar()}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/50 transition hover:bg-white/10 hover:text-white/80"
      >
        <Icono nombre="calendario" /> {t('horario.agendar', 'Agendar')}
      </button>
    )
  }

  const rep = fila.repeticion === 'personalizado' ? 'semanal' : fila.repeticion ?? 'indefinido'
  const muestraDias = rep === 'semanal' || rep === 'indefinido'
  const resumenDias =
    fila.dias.length === 0
      ? t('horario.todosDias', 'todos los días')
      : fila.dias.map((d) => DIAS[d]).join(' ')

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition hover:brightness-125"
        style={{ borderColor: `${color}55`, background: `${color}1a`, color }}
      >
        <Icono nombre="calendario" /> {fila.hora || t('horario.sinHora', 'Sin hora')} · {resumenDias}
        {fila.avisar !== false && <Icono nombre="alarma" />}
      </button>
    )
  }

  return (
    <>
      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-2">
          <p className="texto-vivo flex-1 text-sm font-bold" style={vivo(color)}>
            <Icono nombre="calendario" /> {t('horario.titulo', 'Horario')}
          </p>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="rounded-md px-2 py-1 text-xs text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            {t('horario.plegar', 'Listo')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-white/50">
            {t('horario.hora', 'Hora')}
            <input
              type="time"
              step={900}
              value={fila.hora ?? ''}
              onChange={(e) =>
                guardar({
                  hora: e.target.value || undefined,
                  horaFin:
                    e.target.value && actividad.duracionMin
                      ? sumarMin(e.target.value, actividad.duracionMin)
                      : undefined,
                })
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-lg font-bold text-white outline-none focus:border-white/30"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-white/50">
            {t('horario.frecuencia', 'Frecuencia')}
            <select
              value={rep}
              onChange={(e) => {
                const modo = e.target.value as (typeof MODOS_REPETICION)[number]['id']
                guardar({
                  repeticion: modo,
                  ...(modo === 'una_vez' ? { dias: [], fechaFin: undefined } : {}),
                })
              }}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2.5 text-xs font-bold text-white outline-none focus:border-white/30"
            >
              {MODOS_REPETICION.map((m) => (
                <option key={m.id} value={m.id}>
                  {t(m.labelKey, m.fallback)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {muestraDias && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/50">
              {t('horario.dias', 'Días')}
            </p>
            <div className="flex gap-1">
              {DIAS.map((d, i) => {
                const activo = fila.dias.includes(i)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      guardar({
                        dias: activo ? fila.dias.filter((x) => x !== i) : [...fila.dias, i].sort(),
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
            {fila.dias.length === 0 && (
              <p className="mt-1 text-[10px] text-white/30">
                {t('horario.sinDias', 'Sin marcar ninguno: todos los días.')}
              </p>
            )}
          </div>
        )}

        {!actividad.sinAviso && (
          <FilaAviso
            icono="alarma"
            texto={t('horario.avisar', 'Avisarme a su hora')}
            hint={
              permisoNotificaciones() === 'granted'
                ? t('horario.avisar.hint', 'Te llegará una notificación.')
                : t('horario.avisar.hintSinPermiso', 'Te avisaremos dentro de la app.')
            }
            activo={fila.avisar !== false}
            onCambio={(v) => {
              if (v) void pedirPermiso()
              guardar({ avisar: v })
            }}
            on={t('horario.avisar.on', 'Sí')}
            off={t('horario.avisar.off', 'No')}
          />
        )}

        <div className="flex items-center gap-2">
          {tocaHoy(fila) && (
            <button
              type="button"
              onClick={() =>
                actividad.registroRapido
                  ? void togglePaso(fila, 0)
                  : void toggleHecho(fila, hoyISO())
              }
              className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/60 transition hover:bg-white/20 hover:text-white/90"
            >
              <Icono nombre="confirmar" /> {t('horario.hechoHoy', 'Hecho hoy')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditando(fila)}
            className="rounded-lg px-2.5 py-1 text-xs text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            {t('horario.masOpciones', 'Más opciones ›')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (filaId != null) void rutinasRepo.remove(filaId)
              setAbierto(false)
            }}
            className="ml-auto rounded-lg px-2.5 py-1 text-xs text-white/40 transition hover:bg-rose-500/15 hover:text-rose-300"
          >
            {t('horario.quitar', 'Quitar')}
          </button>
        </div>
      </div>

      {/* El editor completo, sobre la MISMA fila: el atajo no bifurca el modelo. */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="ui-panel-glass ui-pop max-h-[85vh] w-[min(92vw,26rem)] overflow-auto rounded-2xl border border-white/10 p-3 shadow-2xl backdrop-blur-md">
            <EditorRutina rutina={editando} onCerrar={() => setEditando(null)} />
          </div>
        </div>
      )}
    </>
  )
}
