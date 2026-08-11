import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { playerPos } from '../state/houseStore'
import { useParque, parqueFrame, esJuegoParque, ESCALA_JUEGO, anguloColumpio } from '../state/parqueStore'
import { TIPO_FLOTADOR } from '../state/flotadorStore'
import { esEspecialPlantilla } from './especialesPlantillaMeta'
import { useCiclo } from '../state/cicloStore'
import { estadoCielo } from './cielo'

/**
 * Objetos ESPECIALES (carpeta "Especiales" de la pestaña Objetos especiales del
 * inventario): objetos con comportamiento vivo que un modelo estático no da.
 * - Cuadro con foto: el usuario sube una imagen y se muestra dentro del marco
 *   (la foto vive en `ObjetoCuarto.foto`; el marco se adapta a su proporción).
 * - Espejo: refleja la escena (y al personaje) en tiempo real.
 * - Fuentes (clásica, estanque, cascada de pared): agua animada con gotas
 *   recicladas en un `instancedMesh` por chorro; en miniaturas (canvas sin
 *   frameloop) solo se muestra el agua fija.
 * - Juegos de parque (carpeta Parque): a escala del avatar y USABLES — el
 *   personaje sube y desliza, cruza el pasamanos, gira en el carrusel y se
 *   mece en el columpio (ParqueProximity + parqueStore + Character.usarJuego).
 *   Carrusel/columpio se animan por reloj (determinista, el jinete replica el
 *   ángulo); en miniaturas (canvas sin frameloop) quedan en pose inicial.
 * - Anuncios (carpeta Anuncios): letreros con texto del usuario dibujado en una
 *   textura de canvas (`ObjetoCuarto.texto`) — espectacular de carretera (con
 *   foto opcional), letrero tipo Las Vegas con bombillas que se persiguen y
 *   letrero de neón que brilla de noche.
 * - Dona flotadora (modelo y mecánica en `house/flotador.tsx`): nace con la
 *   alberca y el personaje se sienta en ella; aquí solo cuenta como especial.
 * No viven en CATALOGO ni RECURSOS: `ObjetoView` los dibuja con estos
 * componentes y la biblioteca los siembra por tipo (ver `sembrarLibreriaBase`).
 * No se convierten a piezas (perderían la foto/el reflejo).
 */

export const TIPO_CUADRO_FOTO = 'cuadro-foto'
export const TIPO_ESPEJO = 'espejo'
export const TIPO_FUENTE = 'fuente'
export const TIPO_ESTANQUE = 'estanque'
export const TIPO_CASCADA = 'cascada-pared'
export const TIPO_RESBALADILLA = 'resbaladilla'
export const TIPO_PASAMANOS = 'pasamanos'
export const TIPO_CARRUSEL = 'carrusel'
export const TIPO_COLUMPIO = 'columpio'
export const TIPO_ANTORCHA = 'antorcha'
export const TIPO_FAROL = 'farol'
export const TIPO_LAMPARA_PIE = 'lampara-pie'
export const TIPO_VELA = 'vela'
export const TIPO_ESPECTACULAR = 'espectacular'
export const TIPO_LETRERO_VEGAS = 'letrero-vegas'
export const TIPO_LETRERO_NEON = 'letrero-neon'

const TIPOS_ESPECIALES = new Set([
  TIPO_CUADRO_FOTO, TIPO_ESPEJO, TIPO_FUENTE, TIPO_ESTANQUE, TIPO_CASCADA,
  TIPO_RESBALADILLA, TIPO_PASAMANOS, TIPO_CARRUSEL, TIPO_COLUMPIO,
  TIPO_ANTORCHA, TIPO_FAROL, TIPO_LAMPARA_PIE, TIPO_VELA,
  TIPO_ESPECTACULAR, TIPO_LETRERO_VEGAS, TIPO_LETRERO_NEON,
  TIPO_FLOTADOR,
])

export const esTipoEspecial = (tipo: string) => TIPOS_ESPECIALES.has(tipo) || esEspecialPlantilla(tipo)

/** Anuncios: letreros con texto editable (`ObjetoCuarto.texto`) y foto en el espectacular. */
export const esAnuncio = (tipo: string) =>
  tipo === TIPO_ESPECTACULAR || tipo === TIPO_LETRERO_VEGAS || tipo === TIPO_LETRERO_NEON

/**
 * Grupo de efecto ajustable (`ObjetoCuarto.fx`) de un tipo especial: intensidad
 * del agua (fuentes), cuánto ilumina (luces) o velocidad del juego (parque).
 * `null` = el tipo no tiene efecto ajustable (el editor no muestra el slider).
 */
export function grupoFx(tipo: string): 'agua' | 'luz' | 'juego' | null {
  if (tipo === TIPO_FUENTE || tipo === TIPO_ESTANQUE || tipo === TIPO_CASCADA) return 'agua'
  if (tipo === TIPO_ANTORCHA || tipo === TIPO_FAROL || tipo === TIPO_LAMPARA_PIE || tipo === TIPO_VELA) return 'luz'
  if (esAnuncio(tipo)) return 'luz' // brillo de bombillas/neón/panel de noche
  if (esJuegoParque(tipo)) return 'juego'
  return null
}

/** Redimensiona la foto a máx 1280px y la regresa como JPEG (ahorra IndexedDB). */
export async function comprimirFoto(archivo: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(archivo)
    const escala = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? archivo), 'image/jpeg', 0.85))
  } catch {
    return archivo // formato no soportado por canvas: se guarda tal cual
  }
}

/** Grosor de las molduras del marco (cuadro y espejo). */
const MARCO = 0.07

/** Marco de 4 molduras + panel de fondo alrededor de un lienzo w×h (apoyado en y=0). */
function Marco({ w, h, color, children }: { w: number; h: number; color: string; children: React.ReactNode }) {
  return (
    <group position={[0, h / 2 + MARCO, 0]}>
      {/* Panel trasero (fondo del lienzo y tapa por detrás) */}
      <mesh position={[0, 0, -0.02]} castShadow>
        <boxGeometry args={[w + MARCO * 2, h + MARCO * 2, 0.04]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Molduras */}
      <mesh position={[0, h / 2 + MARCO / 2, 0.01]} castShadow>
        <boxGeometry args={[w + MARCO * 2, MARCO, 0.07]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -h / 2 - MARCO / 2, 0.01]} castShadow>
        <boxGeometry args={[w + MARCO * 2, MARCO, 0.07]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-w / 2 - MARCO / 2, 0, 0.01]} castShadow>
        <boxGeometry args={[MARCO, h, 0.07]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[w / 2 + MARCO / 2, 0, 0.01]} castShadow>
        <boxGeometry args={[MARCO, h, 0.07]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {children}
    </group>
  )
}

