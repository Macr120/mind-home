import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Pieza3D } from '../../chat/mascotas'
import { ObjetoView } from '../../house/catalogo'
import { PiezasSeleccionContext } from '../../house/modeloPersonalizado'
import { TemaContext } from '../../house/primitivas'
import { getTema, type TemaId } from '../../house/temas'
import { useEditorUi } from '../../state/editorUiStore'
import { forzarSiempre, type AnimacionModelo } from '../../house/animacion'
import { GrupoAnimado } from '../../house/Animado'
import { ControlesPiezasOverlay, EngraneActivarPiezas, BotonOverlay } from '../comun/EditorPiezas'
import { BotonPreviewClaro, claseFondoPreview } from '../comun/BotonPreviewClaro'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

/** Half-extents (x,y,z) de una pieza según su tipo, para medir su caja. */
function medioPieza(p: Pieza3D): [number, number, number] {
  const [a = 0.3, b = 0.3, c = 0.3] = p.tam
  switch (p.tipo) {
    case 'esfera':
      return [a, a, a]
    case 'cono':
      return [a, b / 2, a]
    case 'cilindro': {
      const r = Math.max(a, b)
      return [r, (p.tam[2] ?? 0.4) / 2, r]
    }
    case 'plano':
      return [a / 2, b / 2, 0.02]
    default: // caja
      return [a / 2, b / 2, c / 2]
  }
}

/**
 * Encuadre de la cámara según el contenido: para objetos de piezas se calcula a
 * partir de su caja contenedora (alto y ancho reales), así una columna alta o un
 * arco ancho caben completos y el zoom out llega lo suficientemente lejos. Para
 * objetos del catálogo (sin piezas) se usa un encuadre fijo generoso.
 */
function encuadrar(piezas: Pieza3D[] | undefined, escala: number) {
  if (!piezas || piezas.length === 0) {
    return { pos: [2.6, 2.2, 2.6] as [number, number, number], targetY: 0.6, maxDist: 12, pisoR: 2.4 }
  }
  let minY = Infinity
  let maxY = -Infinity
  let horiz = 0
  for (const p of piezas) {
    const [hx, hy, hz] = medioPieza(p)
    const [x, y, z] = p.pos
    minY = Math.min(minY, y - hy)
    maxY = Math.max(maxY, y + hy)
    horiz = Math.max(horiz, Math.abs(x) + hx, Math.abs(z) + hz)
  }
  minY = Math.min(minY, 0) * escala
  maxY = maxY * escala
  horiz = horiz * escala
  const alto = Math.max(maxY - minY, 0.2)
  const dist = Math.min(Math.max(Math.max(alto, horiz * 2) * 2.2 + 1, 3), 30)
  return {
    pos: [dist * 0.62, dist * 0.52, dist * 0.62] as [number, number, number],
    targetY: (minY + maxY) / 2,
    maxDist: dist * 2,
    pisoR: Math.max(2.4, horiz * 1.4),
  }
}

/**
 * Vista previa 3D en vivo del objeto en edición. Reutiliza `ObjetoView` (el mismo
 * modelo que la escena) vestido con el tema activo, así cada cambio de color,
 * tamaño o rotación se ve al instante. Girable con el mouse (OrbitControls).
 * Para objetos de piezas, las piezas se seleccionan tocándolas y los cuadrantes
 * muestran las herramientas rápidas (posición, tamaño y rotación de la pieza).
 */
