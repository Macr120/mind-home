import { useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { useDialogo } from '../state/dialogoStore'
import { useMascota } from '../state/mascotaStore'
import { construyendoAhora } from '../state/construyendo'
import { AsistenteBurbuja } from '../ui/AsistenteBurbuja'

const punto = new THREE.Vector3()

/**
 * La nube de diálogo ANCLADA al asistente: sale de su cabeza (el pico apunta a
 * él) y solo mientras el personaje esté DENTRO del encuadre de la cámara. Si se
 * sale de pantalla la nube desaparece — hablar "desde la nada" en una esquina
 * fija ya no pasa; el mensaje sigue guardado en su hilo del chat.
 *
 * El chequeo va por frames (no por re-render): proyectar el ancla a la pantalla
 * es una multiplicación de matriz, y solo se hace mientras este asistente habla.
 */
export function NubeAsistente({ asistenteId, altura }: { asistenteId: string; altura: number }) {
  const ancla = useRef<THREE.Group>(null)
  const cuadro = useRef(0)
  const [aLaVista, setALaVista] = useState(false)
  const mensaje = useMascota((s) => s.mensaje)
  const pensando = useMascota((s) => s.pensando)
  const hablanteId = useMascota((s) => s.hablanteId)
  const mascotaId = useMascota((s) => s.mascota)
  const habla = (hablanteId ?? mascotaId) === asistenteId && (!!mensaje || pensando)

  useFrame(({ camera }) => {
    if (!habla) {
      // Al callar vuelve a cero: la próxima frase revisa el encuadre en su primer frame.
      cuadro.current = 0
      if (aLaVista) setALaVista(false)
      return
    }
    if (cuadro.current++ % 4) return
    const g = ancla.current
    if (!g) return
    // El HUD de los editores, la caja RPG del diálogo y las apps de los cuartos
    // ya cuentan lo mismo por su cuenta: allí la nube estorbaría.
    const tapado =
      useLayout.getState().editMode ||
      !!useHouse.getState().activeRoom ||
      useDialogo.getState().asistenteId != null ||
      construyendoAhora()
    g.getWorldPosition(punto).project(camera)
    const dentro =
      !tapado && punto.z < 1 && Math.abs(punto.x) < 0.98 && Math.abs(punto.y) < 0.98
    if (dentro !== aLaVista) setALaVista(dentro)
  })

  return (
    <group ref={ancla} position={[0, altura, 0]}>
      {habla && aLaVista && (
        // zIndexRange tope 30 (capa "mapa"): que nunca tape los paneles del HUD.
        // El pico de la nube queda EN el punto del ancla (de ahí el -100%).
        <Html
          zIndexRange={[30, 0]}
          style={{ transform: 'translate(-50%,-100%)', pointerEvents: 'none' }}
        >
          <AsistenteBurbuja asistenteId={asistenteId} />
        </Html>
      )}
    </group>
  )
}
