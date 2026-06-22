import { createContext, useContext } from 'react'
import { matTema, type Tema } from './temas'

/**
 * Primitivas temáticas compartidas (estilo Roblox). Cualquier mesh hecho con
 * <TB/>, <TC/> o <TS/> se "re-viste" automáticamente con el tema activo, que se
 * provee con <TemaContext.Provider value={tema}> alrededor de los objetos.
 * Así el tema afecta a los objetos (muebles y decoración), no solo al shell.
 */

export const TemaContext = createContext<Tema | null>(null)

type Vec3 = [number, number, number]

/** Caja temática. */
export function TB({ p, s, c, rough }: { p: Vec3; s: Vec3; c: string; rough?: number }) {
  const tema = useContext(TemaContext)
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial {...matTema(c, tema, rough ?? 0.7)} />
    </mesh>
  )
}

/** Cilindro temático. */
export function TC({
  p,
  r,
  h,
  c,
  rough,
  seg = 16,
}: {
  p: Vec3
  r: number
  h: number
  c: string
  rough?: number
  seg?: number
}) {
  const tema = useContext(TemaContext)
  return (
    <mesh position={p} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, seg]} />
      <meshStandardMaterial {...matTema(c, tema, rough ?? 0.7)} />
    </mesh>
  )
}

/** Esfera temática. */
export function TS({ p, r, c, rough }: { p: Vec3; r: number; c: string; rough?: number }) {
  const tema = useContext(TemaContext)
  return (
    <mesh position={p} castShadow receiveShadow>
      <sphereGeometry args={[r, 16, 16]} />
      <meshStandardMaterial {...matTema(c, tema, rough ?? 0.6)} />
    </mesh>
  )
}