/**
 * Cuadro con foto del usuario. Sin foto muestra un paisajito de relleno; con
 * foto, el lienzo (y su marco) adoptan la proporción de la imagen.
 */
export function CuadroFoto({ color, foto }: { color: string; foto?: Blob }) {
  if (!foto) return <CuadroRelleno color={color} />
  return (
    // Suspende TODO el cuadro hasta que la textura cargue: así la miniatura
    // del inventario no captura el marco vacío antes de tiempo.
    <Suspense fallback={null}>
      <CuadroConFoto color={color} foto={foto} />
    </Suspense>
  )
}

/** Cuadro sin foto: lienzo crema con sol y montañas (invita a subir una foto). */
function CuadroRelleno({ color }: { color: string }) {
  const w = 1.05
  const h = 0.78
  return (
    <Marco w={w} h={h} color={color}>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#f3ead8" />
      </mesh>
      <mesh position={[-0.3, 0.2, 0.006]}>
        <circleGeometry args={[0.1, 24]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      <mesh position={[-0.14, -0.22, 0.01]} scale={[1, 1, 0.06]}>
        <coneGeometry args={[0.3, 0.36, 4]} />
        <meshStandardMaterial color="#35678a" flatShading />
      </mesh>
      <mesh position={[0.18, -0.24, 0.014]} scale={[1, 1, 0.06]}>
        <coneGeometry args={[0.34, 0.42, 4]} />
        <meshStandardMaterial color="#3f7f5f" flatShading />
      </mesh>
    </Marco>
  )
}

/**
 * El object-URL nace en un efecto (render comprometido), no junto al useLoader
 * que suspende: con useMemo cada reintento de Suspense generaría un URL nuevo y
 * la carga no estabilizaría (mismo patrón que `ModeloGLB`).
 */
function useUrlBlob(blob: Blob): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberado: URL estable para que la suspensión de useLoader se resuelva una sola vez (ver doc arriba)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

function CuadroConFoto({ color, foto }: { color: string; foto: Blob }) {
  const url = useUrlBlob(foto)
  return url ? <CuadroTextura color={color} url={url} /> : null
}

function CuadroTextura({ color, url }: { color: string; url: string }) {
  const tex = useLoader(THREE.TextureLoader, url)
  const { w, h } = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    tex.needsUpdate = true
    // El lienzo adopta la proporción de la foto (lado mayor fijo ~1.05).
    const img = tex.image as { width: number; height: number }
    const ratio = img.width && img.height ? img.width / img.height : 4 / 3
    return ratio >= 1
      ? { w: 1.05, h: Math.max(0.45, 1.05 / ratio) }
      : { w: Math.max(0.45, 1.05 * ratio), h: 1.05 }
  }, [tex])
  return (
    <Marco w={w} h={h} color={color}>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.85} metalness={0} />
      </mesh>
    </Marco>
  )
}

/**
 * Espejo de cuerpo completo con peana, ligeramente reclinado. La luna refleja
 * la escena en tiempo real (`MeshReflectorMaterial` re-renderiza la escena una
 * vez por espejo visible: úsense con mesura). Con `simple` (miniaturas del
 * inventario, sin escena que reflejar) la luna es un vidrio metálico estático.
 */
