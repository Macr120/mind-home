import { useEffect, useRef, useState } from 'react'
import {
  buscarCriptos,
  cargarAcciones,
  cargarAccionesMercado,
  cargarCriptos,
  cargarCriptosPropias,
  cargarDivisas,
  cargarDivisasPropias,
  cargarMateriasPrimas,
  getFinnhubKey,
  setFinnhubKey,
  CATALOGO_DIVISAS,
  MATERIAS_PRIMAS,
  type AccionMercado,
  type CotizacionesMap,
  type Cripto,
  type Divisa,
  type MateriaPrima,
  type ResultadoBusquedaCripto,
} from './mercados'
import { VACIO, watchlistRepo } from '../../core/data/repository'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { vivo } from '../../core/ui/estilos'
import { ROJO, VERDE } from './ui'

export type SeccionMercado = 'divisas' | 'criptos' | 'acciones' | 'commodities'

const locale = localeActual

/** Tasa de cambio: 2–4 decimales según haga falta. */
const fmtTasa = (n: number) =>
  n.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 4 })

/**
 * Precio SIN el prefijo de moneda: la columna cabe mucho mejor y el «· USD» ya
 * va en la cabecera de la sección (igual que en CoinGecko).
 */
const fmtPrecio = (n: number) =>
  n.toLocaleString(locale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: n < 1 ? 6 : 2,
  })

/**
 * Capitalización en notación compacta del idioma activo: `Intl` resuelve solo la
 * trampa de que «billón» es 10¹² en español y 10⁹ en inglés.
 */
const fmtCap = (n: number) =>
  n.toLocaleString(locale(), { notation: 'compact', maximumFractionDigits: 2 })

