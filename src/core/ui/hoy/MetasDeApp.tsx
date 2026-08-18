import { useState } from 'react'
import { abrirApp } from '../../abrirApp'
import type { Rutina } from '../../data/db'
import { rutinasRepo } from '../../data/repository'
import { useT } from '../../i18n/useT'
import { diasParaFin, esMeta, hijasDe, progresoDe, rangoDe, resumenAlcance } from '../../metas'
import { colorDe } from '../coloresRutina'
import { Icono } from '../iconos/Icono'
import { vivo } from '../estilos'

/**
 * Lo que te propusiste en ESTA app, encima de lo que toca hoy. Arriba las metas,
 * abajo las misiones: la checklist del día deja de ser una lista de tareas
 * sueltas y pasa a leerse como lo que sirve a algo.
 *
 * Es solo lectura, pero se abre: tocar una meta enseña lo que lleva dentro (sus
 * sub-metas y sus pasos) SIN salir del panel. Antes cada meta era un atajo al
 * cuarto Metas, así que elegir una cerraba las Misiones y la lista desaparecía
 * de golpe — parecía que se hubieran borrado. Ir al cuarto Metas ahora tiene su
 * propio botón en la cabecera, que es donde se busca «verlas todas».
 *
 * Planear —crear, fechar, partir en sub-metas— sigue siendo del cuarto Metas.
 */

/** Cuántas metas se listan antes de mandar al cuarto Metas. */
const TOPE = 5

/**
 * El alcance de una meta contando la meta misma cuando está vacía: sin pasos ni
 * sub-metas, `resumenAlcance` da 0/0 y la barra del encabezado se comería metas
 * que sí cuentan («ponerme al día con el idioma» es una sola cosa que se cumple).
 */
function alcance(metas: Rutina[], m: Rutina): { hechos: number; total: number } {
  const suma = resumenAlcance(metas, m)
  return suma.total > 0 ? suma : { hechos: m.completada ? 1 : 0, total: 1 }
}

