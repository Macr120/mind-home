import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ObjetoCuarto } from '../data/db'
import { accionFrame, useHerramienta, type Herramienta } from '../state/herramientaStore'
import { useDiseño, esObjetoLibreria, esObjetoMapa } from '../state/disenoStore'
import { useHouse, playerPos } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { useMontura } from '../state/monturaStore'
import { useParque } from '../state/parqueStore'
import { dragChar } from './characterDrag'
import { ModeloPiezas } from './modeloPersonalizado'

const DUR_FOGONAZO = 120 // ms

export type TipoPistola = 'laser' | 'portales' | 'burbujas' | 'fuegos' | 'grafiti'

export const esPistola = (h: Herramienta): h is TipoPistola =>
  h === 'laser' || h === 'portales' || h === 'burbujas' || h === 'fuegos' || h === 'grafiti'

/** baseId del recurso de biblioteca de cada pistola (carpeta "Pistolas" del Inventario). */
const PISTOLA_BASE_ID: Record<TipoPistola, number> = {
  laser: 200,
  portales: 201,
  burbujas: 202,
  fuegos: 203,
  grafiti: 204,
}

/** Inverso: nº de recurso → tipo de pistola. */
const PISTOLA_POR_BASE = new Map<number, TipoPistola>(
  (Object.entries(PISTOLA_BASE_ID) as [TipoPistola, number][]).map(([t, id]) => [id, t]),
)

/** Nº de recurso de un tipo 'recurso:<n>' (null si no lo es). */
const idRecurso = (t?: string): number | null =>
  t?.startsWith('recurso:') ? Number(t.slice('recurso:'.length)) : null

/**
 * Tipo de pistola de una instancia colocada: por su propio recurso (aunque se
 * haya convertido a piezas, `tipoOriginal`) o, si nació de la biblioteca, por
 * el `baseId` de su objeto padre.
 */
export function tipoPistolaDeObjeto(o: ObjetoCuarto, objetos: ObjetoCuarto[]): TipoPistola | null {
  let base = idRecurso(o.tipo) ?? idRecurso(o.tipoOriginal)
  if (base == null && o.libreriaId != null) {
    const lib = objetos.find((x) => x.id === o.libreriaId)
    base = lib?.baseId ?? idRecurso(lib?.tipo) ?? idRecurso(lib?.tipoOriginal)
  }
  return base != null ? PISTOLA_POR_BASE.get(base) ?? null : null
}

/** Distancia al centro de una pistola del mapa para tomarla al caminar hasta ella. */
const RADIO_TOMAR = 1.1

/**
 * Toma una pistola COLOCADA en el mapa al caminar hasta ella (sin botón): se
 * equipa en la mano (hotbar de la rueda) y la instancia sale del mapa; para
 * soltarla se vuelve a colocar desde el inventario. Solo a pie, en planta baja
 * y fuera del editor (mismas guardas que ParqueProximity).
 */
let accPistola = 0
export function PistolaProximity() {
  useFrame((_st3f, delta) => {
    // Sondeo ~4 veces/s (como MinijuegosCanchas): recorrer todos los objetos a
    // 60 Hz era de lo más caro del frame en móviles, y caminar hasta una
    // pistola no necesita esa resolución.
    accPistola += delta
    if (accPistola < 0.25) return
    accPistola = 0
    if (useMontura.getState().instanciaId != null) return // en un vehículo
    if (useParque.getState().instanciaId != null) return // usando un juego de parque
    const { transicion, playerLevel } = useHouse.getState()
    if (transicion || playerLevel !== 0 || useLayout.getState().editMode || dragChar.id) return
    const st = useDiseño.getState()
    for (const o of st.objetos) {
      if (o.id == null || !esObjetoMapa(o)) continue
      const tipo = tipoPistolaDeObjeto(o, st.objetos)
      if (!tipo) continue
      if (Math.hypot(playerPos.x - (o.x ?? 0), playerPos.z - (o.z ?? 0)) > RADIO_TOMAR) continue
      const her = useHerramienta.getState()
      if (!her.equipadas.includes(tipo)) her.equipar(tipo) // equipar es toggle: no des-equipar
      void st.removeObjeto(o.id)
      break // una por frame
    }
  })
  return null
}

