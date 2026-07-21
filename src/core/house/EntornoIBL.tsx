import { Environment, Lightformer } from '@react-three/drei'
import { useTemaActivo } from './useTema'

/**
 * Entorno de reflejos (IBL) generado en local con Lightformers — sin descargar
 * HDRIs (la app es local-first). Da "algo que reflejar" a los materiales
 * metálicos (espacio, cyberpunk) con intensidad baja para no lavar la
 * iluminación del ciclo día/noche. Cada tema puede ajustarla con `luz.ibl`.
 */
export function EntornoIBL() {
  const tema = useTemaActivo()
  const intensidad = tema?.luz?.ibl ?? 0.25
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
