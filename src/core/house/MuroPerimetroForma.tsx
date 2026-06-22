import { useMemo } from 'react'
import { WALL_H, WALL_T } from './walls'
import type { MuroArcoPerimetro, MuroDiagonalPerimetro } from './murosPerimetroLoseta'

const SEG_ARCO = 14

function MatMuro({
  color,
  roughness,
  metalness,
  atenuado,
}: {
  color: string
  roughness: number
  metalness: number
  atenuado: boolean
}) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
      transparent={atenuado}
      opacity={atenuado ? 0.16 : 1}
    />
  )
}

/** Muro recto en diagonal sobre la rejilla. */
export function MuroDiagonalPerimetro({
  muro,
  color,
  extColor,
  exterior,
  roughness,
  extRough,
  metalness,
  atenuado,
}: {
  muro: MuroDiagonalPerimetro
  color: string
  extColor: string
  exterior: boolean
  roughness: number
  extRough: number
  metalness: number
  atenuado: boolean
}) {
  const { x1, z1, x2, z2 } = muro
  const dx = x2 - x1
  const dz = z2 - z1
  const len = Math.hypot(dx, dz)
  if (len < 0.05) return null
  const cx = (x1 + x2) / 2
  const cz = (z1 + z2) / 2
  const yaw = Math.atan2(dz, dx)
  const tint = exterior ? extColor : color
  return (
    <mesh
      position={[cx, WALL_H / 2, cz]}
      rotation={[0, -yaw, 0]}
      castShadow={!atenuado}
      receiveShadow={!atenuado}
    >
      <boxGeometry args={[len, WALL_H, WALL_T]} />
      <MatMuro
        color={tint}
        roughness={exterior ? extRough : roughness}
        metalness={metalness}
        atenuado={atenuado}
      />
    </mesh>
  )
}

/** Muro curvo (cuarto de círculo) como segmentos finos. */
export function MuroArcoPerimetro({
  muro,
  color,
  extColor,
  exterior,
  roughness,
  extRough,
  metalness,
  atenuado,
}: {
  muro: MuroArcoPerimetro
  color: string
  extColor: string
  exterior: boolean
  roughness: number
  extRough: number
  metalness: number
  atenuado: boolean
}) {
  const piezas = useMemo(() => {
    const { cx, cz, r, a0, a1 } = muro
    let da = a1 - a0
    while (da > Math.PI) da -= 2 * Math.PI
    while (da <= -Math.PI) da += 2 * Math.PI
    const n = SEG_ARCO
    const paso = da / n
    const out: { x: number; z: number; yaw: number; len: number }[] = []
    for (let i = 0; i < n; i++) {
      const a = a0 + paso * (i + 0.5)
      const px = cx + r * Math.cos(a)
      const pz = cz + r * Math.sin(a)
      const chord = r * Math.abs(paso) * 1.02
      out.push({ x: px, z: pz, yaw: a + Math.PI / 2, len: chord })
    }
    return out
  }, [muro])

  const tint = exterior ? extColor : color
  const rough = exterior ? extRough : roughness

  return (
    <>
      {piezas.map((p, i) => (
        <mesh
          key={i}
          position={[p.x, WALL_H / 2, p.z]}
          rotation={[0, -p.yaw, 0]}
          castShadow={!atenuado}
          receiveShadow={!atenuado}
        >
          <boxGeometry args={[p.len, WALL_H, WALL_T]} />
          <MatMuro color={tint} roughness={rough} metalness={metalness} atenuado={atenuado} />
        </mesh>
      ))}
    </>
  )
}

/** Muros extra (diagonal / arco) de una celda con forma. */
export function MurosExtraCelda({
  extras,
  color,
  extColor,
  roughness,
  extRough,
  metalness,
  atenuado,
}: {
  extras: (MuroDiagonalPerimetro | MuroArcoPerimetro)[]
  color: string
  extColor: string
  roughness: number
  extRough: number
  metalness: number
  atenuado: boolean
}) {
  if (!extras.length) return null
  return (
    <>
      {extras.map((m, i) =>
        m.tipo === 'diagonal' ? (
          <MuroDiagonalPerimetro
            key={`d-${i}`}
            muro={m}
            color={color}
            extColor={extColor}
            exterior
            roughness={roughness}
            extRough={extRough}
            metalness={metalness}
            atenuado={atenuado}
          />
        ) : (
          <MuroArcoPerimetro
            key={`a-${i}`}
            muro={m}
            color={color}
            extColor={extColor}
            exterior
            roughness={roughness}
            extRough={extRough}
            metalness={metalness}
            atenuado={atenuado}
          />
        ),
      )}
    </>
  )
}
