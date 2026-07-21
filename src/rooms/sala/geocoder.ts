// Búsqueda de lugares con Nominatim (OpenStreetMap), gratis y sin API key.
// Si no hay internet la app sigue funcionando: el lugar se captura a mano.

export interface LugarGeo {
  /** Texto completo del resultado, para mostrar en la lista. */
  etiqueta: string
  nombre: string
  pais: string
  estado?: string
  ciudad?: string
  lat: number
  lng: number
}

interface RespuestaNominatim {
  name?: string
  display_name: string
  lat: string
  lon: string
  address?: {
    country?: string
    state?: string
    province?: string
    region?: string
    city?: string
    town?: string
    village?: string
    municipality?: string
  }
}

function aLugar(r: RespuestaNominatim): LugarGeo {
  const a = r.address ?? {}
  return {
    etiqueta: r.display_name,
    nombre: r.name || r.display_name.split(',')[0].trim(),
    pais: a.country ?? '',
    estado: a.state ?? a.province ?? a.region,
    ciudad: a.city ?? a.town ?? a.village ?? a.municipality,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }
}

/** Busca lugares por texto libre ("parís", "chichén itzá", "japón"). */
export async function buscarLugares(consulta: string): Promise<LugarGeo[]> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=es&q=' +
    encodeURIComponent(consulta)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const datos = (await res.json()) as RespuestaNominatim[]
  return datos.map(aLugar)
}

/** Geocodificación inversa: qué hay en unas coordenadas (para pines puestos a mano). */
export async function lugarDesdeCoords(lat: number, lng: number): Promise<LugarGeo | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=10&accept-language=es&lat=${lat}&lon=${lng}`
  const res = await fetch(url)
  if (!res.ok) return null
  const dato = (await res.json()) as RespuestaNominatim & { error?: string }
  if (dato.error) return null
  const lugar = aLugar(dato)
  return { ...lugar, lat, lng }
}