export function Espejo({ color, simple = false }: { color: string; simple?: boolean }) {
  return (
    <group>
      {/* Peana */}
      <mesh position={[0, 0.025, 0]} castShadow>
        <boxGeometry args={[0.56, 0.05, 0.34]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Cuerpo reclinado, pivotando desde la peana */}
      <group position={[0, 0.05, -0.02]} rotation={[-0.096, 0, 0]}>
        <mesh position={[0, 0.86, 0]} castShadow>
          <boxGeometry args={[0.86, 1.72, 0.05]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0, 0.86, 0.028]}>
          <planeGeometry args={[0.74, 1.6]} />
          {simple ? (
            <meshStandardMaterial color="#cfe0ee" metalness={0.92} roughness={0.08} />
          ) : (
            <MeshReflectorMaterial
              resolution={512}
              mirror={1}
              mixStrength={2.2}
              mixBlur={0}
              blur={[0, 0]}
              depthScale={0}
              roughness={0.05}
              metalness={0.15}
              color="#dbe4ee"
            />
          )}
        </mesh>
      </group>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Fuentes con agua animada
// ---------------------------------------------------------------------------

/** Color fijo del agua (el color del usuario tiñe solo la piedra). */
const AGUA = '#7dd3fc'

type Vec3 = [number, number, number]

/** Superficie/lámina de agua en reposo (también visible en miniaturas). */
function MatAgua({ opacidad = 0.55 }: { opacidad?: number }) {
  return <meshStandardMaterial color={AGUA} transparent opacity={opacidad} roughness={0.1} metalness={0.1} />
}

const _posChorro = new THREE.Vector3()

/**
 * Chorro de gotas en un único `instancedMesh` (1 draw call por chorro). Cada
 * gota recorre una parábola de `origen` a `destino` con fase propia; el `% 1`
 * la recicla justo al tocar el agua (así no hace falta fade por instancia).
 * Modo radial (por defecto): sale en anillo `radioSalida` y cae en anillo
 * `radioCaida`. Con `anchoX` se vuelve una cortina plana (cascada).
 */
function ChorroAgua({
  n,
  origen,
  destino,
  apex,
  radioSalida = 0,
  radioCaida = 0.1,
  anchoX,
  dur = 0.9,
  tam = 0.035,
  fx = 1,
}: {
  n: number
  origen: Vec3
  destino: Vec3
  /** Altura extra del arco en su punto medio. */
  apex: number
  radioSalida?: number
  radioCaida?: number
  /** Cortina plana: medio ancho en X (sustituye al modo radial). */
  anchoX?: number
  dur?: number
  tam?: number
  /** Intensidad del agua (ObjetoCuarto.fx): escala gotas y velocidad. */
  fx?: number
}) {
  // La intensidad da más gotas Y más rápidas (fx=1 deja n/dur originales).
  const nFx = Math.max(2, Math.round(n * fx))
  const durFx = dur / (0.55 + 0.45 * fx)
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const gotas = useMemo(
    () =>
      Array.from({ length: nFx }, (_, i) => ({
        fase: (i + Math.random() * 0.5) / nFx,
        ang: Math.random() * Math.PI * 2,
        rad: Math.random(),
        esc: 0.7 + Math.random() * 0.6,
      })),
    [nFx],
  )

  const pintar = (t: number) => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < nFx; i++) {
      const g = gotas[i]
      const q = (t / durFx + g.fase) % 1
      let x0 = origen[0]
      let z0 = origen[2]
      let x1 = destino[0]
      let z1 = destino[2]
      if (anchoX != null) {
        const dx = ((g.ang / (Math.PI * 2)) * 2 - 1) * anchoX
        x0 += dx
        x1 += dx
        z1 += (g.rad * 2 - 1) * radioCaida
      } else {
        x0 += Math.cos(g.ang) * radioSalida
        z0 += Math.sin(g.ang) * radioSalida
        const r = (0.35 + 0.65 * g.rad) * radioCaida
        x1 += Math.cos(g.ang) * r
        z1 += Math.sin(g.ang) * r
      }
      const y = origen[1] + (destino[1] - origen[1]) * q + apex * 4 * q * (1 - q)
      dummy.position.set(x0 + (x1 - x0) * q, y, z0 + (z1 - z0) * q)
      dummy.scale.setScalar(g.esc)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  // Cuadro 0 síncrono: sin él, el primer render mostraría las gotas apiladas en el origen.
  useLayoutEffect(() => {
    ref.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    pintar(0)
  })

  // Lejos del jugador las gotas no se aprecian: se congela la reconstrucción
  // de matrices (la distancia se re-mide ~2 veces/s, escalonada por fuente).
  const lejos = useRef({ acc: Math.random() * 0.5, si: false })
  useFrame(({ clock }, delta) => {
    const l = lejos.current
    l.acc += delta
    if (l.acc >= 0.5 && ref.current) {
      l.acc = 0
      ref.current.getWorldPosition(_posChorro)
      l.si = Math.hypot(playerPos.x - _posChorro.x, playerPos.z - _posChorro.z) > 26
    }
    if (l.si) return
    pintar(clock.elapsedTime)
  })

  return (
    // Sin frustumCulled: el boundingSphere no sigue a las matrices mutadas.
    // key: cambiar el nº de instancias recrea el mesh (args no se re-aplican solos).
    <instancedMesh key={nFx} ref={ref} args={[undefined, undefined, nFx]} frustumCulled={false}>
      <sphereGeometry args={[tam, 6, 6]} />
      <meshStandardMaterial color={AGUA} transparent opacity={0.8} roughness={0.15} />
    </instancedMesh>
  )
}

/**
 * Fuente clásica de piedra de dos pisos: chorro central en la copa y rebose
 * hacia la pila inferior. Con `simple` (miniaturas) se omiten las gotas.
 */
export function FuenteClasica({ color, simple = false, fx = 1 }: { color: string; simple?: boolean; fx?: number }) {
  return (
    <group>
      {/* Pila inferior con labio */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.72, 0.78, 0.3, 20]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.78, 0.75, 0.08, 20]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {/* El agua sobresale del labio: si quedara por debajo, el cilindro sólido la taparía. */}
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.66, 0.66, 0.05, 20]} />
        <MatAgua />
      </mesh>
      {/* Columna y copa superior */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.14, 0.6, 12]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.36, 0.12, 0.16, 16]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.01, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 16]} />
        <MatAgua />
      </mesh>
      {/* Surtidor y su columna de agua (fija: visible también en miniaturas) */}
      <mesh position={[0, 1.07, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 0.14, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.13, 0]}>
        <cylinderGeometry args={[0.028, 0.042, 0.22, 8]} />
        <MatAgua opacidad={0.7} />
      </mesh>
      {!simple && (
        <>
          <ChorroAgua n={16} origen={[0, 1.24, 0]} destino={[0, 1.03, 0]} apex={0.18} radioCaida={0.22} fx={fx} />
          <ChorroAgua n={20} origen={[0, 1.0, 0]} radioSalida={0.35} destino={[0, 0.4, 0]} radioCaida={0.6} apex={0.08} dur={1.1} fx={fx} />
        </>
      )}
    </group>
  )
}

/**
 * Estanque bajo de piedra con chorro central, rocas y un nenúfar florecido.
 * Con `simple` (miniaturas) se omiten las gotas.
 */
export function Estanque({ color, simple = false, fx = 1 }: { color: string; simple?: boolean; fx?: number }) {
  return (
    <group>
      {/* Borde de piedra */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.95, 1.0, 0.24, 24]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      {/* Un pelo por encima del borde para no pelear en z con su tapa. */}
      <mesh position={[0, 0.225, 0]}>
        <cylinderGeometry args={[0.82, 0.82, 0.06, 24]} />
        <MatAgua />
      </mesh>
      {/* Rocas sobre el borde */}
      <mesh position={[0.62, 0.26, 0.62]} castShadow>
        <sphereGeometry args={[0.14, 10, 10]} />
        <meshStandardMaterial color="#57534e" roughness={1} />
      </mesh>
      <mesh position={[-0.78, 0.25, 0.35]} castShadow>
        <sphereGeometry args={[0.11, 10, 10]} />
        <meshStandardMaterial color="#57534e" roughness={1} />
      </mesh>
      <mesh position={[0.2, 0.25, -0.83]} castShadow>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial color="#57534e" roughness={1} />
      </mesh>
      {/* Nenúfar con flor */}
      <mesh position={[0.4, 0.25, -0.32]}>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 12]} />
        <meshStandardMaterial color="#4d7c2a" roughness={0.8} />
      </mesh>
      <mesh position={[0.4, 0.29, -0.32]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color="#f472b6" />
      </mesh>
      {/* Columna de agua del chorro (fija: visible también en miniaturas) */}
      <mesh position={[0, 0.51, 0]}>
        <cylinderGeometry args={[0.02, 0.04, 0.58, 8]} />
        <MatAgua opacidad={0.7} />
      </mesh>
      {!simple && <ChorroAgua n={22} origen={[0, 0.82, 0]} destino={[0, 0.26, 0]} apex={0.26} radioCaida={0.5} dur={1.0} fx={fx} />}
    </group>
  )
}

/**
 * Cascada de pared: muro con cornisa por el que cae una cortina de agua a una
 * pileta al frente. Va de pie (se arrima a cualquier muro con arrastrar +
 * rotación). Con `simple` (miniaturas) se omiten las gotas.
 */
