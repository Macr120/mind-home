/**
 * Mueble temático por cuarto, hecho con primitivas (estilo Roblox).
 * Cada caso devuelve unos cuantos bloques que evocan la función del cuarto.
 */

type Vec3 = [number, number, number]

/** Caja rápida con sombras. */
function B({ p, s, c }: { p: Vec3; s: Vec3; c: string }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.7} />
    </mesh>
  )
}

function Cyl({
  p,
  r,
  h,
  c,
}: {
  p: Vec3
  r: number
  h: number
  c: string
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, 16]} />
      <meshStandardMaterial color={c} roughness={0.7} />
    </mesh>
  )
}

function Sphere({ p, r, c }: { p: Vec3; r: number; c: string }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <sphereGeometry args={[r, 16, 16]} />
      <meshStandardMaterial color={c} roughness={0.6} />
    </mesh>
  )
}

const WOOD = '#7a5230'
const DARK = '#2b2f3a'

export function Furniture({ id }: { id: string }) {
  switch (id) {
    case 'cocina': // 🍳 barra + estufa + olla
      return (
        <group>
          <B p={[0, 0.5, -1.6]} s={[3, 1, 1]} c={WOOD} />
          <B p={[0, 1.02, -1.6]} s={[3, 0.08, 1]} c={DARK} />
          <Cyl p={[-0.7, 1.2, -1.6]} r={0.28} h={0.3} c="#9ca3af" />
          <Cyl p={[0.7, 1.1, -1.6]} r={0.12} h={0.06} c="#111827" />
        </group>
      )
    case 'ejercicio': // 💪 banca + mancuerna
      return (
        <group>
          <B p={[-0.8, 0.4, 0]} s={[1.6, 0.25, 0.7]} c={DARK} />
          <B p={[-0.8, 0.2, 0]} s={[0.2, 0.4, 0.5]} c="#4b5563" />
          <B p={[1, 0.25, 0]} s={[1.4, 0.12, 0.12]} c="#9ca3af" />
          <Sphere p={[0.4, 0.25, 0]} r={0.26} c="#1f2937" />
          <Sphere p={[1.6, 0.25, 0]} r={0.26} c="#1f2937" />
        </group>
      )
    case 'recamara': // 🛏️ cama + almohada
      return (
        <group>
          <B p={[0, 0.3, -0.6]} s={[2.6, 0.5, 2.4]} c={WOOD} />
          <B p={[0, 0.62, -0.6]} s={[2.4, 0.25, 2.2]} c="#e5e7eb" />
          <B p={[0, 0.78, -1.4]} s={[1.6, 0.2, 0.5]} c="#fafafa" />
          <B p={[0, 0.75, 0.5]} s={[2.4, 0.15, 1]} c="#60a5fa" />
        </group>
      )
    case 'despacho': // 💰 escritorio + monitor
      return (
        <group>
          <B p={[0, 0.55, -1.3]} s={[2.4, 0.12, 1]} c={WOOD} />
          <B p={[-1, 0.27, -1.3]} s={[0.15, 0.55, 0.9]} c={WOOD} />
          <B p={[1, 0.27, -1.3]} s={[0.15, 0.55, 0.9]} c={WOOD} />
          <B p={[0, 1.05, -1.5]} s={[1.2, 0.75, 0.08]} c={DARK} />
          <B p={[0, 1.05, -1.5]} s={[1.05, 0.6, 0.02]} c="#3b82f6" />
        </group>
      )
    case 'biblioteca': // 📚 librero + libros
      return (
        <group>
          <B p={[0, 1.1, -1.7]} s={[2.6, 2.2, 0.5]} c={WOOD} />
          {['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'].map((c, i) => (
            <B key={i} p={[-1 + i * 0.5, 0.7, -1.5]} s={[0.4, 0.7, 0.3]} c={c} />
          ))}
          {['#06b6d4', '#ec4899', '#84cc16', '#f97316'].map((c, i) => (
            <B key={'b' + i} p={[-0.75 + i * 0.5, 1.5, -1.5]} s={[0.4, 0.7, 0.3]} c={c} />
          ))}
        </group>
      )
    case 'entretenimiento': // 🎮 TV + sofá
      return (
        <group>
          <B p={[0, 1.1, -1.7]} s={[2.4, 1.4, 0.12]} c={DARK} />
          <B p={[0, 1.1, -1.62]} s={[2.1, 1.1, 0.02]} c="#0ea5e9" />
          <B p={[0, 0.4, -1.5]} s={[1, 0.3, 0.5]} c={WOOD} />
          <B p={[0, 0.4, 1.4]} s={[2.6, 0.5, 0.9]} c="#475569" />
          <B p={[0, 0.85, 1.75]} s={[2.6, 0.6, 0.3]} c="#475569" />
        </group>
      )
    case 'sala': // ✈️ globo terráqueo + maleta
      return (
        <group>
          <Cyl p={[-0.7, 0.5, 0]} r={0.1} h={1} c={WOOD} />
          <Sphere p={[-0.7, 1.15, 0]} r={0.5} c="#2563eb" />
          <B p={[0.9, 0.4, 0]} s={[1, 0.8, 0.5]} c="#b45309" />
          <B p={[0.9, 0.85, 0]} s={[0.15, 0.2, 0.1]} c="#78350f" />
        </group>
      )
    case 'jardin': // 🧘 planta + tapete
      return (
        <group>
          <B p={[0.4, 0.06, 0.6]} s={[1.8, 0.08, 1]} c="#7c3aed" />
          <Cyl p={[-1, 0.4, -0.8]} r={0.4} h={0.8} c="#b45309" />
          <Sphere p={[-1, 1.1, -0.8]} r={0.6} c="#22c55e" />
        </group>
      )
    case 'garage': // 🔧 banco de trabajo + caja de herramientas
      return (
        <group>
          <B p={[0, 0.6, -1.4]} s={[2.6, 0.15, 1]} c="#6b7280" />
          <B p={[-1.1, 0.3, -1.4]} s={[0.2, 0.6, 0.9]} c="#4b5563" />
          <B p={[1.1, 0.3, -1.4]} s={[0.2, 0.6, 0.9]} c="#4b5563" />
          <B p={[0.4, 0.85, -1.4]} s={[0.9, 0.5, 0.6]} c="#dc2626" />
        </group>
      )
    case 'diario': // 📰 kiosco + periódico
      return (
        <group>
          <B p={[0, 0.7, -1.4]} s={[2, 0.1, 0.9]} c={WOOD} />
          <B p={[0, 0.35, -1.4]} s={[1.8, 0.6, 0.7]} c="#b91c1c" />
          <B p={[0, 0.78, -1.4]} s={[1.4, 0.05, 0.7]} c="#f8fafc" />
          <B p={[0, 0.82, -1.4]} s={[1.4, 0.02, 0.5]} c="#94a3b8" />
        </group>
      )
    case 'configuraciones': // ⚙️ engrane
      return (
        <group>
          <Cyl p={[0, 0.8, -1]} r={0.7} h={0.3} c="#6b7280" />
          <Cyl p={[0, 0.95, -1]} r={0.3} h={0.32} c="#374151" />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2
            return (
              <B
                key={i}
                p={[Math.cos(a) * 0.78, 0.8, -1 + Math.sin(a) * 0.78]}
                s={[0.3, 0.32, 0.3]}
                c="#6b7280"
              />
            )
          })}
        </group>
      )
    case 'diseno': // 🏠 maqueta de casa
      return (
        <group>
          <B p={[0, 0.5, -0.8]} s={[1.4, 1, 1.4]} c="#fcd34d" />
          <mesh position={[0, 1.35, -0.8]} castShadow>
            <coneGeometry args={[1.1, 0.8, 4]} />
            <meshStandardMaterial color="#b91c1c" roughness={0.7} />
          </mesh>
          <B p={[0, 0.35, -0.05]} s={[0.4, 0.7, 0.1]} c={WOOD} />
        </group>
      )
    default:
      return null
  }
}
