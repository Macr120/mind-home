import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { AvatarModelo } from '../../house/AvatarModelo'
import { AsistenteModelo } from '../../house/AsistenteModelo'
import { PiezasSeleccionContext } from '../../house/modeloPersonalizado'
import { forzarSiempre } from '../../house/animacion'
import { useDiseño, type Avatar } from '../../state/disenoStore'
import { useEditorUi } from '../../state/editorUiStore'
import { useAsistentes } from '../../state/asistentesStore'
import {
  PARTES_TATUAJE,
  anclasDe,
  pivoteParte,
  type ParteTatuaje,
  type PrendaId,
  type PuntoTatuaje,
} from '../../house/apariencia'
import type { Asistente, Pieza3D } from '../../chat/mascotas'
import { ControlesPiezasOverlay, EngraneActivarPiezas, BotonOverlay } from '../comun/EditorPiezas'
import { BotonPreviewClaro, claseFondoPreview } from '../comun/BotonPreviewClaro'
import { EnZonaPreview, useEnZonaPreview } from './zonaPreview'
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
  const claro = useEditorUi((s) => s.previewClaro)
  const enZona = useEnZonaPreview()
  const controles = useRef<{ enabled: boolean } | null>(null)
  const colocando = useEditorUi((s) => s.tatuajeSel != null)
  const girarCamara = useCallback((si: boolean) => {
    if (controles.current) controles.current.enabled = si
  }, [])
  // Reproducción en el visor: fuerza 'siempre' (undefined si no hay nada que reproducir).
  const animable = forzarSiempre(avatar ? avatar.animacion : asistente?.animacion)
  const animPlay = play ? animable : undefined
  const edicion = piezasEdit && piezasEdit.piezas.length > 0 && !animPlay
  // La selección táctil y el resaltado solo con los controles abiertos (engrane ⚙️).
  const seleccion = edicion && controlesAbiertos
    ? { sel: Math.min(piezaSel, piezasEdit.piezas.length - 1), onSel: setPiezaSel }
    : null

  return (
    <EnZonaPreview>
      <div
        className={`${enZona ? 'relative h-full' : 'sticky top-0 z-10'} overflow-hidden rounded-xl border border-white/10 ${claseFondoPreview(claro)}`}
      >
        <div className={`${enZona ? 'h-full w-full' : 'h-56 w-full'} ${colocando ? 'cursor-crosshair' : ''}`}>
          <Canvas
            shadows
            dpr={[1, 1.5]}
            camera={{ position: [2.2, 1.9, 4.1], fov: 32, near: 0.1, far: 100 }}
          >
            <ambientLight intensity={0.85} />
            <directionalLight position={[4, 8, 5]} intensity={1.1} castShadow />
            <directionalLight position={[-4, 3, -3]} intensity={0.35} />
            <PiezasSeleccionContext.Provider value={seleccion}>
              <ColocarTatuaje avatar={avatar} asistente={asistente} girarCamara={girarCamara} pausado={!!animPlay}>
                {avatar ? (
                  <AvatarModelo
                    av={animPlay ? { ...avatar, animacion: animPlay } : avatar}
                    animar={!!animPlay}
                  />
                ) : asistente ? (
                  <AsistenteModelo asistente={asistente} anim={animPlay} brazoRef={brazo} />
                ) : null}
              </ColocarTatuaje>
            </PiezasSeleccionContext.Provider>
            {/* Piso de apoyo para la sombra */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
              <circleGeometry args={[2.2, 32]} />
              <meshStandardMaterial color={claro ? '#e5e7eb' : '#1a1d25'} />
            </mesh>
            <OrbitControls
              ref={controles as never}
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
            <div className="absolute start-1.5 top-1.5">
              <BotonPreviewClaro />
            </div>
            <span
              className={`pointer-events-none absolute bottom-1.5 start-0 end-0 text-center text-[10px] ${
                claro ? 'text-black/45' : 'text-[#ffffff]/35'
              }`}
            >
              {t('preview.girar', 'Arrastra para girar · rueda para acercar')}
            </span>
          </>
        )}
        {/* ▶/⏸: previsualiza la animación del personaje (oculta la edición mientras reproduce). */}
        {animable && (
          <div className="absolute bottom-1.5 end-1.5">
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
    </EnZonaPreview>
  )
}

const redondo = (v: number) => Math.round(v * 1000) / 1000

