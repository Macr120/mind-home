import { mezclar, type TemaId } from './temas'

/**
 * Modelos 3D individuales de los recursos INDISPENSABLES (ver `recursos.ts`).
 * Cada recurso es un objeto suelto, centrado en su propio origen.
 *
 * VARIANTES POR TEMA (matriz de la hoja 3 del Excel): cada modelo tiene una
 * apariencia distinta por tema. `render(color, tema)` produce la variante del
 * tema activo; al cambiar el tema, se "carga" la variante correspondiente
 * (una sola visible a la vez → variantes ligadas). Las variantes usan
 * primitivas PLANAS con colores deliberados de cada tema (no se re-tiñen con
 * `matTema`); `color` sigue recoloreando el material principal mezclándose con
 * la paleta del tema.
 *
 * `SIEMBRA` define cómo se auto-colocan al inicio en cada cuarto (separados),
 * marcando uno como `principal` (permanente, punto de entrada a la app).
 */

type Vec3 = [number, number, number]

const WOOD = '#7a5230'
const DARK = '#2b2f3a'
const STEEL = '#9ca3af'

// ---------------------------------------------------------------------------
// Paletas por tema: dan identidad visual a CADA variante.
// ---------------------------------------------------------------------------
interface Paleta {
  /** Color del tema que se mezcla con el color del usuario en el material principal. */
  mat: string
  /** Cuánto pesa el tema sobre el color del usuario (0..1). 0 = color tal cual. */
  matMix: number
  rough: number
  metal: number
  /** Brillo del material principal ('' = sin brillo). */
  emi: string
  emiI: number
  /** Tono de cuerpo secundario (madera/relleno). */
  madera: string
  /** Herrajes / estructura / metal. */
  metalCol: string
  /** Acento (neón, pantalla, vidrio, brillo). */
  acento: string
}

const PALETAS: Record<TemaId | 'base', Paleta> = {
  base: { mat: '', matMix: 0, rough: 0.7, metal: 0, emi: '', emiI: 0, madera: WOOD, metalCol: STEEL, acento: '#fbbf24' },
  medieval: { mat: '#6b4f2a', matMix: 0.5, rough: 0.95, metal: 0, emi: '', emiI: 0, madera: '#5b4326', metalCol: '#3f3a33', acento: '#caa45a' },
  espacio: { mat: '#e8edf5', matMix: 0.6, rough: 0.2, metal: 0.7, emi: '#22d3ee', emiI: 0.05, madera: '#cbd5e1', metalCol: '#94a3b8', acento: '#67e8f9' },
  terror: { mat: '#46383a', matMix: 0.6, rough: 1, metal: 0.05, emi: '#7f1d1d', emiI: 0.08, madera: '#3a2e2a', metalCol: '#5b6066', acento: '#7f1d1d' },
  barbie: { mat: '#ff5fa2', matMix: 0.62, rough: 0.15, metal: 0.2, emi: '#ff7ab8', emiI: 0.1, madera: '#ff8fc4', metalCol: '#f0abfc', acento: '#ffd1e8' },
  vaquero: { mat: '#9c5a2c', matMix: 0.55, rough: 0.9, metal: 0.05, emi: '', emiI: 0, madera: '#7c4a24', metalCol: '#6b4f2a', acento: '#a16207' },
  cyberpunk: { mat: '#17132a', matMix: 0.68, rough: 0.35, metal: 0.6, emi: '#22d3ee', emiI: 0.12, madera: '#1c1830', metalCol: '#2a2740', acento: '#d946ef' },
  navidad: { mat: '#2e7d32', matMix: 0.42, rough: 0.5, metal: 0.1, emi: '', emiI: 0, madera: '#1f5e23', metalCol: '#b91c1c', acento: '#fbbf24' },
}

const pal = (t: TemaId | null) => PALETAS[t ?? 'base']
/** Color principal: mezcla el color del usuario con la paleta del tema. */
const prim = (c: string, P: Paleta) => (P.mat ? mezclar(c, P.mat, P.matMix) : c)

