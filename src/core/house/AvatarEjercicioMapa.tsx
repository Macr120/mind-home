import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Avatar } from '../state/disenoStore'
import { playerPos } from '../state/houseStore'
import { useDemoEjercicio } from '../state/demoEjercicioStore'
import { RigEjercicio } from '../../rooms/ejercicio/anim/RigEjercicio'
import { patronDe } from '../../rooms/ejercicio/anim/resolver'

/** Cuánto dura la demostración en el mapa si el jugador no se mueve antes. */
const DURACION_MS = 15000
/** Desplazamiento a partir del cual se entiende que el jugador se fue. */
const DISTANCIA_SALIR = 0.35

/**
 * «Muéstrame el press banca» pedido desde el MAPA: el propio personaje hace el
 * ejercicio donde está (con su banco, barra…), en vez de abrir el visor. Sustituye
 * a `AvatarModelo` en `Character` mientras dura; termina sola a los 15 s o en
 * cuanto el jugador se mueve. Lazy: arrastra el rig y los patrones.
 */
export default function AvatarEjercicioMapa({ av, nombre }: { av: Avatar; nombre: string }) {
  const cerrar = useDemoEjercicio((s) => s.cerrar)
  const patron = useMemo(() => patronDe(nombre), [nombre])
  const origen = useRef<THREE.Vector3 | null>(null)

  useEffect(() => {
    if (!patron) {
      cerrar()
      return
    }
    const id = setTimeout(cerrar, DURACION_MS)
    return () => clearTimeout(id)
  }, [patron, cerrar])

  useFrame(() => {
    if (!origen.current) origen.current = playerPos.clone()
    else if (playerPos.distanceTo(origen.current) > DISTANCIA_SALIR) cerrar()
  })

  if (!patron) return null
  return <RigEjercicio av={av} patron={patron} jugando />
}
