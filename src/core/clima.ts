/**
 * Clima real: ubicación del dispositivo (con respaldo por IP) + Open-Meteo (sin API key).
 */

export interface ClimaActual {
  temp: number
  humedad: number
  viento: number
  probLluvia: number
  precipitacion: number
  codigo: number
  icono: string
  descripcion: string
  ciudad: string
  lat: number
  lon: number
  /** true si la ubicación no vino del GPS exacto. */
  aproximada: boolean
  actualizado: string
}

export type ErrorClima = 'sin_permiso' | 'no_disponible' | 'red' | 'desconocido'

export class ClimaError extends Error {
  readonly tipo: ErrorClima
  constructor(tipo: ErrorClima, msg: string) {
    super(msg)
    this.tipo = tipo
    this.name = 'ClimaError'
  }
}

const TIMEOUT_FETCH = 12_000

async function fetchConTimeout(url: string, ms = TIMEOUT_FETCH): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } catch {
    if (ctrl.signal.aborted) throw new ClimaError('red', 'Tiempo de espera agotado al consultar el servicio.')
    throw new ClimaError('red', 'Sin conexión al servicio de clima.')
  } finally {
    clearTimeout(t)
  }
}

/** Etiqueta e icono según código WMO (Open-Meteo). */
function climaDeCodigo(codigo: number): { icono: string; descripcion: string } {
  if (codigo === 0) return { icono: '☀️', descripcion: 'Despejado' }
  if (codigo <= 3) return { icono: '⛅', descripcion: 'Parcialmente nublado' }
  if (codigo <= 48) return { icono: '🌫️', descripcion: 'Niebla' }
  if (codigo <= 57) return { icono: '🌦️', descripcion: 'Llovizna' }
  if (codigo <= 67) return { icono: '🌧️', descripcion: 'Lluvia' }
  if (codigo <= 77) return { icono: '🌨️', descripcion: 'Nieve' }
  if (codigo <= 82) return { icono: '🌧️', descripcion: 'Chubascos' }
  if (codigo <= 86) return { icono: '🌨️', descripcion: 'Nieve intensa' }
  if (codigo <= 99) return { icono: '⛈️', descripcion: 'Tormenta' }
  return { icono: '🌡️', descripcion: 'Clima variable' }
}

interface Ubicacion {
  lat: number
  lon: number
  ciudad?: string
  aproximada: boolean
}

/** Ciudades conocidas por zona horaria (más fiables que la IP del ISP). */
const CIUDAD_POR_ZONA: Record<string, Ubicacion> = {
  'America/Mexico_City': {
    lat: 19.4326,
    lon: -99.1332,
    ciudad: 'Ciudad de México',
    aproximada: true,
  },
}

function zonaHoraria(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return ''
  }
}

function pedirGpsIntento(altaPrecision: boolean, timeoutMs: number): Promise<Ubicacion | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation || (typeof window !== 'undefined' && !window.isSecureContext)) {
      resolve(null)
      return
    }
    let listo = false
    const terminar = (v: Ubicacion | null) => {
      if (listo) return
      listo = true
      clearTimeout(timer)
      resolve(v)
    }
    const timer = setTimeout(() => terminar(null), timeoutMs)
    navigator.geolocation.getCurrentPosition(
      (p) =>
        terminar({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          aproximada: false,
        }),
      () => terminar(null),
      {
        enableHighAccuracy: altaPrecision,
        timeout: timeoutMs - 200,
        maximumAge: altaPrecision ? 120_000 : 900_000,
      },
    )
  })
}

/** GPS del navegador (precisión alta y luego rápido). */
async function pedirGps(): Promise<Ubicacion | null> {
  const exacto = await pedirGpsIntento(true, 10_000)
  if (exacto) return exacto
  return pedirGpsIntento(false, 6_000)
}

async function ipGeoJs(): Promise<Ubicacion | null> {
  const res = await fetchConTimeout('https://get.geojs.io/v1/ip/geo.json', 8_000)
  if (!res.ok) return null
  const data = (await res.json()) as { latitude?: string; longitude?: string; city?: string; region?: string }
  const lat = parseFloat(data.latitude ?? '')
  const lon = parseFloat(data.longitude ?? '')
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null
  return { lat, lon, ciudad: data.city ?? data.region, aproximada: true }
}

async function ipApiCo(): Promise<Ubicacion | null> {
  const res = await fetchConTimeout('https://ipapi.co/json/', 8_000)
  if (!res.ok) return null
  const data = (await res.json()) as { latitude?: number; longitude?: number; city?: string; error?: boolean }
  if (data.error || data.latitude == null || data.longitude == null) return null
  return { lat: data.latitude, lon: data.longitude, ciudad: data.city, aproximada: true }
}

async function ipWhoIs(): Promise<Ubicacion | null> {
  const res = await fetchConTimeout('https://ipwho.is/', 8_000)
  if (!res.ok) return null
  const data = (await res.json()) as {
    success?: boolean
    latitude?: number
    longitude?: number
    city?: string
  }
  if (!data.success || data.latitude == null || data.longitude == null) return null
  return { lat: data.latitude, lon: data.longitude, ciudad: data.city, aproximada: true }
}