// ---------------------------------------------------------------------------
// Primitivas PLANAS (sin TemaContext): el color ya viene resuelto por el tema.
// ---------------------------------------------------------------------------
function B({ p, s, c, rough = 0.7, metal = 0, emi, emiI }: { p: Vec3; s: Vec3; c: string; rough?: number; metal?: number; emi?: string; emiI?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={rough} metalness={metal} emissive={emi || '#000000'} emissiveIntensity={emiI ?? 0} />
    </mesh>
  )
}
function C({ p, r, h, c, rough = 0.7, metal = 0, seg = 16, rt }: { p: Vec3; r: number; h: number; c: string; rough?: number; metal?: number; seg?: number; rt?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <cylinderGeometry args={[rt ?? r, r, h, seg]} />
      <meshStandardMaterial color={c} roughness={rough} metalness={metal} />
    </mesh>
  )
}
function S({ p, r, c, rough = 0.6, metal = 0 }: { p: Vec3; r: number; c: string; rough?: number; metal?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <sphereGeometry args={[r, 16, 16]} />
      <meshStandardMaterial color={c} roughness={rough} metalness={metal} />
    </mesh>
  )
}
function Cone({ p, r, h, c, emi, emiI = 0, seg = 16 }: { p: Vec3; r: number; h: number; c: string; emi?: string; emiI?: number; seg?: number }) {
  return (
    <mesh position={p} castShadow>
      <coneGeometry args={[r, h, seg]} />
      <meshStandardMaterial color={c} roughness={0.5} emissive={emi || '#000000'} emissiveIntensity={emiI} />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Adornos de tema (planos, con glow donde aplica).
// ---------------------------------------------------------------------------
function Neon({ p, s, c = '#22d3ee' }: { p: Vec3; s: Vec3; c?: string }) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.9} toneMapped={false} />
    </mesh>
  )
}
function Glow({ p, r, c }: { p: Vec3; r: number; c: string }) {
  return (
    <mesh position={p}>
      <sphereGeometry args={[r, 12, 12]} />
      <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1} toneMapped={false} />
    </mesh>
  )
}
/** Pantalla emisiva (lámparas/monitores/TV). */
function Pantalla({ p, s, c }: { p: Vec3; s: Vec3; c: string }) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.55} toneMapped={false} />
    </mesh>
  )
}
function ConoLuz({ p, r, h, c }: { p: Vec3; r: number; h: number; c: string }) {
  return (
    <mesh position={p} castShadow>
      <coneGeometry args={[r, h, 16]} />
      <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.5} />
    </mesh>
  )
}
function Vela({ p }: { p: Vec3 }) {
  return (
    <group position={p}>
      <mesh>
        <cylinderGeometry args={[0.04, 0.04, 0.18, 8]} />
        <meshStandardMaterial color="#f5f5dc" />
      </mesh>
      <Glow p={[0, 0.14, 0]} r={0.035} c="#fbbf24" />
    </group>
  )
}
function Corazon({ p, c = '#ff2d77' }: { p: Vec3; c?: string }) {
  return (
    <group position={p}>
      <mesh position={[-0.045, 0.03, 0]}><sphereGeometry args={[0.06, 10, 10]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.3} /></mesh>
      <mesh position={[0.045, 0.03, 0]}><sphereGeometry args={[0.06, 10, 10]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.3} /></mesh>
      <mesh position={[0, -0.05, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.1, 0.1, 0.05]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.3} /></mesh>
    </group>
  )
}
function Mono({ p, c = '#dc2626' }: { p: Vec3; c?: string }) {
  return (
    <group position={p}>
      <mesh position={[-0.08, 0, 0]} rotation={[0, 0, 0.5]}><coneGeometry args={[0.07, 0.16, 8]} /><meshStandardMaterial color={c} /></mesh>
      <mesh position={[0.08, 0, 0]} rotation={[0, 0, -0.5]}><coneGeometry args={[0.07, 0.16, 8]} /><meshStandardMaterial color={c} /></mesh>
      <mesh><sphereGeometry args={[0.045, 8, 8]} /><meshStandardMaterial color={c} /></mesh>
    </group>
  )
}
function Guirnalda({ p, w, n = 5 }: { p: Vec3; w: number; n?: number }) {
  const cols = ['#dc2626', '#fbbf24', '#22c55e', '#f8fafc']
  return (
    <group position={p}>
      {Array.from({ length: n }).map((_, i) => (
        <Glow key={i} p={[-w / 2 + (w / (n - 1)) * i, 0, 0]} r={0.05} c={cols[i % cols.length]} />
      ))}
    </group>
  )
}
function Nieve({ p, s }: { p: Vec3; s: Vec3 }) {
  return <B p={p} s={s} c="#f8fafc" rough={0.9} />
}
function Herradura({ p }: { p: Vec3 }) {
  return (
    <mesh position={p} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.1, 0.028, 8, 14, Math.PI * 1.4]} />
      <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.5} />
    </mesh>
  )
}
function Telarana({ p }: { p: Vec3 }) {
  return (
    <group position={p}>
      <mesh><sphereGeometry args={[0.05, 6, 6]} /><meshStandardMaterial color="#3a2e2a" /></mesh>
      <Glow p={[0, -0.05, 0]} r={0.03} c="#7f1d1d" />
    </group>
  )
}

/**
 * Acento "firma" del tema, colocado en un punto del objeto (normalmente arriba/frente).
 * Da el toque distintivo de la matriz a cualquier objeto sin remodelarlo entero.
 */
function acento(t: TemaId | null, p: Vec3, w: number) {
  switch (t) {
    case 'navidad': return <Guirnalda p={p} w={w} />
    case 'cyberpunk': return <Neon p={p} s={[w, 0.04, 0.04]} c="#22d3ee" />
    case 'espacio': return <Neon p={p} s={[w, 0.03, 0.03]} c="#67e8f9" />
    case 'barbie': return <Corazon p={p} />
    case 'medieval': return <Vela p={p} />
    case 'vaquero': return <Herradura p={p} />
    case 'terror': return <Telarana p={p} />
    default: return null
  }
}

export interface ModeloRecurso {
  icon: string
  defaultColor: string
  /** Render de la variante del tema activo (null = sin tema, look base). */
  render: (color: string, tema: TemaId | null) => React.ReactElement
}

