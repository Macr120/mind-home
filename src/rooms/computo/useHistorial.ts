import { useCallback, useRef, useState } from 'react'
import { MAX_DESHACER } from './constantes'

/**
 * Deshacer y rehacer con una pila de FOTOS del estado, no de operaciones
 * inversas.
 *
 * Es a propósito: un inverso hay que escribirlo bien para cada operación
 * (mover, insertar fila con reescritura de referencias, formato de un rango,
 * parche de la IA…) y uno solo mal escrito corrompe la hoja EN SILENCIO. Con
 * fotos, deshacer es «coge la anterior» y no puede estar mal.
 *
 * Y sale casi gratis: la rejilla ya crea un objeto `celdas` nuevo en cada
 * cambio, así que las versiones anteriores son inmutables de facto y no hay que
 * clonar nada. Una hoja típica son 2-8 KB; cuarenta fotos, un cuarto de mega, y
 * nunca tocan disco.
 *
 * Las pilas viven en un `useRef` y solo los dos booleanos son estado: así no hay
 * un `setState` dentro de un efecto (lint `react-hooks/set-state-in-effect`).
 */
export interface Historial<T> {
  /** Guarda el estado ANTERIOR al cambio; llámalo justo antes de aplicarlo. */
  registrar: (anterior: T) => void
  /** Devuelve el estado al que hay que volver, o null si no hay nada. */
  deshacer: (actual: T) => T | null
  rehacer: (actual: T) => T | null
  puedeDeshacer: boolean
  puedeRehacer: boolean
  /** Vacía el historial (al cambiar de hoja). */
  reiniciar: () => void
}

export function useHistorial<T>(max = MAX_DESHACER): Historial<T> {
  const atras = useRef<T[]>([])
  const adelante = useRef<T[]>([])
  const [puedeDeshacer, setPuedeDeshacer] = useState(false)
  const [puedeRehacer, setPuedeRehacer] = useState(false)

  const registrar = useCallback(
    (anterior: T) => {
      atras.current = [...atras.current, anterior].slice(-max)
      adelante.current = []
      setPuedeDeshacer(true)
      setPuedeRehacer(false)
    },
    [max],
  )

  const deshacer = useCallback((actual: T): T | null => {
    const previo = atras.current.at(-1)
    if (previo === undefined) return null
    atras.current = atras.current.slice(0, -1)
    adelante.current = [...adelante.current, actual]
    setPuedeDeshacer(atras.current.length > 0)
    setPuedeRehacer(true)
    return previo
  }, [])

  const rehacer = useCallback((actual: T): T | null => {
    const siguiente = adelante.current.at(-1)
    if (siguiente === undefined) return null
    adelante.current = adelante.current.slice(0, -1)
    atras.current = [...atras.current, actual]
    setPuedeDeshacer(true)
    setPuedeRehacer(adelante.current.length > 0)
    return siguiente
  }, [])

  const reiniciar = useCallback(() => {
    atras.current = []
    adelante.current = []
    setPuedeDeshacer(false)
    setPuedeRehacer(false)
  }, [])

  return { registrar, deshacer, rehacer, puedeDeshacer, puedeRehacer, reiniciar }
}
