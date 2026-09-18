import { useState } from 'react'
import { useHistorialWeb } from '../../data/repository'
import type { HistorialWeb } from '../../data/db'
import { fechaLocalISO } from '../../fechaLocal'
import { useT } from '../../i18n/useT'
import { hostDe } from '../../navegador/dominio'
import { borrarHistorial, borrarPagina } from '../../navegador/sitios'
import { useAjustes } from '../../state/ajustesStore'
import { confirmar } from '../../state/confirmarStore'
import { Icono } from '../iconos/Icono'
import { FaviconSitio } from './FaviconSitio'

const PAGINA = 100

/** ISO local de hoy y de ayer (fuera del componente: el reloj no es puro para el lint de React). */
function diasReferencia(): { hoy: string; ayer: string } {
  const ahora = Date.now()
  return { hoy: fechaLocalISO(new Date(ahora)), ayer: fechaLocalISO(new Date(ahora - 86_400_000)) }
}

/** Instante ISO de hace `dias` días (o el inicio del día de hoy con 0). */
function desdeHace(dias: number): string {
  if (dias === 0) return new Date(fechaLocalISO() + 'T00:00:00').toISOString()
  return new Date(Date.now() - dias * 86_400_000).toISOString()
}

/** Historial por página, agrupado por día; buscador y borrado por rango. */
export function TabHistorial({ onAbrir }: { onAbrir: (url: string) => void }) {
  const t = useT()
  const idioma = useAjustes((s) => s.idioma)
  const [filtro, setFiltro] = useState('')
  const [limite, setLimite] = useState(PAGINA)
  const [borrando, setBorrando] = useState(false)
  const filas = useHistorialWeb(filtro, limite)

  const { hoy, ayer } = diasReferencia()
  const etiquetaDia = (dia: string) =>
    dia === hoy
      ? t('nav.hist.hoy', 'Hoy')
      : dia === ayer
        ? t('nav.hist.ayer', 'Ayer')
        : new Date(dia + 'T12:00:00').toLocaleDateString(idioma, { weekday: 'short', day: 'numeric', month: 'short' })

  const grupos: { dia: string; filas: HistorialWeb[] }[] = []
  for (const h of filas ?? []) {
    const dia = fechaLocalISO(new Date(h.visto))
    const g = grupos[grupos.length - 1]
    if (g && g.dia === dia) g.filas.push(h)
    else grupos.push({ dia, filas: [h] })
  }

  const borrar = async (rango: 'hoy' | 'semana' | 'todo') => {
    const ok = await confirmar({
      titulo: t('nav.hist.borrarTitulo', 'Borrar historial'),
      mensaje:
        rango === 'hoy'
          ? t('nav.hist.borrarHoy', 'Se borran las páginas vistas hoy. Las visitas y el tiempo por sitio se conservan.')
          : rango === 'semana'
            ? t('nav.hist.borrarSemana', 'Se borran las páginas vistas en los últimos 7 días. Las visitas y el tiempo por sitio se conservan.')
            : t('nav.hist.borrarTodo', 'Se borra TODO el historial de páginas. Las visitas y el tiempo por sitio se conservan.'),
      textoOk: t('nav.hist.borrar', 'Borrar'),
      peligro: true,
    })
    if (!ok) return
    await borrarHistorial(rango === 'hoy' ? desdeHace(0) : rango === 'semana' ? desdeHace(6) : undefined)
    setBorrando(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-white/40">
          <Icono nombre="lupa" />
        </span>
        <input
          value={filtro}
          onChange={(e) => {
            setFiltro(e.target.value)
            setLimite(PAGINA)
          }}
          placeholder={t('nav.hist.buscar', 'Buscar en el historial…')}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-white/85 outline-none focus:border-white/30"
        />
        <div className="relative">
          <button
            type="button"
            onClick={() => setBorrando((v) => !v)}
            className="rounded-lg px-2 py-1 text-xs text-white/50 transition hover:bg-white/10 hover:text-white/85"
            title={t('nav.hist.borrarTitulo', 'Borrar historial')}
          >
            <Icono nombre="basura" />
          </button>
          {borrando && (
            <div className="ui-panel-glass absolute end-0 top-full z-10 mt-1 flex w-40 flex-col rounded-xl border border-white/10 p-1 shadow-xl">
              {(['hoy', 'semana', 'todo'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => void borrar(r)}
                  className="rounded-lg px-2 py-1.5 text-start text-xs text-white/80 transition hover:bg-white/10"
                >
                  {r === 'hoy'
                    ? t('nav.hist.rangoHoy', 'Lo de hoy')
                    : r === 'semana'
                      ? t('nav.hist.rangoSemana', 'Últimos 7 días')
                      : t('nav.hist.rangoTodo', 'Todo')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filas && filas.length === 0 && (
        <p className="px-1 py-6 text-center text-xs text-white/45">
          {filtro ? t('nav.hist.sinResultados', 'Nada coincide con la búsqueda') : t('nav.hist.vacio', 'Aún no hay páginas: abre una dirección desde el chat')}
        </p>
      )}

      {grupos.map((g) => (
        <div key={g.dia}>
          <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">{etiquetaDia(g.dia)}</p>
          <div className="space-y-0.5">
            {g.filas.map((h) => (
              <div key={h.id} className="group flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-white/5">
                <FaviconSitio url={h.url} />
                <button type="button" onClick={() => onAbrir(h.url)} className="min-w-0 flex-1 text-start" title={h.url}>
                  <span className="block truncate text-xs text-white/85">{h.titulo || hostDe(h.url)}</span>
                  <span className="block truncate text-[10px] text-white/40">
                    {hostDe(h.url)}
                    {h.veces > 1 ? ` · ×${h.veces}` : ''}
                  </span>
                </button>
                <span className="shrink-0 text-[10px] text-white/35">
                  {new Date(h.visto).toLocaleTimeString(idioma, { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  type="button"
                  onClick={() => h.id != null && void borrarPagina(h.id)}
                  className="shrink-0 rounded px-1 text-xs text-white/30 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-white/80"
                  title={t('nav.hist.quitar', 'Quitar del historial')}
                  aria-label={t('nav.hist.quitar', 'Quitar del historial')}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filas && filas.length >= limite && (
        <button
          type="button"
          onClick={() => setLimite((n) => n + PAGINA)}
          className="w-full rounded-lg py-1.5 text-xs text-white/50 transition hover:bg-white/10 hover:text-white/85"
        >
          {t('nav.hist.mas', 'Cargar más')}
        </button>
      )}
    </div>
  )
}
