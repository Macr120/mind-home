import { useEffect, useMemo, useState } from 'react'
import { PestanasCarpeta } from '../../../rooms/_shared/PestanasCarpeta'
import { useCategoriasWeb, useSitiosWeb, useVisitasEntre } from '../../data/repository'
import { useT } from '../../i18n/useT'
import { categoriaDe, categoriasVisibles } from '../../navegador/categoriasWeb'
import { porCategoria, porHoraDia, porSitio, rangoDe, totalSeg, variacion, type EnCurso, type Periodo } from '../../navegador/estadisticas'
import { useNavegador } from '../../state/navegadorStore'
import { Icono } from '../iconos/Icono'
import { FaviconSitio } from './FaviconSitio'
import { RejillaHoras } from './RejillaHoras'
import { formatoDuracion } from './util'

/** El reloj, fuera del componente: el lint de pureza de React no deja llamarlo en render. */
const ahoraMs = () => Date.now()

/** Tiempo navegado: total y variación, por categoría, top de sitios y rejilla hora × día. */
export function TabTiempo({ onAbrir }: { onAbrir: (url: string) => void }) {
  const t = useT()
  const [periodo, setPeriodo] = useState<Periodo>('semana')
  // Se refresca cada 30 s: la visita abierta suma segundos vivos y el día puede cambiar.
  const [ahora, setAhora] = useState(ahoraMs)
  useEffect(() => {
    const id = setInterval(() => setAhora(ahoraMs()), 30_000)
    return () => clearInterval(id)
  }, [])
  const rango = useMemo(() => rangoDe(periodo, new Date(ahora)), [periodo, ahora])
  const visitas = useVisitasEntre(rango.desde.toISOString(), rango.hasta.toISOString())
  const anteriores = useVisitasEntre(rango.desdeAnterior.toISOString(), rango.hastaAnterior.toISOString())
  const sitios = useSitiosWeb()
  const propias = useCategoriasWeb()
  const visita = useNavegador((s) => s.visita)

  const enCurso = useMemo<EnCurso | null>(() => {
    if (!visita || visita.id == null) return null
    const abierto = visita.desde == null ? 0 : Math.max(0, ahora - visita.desde) / 1000
    return { id: visita.id, seg: Math.round(visita.acumulado + abierto) }
  }, [visita, ahora])

  const categorias = useMemo(() => categoriasVisibles(propias ?? [], t), [propias, t])
  const porClave = useMemo(() => new Map(categorias.map((c) => [c.clave, c])), [categorias])
  const fichas = useMemo(() => new Map((sitios ?? []).map((s) => [s.host, s])), [sitios])
  const claveDe = (sitio: string) => categoriaDe(sitio, fichas.get(sitio))

  const total = totalSeg(visitas ?? [], enCurso)
  const totalAnterior = totalSeg(anteriores ?? [])
  const delta = variacion(total, totalAnterior)
  const cats = useMemo(() => porCategoria(visitas ?? [], claveDe, enCurso), [visitas, enCurso, fichas]) // eslint-disable-line react-hooks/exhaustive-deps -- claveDe depende de `fichas`
  const top = useMemo(() => porSitio(visitas ?? [], enCurso).slice(0, 10), [visitas, enCurso])
  const rejilla = useMemo(() => porHoraDia(visitas ?? [], enCurso), [visitas, enCurso])
  const maxCat = Math.max(1, ...cats.map((c) => c.seg))
  const maxSitio = Math.max(1, ...top.map((s) => s.seg))
  const colorRejilla = (cats[0] && porClave.get(cats[0].clave)?.color) || '#60a5fa'

  return (
    <div className="space-y-3">
      <PestanasCarpeta
        variante="sub"
        flecha={false}
        prefijoClave="nav.periodo"
        items={[
          { id: 'hoy', labelEs: 'Hoy' },
          { id: 'semana', labelEs: '7 días' },
          { id: 'mes', labelEs: '30 días' },
        ]}
        activo={periodo}
        onCambio={setPeriodo}
      />

      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
        <p className="text-[11px] text-white/45">{t('nav.tiempo.total', 'Tiempo en internet')}</p>
        <p className="text-lg font-black text-white/90">{formatoDuracion(total, t)}</p>
        <p className="text-[11px] text-white/45">
          {delta == null
            ? t('nav.tiempo.sinAnterior', 'Sin periodo anterior con el que comparar')
            : delta > 0
              ? t('nav.tiempo.mas', '{p} % más que el periodo anterior', { p: Math.round(delta * 100) })
              : delta < 0
                ? t('nav.tiempo.menos', '{p} % menos que el periodo anterior', { p: Math.round(-delta * 100) })
                : t('nav.tiempo.igual', 'Igual que el periodo anterior')}
        </p>
      </div>

      {total === 0 && (
        <p className="px-1 py-4 text-center text-xs text-white/45">{t('nav.tiempo.vacio', 'Sin tiempo registrado en este periodo')}</p>
      )}

      {cats.length > 0 && (
        <section>
          <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-white/35">{t('nav.tiempo.porCategoria', 'Por categoría')}</p>
          <div className="space-y-1">
            {cats.map((c) => {
              const cat = porClave.get(c.clave)
              return (
                <div key={c.clave} className="flex items-center gap-2 px-1">
                  <span className="w-5 shrink-0 text-center text-sm">
                    {cat?.emoji ? <Icono emoji={cat.emoji} /> : <Icono nombre={cat?.icono ?? 'etiqueta'} />}
                  </span>
                  <span className="w-24 shrink-0 truncate text-[11px] text-white/75">{cat?.nombre ?? c.clave}</span>
                  <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(2, (c.seg / maxCat) * 100)}%`, backgroundColor: cat?.color ?? '#94a3b8' }} />
                  </div>
                  <span className="w-16 shrink-0 text-end text-[11px] text-white/60">{formatoDuracion(c.seg, t)}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {top.length > 0 && (
        <section>
          <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-white/35">{t('nav.tiempo.topSitios', 'Sitios con más tiempo')}</p>
          <div className="space-y-0.5">
            {top.map((s) => (
              <button
                key={s.sitio}
                type="button"
                onClick={() => onAbrir(`https://${s.sitio}`)}
                className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-start transition hover:bg-white/5"
              >
                <FaviconSitio url={`https://${s.sitio}`} />
                <span className="w-32 shrink-0 truncate text-xs text-white/85">{s.sitio}</span>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(2, (s.seg / maxSitio) * 100)}%`, backgroundColor: porClave.get(claveDe(s.sitio))?.color ?? '#94a3b8' }}
                  />
                </div>
                <span className="w-16 shrink-0 text-end text-[11px] text-white/60">{formatoDuracion(s.seg, t)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {total > 0 && (
        <section>
          <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-white/35">{t('nav.tiempo.porHora', 'Cuándo navegas')}</p>
          <RejillaHoras datos={rejilla} color={colorRejilla} />
        </section>
      )}
    </div>
  )
}
