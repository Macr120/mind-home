import { Icono } from '../../core/ui/iconos/Icono'
import { useState } from 'react'
import type { ItinerarioGuardado } from '../../core/data/db'
import { itinerariosGuardadosRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { BotonCompartir } from './BotonCompartir'
import { tablaItinerario } from './itinerarioTexto'

/** Tarjeta de solo lectura: la copia congelada de un itinerario guardado a mano. */
function TarjetaGuardado({ it }: { it: ItinerarioGuardado }) {
  const t = useT()
  const [confirmarBorrar, setConfirmarBorrar] = useState(false)
  const total = it.filas.reduce((s, f) => s + (f.presupuesto ?? 0), 0)
  const tabla = tablaItinerario(it.nombre, it.contexto, it.filas, total)

  const COLUMNAS = [
    t('sala.hoja.dia', 'Día'),
    t('sala.hoja.fecha', 'Fecha'),
    t('sala.hoja.inicio', 'Inicio'),
    t('sala.hoja.destino', 'Destino'),
    t('sala.hoja.hospedaje', 'Hospedaje'),
    t('sala.hoja.actividades', 'Actividades'),
    t('sala.hoja.transporte', 'Transporte'),
    t('sala.hoja.presupuesto', 'Presupuesto'),
  ]

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <header className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate font-bold"><Icono nombre="maleta" /> {it.nombre}</h3>
        <span className="text-[10px] text-white/35">{it.creadoEn.slice(0, 10)}</span>
      </header>
      {it.contexto && <p className="text-[11px] text-white/45">{it.contexto}</p>}

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[780px] border-collapse text-xs">
          <thead>
            <tr className="divide-x divide-white/5 border-b border-white/10 bg-white/5 text-left text-[10px] uppercase tracking-wider text-white/45">
              {COLUMNAS.map((c, i) => (
                <th key={i} className={`px-2 py-1.5 font-semibold ${i === 0 ? 'w-10 text-center' : ''} ${i === 7 ? 'text-right' : ''}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {it.filas.map((f, i) => (
              <tr key={i} className="divide-x divide-white/5">
                <td className="px-2 py-1.5 text-center font-bold text-teal-300">{f.dia}</td>
                <td className="px-2 py-1.5">{f.fecha ?? ''}</td>
                <td className="px-2 py-1.5">{f.inicio ?? ''}</td>
                <td className="px-2 py-1.5">{f.destino ?? ''}</td>
                <td className="px-2 py-1.5">{f.hospedaje ?? ''}</td>
                <td className="px-2 py-1.5">{f.actividades ?? ''}</td>
                <td className="px-2 py-1.5">{f.transporte ?? ''}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {f.presupuesto ? `$${f.presupuesto.toLocaleString()}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
          {total > 0 && (
            <tfoot>
              <tr className="border-t border-white/10 bg-white/5 text-xs font-bold">
                <td colSpan={7} className="px-2 py-1.5 text-right text-white/60">
                  {t('sala.hoja.total', 'Total')}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-teal-300">${total.toLocaleString()}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <BotonCompartir titulo={`✈️ ${it.nombre}`} texto={tabla} />
        {confirmarBorrar ? (
          <span className="flex items-center gap-1.5 text-xs">
            <span className="text-white/50">{t('sala.ig.confirmarBorrar', '¿Borrar este itinerario guardado?')}</span>
            <button
              onClick={() => it.id && void itinerariosGuardadosRepo.remove(it.id)}
              className="rounded-lg bg-red-500/20 px-2 py-1 font-semibold text-red-300 hover:bg-red-500/40"
            >
              {t('sala.hoja.si', 'Sí')}
            </button>
            <button
              onClick={() => setConfirmarBorrar(false)}
              className="rounded-lg bg-white/5 px-2 py-1 text-white/60 hover:bg-white/15"
            >
              {t('sala.hoja.no', 'No')}
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmarBorrar(true)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/50 transition hover:bg-white/15 hover:text-red-300"
          >
            <Icono nombre="basura" /> {t('sala.ig.borrar', 'Borrar')}
          </button>
        )}
      </div>
    </div>
  )
}

/** Submenú "Itinerarios guardados": copias que el usuario archivó a mano, independientes del lugar de origen. */
export function ItinerariosGuardadosTab() {
  const t = useT()
  const guardados = itinerariosGuardadosRepo.useAll() ?? []

  if (guardados.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        {t('sala.ig.vacio', 'Aún no guardas ningún itinerario. Desde el plan de un lugar, toca «💾 Guardar».')}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {guardados.map((it) => (
        <TarjetaGuardado key={it.id} it={it} />
      ))}
    </div>
  )
}