/** Pistola de primitivas (cuerpo + empuñadura + boca emisiva que brilla con el Bloom). */
function Pistola({
  colorCuerpo,
  colorEmpunadura,
  colorBoca,
}: {
  colorCuerpo: string
  colorEmpunadura: string
  colorBoca: string
}) {
  return (
    <>
      <mesh castShadow position={[0, 0.03, 0.1]}>
        <boxGeometry args={[0.09, 0.1, 0.3]} />
        <meshStandardMaterial color={colorCuerpo} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh castShadow position={[0, -0.07, 0]}>
        <boxGeometry args={[0.07, 0.14, 0.09]} />
        <meshStandardMaterial color={colorEmpunadura} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.03, 0.27]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.1, 10]} />
        <meshStandardMaterial color={colorBoca} emissive={colorBoca} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </>
  )
}

/**
 * Lata de aerosol del grafiti: cuerpo con el color de la pintura + aro y boquilla.
 * La reutiliza el modo pintar como cursor sobre el muro (por eso va exportada).
 */
export function LataAerosol({ color }: { color?: string }) {
  return (
    <>
      <mesh castShadow position={[0, 0.02, 0.06]}>
        <cylinderGeometry args={[0.055, 0.055, 0.22, 12]} />
        <meshStandardMaterial color={color ?? '#e11d48'} metalness={0.35} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.145, 0.06]}>
        <cylinderGeometry args={[0.042, 0.055, 0.03, 12]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.178, 0.06]}>
        <cylinderGeometry args={[0.016, 0.016, 0.038, 8]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.5} />
      </mesh>
    </>
  )
}

/** Forma por defecto de cada pistola (si no se ha editado en la biblioteca). */
function PistolaPrimitiva({ tipo, color }: { tipo: TipoPistola; color?: string }) {
  if (tipo === 'grafiti') return <LataAerosol color={color} />
  if (tipo === 'laser') return <Pistola colorCuerpo={color ?? '#334155'} colorEmpunadura="#1e293b" colorBoca="#f87171" />
  if (tipo === 'portales')
    return <Pistola colorCuerpo={color ?? '#e2e8f0'} colorEmpunadura="#94a3b8" colorBoca="#38bdf8" />
  if (tipo === 'burbujas')
    return (
      <>
        <Pistola colorCuerpo={color ?? '#7dd3fc'} colorEmpunadura="#0ea5e9" colorBoca="#bae6fd" />
        {/* burbuja asomando de la boca */}
        <mesh position={[0, 0.03, 0.37]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial color="#bae6fd" emissive="#7dd3fc" emissiveIntensity={0.3} transparent opacity={0.4} roughness={0.1} />
        </mesh>
      </>
    )
  // fuegos: mini-lanzador con tubo inclinado hacia arriba
  return (
    <>
      <mesh castShadow position={[0, 0.08, 0.08]} rotation={[Math.PI / 3, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.065, 0.34, 10]} />
        <meshStandardMaterial color={color ?? '#b91c1c'} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.2, 0.15]} rotation={[Math.PI / 3, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.04, 10]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <mesh castShadow position={[0, -0.07, 0]}>
        <boxGeometry args={[0.07, 0.14, 0.09]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.6} />
      </mesh>
    </>
  )
}

// Mano derecha del box-man (hombro 0.42,1.22 + brazo 0.6), escalada como el cuerpo.
const mano = (escala: number): [number, number, number] => [0.42 * escala, 0.68 * escala, 0.16 * escala]

/**
 * Pistola equipada en la mano derecha. Si su objeto de biblioteca (Inventario ›
 * Objetos › Pistolas) fue editado con el engrane (piezas), se renderiza ESA
 * forma en miniatura; si no, la forma por defecto (con el color de biblioteca).
 * El fogonazo del láser se togglea por frame sin re-renders.
 */
export function ArmaHerramienta({ tipo, escala }: { tipo: TipoPistola; escala: number }) {
  const fogonazo = useRef<THREE.Mesh>(null)
  const obj = useDiseño((s) => s.objetos.find((o) => esObjetoLibreria(o) && o.baseId === PISTOLA_BASE_ID[tipo]))
  useFrame(() => {
    if (fogonazo.current)
      fogonazo.current.visible = tipo === 'laser' && performance.now() - accionFrame.disparoT < DUR_FOGONAZO
  })
  return (
    <group position={mano(escala)}>
      {obj?.piezas?.length ? (
        // Las piezas editadas están a escala de objeto de mapa (~1u): reducirlas a mano.
        <group scale={0.35} position={[0, -0.12, 0]}>
          <ModeloPiezas piezas={obj.piezas} />
        </group>
      ) : (
        <PistolaPrimitiva tipo={tipo} color={obj?.color} />
      )}
      <mesh ref={fogonazo} visible={false} position={[0, 0.03, 0.34]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#fff7ed" emissive="#fb923c" emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  )
}
