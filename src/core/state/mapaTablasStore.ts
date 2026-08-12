import { useEffect } from 'react'
import { create } from 'zustand'
import { VACIO, pisosExteriorRepo, zonasRepo } from '../data/repository'
import type { PisoExteriorCelda, ZonaPlano } from '../data/db'

/**
 * Las dos tablas del mapa que TODOS los cuartos leen enteras: las zonas del
 * plano y los overrides de piso exterior.
 *
 * Cada `Room3D` hacía su propio `useAll()` de las dos, así que una casa de 17
 * cuartos mantenía 34 consultas vivas materializando las MISMAS dos tablas, y
 * cada escritura las revalidaba todas. Aquí las lee un solo suscriptor
 * (`<HidratarMapaTablas/>`, montado una vez en `House`) y los cuartos leen del
 * store.
 *
 * Zustand y no un contexto de React a propósito: `Room3D` vive dentro del
 * reconciliador de react-three-fiber, que es otro árbol — un contexto de fuera
 * no lo cruza sin puente.
 */
interface MapaTablas {
  zonas: ZonaPlano[]
  pisosExterior: PisoExteriorCelda[]
}

export const useMapaTablas = create<MapaTablas>(() => ({
  zonas: VACIO,
  pisosExterior: VACIO,
}))

/** Único punto que consulta las dos tablas. Devuelve null: no pinta nada. */
export function HidratarMapaTablas() {
  const zonas = zonasRepo.useAll()
  const pisosExterior = pisosExteriorRepo.useAll()
  useEffect(() => {
    if (zonas) useMapaTablas.setState({ zonas })
  }, [zonas])
  useEffect(() => {
    if (pisosExterior) useMapaTablas.setState({ pisosExterior })
  }, [pisosExterior])
  return null
}
