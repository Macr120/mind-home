import { Suspense, lazy, useRef } from 'react'
import { POSES } from './Memes'

const Escenario3D = lazy(() => import('./Escenario3D'))

/**
 * `?pose=<id>`: Pep@ solo, a pantalla completa y sobre fondo transparente, en
 * la pose de un meme. `marketing/guias/memes.mjs` lo captura como PNG.
 */
export function Pose({ tema, id }: { tema: string; id: string }) {
  const nivel = useRef(0)
  const pose = POSES[id] ?? POSES.contento
  return (
    <div className="g-pose">
      <Suspense fallback={null}>
        <Escenario3D tema={tema} escena={pose.escena} nivel={nivel} cara={pose.cara} cerca />
      </Suspense>
    </div>
  )
}
