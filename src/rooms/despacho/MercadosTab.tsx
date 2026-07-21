import { useEffect, useState } from 'react'
import {
  cargarAcciones,
  cargarMercados,
  getFinnhubKey,
  setFinnhubKey,
  type CotizacionesMap,
  type DatosMercados,
} from './mercados'
import { watchlistRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

const VERDE = '#34d399'
const ROJO = '#f87171'

const fmtTasa = (n: number) =>
  n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

const fmtUsd = (n: number) =>
  n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n < 1 ? 4 : 2,
  })

export function MercadosTab() {
  const t = useT()
  const [datos, setDatos] = useState<DatosMercados | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [tick, setTick] = useState(0) // fuerza el refresco de la sección de acciones

  const cargar = async (forzar: boolean) => {
    setCargando(true)
    if (forzar) setTick((n) => n + 1)
    const r = await cargarMercados(forzar)
    setDatos(r.datos)
    setError(r.error)
    setCargando(false)
  }

  // Carga inicial (sin el setCargando síncrono de `cargar`: ya arranca en true).
  useEffect(() => {
    let vivo = true
    void cargarMercados(false).then((r) => {
      if (!vivo) return
      setDatos(r.datos)
      setError(r.error)
      setCargando(false)
    })
    return () => {
      vivo = false
    }
  }, [])

  if (!datos) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-center text-sm text-white/50">
        {cargando ? (
          t('despacho.mk.cargando', 'Cargando mercados…')
        ) : (
          <>
            <p>{t('despacho.mk.error', 'No se pudo conectar a las fuentes de mercados. Revisa tu internet.')}</p>
            <button
              onClick={() => void cargar(true)}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold texto-cta hover:brightness-110 transition"
            >
              {t('despacho.mk.reintentar', 'Reintentar')}
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-300">
          <Icono nombre="alerta" /> {t('despacho.mk.cacheAviso', 'Sin conexión con alguna fuente — mostrando últimos datos guardados.')}
        </p>
      )}

      <SeccionAcciones tick={tick} />

      <section>
        <p className="text-sm font-semibold mb-2">
          <Icono nombre="divisas" /> {t('despacho.mk.divisas', 'Divisas')}{' '}
          <span className="text-xs font-normal text-white/40">
            · {t('despacho.mk.dias30', '30 días')}
          </span>
        </p>
        <div className="space-y-2">
          {datos.divisas.map((d) => {
            const sube = d.cambioPct >= 0
            return (
              <div
                key={`${d.base}/${d.destino}`}
                className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5"
              >
                <span className="w-20 shrink-0 text-sm font-bold">
                  {d.base}/{d.destino}
                </span>
                <Sparkline valores={d.historial} color={sube ? VERDE : ROJO} />
                <span className="w-32 shrink-0 text-right">
                  <span className="block font-semibold text-sm">{fmtTasa(d.valor)}</span>
                  <span className="block text-xs font-medium" style={{ color: sube ? VERDE : ROJO }}>
                    {sube ? '▲' : '▼'} {Math.abs(d.cambioPct).toFixed(2)}%
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <p className="text-sm font-semibold mb-2">
          ₿ {t('despacho.mk.cripto', 'Cripto')}{' '}
          <span className="text-xs font-normal text-white/40">
            · USD · {t('despacho.mk.dias7', '7 días')}
          </span>
        </p>
        <div className="space-y-2">
          {datos.criptos.map((c) => {
            const sube = c.cambio24hPct >= 0
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5"
              >
                <span className="w-20 shrink-0 leading-tight">
                  <span className="block text-sm font-bold">{c.simbolo}</span>
                  <span className="block truncate text-[11px] text-white/40">{c.nombre}</span>
                </span>
                <Sparkline valores={c.historial} color={sube ? VERDE : ROJO} />
                <span className="w-32 shrink-0 text-right">
                  <span className="block font-semibold text-sm">{fmtUsd(c.usd)}</span>
                  <span className="block text-xs font-medium" style={{ color: sube ? VERDE : ROJO }}>
                    {sube ? '▲' : '▼'} {Math.abs(c.cambio24hPct).toFixed(2)}% 24h
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <div className="flex items-center justify-between gap-2 text-[11px] text-white/40">
        <span>
          {t('despacho.mk.fuentes', 'Acciones: Finnhub · Divisas: BCE · Cripto: CoinGecko')} ·{' '}
          {haceTexto(datos.actualizado, t)}
        </span>
        <button
          onClick={() => void cargar(true)}
          disabled={cargando}
          className="shrink-0 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 transition disabled:opacity-50"
        >
          <Icono emoji="🔄" /> {cargando ? t('despacho.mk.cargandoBtn', 'Cargando…') : t('despacho.mk.actualizar', 'Actualizar')}
        </button>
      </div>
    </div>
  )
}

const INDICES = [
  { simbolo: 'SPY', nombre: 'S&P 500' },
  { simbolo: 'QQQ', nombre: 'Nasdaq 100' },
  { simbolo: 'DIA', nombre: 'Dow Jones' },
]

const SUGERIDAS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA', 'GOOGL']

/** Índices (vía ETF) + watchlist personal con heatmap estilo Finviz. */
function SeccionAcciones({ tick }: { tick: number }) {
  const t = useT()
  const watchlist = watchlistRepo.useAll() ?? []
  const [cotizaciones, setCotizaciones] = useState<CotizacionesMap>({})
  const [error, setError] = useState<'clave' | 'red' | null>(null)
  const [nuevo, setNuevo] = useState('')
  const [editaClave, setEditaClave] = useState(false)
  const [claveDraft, setClaveDraft] = useState('')

  const simbolos = [...INDICES.map((i) => i.simbolo), ...watchlist.map((w) => w.simbolo)]
  const simbolosKey = simbolos.join(',')

  useEffect(() => {
    let vivo = true
    void cargarAcciones(simbolos, tick > 0).then((r) => {
      if (!vivo) return
      setCotizaciones(r.cotizaciones)
      setError(r.error)
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
    await watchlistRepo.add({ simbolo: s })
    setNuevo('')
  }

  const guardarClave = () => {
    setFinnhubKey(claveDraft)
    setEditaClave(false)
    setError(null)
    void cargarAcciones(simbolos, true).then((r) => {
      setCotizaciones(r.cotizaciones)
      setError(r.error)
    })
  }

  return (
    <section>
      <p className="text-sm font-semibold mb-2 flex items-center">
        <Icono nombre="progreso" /> {t('despacho.mk.acciones', 'Acciones e índices')}{' '}
        <span className="text-xs font-normal text-white/40 ml-1">· NYSE/Nasdaq</span>
        <button
          onClick={() => {
            setClaveDraft(getFinnhubKey())
            setEditaClave((v) => !v)
          }}
          title={t('despacho.mk.clave', 'Clave API de Finnhub')}
          className="ml-auto text-white/30 hover:text-white/70 text-xs"
        >
          <Icono emoji="⚙️" /> API
        </button>
      </p>

      {editaClave && (
        <div className="mb-2 flex gap-2 rounded-xl bg-white/5 border border-white/10 p-3">
          <input
            value={claveDraft}
            onChange={(e) => setClaveDraft(e.target.value)}
            placeholder={t('despacho.mk.clave.ph', 'Clave de finnhub.io')}
            className="min-w-0 flex-1 rounded-lg bg-black/30 px-3 py-1.5 text-xs outline-none border border-white/10 focus:border-white/30"
          />
          <button
            onClick={guardarClave}
            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold texto-cta hover:brightness-110 transition"
          >
            {t('despacho.mk.guardar', 'Guardar')}
          </button>
        </div>
      )}

      {error === 'clave' && (
        <p className="mb-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
          {t('despacho.mk.claveInvalida', 'Clave de Finnhub inválida. Cámbiala en el botón API (gratis en finnhub.io).')}
        </p>
      )}

      {/* Índices vía ETF proxy */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {INDICES.map((idx) => {
          const a = cotizaciones[idx.simbolo]
          const sube = (a?.cambioPct ?? 0) >= 0
          return (
            <div key={idx.simbolo} className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-[11px] text-white/50 truncate">
                {idx.nombre} <span className="text-white/30">· {idx.simbolo}</span>
              </p>
              {a ? (
                <>
                  <p className="font-bold text-sm mt-0.5">{fmtUsd(a.precio)}</p>
                  <p className="text-xs font-medium" style={{ color: sube ? VERDE : ROJO }}>
                    {sube ? '▲' : '▼'} {Math.abs(a.cambioPct).toFixed(2)}%
                  </p>
                </>
              ) : (
                <p className="text-sm text-white/30 mt-0.5">…</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Heatmap de la watchlist */}
      {watchlist.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mb-2">
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
                  className="absolute top-0.5 right-1.5 text-white/35 hover:text-white text-xs"
                  title={t('chat.eliminar', 'Eliminar')}
                >
                  ✕
                </button>
                <p className="text-sm font-bold">{w.simbolo}</p>
                {a === null ? (
                  <p className="text-[11px] text-white/50">{t('despacho.mk.sinDatos', 'Sin datos')}</p>
                ) : a ? (
                  <>
                    <p className="text-[11px] text-white/80">{fmtUsd(a.precio)}</p>
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
        <div className="mb-2 rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-xs text-white/50 mb-2">
            {t('despacho.mk.vacia', 'Agrega acciones para seguirlas aquí:')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGERIDAS.map((s) => (
              <button
                key={s}
                onClick={() => void agregar(s)}
                className="rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-xs font-semibold text-white/70 hover:bg-white/15 transition"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
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
          + {t('despacho.mk.agregar', 'Agregar')}
        </button>
      </form>
    </section>
  )
}

function haceTexto(epoch: number, t: ReturnType<typeof useT>): string {
  const min = Math.floor((Date.now() - epoch) / 60_000)
  if (min < 1) return t('despacho.mk.ahora', 'actualizado ahora')
  if (min < 60) return t('despacho.mk.haceMin', `hace ${min} min`, { n: String(min) })
  return t('despacho.mk.haceHoras', `hace ${Math.floor(min / 60)} h`, { n: String(Math.floor(min / 60)) })
}

/** Línea de tendencia normalizada al rango de la serie. */
function Sparkline({ valores, color }: { valores: number[]; color: string }) {
  if (valores.length < 2) return <span className="flex-1" />
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const rango = max - min || 1
  const puntos = valores
    .map((v, i) => `${(i / (valores.length - 1)) * 100},${26 - ((v - min) / rango) * 22}`)
    .join(' ')
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-8 min-w-0 flex-1">
      <polyline
        points={puntos}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
