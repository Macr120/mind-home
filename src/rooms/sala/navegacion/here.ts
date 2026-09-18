// Cliente de HERE: Intermodal Routing v8 (transporte público y sus combinaciones),
// Routing v8 (auto, bici y a pie), Geocoding & Search v1 (buscador y reverso).
// Solo se tipa lo que la app usa de cada respuesta.

import type { ItinerarioNav, PasoNav, PiernaNav, PuntoNav } from '../../../core/data/db'
import { buscarLugares } from '../geocoder'
import { HERE_KEY } from './config'
import { esCalle, type ModoNav } from './modos'

interface LugarHere {
  name?: string
  location: { lat: number; lng: number }
}

interface AccionHere {
  action: string
  duration?: number
  instruction?: string
  /** Índice del punto de la polilínea donde empieza la maniobra. */
  offset?: number
  length?: number
  direction?: string
}

interface SeccionHere {
  type: string
  departure: { time: string; place: LugarHere }
  arrival: { time: string; place: LugarHere }
  transport?: {
    mode: string
    name?: string
    shortName?: string
    headsign?: string
    color?: string
  }
  agency?: { name?: string }
  polyline?: string
  travelSummary?: { duration: number; length: number }
  summary?: { duration: number; length: number }
  actions?: AccionHere[]
  intermediateStops?: { place?: LugarHere; departure?: { place: LugarHere } }[]
}

interface RutaHere {
  sections: SeccionHere[]
}

interface RespuestaRutas {
  routes?: RutaHere[]
  notices?: { title?: string }[]
}

interface ItemBusqueda {
  title: string
  resultType?: string
  position?: { lat: number; lng: number }
  address?: { label?: string }
  categories?: { id: string }[]
}

export interface PeticionPlan {
  origen: PuntoNav
  destino: PuntoNav
  modos: ModoNav[]
  cuando: 'ahora' | 'salir' | 'llegar'
  /** Valor de un `<input type="datetime-local">` (hora local). */
  hora?: string
  /** BCP 47 (es-MX, en-US…). */
  locale: string
}

export interface ResultadoGeo extends PuntoNav {
  /** Contexto para distinguir homónimos («Cuauhtémoc, Ciudad de México»). */
  detalle: string
  tipo: 'direccion' | 'lugar' | 'parada'
}

async function pedir<T>(url: string, params: Record<string, string>): Promise<T> {
  const u = new URL(url)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  u.searchParams.set('apiKey', HERE_KEY)
  const res = await fetch(u)
  if (!res.ok) throw new Error(`HERE ${res.status}`)
  return (await res.json()) as T
}

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/** «Flexible Polyline» de HERE → [lat, lng][] (la tercera dimensión, si viene, se ignora). */
export function decodificarFlexible(cadena: string): [number, number][] {
  const valores: number[] = []
  let acumulado = 0
  let desplazamiento = 0
  for (const c of cadena) {
    const v = ALFABETO.indexOf(c)
    if (v < 0) throw new Error('polilínea inválida')
    // Multiplicación en vez de `<<`: los valores pueden pasar de 32 bits.
    acumulado += (v & 0x1f) * 2 ** desplazamiento
    desplazamiento += 5
    if ((v & 0x20) === 0) {
      valores.push(acumulado)
      acumulado = 0
      desplazamiento = 0
    }
  }
  if (valores.length < 2 || valores[0] !== 1) throw new Error('polilínea inválida')
  const cabecera = valores[1]
  const factor = 10 ** (cabecera & 15)
  const dims = (cabecera >> 4) & 7 ? 3 : 2
  const zigzag = (n: number) => (n % 2 === 1 ? -((n + 1) / 2) : n / 2)
  const puntos: [number, number][] = []
  let lat = 0
  let lng = 0
  for (let i = 2; i + 1 < valores.length; i += dims) {
    lat += zigzag(valores[i])
    lng += zigzag(valores[i + 1])
    puntos.push([lat / factor, lng / factor])
  }
  return puntos
}

function aPunto(l: LugarHere, nombreSiFalta: string): PuntoNav {
  return { nombre: l.name || nombreSiFalta, lat: l.location.lat, lng: l.location.lng }
}

/** Maniobras de un tramo de calle; se descartan las que no traen texto (sin nada que mostrar). */
function aPasos(acciones: AccionHere[]): PasoNav[] {
  return acciones
    .filter((a) => a.instruction)
    .map((a) => ({
      texto: a.instruction as string,
      accion: a.action,
      direccion: a.direction,
      distancia: a.length ?? 0,
      desde: a.offset ?? 0,
    }))
}

