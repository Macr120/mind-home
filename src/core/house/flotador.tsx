import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ObjetoCuarto } from '../data/db'
import { useDiseño, esObjetoMapa } from '../state/disenoStore'
import { useHouse } from '../state/houseStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { playerPos } from '../state/playerPosition'
import { useMontura } from '../state/monturaStore'
import { useFlotador, flotadorFrame, TIPO_FLOTADOR } from '../state/flotadorStore'
import { dragChar } from './characterDrag'
import { subId, worldToSubCell } from './walls'

/**
 * Dona flotadora de las albercas: aparece sola al llenar de agua un sótano
 * (`sincronizarFlotadorAlberca` en disenoStore) y el personaje se SIENTA en ella
 * con solo nadar hasta su lado, sin botones: se baja en cuanto vuelve a moverse
 * (como el carrusel y el columpio del parque). Sentado, la dona se dibuja dentro
 * del grupo del Character; el resto del tiempo, en su sitio de la alberca.
 * Estado en `state/flotadorStore.ts`; la mecánica, en `Character.tsx`.
 */

/**
 * Radio del aro y grosor del tubo: el hueco (0.40) da para el torso del avatar
 * (0.30 de medio ancho) y sus piernas colgando (llegan a 0.38 al frente).
 */
const RADIO_ARO = 0.55
const TUBO = 0.15

/**
 * Offset local del avatar sentado en la dona: la cadera queda al ras de la
 * lámina (el aro le rodea la cintura) y las piernas cuelgan en el agua.
 */
export const ASIENTO_FLOTADOR: [number, number, number] = [0, -0.6, 0]

/** Distancia a la dona (su centro) para subirse al nadar hasta ella. */
const RADIO_SENTARSE = 1.3

/** Aro salvavidas: tubo de color con cuatro franjas blancas, apoyado en la lámina. */
function FlotadorForma({ color }: { color: string }) {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <torusGeometry args={[RADIO_ARO, TUBO, 12, 28]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[0, 0, i * (Math.PI / 2) + 0.2]}>
          <torusGeometry args={[RADIO_ARO, TUBO * 1.03, 10, 6, 0.42]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Instancia colocada en la alberca: cabecea con el oleaje y gira muy despacio.
 * Mientras se va sentado en ella no se dibuja aquí (viaja con el personaje).
 */
export function FlotadorObjeto({ color, objetoId }: { color: string; objetoId?: number }) {
  const g = useRef<THREE.Group>(null)
  const sentadoEnEsta = useFlotador((s) => objetoId != null && s.instanciaId === objetoId)
  useFrame(({ clock }) => {
    if (!g.current) return
    const t = clock.elapsedTime
    g.current.position.y = Math.sin(t * 1.15) * 0.05
    g.current.rotation.y = t * 0.12
    g.current.rotation.z = Math.sin(t * 0.9) * 0.05
  })
  if (sentadoEnEsta) return null
  return (
    <group ref={g}>
      <FlotadorForma color={color} />
    </group>
  )
}

/**
 * Dona que se lleva puesta, dentro del grupo del Character: el aro en la lámina
 * de agua y el avatar (children) sentado dentro del agujero.
 */
export function FlotadorMontado({ color, children }: { color: string; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!g.current) return
    g.current.rotation.z = Math.sin(clock.elapsedTime * 0.9) * 0.045
  })
  return (
    <group ref={g}>
      <FlotadorForma color={color} />
      <group position={ASIENTO_FLOTADOR}>{children}</group>
    </group>
  )
}

/** Posición de mundo de una dona (vive dentro del cuarto-alberca, en coords locales). */
export function posMundoFlotador(o: ObjetoCuarto): [number, number] {
  if (esObjetoMapa(o)) return [o.x ?? 0, o.z ?? 0]
  const [rx, , rz] = roomWorldPos(o.roomId)
  return [rx + (o.x ?? 0), rz + (o.z ?? 0)]
}

/**
 * Sienta al personaje en la dona más cercana al NADAR hasta ella (sin botón,
 * como los juegos de parque). Tras bajarse (`flotadorFrame.recienId`) no se
 * vuelve a subir hasta que se aleja.
 */
let accFlotador = 0
export function FlotadorProximity() {
  useFrame((_st3f, delta) => {
    // Sondeo ~4 veces/s (mismo criterio que VehiculoProximity: recorrer objetos a 60 Hz es caro).
    accFlotador += delta
    if (accFlotador < 0.25) return
    accFlotador = 0
    const flotador = useFlotador.getState()
    if (flotador.instanciaId != null) return // ya sentado
    const { transicion, playerLevel } = useHouse.getState()
    const layout = useLayout.getState()
    if (transicion || playerLevel !== -1 || layout.editMode || dragChar.id) return
    if (useMontura.getState().instanciaId != null) return // en un vehículo
    // Solo nadando: fuera del agua (búnker) la dona no sirve.
    const sub = worldToSubCell(playerPos.x, playerPos.z)
    if (!layout.subCeldasAgua.has(subId(sub.sc, sub.sr))) return
    let mejor: { o: ObjetoCuarto; x: number; z: number; d: number } | null = null
    let recienCerca = false
    for (const o of useDiseño.getState().objetos) {
      if (o.id == null || o.tipo !== TIPO_FLOTADOR) continue
      const [ox, oz] = posMundoFlotador(o)
      const d = Math.hypot(playerPos.x - ox, playerPos.z - oz)
      if (o.id === flotadorFrame.recienId && d <= RADIO_SENTARSE + 0.7) recienCerca = true
      if (d <= RADIO_SENTARSE && (!mejor || d < mejor.d)) mejor = { o, x: ox, z: oz, d }
    }
    if (!recienCerca) flotadorFrame.recienId = null // se alejó de la última usada
    if (mejor && mejor.o.id !== flotadorFrame.recienId) flotador.sentarse(mejor.o, mejor.x, mejor.z)
  })
  return null
}
