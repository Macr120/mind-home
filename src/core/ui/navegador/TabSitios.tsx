import { useMemo, useState } from 'react'
import { useCategoriasWeb, useSitiosWeb, useVisitasEntre } from '../../data/repository'
import type { SitioWeb } from '../../data/db'
import { useT } from '../../i18n/useT'
import { iaOperativa } from '../../chat/ia'
import { categoriaDe, categoriaDeFabrica, categoriasVisibles, type CategoriaVisible } from '../../navegador/categoriasWeb'
import { clasificarSitiosIA } from '../../navegador/clasificarIA'
import { porSitio, rangoDe } from '../../navegador/estadisticas'
import { alternarFavorito, crearCategoria, fijarCategoria, fijarLimiteSitio } from '../../navegador/sitios'
import { useNavegador } from '../../state/navegadorStore'
import { pedirTexto } from '../../state/confirmarStore'
import { Icono } from '../iconos/Icono'
import { FaviconSitio } from './FaviconSitio'
import { formatoDuracion } from './util'

const NUEVA = '__nueva'

/** Los sitios visitados: minutos de la semana, categoría (editable), favorito. */
export function TabSitios({ onAbrir }: { onAbrir: (url: string) => void }) {
  const t = useT()
  const sitios = useSitiosWeb()
  const propias = useCategoriasWeb()
  const rango = useMemo(() => rangoDe('semana'), [])
  const visitas = useVisitasEntre(rango.desde.toISOString(), rango.hasta.toISOString())
  const [filtro, setFiltro] = useState('')
  const [soloFavoritos, setSoloFavoritos] = useState(false)
  const [clasificando, setClasificando] = useState(false)
  const [avisoIA, setAvisoIA] = useState<string | null>(null)

  const categorias = useMemo(() => categoriasVisibles(propias ?? [], t), [propias, t])
  const porClave = useMemo(() => new Map(categorias.map((c) => [c.clave, c])), [categorias])
  const segPorSitio = useMemo(() => new Map(porSitio(visitas ?? []).map((r) => [r.sitio, r.seg])), [visitas])

  const lista = useMemo(() => {
    const f = filtro.trim().toLowerCase()
    return (sitios ?? [])
      .filter((s) => (!soloFavoritos || s.favorito) && (!f || s.host.includes(f) || (s.nombre ?? '').toLowerCase().includes(f)))
      .sort((a, b) => (segPorSitio.get(b.host) ?? 0) - (segPorSitio.get(a.host) ?? 0) || a.host.localeCompare(b.host))
  }, [sitios, filtro, soloFavoritos, segPorSitio])

  /** Sitios que ni el usuario ni el diccionario han clasificado: candidatos para la IA. */
  const sinClasificar = useMemo(() => (sitios ?? []).filter((s) => !s.categoria && !categoriaDeFabrica(s.host)), [sitios])

  const cambiarCategoria = async (s: SitioWeb, valor: string) => {
    if (s.id == null) return
    if (valor === NUEVA) {
      const nombre = await pedirTexto({
        titulo: t('nav.cat.nueva', 'Nueva categoría'),
        mensaje: t('nav.cat.nuevaExplica', 'Un nombre corto, como «Salud» o «Bancos».'),
        textoOk: t('nav.cat.crear', 'Crear'),
      })
      if (!nombre) return
      const clave = await crearCategoria(nombre)
      await fijarCategoria(s.id, clave)
      return
    }
    await fijarCategoria(s.id, valor || undefined)
  }

  const clasificar = async () => {
    setClasificando(true)
    setAvisoIA(null)
    try {
      const n = await clasificarSitiosIA(
        sinClasificar.map((s) => s.host),
        categorias.map((c) => ({ clave: c.clave, nombre: c.nombre })),
      )
      setAvisoIA(t('nav.sitios.iaListo', 'La IA clasificó {n} sitios; puedes corregir cualquiera.', { n }))
    } catch (e) {
      setAvisoIA(e instanceof Error ? e.message : t('nav.sitios.iaError', 'La IA no pudo clasificar ahora.'))
    } finally {
      setClasificando(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-white/40">
          <Icono nombre="lupa" />
        </span>
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder={t('nav.sitios.buscar', 'Buscar un sitio…')}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-white/85 outline-none focus:border-white/30"
        />
        <button
          type="button"
          onClick={() => setSoloFavoritos((v) => !v)}
          aria-pressed={soloFavoritos}
          className={`rounded-lg px-2 py-1 text-xs transition hover:bg-white/10 ${soloFavoritos ? 'bg-white/15 text-amber-300' : 'text-white/50'}`}
          title={t('nav.sitios.soloFavoritos', 'Solo favoritos')}
        >
          <Icono nombre="estrella" />
        </button>
      </div>

      {iaOperativa() && sinClasificar.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/10 px-2 py-1.5">
          <span className="text-violet-300">
            <Icono nombre="brillo" />
          </span>
          <span className="min-w-0 flex-1 text-[11px] text-white/70">
            {t('nav.sitios.iaOferta', '{n} sitios sin categoría', { n: sinClasificar.length })}
          </span>
          <button
            type="button"
            disabled={clasificando}
            onClick={() => void clasificar()}
            className="shrink-0 rounded-lg bg-violet-400/20 px-2 py-1 text-[11px] font-semibold text-violet-200 transition hover:bg-violet-400/30 disabled:opacity-50"
          >
            {clasificando ? t('nav.sitios.iaClasificando', 'Clasificando…') : t('nav.sitios.iaBoton', 'Clasificar con IA')}
          </button>
        </div>
      )}
      {avisoIA && <p className="px-1 text-[11px] text-white/60">{avisoIA}</p>}

      {sitios && lista.length === 0 && (
        <p className="px-1 py-6 text-center text-xs text-white/45">
          {soloFavoritos ? t('nav.sitios.sinFavoritos', 'Marca un sitio con la estrella para verlo aquí') : t('nav.sitios.vacio', 'Aún no hay sitios visitados')}
        </p>
      )}

      <div className="space-y-0.5">
        {lista.map((s) => (
          <FilaSitio
            key={s.id}
            sitio={s}
            seg={segPorSitio.get(s.host) ?? 0}
            categoria={porClave.get(categoriaDe(s.host, s))}
            categorias={categorias}
            onAbrir={onAbrir}
            onCategoria={(v) => void cambiarCategoria(s, v)}
          />
        ))}
      </div>
    </div>
  )
}

function FilaSitio({
  sitio,
  seg,
  categoria,
  categorias,
  onAbrir,
  onCategoria,
}: {
  sitio: SitioWeb
  seg: number
  categoria: CategoriaVisible | undefined
  categorias: CategoriaVisible[]
  onAbrir: (url: string) => void
  onCategoria: (valor: string) => void
}) {
  const t = useT()
  const excedido = useNavegador((s) => s.excedidos.includes(`sitio:${sitio.host}`))
  const limite = async () => {
    if (sitio.id == null) return
    const v = await pedirTexto({
      titulo: t('nav.sitios.limite', 'Límite diario'),
      mensaje: t('nav.sitios.limiteExplica', 'Minutos al día en {h}; 0 lo quita. El asistente avisa al pasarlo (no bloquea).', { h: sitio.host }),
      valor: sitio.limiteMin ? String(sitio.limiteMin) : '',
      textoOk: t('ui.guardar', 'Guardar'),
    })
    if (v == null) return
    const n = Math.round(Number(v))
    await fijarLimiteSitio(sitio.id, Number.isFinite(n) && n > 0 ? n : undefined)
  }
  return (
    <div className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-white/5">
      <FaviconSitio url={`https://${sitio.host}`} />
      <button type="button" onClick={() => onAbrir(`https://${sitio.host}`)} className="min-w-0 flex-1 text-start">
        <span className="block truncate text-xs text-white/85">{sitio.nombre || sitio.host}</span>
        <span className="block truncate text-[10px] text-white/40">
          {seg > 0 ? `${formatoDuracion(seg, t)} · ${t('nav.sitios.estaSemana', 'esta semana')}` : t('nav.sitios.sinTiempo', 'sin tiempo esta semana')}
          {sitio.porIA ? ` · ${t('nav.sitios.porIA', 'IA')}` : ''}
          {sitio.limiteMin ? (
            <span className={excedido ? 'text-red-300' : ''}>
              {' · '}
              {t('nav.sitios.limiteBadge', 'límite {n} min', { n: sitio.limiteMin })}
            </span>
          ) : null}
        </span>
      </button>
      <button
        type="button"
        onClick={() => void limite()}
        className={`shrink-0 rounded px-1 text-sm transition hover:bg-white/10 ${sitio.limiteMin ? (excedido ? 'text-red-300' : 'text-white/70') : 'text-white/25 hover:text-white/70'}`}
        title={t('nav.sitios.limite', 'Límite diario')}
        aria-label={t('nav.sitios.limite', 'Límite diario')}
      >
        <Icono nombre="cronometro" />
      </button>
      {/* La categoría: «automática» sigue al diccionario; elegir una la fija. */}
      <select
        value={sitio.categoria ?? ''}
        onChange={(e) => onCategoria(e.target.value)}
        aria-label={t('nav.sitios.categoria', 'Categoría')}
        className="max-w-28 shrink-0 rounded-lg border border-white/10 bg-black/30 px-1.5 py-1 text-[11px] text-white/80 outline-none"
        style={categoria ? { borderColor: categoria.color + '80' } : undefined}
      >
        <option value="">
          {t('nav.sitios.auto', 'Automática')}
          {categoria ? ` (${categoria.nombre})` : ''}
        </option>
        {categorias.map((c) => (
          <option key={c.clave} value={c.clave}>
            {c.emoji ? `${c.emoji} ` : ''}
            {c.nombre}
          </option>
        ))}
        <option value={NUEVA}>{t('nav.cat.nuevaOpcion', '+ Nueva categoría…')}</option>
      </select>
      <button
        type="button"
        onClick={() => sitio.id != null && void alternarFavorito(sitio.id)}
        aria-pressed={!!sitio.favorito}
        className={`shrink-0 rounded px-1 text-sm transition hover:bg-white/10 ${sitio.favorito ? 'text-amber-300' : 'text-white/25 hover:text-white/70'}`}
        title={sitio.favorito ? t('nav.sitios.quitarFavorito', 'Quitar de favoritos') : t('nav.sitios.favorito', 'Marcar favorito')}
      >
        <Icono nombre="estrella" />
      </button>
    </div>
  )
}