function aPierna(s: SeccionHere, p: PeticionPlan, esPrimera: boolean, esUltima: boolean): PiernaNav {
  const modo = s.transport?.mode ?? (s.type === 'pedestrian' ? 'pedestrian' : s.type)
  const resumen = s.travelSummary ?? s.summary
  const pierna: PiernaNav = {
    modo,
    de: aPunto(s.departure.place, esPrimera ? p.origen.nombre : ''),
    a: aPunto(s.arrival.place, esUltima ? p.destino.nombre : ''),
    salida: s.departure.time,
    llegada: s.arrival.time,
    duracion: resumen?.duration ?? Math.max(0, (Date.parse(s.arrival.time) - Date.parse(s.departure.time)) / 1000),
    puntos: s.polyline ? decodificarFlexible(s.polyline) : [],
  }
  if (esCalle(modo)) {
    pierna.distancia = resumen?.length ?? 0
    if (s.actions?.length) pierna.pasos = aPasos(s.actions)
  } else {
    pierna.linea = s.transport?.shortName || s.transport?.name || undefined
    pierna.destinoLinea = s.transport?.headsign || undefined
    pierna.color = s.transport?.color || undefined
    pierna.agencia = s.agency?.name || undefined
    pierna.paradas = (s.intermediateStops ?? [])
      .map((x) => x.place ?? x.departure?.place)
      .filter((x): x is LugarHere => !!x)
      .map((x) => aPunto(x, ''))
  }
  // Un tramo sin nombre en un extremo hereda el del vecino (la parada/estacionamiento).
  if (!pierna.de.nombre) pierna.de.nombre = pierna.a.nombre
  if (!pierna.a.nombre) pierna.a.nombre = pierna.de.nombre
  return pierna
}

function aItinerario(r: RutaHere, p: PeticionPlan): ItinerarioNav {
  const secciones = r.sections.filter((s) => s.type === 'pedestrian' || s.type === 'transit' || s.type === 'vehicle')
  const piernas = secciones.map((s, i) => aPierna(s, p, i === 0, i === secciones.length - 1))
  const salida = piernas[0].salida
  const llegada = piernas[piernas.length - 1].llegada
  return {
    salida,
    llegada,
    duracion: Math.max(0, (Date.parse(llegada) - Date.parse(salida)) / 1000),
    transbordos: Math.max(0, piernas.filter((x) => !esCalle(x.modo)).length - 1),
    piernas,
  }
}

/** Hora del formulario → RFC 3339 con la zona del dispositivo (lo que espera HERE). */
function horaRfc(hora: string): string {
  const d = new Date(hora)
  const off = -d.getTimezoneOffset()
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0')
  const local = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
  return `${local}${off >= 0 ? '+' : '-'}${p(Math.floor(off / 60))}:${p(off % 60)}`
}

const MODO_CALLE: Record<Exclude<ModoNav, 'transporte'>, string> = {
  caminar: 'pedestrian',
  bici: 'bicycle',
  auto: 'car',
}

/**
 * Itinerarios entre dos puntos combinando los modos elegidos. Con transporte
 * público, la bici o el auto sirven para llegar a la estación («bike & ride»,
 * «park & ride»: Intermodal Routing con `vehicle[enable]=routeHead`); sin él,
 * cada modo es una conexión directa del Routing v8 con sus maniobras.
 */
