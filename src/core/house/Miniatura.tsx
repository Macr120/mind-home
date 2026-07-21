import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ObjetoView } from './catalogo'
import { TemaContext } from './primitivas'
import { getTema, type Tema, type TemaId } from './temas'
import type { Pieza3D } from '../chat/mascotas'

/**
 * Miniaturas del inventario = imágenes PNG del modelo real.
 *
 * En vez de un <Canvas> por objeto (el navegador limita ~16 contextos WebGL) o
 * el sistema View de drei (frágil con listas dinámicas), un ÚNICO canvas oculto
 * (`GeneradorMiniaturas`) renderiza cada modelo una vez y guarda su PNG en caché
 * (clave = tipo+tema+color). El inventario muestra <img>. Al cambiar el tema, la
 * clave cambia y se regenera. Determinista, sin churn de contextos.
 */

interface Peticion {
  clave: string
  tipo: string
  color: string
  temaId: TemaId | null
  /** Objetos tipo 'piezas': las primitivas a renderizar. */
  piezas?: Pieza3D[]
  /** Objetos tipo 'glb': el modelo subido por el usuario. */
  modeloGlb?: Blob
  /** Objetos 'cuadro-foto' y 'espectacular': la foto subida por el usuario. */
  foto?: Blob
  /** Anuncios: el texto del letrero. */
  texto?: string
}

interface ThumbState {
  /** PNG (dataURL) por clave. */
  urls: Record<string, string>
  /** Cola de modelos pendientes de rasterizar. */
  cola: Peticion[]
  pedir: (p: Peticion) => void
  hecho: (clave: string, url: string) => void
}

const useThumbs = create<ThumbState>((set, get) => ({
  urls: {},
  cola: [],
  pedir: (p) => {
    const s = get()
    if (s.urls[p.clave] || s.cola.some((q) => q.clave === p.clave)) return
    set({ cola: [...s.cola, p] })
  },
  hecho: (clave, url) =>
    set((s) => ({ urls: { ...s.urls, [clave]: url }, cola: s.cola.filter((q) => q.clave !== clave) })),
}))

/** `idObjeto` distingue objetos 'glb' entre sí (un Blob no se puede serializar en la clave). */
const claveDe = (
  tipo: string,
  color: string,
  tema: Tema | null,
  piezas?: Pieza3D[],
  idObjeto?: number,
  foto?: Blob,
  texto?: string,
) =>
  `${tipo}|${tema?.id ?? 'base'}|${color}${piezas ? `|${JSON.stringify(piezas)}` : ''}${
    idObjeto != null ? `|${idObjeto}` : ''
  }${foto ? `|f${foto.size}` : ''}${texto ? `|t${texto}` : ''}`

/** Centra y escala el contenido a ~2 unidades en el origen. */
function ajustar(g: THREE.Group) {
  g.scale.setScalar(1)
  g.position.set(0, 0, 0)
  g.updateWorldMatrix(true, true)
  const box = new THREE.Box3().setFromObject(g)
  if (box.isEmpty()) return false
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const s = 2 / maxDim
  g.scale.setScalar(s)
  g.position.set(-center.x * s, -center.y * s, -center.z * s)
  return true
}

/**
 * Rasteriza una petición. Conduce el render con setTimeout (NO con el loop de
 * R3F): el canvas está oculto y el navegador throttlea su requestAnimationFrame,
 * lo que haría la generación lentísima. setTimeout no se throttlea en pestaña
 * activa, así que renderizamos a mano (`gl.render`) y capturamos el PNG.
 */
function Captura({ req }: { req: Peticion }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const ref = useRef<THREE.Group>(null)
  const hecho = useThumbs((s) => s.hecho)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    let intentos = 0
    const run = () => {
      const g = ref.current
      // Espera a que R3F monte las mallas (geometría presente) antes de capturar.
      if (!g || !ajustar(g)) {
        if (intentos++ < 30) timer = setTimeout(run, 16)
        else hecho(req.clave, '')
        return
      }
      gl.render(scene, camera)
      try {
        hecho(req.clave, gl.domElement.toDataURL('image/png'))
      } catch {
        hecho(req.clave, '')
      }
    }
    timer = setTimeout(run, 24)
    return () => clearTimeout(timer)
  }, [req.clave, gl, scene, camera, hecho])
  return (
    <group ref={ref}>
      <TemaContext.Provider value={getTema(req.temaId)}>
        {/* sinReflejo: en el canvas oculto no hay escena que reflejar. */}
        <ObjetoView tipo={req.tipo} color={req.color} piezas={req.piezas} modeloGlb={req.modeloGlb} foto={req.foto} texto={req.texto} sinReflejo />
      </TemaContext.Provider>
    </group>
  )
}

/** Canvas oculto que procesa la cola de miniaturas (montar UNA vez en edición). */
export function GeneradorMiniaturas() {
  const req = useThumbs((s) => s.cola[0])
  return (
    <div style={{ position: 'fixed', left: -9999, top: -9999, width: 128, height: 128, pointerEvents: 'none', opacity: 0 }}>
      <Canvas
        frameloop="never"
        gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
        camera={{ fov: 32, position: [2.8, 2.5, 2.8] }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 6, 5]} intensity={1.1} />
        <directionalLight position={[-4, 2, -3]} intensity={0.4} />
        {req && <Captura key={req.clave} req={req} />}
      </Canvas>
    </div>
  )
}

/** Miniatura (imagen) de un objeto del inventario, vestido con el tema activo. */
export function MiniaturaModelo({
  tipo,
  color,
  tema,
  className,
  piezas,
  modeloGlb,
  foto,
  texto,
  idObjeto,
}: {
  tipo: string
  color: string
  tema: Tema | null
  className?: string
  /** Objetos tipo 'piezas': las primitivas del objeto (invalidan la caché al editarse). */
  piezas?: Pieza3D[]
  /** Objetos tipo 'glb': el modelo subido por el usuario. */
  modeloGlb?: Blob
  /** Objetos 'cuadro-foto' y 'espectacular': la foto (su tamaño invalida la caché al cambiarla). */
  foto?: Blob
  /** Anuncios: el texto del letrero (invalida la caché al editarlo). */
  texto?: string
  /** Id del objeto (distingue objetos 'glb' entre sí en la clave de caché). */
  idObjeto?: number
}) {
  const clave = claveDe(tipo, color, tema, piezas, modeloGlb ? idObjeto : undefined, foto, texto)
  const url = useThumbs((s) => s.urls[clave])
  const pedir = useThumbs((s) => s.pedir)
  useEffect(() => {
    if (!url) pedir({ clave, tipo, color, temaId: tema?.id ?? null, piezas, modeloGlb, foto, texto })
  }, [clave, url, tipo, color, tema, pedir, piezas, modeloGlb, foto, texto])
  return url ? (
    <img src={url} className={className} alt="" draggable={false} />
  ) : (
    <div className={className} />
  )
}
