import { useState } from 'react'
import type { Rutina } from '../../data/db'
import type { EventoResuelto } from '../../eventosApps'
import { useCalendarioFiltro } from '../../state/calendarioFiltroStore'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { vivo } from '../estilos'
import { CASA, gruposDeApps, type CategoriaCal } from './apps'

/** Etiqueta de cada grupo; las de categoría ya existen para el menú de cuartos. */
const CLAVE_CATEGORIA: Record<CategoriaCal, [string, string]> = {
  cuerpo: ['cat.cuerpo', 'Cuerpo'],
  mente: ['cat.mente', 'Mente'],
  complemento: ['cat.complemento', 'Complemento'],
  [CASA]: ['cal.filtro.casa', 'De la casa'],
}

/**
 * Filtro del calendario por app. Recibe las rutinas y eventos SIN filtrar: si le
 * llegaran ya filtrados, apagar una app la borraría de su propia lista y no
 * habría manera de volver a encenderla.
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

  const grupos = gruposDeApps(rutinas, eventos, t('cal.filtro.casa', 'De la casa'))

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
          <div className="ui-panel-glass absolute right-0 z-50 mt-1 max-h-[60vh] w-60 overflow-y-auto rounded-xl border border-white/10 p-2 shadow-xl backdrop-blur-md">
            <button
              type="button"
              onClick={limpiar}
              className={`mb-1.5 w-full rounded-lg px-2 py-1 text-left text-[11px] font-bold transition ${
                apps.size === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'text-white/55 hover:bg-white/10'
              }`}
            >
              {t('cal.filtro.todas', 'Todas')}
            </button>
            {grupos.map((g) => {
              const ids = g.apps.map((a) => a.id)
              return (
                <div key={g.categoria} className="mb-1.5">
                  <button
                    type="button"
                    onClick={() => alternarCategoria(ids)}
                    className="w-full px-1 py-0.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/40 transition hover:text-white/70"
                  >
                    {t(...CLAVE_CATEGORIA[g.categoria])}
                  </button>
                  <div className="space-y-0.5">
                    {g.apps.map((a) => {
                      const activa = apps.has(a.id)
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => alternar(a.id)}
                          className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs transition ${
                            activa ? 'bg-white/15' : 'hover:bg-white/5'
                          }`}
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
                          <span
                            className={`min-w-0 flex-1 truncate ${activa ? 'font-bold texto-vivo' : 'text-white/70'}`}
                            style={activa ? vivo(a.color) : undefined}
                          >
                            <Icono emoji={a.icon} /> {a.nombre}
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