export async function planificar(p: PeticionPlan): Promise<ItinerarioNav[]> {
  const calle = (['caminar', 'bici', 'auto'] as const).filter((m) => p.modos.includes(m))
  const transporte = p.modos.includes('transporte')
  const tiempo: Record<string, string> = {}
  if (p.cuando !== 'ahora' && p.hora) tiempo[p.cuando === 'llegar' ? 'arrivalTime' : 'departureTime'] = horaRfc(p.hora)
  const base = {
    origin: `${p.origen.lat},${p.origen.lng}`,
    destination: `${p.destino.lat},${p.destino.lng}`,
    lang: p.locale,
    ...tiempo,
  }

  const peticiones: Promise<ItinerarioNav[]>[] = []
  if (transporte) {
    const intermodal = (extra: Record<string, string>) =>
      pedir<RespuestaRutas>('https://intermodal.router.hereapi.com/v8/routes', {
        ...base,
        alternatives: '3',
        return: 'polyline,actions,travelSummary,intermediate',
        'taxi[enable]': '',
        'rented[enable]': '',
        ...extra,
      }).then((r) => (r.routes ?? []).map((ruta) => aItinerario(ruta, p)))
    // A pie + transporte, siempre.
    peticiones.push(intermodal({ 'vehicle[enable]': '' }))
    // Con vehículo propio hasta la estación.
    const vehiculos = calle.filter((m) => m !== 'caminar').map((m) => MODO_CALLE[m])
    if (vehiculos.length) {
      peticiones.push(intermodal({ 'vehicle[modes]': vehiculos.join(','), 'vehicle[enable]': 'routeHead' }))
    }
  }
  const directos = transporte ? calle.filter((m) => m !== 'caminar') : calle.length ? calle : ['caminar' as const]
  for (const m of directos) {
    peticiones.push(
      pedir<RespuestaRutas>('https://router.hereapi.com/v8/routes', {
        ...base,
        transportMode: MODO_CALLE[m],
        return: 'polyline,actions,instructions,summary',
      }).then((r) => (r.routes ?? []).map((ruta) => aItinerario(ruta, p))),
    )
  }

  const listas = await Promise.all(peticiones)
  const directas = listas
    .slice(transporte ? (calle.some((m) => m !== 'caminar') ? 2 : 1) : 0)
    .flat()
    .sort((a, b) => a.duracion - b.duracion)
  const transito = transporte ? listas.slice(0, calle.some((m) => m !== 'caminar') ? 2 : 1).flat() : []
  // El mismo viaje puede salir en las dos peticiones de transporte: se queda una copia.
  const vistos = new Set<string>()
  const unicos = transito.filter((it) => {
    const clave = `${it.salida}|${it.llegada}|${it.piernas.map((x) => `${x.modo}:${x.linea ?? ''}`).join('>')}`
    if (vistos.has(clave)) return false
    vistos.add(clave)
    return true
  })
  unicos.sort((a, b) => Date.parse(a.llegada) - Date.parse(b.llegada))
  return [...directas, ...unicos]
}

function aResultado(i: ItemBusqueda): ResultadoGeo {
  const pos = i.position as { lat: number; lng: number }
  const etiqueta = i.address?.label ?? ''
  const detalle = etiqueta.startsWith(i.title) ? etiqueta.slice(i.title.length).replace(/^,\s*/, '') : etiqueta
  const tipo: ResultadoGeo['tipo'] = i.categories?.some((c) => c.id.startsWith('400-4'))
    ? 'parada'
    : i.resultType === 'street' || i.resultType === 'houseNumber' || i.resultType === 'addressBlock'
      ? 'direccion'
      : 'lugar'
  return { nombre: i.title, detalle, lat: pos.lat, lng: pos.lng, tipo }
}

/** Sugerencias para un texto a medio escribir, sesgadas hacia `cerca` (sin ella, geocodificación plana). */
export async function geocodificar(
  texto: string,
  idioma: string,
  cerca?: { lat: number; lng: number } | null,
): Promise<ResultadoGeo[]> {
  try {
    const params: Record<string, string> = { q: texto, lang: idioma, limit: '8' }
    let items: ItemBusqueda[]
    if (cerca) {
      params.at = `${cerca.lat},${cerca.lng}`
      items = (await pedir<{ items: ItemBusqueda[] }>('https://autosuggest.search.hereapi.com/v1/autosuggest', params)).items
    } else {
      items = (await pedir<{ items: ItemBusqueda[] }>('https://geocode.search.hereapi.com/v1/geocode', params)).items
    }
    // Las consultas de categoría/cadena no tienen posición: no sirven como punto.
    return items.filter((i) => i.position).map(aResultado)
  } catch {
    // Respaldo: Nominatim, el geocodificador que ya usa el resto de la sala.
    return (await buscarLugares(texto)).map((l) => ({
      nombre: l.nombre,
      detalle: [l.ciudad, l.estado, l.pais].filter(Boolean).join(', '),
      lat: l.lat,
      lng: l.lng,
      tipo: 'lugar' as const,
    }))
  }
}

/** Nombre de unas coordenadas (para los puntos fijados tocando el mapa). */
export async function nombreDeCoords(lat: number, lng: number, idioma: string): Promise<string> {
  try {
    const r = await pedir<{ items: ItemBusqueda[] }>('https://revgeocode.search.hereapi.com/v1/revgeocode', {
      at: `${lat},${lng}`,
      lang: idioma,
      limit: '1',
    })
    if (r.items[0]?.title) return r.items[0].title
  } catch {
    // Sin red o sin cobertura: se queda con las coordenadas.
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}