/**
 * Con un tatuaje elegido para mover (`tatuajeSel`), tocar o arrastrar sobre el
 * personaje lo coloca en ese punto de la superficie: se guarda la parte del
 * cuerpo (el brazo o la pierna tocada, para que siga el paso), el punto y la
 * dirección de la cara, en el marco de la ropa (`prendas-raiz`). Mientras se
 * arrastra, la cámara no gira. Pausado con la animación en marcha (el cuerpo
 * se mueve y el punto no saldría donde se tocó).
 */
function ColocarTatuaje({
  avatar,
  asistente,
  girarCamara,
  pausado,
  children,
}: {
  avatar?: Avatar
  asistente?: Asistente
  /** Activa/desactiva el giro de la cámara (se apaga mientras se arrastra el tatuaje). */
  girarCamara: (si: boolean) => void
  pausado: boolean
  children: ReactNode
}) {
  const tatuajeSel = useEditorUi((s) => s.tatuajeSel) as PrendaId | null
  const setAvatarPrenda = useDiseño((s) => s.setAvatarPrenda)
  const guardar = useAsistentes((s) => s.guardar)
  const grupo = useRef<THREE.Group>(null)
  const arrastrando = useRef(false)
  const ultimo = useRef(0)
  const pendiente = useRef<PuntoTatuaje | null>(null)

  const personaje = avatar ?? asistente
  const prenda = tatuajeSel ? personaje?.ropa?.[tatuajeSel] : undefined
  const activo = !!prenda && !pausado

  const guardarPunto = (punto: PuntoTatuaje) => {
    if (!tatuajeSel || !prenda) return
    if (avatar) void setAvatarPrenda(tatuajeSel, prenda.color, { punto })
    else if (asistente) void guardar({ ...asistente, ropa: { ...asistente.ropa, [tatuajeSel]: { ...prenda, punto } } })
  }
  const guardarRef = useRef(guardarPunto)
  useEffect(() => {
    guardarRef.current = guardarPunto
  })

  // Soltar en cualquier parte termina el arrastre: guarda el último punto y devuelve el giro a la cámara.
  useEffect(() => {
    const soltar = () => {
      if (!arrastrando.current) return
      arrastrando.current = false
      girarCamara(true)
      if (pendiente.current) guardarRef.current(pendiente.current)
      pendiente.current = null
    }
    window.addEventListener('pointerup', soltar)
    return () => window.removeEventListener('pointerup', soltar)
  }, [girarCamara])

  const puntoDe = (e: ThreeEvent<PointerEvent>): PuntoTatuaje | null => {
    const marco = grupo.current?.getObjectByName('prendas-raiz')
    if (!e.face || !marco || !personaje) return null
    let parte: ParteTatuaje = 'cuerpo'
    for (let o: THREE.Object3D | null = e.object; o; o = o.parent) {
      if ((PARTES_TATUAJE as string[]).includes(o.name)) {
        parte = o.name as ParteTatuaje
        break
      }
    }
    marco.updateWorldMatrix(true, false)
    const inversa = marco.matrixWorld.clone().invert()
    const p = e.point.clone().applyMatrix4(inversa)
    const n = e.face.normal.clone().transformDirection(e.object.matrixWorld).transformDirection(inversa)
    if (parte !== 'cuerpo') {
      const [x, y] = pivoteParte(parte, anclasDe(personaje))
      p.x -= x
      p.y -= y
    }
    return { parte, p: [redondo(p.x), redondo(p.y), redondo(p.z)], n: [redondo(n.x), redondo(n.y), redondo(n.z)] }
  }

  const colocar = (e: ThreeEvent<PointerEvent>, inicio: boolean) => {
    if (!activo || (!inicio && !arrastrando.current)) return
    e.stopPropagation()
    const punto = puntoDe(e)
    if (!punto) return
    if (inicio) {
      arrastrando.current = true
      girarCamara(false)
    }
    // Arrastrando se guarda a ritmo (IndexedDB/sync); el último punto se guarda al soltar.
    pendiente.current = punto
    const ahora = performance.now()
    if (inicio || ahora - ultimo.current > 80) {
      ultimo.current = ahora
      guardarPunto(punto)
      pendiente.current = null
    }
  }

  return (
    <group
      ref={grupo}
      onPointerDown={activo ? (e) => colocar(e, true) : undefined}
      onPointerMove={activo ? (e) => colocar(e, false) : undefined}
    >
      {children}
    </group>
  )
}
