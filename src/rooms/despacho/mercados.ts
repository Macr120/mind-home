import { fechaLocalISO } from '../../core/fechaLocal'

/**
 * Los cuatro mercados, directo desde el navegador:
 * - Divisas: Frankfurter (BCE) — usar dominio `.dev`, el `.app` redirige. Sin clave.
 * - Criptomonedas: CoinGecko, top 10 por capitalización en UNA llamada. Sin clave.
 * - Acciones: Finnhub (clave gratuita): cotización + capitalización de `profile2`.
 * - Materias primas: Finnhub sobre los ETF que replican cada subyacente. Mismo
 *   truco que los índices: no hay endpoint gratuito de precio spot de commodities.
 *
 * OJO con la capitalización: solo existe de verdad en acciones y cripto. Un par de
 * divisas no tiene capitalización (no es un activo emitido) y `profile2` responde
 * vacío para los ETF, así que esas dos secciones muestran otra tercera columna.
 *
 * Cada sección carga por separado: abrir Divisas no debe pegarle a CoinGecko.
 */

export interface Divisa {
  base: string
  destino: string
  valor: number
  cambioPct: number // % vs día hábil anterior
  cambio30dPct: number // % en la ventana del historial (sustituye a la cap)
  historial: number[] // ~30 días (días hábiles BCE)
}

export interface Cripto {
  id: string
  simbolo: string
  nombre: string
  usd: number
  cambio24hPct: number
  capitalizacion: number // USD absolutos
  historial: number[] // 7 días (puntos por hora)
}

/** Cotización simple; la usan la watchlist, los índices y las materias primas. */
export interface Accion {
  simbolo: string
  precio: number
  cambioPct: number // % vs cierre anterior
}

/** Acción del top 10, con nombre y capitalización. */
export interface AccionMercado extends Accion {
  nombre: string
  capitalizacion: number // USD absolutos
}

export interface MateriaPrima extends Accion {
  /** Clave i18n del subyacente ('oro', 'petroleo'…). */
  clave: string
}

/** null = símbolo sin datos (ticker inexistente). */
export type CotizacionesMap = Record<string, Accion | null>

const PARES: [string, string][] = [
  ['EUR', 'USD'],
  ['USD', 'JPY'],
  ['GBP', 'USD'],
  ['USD', 'CHF'],
  ['AUD', 'USD'],
  ['USD', 'CAD'],
  ['USD', 'CNY'],
  ['USD', 'MXN'],
  ['EUR', 'MXN'],
  ['USD', 'BRL'],
]

/** Las 30 divisas que soporta Frankfurter (BCE): catálogo fijo, cambia poquísimo. */
export const CATALOGO_DIVISAS: { codigo: string; nombre: string }[] = [
  { codigo: 'AUD', nombre: 'Dólar australiano' },
  { codigo: 'BRL', nombre: 'Real brasileño' },
  { codigo: 'CAD', nombre: 'Dólar canadiense' },
  { codigo: 'CHF', nombre: 'Franco suizo' },
  { codigo: 'CNY', nombre: 'Yuan chino' },
  { codigo: 'CZK', nombre: 'Corona checa' },
  { codigo: 'DKK', nombre: 'Corona danesa' },
  { codigo: 'EUR', nombre: 'Euro' },
  { codigo: 'GBP', nombre: 'Libra esterlina' },
  { codigo: 'HKD', nombre: 'Dólar de Hong Kong' },
  { codigo: 'HUF', nombre: 'Florín húngaro' },
  { codigo: 'IDR', nombre: 'Rupia indonesia' },
  { codigo: 'ILS', nombre: 'Séquel israelí' },
  { codigo: 'INR', nombre: 'Rupia india' },
  { codigo: 'ISK', nombre: 'Corona islandesa' },
  { codigo: 'JPY', nombre: 'Yen japonés' },
  { codigo: 'KRW', nombre: 'Won surcoreano' },
  { codigo: 'MXN', nombre: 'Peso mexicano' },
  { codigo: 'MYR', nombre: 'Ringgit malasio' },
  { codigo: 'NOK', nombre: 'Corona noruega' },
  { codigo: 'NZD', nombre: 'Dólar neozelandés' },
  { codigo: 'PHP', nombre: 'Peso filipino' },
  { codigo: 'PLN', nombre: 'Zloty polaco' },
  { codigo: 'RON', nombre: 'Leu rumano' },
  { codigo: 'SEK', nombre: 'Corona sueca' },
  { codigo: 'SGD', nombre: 'Dólar de Singapur' },
  { codigo: 'THB', nombre: 'Baht tailandés' },
  { codigo: 'TRY', nombre: 'Lira turca' },
  { codigo: 'USD', nombre: 'Dólar estadounidense' },
  { codigo: 'ZAR', nombre: 'Rand sudafricano' },
]

