import { Icono } from '../../core/ui/iconos/Icono'
import { useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { useAsistentes } from '../../core/state/asistentesStore'
import { nombreAsistente } from '../../core/chat/mascotas'
import { CATEGORIAS, COLOR, TIPOS_EFEMERIDE } from './constantes'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'
import {
  estadoReparto,
  getProgramaciones,
  seccionEfemeride,
  setProgramaciones,
  type Programacion,
  type SeccionReparto,
} from './reparto'
import { iaAutoDiario, setIaAutoDiario } from './autoIA'
import { claveLS } from '../../core/edicion'

interface Chip {
  id: SeccionReparto
  label: string
  emoji: string
  claveT: string
}

/**
 * Trece chips serían una sopa: van en dos grupos, y cada uno se enciende entero
 * de un toque.
 */
const GRUPOS: { claveT: string; etiqueta: string; chips: Chip[] }[] = [
  {
    claveT: 'diario.reparto.grupoTitulares',
    etiqueta: 'Titulares',
    chips: CATEGORIAS.map((c) => ({
      id: c.id as SeccionReparto,
      label: c.label,
      emoji: c.emoji,
      claveT: `diario.cat.${c.id}`,
    })),
  },
  {
    claveT: 'diario.reparto.grupoEfemerides',
    etiqueta: 'Efemérides',
    chips: TIPOS_EFEMERIDE.map((x) => ({
      id: seccionEfemeride(x.id),
      label: x.label,
      emoji: x.emoji,
      claveT: `diario.ef.${x.id}`,
    })),
  },
]

/**
 * Programación de muestra mientras no haya ninguna: solo se pinta (las
 * programaciones viven en localStorage y una guardada ya entregaría). Quitarla
 * se recuerda en este dispositivo.
 */
const LS_SIN_MUESTRA = claveLS('mh-diario-reparto-sinMuestra')
const SECCIONES_MUESTRA: SeccionReparto[] = ['mundo', 'tecnologia', seccionEfemeride('palabra')]

function muestraOculta(): boolean {
  try {
    return localStorage.getItem(LS_SIN_MUESTRA) === '1'
  } catch {
    return false
  }
}

/** Gestor de programaciones: qué feeds entrega cada asistente y a qué hora. */
export function RepartoConfig({ onCerrar }: { onCerrar: () => void }) {
  const t = useT()
  const asistentes = useAsistentes((s) => s.lista)
  const [progs, setProgs] = useState<Programacion[]>(() => getProgramaciones())
  const [estado, setEstado] = useState(() => estadoReparto())
  const [iaAuto, setIaAuto] = useState(() => iaAutoDiario())
  const [sinMuestra, setSinMuestra] = useState(muestraOculta)
  const asistenteMuestra = asistentes.find((a) => a.id === 'app-diario') ?? asistentes[0]

  const quitarMuestra = () => {
    setSinMuestra(true)
    try {
      localStorage.setItem(LS_SIN_MUESTRA, '1')
    } catch {
      // Sin almacenamiento solo vuelve a salir la próxima vez.
    }
  }

  const alternarIa = () => {
    const nueva = !iaAuto
    setIaAuto(nueva)
    setIaAutoDiario(nueva)
  }

  const guardar = (nuevas: Programacion[]) => {
    setProgs(nuevas)
    setProgramaciones(nuevas)
    setEstado(estadoReparto())
  }

  const cambiar = (id: string, cambios: Partial<Programacion>) =>
    guardar(progs.map((p) => (p.id === id ? { ...p, ...cambios } : p)))

  const agregar = () =>
    guardar([
      ...progs,
      {
        id: crypto.randomUUID(),
        asistenteId: asistentes.find((a) => a.id === 'app-diario')?.id ?? asistentes[0]?.id ?? '',
        secciones: ['mundo'],
        modo: 'hora',
        hora: '08:00',
      },
    ])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCerrar}
    >
      <div
        className="ui-panel max-h-[85vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl border border-white/15 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">
            <Icono nombre="scooter" /> {t('diario.reparto.titulo', 'Reparto por asistentes')}
          </h3>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
          >
            ✕
          </button>
        </div>
        <p className="text-xs leading-relaxed text-white/45">
          {t(
            'diario.reparto.desc',
            'Programa qué feeds te entrega cada asistente en su chat: a una hora fija o en un momento sorpresa del día (con la app abierta).',
          )}
        </p>

        {/* El Diario es el único cuarto donde la IA corre sola, así que su gasto
            se decide aquí y nace apagado. */}
        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">
              {t('diario.ia.titulo', 'Que la IA escriba el diario')}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/45">
              {t(
                'diario.ia.desc',
                'Apagada, las efemérides salen del catálogo de la app y los asistentes entregan con su plantilla. Encendida, la IA las redacta cada día y gasta 4 créditos diarios.',
              )}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={iaAuto}
            aria-label={t('diario.ia.titulo', 'Que la IA escriba el diario')}
            onClick={alternarIa}
            className={`ui-presion mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
              iaAuto ? 'border-transparent' : 'border-white/20 bg-white/10'
            }`}
            style={iaAuto ? { background: COLOR } : undefined}
          >
            <span
              className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                iaAuto ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {progs.length === 0 && !sinMuestra && asistenteMuestra && (
          <div className="space-y-2.5 rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-3">
            <p className="text-xs font-semibold">
              {asistenteMuestra.emoji} {nombreAsistente(t, asistenteMuestra)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {GRUPOS.flatMap((g) => g.chips)
                .filter((c) => SECCIONES_MUESTRA.includes(c.id))
                .map((c) => (
                  <span
                    key={c.id}
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-black"
                    style={{ background: COLOR }}
                  >
                    <Icono emoji={c.emoji} /> {t(c.claveT, c.label)}
                  </span>
                ))}
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60">
                <Icono nombre="alarma" /> 08:00
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-white/40">
              {t(
                'diario.reparto.muestra.pie',
                'Así se ve una programación. Es solo una muestra: no se guarda ni entrega nada hasta que la uses.',
              )}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={quitarMuestra}
                className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60 transition hover:bg-white/10 hover:text-red-300"
              >
                <Icono nombre="basura" /> {t('ejemplo.borrar', 'Borrar el ejemplo')}
              </button>
              <button
                type="button"
                onClick={() =>
                  guardar([
                    {
                      id: crypto.randomUUID(),
                      asistenteId: asistenteMuestra.id,
                      secciones: SECCIONES_MUESTRA,
                      modo: 'hora',
                      hora: '08:00',
                    },
                  ])
                }
                className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold transition hover:bg-white/15"
              >
                <Icono nombre="agregar" /> {t('diario.reparto.muestra.usar', 'Usar esta programación')}
              </button>
            </div>
          </div>
        )}

        {progs.length === 0 && (sinMuestra || !asistenteMuestra) && (
          <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-xs text-white/45">
            {t('diario.reparto.vacio', 'Sin programaciones. Agrega una para que un asistente te traiga el diario.')}
          </p>
        )}

        {progs.map((p) => {
          const entrega = estado.entregas[p.id]
          return (
            <div
              key={p.id}
              data-tut="diario.reparto.lista"
              className="space-y-2.5 rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div className="flex items-center gap-2">
                <select
                  value={p.asistenteId}
                  onChange={(ev) => cambiar(p.id, { asistenteId: ev.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs outline-none focus:border-white/30"
                >
                  {asistentes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.emoji} {nombreAsistente(t, a)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => guardar(progs.filter((x) => x.id !== p.id))}
                  className="shrink-0 rounded-lg bg-white/5 px-2 py-1.5 text-xs hover:bg-red-500/20"
                  title={t('diario.reparto.eliminar', 'Eliminar programación')}
                >
                  <Icono nombre="basura" />
                </button>
              </div>

              {GRUPOS.map((grupo) => {
                const todas = grupo.chips.every((c) => p.secciones.includes(c.id))
                return (
                  <div key={grupo.claveT} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                        {t(grupo.claveT, grupo.etiqueta)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const ids = grupo.chips.map((c) => c.id)
                          cambiar(p.id, {
                            secciones: todas
                              ? p.secciones.filter((x) => !ids.includes(x))
                              : [...p.secciones.filter((x) => !ids.includes(x)), ...ids],
                          })
                        }}
                        className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-white/50 hover:bg-white/10"
                      >
                        {todas
                          ? t('diario.reparto.ninguna', 'Ninguna')
                          : t('diario.reparto.todas', 'Todas')}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {grupo.chips.map((s) => {
                        const activa = p.secciones.includes(s.id)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() =>
                              cambiar(p.id, {
                                secciones: activa
                                  ? p.secciones.filter((x) => x !== s.id)
                                  : [...p.secciones, s.id],
                              })
                            }
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                              activa ? 'text-black' : 'bg-white/5 text-white/55 hover:bg-white/10'
                            }`}
                            style={activa ? { background: COLOR } : undefined}
                          >
                            <Icono emoji={s.emoji} /> {t(s.claveT, s.label)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <PestanasCarpeta
                    items={[
                      { id: 'hora', icono: 'alarma', labelEs: 'Hora fija' },
                      { id: 'aleatoria', icono: 'dados', labelEs: 'Aleatoria' },
                    ]}
                    activo={p.modo === 'hora' ? 'hora' : 'aleatoria'}
                    onCambio={(id) => cambiar(p.id, { modo: id })}
                    prefijoClave="diario.reparto.modo"
                    color={COLOR}
                    variante="sub"
                    flecha={false}
                  />
                </div>
                {p.modo === 'hora' && (
                  <input
                    type="time"
                    value={p.hora ?? '08:00'}
                    onChange={(ev) => cambiar(p.id, { hora: ev.target.value })}
                    className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs outline-none focus:border-white/30"
                  />
                )}
              </div>

              {entrega && (
                <p className="text-[11px] text-white/40">
                  {entrega.entregadoEn
                    ? `✓ ${t('diario.reparto.entregada', 'Entregada hoy')}`
                    : <><Icono nombre="alarma" /> {t('diario.reparto.pendiente', `Hoy a las ${entrega.horaObjetivo}`, { hora: entrega.horaObjetivo })}</>}
                </p>
              )}
            </div>
          )
        })}

        <button
          type="button"
          onClick={agregar}
          className="w-full rounded-xl py-2.5 text-sm font-bold text-black"
          style={{ background: COLOR }}
        >
          <Icono nombre="agregar" /> {t('diario.reparto.agregar', 'Agregar programación')}
        </button>
      </div>
    </div>
  )
}