export function PreviewObjeto3D({
  tipo,
  color,
  escala = 1,
  rotY = 0,
  rotX = 0,
  rotZ = 0,
  alturaY = 0,
  temaId,
  piezas,
  modeloGlb,
  foto,
  texto,
  anim,
  fx,
  onPiezasChange,
  onActivarPiezas,
}: {
  tipo: string
  color: string
  escala?: number
  rotY?: number
  /** Rotación en grados: X/Z inclinan, Y gira. */
  rotX?: number
  rotZ?: number
  /** Altura extra (levantar/flotar) en unidades. */
  alturaY?: number
  temaId: TemaId | null
  /** Objetos tipo 'piezas': las primitivas del objeto. */
  piezas?: import('../../chat/mascotas').Pieza3D[]
  /** Objetos tipo 'glb': el modelo subido por el usuario. */
  modeloGlb?: Blob
  /** Objetos 'cuadro-foto' y 'espectacular': la foto subida por el usuario. */
  foto?: Blob
  /** Anuncios: el texto del letrero. */
  texto?: string
  /** Animación del objeto: habilita el botón ▶ para previsualizarla. */
  anim?: AnimacionModelo
  /** Intensidad de los efectos del objeto especial (agua/luz); 1 = normal. */
  fx?: number
  /** Activa la edición de piezas en el visor (selección al tocar + overlay). */
  onPiezasChange?: (piezas: import('../../chat/mascotas').Pieza3D[]) => void
  /** Objetos que aún no son de piezas: el engrane ⚙️ los convierte para editarlos. */
  onActivarPiezas?: () => void
}) {
  const t = useT()
  const piezaSel = useEditorUi((s) => s.piezaSel)
  const setPiezaSel = useEditorUi((s) => s.setPiezaSel)
  const controlesAbiertos = useEditorUi((s) => s.piezasControles)
  const play = useEditorUi((s) => s.animPreview)
  const setPlay = useEditorUi((s) => s.setAnimPreview)
  const claro = useEditorUi((s) => s.previewClaro)
  const D = Math.PI / 180
  const enc = useMemo(() => encuadrar(piezas, escala), [piezas, escala])
  // Reproducción en el visor: fuerza 'siempre' (undefined si no hay nada que
  // reproducir). Con «Dale vida», el paseo se encoge para que no se salga del
  // encuadre de un canvas de doscientos píxeles.
  const animable = forzarSiempre(anim)
  const animPlay = play
    ? animable && (animable.preset === 'vida' ? { ...animable, radio: 0.6 } : animable)
    : undefined
  const edicion = onPiezasChange && piezas && piezas.length > 0 && !animPlay
  // La selección táctil y el resaltado solo con los controles abiertos (engrane ⚙️).
  const seleccion = edicion && controlesAbiertos
    ? { sel: Math.min(piezaSel, piezas.length - 1), onSel: setPiezaSel }
    : null

  return (
    <div
      className={`sticky top-0 z-10 overflow-hidden rounded-xl border border-white/10 ${claseFondoPreview(claro)}`}
    >
      <div className="h-56 w-full">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: enc.pos, fov: 32, near: 0.1, far: 100 }}
        >
          <ambientLight intensity={0.85} />
          <directionalLight position={[4, 8, 5]} intensity={1.1} castShadow />
          <directionalLight position={[-4, 3, -3]} intensity={0.35} />
          <TemaContext.Provider value={getTema(temaId)}>
            <PiezasSeleccionContext.Provider value={seleccion}>
              <group
                scale={escala}
                rotation={[rotX * D, rotY * D, rotZ * D]}
                position={[0, alturaY, 0]}
              >
                <GrupoAnimado anim={animPlay}>
                  <ObjetoView tipo={tipo} color={color} piezas={piezas} modeloGlb={modeloGlb} foto={foto} texto={texto} anim={animPlay} fx={fx} />
                </GrupoAnimado>
              </group>
            </PiezasSeleccionContext.Provider>
          </TemaContext.Provider>
          {/* Piso de apoyo para la sombra */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <circleGeometry args={[enc.pisoR, 48]} />
            <meshStandardMaterial color={claro ? '#e5e7eb' : '#1a1d25'} />
          </mesh>
          <OrbitControls
            enablePan={false}
            enableDamping
            target={[0, enc.targetY, 0]}
            minDistance={0.8}
            maxDistance={enc.maxDist}
          />
        </Canvas>
      </div>
      {edicion ? (
        <ControlesPiezasOverlay piezas={piezas} onChange={onPiezasChange} />
      ) : (
        <>
          {!animPlay && onActivarPiezas && <EngraneActivarPiezas onActivar={onActivarPiezas} />}
          <div className="absolute left-1.5 top-1.5">
            <BotonPreviewClaro />
          </div>
          <span
            className={`pointer-events-none absolute bottom-1.5 left-0 right-0 text-center text-[10px] ${
              claro ? 'text-black/45' : 'text-[#ffffff]/35'
            }`}
          >
            {t('preview.girar', 'Arrastra para girar · rueda para acercar')}
          </span>
        </>
      )}
      {/* ▶/⏸: previsualiza la animación del objeto (oculta la edición mientras reproduce). */}
      {animable && (
        <div className="absolute bottom-1.5 right-1.5">
          <BotonOverlay
            title={play ? t('editor.anim.pausar', 'Pausar animación') : t('editor.anim.reproducir', 'Reproducir animación')}
            onClick={() => setPlay(!play)}
            activo={play}
          >
            {play ? <Icono nombre="pausa" /> : <Icono nombre="play" />}
          </BotonOverlay>
        </div>
      )}
    </div>
  )
}
