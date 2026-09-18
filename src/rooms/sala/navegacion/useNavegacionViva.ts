import { useCallback, useEffect, useRef, useState } from 'react'
import type { ItinerarioNav } from '../../../core/data/db'
import { distanciaM, longitudTrazo, puntoMasCercano, type PosicionGps } from './geo'
import { familiaModo } from './modos'

export type EstadoGps = 'apagado' | 'buscando' | 'activo' | 'denegado' | 'error'

/** Dónde va el usuario dentro del itinerario. */
export interface Progreso {
  /** Índice de la pierna en curso. */
  tramo: number
  /** Siguiente maniobra dentro del tramo (null: hasta el final del tramo). */
  paso: number | null
  /** Metros a lo largo de la ruta hasta esa maniobra o el fin del tramo. */
  distanciaAlPaso: number
  /** Metros en perpendicular a la ruta. */
  distanciaARuta: number
  fueraDeRuta: boolean
  llegaste: boolean
}

function calcularProgreso(it: ItinerarioNav, p: PosicionGps, tramoPrevio: number): Progreso {
  const n = it.piernas.length
  const buscar = (desde: number, hasta: number) => {
    let mejor = { tramo: desde, indice: 0, distancia: Infinity, resto: 0 }
    for (let i = desde; i < hasta; i++) {
      const r = puntoMasCercano(it.piernas[i].puntos, p)
      if (r.distancia < mejor.distancia) mejor = { tramo: i, indice: r.indice, distancia: r.distancia, resto: r.restoSegmento }
    }
    return mejor
  }
  // Primero del tramo actual hacia delante: en una ida y vuelta por la misma
  // calle no hay que saltar atrás. Solo se retrocede si atrás está claramente más cerca.
  let mejor = buscar(tramoPrevio, n)
  if (mejor.distancia > 80 && tramoPrevio > 0) {
    const atras = buscar(0, tramoPrevio)
    if (atras.distancia < mejor.distancia - 40) mejor = atras
  }
  const pierna = it.piernas[mejor.tramo]
  let paso: number | null = null
  if (pierna.pasos?.length) {
    const i = pierna.pasos.findIndex((s) => s.desde > mejor.indice)
    paso = i >= 0 ? i : null
  }
  const hasta = paso != null && pierna.pasos ? pierna.pasos[paso].desde : pierna.puntos.length - 1
  const distanciaAlPaso = mejor.resto + longitudTrazo(pierna.puntos, mejor.indice + 1, hasta)
  const destino = it.piernas[n - 1].a
  const ultimo = mejor.tramo === n - 1
  const llegaste = distanciaM(p, destino) < 30 || (ultimo && paso == null && distanciaAlPaso < 25)
  const familia = familiaModo(pierna.modo)
  const umbral = familia === 'WALK' ? 60 : familia === 'BIKE' ? 90 : 150
  return {
    tramo: mejor.tramo,
    paso,
    distanciaAlPaso,
    distanciaARuta: mejor.distancia,
    fueraDeRuta: mejor.distancia > umbral,
    llegaste,
  }
}

/**
 * Navegación en vivo: sigue el GPS y sitúa al usuario en el itinerario
 * (tramo, siguiente maniobra y cuánto falta). API imperativa —`iniciar()` /
 * `detener()` desde los botones— para no encender el GPS desde un efecto.
 */
export function useNavegacionViva(itinerario: ItinerarioNav | null) {
  const [posicion, setPosicion] = useState<PosicionGps | null>(null)
  const [estado, setEstado] = useState<EstadoGps>('apagado')
  const [progreso, setProgreso] = useState<Progreso | null>(null)
  const itRef = useRef(itinerario)
  const watchId = useRef<number | null>(null)
  const tramo = useRef(0)
  const fueraSeguidas = useRef(0)
  const wakeLock = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    itRef.current = itinerario
  }, [itinerario])

  const detener = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation?.clearWatch(watchId.current)
      watchId.current = null
    }
    void wakeLock.current?.release().catch(() => {})
    wakeLock.current = null
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setEstado('apagado')
    setProgreso(null)
  }, [])

  const iniciar = useCallback(() => {
    if (!navigator.geolocation) {
      setEstado('error')
      return
    }
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    tramo.current = 0
    fueraSeguidas.current = 0
    setEstado('buscando')
    setProgreso(null)
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p: PosicionGps = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precision: pos.coords.accuracy,
          rumbo: pos.coords.heading,
        }
        setPosicion(p)
        setEstado('activo')
        const it = itRef.current
        // Una lectura muy imprecisa mueve el punto pero no el progreso.
        if (!it || pos.coords.accuracy > 150) return
        const prog = calcularProgreso(it, p, tramo.current)
        tramo.current = prog.tramo
        // Fuera de ruta solo tras tres lecturas seguidas: el GPS salta.
        fueraSeguidas.current = prog.fueraDeRuta ? fueraSeguidas.current + 1 : 0
        setProgreso({ ...prog, fueraDeRuta: fueraSeguidas.current >= 3 })
      },
      (err) => setEstado(err.code === 1 ? 'denegado' : 'error'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    )
    // Pantalla encendida mientras se navega (donde el navegador lo permita).
    void navigator.wakeLock
      ?.request('screen')
      .then((s) => {
        wakeLock.current = s
      })
      .catch(() => {})
  }, [])

  // Al desmontar (cerrar el cuarto con la navegación en marcha).
  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current)
      void wakeLock.current?.release().catch(() => {})
    },
    [],
  )

  return { posicion, estado, progreso, iniciar, detener }
}