export function CascadaPared({ color, simple = false, fx = 1 }: { color: string; simple?: boolean; fx?: number }) {
  return (
    <group>
      {/* Muro con cornisa */}
      <mesh position={[0, 0.9, -0.25]} castShadow>
        <boxGeometry args={[1.5, 1.8, 0.24]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.83, -0.25]} castShadow>
        <boxGeometry args={[1.6, 0.14, 0.34]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      {/* Pileta al frente */}
      <mesh position={[0, 0.14, 0.12]} castShadow>
        <boxGeometry args={[1.5, 0.28, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      {/* El agua sobresale del borde de la pileta: si no, la caja sólida la taparía. */}
      <mesh position={[0, 0.285, 0.12]}>
        <boxGeometry args={[1.36, 0.05, 0.36]} />
        <MatAgua />
      </mesh>
      {/* Lámina de agua sobre la cara frontal (fija: visible también en miniaturas) */}
      <mesh position={[0, 1.0, -0.11]}>
        <boxGeometry args={[0.9, 1.52, 0.04]} />
        <MatAgua opacidad={0.45} />
      </mesh>
      {!simple && (
        <ChorroAgua
          n={28}
          anchoX={0.42}
          origen={[0, 1.76, -0.07]}
          destino={[0, 0.32, 0.12]}
          apex={0.03}
          radioCaida={0.08}
          dur={0.75}
          tam={0.03}
          fx={fx}
        />
      )}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Juegos de parque (carpeta Parque)
// ---------------------------------------------------------------------------

/** Metal de patas, postes y barras de los juegos. */
const METAL_PARQUE = '#9ca3af'

/**
 * Resbaladilla de parque: escalera atrás (-z), plataforma con barandales y
 * rampa inclinada hacia el frente (+z). El color tiñe plataforma y rampa.
 */
export function Resbaladilla({ color }: { color: string }) {
  return (
    <group scale={ESCALA_JUEGO.resbaladilla}>
      {/* Plataforma con barandales */}
      <mesh position={[0, 0.93, -0.35]} castShadow>
        <boxGeometry args={[0.6, 0.06, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.28, 1.12, -0.35]} castShadow>
        <boxGeometry args={[0.04, 0.32, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.28, 1.12, -0.35]} castShadow>
        <boxGeometry args={[0.04, 0.32, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Patas */}
      {[[-0.24, -0.55], [0.24, -0.55], [-0.24, -0.15], [0.24, -0.15]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.465, z]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.93, 8]} />
          <meshStandardMaterial color={METAL_PARQUE} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {/* Escalera */}
      {[-0.22, 0.22].map((x, i) => (
        <mesh key={i} position={[x, 0.48, -0.87]} rotation={[-1.04, 0, 0]} castShadow>
          <boxGeometry args={[0.05, 0.05, 1.15]} />
          <meshStandardMaterial color={METAL_PARQUE} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {[[0.23, -1.01], [0.42, -0.9], [0.61, -0.79], [0.8, -0.68]].map(([y, z], i) => (
        <mesh key={i} position={[0, y, z]} castShadow>
          <boxGeometry args={[0.44, 0.04, 0.1]} />
          <meshStandardMaterial color="#e5e7eb" />
        </mesh>
      ))}
      {/* Rampa con bordes */}
      <mesh position={[0, 0.49, 0.53]} rotation={[0.62, 0, 0]} castShadow>
        <boxGeometry args={[0.5, 0.05, 1.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.245, 0.53, 0.53]} rotation={[0.62, 0, 0]} castShadow>
        <boxGeometry args={[0.05, 0.12, 1.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.245, 0.53, 0.53]} rotation={[0.62, 0, 0]} castShadow>
        <boxGeometry args={[0.05, 0.12, 1.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

/** Pasamanos (barras de mono): 4 postes y escalera horizontal elevada. */
export function Pasamanos({ color }: { color: string }) {
  return (
    <group scale={ESCALA_JUEGO.pasamanos}>
      {[[-0.8, -0.28], [0.8, -0.28], [-0.8, 0.28], [0.8, 0.28]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.75, z]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1.5, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      {[-0.28, 0.28].map((z, i) => (
        <mesh key={i} position={[0, 1.5, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 1.76, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      {[-0.6, -0.36, -0.12, 0.12, 0.36, 0.6].map((x) => (
        <mesh key={x} position={[x, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.028, 0.028, 0.64, 8]} />
          <meshStandardMaterial color="#d1d5db" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Carrusel de parque: la plataforma, barrotes, asientos y techo giran SOLO
 * cuando el personaje lo está usando (el jinete acumula `parqueFrame.giro`);
 * fuera de uso queda quieto en su último ángulo.
 */
export function Carrusel({ color, objetoId }: { color: string; objetoId?: number }) {
  const giro = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!giro.current) return
    if (objetoId != null && useParque.getState().instanciaId === objetoId) {
      giro.current.rotation.y = parqueFrame.giro
    }
  })
  const asientos = ['#f8fafc', '#fbbf24', '#f8fafc', '#fbbf24']
  return (
    <group scale={ESCALA_JUEGO.carrusel}>
      {/* Base fija */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[0.8, 0.85, 0.12, 20]} />
        <meshStandardMaterial color="#6b7280" roughness={0.9} />
      </mesh>
      <group ref={giro}>
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.75, 0.75, 0.06, 20]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0, 0.65, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 1.0, 10]} />
          <meshStandardMaterial color={METAL_PARQUE} metalness={0.4} roughness={0.5} />
        </mesh>
        {/* Techo */}
        <mesh position={[0, 1.3, 0]} castShadow>
          <coneGeometry args={[0.85, 0.35, 16]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
        {/* Barrotes y asientos */}
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2
          const bx = Math.cos(a)
          const bz = Math.sin(a)
          return (
            <group key={i}>
              <mesh position={[bx * 0.6, 0.6, bz * 0.6]} castShadow>
                <cylinderGeometry args={[0.025, 0.025, 0.85, 8]} />
                <meshStandardMaterial color="#d1d5db" metalness={0.5} roughness={0.4} />
              </mesh>
              <mesh position={[bx * 0.52, 0.22, bz * 0.52]} castShadow>
                <boxGeometry args={[0.22, 0.06, 0.22]} />
                <meshStandardMaterial color={asientos[i]} />
              </mesh>
            </group>
          )
        })}
      </group>
    </group>
  )
}

/**
 * Columpio de estructura en A con dos asientos. El asiento ocupado se mece con
 * el personaje (mismo `parqueFrame.vaivenT` que calcula el jinete); en reposo
 * ambos vuelven suavemente a la vertical. El color tiñe la estructura.
 */
export function Columpio({ color, objetoId }: { color: string; objetoId?: number }) {
  const izq = useRef<THREE.Group>(null)
  const der = useRef<THREE.Group>(null)
  useFrame(() => {
    const usado = objetoId != null && useParque.getState().instanciaId === objetoId
    const fi = usado ? anguloColumpio(parqueFrame.vaivenT) : 0
    const lado = parqueFrame.fase0 // ±1 mientras se usa
    const mecer = (g: THREE.Group | null, ladoSeat: 1 | -1) => {
      if (!g) return
      if (usado && lado === ladoSeat) g.rotation.x = fi
      else g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0, 0.15)
    }
    mecer(izq.current, -1)
    mecer(der.current, 1)
  })
  const asiento = (ref: React.Ref<THREE.Group>, x: number, colorAsiento: string) => (
    <group ref={ref} position={[x, 1.62, 0]}>
      {[-0.15, 0.15].map((cx, i) => (
        <mesh key={i} position={[cx, -0.53, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 1.05, 6]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      ))}
      <mesh position={[0, -1.08, 0]} castShadow>
        <boxGeometry args={[0.4, 0.05, 0.16]} />
        <meshStandardMaterial color={colorAsiento} />
      </mesh>
    </group>
  )
  return (
    <group scale={ESCALA_JUEGO.columpio}>
      {/* Estructura en A */}
      {[-0.85, 0.85].map((x) =>
        [[0.3, -0.25], [-0.3, 0.25]].map(([rot, cz], i) => (
          <mesh key={x + ':' + i} position={[x, 0.84, cz]} rotation={[rot, 0, 0]} castShadow>
            <boxGeometry args={[0.07, 1.72, 0.07]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )),
      )}
      <mesh position={[0, 1.62, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 1.9, 10]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {asiento(izq, -0.4, '#fbbf24')}
      {asiento(der, 0.4, '#f8fafc')}
    </group>
  )
}

// Los juegos del parque ya NO se abordan solos al caminar hacia ellos: el botón
// «Subirte» del hueco del cubo los ofrece al acercarte (ver `ContextoProximity`),
// igual que el resto de la casa. El radio vive ahí.

/* ─────────────────────────── Iluminación ───────────────────────────
 * Objetos que emiten luz REAL (pointLight propio, sin sombras): antorcha,
 * farol de poste, lámpara de pie y vela. Se encienden solo de noche leyendo
 * el ciclo día/noche (mismo criterio que FocosCasa). En miniaturas se ven
 * siempre encendidos. Son las primeras fuentes de luz por-objeto del proyecto.
 */

/** Colores fijos de los accesorios (el color del usuario tiñe la estructura). */
const MET_ANTORCHA = '#4b5563'
const MET_LAMPARA = '#3f3f46'
const CERA = '#f5ecd6'
/** Color cálido de la luz encendida (bulbos y velas). */
const LUZ_CALIDA = '#ffd9a0'

/** Fuerza de encendido: 0 de día → 1 de noche (como FocosCasa). En miniaturas: 1 fijo. */
function useFuerzaNoche(simple: boolean): number {
  const minutos = useCiclo((s) => s.minutos)
  const brilloFocos = useCiclo((s) => s.brilloFocos)
  if (simple) return 1
  const { nocheFactor } = estadoCielo(minutos)
  return Math.max(0, Math.min(1, nocheFactor)) * brilloFocos
}

/** Luz puntual cálida que enciende de noche (sin sombras). Apagada de día. */
function LuzNoche({
  y = 0,
  color = LUZ_CALIDA,
  intensidad = 8,
  distancia = 4.5,
  fuerza,
  fx = 1,
}: {
  y?: number
  color?: string
  intensidad?: number
  distancia?: number
  fuerza: number
  /** Cuánto ilumina (ObjetoCuarto.fx): escala intensidad y, más suave, el alcance. */
  fx?: number
}) {
  if (fuerza < 0.04) return null
  return (
    <pointLight
      position={[0, y, 0]}
      color={color}
      intensity={intensidad * fuerza * fx}
      distance={distancia * (0.6 + 0.4 * fx)}
      decay={1.6}
    />
  )
}

/** Bulbo/vidrio: brilla (emissive) de noche y se ve neutro apagado de día. */
function Bulbo({ radio = 0.08, fuerza, fx = 1 }: { radio?: number; fuerza: number; fx?: number }) {
  const on = fuerza >= 0.04
  return (
    <mesh>
      <sphereGeometry args={[radio, 12, 12]} />
      <meshStandardMaterial
        color={on ? LUZ_CALIDA : '#d9d2c4'}
        emissive={LUZ_CALIDA}
        emissiveIntensity={on ? 1.6 * fuerza * fx : 0}
        toneMapped={false}
      />
    </mesh>
  )
}

/** Llama emissive de dos capas que titila (solo anima fuera de miniaturas). */
function Llama({ escala = 1 }: { escala?: number }) {
  const ref = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const t = clock.elapsedTime
    const f = 1 + Math.sin(t * 18) * 0.14 + Math.sin(t * 7.3) * 0.06
    g.scale.set(escala * (0.92 + 0.08 * f), escala * f, escala * (0.92 + 0.08 * f))
    if (mat.current) mat.current.emissiveIntensity = 2.4 + Math.sin(t * 15) * 0.5
  })
  return (
    <group ref={ref} scale={escala}>
      {/* Llama exterior naranja */}
      <mesh>
        <coneGeometry args={[0.07, 0.24, 10]} />
        <meshStandardMaterial ref={mat} color="#fbbf24" emissive="#fb7c1e" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      {/* Núcleo amarillo claro */}
      <mesh position={[0, -0.02, 0]}>
        <coneGeometry args={[0.035, 0.14, 8]} />
        <meshStandardMaterial color="#fff7cd" emissive="#fde68a" emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Antorcha: mango de madera + copa metálica + llama animada y luz cálida naranja. */
export function Antorcha({ color, simple = false, fx = 1 }: { color: string; simple?: boolean; fx?: number }) {
  const fuerza = useFuerzaNoche(simple)
  const on = fuerza >= 0.04
  return (
    <group>
      {/* Mango de madera */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 1.2, 10]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {/* Copa metálica (recipiente de la brasa) */}
      <mesh position={[0, 1.24, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.08, 0.16, 12]} />
        <meshStandardMaterial color={MET_ANTORCHA} roughness={0.6} metalness={0.5} />
      </mesh>
      {on && (
        <>
          <group position={[0, 1.42, 0]}>
            <Llama escala={1.15 * (0.8 + 0.2 * fx)} />
          </group>
          <LuzNoche y={1.5} color="#ff9a3c" intensidad={9} distancia={5} fuerza={fuerza} fx={fx} />
        </>
      )}
    </group>
  )
}

/** Farol de poste: base + poste + caja de vidrio con bulbo cálido y techo piramidal. */
export function FarolPoste({ color, simple = false, fx = 1 }: { color: string; simple?: boolean; fx?: number }) {
  const fuerza = useFuerzaNoche(simple)
  const yCaja = 1.75
  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.08, 16]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Poste */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 1.6, 10]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Suelo de la caja del farol */}
      <mesh position={[0, yCaja - 0.24, 0]} castShadow>
        <boxGeometry args={[0.3, 0.06, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Vidrio */}
      <mesh position={[0, yCaja, 0]}>
        <boxGeometry args={[0.26, 0.4, 0.26]} />
        <meshStandardMaterial color="#cfe8ff" transparent opacity={0.22} roughness={0.05} metalness={0.1} />
      </mesh>
      {/* Columnas de la caja */}
      {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * 0.13, yCaja, sz * 0.13]} castShadow>
          <boxGeometry args={[0.025, 0.42, 0.025]} />
          <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
        </mesh>
      ))}
      {/* Techo piramidal */}
      <mesh position={[0, yCaja + 0.28, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.24, 0.16, 4]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Bulbo + luz */}
      <group position={[0, yCaja, 0]}>
        <Bulbo radio={0.08} fuerza={fuerza} fx={fx} />
        <LuzNoche intensidad={8} distancia={5} fuerza={fuerza} fx={fx} />
      </group>
    </group>
  )
}

/** Lámpara de pie: base + tubo + tulipa (color del usuario) con bulbo cálido dentro. */
export function LamparaPie({ color, simple = false, fx = 1 }: { color: string; simple?: boolean; fx?: number }) {
  const fuerza = useFuerzaNoche(simple)
  const on = fuerza >= 0.04
  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.06, 20]} />
        <meshStandardMaterial color={MET_LAMPARA} roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Tubo */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 1.38, 8]} />
        <meshStandardMaterial color={MET_LAMPARA} roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Pantalla (tulipa abierta) */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.3, 0.34, 24, 1, true]} />
        <meshStandardMaterial
          color={color}
          roughness={0.85}
          side={THREE.DoubleSide}
          emissive={color}
          emissiveIntensity={on ? 0.35 * fuerza * fx : 0}
        />
      </mesh>
      {/* Bulbo + luz dentro de la pantalla */}
      <group position={[0, 1.44, 0]}>
        <Bulbo radio={0.06} fuerza={fuerza} fx={fx} />
        <LuzNoche intensidad={7} distancia={4.5} fuerza={fuerza} fx={fx} />
      </group>
    </group>
  )
}

/** Vela sobre candelabro: platillo + vela de cera + llama pequeña y luz tenue. */
export function VelaCandelabro({ color, simple = false, fx = 1 }: { color: string; simple?: boolean; fx?: number }) {
  const fuerza = useFuerzaNoche(simple)
  const on = fuerza >= 0.04
  return (
    <group>
      {/* Platillo */}
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.05, 20]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Cuello */}
      <mesh position={[0, 0.11, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.09, 0.12, 12]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Vela de cera */}
      <mesh position={[0, 0.29, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.06, 0.28, 14]} />
        <meshStandardMaterial color={CERA} roughness={0.6} />
      </mesh>
      {on && (
        <>
          <group position={[0, 0.47, 0]}>
            <Llama escala={0.6 * (0.8 + 0.2 * fx)} />
          </group>
          <LuzNoche y={0.5} color="#ffb257" intensidad={4} distancia={3} fuerza={fuerza} fx={fx} />
        </>
      )}
    </group>
  )
}

