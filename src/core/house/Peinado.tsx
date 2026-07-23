import type { AnclasRopa, PeinadoId } from './apariencia'
import { PELO_COLOR_DEFAULT } from './apariencia'

/**
 * Peinado del personaje dibujado con primitivas sobre la cabeza del cuerpo base
 * (posición/tamaño derivados de sus `anclas`: `cabezaTop` = corona, `cabezaR` =
 * medio-ancho). Se dibuja por encima del rostro sin taparlo. `ninguno` no pinta.
 */
export function Peinado({
  anclas,
  peinado,
  color,
}: {
  anclas: AnclasRopa
  peinado?: PeinadoId
  color?: string
}) {
  const p = peinado ?? 'ninguno'
  if (p === 'ninguno') return null
  const c = color || PELO_COLOR_DEFAULT
  const hw = anclas.cabezaR // medio-ancho de la cabeza (~0.22)
  const top = anclas.cabezaTop // corona (~1.72)
  const w = hw * 2

  // Casquete base (corona + flequillo) que reutilizan varios estilos.
  const casquete = (
    <>
      <mesh position={[0, top - 0.05, -0.02]} castShadow>
        <boxGeometry args={[w + 0.05, 0.22, w + 0.05]} />
        <meshStandardMaterial color={c} />
      </mesh>
      <mesh position={[0, top - 0.03, hw]} castShadow>
        <boxGeometry args={[w + 0.05, 0.12, 0.05]} />
        <meshStandardMaterial color={c} />
      </mesh>
    </>
  )

  switch (p) {
    case 'corto':
      return <group>{casquete}</group>
    case 'puntas':
      return (
        <group>
          <mesh position={[0, top - 0.08, -0.02]} castShadow>
            <boxGeometry args={[w + 0.04, 0.14, w + 0.04]} />
            <meshStandardMaterial color={c} />
          </mesh>
          {[
            [-0.12, 0.1],
            [0.12, 0.08],
            [0, 0.14],
            [-0.06, -0.08],
            [0.08, -0.06],
          ].map(([x, z], i) => (
            <mesh key={i} position={[x, top + 0.07, z]} castShadow>
              <coneGeometry args={[0.06, 0.2, 6]} />
              <meshStandardMaterial color={c} />
            </mesh>
          ))}
        </group>
      )
    case 'coleta':
      return (
        <group>
          {casquete}
          <mesh position={[0, top - 0.04, -(hw + 0.04)]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color={c} />
          </mesh>
          <mesh position={[0, top - 0.22, -(hw + 0.08)]} castShadow>
            <cylinderGeometry args={[0.07, 0.05, 0.44, 8]} />
            <meshStandardMaterial color={c} />
          </mesh>
        </group>
      )
    case 'chongo':
      return (
        <group>
          {casquete}
          <mesh position={[0, top + 0.09, -0.05]} castShadow>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color={c} />
          </mesh>
        </group>
      )
    case 'largo':
      return (
        <group>
          {casquete}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (hw + 0.01), top - 0.3, -0.02]} castShadow>
              <boxGeometry args={[0.07, 0.5, w]} />
              <meshStandardMaterial color={c} />
            </mesh>
          ))}
          <mesh position={[0, top - 0.32, -(hw + 0.01)]} castShadow>
            <boxGeometry args={[w, 0.56, 0.07]} />
            <meshStandardMaterial color={c} />
          </mesh>
        </group>
      )
    case 'afro':
      return (
        <mesh position={[0, top + 0.08, -0.05]} castShadow>
          <sphereGeometry args={[hw + 0.11, 16, 16]} />
          <meshStandardMaterial color={c} />
        </mesh>
      )
    case 'mohawk':
      return (
        <group>
          {[-0.13, -0.05, 0.03, 0.11].map((z, i) => (
            <mesh key={i} position={[0, top + 0.08, z]} castShadow>
              <coneGeometry args={[0.06, 0.24, 6]} />
              <meshStandardMaterial color={c} />
            </mesh>
          ))}
        </group>
      )
    case 'tazon':
      return (
        <mesh position={[0, top - 0.04, 0]} castShadow>
          <sphereGeometry args={[hw + 0.05, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          <meshStandardMaterial color={c} />
        </mesh>
      )
    default:
      return null
  }
}
