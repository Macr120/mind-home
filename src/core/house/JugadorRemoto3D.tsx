import { useRef } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { AvatarModelo } from './AvatarModelo'
import { Marcadora } from './arma'
import { avanzarMarcha, type EstadoMarcha } from './animacion'
import { useHouse } from '../state/houseStore'
import { ySueloJugador } from '../state/carreraStore'
import { remotosFrame } from '../state/remotosFrame'
import type { Avatar } from '../state/disenoStore'

/** Velocidad de referencia de la zancada: la del avatar a pie (SPEED · 60 fps). */
const VEL_MARCHA = 2.5
/** Más de esto en un frame es un teletransporte y no debe contar como paso. */
const SALTO = 2

/**
 * Cuerpo de otro jugador. Monta el MISMO `AvatarModelo` que el personaje
 * principal, por prop y sin leer un solo store: así se ve idéntico al avatar
 * del otro (colores, ropa, rostro dibujado, cuerpo a medida) sin pasar por
 * `getAsistente`, que ante un id desconocido cae a `lista[0]` en silencio.
 *
 * La marcha es propia y se avanza con el DESPLAZAMIENTO REAL del cuerpo: el
 * remoto camina bien sin que viaje la fase de la zancada.
 */
export function JugadorRemoto3D({
  id,
  av,
  etiqueta,
  retrato,
  conMarcadora,
}: {
  id: string
  av: Avatar
  etiqueta: string
  retrato: string | null
  conMarcadora: boolean
}) {
  const g = useRef<THREE.Group>(null)
  const marcha = useRef<EstadoMarcha>({ velocidad: 0, fase: 0 })
  const prev = useRef({ x: 0, z: 0, listo: false })
  const opacidad = useRef(1)

  useFrame((_estado, delta) => {
    const gr = g.current
    if (!gr) return
    const c = remotosFrame[id]
    if (!c) {
      gr.visible = false
      prev.current.listo = false
      return
    }
    gr.visible = true
    c.y = ySueloJugador(c.nivel, !useHouse.getState().explotado, c.x, c.z)
    // Eliminado: cae tumbado sobre su mancha (visualmente distinto de ausente).
    gr.position.set(c.x, c.y + (c.fuera ? 0.35 : 0), c.z)
    gr.rotation.y = c.h
    gr.rotation.x = THREE.MathUtils.lerp(gr.rotation.x, c.fuera ? -Math.PI / 2 : 0, 0.12)

    const salto = prev.current.listo ? Math.hypot(c.x - prev.current.x, c.z - prev.current.z) : 0
    prev.current = { x: c.x, z: c.z, listo: true }
    avanzarMarcha(marcha.current, salto > SALTO ? 0 : salto, delta, VEL_MARCHA)

    // Ausente (pestaña en segundo plano): se desvanece en ~1 s y su hueco se
    // reserva mientras `remotosFrame` lo recuerde.
    const objetivo = c.ausente ? 0 : 1
    if (Math.abs(opacidad.current - objetivo) > 0.01) {
      opacidad.current = THREE.MathUtils.lerp(opacidad.current, objetivo, Math.min(1, delta * 4))
      const transparente = opacidad.current < 0.99
      gr.traverse((o) => {
        const mat = (o as THREE.Mesh).material
        if (!mat || Array.isArray(mat)) return
        const m = mat as THREE.MeshStandardMaterial
        m.transparent = transparente
        m.opacity = opacidad.current
      })
      gr.visible = opacidad.current > 0.02
    }
  })

  return (
    <group ref={g}>
      <AvatarModelo av={av} caminar marchaEstado={marcha.current} />
      {conMarcadora && (
        <group position={[0.34, 0.9, 0.18]} scale={av.escala}>
          <Marcadora />
        </group>
      )}
      {/* Cámara ortográfica: SIN `distanceFactor` (escalaría con una distancia
          que aquí no cambia). zIndexRange tope 30 = capa "mapa". */}
      <Html
        position={[0, 1.95 * av.escala, 0]}
        center
        zIndexRange={[30, 0]}
        style={{ pointerEvents: 'none', width: 'max-content' }}
      >
        <div className="ui-panel-glass pointer-events-none flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[11px] leading-none shadow">
          {retrato && <img src={retrato} alt="" className="h-4 w-4 rounded-full object-cover" />}
          <span>{etiqueta}</span>
        </div>
      </Html>
    </group>
  )
}