/**
 * Top 10 de Wall Street por capitalización. La pertenencia es fija (cambia unas
 * pocas veces al año) pero el ORDEN se recalcula con la cap que devuelve la API,
 * así que la tabla sale bien ordenada aunque esta lista quede algo vieja.
 */
const ACCIONES_TOP = ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AVGO', 'TSLA', 'BRK.B', 'JPM']

/**
 * Materias primas vía ETF que las replican: es lo que permite el plan gratuito.
 * El precio es el del ETF, no el spot del subyacente — se advierte en la UI.
 */
export const MATERIAS_PRIMAS: { simbolo: string; clave: string; es: string }[] = [
  { simbolo: 'GLD', clave: 'oro', es: 'Oro' },
  { simbolo: 'SLV', clave: 'plata', es: 'Plata' },
  { simbolo: 'PPLT', clave: 'platino', es: 'Platino' },
  { simbolo: 'USO', clave: 'petroleo', es: 'Petróleo (WTI)' },
  { simbolo: 'UNG', clave: 'gas', es: 'Gas natural' },
  { simbolo: 'CPER', clave: 'cobre', es: 'Cobre' },
  { simbolo: 'CORN', clave: 'maiz', es: 'Maíz' },
  { simbolo: 'WEAT', clave: 'trigo', es: 'Trigo' },
  { simbolo: 'SOYB', clave: 'soya', es: 'Soya' },
  { simbolo: 'DBA', clave: 'agricolas', es: 'Cesta agrícola' },
]

const TTL_MS = 10 * 60_000
/** Las capitalizaciones se mueven despacio: un día de caché ahorra 10 llamadas. */
const TTL_PERFILES_MS = 24 * 3_600_000

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

// ----- Caché genérica en localStorage -----

interface Cache<T> {
  actualizado: number
  datos: T
}

/**
 * Lee una entrada de caché VALIDANDO la forma: una versión anterior guardó
 * `mh-acciones-cache` como `{actualizado, cotizaciones}`, y leer ese `datos`
 * inexistente reventaba el cargador. Ante cualquier forma que no cuadre se
 * devuelve null y se recarga de la red.
 */
function leerCache<T>(clave: string): Cache<T> | null {
  try {
    const raw = localStorage.getItem(clave)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<Cache<T>>
    if (typeof v?.actualizado !== 'number' || typeof v.datos !== 'object' || v.datos == null) return null
    return v as Cache<T>
  } catch {
    return null
  }
}

function guardarCache<T>(clave: string, datos: T): void {
  try {
    localStorage.setItem(clave, JSON.stringify({ actualizado: Date.now(), datos } satisfies Cache<T>))
  } catch {
    /* sin espacio: seguimos sin caché */
  }
}

const fresco = (c: Cache<unknown> | null, ttl = TTL_MS) => c != null && Date.now() - c.actualizado < ttl

/** Resultado común: si la red falla se devuelve lo último guardado con `error`. */
export interface Resultado<T> {
  datos: T
  error: boolean
  actualizado: number
}

// ----- Divisas (Frankfurter / BCE) -----