/* ─────────────────────────── Anuncios ───────────────────────────
 * Letreros con texto del usuario (`ObjetoCuarto.texto`, multilínea con Enter)
 * dibujado en una textura de canvas — síncrona, así también sale en miniaturas.
 * De noche brillan (emissiveMap + luz propia, misma lógica que las luces);
 * el slider de efectos (fx, grupo 'luz') regula ese brillo.
 */

/** Textos de muestra cuando el anuncio aún no tiene texto propio. */
const TEXTO_ESPECTACULAR = 'TU ANUNCIO\nAQUÍ'
const TEXTO_VEGAS = 'BIENVENIDOS'
const TEXTO_NEON = 'MI CASA'

/**
 * Dibuja texto multilínea centrado en un canvas y lo regresa como textura.
 * El tamaño de fuente se ajusta solo para que la línea más ancha quepa.
 * Con `glow`, estilo neón: halo del color + núcleo casi blanco (el "tubo").
 */
function texturaTexto(
  texto: string,
  { w, h, fondo, color, glow }: { w: number; h: number; fondo: string | null; color: string; glow?: string },
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  if (fondo) {
    ctx.fillStyle = fondo
    ctx.fillRect(0, 0, w, h)
  }
  const lineas = texto.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lineas.length) {
    let size = Math.floor((h * 0.8) / (lineas.length * 1.22))
    const font = (s: number) => `900 ${s}px 'Arial Black', system-ui, sans-serif`
    ctx.font = font(size)
    const maxAncho = Math.max(...lineas.map((l) => ctx.measureText(l).width))
    if (maxAncho > w * 0.88) size = Math.max(10, Math.floor((size * w * 0.88) / maxAncho))
    ctx.font = font(size)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const pasoY = size * 1.22
    const y0 = h / 2 - ((lineas.length - 1) * pasoY) / 2
    lineas.forEach((l, i) => {
      const y = y0 + i * pasoY
      if (glow) {
        ctx.shadowColor = glow
        ctx.shadowBlur = size * 0.55
        ctx.fillStyle = glow
        ctx.fillText(l, w / 2, y)
        ctx.fillText(l, w / 2, y)
        ctx.shadowBlur = size * 0.18
        ctx.fillStyle = '#ffffff'
        ctx.fillText(l, w / 2, y)
        ctx.shadowBlur = 0
      } else {
        ctx.fillStyle = color
        ctx.fillText(l, w / 2, y)
      }
    })
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Textura de texto memoizada, liberada al cambiar el texto o el estilo. */
function useTexturaTexto(texto: string, w: number, h: number, fondo: string | null, color: string, glow?: string) {
  const tex = useMemo(() => texturaTexto(texto, { w, h, fondo, color, glow }), [texto, w, h, fondo, color, glow])
  useEffect(() => () => { tex.dispose() }, [tex])
  return tex
}

/** Medidas del panel del espectacular (el marco añade 0.16). */
const PANEL_W = 2.9
const PANEL_H = 1.5
/** Altura del centro del panel sobre el suelo. */
const PANEL_Y = 2.53

/**
 * Casco del espectacular de carretera: monoposte, marco del panel, pasarela de
 * mantenimiento y tres focos arriba que encienden de noche e iluminan el panel.
 * `children` = el contenido (planos con la foto/el texto) en la cara frontal.
 */
function CascoEspectacular({
  color,
  fuerza,
  fx,
  children,
}: {
  color: string
  fuerza: number
  fx: number
  children: React.ReactNode
}) {
  const topPanel = PANEL_Y + PANEL_H / 2 + 0.08
  return (
    <group>
      {/* Monoposte y refuerzo bajo el panel */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 1.7, 12]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.35} />
      </mesh>
      <mesh position={[0, 1.72, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.1, 0.18, 12]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.35} />
      </mesh>
      {/* Marco/caja del panel */}
      <mesh position={[0, PANEL_Y, 0]} castShadow>
        <boxGeometry args={[PANEL_W + 0.16, PANEL_H + 0.16, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.25} />
      </mesh>
      {/* Pasarela de mantenimiento al frente */}
      <mesh position={[0, PANEL_Y - PANEL_H / 2 - 0.11, 0.28]} castShadow>
        <boxGeometry args={[PANEL_W + 0.1, 0.05, 0.3]} />
        <meshStandardMaterial color="#6b7280" roughness={0.7} metalness={0.4} />
      </mesh>
      {/* Focos superiores (encienden de noche) */}
      {[-1.05, 0, 1.05].map((x) => (
        <group key={x} position={[x, topPanel, 0]}>
          <mesh position={[0, 0.1, 0.06]} rotation={[0.7, 0, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.34, 8]} />
            <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.5} />
          </mesh>
          <group position={[0, 0.2, 0.2]}>
            <Bulbo radio={0.05} fuerza={fuerza} fx={fx} />
          </group>
        </group>
      ))}
      <LuzNoche y={PANEL_Y + 0.9} color="#fff3d6" intensidad={6} distancia={3.5} fuerza={fuerza} fx={fx} />
      {/* Contenido del panel (cara frontal) */}
      <group position={[0, PANEL_Y, 0.051]}>{children}</group>
    </group>
  )
}

