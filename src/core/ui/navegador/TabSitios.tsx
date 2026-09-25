import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useShallow } from 'zustand/react/shallow'
import { useCategoriasWeb, useSitiosWeb, useVisitasEntre } from '../../data/repository'
import { db, type ObjetoCuarto, type SitioWeb } from '../../data/db'
import { MiniaturaModelo } from '../../house/Miniatura'
import { getTema } from '../../house/temas'
import { sitioDe } from '../../navegador/dominio'
import { esObjetoLibreria, useDiseño } from '../../state/disenoStore'
import { useT } from '../../i18n/useT'
import { iaOperativa } from '../../chat/ia'
import { categoriaDe, categoriaDeFabrica, categoriasVisibles, type CategoriaVisible } from '../../navegador/categoriasWeb'
import { clasificarSitiosIA } from '../../navegador/clasificarIA'
import { porSitio, rangoDe } from '../../navegador/estadisticas'
import { alternarFavorito, crearCategoria, fijarCategoria, fijarLimiteSitio } from '../../navegador/sitios'
import { useNavegador } from '../../state/navegadorStore'
import { pedirTexto } from '../../state/confirmarStore'
import { useArrastre } from '../comun/arrastre'
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
  /** Carpetas plegadas (por clave de categoría). De fábrica, todas abiertas. */
  const [plegadas, setPlegadas] = useState<Set<string>>(() => new Set())
  // Los objetos de la casa que llevan un enlace: salen junto a los sitios, en su carpeta.
  const enlaces = useDiseño(useShallow((s) => s.objetos.filter((o) => o.enlaceUrl && !esObjetoLibreria(o))))
  const setCarpetaObjeto = useDiseño((s) => s.setObjetoCarpetaWeb)
  const tema = getTema(useDiseño((s) => s.temaGlobal))

  const categorias = useMemo(() => categoriasVisibles(propias ?? [], t), [propias, t])
  const porClave = useMemo(() => new Map(categorias.map((c) => [c.clave, c])), [categorias])
  const segPorSitio = useMemo(() => new Map(porSitio(visitas ?? []).map((r) => [r.sitio, r.seg])), [visitas])

  const lista = useMemo(() => {
    const f = filtro.trim().toLowerCase()
    return (sitios ?? [])
      .filter((s) => (!soloFavoritos || s.favorito) && (!f || s.host.includes(f) || (s.nombre ?? '').toLowerCase().includes(f)))
      .sort((a, b) => (segPorSitio.get(b.host) ?? 0) - (segPorSitio.get(a.host) ?? 0) || a.host.localeCompare(b.host))
  }, [sitios, filtro, soloFavoritos, segPorSitio])

  const fichaPorHost = useMemo(() => new Map((sitios ?? []).map((s) => [s.host, s])), [sitios])

  const listaEnlaces = useMemo(() => {
    const f = filtro.trim().toLowerCase()
    if (soloFavoritos) return []
    return enlaces.filter((o) => !f || (o.enlaceUrl ?? '').toLowerCase().includes(f) || (o.nombre ?? '').toLowerCase().includes(f))
  }, [enlaces, filtro, soloFavoritos])

  /** Carpeta de un enlace de objeto: la suya o, si no la eligió, la de su dominio. */
  const carpetaDeEnlace = (o: ObjetoCuarto) => {
    if (o.carpetaWeb && porClave.has(o.carpetaWeb)) return o.carpetaWeb
    const host = sitioDe(o.enlaceUrl ?? '')
    return categoriaDe(host, fichaPorHost.get(host))
  }

  /**
   * Arrastrar un sitio (`s:<id>`) o un enlace de objeto (`o:<id>`) a otra
   * carpeta: el destino es la carpeta bajo el dedo, abierta o plegada.
   */
  const gesto = useArrastre<string>(
    (e) => document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-carpeta]')?.getAttribute('data-carpeta') ?? null,
    (mano, clave) => {
      const id = Number(mano.slice(2))
      if (mano.startsWith('s:')) void fijarCategoria(id, clave)
      else void setCarpetaObjeto(id, clave)
    },
  )

  /** Sitios y enlaces por carpeta, en el orden de las categorías («Otros» al final); sin vacías salvo al arrastrar. */
  const todas = categorias.map((c) => ({
    cat: c,
    sitios: lista.filter((s) => categoriaDe(s.host, s) === c.clave),
    enlaces: listaEnlaces.filter((o) => carpetaDeEnlace(o) === c.clave),
  }))
  const llena = (g: (typeof todas)[number]) => g.sitios.length > 0 || g.enlaces.length > 0
  // Mientras se arrastra, las vacías aparecen AL FINAL para poder soltar en
  // ellas sin que las de arriba se muevan bajo el dedo.
  const grupos = [...todas.filter(llena), ...(gesto.enMano != null ? todas.filter((g) => !llena(g)) : [])]

  const alternar = (clave: string) =>
    setPlegadas((p) => {
      const n = new Set(p)
      if (n.has(clave)) n.delete(clave)
      else n.add(clave)
      return n
    })

  const cambiarCarpetaEnlace = async (o: ObjetoCuarto, valor: string) => {
    if (o.id == null) return
    if (valor === NUEVA) {
      const nombre = await pedirTexto({
        titulo: t('nav.cat.nueva', 'Nueva categoría'),
        mensaje: t('nav.cat.nuevaExplica', 'Un nombre corto, como «Salud» o «Bancos».'),
        textoOk: t('nav.cat.crear', 'Crear'),
      })
      if (!nombre) return
      await setCarpetaObjeto(o.id, await crearCategoria(nombre))
      return
    }
    await setCarpetaObjeto(o.id, valor || null)
  }

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

      {sitios && lista.length === 0 && listaEnlaces.length === 0 && (
        <p className="px-1 py-6 text-center text-xs text-white/45">
          {soloFavoritos ? t('nav.sitios.sinFavoritos', 'Marca un sitio con la estrella para verlo aquí') : t('nav.sitios.vacio', 'Aún no hay sitios visitados')}
        </p>
      )}

      {/* Una carpeta por categoría, con los sitios visitados y los enlaces de tus objetos. */}
      <div className="space-y-1.5">
        {grupos.map(({ cat, sitios: deCat, enlaces: enlacesCat }) => {
          const abierta = !plegadas.has(cat.clave)
          const seg = deCat.reduce((n, s) => n + (segPorSitio.get(s.host) ?? 0), 0)
          return (
            <div
              key={cat.clave}
              data-carpeta={cat.clave}
              className={`rounded-xl border transition ${gesto.enMano && gesto.destino === cat.clave ? 'ring-2 ring-accent/70' : ''}`}
              style={{ borderColor: cat.color + '40', background: cat.color + '0d' }}
            >
              <button
                type="button"
                onClick={() => alternar(cat.clave)}
                aria-expanded={abierta}
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-start"
              >
                <span className="text-[10px] text-white/40">
                  <Icono nombre={abierta ? 'desplegado' : 'plegado'} />
                </span>
                <span style={{ color: cat.color }}>{cat.icono ? <Icono nombre={cat.icono} /> : <Icono emoji={cat.emoji} />}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold" style={{ color: cat.color }}>
                  {cat.nombre}
                </span>
                {seg > 0 && <span className="shrink-0 text-[10px] text-white/45">{formatoDuracion(seg, t)}</span>}
                <span className="shrink-0 text-[10px] text-white/35">{deCat.length + enlacesCat.length}</span>
              </button>
              {abierta && (
                <div className="space-y-0.5 px-1 pb-1">
                  {enlacesCat.map((o) => (
                    <div
                      key={'o-' + o.id}
                      {...gesto.props('o:' + o.id)}
                      className={`cursor-grab ${gesto.enMano === 'o:' + o.id ? 'opacity-40' : ''}`}
                    >
                    <FilaEnlaceObjeto
                      objeto={o}
                      tema={tema}
                      heredada={o.carpetaWeb && porClave.has(o.carpetaWeb) ? undefined : porClave.get(carpetaDeEnlace(o))}
                      categorias={categorias}
                      onAbrir={onAbrir}
                      onCarpeta={(v) => void cambiarCarpetaEnlace(o, v)}
                    />
                    </div>
                  ))}
                  {deCat.map((s) => (
                    <div
                      key={s.id}
                      {...gesto.props('s:' + s.id)}
                      className={`cursor-grab ${gesto.enMano === 's:' + s.id ? 'opacity-40' : ''}`}
                    >
                    <FilaSitio
                      sitio={s}
                      seg={segPorSitio.get(s.host) ?? 0}
                      categoria={porClave.get(categoriaDe(s.host, s))}
                      categorias={categorias}
                      onAbrir={onAbrir}
                      onCategoria={(v) => void cambiarCategoria(s, v)}
                    />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
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

/**
 * Enlace guardado en un objeto de la casa: su miniatura 3D, el nombre del
 * objeto y el dominio. Tiene su propia carpeta (`ObjetoCuarto.carpetaWeb`);
 * sin ella cae en la de su dominio, como los sitios.
 */
function FilaEnlaceObjeto({
  objeto: o,
  tema,
  heredada,
  categorias,
  onAbrir,
  onCarpeta,
}: {
  objeto: ObjetoCuarto
  tema: ReturnType<typeof getTema>
  /** Carpeta que le toca por su dominio (solo si el enlace no tiene una propia). */
  heredada: CategoriaVisible | undefined
  categorias: CategoriaVisible[]
  onAbrir: (url: string) => void
  onCarpeta: (valor: string) => void
}) {
  const t = useT()
  const url = o.enlaceUrl ?? ''
  const host = sitioDe(url)
  // Nombre de la página: el título con el que quedó en el historial; si nunca se
  // abrió en el navegador, el del sitio y, en último caso, el dominio.
  const pagina =
    useLiveQuery(async () => {
      const vista = await db.historialWeb.where('url').equals(url).first()
      if (vista?.titulo) return vista.titulo
      return (await db.sitiosWeb.where('host').equals(host).first())?.nombre ?? null
    }, [url, host]) || host
  // «Página / Objeto»; si el objeto se llama igual que la página (o no tiene nombre), solo la página.
  const titulo = o.nombre && o.nombre !== pagina ? `${pagina} / ${o.nombre}` : pagina
  return (
    <div className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-white/5">
      <button
        type="button"
        onClick={() => onAbrir(url)}
        title={t('nav.sitios.enlaceObjeto', 'Enlace de un objeto de tu casa')}
        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-black/25"
      >
        <MiniaturaModelo
          tipo={o.tipo}
          color={o.color}
          tema={tema}
          piezas={o.piezas}
          modeloGlb={o.modeloGlb}
          foto={o.foto}
          texto={o.texto}
          idObjeto={o.id}
          className="h-full w-full object-contain"
        />
        <span className="absolute bottom-0.5 end-0.5 grid h-4 w-4 place-items-center overflow-hidden rounded bg-black/60 text-[9px] leading-none">
          <FaviconSitio url={url} className="h-3 w-3" />
        </span>
      </button>
      <button type="button" onClick={() => onAbrir(url)} className="min-w-0 flex-1 text-start">
        <span className="block truncate text-xs text-white/85" title={titulo}>
          {titulo}
        </span>
        <span className="block truncate text-[10px] text-white/40">
          {host} · {t('nav.sitios.enObjeto', 'objeto de tu casa')}
        </span>
      </button>
      <select
        value={o.carpetaWeb && categorias.some((c) => c.clave === o.carpetaWeb) ? o.carpetaWeb : ''}
        onChange={(e) => onCarpeta(e.target.value)}
        aria-label={t('nav.sitios.categoria', 'Categoría')}
        className="max-w-28 shrink-0 rounded-lg border border-white/10 bg-black/30 px-1.5 py-1 text-[11px] text-white/80 outline-none"
      >
        <option value="">
          {t('nav.sitios.auto', 'Automática')}
          {heredada ? ` (${heredada.nombre})` : ''}
        </option>
        {categorias.map((c) => (
          <option key={c.clave} value={c.clave}>
            {c.emoji ? `${c.emoji} ` : ''}
            {c.nombre}
          </option>
        ))}
        <option value={NUEVA}>{t('nav.cat.nuevaOpcion', '+ Nueva categoría…')}</option>
      </select>
    </div>
  )
}