export const MODELOS: Record<number, ModeloRecurso> = {
  // ===================== COCINA =====================
  // COC-GAB Gabinetes
  1: {
    icon: '🗄️',
    defaultColor: WOOD,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      return (
        <group>
          <B p={[0, 0.45, 0]} s={[3.4, 0.9, 0.7]} c={m} {...mp} />
          <B p={[0, 0.93, 0]} s={[3.5, 0.08, 0.78]} c={P.metalCol} />
          <B p={[0, 1.85, -0.15]} s={[3.4, 0.7, 0.4]} c={m} {...mp} />
          {/* tiradores */}
          <B p={[-0.5, 0.45, 0.36]} s={[0.08, 0.2, 0.06]} c={P.acento} />
          <B p={[0.5, 0.45, 0.36]} s={[0.08, 0.2, 0.06]} c={P.acento} />
          {acento(t, [0, 1.4, 0], 3.2)}
        </group>
      )
    },
  },
  // COC-ISL Isla / Barra central
  2: {
    icon: '🍽️',
    defaultColor: WOOD,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      return (
        <group>
          <B p={[0, 0.5, 0]} s={[2.0, 0.9, 1.1]} c={m} {...mp} />
          <B p={[0, 0.97, 0]} s={[2.1, 0.08, 1.2]} c={t === 'espacio' || t === 'cyberpunk' ? P.acento : '#e5e7eb'} emi={t === 'cyberpunk' || t === 'espacio' ? P.acento : undefined} emiI={t === 'cyberpunk' || t === 'espacio' ? 0.3 : 0} />
          {acento(t, [0, 1.15, 0], 1.6)}
        </group>
      )
    },
  },
  // COC-REF Refrigerador
  3: {
    icon: '🧊',
    defaultColor: '#cbd5e1',
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      return (
        <group>
          <B p={[0, 1.05, 0]} s={[0.9, 2.0, 0.8]} c={m} {...mp} />
          <B p={[0, 1.05, 0]} s={[0.92, 0.06, 0.82]} c={P.metalCol} />
          <B p={[0.4, 1.3, 0.41]} s={[0.06, 0.5, 0.06]} c={P.metalCol} metal={0.6} />
          {(t === 'cyberpunk' || t === 'espacio') && <Pantalla p={[0, 1.4, 0.42]} s={[0.4, 0.5, 0.02]} c={P.acento} />}
          {acento(t, [0, 2.2, 0], 0.7)}
        </group>
      )
    },
  },
  // COC-EST Estufa con campana
  4: {
    icon: '🔥',
    defaultColor: STEEL,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      return (
        <group>
          <B p={[0, 0.5, 0]} s={[0.85, 1.0, 0.65]} c={m} {...mp} />
          <B p={[0, 0.96, 0]} s={[0.8, 0.05, 0.6]} c="#111827" />
          <C p={[-0.2, 1.0, 0]} r={0.1} h={0.04} c="#374151" />
          <C p={[0.2, 1.0, 0]} r={0.1} h={0.04} c="#374151" />
          {(t === 'medieval' || t === 'terror' || t === 'vaquero') && <Glow p={[0, 1.02, 0]} r={0.09} c="#f97316" />}
          <B p={[0, 1.75, -0.15]} s={[0.95, 0.35, 0.5]} c={m} {...mp} />
          {acento(t, [0, 2.0, -0.15], 0.8)}
        </group>
      )
    },
  },
  // COC-FRE Fregadero con grifo
  5: {
    icon: '🚰',
    defaultColor: STEEL,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      return (
        <group>
          <B p={[0, 0.5, 0]} s={[0.75, 1.0, 0.55]} c={m} rough={P.rough} metal={P.metal} />
          <B p={[0, 0.95, 0]} s={[0.7, 0.06, 0.5]} c={P.metalCol} metal={0.5} />
          <C p={[0, 1.12, -0.1]} r={0.04} h={0.34} c={P.metalCol} metal={0.6} />
          <B p={[0, 1.28, -0.02]} s={[0.06, 0.06, 0.22]} c={P.metalCol} metal={0.6} />
          {acento(t, [0, 1.05, 0.28], 0.5)}
        </group>
      )
    },
  },
  // ===================== GIMNASIO (ejercicio) =====================
  // GIM-CAM Caminadora
  10: {
    icon: '🏃',
    defaultColor: DARK,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      // Medieval: rueda de molino para correr.
      if (t === 'medieval') {
        return (
          <group>
            <C p={[0, 0.7, 0]} r={0.7} h={0.5} c={P.madera} rough={0.95} rt={0.7} seg={12} />
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i / 8) * Math.PI * 2
              return <B key={i} p={[Math.cos(a) * 0.5, 0.7 + Math.sin(a) * 0.5, 0]} s={[0.1, 0.1, 0.55]} c={P.metalCol} />
            })}
            <Vela p={[0, 1.5, 0]} />
          </group>
        )
      }
      return (
        <group>
          <B p={[0, 0.16, 0]} s={[0.9, 0.22, 1.9]} c={m} {...mp} />
          <B p={[0, 0.28, -0.7]} s={[0.85, 0.04, 0.6]} c="#1f2937" />
          <B p={[-0.35, 0.9, -0.85]} s={[0.06, 1.2, 0.06]} c={P.metalCol} metal={0.4} />
          <B p={[0.35, 0.9, -0.85]} s={[0.06, 1.2, 0.06]} c={P.metalCol} metal={0.4} />
          <Pantalla p={[0, 1.45, -0.82]} s={[0.7, 0.5, 0.06]} c={P.acento} />
          {acento(t, [0, 1.78, -0.85], 0.7)}
        </group>
      )
    },
  },
  // GIM-RAC Rack de mancuernas
  11: {
    icon: '🏋️',
    defaultColor: STEEL,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const pesa = t === 'medieval' ? P.metalCol : t === 'barbie' ? P.acento : '#1f2937'
      return (
        <group>
          <B p={[0, 0.5, 0]} s={[1.6, 0.1, 0.5]} c={m} rough={P.rough} metal={P.metal} />
          <B p={[0, 0.9, -0.1]} s={[1.6, 0.1, 0.5]} c={m} rough={P.rough} metal={P.metal} />
          {[-0.5, 0, 0.5].map((dx, i) => (
            <C key={i} p={[dx, 0.62, 0]} r={0.09} h={0.5} c={pesa} />
          ))}
          {acento(t, [0, 1.1, 0], 1.4)}
        </group>
      )
    },
  },
  // GIM-BAN Banco de pesas
  12: {
    icon: '🛏️',
    defaultColor: '#b91c1c',
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      return (
        <group>
          <B p={[0, 0.42, 0]} s={[0.5, 0.12, 1.6]} c={m} rough={P.rough} metal={P.metal} />
          <B p={[0, 0.2, 0]} s={[0.2, 0.4, 0.5]} c={P.metalCol} />
          <B p={[0, 0.2, -0.6]} s={[0.2, 0.4, 0.5]} c={P.metalCol} />
          {acento(t, [0, 0.55, 0.7], 0.4)}
        </group>
      )
    },
  },
  // GIM-ESP Espejo de pared
  13: {
    icon: '🪞',
    defaultColor: '#cde9ff',
    render: (_c, t) => {
      const P = pal(t)
      const marco = t === 'barbie' ? P.acento : P.metalCol
      const espejo = t === 'terror' ? '#6b7280' : '#cde9ff'
      return (
        <group>
          <B p={[0, 1.1, 0]} s={[0.16, 2.1, 1.9]} c={marco} metal={t === 'medieval' || t === 'vaquero' ? 0.3 : 0.5} />
          <B p={[0.05, 1.1, 0]} s={[0.06, 1.9, 1.7]} c={espejo} rough={0.1} metal={0.3} />
          {t === 'cyberpunk' && <Neon p={[0.09, 1.1, 0]} s={[0.02, 1.9, 0.06]} c="#d946ef" />}
          {acento(t, [0.1, 2.05, 0], 1.6)}
        </group>
      )
    },
  },
  // ===================== GARAGE =====================
  // GAR-PUE Puerta de garage
  20: {
    icon: '🚪',
    defaultColor: STEEL,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      return (
        <group>
          <B p={[0, 1.1, 0]} s={[4.2, 2.1, 0.15]} c={m} {...mp} />
          {[0.2, 0.75, 1.3, 1.85].map((y, i) => (
            <B key={i} p={[0, y, 0.08]} s={[4.0, 0.04, 0.04]} c={P.metalCol} />
          ))}
          {acento(t, [0, 2.05, 0.1], 3.6)}
        </group>
      )
    },
  },
  // GAR-BAT Banco de trabajo
  21: {
    icon: '🛠️',
    defaultColor: WOOD,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      return (
        <group>
          <B p={[0, 0.6, 0]} s={[2.0, 0.12, 0.8]} c={m} {...mp} />
          <B p={[-0.8, 0.3, 0]} s={[0.15, 0.6, 0.7]} c={P.metalCol} />
          <B p={[0.8, 0.3, 0]} s={[0.15, 0.6, 0.7]} c={P.metalCol} />
          <B p={[0, 0.78, -0.1]} s={[0.4, 0.25, 0.3]} c={P.acento} />
          {acento(t, [0, 0.95, 0.25], 1.6)}
        </group>
      )
    },
  },
  // GAR-EST Estantería metálica
  22: {
    icon: '🗄️',
    defaultColor: '#4b5563',
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      return (
        <group>
          <B p={[0, 1.0, 0]} s={[1.0, 2.0, 0.6]} c={m} rough={P.rough} metal={P.metal} />
          {[0.5, 1.1, 1.7].map((y, i) => (
            <B key={i} p={[0, y, 0]} s={[1.0, 0.05, 0.6]} c={P.metalCol} />
          ))}
          {acento(t, [0, 2.05, 0], 0.8)}
        </group>
      )
    },
  },
  // ===================== BIBLIOTECA =====================
  // BIB-LIB Librero de pared
  29: {
    icon: '📚',
    defaultColor: WOOD,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      const libros = t === 'terror'
        ? ['#3a2e2a', '#46383a', '#5b6066', '#3f3a33', '#4a3b3b', '#2b2f3a']
        : t === 'barbie'
          ? ['#ff7ab8', '#f0abfc', '#fbcfe8', '#fda4af', '#f9a8d4', '#fecdd3']
          : t === 'cyberpunk'
            ? ['#22d3ee', '#d946ef', '#a855f7', '#06b6d4', '#e879f9', '#67e8f9']
            : ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#06b6d4']
      return (
        <group>
          <B p={[0, 1.1, 0]} s={[3.6, 2.2, 0.5]} c={m} {...mp} />
          {[0.55, 1.05, 1.55].map((y, row) =>
            libros.map((bc, i) => (
              <B key={`${row}-${i}`} p={[-1.4 + i * 0.55, y, 0.15]} s={[0.42, 0.42, 0.28]} c={bc} emi={t === 'cyberpunk' ? bc : undefined} emiI={t === 'cyberpunk' ? 0.3 : 0} />
            )),
          )}
          {acento(t, [0, 2.15, 0.2], 3.2)}
        </group>
      )
    },
  },
  // BIB-SIL Sillón de lectura
  30: {
    icon: '🛋️',
    defaultColor: '#7c3aed',
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      return (
        <group>
          <B p={[0, 0.4, 0]} s={[1.1, 0.3, 1.0]} c={m} {...mp} />
          <B p={[0, 0.85, -0.45]} s={[1.1, 0.7, 0.2]} c={m} {...mp} />
          <B p={[-0.55, 0.6, 0]} s={[0.15, 0.4, 1.0]} c={m} {...mp} />
          <B p={[0.55, 0.6, 0]} s={[0.15, 0.4, 1.0]} c={m} {...mp} />
          {acento(t, [0, 0.62, 0.3], 0.9)}
        </group>
      )
    },
  },
  // BIB-LAM Lámpara de pie
  31: {
    icon: '💡',
    defaultColor: DARK,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const luz = t ? P.acento : '#fde68a'
      return (
        <group>
          <C p={[0, 0.05, 0]} r={0.28} h={0.1} c={P.metalCol} />
          <C p={[0, 0.85, 0]} r={0.04} h={1.5} c={t === 'cyberpunk' || t === 'espacio' ? P.acento : m} />
          {t === 'medieval' ? <Vela p={[0, 1.6, 0]} /> : <ConoLuz p={[0, 1.7, 0]} r={0.32} h={0.4} c={luz} />}
        </group>
      )
    },
  },
  // ===================== RECÁMARA =====================
  // REC-CAM Cama con cabecera
  38: {
    icon: '🛏️',
    defaultColor: WOOD,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      const sabana = t === 'navidad' ? '#dc2626' : t === 'terror' ? '#6b6660' : t === 'barbie' ? '#ffd1e8' : '#e5e7eb'
      const colcha = t === 'navidad' ? '#16a34a' : t === 'barbie' ? '#ff7ab8' : '#60a5fa'
      return (
        <group>
          <B p={[0, 0.3, 0]} s={[2.6, 0.5, 2.6]} c={m} {...mp} />
          <B p={[0, 0.62, 0]} s={[2.4, 0.25, 2.4]} c={sabana} />
          <B p={[0, 1.0, -1.3]} s={[2.6, 0.9, 0.25]} c={m} {...mp} />
          <B p={[0, 0.78, -0.7]} s={[1.7, 0.18, 0.5]} c="#fafafa" />
          <B p={[0, 0.7, 0.7]} s={[2.4, 0.12, 1.4]} c={colcha} />
          {t === 'cyberpunk' && <Neon p={[0, 0.08, 0]} s={[2.5, 0.04, 0.04]} c="#d946ef" />}
          {t === 'espacio' && <Neon p={[0, 0.08, 0]} s={[2.5, 0.04, 0.04]} c="#22d3ee" />}
          {acento(t, [0, 1.5, -1.3], 2.2)}
        </group>
      )
    },
  },
  // REC-BUR Burós (par)
  39: {
    icon: '🗄️',
    defaultColor: WOOD,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      return (
        <group>
          {[-1.7, 1.7].map((x, i) => (
            <group key={i}>
              <B p={[x, 0.35, 0]} s={[0.7, 0.7, 0.6]} c={m} {...mp} />
              <B p={[x, 0.45, 0.31]} s={[0.12, 0.06, 0.04]} c={P.acento} />
              {acento(t, [x, 0.75, 0], 0.5)}
            </group>
          ))}
        </group>
      )
    },
  },
  // REC-LBU Lámpara de buró
  40: {
    icon: '💡',
    defaultColor: DARK,
    render: (_c, t) => {
      const P = pal(t)
      const luz = t ? P.acento : '#fde68a'
      return (
        <group>
          <C p={[0, 0.8, 0]} r={0.12} h={0.25} c={P.metalCol} />
          {t === 'medieval' ? <Vela p={[0, 1.0, 0]} /> : <ConoLuz p={[0, 1.05, 0]} r={0.22} h={0.3} c={luz} />}
        </group>
      )
    },
  },
  // REC-COM Cómoda / Cajonera
  41: {
    icon: '🗄️',
    defaultColor: WOOD,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      return (
        <group>
          <B p={[0, 0.5, 0]} s={[1.0, 1.0, 0.6]} c={m} {...mp} />
          {[0.35, 0.65, 0.95].map((y, i) => (
            <B key={i} p={[0.25, y, 0.31]} s={[0.12, 0.05, 0.04]} c={P.acento} />
          ))}
          {acento(t, [0, 1.05, 0], 0.8)}
        </group>
      )
    },
  },
  // ===================== DESPACHO =====================
  // DES-ESC Escritorio
  48: {
    icon: '💼',
    defaultColor: WOOD,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      return (
        <group>
          <B p={[0, 0.55, 0]} s={[2.4, 0.12, 1.0]} c={m} {...mp} />
          <B p={[-1.0, 0.27, 0]} s={[0.12, 0.55, 0.9]} c={m} {...mp} />
          <B p={[1.0, 0.27, 0]} s={[0.12, 0.55, 0.9]} c={m} {...mp} />
          {acento(t, [0, 0.68, 0.35], 2.0)}
        </group>
      )
    },
  },
  // DES-SIL Silla ejecutiva
  49: {
    icon: '🪑',
    defaultColor: '#1f2937',
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      return (
        <group>
          <B p={[0, 0.5, 0]} s={[0.6, 0.1, 0.6]} c={m} {...mp} />
          <B p={[0, 0.92, -0.25]} s={[0.6, 0.85, 0.12]} c={m} {...mp} />
          {t === 'cyberpunk' && <Neon p={[0, 0.92, -0.18]} s={[0.04, 0.7, 0.02]} c="#d946ef" />}
          <C p={[0, 0.25, 0]} r={0.05} h={0.4} c={P.metalCol} />
          <C p={[0, 0.06, 0]} r={0.35} h={0.08} c={P.metalCol} />
          {acento(t, [0, 1.4, -0.25], 0.5)}
        </group>
      )
    },
  },
  // DES-MON Monitor / Computadora
  50: {
    icon: '🖥️',
    defaultColor: DARK,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const pant = t === 'terror' ? '#6b7280' : P.acento
      return (
        <group>
          <B p={[0, 1.05, 0]} s={[1.2, 0.7, 0.08]} c={m} rough={P.rough} metal={P.metal} />
          <Pantalla p={[0, 1.05, 0.05]} s={[1.05, 0.55, 0.02]} c={pant} />
          <C p={[0, 0.68, 0]} r={0.05} h={0.25} c={P.metalCol} />
          <B p={[0, 0.56, 0]} s={[0.4, 0.04, 0.3]} c={P.metalCol} />
          {t === 'cyberpunk' && <Pantalla p={[0.85, 1.05, 0.04]} s={[0.5, 0.7, 0.02]} c="#22d3ee" />}
        </group>
      )
    },
  },
  // ===================== SALA DE JUEGOS (entretenimiento) =====================
  // SDJ-BIL Mesa de billar
  57: {
    icon: '🎱',
    defaultColor: '#15803d',
    render: (_c, t) => {
      const P = pal(t)
      const pano = t === 'barbie' ? '#ec4899' : t === 'cyberpunk' ? '#0ea5e9' : t === 'vaquero' || t === 'navidad' ? '#b91c1c' : t === 'terror' ? '#3f6212' : prim('#15803d', P)
      return (
        <group>
          <B p={[0, 0.55, 0]} s={[2.6, 0.25, 1.5]} c={P.madera} rough={P.rough} metal={P.metal} />
          <B p={[0, 0.7, 0]} s={[2.7, 0.08, 1.6]} c={P.madera} rough={P.rough} metal={P.metal} />
          <B p={[0, 0.72, 0]} s={[2.4, 0.04, 1.3]} c={pano} emi={t === 'cyberpunk' ? pano : undefined} emiI={t === 'cyberpunk' ? 0.3 : 0} />
          {([[-1.2, -0.7], [1.2, -0.7], [-1.2, 0.7], [1.2, 0.7]] as const).map(([x, z], i) => (
            <B key={i} p={[x, 0.25, z]} s={[0.15, 0.5, 0.15]} c={P.metalCol} />
          ))}
          {['#ef4444', '#fbbf24', '#3b82f6'].map((bc, i) => (
            <S key={'b' + i} p={[-0.3 + i * 0.25, 0.76, 0]} r={0.08} c={bc} />
          ))}
          {acento(t, [0, 0.95, 0], 2.2)}
        </group>
      )
    },
  },
  // SDJ-TV Pantalla / TV grande
  58: {
    icon: '📺',
    defaultColor: DARK,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const pant = t === 'terror' ? '#6b7280' : P.acento
      return (
        <group>
          <B p={[0, 1.5, 0]} s={[3.0, 1.5, 0.12]} c={m} rough={P.rough} metal={P.metal} />
          <Pantalla p={[0, 1.5, 0.07]} s={[2.7, 1.25, 0.02]} c={pant} />
          {acento(t, [0, 2.35, 0.08], 2.6)}
        </group>
      )
    },
  },
  // SDJ-CON Consola + control
  59: {
    icon: '🎮',
    defaultColor: '#111827',
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      return (
        <group>
          <B p={[0, 0.4, 0]} s={[1.4, 0.25, 0.5]} c={m} rough={P.rough} metal={P.metal} />
          {(t === 'cyberpunk' || t === 'espacio') && <Neon p={[0, 0.4, 0.26]} s={[1.2, 0.04, 0.02]} c={P.acento} />}
          {t === 'terror' && <Glow p={[0.5, 0.54, 0]} r={0.04} c="#ef4444" />}
          <B p={[-0.4, 0.54, 0]} s={[0.5, 0.06, 0.3]} c={P.metalCol} />
          {acento(t, [0.4, 0.6, 0], 0.4)}
        </group>
      )
    },
  },
  // ===================== SALA =====================
  // SAL-SOF Sofá
  66: {
    icon: '🛋️',
    defaultColor: WOOD,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      const cojin = t === 'navidad' ? '#dc2626' : t === 'barbie' ? '#ffd1e8' : t === 'terror' ? '#4a4540' : '#cbd5e1'
      return (
        <group>
          <B p={[0, 0.4, 0]} s={[2.8, 0.4, 1.0]} c={m} {...mp} />
          <B p={[0, 0.85, 0.35]} s={[2.8, 0.6, 0.3]} c={m} {...mp} />
          <B p={[-1.5, 0.6, 0]} s={[0.25, 0.4, 1.0]} c={m} {...mp} />
          <B p={[1.5, 0.6, 0]} s={[0.25, 0.4, 1.0]} c={m} {...mp} />
          {[-0.9, 0, 0.9].map((x, i) => (
            <B key={i} p={[x, 0.65, -0.1]} s={[0.8, 0.18, 0.7]} c={cojin} />
          ))}
          {t === 'espacio' && <Neon p={[0, 0.18, 0]} s={[2.6, 0.04, 0.04]} c="#22d3ee" />}
          {t === 'cyberpunk' && <Neon p={[0, 0.18, 0]} s={[2.6, 0.04, 0.04]} c="#d946ef" />}
          {acento(t, [0, 1.2, 0.35], 2.4)}
        </group>
      )
    },
  },
  // SAL-MES Mesa de centro
  67: {
    icon: '🟫',
    defaultColor: '#94a3b8',
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const tapa = t === 'espacio' || t === 'cyberpunk' ? P.acento : m
      return (
        <group>
          <B p={[0, 0.27, 0]} s={[1.4, 0.1, 0.8]} c={tapa} rough={P.rough} metal={P.metal} emi={t === 'cyberpunk' || t === 'espacio' ? P.acento : undefined} emiI={t === 'cyberpunk' || t === 'espacio' ? 0.25 : 0} />
          <B p={[-0.6, 0.13, 0]} s={[0.08, 0.28, 0.08]} c={P.metalCol} />
          <B p={[0.6, 0.13, 0]} s={[0.08, 0.28, 0.08]} c={P.metalCol} />
          {acento(t, [0, 0.4, 0], 1.0)}
        </group>
      )
    },
  },
  // SAL-MTV Mueble de TV
  68: {
    icon: '🗄️',
    defaultColor: WOOD,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      return (
        <group>
          <B p={[0, 0.35, 0]} s={[2.6, 0.6, 0.5]} c={m} {...mp} />
          <B p={[-0.7, 0.35, 0.26]} s={[0.5, 0.4, 0.04]} c={P.metalCol} />
          <B p={[0.7, 0.35, 0.26]} s={[0.5, 0.4, 0.04]} c={P.metalCol} />
          {(t === 'cyberpunk' || t === 'espacio') && <Neon p={[0, 0.62, 0]} s={[2.4, 0.03, 0.04]} c={P.acento} />}
          {acento(t, [0, 0.7, 0], 2.2)}
        </group>
      )
    },
  },
  // SAL-TEL Televisión
  69: {
    icon: '📺',
    defaultColor: DARK,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const pant = t === 'terror' ? '#6b7280' : t === 'medieval' ? '#3f6212' : P.acento
      return (
        <group>
          <B p={[0, 1.25, 0]} s={[2.2, 1.1, 0.1]} c={m} rough={P.rough} metal={P.metal} />
          <Pantalla p={[0, 1.25, 0.06]} s={[2.0, 0.95, 0.02]} c={pant} />
          {acento(t, [0, 1.9, 0.07], 1.9)}
        </group>
      )
    },
  },
  // ===================== JARDÍN =====================
  // JAR-ARB Árboles (forma muy dependiente del tema)
  77: {
    icon: '🌳',
    defaultColor: '#2f7d32',
    render: (_c, t) => {
      // Navidad: pino nevado con luces.
      if (t === 'navidad') {
        return (
          <group>
            <C p={[0, 0.4, 0]} r={0.16} h={0.8} c="#5b4326" />
            <Cone p={[0, 1.0, 0]} r={0.7} h={0.9} c="#1f5e23" />
            <Cone p={[0, 1.5, 0]} r={0.5} h={0.8} c="#2e7d32" />
            <Cone p={[0, 1.95, 0]} r={0.3} h={0.6} c="#16a34a" />
            <Nieve p={[0, 1.4, 0]} s={[0.9, 0.06, 0.9]} />
            <Glow p={[0, 2.3, 0]} r={0.08} c="#fbbf24" />
            <Glow p={[0.3, 1.3, 0.2]} r={0.05} c="#dc2626" />
            <Glow p={[-0.3, 1.6, -0.1]} r={0.05} c="#22d3ee" />
          </group>
        )
      }
      // Vaquero: cactus del desierto.
      if (t === 'vaquero') {
        return (
          <group>
            <C p={[0, 0.9, 0]} r={0.25} h={1.8} c="#4d7c2a" seg={10} />
            <C p={[-0.4, 1.1, 0]} r={0.1} h={0.6} c="#4d7c2a" seg={8} />
            <C p={[-0.4, 1.45, 0]} r={0.1} h={0.5} c="#4d7c2a" seg={8} />
            <C p={[0.4, 1.3, 0]} r={0.1} h={0.5} c="#4d7c2a" seg={8} />
            <C p={[0.4, 1.6, 0]} r={0.1} h={0.4} c="#4d7c2a" seg={8} />
          </group>
        )
      }
      // Terror: árbol seco retorcido sin hojas.
      if (t === 'terror') {
        return (
          <group>
            <C p={[0, 0.8, 0]} r={0.16} h={1.6} c="#2a221e" rt={0.1} seg={8} />
            <C p={[0.3, 1.5, 0]} r={0.05} h={0.7} c="#2a221e" seg={6} />
            <C p={[-0.3, 1.4, 0.1]} r={0.05} h={0.6} c="#2a221e" seg={6} />
            <C p={[0.1, 1.8, -0.2]} r={0.04} h={0.5} c="#2a221e" seg={6} />
            <Glow p={[0.2, 1.9, 0]} r={0.04} c="#7f1d1d" />
          </group>
        )
      }
      // Bioluminiscente / neón / barbie / medieval: tronco + copa con tono del tema.
      const copa = t === 'espacio' ? '#22d3ee' : t === 'barbie' ? '#ff7ab8' : t === 'cyberpunk' ? '#a855f7' : '#2f7d32'
      const glow = t === 'espacio' || t === 'cyberpunk' || t === 'barbie'
      return (
        <group>
          <C p={[0, 0.5, 0]} r={0.18} h={1.0} c={t === 'medieval' ? '#5b4326' : '#6b4f2a'} rt={t === 'medieval' ? 0.24 : 0.18} />
          <mesh position={[0, 1.35, 0]} castShadow>
            <sphereGeometry args={[0.7, 16, 16]} />
            <meshStandardMaterial color={copa} emissive={glow ? copa : '#000000'} emissiveIntensity={glow ? 0.5 : 0} toneMapped={!glow} />
          </mesh>
          {t === 'cyberpunk' && <Neon p={[0, 0.5, 0.19]} s={[0.05, 0.9, 0.03]} c="#22d3ee" />}
        </group>
      )
    },
  },
  // JAR-ARS Arbustos / Setos
  78: {
    icon: '🌿',
    defaultColor: '#2f7d32',
    render: (_c, t) => {
      const P = pal(t)
      if (t === 'navidad') {
        return (
          <group>
            <S p={[0, 0.3, 0]} r={0.4} c="#1f5e23" />
            <Nieve p={[0, 0.55, 0]} s={[0.5, 0.06, 0.5]} />
            <Glow p={[0.2, 0.4, 0.2]} r={0.04} c="#dc2626" />
            <Glow p={[-0.2, 0.35, -0.1]} r={0.04} c="#fbbf24" />
          </group>
        )
      }
      if (t === 'terror') {
        return (
          <group>
            <S p={[0, 0.3, 0]} r={0.35} c="#3a2e2a" />
            {[0, 1, 2, 3].map((i) => {
              const a = (i / 4) * Math.PI * 2
              return <C key={i} p={[Math.cos(a) * 0.3, 0.5, Math.sin(a) * 0.3]} r={0.02} h={0.4} c="#2a221e" seg={5} />
            })}
          </group>
        )
      }
      const col = t === 'barbie' ? '#ff7ab8' : t === 'cyberpunk' ? '#a855f7' : t === 'espacio' ? '#22d3ee' : prim('#2f7d32', P)
      const glow = t === 'barbie' || t === 'cyberpunk' || t === 'espacio'
      return (
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color={col} emissive={glow ? col : '#000000'} emissiveIntensity={glow ? 0.4 : 0} roughness={0.9} />
        </mesh>
      )
    },
  },
  // JAR-CES Césped / Pasto (gran plano)
  79: {
    icon: '🟩',
    defaultColor: '#3f7d34',
    render: (_c, t) => {
      const col = t === 'navidad' ? '#f8fafc' : t === 'terror' ? '#6b6b3a' : t === 'vaquero' ? '#b08d57' : t === 'espacio' ? '#1e293b' : t === 'cyberpunk' ? '#0f0a1f' : t === 'barbie' ? '#86efac' : '#3f7d34'
      return (
        <group>
          <B p={[0, 0.0, 0]} s={[5.4, 0.06, 5.4]} c={col} rough={1} emi={t === 'espacio' ? '#22d3ee' : undefined} emiI={t === 'espacio' ? 0.06 : 0} />
          {t === 'cyberpunk' && (
            <group>
              {[-2, -1, 0, 1, 2].map((x) => <Neon key={'x' + x} p={[x, 0.04, 0]} s={[0.03, 0.02, 5.4]} c="#22d3ee" />)}
              {[-2, -1, 0, 1, 2].map((z) => <Neon key={'z' + z} p={[0, 0.04, z]} s={[5.4, 0.02, 0.03]} c="#d946ef" />)}
            </group>
          )}
        </group>
      )
    },
  },
  // JAR-MOB Mobiliario de exterior
  80: {
    icon: '🪑',
    defaultColor: WOOD,
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      return (
        <group>
          <C p={[0, 0.45, 0]} r={0.5} h={0.08} c={m} {...mp} />
          <C p={[0, 0.25, 0]} r={0.06} h={0.5} c={P.metalCol} />
          <B p={[0, 0.35, 0.8]} s={[0.5, 0.5, 0.5]} c={m} {...mp} />
          <B p={[0, 0.35, -0.8]} s={[0.5, 0.5, 0.5]} c={m} {...mp} />
          {acento(t, [0, 0.6, 0], 0.8)}
        </group>
      )
    },
  },
  // ===================== BODEGA =====================
  // BOD-EST Estantería industrial
  88: {
    icon: '🗄️',
    defaultColor: '#4b5563',
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      return (
        <group>
          <B p={[0, 1.1, 0]} s={[3.6, 2.2, 0.6]} c={m} rough={P.rough} metal={P.metal} />
          {[0.5, 1.1, 1.7].map((y, i) => (
            <B key={i} p={[0, y, 0.1]} s={[3.6, 0.06, 0.6]} c={P.metalCol} />
          ))}
          {(t === 'cyberpunk' || t === 'espacio') && <Neon p={[0, 0.5, 0.32]} s={[3.4, 0.02, 0.03]} c={P.acento} />}
          {acento(t, [0, 2.2, 0.1], 3.2)}
        </group>
      )
    },
  },
  // BOD-CAJ Cajas y contenedores
  89: {
    icon: '📦',
    defaultColor: '#d97706',
    render: (c, t) => {
      const P = pal(t), m = prim(c, P)
      const mp = { rough: P.rough, metal: P.metal, emi: P.emi || undefined, emiI: P.emiI }
      return (
        <group>
          <B p={[0, 0.4, 0]} s={[0.8, 0.8, 0.8]} c={m} {...mp} />
          <B p={[0, 1.0, 0]} s={[0.6, 0.5, 0.6]} c={mezclar(m, '#000000', 0.2)} {...mp} />
          {t === 'navidad' && <Mono p={[0, 0.85, 0]} />}
          {t === 'cyberpunk' && <Neon p={[0, 0.4, 0.41]} s={[0.5, 0.1, 0.02]} c="#22d3ee" />}
          {acento(t, [0, 1.35, 0], 0.5)}
        </group>
      )
    },
  },
  // BOD-ILU Iluminación de techo
  90: {
    icon: '💡',
    defaultColor: STEEL,
    render: (_c, t) => {
      const P = pal(t)
      const luz = t === 'cyberpunk' ? '#22d3ee' : t === 'espacio' ? '#67e8f9' : t === 'terror' ? '#7f1d1d' : '#fef9c3'
      if (t === 'medieval') {
        return (
          <group>
            <C p={[0, 2.3, 0]} r={0.4} h={0.06} c={P.metalCol} />
            <C p={[0, 2.5, 0]} r={0.02} h={0.4} c={P.metalCol} />
            <Vela p={[-0.25, 2.32, 0]} />
            <Vela p={[0.25, 2.32, 0]} />
            <Vela p={[0, 2.32, 0.25]} />
          </group>
        )
      }
      return (
        <group>
          <B p={[0, 2.2, 0]} s={[1.6, 0.08, 0.4]} c={P.metalCol} />
          <Pantalla p={[0, 2.15, 0]} s={[1.5, 0.04, 0.3]} c={luz} />
        </group>
      )
    },
  },
}

