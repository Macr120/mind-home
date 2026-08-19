import { lazy, Suspense, useState } from 'react'
import type { Rutina } from '../../data/db'
import { rutinasRepo } from '../../data/repository'
import { useT } from '../../i18n/useT'
import { diasParaFin, esMeta, progresoDe, rangoDe, resumenAlcance } from '../../metas'
import { colorDe } from '../coloresRutina'
import { Icono } from '../iconos/Icono'
import { vivo } from '../estilos'

/**
 * Lo que te propusiste en ESTA app, encima de lo que toca hoy. Arriba las metas,
 * abajo las misiones: la checklist del día deja de ser una lista de tareas
 * sueltas y pasa a leerse como lo que sirve a algo.
 *
 * Tocar una meta abre SU PLAN —el planificador de la app puesto en esa meta—
 * sin salir de las Misiones: desde ahí se navega al cronograma y se vuelve, se
 * crean metas, se piden planes y se retocan las fechas. Antes cada meta era un
 * atajo al cuarto Metas, así que elegir una cerraba las Misiones y la lista
 * desaparecía de golpe — parecía que se hubieran borrado.
 */

/** El planificador entra al tocar una meta, no en el bundle de la casa. */
const CronogramaApp = lazy(() =>
  import('../metas/CronogramaApp').then((m) => ({ default: m.CronogramaApp })),
)

/** Cuántas metas se listan antes de mandar al planificador. */
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
  // El planificador de esta app abierto encima: con `metaId` entra por la hoja de
  // esa meta, sin él por la lista (que es donde se dan de alta las nuevas).
  const [planificando, setPlanificando] = useState<{ metaId?: number } | null>(null)
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

  /**
   * Una meta: su avance y su plazo. Tocarla abre su plan en el planificador de la
   * app, que es donde está todo lo suyo (fases, sub-metas y el eje del tiempo).
   */
  const fila = (m: Rutina) => {
    const suma = alcance(metas, m)
    const frac = progresoDe(metas, m)
    const faltan = rangoDe(m) ? diasParaFin(m) : null
    return (
      <div key={m.id}>
        <button
          type="button"
          onClick={() => m.id != null && setPlanificando({ metaId: m.id })}
          className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-start transition hover:bg-white/5"
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorDe(m) }} />
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
      </div>
    )
  }

  return (
    <div data-tut="hoy.metas" className="mb-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
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
        {/* Proponerse algo nuevo aquí mismo: el planificador se abre por su lista,
            que es donde está el alta. */}
        <button
          type="button"
          onClick={() => setPlanificando({})}
          className="shrink-0 rounded-md px-1.5 py-0.5 ui-presion text-[10px] font-bold leading-none text-accent hover:bg-white/10"
        >
          + {t('cal.meta.etiquetaMeta', 'meta')}
        </button>
      </div>

      {!plegado && (
        <div className="space-y-0.5">
          {visibles.map((m) => fila(m))}

          {raices.length > TOPE && (
            <button
              type="button"
              onClick={() => setPlanificando({})}
              className="w-full rounded-lg py-0.5 text-[10px] font-semibold text-white/40 transition hover:bg-white/5 hover:text-white/70"
            >
              {t('cal.verMas', '+{n} más', { n: raices.length - TOPE })}
            </button>
          )}
        </div>
      )}

      {/* El planificador de ESTA app, encima de las Misiones: sus tres menús
          (Metas · Planes · Cronograma) con las metas ya acotadas a la app. Se
          cierra y las Misiones siguen donde estaban. */}
      {planificando && (
        <div className="fixed inset-0 z-[60] flex bg-black/70" onClick={() => setPlanificando(null)}>
          <div
            className="ui-panel-glass ui-pop flex h-full w-full flex-col overflow-hidden backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* El título va a la derecha por lo mismo que en las Misiones: el
                header flotante de la casa (☰ + MPH) tapa esta esquina izquierda. */}
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
              <h2 className="ms-auto min-w-0 truncate text-sm font-bold">{t('cal.metas', 'Metas')}</h2>
              <button
                type="button"
                onClick={() => setPlanificando(null)}
                title={t('hoy.cerrar', 'Cerrar')}
                className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/20"
              >
                <Icono nombre="cerrar" />
              </button>
            </div>
            {/* El mismo contenedor que el `<main>` de `RoomOverlay`: el planificador
                ya no lleva scroll propio, así que sin esto el panel (que es
                `overflow-hidden`) recortaría todo lo que no cupiera. El
                `--safe-bottom` sí hace falta aquí: esto es `fixed inset-0`, o sea
                pegado al borde inferior de la pantalla. */}
            <div className="min-h-0 flex-1 overflow-auto p-4 pb-[calc(1rem+var(--safe-bottom))] md:p-6">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-10 text-sm text-white/50">
                    {t('ui.cargando', 'Cargando…')}
                  </div>
                }
              >
                <CronogramaApp plantillaId={plantillaId} metaInicial={planificando.metaId} />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
