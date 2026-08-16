import { useState } from 'react'
import type { Rutina } from '../../data/db'
import type { EventoResuelto } from '../../eventosApps'
import { useCalendarioFiltro } from '../../state/calendarioFiltroStore'
import { useGruposPlantilla, nombreCarpeta } from '../../state/gruposPlantillaStore'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { vivo } from '../estilos'
import { gruposDeApps } from './apps'

/**
 * Filtro del calendario por app, agrupado en las MISMAS carpetas que el catálogo
 * de plantillas: la organización de las apps se decide en un solo sitio (el menú
 * Funciones) y aquí solo se lee.
 *
 * Una carpeta entera se enciende de un toque, y con varias encendidas el
 * calendario, las metas, los planes y el cronograma solo enseñan lo suyo.
 *
 * Recibe las rutinas y eventos SIN filtrar: si le llegaran ya filtrados, apagar
 * una app la borraría de su propia lista y no habría manera de volver a encenderla.
 */
export function FiltroApps({
  rutinas,
  eventos,
}: {
  rutinas: Rutina[]
  eventos: Map<string, EventoResuelto[]>
}) {
  const t = useT()
  const [abierto, setAbierto] = useState(false)
  const apps = useCalendarioFiltro((s) => s.apps)
  const alternar = useCalendarioFiltro((s) => s.alternar)
  const alternarCategoria = useCalendarioFiltro((s) => s.alternarCategoria)
  const limpiar = useCalendarioFiltro((s) => s.limpiar)

  const carpetas = useGruposPlantilla((s) => s.grupos)
  const grupos = gruposDeApps(rutinas, eventos, carpetas, {
    casa: t('cal.filtro.casa', 'De la casa'),
    otras: t('cal.filtro.otras', 'Otras'),
  })

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
          apps.size > 0
            ? 'border-amber-400/50 bg-amber-500/15 text-amber-300'
            : 'border-white/15 text-white/60 hover:bg-white/10'
        }`}
      >
        <Icono nombre="filtro" />
        {t('cal.filtro.titulo', 'Filtrar')}
        {apps.size > 0 && <span className="tabular-nums">{apps.size}</span>}
      </button>

      {abierto && (
        <>
          {/* Capta el clic de fuera para cerrar, sin tapar el calendario. */}
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div className="ui-panel-glass absolute end-0 z-50 mt-1 max-h-[60vh] w-60 overflow-y-auto rounded-xl border border-white/10 p-2 shadow-xl backdrop-blur-md">
            <button
              type="button"
              onClick={limpiar}
              className={`mb-1.5 w-full rounded-lg px-2 py-1 text-start text-[11px] font-bold transition ${
                apps.size === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'text-white/55 hover:bg-white/10'
              }`}
            >
              {t('cal.filtro.todas', 'Todas')}
            </button>
            {grupos.map((g) => {
              const ids = g.apps.map((a) => a.id)
              // La carpeta se pinta encendida solo con TODAS sus apps dentro del
              // filtro: a medias, lo que manda es cada app y decir «carpeta activa»
              // sería mentira. Un toque completa la carpeta; otro la vacía.
              const todas = ids.every((id) => apps.has(id))
              const algunas = !todas && ids.some((id) => apps.has(id))
              return (
                <div key={g.id} className="mb-1.5">
                  <button
                    type="button"
                    onClick={() => alternarCategoria(ids)}
                    title={
                      todas
                        ? t('cal.filtro.carpetaQuitar', 'Quitar esta carpeta del filtro')
                        : t('cal.filtro.carpetaSolo', 'Ver solo lo de esta carpeta')
                    }
                    className={`flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-start text-[10px] font-bold uppercase tracking-wider transition ${
                      todas
                        ? 'bg-amber-500/15 text-amber-300'
                        : algunas
                          ? 'text-white/70 hover:text-white/90'
                          : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {g.emoji && <Icono emoji={g.emoji} />}
                    <span className="min-w-0 flex-1 truncate">{nombreCarpeta(t, g.nombre)}</span>
                    {/* A medias, el conteo dice cuánto de la carpeta está encendido. */}
                    {algunas && (
                      <span className="shrink-0 tabular-nums text-white/35">
                        {ids.filter((id) => apps.has(id)).length}/{ids.length}
                      </span>
                    )}
                    {todas && (
                      <span className="shrink-0">
                        <Icono nombre="confirmar" />
                      </span>
                    )}
                  </button>
                  <div className="space-y-0.5">
                    {g.apps.map((a) => {
                      const activa = apps.has(a.id)
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => alternar(a.id)}
                          className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-start text-xs transition ${
                            activa ? 'bg-white/15' : 'hover:bg-white/5'
                          }`}
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
                          <span
                            className={`min-w-0 flex-1 truncate ${activa ? 'font-bold texto-vivo' : 'text-white/70'}`}
                            style={activa ? vivo(a.color) : undefined}
                          >
                            <Icono emoji={a.icon} /> {t(`room.${a.id}.nombre`, a.nombre).split(' · ')[0]}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