/** Varios servicios de IP; el primero que responda gana. */
async function ubicacionPorIp(): Promise<Ubicacion | null> {
  for (const fn of [ipGeoJs, ipApiCo, ipWhoIs]) {
    try {
      const u = await fn()
      if (u) return u
    } catch {
      /* siguiente proveedor */
    }
  }
  return null
}

/** Ciudad según la zona horaria del sistema (antes que IP: evita suburbios tipo Texcoco). */
async function ubicacionDeZonaHoraria(): Promise<Ubicacion> {
  const tz = zonaHoraria()
  const fija = CIUDAD_POR_ZONA[tz]
  if (fija) return { ...fija }

  let nombre = 'Ciudad de México'
  if (tz.includes('/')) nombre = tz.split('/').pop()!.replace(/_/g, ' ')

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', nombre)
  url.searchParams.set('count', '1')
  url.searchParams.set('language', 'es')
  if (tz.startsWith('America/') && (nombre.includes('Mexico') || tz.includes('Mexico'))) {
    url.searchParams.set('countryCode', 'MX')
  }

  try {
    const res = await fetchConTimeout(url.toString(), 8_000)
    if (res.ok) {
      const data = (await res.json()) as {
        results?: { latitude: number; longitude: number; name: string }[]
      }
      const r = data.results?.[0]
      if (r) {
        return { lat: r.latitude, lon: r.longitude, ciudad: r.name, aproximada: true }
      }
    }
  } catch {
    /* fallback */
  }

  return { lat: 19.4326, lon: -99.1332, ciudad: 'Ciudad de México', aproximada: true }
}

/** GPS → zona horaria → IP (la IP suele marcar ciudad del proveedor, no la tuya). */
async function resolverUbicacion(): Promise<Ubicacion> {
  const gps = await pedirGps()
  if (gps) return gps

  const tz = await ubicacionDeZonaHoraria()
  if (tz) return tz

  const ip = await ubicacionPorIp()
  if (ip) return ip

  return { lat: 19.4326, lon: -99.1332, ciudad: 'Ciudad de México', aproximada: true }
}

function probLluviaDeHorario(
  tiempos: string[] | undefined,
  probs: number[] | undefined,
  refIso?: string,
): number {
  if (!tiempos?.length || !probs?.length) return 0
  const ref = refIso ? Date.parse(refIso) : Date.now()
  let mejor = 0
  let diffMin = Infinity
  for (let i = 0; i < tiempos.length; i++) {
    const t = Date.parse(tiempos[i])
    if (Number.isNaN(t)) continue
    const d = Math.abs(t - ref)
    if (d < diffMin) {
      diffMin = d
      mejor = probs[i] ?? 0
    }
  }
  return Math.round(mejor)
}

async function fetchOpenMeteo(lat: number, lon: number) {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation',
  )
  url.searchParams.set('hourly', 'precipitation_probability')
  url.searchParams.set('forecast_hours', '6')
  url.searchParams.set('wind_speed_unit', 'kmh')
  url.searchParams.set('timezone', 'auto')

  const res = await fetchConTimeout(url.toString())
  if (!res.ok) throw new ClimaError('red', 'No se pudo consultar el clima.')
  const data = (await res.json()) as {
    current?: {
      time?: string
      temperature_2m?: number
      relative_humidity_2m?: number
      weather_code?: number
      wind_speed_10m?: number
      precipitation?: number
    }
    hourly?: { time?: string[]; precipitation_probability?: number[] }
  }
  const c = data.current
  if (!c || c.temperature_2m == null || c.weather_code == null) {
    throw new ClimaError('red', 'Respuesta de clima incompleta.')
  }
  const { icono, descripcion } = climaDeCodigo(c.weather_code)
  return {
    temp: Math.round(c.temperature_2m * 10) / 10,
    humedad: Math.round(c.relative_humidity_2m ?? 0),
    viento: Math.round(c.wind_speed_10m ?? 0),
    probLluvia: probLluviaDeHorario(
      data.hourly?.time,
      data.hourly?.precipitation_probability,
      c.time,
    ),
    precipitacion: Math.round((c.precipitation ?? 0) * 10) / 10,
    codigo: c.weather_code,
    icono,
    descripcion,
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')
    url.searchParams.set('latitude', String(lat))
    url.searchParams.set('longitude', String(lon))
    url.searchParams.set('localityLanguage', 'es')
    const res = await fetchConTimeout(url.toString(), 6_000)
    if (!res.ok) return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
    const data = (await res.json()) as {
      city?: string
      locality?: string
      principalSubdivision?: string
    }
    return data.city ?? data.locality ?? data.principalSubdivision ?? `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
  } catch {
    return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
  }
}

/** Ubicación + clima actual (nunca debería colgar: timeouts en cada paso). */
export async function obtenerClimaReal(): Promise<ClimaActual> {
  const ub = await resolverUbicacion()
  const datos = await fetchOpenMeteo(ub.lat, ub.lon)
  const ciudad = ub.ciudad ?? (await reverseGeocode(ub.lat, ub.lon))
  return {
    ...datos,
    ciudad,
    lat: ub.lat,
    lon: ub.lon,
    aproximada: ub.aproximada,
    actualizado: new Date().toISOString(),
  }
}