/** Panel de solo texto: lona clara retroiluminada de noche. */
function PanelTextoEspectacular({ texto, fuerza, fx }: { texto: string; fuerza: number; fx: number }) {
  const tex = useTexturaTexto(texto, 1024, 530, '#f5f1e6', '#1f2937')
  return (
    <mesh>
      <planeGeometry args={[PANEL_W, PANEL_H]} />
      <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.55 * fuerza * fx} roughness={0.8} />
    </mesh>
  )
}

/** Panel con la foto del usuario (recorte tipo "cover") y el texto en una banda inferior. */
function PanelFotoEspectacular({
  url,
  texto,
  fuerza,
  fx,
}: {
  url: string
  texto: string
  fuerza: number
  fx: number
}) {
  const tex = useLoader(THREE.TextureLoader, url)
  const banda = useTexturaTexto(texto, 1024, 154, 'rgba(15,23,42,0.78)', '#f8fafc')
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    // La foto llena el panel recortando el sobrante (cover), sin deformarse.
    const img = tex.image as { width: number; height: number }
    const rImg = img.width && img.height ? img.width / img.height : 4 / 3
    const rPanel = PANEL_W / PANEL_H
    if (rImg > rPanel) {
      tex.repeat.set(rPanel / rImg, 1)
      tex.offset.set((1 - rPanel / rImg) / 2, 0)
    } else {
      tex.repeat.set(1, rImg / rPanel)
      tex.offset.set(0, (1 - rImg / rPanel) / 2)
    }
    tex.needsUpdate = true
  }, [tex])
  return (
    <>
      <mesh>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.5 * fuerza * fx} roughness={0.8} />
      </mesh>
      {texto && (
        <mesh position={[0, -PANEL_H / 2 + 0.24, 0.002]}>
          <planeGeometry args={[PANEL_W, 0.42]} />
          <meshStandardMaterial
            map={banda}
            transparent
            depthWrite={false}
            emissive="#ffffff"
            emissiveMap={banda}
            emissiveIntensity={0.5 * fuerza * fx}
          />
        </mesh>
      )}
    </>
  )
}