export const getModelo = (id: number): ModeloRecurso | undefined => MODELOS[id]

/**
 * Footprint de COLISIÓN por recurso: medias extensiones [hx, hz] en su eje local.
 * Ausente = el objeto no estorba (plano/al techo/decoración menuda): el personaje
 * pasa por encima. Se usa para que los objetos sean rígidos (ver Character).
 */
export const COLISION: Record<number, [number, number]> = {
  1: [1.7, 0.35], 2: [1.0, 0.55], 3: [0.45, 0.4], 4: [0.43, 0.33], 5: [0.38, 0.3],
  10: [0.5, 0.95], 11: [0.8, 0.28], 12: [0.28, 0.8], 13: [0.12, 0.95],
  20: [2.1, 0.12], 21: [1.0, 0.4], 22: [0.5, 0.3],
  29: [1.8, 0.28], 30: [0.55, 0.5], 31: [0.3, 0.3],
  38: [1.3, 1.3], 39: [2.05, 0.3], 41: [0.5, 0.3],
  48: [1.2, 0.5], 49: [0.32, 0.32],
  57: [1.3, 0.75], 58: [1.5, 0.1], 59: [0.7, 0.28],
  66: [1.4, 0.5], 67: [0.7, 0.4], 68: [1.3, 0.28], 69: [1.1, 0.1],
  77: [0.7, 0.7], 78: [0.4, 0.4], 80: [0.6, 1.1],
  88: [1.8, 0.3], 89: [0.4, 0.4],
}

