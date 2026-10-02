import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CapturaBusto, reducir } from '../core/buzon/RetratoAvatar'
import { anclasDe } from '../core/house/apariencia'
import { fijarRetratoDemo, PERSONAJES_DEMO, retratoGuardado } from './amigosDemo'

/**
 * Captura en un canvas oculto el busto de los amigos del demo que aún no lo
 * tienen (uno a la vez, como las caras de los asistentes) y lo deja como su
 * retrato. Con todo capturado no monta nada.
 */
export default function RetratosAmigosDemo() {
  const [pendientes, setPendientes] = useState(() =>
    Object.keys(PERSONAJES_DEMO).filter((id) => !retratoGuardado(id)),
  )
  const id = pendientes[0]
  const av = id ? PERSONAJES_DEMO[id] : undefined
  // Si WebGL falla no hay captura: se sigue con el siguiente para no colgarse.
  useEffect(() => {
    if (!id) return
    const tope = setTimeout(() => setPendientes((p) => p.filter((x) => x !== id)), 10_000)
    return () => clearTimeout(tope)
  }, [id])
  if (!id || !av) return null

  const a = anclasDe(av)
  const cara = { y: a.cabezaY * av.escala, z: (a.caraZ - a.cabezaR) * av.escala, r: a.cabezaR * av.escala }
  const listo = (canvas: HTMLCanvasElement) => {
    const url = reducir(canvas)
    if (url) void fijarRetratoDemo(id, url)
    setPendientes((p) => p.filter((x) => x !== id))
  }

  return (
    <div className="pointer-events-none fixed start-[-9999px] top-0 h-64 w-64" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ preserveDrawingBuffer: true, alpha: true }}
        camera={{ position: [1.5, 1.3, 3], fov: 30, near: 0.1, far: 100 }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 8, 5]} intensity={1.1} />
        <directionalLight position={[-4, 3, -3]} intensity={0.35} />
        <Suspense fallback={null}>
          <CapturaBusto key={id} av={av} cara={cara} onListo={listo} />
        </Suspense>
      </Canvas>
    </div>
  )
}
