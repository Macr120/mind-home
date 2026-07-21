import { fechaLocalISO } from '../../core/fechaLocal'

/**
 * Datos de mercados sin API key, directo desde el navegador:
 * - Divisas: Frankfurter (BCE) — usar dominio `.dev`, el `.app` redirige.
 * - Cripto: CoinGecko (con sparkline 7d incluida en una sola llamada).
 */

export interface Divisa {
  base: string
  destino: string
  valor: number
  cambioPct: number // % vs día hábil anterior
  historial: number[] // ~30 días (días hábiles BCE)
}

export interface Cripto {
  id: string
  simbolo: string
  nombre: string
  usd: number
  cambio24hPct: number
  historial: number[] // 7 días (puntos por hora)
}

export interface DatosMercados {
  actualizado: number // epoch ms
  divisas: Divisa[]
  criptos: Cripto[]
}

const PARES: [string, string][] = [
  ['USD', 'MXN'],
  ['EUR', 'MXN'],
  ['EUR', 'USD'],
  ['GBP', 'USD'],
  ['USD', 'JPY'],
]

const CRIPTO_IDS = ['bitcoin', 'ethereum', 'solana', 'ripple']

const CACHE_KEY = 'mh-mercados-cache'
const TTL_MS = 10 * 60_000

async function fetchJson(url: string, ms = 12_000): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

async function cargarDivisas(): Promise<Divisa[]> {
  const desde = fechaLocalISO(new Date(Date.now() - 30 * 86_400_000))
  const bases = [...new Set(PARES.map(([b]) => b))]
  const ratesPorBase = new Map<string, Record<string, Record<string, number>>>()

  await Promise.all(
    bases.map(async (base) => {
      const symbols = PARES.filter(([b]) => b === base).map(([, d]) => d).join(',')
      try {
        const data = (await fetchJson(
          `https://api.frankfurter.dev/v1/${desde}..?base=${base}&symbols=${symbols}`,
        )) as { rates?: Record<string, Record<string, number>> }
        ratesPorBase.set(base, data.rates ?? {})
      } catch {
        /* base sin datos: se omiten sus pares */
      }
    }),
  )

  const divisas: Divisa[] = []
  for (const [base, destino] of PARES) {
    const rates = ratesPorBase.get(base)
    if (!rates) continue
    const serie = Object.keys(rates)
      .sort()
      .map((f) => rates[f][destino])
      .filter((v): v is number => typeof v === 'number')
    if (serie.length < 2) continue
    const valor = serie[serie.length - 1]
    const prev = serie[serie.length - 2]
    divisas.push({
      base,
      destino,
      valor,
      cambioPct: ((valor - prev) / prev) * 100,
      historial: serie,
    })
  }
  return divisas
}