/** Alto aproximado del modelo (para colocar el marcador del mueble principal). */
export const ALTO: Record<number, number> = {
  1: 2.3, 10: 1.9, 20: 2.2, 29: 2.3, 38: 1.5, 48: 0.7, 57: 0.85, 66: 1.2, 80: 0.7, 88: 2.3,
}

/** Una instancia a sembrar al inicio: recurso + posición local en el cuarto. */
export interface Siembra {
  recurso: number
  x: number
  z: number
  principal?: boolean
}

/** Auto-colocación inicial de indispensables por cuarto (separados). */
export const SIEMBRA: Record<string, Siembra[]> = {
  cocina: [
    { recurso: 1, x: -0.4, z: -2.3, principal: true },
    { recurso: 2, x: 0, z: 0.5 },
    { recurso: 3, x: -2.4, z: -2.1 },
    { recurso: 4, x: 0.7, z: -2.3 },
    { recurso: 5, x: -1.5, z: -2.3 },
  ],
  ejercicio: [
    { recurso: 10, x: -0.7, z: -1.8, principal: true },
    { recurso: 11, x: 1.8, z: -2.2 },
    { recurso: 12, x: 0, z: 0.4 },
    { recurso: 13, x: 2.7, z: 0.4 },
  ],
  garage: [
    { recurso: 20, x: 0, z: 2.65, principal: true },
    { recurso: 21, x: -1.6, z: 1.6 },
    { recurso: 22, x: 2.3, z: -1.0 },
  ],
  biblioteca: [
    { recurso: 29, x: 0, z: -2.45, principal: true },
    { recurso: 30, x: 0.4, z: 0.9 },
    { recurso: 31, x: -2.1, z: 0.6 },
  ],
  recamara: [
    { recurso: 38, x: 0, z: -0.3, principal: true },
    { recurso: 39, x: 0, z: -1.4 },
    { recurso: 40, x: 1.7, z: -1.4 },
    { recurso: 41, x: -2.4, z: 1.2 },
  ],
  despacho: [
    { recurso: 48, x: 0, z: -1.8, principal: true },
    { recurso: 49, x: 0, z: -0.9 },
    { recurso: 50, x: 0, z: -2.05 },
  ],
  entretenimiento: [
    { recurso: 57, x: 0, z: 0.4, principal: true },
    { recurso: 58, x: 0, z: -2.6 },
    { recurso: 59, x: 0, z: -2.2 },
  ],
  sala: [
    { recurso: 66, x: 0, z: 1.2, principal: true },
    { recurso: 67, x: 0, z: 0.3 },
    { recurso: 68, x: 0, z: -2.4 },
    { recurso: 69, x: 0, z: -2.5 },
  ],
  jardin: [
    { recurso: 79, x: 0, z: 0 },
    { recurso: 77, x: -1.9, z: -1.8 },
    { recurso: 77, x: 1.9, z: -1.9 },
    { recurso: 78, x: 2.0, z: 1.6 },
    { recurso: 78, x: -2.1, z: 1.7 },
    { recurso: 80, x: 0.3, z: 0.2, principal: true },
  ],
  bodega: [
    { recurso: 88, x: 0, z: 2.35, principal: true },
    { recurso: 89, x: 1.8, z: 1.4 },
    { recurso: 89, x: -1.0, z: -2.3 },
    { recurso: 89, x: 0.2, z: -2.3 },
    { recurso: 90, x: 0, z: 0.2 },
  ],
}

/** IDs de recurso únicos que un cuarto puede agregar (los que tienen modelo). */
export function recursosModelables(roomId: string): number[] {
  const ids = (SIEMBRA[roomId] ?? []).map((s) => s.recurso)
  return [...new Set(ids)]
}