const CACHE_DIVISAS = 'mh-divisas-cache'
const CACHE_DIVISAS_PROPIAS = 'mh-divisas-propias-cache'

/** Pide a Frankfurter la serie de 30 días de un conjunto de pares (sin caché). */
async function fetchDivisas(pares: [string, string][]): Promise<Divisa[]> {
  const desde = fechaLocalISO(new Date(Date.now() - 30 * 86_400_000))
  const bases = [...new Set(pares.map(([b]) => b))]
  const ratesPorBase = new Map<string, Record<string, Record<string, number>>>()

  await Promise.all(
    bases.map(async (base) => {
      const symbols = pares
        .filter(([b]) => b === base)
        .map(([, d]) => d)
        .join(',')
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
  for (const [base, destino] of pares) {
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
      cambio30dPct: ((valor - serie[0]) / serie[0]) * 100,
      historial: serie,
    })
  }
  return divisas
}

export async function cargarDivisas(forzar = false): Promise<Resultado<Divisa[]>> {
  const cache = leerCache<Divisa[]>(CACHE_DIVISAS)
  if (!forzar && fresco(cache)) return { datos: cache!.datos, error: false, actualizado: cache!.actualizado }

  const divisas = await fetchDivisas(PARES)
  if (divisas.length === 0) {
    return { datos: cache?.datos ?? [], error: true, actualizado: cache?.actualizado ?? 0 }
  }
  guardarCache(CACHE_DIVISAS, divisas)
  return { datos: divisas, error: false, actualizado: Date.now() }
}

/** Divisas que el usuario agregó a mano (pares fuera del top 10 fijo). */
export async function cargarDivisasPropias(
  pares: [string, string][],
  forzar = false,
): Promise<Resultado<Divisa[]>> {
  if (pares.length === 0) return { datos: [], error: false, actualizado: Date.now() }

  const necesarios = new Set(pares.map(([b, d]) => `${b}/${d}`))
  const cache = leerCache<Divisa[]>(CACHE_DIVISAS_PROPIAS)
  const cubiertos = cache != null && [...necesarios].every((k) => cache!.datos.some((d) => `${d.base}/${d.destino}` === k))
  if (!forzar && cache && cubiertos && fresco(cache)) {
    return {
      datos: cache.datos.filter((d) => necesarios.has(`${d.base}/${d.destino}`)),
      error: false,
      actualizado: cache.actualizado,
    }
  }

  const divisas = await fetchDivisas(pares)
  if (divisas.length === 0) {
    return {
      datos: cache?.datos.filter((d) => necesarios.has(`${d.base}/${d.destino}`)) ?? [],
      error: true,
      actualizado: cache?.actualizado ?? 0,
    }
  }
  guardarCache(CACHE_DIVISAS_PROPIAS, divisas)
  return { datos: divisas, error: false, actualizado: Date.now() }
}

// ----- Criptomonedas (CoinGecko): top 10 por capitalización -----

const CACHE_CRIPTOS = 'mh-criptos-cache'
const CACHE_CRIPTOS_PROPIAS = 'mh-criptos-propias-cache'

/** Pide a CoinGecko `/coins/markets` con el filtro dado (sin caché). */
async function fetchCriptos(query: string): Promise<Cripto[]> {
  const data = (await fetchJson(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&${query}&sparkline=true&price_change_percentage=24h`,
  )) as {
    id: string
    symbol: string
    name: string
    current_price: number
    market_cap: number | null
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
      capitalizacion: c.market_cap ?? 0,
      historial: c.sparkline_in_7d?.price ?? [],
    }))
}

export async function cargarCriptos(forzar = false): Promise<Resultado<Cripto[]>> {
  const cache = leerCache<Cripto[]>(CACHE_CRIPTOS)
  if (!forzar && fresco(cache)) return { datos: cache!.datos, error: false, actualizado: cache!.actualizado }

  try {
    const criptos = await fetchCriptos('order=market_cap_desc&per_page=10&page=1')
    if (criptos.length === 0) throw new Error('sin datos')
    guardarCache(CACHE_CRIPTOS, criptos)
    return { datos: criptos, error: false, actualizado: Date.now() }
  } catch {
    return { datos: cache?.datos ?? [], error: true, actualizado: cache?.actualizado ?? 0 }
  }
}

/** Criptomonedas que el usuario agregó a mano (fuera del top 10 fijo). */
export async function cargarCriptosPropias(ids: string[], forzar = false): Promise<Resultado<Cripto[]>> {
  if (ids.length === 0) return { datos: [], error: false, actualizado: Date.now() }

  const cache = leerCache<Cripto[]>(CACHE_CRIPTOS_PROPIAS)
  const cubiertos = cache != null && ids.every((id) => cache!.datos.some((c) => c.id === id))
  if (!forzar && cache && cubiertos && fresco(cache)) {
    return { datos: cache.datos.filter((c) => ids.includes(c.id)), error: false, actualizado: cache.actualizado }
  }

  try {
    const criptos = await fetchCriptos(`ids=${ids.join(',')}`)
    if (criptos.length === 0) throw new Error('sin datos')
    guardarCache(CACHE_CRIPTOS_PROPIAS, criptos)
    return { datos: criptos, error: false, actualizado: Date.now() }
  } catch {
    return { datos: cache?.datos.filter((c) => ids.includes(c.id)) ?? [], error: true, actualizado: cache?.actualizado ?? 0 }
  }
}

export interface ResultadoBusquedaCripto {
  id: string
  simbolo: string
  nombre: string
  rankCap: number | null
}

/** Busca criptos por nombre o símbolo (CoinGecko `/search`, sin clave). */
export async function buscarCriptos(query: string): Promise<ResultadoBusquedaCripto[]> {
  const q = query.trim()
  if (q.length < 2) return []
  try {
    const data = (await fetchJson(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`)) as {
      coins?: { id: string; symbol: string; name: string; market_cap_rank: number | null }[]
    }
    return (data.coins ?? []).slice(0, 8).map((c) => ({
      id: c.id,
      simbolo: c.symbol.toUpperCase(),
      nombre: c.name,
      rankCap: c.market_cap_rank,
    }))
  } catch {
    return []
  }
}