async function cargarCriptos(): Promise<Cripto[]> {
  const data = (await fetchJson(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${CRIPTO_IDS.join(',')}&sparkline=true&price_change_percentage=24h`,
  )) as {
    id: string
    symbol: string
    name: string
    current_price: number
    price_change_percentage_24h: number | null
    sparkline_in_7d?: { price?: number[] }
  }[]

  return data
    .filter((c) => typeof c.current_price === 'number')
    .map((c) => ({
      id: c.id,
      simbolo: c.symbol.toUpperCase(),
      nombre: c.name,
      usd: c.current_price,
      cambio24hPct: c.price_change_percentage_24h ?? 0,
      historial: c.sparkline_in_7d?.price ?? [],
    }))
}

function leerCache(): DatosMercados | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DatosMercados
  } catch {
    return null
  }
}

// ----- Acciones (Finnhub, requiere clave gratuita) -----

export interface Accion {
  simbolo: string
  precio: number
  cambioPct: number // % vs cierre anterior
}

/** null = símbolo sin datos (ticker inexistente). */
export type CotizacionesMap = Record<string, Accion | null>

const CACHE_ACCIONES_KEY = 'mh-acciones-cache'
const FINNHUB_KEY_LS = 'mh-finnhub-key'
// Clave incluida vía entorno (.env.local; ver .env.example). La UI permite sustituirla (localStorage manda).
const FINNHUB_KEY_INCLUIDA = (import.meta.env.VITE_FINNHUB_KEY as string | undefined) ?? ''

export function getFinnhubKey(): string {
  return localStorage.getItem(FINNHUB_KEY_LS)?.trim() || FINNHUB_KEY_INCLUIDA
}

export function setFinnhubKey(clave: string) {
  localStorage.setItem(FINNHUB_KEY_LS, clave.trim())
}

interface CacheAcciones {
  actualizado: number
  cotizaciones: CotizacionesMap
}

function leerCacheAcciones(): CacheAcciones | null {
  try {
    const raw = localStorage.getItem(CACHE_ACCIONES_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CacheAcciones
  } catch {
    return null
  }
}

/** Cotizaciones de acciones US con cache de 10 min; los fallos puntuales conservan lo guardado. */
export async function cargarAcciones(
  simbolos: string[],
  forzar = false,
): Promise<{ cotizaciones: CotizacionesMap; error: 'clave' | 'red' | null }> {
  const cache = leerCacheAcciones()
  const cubiertos = cache != null && simbolos.every((s) => s in cache.cotizaciones)
  if (!forzar && cache && cubiertos && Date.now() - cache.actualizado < TTL_MS) {
    return { cotizaciones: cache.cotizaciones, error: null }
  }

  const clave = getFinnhubKey()
  let claveInvalida = false
  const resultados = await Promise.all(
    simbolos.map(async (s) => {
      try {
        const q = (await fetchJson(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(s)}&token=${clave}`,
        )) as { c?: number; dp?: number | null; pc?: number }
        if (typeof q.c !== 'number' || q.c === 0) return { s, accion: null }
        const pct =
          typeof q.dp === 'number' ? q.dp : q.pc ? ((q.c - q.pc) / q.pc) * 100 : 0
        return { s, accion: { simbolo: s, precio: q.c, cambioPct: pct } as Accion }
      } catch (e) {
        if (e instanceof Error && e.message.includes('401')) claveInvalida = true
        return { s, accion: undefined } // fallo de red: se conserva el cache de ese símbolo
      }
    }),
  )

  if (claveInvalida) {
    return { cotizaciones: cache?.cotizaciones ?? {}, error: 'clave' }
  }

  const cotizaciones: CotizacionesMap = {}
  let fallos = 0
  for (const { s, accion } of resultados) {
    if (accion === undefined) {
      fallos++
      cotizaciones[s] = cache?.cotizaciones[s] ?? null
    } else {
      cotizaciones[s] = accion
    }
  }

  if (fallos === simbolos.length && simbolos.length > 0) {
    return { cotizaciones: cache?.cotizaciones ?? cotizaciones, error: 'red' }
  }

  try {
    localStorage.setItem(
      CACHE_ACCIONES_KEY,
      JSON.stringify({ actualizado: Date.now(), cotizaciones } satisfies CacheAcciones),
    )
  } catch {
    /* sin espacio: seguimos sin cache */
  }
  return { cotizaciones, error: fallos > 0 ? 'red' : null }
}

/** Datos de mercados con cache de 10 min; si la red falla conserva lo guardado. */
export async function cargarMercados(
  forzar = false,
): Promise<{ datos: DatosMercados | null; error: boolean }> {
  const cache = leerCache()
  if (!forzar && cache && Date.now() - cache.actualizado < TTL_MS) {
    return { datos: cache, error: false }
  }

  const [divisas, criptos] = await Promise.all([
    cargarDivisas().catch(() => [] as Divisa[]),
    cargarCriptos().catch(() => [] as Cripto[]),
  ])

  if (divisas.length === 0 && criptos.length === 0) {
    return { datos: cache, error: true }
  }

  const datos: DatosMercados = {
    actualizado: Date.now(),
    divisas: divisas.length ? divisas : cache?.divisas ?? [],
    criptos: criptos.length ? criptos : cache?.criptos ?? [],
  }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(datos))
  } catch {
    /* sin espacio: seguimos sin cache */
  }
  return { datos, error: divisas.length === 0 || criptos.length === 0 }
}
