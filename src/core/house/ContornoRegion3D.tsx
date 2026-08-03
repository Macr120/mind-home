import type { RegionMapa } from '../state/zonaTutStore'

/** Grosor de las barras del contorno (mismo criterio que PlanoPisosSeleccion3D). */
const GROSOR = 0.35

/**
 * Marca un área rectangular del mapa sobre el terreno: 4 barras planas formando
 * su contorno, con relleno tenue opcional. Lo comparten el ghost del cuadrante
 * enfocado en el editor y el resalte de zona de los tutoriales.
 *
 * `sobreTodo` (los tutoriales) desactiva el test de profundidad para que el
 * borde se lea también encima de caminos, cultivos y corrales.
 */
export function ContornoRegion3D({
  region,
  color,
  y,
  relleno = false,
  sobreTodo = false,
}: {
  region: Pick<RegionMapa, 'centro' | 'ancho' | 'largo'>
  color: string
  y: number
  relleno?: boolean
  sobreTodo?: boolean
}) {
  const [x, , z] = region.centro
  const { ancho, largo } = region
  const hx = ancho / 2
  const hz = largo / 2

  const barra = (bx: number, bz: number, w: number, d: number, k: string) => (
    <mesh key={k} position={[x + bx, y, z + bz]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.85}
        depthWrite={false}
        depthTest={!sobreTodo}
      />
    </mesh>
  )

  return (
    <group>
      {relleno && (
        <mesh position={[x, y - 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[ancho, largo]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.18}
            depthWrite={false}
            depthTest={!sobreTodo}
          />
        </mesh>
      )}
      {barra(0, -hz, ancho, GROSOR, 'n')}
      {barra(0, hz, ancho, GROSOR, 's')}
      {barra(-hx, 0, GROSOR, largo, 'o')}
      {barra(hx, 0, GROSOR, largo, 'e')}
    </group>
  )
}