// ----- Acciones (Finnhub, requiere clave gratuita) -----

const CACHE_ACCIONES_KEY = 'mh-acciones-cache'
const CACHE_PERFILES_KEY = 'mh-perfiles-cache'
const FINNHUB_KEY_LS = 'mh-finnhub-key'
// Solo BYOK: cada usuario pega su clave gratuita de Finnhub. Antes había una
// clave incluida vía VITE_FINNHUB_KEY, pero cualquier VITE_* acaba legible en
// el bundle y el APK — no volver a incluirla. Cripto (CoinGecko) y divisas
// (Frankfurter) siguen funcionando sin clave.

export function getFinnhubKey(): string {
  return localStorage.getItem(FINNHUB_KEY_LS)?.trim() || ''
}

export function setFinnhubKey(clave: string) {
  localStorage.setItem(FINNHUB_KEY_LS, clave.trim())
}

/** Cotizaciones de acciones US con caché de 10 min; los fallos puntuales conservan lo guardado. */
export async function cargarAcciones(
  simbolos: string[],
  forzar = false,
): Promise<{ cotizaciones: CotizacionesMap; error: 'clave' | 'red' | null }> {
  const cache = leerCache<CotizacionesMap>(CACHE_ACCIONES_KEY)
  const cubiertos = cache != null && simbolos.every((s) => s in cache.datos)
  if (!forzar && cache && cubiertos && fresco(cache)) {
    return { cotizaciones: cache.datos, error: null }
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
        const pct = typeof q.dp === 'number' ? q.dp : q.pc ? ((q.c - q.pc) / q.pc) * 100 : 0
        return { s, accion: { simbolo: s, precio: q.c, cambioPct: pct } as Accion }
      } catch (e) {
        if (e instanceof Error && e.message.includes('401')) claveInvalida = true
        return { s, accion: undefined } // fallo de red: se conserva la caché de ese símbolo
      }
    }),
  )

  if (claveInvalida) return { cotizaciones: cache?.datos ?? {}, error: 'clave' }

  const cotizaciones: CotizacionesMap = {}
  let fallos = 0
  for (const { s, accion } of resultados) {
    if (accion === undefined) {
      fallos++
      cotizaciones[s] = cache?.datos[s] ?? null
    } else {
      cotizaciones[s] = accion
    }
  }

  if (fallos === simbolos.length && simbolos.length > 0) {
    return { cotizaciones: cache?.datos ?? cotizaciones, error: 'red' }
  }
  guardarCache(CACHE_ACCIONES_KEY, cotizaciones)
  return { cotizaciones, error: fallos > 0 ? 'red' : null }
}

