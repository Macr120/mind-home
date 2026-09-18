// Geometría sobre coordenadas: distancias, proyección sobre un trazo y GPS.

export interface Coord {
  lat: number
  lng: number
}

/** Lectura del GPS del dispositivo. */
export interface PosicionGps extends Coord {
  /** Radio de precisión en metros. */
  precision: number
  /** Rumbo en grados (null si el dispositivo no lo da). */
  rumbo: number | null
}

const R = 6371000
const RAD = Math.PI / 180

/** Distancia en metros entre dos coordenadas (haversine). */
export function distanciaM(a: Coord, b: Coord): number {
  const dLat = (b.lat - a.lat) * RAD
  const dLng = (b.lng - a.lng) * RAD
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Proyección local en metros alrededor de `ref` (equirectangular: sobra para unos km). */
function aMetros(p: [number, number], ref: Coord): [number, number] {
  return [(p[1] - ref.lng) * RAD * R * Math.cos(ref.lat * RAD), (p[0] - ref.lat) * RAD * R]
}

/**
 * Segmento del trazo más cercano a `p`: índice del punto donde empieza, distancia
 * perpendicular en metros y cuánto queda desde la proyección hasta el punto
 * siguiente (para medir «cuánto falta» a lo largo de la ruta, no en línea recta).
 */
export function puntoMasCercano(
  puntos: [number, number][],
  p: Coord,
): { indice: number; distancia: number; restoSegmento: number } {
  if (puntos.length === 0) return { indice: 0, distancia: Infinity, restoSegmento: 0 }
  if (puntos.length === 1) {
    return { indice: 0, distancia: distanciaM(p, { lat: puntos[0][0], lng: puntos[0][1] }), restoSegmento: 0 }
  }
  let mejor = { indice: 0, distancia: Infinity, restoSegmento: 0 }
  let a = aMetros(puntos[0], p)
  for (let i = 0; i < puntos.length - 1; i++) {
    const b = aMetros(puntos[i + 1], p)
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l2 = dx * dx + dy * dy
    // `p` es el origen del sistema local, así que el parámetro sale de -a·(b-a).
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / l2))
    const px = a[0] + t * dx
    const py = a[1] + t * dy
    const d = Math.hypot(px, py)
    if (d < mejor.distancia) {
      mejor = { indice: i, distancia: d, restoSegmento: Math.hypot(b[0] - px, b[1] - py) }
    }
    a = b
  }
  return mejor
}

/** Longitud en metros del trazo entre dos índices. */
export function longitudTrazo(puntos: [number, number][], desde: number, hasta: number): number {
  let m = 0
  for (let i = desde; i < hasta && i < puntos.length - 1; i++) {
    m += distanciaM({ lat: puntos[i][0], lng: puntos[i][1] }, { lat: puntos[i + 1][0], lng: puntos[i + 1][1] })
  }
  return m
}

/** Una lectura del GPS. Rechaza con el `code` de la API (1 = permiso denegado). */
export function obtenerPosicion(): Promise<PosicionGps> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(Object.assign(new Error('sin geolocalización'), { code: 0 }))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precision: pos.coords.accuracy,
          rumbo: pos.coords.heading,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
    )
  })
}
