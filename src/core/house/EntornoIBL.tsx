import { Component, Suspense, type ReactNode } from 'react'
import { Environment, Lightformer } from '@react-three/drei'
import { useTemaActivo } from './useTema'
import { useRealismo } from './materialesPBR'
import { useCiclo } from '../state/cicloStore'
import { estadoCielo } from './cielo'

/** Entornos HDRI de `public/hdri/<id>_1k.hdr` (Poly Haven, CC0). */
export const HDRIS = ['estudio', 'atardecer', 'nublado', 'noche'] as const
export type HdriId = (typeof HDRIS)[number]

export function esHdri(id: unknown): id is HdriId {
  return typeof id === 'string' && (HDRIS as readonly string[]).includes(id)
}

/**
 * Entorno de reflejos (IBL). Por defecto se genera en local con Lightformers —
 * sin descargar nada (la app es local-first) — y da "algo que reflejar" a los
 * materiales metálicos con intensidad baja para no lavar el ciclo día/noche.
 * Con el realismo «HDRI» encendido usa un entorno fotográfico real (el que
 * proponga el tema, o estudio de día y noche de noche); si no carga, vuelve a
 * los Lightformers. Cada tema ajusta la intensidad con `luz.ibl`.
 */
export function EntornoIBL() {
  const tema = useTemaActivo()
  const intensidad = tema?.luz?.ibl ?? 0.25
  const hdriOn = useRealismo('hdri')
  const deNoche = useCiclo((s) => estadoCielo(s.minutos).nocheFactor > 0.5)
  const procedural = <EntornoProcedural intensidad={intensidad} />
  if (!hdriOn) return procedural
  const id: HdriId = esHdri(tema?.luz?.hdri) ? tema.luz.hdri : deNoche ? 'noche' : 'estudio'
  return (
    <SinFallo fallback={procedural}>
      <Suspense fallback={procedural}>
        <Environment files={`/hdri/${id}_1k.hdr`} background={false} environmentIntensity={intensidad} />
      </Suspense>
    </SinFallo>
  )
}

function EntornoProcedural({ intensidad }: { intensidad: number }) {
  return (
    <Environment resolution={64} environmentIntensity={intensidad}>
      {/* Bóveda fría arriba + dos paneles laterales (uno frío, uno cálido):
          reflejo genérico de exterior sin dirección marcada. */}
      <Lightformer
        form="rect"
        intensity={2.2}
        color="#dfe9ff"
        position={[0, 12, 0]}
        rotation-x={Math.PI / 2}
        scale={[18, 18, 1]}
      />
      <Lightformer
        form="rect"
        intensity={0.8}
        color="#ffffff"
        position={[-10, 4, 6]}
        rotation-y={Math.PI / 2}
        scale={[12, 6, 1]}
      />
      <Lightformer
        form="rect"
        intensity={0.6}
        color="#ffe8c8"
        position={[10, 3, -6]}
        rotation-y={-Math.PI / 2}
        scale={[12, 5, 1]}
      />
    </Environment>
  )
}

/** Si el HDRI no carga (sin red, archivo caído), la escena sigue con el entorno procedural. */
class SinFallo extends Component<{ children: ReactNode; fallback: ReactNode }, { fallo: boolean }> {
  state = { fallo: false }
  static getDerivedStateFromError() {
    return { fallo: true }
  }
  componentDidCatch(error: Error) {
    console.warn('[MPH] HDRI no disponible, uso el entorno procedural:', error.message)
  }
  render() {
    return this.state.fallo ? this.props.fallback : this.props.children
  }
}