function EspectacularConFoto({
  color,
  foto,
  texto,
  fuerza,
  fx,
}: {
  color: string
  foto: Blob
  texto: string
  fuerza: number
  fx: number
}) {
  const url = useUrlBlob(foto)
  if (!url) return null
  return (
    <CascoEspectacular color={color} fuerza={fuerza} fx={fx}>
      <PanelFotoEspectacular url={url} texto={texto} fuerza={fuerza} fx={fx} />
    </CascoEspectacular>
  )
}

/**
 * Espectacular de carretera: panel grande sobre un monoposte. Muestra la foto
 * del usuario (con el texto en una banda) o solo el texto a todo el panel.
 * El color tiñe la estructura. De noche los focos lo retroiluminan.
 */
export function Espectacular({
  color,
  foto,
  texto,
  simple = false,
  fx = 1,
}: {
  color: string
  foto?: Blob
  texto?: string
  simple?: boolean
  fx?: number
}) {
  const fuerza = useFuerzaNoche(simple)
  const txt = texto?.trim() || (foto ? '' : TEXTO_ESPECTACULAR)
  if (!foto) {
    return (
      <CascoEspectacular color={color} fuerza={fuerza} fx={fx}>
        <PanelTextoEspectacular texto={txt} fuerza={fuerza} fx={fx} />
      </CascoEspectacular>
    )
  }
  return (
    // Suspende TODO el espectacular hasta que la foto cargue (como CuadroFoto:
    // así la miniatura no captura el panel vacío antes de tiempo).
    <Suspense fallback={null}>
      <EspectacularConFoto color={color} foto={foto} texto={txt} fuerza={fuerza} fx={fx} />
    </Suspense>
  )
}

/** Semiejes del rombo del letrero Las Vegas. */
const VEGAS_A = 1.0
const VEGAS_B = 0.75
/** Altura del centro del rombo. */
const VEGAS_Y = 1.95

/**
 * Letrero tipo Las Vegas: rombo con marquesina de bombillas que se persiguen
 * (3 grupos alternando por reloj), estrella arriba y el texto al centro.
 * El color tiñe el rombo. En miniaturas las bombillas quedan encendidas.
 */
