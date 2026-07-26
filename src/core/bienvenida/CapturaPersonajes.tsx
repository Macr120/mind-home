import { useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { AvatarModelo } from '../house/AvatarModelo'
import { AVATAR_DEFAULT, type Avatar } from '../state/disenoStore'
import { MASCOTAS, type MascotaId } from '../chat/mascotas'
import { CUERPOS_PRESET } from '../house/cuerpos'
import { ESCALA_DEFAULT } from '../house/apariencia'

/**
 * Los 12 personajes del paso "¿Qué personaje quieres ser?" de la bienvenida:
 * Base + las 5 formas integradas + los 6 cuerpos prediseñados, cada uno con
 * su apariencia por defecto (nadie ha personalizado nada todavía en este
 * punto del onboarding).
 */
export interface PersonajeOnboarding {
  id: string
  nombre: string
  av: Avatar
}

const AV_BASE: Avatar = { ...AVATAR_DEFAULT, escala: ESCALA_DEFAULT, ropa: {} }
/** La Princesa se muestra justo después de Humano, no al final (mismo orden que la galería del editor). */
const PRINCESA_PRESET = CUERPOS_PRESET.find((c) => c.id === 'princesa')!

export const PERSONAJES_ONBOARDING: PersonajeOnboarding[] = [
  { id: 'base', nombre: 'Humano', av: AV_BASE },
  {
    id: PRINCESA_PRESET.id,
    nombre: PRINCESA_PRESET.nombre,
    av: { ...AV_BASE, modelo3d: PRINCESA_PRESET.piezas(), cuerpoPresetId: PRINCESA_PRESET.id },
  },
  ...MASCOTAS.map((m) => ({
    id: m.id as string,
    nombre: m.nombre,
    av: { ...AV_BASE, forma: m.id as MascotaId },
  })),
  ...CUERPOS_PRESET.filter((c) => c.id !== PRINCESA_PRESET.id).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    av: { ...AV_BASE, modelo3d: c.piezas(), cuerpoPresetId: c.id },
  })),
]

/** Dirección/distancia de cámara con la que se afinó el encuadre (ver `CapturaUna`). */
const CAMARA_DIR = new THREE.Vector3(1.5, 1.3, 3)
/** Altura aproximada del cuerpo Base, la referencia de encuadre "normal". */
const ALTURA_REFERENCIA = 1.72
/** Margen extra para que ningún personaje quede al ras del cuadro. */
const MARGEN_ENCUADRE = 1.15

/**
 * Captura un solo personaje: espera a que R3F lo pinte, mide su altura real
 * (sombreros, cascos, orejas… varían mucho entre los 12 modelos) y aleja/centra
 * la cámara según le corresponda, para que nadie quede cortado por arriba.
 */
function CapturaUna({ id, av, onListo }: { id: string; av: Avatar; onListo: (id: string, url: string) => void }) {
  const { gl, camera } = useThree()
  const grupo = useRef<THREE.Group>(null)
  useEffect(() => {
    let vivo = true
    // Dos rAF: deja que el render loop de R3F pinte el modelo antes de medirlo.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!vivo || !grupo.current) return
        const caja = new THREE.Box3().setFromObject(grupo.current)
        const alto = caja.max.y - caja.min.y || ALTURA_REFERENCIA
        const centroY = (caja.max.y + caja.min.y) / 2
        grupo.current.position.y = -centroY
        const factor = Math.max(1, alto / ALTURA_REFERENCIA) * MARGEN_ENCUADRE
        camera.position.set(CAMARA_DIR.x * factor, CAMARA_DIR.y * factor, CAMARA_DIR.z * factor)
        camera.lookAt(0, 0, 0)
        // Un rAF más: que R3F pinte con la cámara ya reencuadrada antes de capturar.
        requestAnimationFrame(() => {
          if (!vivo) return
          onListo(id, gl.domElement.toDataURL('image/png'))
        })
      })
    })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo re-capturar si cambia el id
  }, [id])
  return (
    <group ref={grupo}>
      <AvatarModelo av={av} />
    </group>
  )
}

/**
 * Renderiza los 12 personajes de `PERSONAJES_ONBOARDING` uno a la vez en un
 * único canvas oculto (fuera de pantalla) y devuelve sus capturas por id.
 * Solo un contexto WebGL activo a la vez, nunca 12 simultáneos.
 */
export function CapturaPersonajes({ onListo }: { onListo: (capturas: Record<string, string>) => void }) {
  const [indice, setIndice] = useState(0)
  const capturas = useRef<Record<string, string>>({})

  const registrar = (id: string, url: string) => {
    capturas.current[id] = url
    if (indice + 1 >= PERSONAJES_ONBOARDING.length) onListo(capturas.current)
    else setIndice((i) => i + 1)
  }

  const actual = PERSONAJES_ONBOARDING[indice]

  return (
    <div className="pointer-events-none fixed left-[-9999px] top-0 h-64 w-64" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: [1.5, 1.3, 3], fov: 30, near: 0.1, far: 100 }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 8, 5]} intensity={1.1} />
        <directionalLight position={[-4, 3, -3]} intensity={0.35} />
        <CapturaUna key={actual.id} id={actual.id} av={actual.av} onListo={registrar} />
      </Canvas>
    </div>
  )
}