const fmtPct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}%`

export function MercadosTab({ seccion }: { seccion: SeccionMercado }) {
  if (seccion === 'divisas') return <SeccionDivisas />
  if (seccion === 'criptos') return <SeccionCriptos />
  if (seccion === 'acciones') return <SeccionAcciones />
  return <SeccionCommodities />
}

// ----- Piezas compartidas -----

interface FilaTabla {
  clave: string
  principal: string
  secundario?: string
  historial?: number[]
  precio: string
  cambioPct: number
  /** Última columna: capitalización, variación de 30 días o el ETF que replica. */
  extra?: string
  /** Solo en listas propias del usuario: quitarla de su seguimiento. */
  onQuitar?: () => void
}

/**
 * Tabla de un mercado al estilo CoinGecko: encabezados de columna, números
 * alineados a la derecha y la gráfica como columna FLEXIBLE — al estrecharse la
 * pantalla se encoge la gráfica en vez de romperse la fila. Las columnas fijas
 * suman ~296 px, así que entra en un móvil de 375 px con la gráfica reducida.
 */
function TablaMercado({
  filas,
  etiquetaGrafica,
  etiquetaExtra,
  sufijoCambio,
}: {
  filas: FilaTabla[]
  /** Cabecera de la columna de gráfica; sin valor, no hay gráfica (materias primas). */
  etiquetaGrafica?: string
  /** Cabecera de la última columna; sin valor, no se dibuja. */
  etiquetaExtra?: string
  sufijoCambio?: string
}) {
  const t = useT()
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Encabezado */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 text-[10px] uppercase tracking-wide text-white/40">
        <span className="w-4 shrink-0">#</span>
        <span className="w-20 shrink-0">{t('despacho.mk.col.activo', 'Activo')}</span>
        <span className="min-w-0 flex-1">{etiquetaGrafica ?? ''}</span>
        <span className="w-20 shrink-0 text-right">{t('despacho.mk.col.precio', 'Precio')}</span>
        <span className="w-14 shrink-0 text-right">{sufijoCambio ?? t('despacho.mk.col.dia', 'Día')}</span>
        {etiquetaExtra && <span className="w-16 shrink-0 text-right">{etiquetaExtra}</span>}
      </div>

      {filas.map((f, i) => {
        const sube = f.cambioPct >= 0
        return (
          <div
            key={f.clave}
            className="flex items-center gap-2 px-3 py-2 border-b border-white/5 last:border-0 hover:bg-white/5 transition"
          >
            <span className="w-4 shrink-0 text-[11px] text-white/30">{i + 1}</span>
            <span className="w-20 shrink-0 min-w-0 leading-tight">
              <span className="block text-xs font-bold truncate">{f.principal}</span>
              {f.secundario && <span className="block text-[10px] text-white/40 truncate">{f.secundario}</span>}
            </span>
            <span className="min-w-0 flex-1">
              {f.historial && f.historial.length > 1 && (
                <Sparkline valores={f.historial} color={sube ? VERDE : ROJO} />
              )}
            </span>
            <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums">{f.precio}</span>
            <span
              className="texto-vivo w-14 shrink-0 text-right text-xs font-medium tabular-nums"
              style={vivo(sube ? VERDE : ROJO)}
            >
              {fmtPct(f.cambioPct)}
            </span>
            {etiquetaExtra && (
              <span className="w-16 shrink-0 text-right text-[11px] text-white/55 tabular-nums truncate">
                {f.extra ?? '—'}
              </span>
            )}
            {f.onQuitar && (
              <button
                onClick={f.onQuitar}
                className="shrink-0 text-white/30 hover:text-white/70 px-1"
                title={t('chat.eliminar', 'Eliminar')}
              >
                <Icono nombre="cerrar" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Encabezado({ icono, titulo, nota }: { icono: NombreIcono; titulo: string; nota?: string }) {
  return (
    <p className="text-sm font-semibold">
      <Icono nombre={icono} /> {titulo}
      {nota && <span className="text-xs font-normal text-white/40"> · {nota}</span>}
    </p>
  )
}

function Pie({
  fuente,
  cargando,
  onActualizar,
}: {
  fuente: string
  cargando: boolean
  onActualizar: () => void
}) {
  const t = useT()
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] text-white/40">
      <span>{fuente}</span>
      <button
        onClick={onActualizar}
        disabled={cargando}
        className="shrink-0 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 transition disabled:opacity-50"
      >
        <Icono emoji="🔄" /> {cargando ? t('despacho.mk.cargandoBtn', 'Cargando…') : t('despacho.mk.actualizar', 'Actualizar')}
      </button>
    </div>
  )
}

function Estado({ cargando, onReintentar }: { cargando: boolean; onReintentar: () => void }) {
  const t = useT()
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-center text-sm text-white/55">
      {cargando ? (
        t('despacho.mk.cargando', 'Cargando mercados…')
      ) : (
        <>
          <p>{t('despacho.mk.error', 'No se pudo conectar a las fuentes de mercados. Revisa tu internet.')}</p>
          <button
            onClick={onReintentar}
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold texto-cta hover:brightness-110 transition"
          >
            {t('despacho.mk.reintentar', 'Reintentar')}
          </button>
        </>
      )}
    </div>
  )
}

function AvisoCache() {
  const t = useT()
  return (
    <p className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-300">
      <Icono nombre="alerta" /> {t('despacho.mk.cacheAviso', 'Sin conexión con alguna fuente — mostrando últimos datos guardados.')}
    </p>
  )
}

/**
 * Hook común: carga, refresco forzado y estado de error de una sección.
 * `cargando` arranca en true y solo se vuelve a encender desde `actualizar()`:
 * nada de setState síncrono dentro del efecto (dispara renders en cascada).
 */
function useMercado<T>(cargar: (forzar: boolean) => Promise<{ datos: T[]; error: boolean }>) {
  const [datos, setDatos] = useState<T[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let vivo = true
    void cargar(tick > 0)
      .then((r) => {
        if (!vivo) return
        setDatos(r.datos)
        setError(r.error)
      })
      // Un rechazo inesperado debe VERSE como error, no dejar el spinner girando.
      .catch(() => {
        if (vivo) setError(true)
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  return {
    datos,
    cargando,
    error,
    tick,
    actualizar: () => {
      setCargando(true)
      setTick((n) => n + 1)
    },
  }
}

// ----- Divisas -----

function SeccionDivisas() {
  const t = useT()
  const { datos, cargando, error, actualizar, tick } = useMercado<Divisa>(cargarDivisas)

  if (datos.length === 0) return <Estado cargando={cargando} onReintentar={actualizar} />

  return (
    <div className="space-y-3">
      {error && <AvisoCache />}
      <Encabezado icono="divisas" titulo={t('despacho.mk.divisas', 'Divisas')} nota={t('despacho.mk.top10pares', 'los 10 pares más operados')} />
      <TablaMercado
        etiquetaGrafica={t('despacho.mk.dias30', '30 días')}
        etiquetaExtra={t('despacho.mk.col.30d', '30 d')}
        filas={datos.map((d) => ({
          clave: `${d.base}/${d.destino}`,
          principal: `${d.base}/${d.destino}`,
          historial: d.historial,
          precio: fmtTasa(d.valor),
          cambioPct: d.cambioPct,
          extra: fmtPct(d.cambio30dPct),
        }))}
      />
      <p className="text-[11px] text-white/40">
        {t('despacho.mk.sinCapDivisas', 'Un par de divisas no tiene capitalización: en su lugar va la variación de 30 días.')}
      </p>
      <MisDivisas tick={tick} />
      <Pie fuente={t('despacho.mk.fuenteDivisas', 'Fuente: BCE (Frankfurter)')} cargando={cargando} onActualizar={actualizar} />
    </div>
  )
}

/** Divisas propias del usuario: dos selects del catálogo, fuera del top 10 fijo. */
function MisDivisas({ tick }: { tick: number }) {
  const t = useT()
  const watchlist = (watchlistRepo.useAll() ?? VACIO).filter((w) => w.mercado === 'divisas')
  const [datos, setDatos] = useState<Divisa[]>([])
  const [base, setBase] = useState('EUR')
  const [destino, setDestino] = useState('GBP')

  const pares = watchlist.map((w) => w.simbolo.split('/') as [string, string])
  const paresKey = watchlist.map((w) => w.simbolo).join(',')

  useEffect(() => {
    if (pares.length === 0) return
    let vivo = true
    void cargarDivisasPropias(pares, tick > 0).then((r) => {
      if (vivo) setDatos(r.datos)
    })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paresKey, tick])

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (base === destino) return
    const simbolo = `${base}/${destino}`
    if (watchlist.some((w) => w.simbolo === simbolo)) return
    await watchlistRepo.add({ simbolo, mercado: 'divisas' })
  }

  return (
    <section className="space-y-2 pt-1">
      <p className="text-xs uppercase tracking-wide text-white/40">{t('despacho.mk.misDivisas', 'Mis divisas')}</p>

      {watchlist.length > 0 && (
        <TablaMercado
          etiquetaExtra={t('despacho.mk.col.30d', '30 d')}
          filas={watchlist.map((w) => {
            const d = datos.find((x) => `${x.base}/${x.destino}` === w.simbolo)
            return {
              clave: w.simbolo,
              principal: w.simbolo,
              precio: d ? fmtTasa(d.valor) : '…',
              cambioPct: d?.cambioPct ?? 0,
              extra: d ? fmtPct(d.cambio30dPct) : undefined,
              onQuitar: () => w.id != null && watchlistRepo.remove(w.id),
            }
          })}
        />
      )}
      {watchlist.length === 0 && (
        <p className="text-xs text-white/55">{t('despacho.mk.vaciaDivisa', 'Agrega un par de divisas para seguirlo aquí.')}</p>
      )}

      <form onSubmit={agregar} className="flex items-center gap-2">
        <select
          value={base}
          onChange={(e) => setBase(e.target.value)}
          className="min-w-0 flex-1 rounded-lg bg-black/30 px-2 py-1.5 text-xs outline-none border border-white/10 focus:border-white/30"
        >
          {CATALOGO_DIVISAS.map((d) => (
            <option key={d.codigo} value={d.codigo}>
              {d.codigo} · {d.nombre}
            </option>
          ))}
        </select>
        <span className="shrink-0 text-white/30">/</span>
        <select
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          className="min-w-0 flex-1 rounded-lg bg-black/30 px-2 py-1.5 text-xs outline-none border border-white/10 focus:border-white/30"
        >
          {CATALOGO_DIVISAS.map((d) => (
            <option key={d.codigo} value={d.codigo}>
              {d.codigo} · {d.nombre}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={base === destino}
          className="shrink-0 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 transition disabled:opacity-40"
        >
          <Icono nombre="agregar" /> {t('despacho.mk.agregar', 'Agregar')}
        </button>
      </form>
    </section>
  )
}

// ----- Criptomonedas -----

function SeccionCriptos() {
  const t = useT()
  const { datos, cargando, error, actualizar, tick } = useMercado<Cripto>(cargarCriptos)

  if (datos.length === 0) return <Estado cargando={cargando} onReintentar={actualizar} />

  return (
    <div className="space-y-3">
      {error && <AvisoCache />}
      <Encabezado
        icono="moneda"
        titulo={t('despacho.mk.criptos', 'Criptomonedas')}
        nota={t('despacho.mk.top10cap', 'top 10 por capitalización · USD')}
      />
      <TablaMercado
        etiquetaGrafica={t('despacho.mk.dias7', '7 días')}
        etiquetaExtra={t('despacho.mk.col.cap', 'Cap.')}
        sufijoCambio="24 h"
        filas={datos.map((c) => ({
          clave: c.id,
          principal: c.simbolo,
          secundario: c.nombre,
          historial: c.historial,
          precio: fmtPrecio(c.usd),
          cambioPct: c.cambio24hPct,
          extra: fmtCap(c.capitalizacion),
        }))}
      />
      <MisCriptos tick={tick} />
      <Pie fuente={t('despacho.mk.fuenteCripto', 'Fuente: CoinGecko · 7 días')} cargando={cargando} onActualizar={actualizar} />
    </div>
  )
}

/** Criptomonedas propias del usuario: buscador de CoinGecko, fuera del top 10 fijo. */
function MisCriptos({ tick }: { tick: number }) {
  const t = useT()
  const watchlist = (watchlistRepo.useAll() ?? VACIO).filter((w) => w.mercado === 'criptos')
  const [datos, setDatos] = useState<Cripto[]>([])
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusquedaCripto[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ids = watchlist.map((w) => w.simbolo)
  const idsKey = ids.join(',')

  useEffect(() => {
    if (ids.length === 0) return
    let vivo = true
    void cargarCriptosPropias(ids, tick > 0).then((r) => {
      if (vivo) setDatos(r.datos)
    })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, tick])

  // Buscador con debounce: no una petición por tecla. Un query corto no limpia
  // `resultados` con setState (dispara el lint de cascada); se filtra al pintar.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.trim().length < 2) return
    timerRef.current = setTimeout(() => {
      void buscarCriptos(query).then(setResultados)
    }, 400)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  const mostrarResultados = query.trim().length >= 2 ? resultados : []

  const agregar = async (id: string) => {
    if (ids.includes(id)) return
    await watchlistRepo.add({ simbolo: id, mercado: 'criptos' })
    setQuery('')
    setResultados([])
  }

  return (
    <section className="space-y-2 pt-1">
      <p className="text-xs uppercase tracking-wide text-white/40">{t('despacho.mk.misCriptos', 'Mis criptomonedas')}</p>

      {watchlist.length > 0 && (
        <TablaMercado
          etiquetaGrafica={t('despacho.mk.dias7', '7 días')}
          etiquetaExtra={t('despacho.mk.col.cap', 'Cap.')}
          sufijoCambio="24 h"
          filas={watchlist.map((w) => {
            const c = datos.find((x) => x.id === w.simbolo)
            return {
              clave: w.simbolo,
              principal: c?.simbolo ?? w.simbolo,
              secundario: c?.nombre,
              historial: c?.historial,
              precio: c ? fmtPrecio(c.usd) : '…',
              cambioPct: c?.cambio24hPct ?? 0,
              extra: c ? fmtCap(c.capitalizacion) : undefined,
              onQuitar: () => w.id != null && watchlistRepo.remove(w.id),
            }
          })}
        />
      )}
      {watchlist.length === 0 && (
        <p className="text-xs text-white/55">{t('despacho.mk.vaciaCripto', 'Busca una criptomoneda para seguirla aquí.')}</p>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('despacho.mk.buscarCripto.ph', 'Buscar (ej. cardano)')}
        className="w-full rounded-lg bg-black/30 px-3 py-1.5 text-xs outline-none border border-white/10 focus:border-white/30"
      />
      {mostrarResultados.length > 0 && (
        <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden">
          {mostrarResultados.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => void agregar(r.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-white/10 transition border-b border-white/5 last:border-0"
            >
              <span className="font-bold shrink-0">{r.simbolo}</span>
              <span className="text-white/55 truncate">{r.nombre}</span>
              {r.rankCap != null && <span className="ml-auto shrink-0 text-white/30">#{r.rankCap}</span>}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

// ----- Acciones: índices, top 10 y watchlist -----

const INDICES = [
  { simbolo: 'SPY', nombre: 'S&P 500' },
  { simbolo: 'QQQ', nombre: 'Nasdaq 100' },
  { simbolo: 'DIA', nombre: 'Dow Jones' },
]

function SeccionAcciones() {
  const t = useT()
  const [datos, setDatos] = useState<AccionMercado[]>([])
  const [indices, setIndices] = useState<CotizacionesMap>({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [errorClave, setErrorClave] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let vivo = true
    void Promise.all([
      cargarAccionesMercado(tick > 0),
      cargarAcciones(INDICES.map((i) => i.simbolo), tick > 0),
    ])
      .then(([top, idx]) => {
        if (!vivo) return
        setDatos(top.datos)
        setError(top.error)
        setErrorClave(top.errorClave)
        setIndices(idx.cotizaciones)
      })
      .catch(() => {
        if (vivo) setError(true)
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
  }, [tick])

  const actualizar = () => {
    setCargando(true)
    setTick((n) => n + 1)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <Encabezado
          icono="tendencia"
          titulo={t('despacho.mk.acciones', 'Acciones')}
          nota={t('despacho.mk.top10capNyse', 'top 10 por capitalización · NYSE/Nasdaq')}
        />
        <ClaveApi className="ml-auto" onGuardar={actualizar} />
      </div>

      {errorClave && (
        <p className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
          {t('despacho.mk.claveInvalida', 'Clave de Finnhub inválida. Cámbiala en el botón API (gratis en finnhub.io).')}
        </p>
      )}
      {error && !errorClave && <AvisoCache />}

      {/* Índices vía ETF proxy */}
      <div className="grid grid-cols-3 gap-2">
        {INDICES.map((idx) => {
          const a = indices[idx.simbolo]
          const sube = (a?.cambioPct ?? 0) >= 0
          return (
            <div key={idx.simbolo} className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-[11px] text-white/55 truncate">
                {idx.nombre} <span className="text-white/30">· {idx.simbolo}</span>
              </p>
              {a ? (
                <>
                  <p className="font-bold text-sm mt-0.5">{fmtPrecio(a.precio)}</p>
                  <p className="texto-vivo text-xs font-medium" style={vivo(sube ? VERDE : ROJO)}>
                    <Icono nombre={sube ? 'subir' : 'bajar'} /> {Math.abs(a.cambioPct).toFixed(2)}%
                  </p>
                </>
              ) : (
                <p className="text-sm text-white/30 mt-0.5">…</p>
              )}
            </div>
          )
        })}
      </div>

      {datos.length === 0 ? (
        <Estado cargando={cargando} onReintentar={actualizar} />
      ) : (
        <TablaMercado
          etiquetaExtra={t('despacho.mk.col.cap', 'Cap.')}
          filas={datos.map((a) => ({
            clave: a.simbolo,
            principal: a.simbolo,
            secundario: a.nombre,
            precio: fmtPrecio(a.precio),
            cambioPct: a.cambioPct,
            extra: fmtCap(a.capitalizacion),
          }))}
        />
      )}

      <Watchlist tick={tick} />
      <Pie fuente={t('despacho.mk.fuenteAcciones', 'Fuente: Finnhub')} cargando={cargando} onActualizar={actualizar} />
    </div>
  )
}

/** Botón ⚙️ API + input para sustituir la clave de Finnhub. */
function ClaveApi({ className, onGuardar }: { className?: string; onGuardar: () => void }) {
  const t = useT()
  const [abierto, setAbierto] = useState(false)
  const [draft, setDraft] = useState('')

  const guardar = () => {
    // Vacío = no cambiar nada: evita borrar la clave guardada al abrir y
    // pulsar Guardar sin escribir.
    if (draft.trim()) setFinnhubKey(draft)
    setAbierto(false)
    setDraft('')
    onGuardar()
  }

  return (
    <>
      <button
        // La clave guardada no se precarga ni se muestra: el input queda
        // vacío y en modo password para que no se pueda leer desde la UI.
        onClick={() => setAbierto((v) => !v)}
        title={t('despacho.mk.clave', 'Clave API de Finnhub')}
        className={`text-white/30 hover:text-white/70 text-xs ${className ?? ''}`}
      >
        <Icono emoji="⚙️" /> API
      </button>
      {abierto && (
        <div className="mt-2 flex w-full gap-2 rounded-xl bg-white/5 border border-white/10 p-3">
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              getFinnhubKey()
                ? t('despacho.mk.clave.guardada', 'Clave guardada — pega una nueva para sustituirla')
                : t('despacho.mk.clave.ph', 'Clave de finnhub.io')
            }
            className="min-w-0 flex-1 rounded-lg bg-black/30 px-3 py-1.5 text-xs outline-none border border-white/10 focus:border-white/30"
          />
          <button
            onClick={guardar}
            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold texto-cta hover:brightness-110 transition"
          >
            {t('despacho.mk.guardar', 'Guardar')}
          </button>
        </div>
      )}
    </>
  )
}

/** Watchlist personal con heatmap estilo Finviz (se conserva del diseño anterior). */
function Watchlist({ tick }: { tick: number }) {
  const t = useT()
  // Sin `mercado`: filas de antes de los cuatro mercados, todas eran acciones.
  const watchlist = (watchlistRepo.useAll() ?? VACIO).filter((w) => (w.mercado ?? 'acciones') === 'acciones')
  const [cotizaciones, setCotizaciones] = useState<CotizacionesMap>({})
  const [nuevo, setNuevo] = useState('')

  const simbolos = watchlist.map((w) => w.simbolo)
  const simbolosKey = simbolos.join(',')

  useEffect(() => {
    if (simbolos.length === 0) return
    let vivo = true
    void cargarAcciones(simbolos, tick > 0).then((r) => {
      if (vivo) setCotizaciones(r.cotizaciones)
    })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simbolosKey, tick])

  const agregar = async (sim: string) => {
    const s = sim.trim().toUpperCase()
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(s)) return
    if (simbolos.includes(s)) return
    await watchlistRepo.add({ simbolo: s, mercado: 'acciones' })
    setNuevo('')
  }

  return (
    <section className="space-y-2 pt-1">
      <p className="text-xs uppercase tracking-wide text-white/40">
        {t('despacho.mk.miLista', 'Mi lista de seguimiento')}
      </p>

      {watchlist.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {watchlist.map((w) => {
            const a = cotizaciones[w.simbolo]
            const pct = a?.cambioPct ?? 0
            const sube = pct >= 0
            const intensidad = Math.min(1, Math.abs(pct) / 3) // ±3% = tono máximo
            const fondo = a
              ? sube
                ? `rgba(16,185,129,${0.2 + 0.55 * intensidad})`
                : `rgba(239,68,68,${0.2 + 0.55 * intensidad})`
              : 'rgba(255,255,255,0.05)'
            return (
              <div key={w.id} className="relative rounded-lg p-2 min-h-[4.25rem]" style={{ background: fondo }}>
                <button
                  onClick={() => w.id && watchlistRepo.remove(w.id)}
                  className="absolute top-0.5 right-1.5 text-white/40 hover:text-white text-xs"
                  title={t('chat.eliminar', 'Eliminar')}
                  aria-label={t('chat.eliminar', 'Eliminar')}
                >
                  <Icono nombre="cerrar" />
                </button>
                <p className="text-sm font-bold">{w.simbolo}</p>
                {a === null ? (
                  <p className="text-[11px] text-white/55">{t('despacho.mk.sinDatos', 'Sin datos')}</p>
                ) : a ? (
                  <>
                    <p className="text-[11px] text-white/85">{fmtPrecio(a.precio)}</p>
                    <p className="text-xs font-bold">
                      {sube ? '+' : ''}
                      {pct.toFixed(2)}%
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-white/40">…</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {watchlist.length === 0 && (
        <p className="text-xs text-white/55">{t('despacho.mk.vacia', 'Agrega acciones para seguirlas aquí.')}</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void agregar(nuevo)
        }}
        className="flex gap-2"
      >
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder={t('despacho.mk.ticker.ph', 'Ticker (ej. AAPL)')}
          className="min-w-0 flex-1 rounded-lg bg-black/30 px-3 py-1.5 text-xs uppercase outline-none border border-white/10 focus:border-white/30"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 transition"
        >
          <Icono nombre="agregar" /> {t('despacho.mk.agregar', 'Agregar')}
        </button>
      </form>
    </section>
  )
}

// ----- Materias primas -----

function SeccionCommodities() {
  const t = useT()
  const [datos, setDatos] = useState<MateriaPrima[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [errorClave, setErrorClave] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let vivo = true
    void cargarMateriasPrimas(tick > 0)
      .then((r) => {
        if (!vivo) return
        setDatos(r.datos)
        setError(r.error)
        setErrorClave(r.errorClave)
      })
      .catch(() => {
        if (vivo) setError(true)
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
  }, [tick])

  const actualizar = () => {
    setCargando(true)
    setTick((n) => n + 1)
  }
  const nombreDe = (clave: string) => {
    const m = MATERIAS_PRIMAS.find((x) => x.clave === clave)
    return t(`despacho.mk.com.${clave}`, m?.es ?? clave)
  }

  if (datos.length === 0 && !errorClave) return <Estado cargando={cargando} onReintentar={actualizar} />

  return (
    <div className="space-y-3">
      <Encabezado
        icono="gema"
        titulo={t('despacho.mk.commodities', 'Materias primas')}
        nota={t('despacho.mk.viaEtf', 'vía ETF · USD')}
      />

      {errorClave && (
        <p className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
          {t('despacho.mk.claveInvalida', 'Clave de Finnhub inválida. Cámbiala en el botón API (gratis en finnhub.io).')}
        </p>
      )}
      {error && !errorClave && <AvisoCache />}

      <TablaMercado
        etiquetaExtra={t('despacho.mk.col.etf', 'ETF')}
        filas={datos.map((m) => ({
          clave: m.simbolo,
          principal: nombreDe(m.clave),
          precio: fmtPrecio(m.precio),
          cambioPct: m.cambioPct,
          extra: m.simbolo,
        }))}
      />

      <p className="text-[11px] text-white/40">
        {t(
          'despacho.mk.notaEtf',
          'El precio es el del ETF que replica cada materia prima, no su precio spot; tampoco tienen capitalización de mercado.',
        )}
      </p>
      <MisMaterias tick={tick} />
      <Pie fuente={t('despacho.mk.fuenteAcciones', 'Fuente: Finnhub')} cargando={cargando} onActualizar={actualizar} />
    </div>
  )
}

/** Materias primas propias: cualquier ETF, con el nombre que le ponga el usuario. */
function MisMaterias({ tick }: { tick: number }) {
  const t = useT()
  const watchlist = (watchlistRepo.useAll() ?? VACIO).filter((w) => w.mercado === 'commodities')
  const [cotizaciones, setCotizaciones] = useState<CotizacionesMap>({})
  const [ticker, setTicker] = useState('')
  const [etiqueta, setEtiqueta] = useState('')

  const simbolos = watchlist.map((w) => w.simbolo)
  const simbolosKey = simbolos.join(',')

  useEffect(() => {
    if (simbolos.length === 0) return
    let vivo = true
    void cargarAcciones(simbolos, tick > 0).then((r) => {
      if (vivo) setCotizaciones(r.cotizaciones)
    })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simbolosKey, tick])

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    const s = ticker.trim().toUpperCase()
    const nombre = etiqueta.trim()
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(s) || !nombre) return
    if (simbolos.includes(s)) return
    await watchlistRepo.add({ simbolo: s, mercado: 'commodities', etiqueta: nombre })
    setTicker('')
    setEtiqueta('')
  }

  return (
    <section className="space-y-2 pt-1">
      <p className="text-xs uppercase tracking-wide text-white/40">{t('despacho.mk.misMaterias', 'Mis materias primas')}</p>

      {watchlist.length > 0 && (
        <TablaMercado
          etiquetaExtra={t('despacho.mk.col.etf', 'ETF')}
          filas={watchlist.map((w) => {
            const a = cotizaciones[w.simbolo]
            return {
              clave: w.simbolo,
              principal: w.etiqueta ?? w.simbolo,
              precio: a ? fmtPrecio(a.precio) : '…',
              cambioPct: a?.cambioPct ?? 0,
              extra: w.simbolo,
              onQuitar: () => w.id != null && watchlistRepo.remove(w.id),
            }
          })}
        />
      )}
      {watchlist.length === 0 && (
        <p className="text-xs text-white/55">
          {t('despacho.mk.vaciaMateria', 'Agrega el ETF de una materia prima que quieras seguir.')}
        </p>
      )}

      <form onSubmit={agregar} className="flex gap-2">
        <input
          value={etiqueta}
          onChange={(e) => setEtiqueta(e.target.value)}
          placeholder={t('despacho.mk.nombreMateria.ph', 'Nombre (ej. Paladio)')}
          className="min-w-0 flex-1 rounded-lg bg-black/30 px-3 py-1.5 text-xs outline-none border border-white/10 focus:border-white/30"
        />
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder={t('despacho.mk.etf.ph', 'ETF (ej. PALL)')}
          className="w-28 shrink-0 rounded-lg bg-black/30 px-3 py-1.5 text-xs uppercase outline-none border border-white/10 focus:border-white/30"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 transition"
        >
          <Icono nombre="agregar" /> {t('despacho.mk.agregar', 'Agregar')}
        </button>
      </form>
    </section>
  )
}

/** Línea de tendencia normalizada al rango de la serie. */
function Sparkline({ valores, color }: { valores: number[]; color: string }) {
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const rango = max - min || 1
  const puntos = valores
    .map((v, i) => `${(i / (valores.length - 1)) * 100},${26 - ((v - min) / rango) * 22}`)
    .join(' ')
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-8 min-w-0 flex-1">
      <polyline points={puntos} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