export function LetreroVegas({
  color,
  texto,
  simple = false,
  fx = 1,
}: {
  color: string
  texto?: string
  simple?: boolean
  fx?: number
}) {
  const fuerza = useFuerzaNoche(simple)
  const on = fuerza >= 0.04
  const tex = useTexturaTexto(texto?.trim() || TEXTO_VEGAS, 512, 392, '#101623', '#ffedbc', '#f59e0b')
  // 3 materiales compartidos por las bombillas: el "chase" solo cambia la
  // intensidad de cada grupo (barato; en miniaturas quedan encendidas).
  const matsBombilla = useMemo(
    () =>
      [0, 1, 2].map(
        () =>
          new THREE.MeshStandardMaterial({
            color: '#f5deab',
            emissive: '#ffcf6b',
            emissiveIntensity: 2,
            toneMapped: false,
          }),
      ),
    [],
  )
  useEffect(() => () => { matsBombilla.forEach((m) => m.dispose()) }, [matsBombilla])
  useFrame(({ clock }) => {
    const paso = Math.floor(clock.elapsedTime * 4) % 3
    matsBombilla.forEach((m, i) => {
      m.emissiveIntensity = (0.15 + (i === paso ? 2.1 : 0)) * fuerza * fx
    })
  })
  // Bombillas repartidas sobre el perímetro del rombo (|x|/a + |y|/b = 1).
  const bombillas = useMemo(() => {
    const n = 16
    const a = VEGAS_A - 0.08
    const b = VEGAS_B - 0.08
    return Array.from({ length: n }, (_, i) => {
      const th = (i / n) * Math.PI * 2
      const r = 1 / (Math.abs(Math.cos(th)) / a + Math.abs(Math.sin(th)) / b)
      return [Math.cos(th) * r, Math.sin(th) * r] as [number, number]
    })
  }, [])
  return (
    <group>
      {/* Base y postes */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[1.0, 0.12, 0.5]} />
        <meshStandardMaterial color="#52525b" roughness={0.8} metalness={0.3} />
      </mesh>
      {[-0.38, 0.38].map((x) => (
        <mesh key={x} position={[x, 0.66, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 1.2, 10]} />
          <meshStandardMaterial color="#71717a" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      {/* Rombo (cilindro de 4 lados acostado: diamante de frente) */}
      <mesh position={[0, VEGAS_Y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[VEGAS_A, 1, VEGAS_B]} castShadow>
        <cylinderGeometry args={[1, 1, 0.12, 4]} />
        <meshStandardMaterial color={color} roughness={0.65} flatShading />
      </mesh>
      {/* Texto al centro (rectángulo inscrito en el rombo) */}
      <mesh position={[0, VEGAS_Y, 0.065]}>
        <planeGeometry args={[VEGAS_A * 0.94, VEGAS_B * 0.94]} />
        <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={on ? 1.1 * fuerza * fx : 0} toneMapped={false} />
      </mesh>
      {/* Bombillas de la marquesina */}
      {bombillas.map(([x, y], i) => (
        <mesh key={i} position={[x, VEGAS_Y + y, 0.08]} material={matsBombilla[i % 3]}>
          <sphereGeometry args={[0.045, 8, 8]} />
        </mesh>
      ))}
      {/* Estrella (asterisco de 4 barras) sobre la punta */}
      <mesh position={[0, VEGAS_Y + VEGAS_B + 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="#71717a" roughness={0.6} metalness={0.4} />
      </mesh>
      <group position={[0, VEGAS_Y + VEGAS_B + 0.34, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]} castShadow>
            <boxGeometry args={[0.36, 0.055, 0.055]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#fbbf24"
              emissiveIntensity={on ? 1.5 * fuerza * fx : 0}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      <LuzNoche y={VEGAS_Y} color="#ffd9a0" intensidad={7} distancia={4.5} fuerza={fuerza} fx={fx} />
    </group>
  )
}

/** Medidas del letrero de neón. */
const NEON_W = 1.7
const NEON_H = 0.75

/**
 * Letrero de neón: caja oscura con tubo perimetral y texto que brillan del
 * color del usuario. De noche parpadea de vez en cuando (tubo viejo); de día
 * se ve apagado. Va de pie: se arrima a un muro con arrastrar + altura.
 */
export function LetreroNeon({
  color,
  texto,
  simple = false,
  fx = 1,
}: {
  color: string
  texto?: string
  simple?: boolean
  fx?: number
}) {
  const fuerza = useFuerzaNoche(simple)
  const tex = useTexturaTexto(texto?.trim() || TEXTO_NEON, 1024, 400, null, '#ffffff', color)
  const matTubo = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 2.4,
        toneMapped: false,
      }),
    [color],
  )
  const matTexto = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        emissive: '#ffffff',
        emissiveMap: tex,
        emissiveIntensity: 1.9,
        toneMapped: false,
      }),
    [tex],
  )
  useEffect(() => () => { matTubo.dispose() }, [matTubo])
  useEffect(() => () => { matTexto.dispose() }, [matTexto])
  useFrame(({ clock }) => {
    // Parpadeo ocasional determinista (cae de brillo un instante, como tubo viejo).
    const t = clock.elapsedTime
    const drop = Math.sin(t * 11.3) * Math.sin(t * 4.7) > 0.96 ? 0.3 : 1
    const k = drop * fuerza * fx
    matTubo.emissiveIntensity = 2.4 * k
    matTexto.emissiveIntensity = 1.9 * k
  })
  const marcoX = NEON_W / 2 - 0.03
  const marcoY = NEON_H / 2 - 0.03
  return (
    <group position={[0, NEON_H / 2 + 0.02, 0]}>
      {/* Caja de fondo */}
      <mesh castShadow>
        <boxGeometry args={[NEON_W, NEON_H, 0.05]} />
        <meshStandardMaterial color="#15171c" roughness={0.85} />
      </mesh>
      {/* Tubo perimetral */}
      {[marcoY, -marcoY].map((y) => (
        <mesh key={y} position={[0, y, 0.032]} rotation={[0, 0, Math.PI / 2]} material={matTubo}>
          <cylinderGeometry args={[0.02, 0.02, NEON_W - 0.06, 8]} />
        </mesh>
      ))}
      {[marcoX, -marcoX].map((x) => (
        <mesh key={x} position={[x, 0, 0.032]} material={matTubo}>
          <cylinderGeometry args={[0.02, 0.02, NEON_H - 0.06, 8]} />
        </mesh>
      ))}
      {/* Texto de neón */}
      <mesh position={[0, 0, 0.045]} material={matTexto}>
        <planeGeometry args={[NEON_W - 0.24, NEON_H - 0.18]} />
      </mesh>
      <LuzNoche color={color} intensidad={6} distancia={3.5} fuerza={fuerza} fx={fx} />
    </group>
  )
}
