import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { AvatarModelo } from '../../house/AvatarModelo'
import { ModeloMascota } from '../../house/Asistente3D'
import { Prendas } from '../../house/Prendas'
import { PiezasSeleccionContext } from '../../house/modeloPersonalizado'
import { ANCLAS_FORMA } from '../../house/apariencia'
import { forzarSiempre } from '../../house/animacion'
import { GrupoAnimado } from '../../house/Animado'
import type { Avatar } from '../../state/disenoStore'
import { useEditorUi } from '../../state/editorUiStore'
import type { Asistente, Pieza3D } from '../../chat/mascotas'
import { ControlesPiezasOverlay, EngraneActivarPiezas, BotonOverlay } from './EditorPiezas'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

/**
 * Vista previa 3D del personaje en edición (el principal o un agente). Lee los
 * mismos datos que la escena, así cada cambio de color, tamaño o ropa se ve al
 * instante. Girable con el mouse (OrbitControls). Con `piezasEdit`, las piezas
 * del cuerpo se seleccionan tocándolas y los cuadrantes muestran las
 * herramientas rápidas (posición, tamaño y rotación de la pieza).
 */
export function PreviewPersonaje3D({
  avatar,
  asistente,
  piezasEdit,
  onActivarPiezas,
}: {
  avatar?: Avatar
  asistente?: Asistente
  /** Edición de piezas del cuerpo (solo si el personaje usa un modelo de piezas). */
  piezasEdit?: { piezas: Pieza3D[]; onChange: (piezas: Pieza3D[]) => void }
  /** Personajes que aún no son de piezas: el engrane ⚙️ los convierte para editarlos. */
  onActivarPiezas?: () => void
}) {
  const t = useT()
  const brazo = useRef<THREE.Group>(null)
  const piezaSel = useEditorUi((s) => s.piezaSel)
  const setPiezaSel = useEditorUi((s) => s.setPiezaSel)
  const controlesAbiertos = useEditorUi((s) => s.piezasControles)
  const play = useEditorUi((s) => s.animPreview)
  const setPlay = useEditorUi((s) => s.setAnimPreview)
  // Reproducción en el visor: fuerza 'siempre' (undefined si no hay nada que reproducir).
  const animable = forzarSiempre(avatar ? avatar.animacion : asistente?.animacion)
  const animPlay = play ? animable : undefined
  const edicion = piezasEdit && piezasEdit.piezas.length > 0 && !animPlay
  // La selección táctil y el resaltado solo con los controles abiertos (engrane ⚙️).
  const seleccion = edicion && controlesAbiertos
    ? { sel: Math.min(piezaSel, piezasEdit.piezas.length - 1), onSel: setPiezaSel }
    : null

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
      <div className="h-56 w-full">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [2.2, 1.9, 4.1], fov: 32, near: 0.1, far: 100 }}
        >
          <ambientLight intensity={0.85} />
          <directionalLight position={[4, 8, 5]} intensity={1.1} castShadow />
          <directionalLight position={[-4, 3, -3]} intensity={0.35} />
          <PiezasSeleccionContext.Provider value={seleccion}>
            {avatar ? (
              <AvatarModelo
                av={animPlay ? { ...avatar, animacion: animPlay } : avatar}
                animar={!!animPlay}
              />
            ) : asistente ? (
              <GrupoAnimado anim={animPlay}>
                <group scale={asistente.escala ?? 1}>
                  <ModeloMascota
                    forma={asistente.forma}
                    color={asistente.color}
                    modelo3d={asistente.modelo3d}
                    modeloGlb={asistente.modeloGlb}
                    brazoRef={brazo}
                    anim={animPlay}
                  />
                  <Prendas ropa={asistente.ropa} anclas={ANCLAS_FORMA[asistente.forma]} />
                </group>
              </GrupoAnimado>
            ) : null}
          </PiezasSeleccionContext.Provider>
          {/* Piso de apoyo para la sombra */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <circleGeometry args={[2.2, 32]} />
            <meshStandardMaterial color="#1a1d25" />
          </mesh>
          <OrbitControls
            enablePan={false}
            enableDamping
            target={[0, 0.85, 0]}
            minDistance={1.6}
            maxDistance={8}
          />
        </Canvas>
      </div>
      {edicion ? (
        <ControlesPiezasOverlay piezas={piezasEdit.piezas} onChange={piezasEdit.onChange} />
      ) : (
        <>
          {!animPlay && onActivarPiezas && <EngraneActivarPiezas onActivar={onActivarPiezas} />}
          <span className="pointer-events-none absolute bottom-1.5 left-0 right-0 text-center text-[10px] text-white/35">
            {t('preview.girar', 'Arrastra para girar · rueda para acercar')}
          </span>
        </>
      )}
      {/* ▶/⏸: previsualiza la animación del personaje (oculta la edición mientras reproduce). */}
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
