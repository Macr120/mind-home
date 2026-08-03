import { Icono } from '../../core/ui/iconos/Icono'
import { useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { useAsistentes } from '../../core/state/asistentesStore'
import { nombreAsistente } from '../../core/chat/mascotas'
import { CATEGORIAS, COLOR } from './constantes'
import {
  estadoReparto,
  getProgramaciones,
  setProgramaciones,
  type Programacion,
  type SeccionReparto,
} from './reparto'

/** Gestor de programaciones: qué feeds entrega cada asistente y a qué hora. */
export function RepartoConfig({ onCerrar }: { onCerrar: () => void }) {
  const t = useT()
  const asistentes = useAsistentes((s) => s.lista)
  const [progs, setProgs] = useState<Programacion[]>(() => getProgramaciones())
  const [estado, setEstado] = useState(() => estadoReparto())

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

  const SECCIONES: { id: SeccionReparto; label: string; emoji: string }[] = [
    ...CATEGORIAS.map((c) => ({ id: c.id as SeccionReparto, label: c.label, emoji: c.emoji })),
    { id: 'efemerides', label: 'Efemérides', emoji: '📅' },
  ]

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

        {progs.length === 0 && (
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

              <div className="flex flex-wrap gap-1.5">
                {SECCIONES.map((s) => {
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
                      <Icono emoji={s.emoji} />{' '}
                      {s.id === 'efemerides'
                        ? t('diario.tab.efemerides', s.label)
                        : t(`diario.cat.${s.id}`, s.label)}
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => cambiar(p.id, { modo: 'hora' })}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                    p.modo === 'hora' ? 'bg-white/20' : 'bg-white/5 text-white/55 hover:bg-white/10'
                  }`}
                >
                  <Icono nombre="alarma" /> {t('diario.reparto.modo.hora', 'Hora fija')}
                </button>
                <button
                  type="button"
                  onClick={() => cambiar(p.id, { modo: 'aleatoria' })}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                    p.modo === 'aleatoria' ? 'bg-white/20' : 'bg-white/5 text-white/55 hover:bg-white/10'
                  }`}
                >
                  <Icono nombre="dados" /> {t('diario.reparto.modo.aleatoria', 'Aleatoria')}
                </button>
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