interface PerfilAccion {
  nombre: string
  /** USD absolutos (la API los da en millones; aquí ya van multiplicados). */
  capitalizacion: number
}

/** Nombre y capitalización por ticker. Caché de un día: la cap casi no se mueve. */
async function cargarPerfiles(simbolos: string[], forzar = false): Promise<Record<string, PerfilAccion>> {
  const cache = leerCache<Record<string, PerfilAccion>>(CACHE_PERFILES_KEY)
  const cubiertos = cache != null && simbolos.every((s) => s in cache.datos)
  if (!forzar && cache && cubiertos && fresco(cache, TTL_PERFILES_MS)) return cache.datos

  const clave = getFinnhubKey()
  const perfiles: Record<string, PerfilAccion> = { ...cache?.datos }
  await Promise.all(
    simbolos.map(async (s) => {
      try {
        const p = (await fetchJson(
          `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(s)}&token=${clave}`,
        )) as { name?: string; marketCapitalization?: number }
        // `marketCapitalization` viene en MILLONES de USD; los ETF responden vacío.
        if (typeof p.marketCapitalization === 'number') {
          perfiles[s] = { nombre: p.name ?? s, capitalizacion: p.marketCapitalization * 1e6 }
        }
      } catch {
        /* se conserva lo que hubiera en caché para ese símbolo */
      }
    }),
  )
  if (Object.keys(perfiles).length > 0) guardarCache(CACHE_PERFILES_KEY, perfiles)
  return perfiles
}

/** Top 10 de Wall Street, ordenado por la capitalización que devuelve la API. */
export async function cargarAccionesMercado(
  forzar = false,
): Promise<Resultado<AccionMercado[]> & { errorClave: boolean }> {
  const [{ cotizaciones, error }, perfiles] = await Promise.all([
    cargarAcciones(ACCIONES_TOP, forzar),
    cargarPerfiles(ACCIONES_TOP, forzar),
  ])

  const acciones: AccionMercado[] = ACCIONES_TOP.flatMap((s) => {
    const q = cotizaciones[s]
    if (!q) return []
    const p = perfiles[s]
    return [{ ...q, nombre: p?.nombre ?? s, capitalizacion: p?.capitalizacion ?? 0 }]
  }).sort((a, b) => b.capitalizacion - a.capitalizacion)

  return {
    datos: acciones,
    error: error === 'red' || acciones.length === 0,
    errorClave: error === 'clave',
    actualizado: Date.now(),
  }
}

// ----- Materias primas (ETF vía Finnhub) -----

export async function cargarMateriasPrimas(
  forzar = false,
): Promise<Resultado<MateriaPrima[]> & { errorClave: boolean }> {
  const { cotizaciones, error } = await cargarAcciones(
    MATERIAS_PRIMAS.map((m) => m.simbolo),
    forzar,
  )
  const materias: MateriaPrima[] = MATERIAS_PRIMAS.flatMap((m) => {
    const q = cotizaciones[m.simbolo]
    return q ? [{ ...q, clave: m.clave }] : []
  })
  return {
    datos: materias,
    error: error === 'red' || materias.length === 0,
    errorClave: error === 'clave',
    actualizado: Date.now(),
  }
}
