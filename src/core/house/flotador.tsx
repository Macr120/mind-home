import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ObjetoCuarto } from '../data/db'
import { esObjetoMapa } from '../state/disenoStore'
import { roomWorldPos } from '../state/layoutStore'
import { useFlotador } from '../state/flotadorStore'

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

// La dona ya NO se aborda sola al nadar hasta ella: el botón «Subirte» del hueco
// del cubo la ofrece al acercarte (ver `ContextoProximity`). El radio vive ahí.
