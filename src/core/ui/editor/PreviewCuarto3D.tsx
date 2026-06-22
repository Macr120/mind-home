import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Room3D } from '../../house/Room3D'
import { useLayout } from '../../state/layoutStore'
import { useDiseño } from '../../state/disenoStore'
import { getCuarto } from '../../state/cuartosStore'
import { SIZE, footprintBounds, FOOTPRINT_DEFAULT } from '../../house/walls'
import { useT } from '../../i18n/useT'

/**
 * Vista previa 3D en vivo del cuarto en edición. Reutiliza `Room3D` (modo
 * `preview`) leyendo los mismos stores, así cada cambio de muros, puertas, piso,
 * color o techo se refleja al instante. Girable con el mouse (OrbitControls).
 */
export function PreviewCuarto3D({ roomId }: { roomId: string }) {
  const t = useT()
  const [verTecho, setVerTecho] = useState(false)
  const footprints = useLayout((s) => s.footprints)
  const roomColors = useDiseño((s) => s.roomColors)
  const room = getCuarto(roomId)
  if (!room) return null

  const fp = footprints[roomId] ?? FOOTPRINT_DEFAULT
  const bounds = footprintBounds(fp)
  const W = bounds.w * SIZE
  const H = bounds.h * SIZE
  const radio = Math.max(W, H)
  const dist = radio * 1.45 + 4
  const color = roomColors[roomId] ?? room.color

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
      <div className="h-48 w-full">
        <Canvas
          shadows
          frameloop="demand"
          dpr={[1, 1.5]}
          camera={{ position: [dist, dist * 0.85, dist], fov: 35, near: 0.1, far: 200 }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[6, 10, 6]} intensity={1.1} castShadow />
          <directionalLight position={[-6, 4, -4]} intensity={0.4} />
          <Room3D id={roomId} position={[0, 0, 0]} color={color} preview forzarTecho={verTecho} />
          <OrbitControls
            enablePan={false}
            enableDamping
            target={[0, 1, 0]}
            minDistance={radio * 0.7}
            maxDistance={radio * 3 + 8}
          />
        </Canvas>
      </div>

      <button
        type="button"
        onClick={() => setVerTecho((v) => !v)}
        className={[
          'absolute right-2 top-2 rounded-lg border px-2 py-1 text-[11px] font-semibold backdrop-blur-sm transition',
          verTecho
            ? 'border-amber-400/60 bg-amber-400/20 text-amber-100'
            : 'border-white/15 bg-black/40 text-white/70 hover:bg-white/15',
        ].join(' ')}
        title={t('preview.techo', 'Mostrar/ocultar techo')}
      >
        🏠 {verTecho ? t('preview.techoOn', 'Techo') : t('preview.techoOff', 'Sin techo')}
      </button>

      <span className="pointer-events-none absolute bottom-1.5 left-0 right-0 text-center text-[10px] text-white/35">
        {t('preview.girar', 'Arrastra para girar · rueda para acercar')}
      </span>
    </div>
  )
}
