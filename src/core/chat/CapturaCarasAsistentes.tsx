import { Component, Suspense, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { CapturaBusto, reducir } from '../buzon/RetratoAvatar'
import { AsistenteModelo } from '../house/AsistenteModelo'
import { firmaCara, useCarasAsistentes } from './carasAsistentes'
import type { Asistente } from './mascotas'

/** Si WebGL o el .glb fallan, el asistente se queda con su emoji. */
class LimiteCaptura extends Component<{ children: ReactNode; onError: () => void }, { roto: boolean }> {
  state = { roto: false }
  static getDerivedStateFromError() {
    return { roto: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.roto ? null : this.props.children
  }
}

/**
 * Captura el busto de UN asistente en un canvas oculto (como `RetratoAvatar`);
 * al guardarlo, `CarasAsistentesAlDia` pasa al siguiente que lo necesite.
 */
export function CapturaCarasAsistentes({ asistente }: { asistente: Asistente }) {
  const firma = firmaCara(asistente)
  const guardar = (url: string | null) => {
    const previa = useCarasAsistentes.getState().caras[asistente.id]?.url
    // Aun sin captura se guarda la firma: si no, se reintentaría sin fin.
    useCarasAsistentes.getState().guardar(asistente.id, { f: firma, url: url ?? previa ?? '' })
  }

  return (
    <div className="pointer-events-none fixed start-[-9999px] top-0 h-64 w-64" aria-hidden>
      <LimiteCaptura key={`${asistente.id}:${firma}`} onError={() => guardar(null)}>
        <Canvas
          dpr={[1, 1.5]}
          gl={{ preserveDrawingBuffer: true, alpha: true }}
          camera={{ position: [1.5, 1.3, 3], fov: 30, near: 0.1, far: 100 }}
        >
          <ambientLight intensity={0.9} />
          <directionalLight position={[4, 8, 5]} intensity={1.1} />
          <directionalLight position={[-4, 3, -3]} intensity={0.35} />
          {/* El .glb suspende: la captura empieza cuando ya está cargado. */}
          <Suspense fallback={null}>
            <CapturaBusto onListo={(canvas) => guardar(reducir(canvas))}>
              <AsistenteModelo asistente={asistente} />
            </CapturaBusto>
          </Suspense>
        </Canvas>
      </LimiteCaptura>
    </div>
  )
}
