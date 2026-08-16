import { Canvas } from '@react-three/fiber'
import { OrbitControls, Bounds } from '@react-three/drei'
import { VACIO, murosLibresRepo } from '../../data/repository'
import { useLayout } from '../../state/layoutStore'
import { useEditorUi } from '../../state/editorUiStore'
import { MuroLibre3DItem } from '../../house/MurosLibres3D'
import { segmentosMundoMuroLibre } from '../../house/murosLibre'
import { IconoOjo } from '../editor/IconoOjo'
import { BotonPreviewClaro, claseOverlayBtn, claseFondoPreview } from '../comun/BotonPreviewClaro'
import { useT } from '../../i18n/useT'

/**
 * Vista previa 3D del muro/puerta/ventana independiente seleccionado en el editor de
 * mapa. Reutiliza el mismo render de la escena (`MuroLibre3DItem`), centrado en el
 * origen y encuadrado con `Bounds`. Girable con el mouse (OrbitControls).
 */
export function PreviewMuroLibre3D({ muroId, onOcultar }: { muroId: number; onOcultar?: () => void }) {
  const t = useT()
  const muros = murosLibresRepo.useAll() ?? VACIO
  const claro = useEditorUi((s) => s.previewClaro)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const m = muros.find((x) => x.id === muroId)
  if (!m) return null

  // Centro del muro en mundo para llevarlo al origen (la sombra queda debajo).
  const segs = segmentosMundoMuroLibre(m, gridCols, gridRows)
  let cx = 0
  let cz = 0
  if (segs.length) {
    let n = 0
    for (const s of segs) {
      cx += s.x1 + s.x2
      cz += s.z1 + s.z2
      n += 2
    }
    cx /= n
    cz /= n
  }

  return (
    <div
      className={`sticky top-0 z-10 overflow-hidden rounded-xl border border-white/10 ${claseFondoPreview(claro)}`}
    >
      <div className="absolute start-2 top-2 z-10 flex flex-col gap-1">
        {onOcultar && (
          <button
            type="button"
            onClick={onOcultar}
            title={t('planos.preview.ocultar', 'Ocultar previsualización 3D')}
            className={`rounded-lg border p-1.5 transition ${claseOverlayBtn(claro)}`}
          >
            <IconoOjo off />
          </button>
        )}
        <BotonPreviewClaro />
      </div>
      <div className="h-56 w-full">
        <Canvas
          key={muroId}
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [5, 4, 5], fov: 32, near: 0.1, far: 100 }}
        >
          <ambientLight intensity={0.85} />
          <directionalLight position={[4, 8, 5]} intensity={1.1} castShadow />
          <directionalLight position={[-4, 3, -3]} intensity={0.35} />
          <Bounds fit clip observe margin={1.3}>
            <group position={[-cx, 0, -cz]}>
              <MuroLibre3DItem m={m} gridCols={gridCols} gridRows={gridRows} yBase={0} preview />
            </group>
          </Bounds>
          {/* Piso de apoyo para la sombra */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <circleGeometry args={[5, 48]} />
            <meshStandardMaterial color={claro ? '#e5e7eb' : '#1a1d25'} />
          </mesh>
          <OrbitControls
            makeDefault
            enablePan={false}
            enableDamping
            minDistance={2}
            maxDistance={16}
          />
        </Canvas>
      </div>
      <span
        className={`pointer-events-none absolute bottom-1.5 start-0 end-0 text-center text-[10px] ${
          claro ? 'text-black/45' : 'text-[#ffffff]/35'
        }`}
      >
        {t('preview.girar', 'Arrastra para girar · rueda para acercar')}
      </span>
    </div>
  )
}