export function MetasDeApp({ plantillaId, color }: { plantillaId: string; color: string }) {
  const t = useT()
  const rutinas = rutinasRepo.useAll()
  // Plegado propio, como el de «Hechos» de la lista: quien viene a registrar lo
  // de hoy no siempre quiere el recordatorio de para qué era.
  const [plegado, setPlegado] = useState(false)
  const [abiertas, setAbiertas] = useState<number[]>([])
  const metas = (rutinas ?? []).filter(esMeta)
  const suyas = metas.filter((m) => m.plantillaId === plantillaId)

  // Se re-enraiza para la vista, como hace el cronograma acotado: una meta de esta
  // app colgada de otra de otra app se quedaría fuera si se filtrara por
  // `padreId === undefined`, y aquí lo que importa es que aparezca.
  const ids = new Set(suyas.map((m) => m.id))
  const raices = suyas.filter((m) => m.padreId == null || !ids.has(m.padreId))
  if (raices.length === 0) return null

  const total = raices.reduce((n, m) => n + alcance(metas, m).total, 0)
  const hechos = raices.reduce((n, m) => n + alcance(metas, m).hechos, 0)
  const pct = total > 0 ? Math.round((hechos / total) * 100) : 0

  // Lo que sigue vivo primero: una meta cerrada ya no pide nada del día de hoy.
  const orden = [...raices].sort((a, b) => Number(!!a.completada) - Number(!!b.completada))
  const visibles = orden.slice(0, TOPE)

  const irAMetas = () => abrirApp('metas')
  const alternar = (id: number) =>
    setAbiertas((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))

  /**
   * Una meta y, si está abierta, lo que lleva dentro. Las sub-metas se pintan con
   * la misma fila (recursiva) y los pasos como una lista simple: aquí no se
   * palomea nada, solo se ve de qué está hecha la meta.
   */
  const fila = (m: Rutina, profundidad: number) => {
    const suma = alcance(metas, m)
    const frac = progresoDe(metas, m)
    const faltan = rangoDe(m) ? diasParaFin(m) : null
    const hijas = hijasDe(metas, m.id)
    const hechosPasos = new Set(m.pasosHechos ?? [])
    const tieneDentro = hijas.length > 0 || m.pasos.length > 0
    const abierta = m.id != null && abiertas.includes(m.id)
    return (
      <div key={m.id} style={{ marginInlineStart: profundidad * 10 }}>
        <button
          type="button"
          disabled={!tieneDentro}
          onClick={() => m.id != null && alternar(m.id)}
          className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-start transition hover:bg-white/5 disabled:cursor-default disabled:hover:bg-transparent"
        >
          {/* El punto de color hace de flecha cuando hay algo debajo: dos marcas
              distintas en la misma columna descuadraban las filas. */}
          {tieneDentro ? (
            <span
              className={`shrink-0 text-[10px] transition-transform ${abierta ? 'rotate-90' : ''}`}
              style={{ color: colorDe(m) }}
            >
              <Icono nombre="siguiente" />
            </span>
          ) : (
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorDe(m) }} />
          )}
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-[11px] font-semibold ${
                m.completada ? 'text-white/40 line-through' : 'text-white/80'
              }`}
            >
              <Icono emoji={m.emoji} /> {m.nombre}
            </span>
            <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full transition-all"
                style={{
                  width: `${Math.round(frac * 100)}%`,
                  background: m.completada ? 'rgb(52 211 153)' : colorDe(m),
                }}
              />
            </span>
          </span>
          <span className="shrink-0 text-end">
            <span className="block text-[10px] tabular-nums text-white/40">
              {suma.hechos}/{suma.total}
            </span>
            {/* La cuenta regresiva solo donde hay fecha: es lo que convierte una
                lista de deseos en algo que aprieta. */}
            {faltan != null && !m.completada && (
              <span
                className={`block text-[9px] tabular-nums ${
                  faltan < 0 ? 'text-red-400/80' : 'text-white/30'
                }`}
              >
                {faltan < 0
                  ? t('hoy.metas.vencida', 'vencida')
                  : t('hoy.metas.faltan', '{n} d', { n: faltan })}
              </span>
            )}
          </span>
        </button>

        {abierta && (
          <div className="space-y-0.5">
            {hijas.map((h) => fila(h, profundidad + 1))}
            {m.pasos.map((p, i) => (
              <p
                key={i}
                style={{ marginInlineStart: (profundidad + 1) * 10 }}
                className={`flex items-center gap-1.5 px-1 py-0.5 text-[10px] ${
                  hechosPasos.has(i) ? 'text-white/35 line-through' : 'text-white/55'
                }`}
              >
                <span className="grid size-3 shrink-0 place-items-center text-[9px] text-emerald-400/70">
                  {hechosPasos.has(i) ? (
                    <Icono nombre="confirmar" />
                  ) : (
                    <span className="h-1 w-1 rounded-full bg-white/30" />
                  )}
                </span>
                <span className="min-w-0 truncate">{p.titulo}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
      <div className="mb-1.5 flex items-center gap-1.5 px-1">
        <button
          type="button"
          onClick={() => setPlegado((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-start"
        >
          <span className={`shrink-0 text-[10px] text-white/40 transition-transform ${plegado ? '' : 'rotate-90'}`}>
            <Icono nombre="siguiente" />
          </span>
          <span className="texto-vivo text-[11px] font-bold uppercase tracking-wider" style={vivo(color)}>
            <Icono nombre="objetivo" /> {t('hoy.metas.titulo', 'Metas')}
          </span>
          <span className="rounded-full bg-white/10 px-1.5 text-[10px] tabular-nums text-white/60">
            {hechos}/{total}
          </span>
          <span className="text-[10px] font-bold tabular-nums text-white/45">{pct}%</span>
        </button>
        {/* Salir al cuarto Metas es una decisión aparte, no lo que pasa por tocar
            una meta: desde aquí se cierra el panel entero. */}
        <button
          type="button"
          onClick={irAMetas}
          title={t('hoy.metas.abrir', 'Ver todas en Metas')}
          className="shrink-0 rounded-md px-1 py-0.5 text-[10px] text-white/30 transition hover:bg-white/10 hover:text-white/70"
        >
          <Icono nombre="siguiente" />
        </button>
      </div>

      {!plegado && (
        <div className="space-y-0.5">
          {visibles.map((m) => fila(m, 0))}

          {raices.length > TOPE && (
            <button
              type="button"
              onClick={irAMetas}
              className="w-full rounded-lg py-0.5 text-[10px] font-semibold text-white/40 transition hover:bg-white/5 hover:text-white/70"
            >
              {t('cal.verMas', '+{n} más', { n: raices.length - TOPE })}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
