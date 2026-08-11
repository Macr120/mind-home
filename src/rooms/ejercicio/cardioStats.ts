import type { PuntoRuta, SistemaUnidades } from '../../core/data/db'
import { distanciaAKm } from './unidades'

/**
 * Estadísticas derivadas del trazo GPS de un entreno de resistencia.
 *
 * Todo se calcula aquí (funciones puras) para que la vista de detalle y el
 * panel en vivo pinten exactamente lo mismo. La base solo guarda los puntos:
 * ritmos, parciales y desnivel se reconstruyen al vuelo.
 */

/** Desnivel menor que esto es ruido del GPS, no una cuesta. */
const UMBRAL_ALT_M = 2
/** Ventana mínima para la velocidad máxima: sin ella un salto del GPS la dispara. */
const VENTANA_VEL_S = 10

/** Distancia en metros entre dos coordenadas (haversine). */
export function distanciaM(a: PuntoRuta, b: PuntoRuta) {
  const R = 6371000
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Un parcial (km o milla completados) con su tiempo y su desnivel. */
export interface Parcial {
  /** 1 = primer parcial. */
  n: number
  /** Distancia real del parcial en la unidad del usuario (el último suele ser < 1). */
  dist: number
  segundos: number
  /** Minutos por unidad de distancia. */
  ritmo: number
  subidaM: number
  bajadaM: number
  ppm?: number
  /** Índice del punto de la ruta donde se cierra, para marcarlo en el croquis. */
  indice: number
}

/** Punto de las gráficas: distancia acumulada + ritmo suavizado y altitud. */
export interface PuntoSerie {
  dist: number
  ritmo: number
  altM?: number
}

export interface MetricasRuta {
  /** Con tiempos por punto se puede calcular ritmo, velocidad y parciales. */
  conTiempo: boolean
  conAltitud: boolean
  /** Distancia total en la unidad del usuario. */
  dist: number
  segundos: number
  /** Velocidad máxima sostenida (unidad del usuario por hora). */
  velMax: number
  subidaM: number
  bajadaM: number
  serie: PuntoSerie[]
  parciales: Parcial[]
}

/** Interpola linealmente el valor de `ys` a la distancia `d` sobre `acum`. */
function interpolar(acum: number[], ys: number[], d: number) {
  if (d <= acum[0]) return ys[0]
  const fin = acum.length - 1
  if (d >= acum[fin]) return ys[fin]
  let i = 1
  while (i < fin && acum[i] < d) i++
  const tramo = acum[i] - acum[i - 1]
  const k = tramo > 0 ? (d - acum[i - 1]) / tramo : 0
  return ys[i - 1] + (ys[i] - ys[i - 1]) * k
}

/**
 * Recorre la ruta y devuelve todo lo que la vista necesita. Trabaja en la
 * unidad del usuario: con millas, los parciales son de una milla.
 */
export function metricasRuta(
  puntos: PuntoRuta[] | undefined,
  unidades?: SistemaUnidades,
): MetricasRuta | null {
  if (!puntos || puntos.length < 2) return null

  // Longitud del parcial expresada en km (1 km, o 1.609 km si son millas).
  const unidadKm = distanciaAKm(1, unidades)
  const conTiempo = puntos.every((p) => typeof p.t === 'number')
  const conAltitud = puntos.some((p) => typeof p.alt === 'number')

  const acum: number[] = [0] // distancia acumulada en unidades del usuario
  const tiempos: number[] = [puntos[0].t ?? 0]
  const altitudes: number[] = []
  let total = 0
  let subida = 0
  let bajada = 0
  let refAlt: number | null = null
  // Desnivel y distancia de cada segmento, para repartirlos entre los parciales.
  const subSeg: number[] = [0]
  const bajSeg: number[] = [0]

  for (let i = 0; i < puntos.length; i++) {
    if (i > 0) {
      total += distanciaM(puntos[i - 1], puntos[i]) / 1000 / unidadKm
      acum.push(total)
      tiempos.push(puntos[i].t ?? tiempos[i - 1])
      let s = 0
      let b = 0
      const alt = puntos[i].alt
      if (typeof alt === 'number') {
        if (refAlt === null) refAlt = alt
        else if (Math.abs(alt - refAlt) >= UMBRAL_ALT_M) {
          if (alt > refAlt) s = alt - refAlt
          else b = refAlt - alt
          refAlt = alt
        }
      }
      subida += s
      bajada += b
      subSeg.push(s)
      bajSeg.push(b)
    } else if (typeof puntos[0].alt === 'number') {
      refAlt = puntos[0].alt
    }
    altitudes.push(puntos[i].alt ?? altitudes[i - 1] ?? 0)
  }

  const segundos = conTiempo ? Math.max(0, tiempos[tiempos.length - 1] - tiempos[0]) : 0

  // Velocidad máxima: la mejor ventana de al menos VENTANA_VEL_S segundos.
  let velMax = 0
  if (conTiempo) {
    let j = 0
    for (let i = 1; i < puntos.length; i++) {
      while (j < i - 1 && tiempos[i] - tiempos[j + 1] >= VENTANA_VEL_S) j++
      const dt = tiempos[i] - tiempos[j]
      if (dt < VENTANA_VEL_S) continue
      velMax = Math.max(velMax, (acum[i] - acum[j]) / (dt / 3600))
    }
  }

  // Parciales: se cierra uno cada vez que la distancia cruza un entero.
  const parciales: Parcial[] = []
  if (conTiempo && total > 0) {
    let n = 1
    let iniDist = 0
    let iniSeg = tiempos[0]
    let sub = 0
    let baj = 0
    for (let i = 1; i < puntos.length; i++) {
      sub += subSeg[i]
      baj += bajSeg[i]
      while (acum[i] >= n && n <= Math.floor(total)) {
        const segFin = interpolar(acum, tiempos, n)
        parciales.push({
          n,
          dist: n - iniDist,
          segundos: Math.round(segFin - iniSeg),
          ritmo: (segFin - iniSeg) / 60 / (n - iniDist),
          subidaM: Math.round(sub),
          bajadaM: Math.round(baj),
          indice: i,
        })
        iniDist = n
        iniSeg = segFin
        sub = 0
        baj = 0
        n++
      }
    }
    // Cola: el trozo que no llegó a completar un parcial entero.
    const resto = total - iniDist
    if (resto > 0.05) {
      const segFin = tiempos[tiempos.length - 1]
      parciales.push({
        n,
        dist: resto,
        segundos: Math.round(segFin - iniSeg),
        ritmo: (segFin - iniSeg) / 60 / resto,
        subidaM: Math.round(sub),
        bajadaM: Math.round(baj),
        indice: puntos.length - 1,
      })
    }
  }

  // Serie de la gráfica: ritmo con ventana móvil para que no salga en zigzag.
  const serie: PuntoSerie[] = []
  if (conTiempo && total > 0 && segundos > 0) {
    const paso = Math.max(total / 60, 0.02)
    const ventana = Math.max(total / 20, 0.08)
    for (let d = 0; d <= total + 1e-9; d += paso) {
      const a = Math.max(0, d - ventana / 2)
      const b = Math.min(total, d + ventana / 2)
      const dd = b - a
      if (dd <= 0) continue
      const dt = interpolar(acum, tiempos, b) - interpolar(acum, tiempos, a)
      if (dt <= 0) continue // varios puntos en el mismo segundo: no hay ritmo que pintar
      serie.push({
        dist: d,
        ritmo: dt / 60 / dd,
        altM: conAltitud ? interpolar(acum, altitudes, d) : undefined,
      })
    }
  }

  return {
    conTiempo,
    conAltitud,
    dist: total,
    segundos,
    velMax,
    subidaM: Math.round(subida),
    bajadaM: Math.round(bajada),
    serie,
    parciales,
  }
}

/**
 * Calorías estimadas por el método MET: equivalente metabólico según la
 * velocidad × peso × horas. Es una aproximación de campo (la misma que usan
 * los relojes sin sensor de potencia), por eso la UI la marca como estimada.
 */
export function caloriasEstimadas(km: number, minutos: number, pesoKg = 70) {
  if (minutos <= 0) return 0
  const horas = minutos / 60
  const kmh = km / horas
  // Sin distancia (bici estática, remo…) se asume esfuerzo moderado.
  const met = km <= 0 ? 6 : kmh < 6.5 ? 2 + 0.6 * kmh : 1.05 * kmh
  return Math.round(met * pesoKg * horas)
}

/** mm:ss (o h:mm:ss) para tiempos de parcial y cronómetro. */
export function fmtTiempo(seg: number) {
  const s = Math.max(0, Math.round(seg))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const mmss = `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return h > 0 ? `${h}:${mmss}` : mmss
}

/** Ritmo en minutos por unidad → «6:20». */
export function fmtRitmoMin(ritmo: number) {
  if (!Number.isFinite(ritmo) || ritmo <= 0) return '—'
  const min = Math.floor(ritmo)
  const seg = Math.round((ritmo - min) * 60)
  return seg === 60 ? `${min + 1}:00` : `${min}:${String(seg).padStart(2, '0')}`
}
