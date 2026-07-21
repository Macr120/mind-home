import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Room3D } from '../../house/Room3D'
import { useLayout, SIN_OCUPACION } from '../../state/layoutStore'
import { useDiseño } from '../../state/disenoStore'
import { getCuarto } from '../../state/cuartosStore'
import {
  SIZE,
  WALL_H,
  roomEdges,
  footprintBounds,
  FOOTPRINT_DEFAULT,
  type Cell,
  type SideKey,
} from '../../house/walls'
import { IconoOjo } from './IconoOjo'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

/**
 * Vista previa 3D en vivo del cuarto en edición. Reutiliza `Room3D` (modo
 * `preview`) leyendo los mismos stores, así cada cambio de muros, puertas, piso,
 * color o techo se refleja al instante. Girable con el mouse (OrbitControls).
 *
 * Con `arista`, la cámara se enfoca desde fuera en esa pared (que `Room3D` ya
 * resalta en amarillo al estar seleccionada): así sirve de previsualización del
 * muro/puerta/ventana de cuarto elegido en el editor de mapa.
 */
export function PreviewCuarto3D({
  roomId,
  arista,
  onOcultar,
}: {
  roomId: string
  arista?: { off: Cell; side: SideKey }
  /** Si se pasa, muestra un botón de ojo para ocultar el previsualizador. */
  onOcultar?: () => void
}) {
  const t = useT()
  const [verTecho, setVerTecho] = useState(false)
  const footprints = useLayout((s) => s.footprints)
  const cells = useLayout((s) => s.cells)
  const niveles = useLayout((s) => s.niveles)
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
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

  // Enfoque opcional en una arista: cámara fuera de la pared, mirándola de frente.
  const anchor = cells[roomId]
  const edge =
    arista && anchor
      ? roomEdges(anchor, fp, ocupadoPorNivel.get(niveles[roomId] ?? 0) ?? SIN_OCUPACION).find(
          (e) => e.off.col === arista.off.col && e.off.row === arista.off.row && e.side === arista.side,
        )
      : undefined
  const nx = edge ? (edge.side === 'E' ? 1 : edge.side === 'O' ? -1 : 0) : 0
  const nz = edge ? (edge.side === 'S' ? 1 : edge.side === 'N' ? -1 : 0) : 0
  const fdist = SIZE * 1.15 + 4
  const camPos: [number, number, number] = edge
    ? [edge.cx + nx * fdist, WALL_H * 0.7 + fdist * 0.45, edge.cz + nz * fdist]
    : [dist, dist * 0.85, dist]
  const target: [number, number, number] = edge ? [edge.cx, WALL_H / 2, edge.cz] : [0, 1, 0]

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
      <div className="h-48 w-full">
        <Canvas
          key={arista ? `${roomId}:${arista.off.col},${arista.off.row},${arista.side}` : roomId}
          shadows
          frameloop="demand"
          dpr={[1, 1.5]}
          camera={{ position: camPos, fov: 35, near: 0.1, far: 200 }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[6, 10, 6]} intensity={1.1} castShadow />
          <directionalLight position={[-6, 4, -4]} intensity={0.4} />
          <Room3D id={roomId} position={[0, 0, 0]} color={color} preview forzarTecho={verTecho} />
          <OrbitControls
            enablePan={false}
            enableDamping
            target={target}
            minDistance={edge ? 2 : radio * 0.7}
            maxDistance={radio * 3 + 8}
          />
        </Canvas>
      </div>

      {onOcultar && (
        <button
          type="button"
          onClick={onOcultar}
          title={t('planos.preview.ocultar', 'Ocultar previsualización 3D')}
          className="ui-hud absolute left-2 top-2 rounded-lg border border-white/15 p-1.5 text-white/70 transition hover:bg-white/15"
        >
          <IconoOjo off />
        </button>
      )}

      <button
        type="button"
        onClick={() => setVerTecho((v) => !v)}
        className={[
          'absolute right-2 top-2 rounded-lg border px-2 py-1 text-[11px] font-semibold backdrop-blur-sm transition',
          verTecho
            ? 'border-amber-400/60 bg-amber-400/20 text-amber-400'
            : 'ui-hud border-white/15 text-white/70 hover:bg-white/15',
        ].join(' ')}
        title={t('preview.techo', 'Mostrar/ocultar techo')}
      >
        <Icono nombre="casa" /> {verTecho ? t('preview.techoOn', 'Techo') : t('preview.techoOff', 'Sin techo')}
      </button>

      <span className="pointer-events-none absolute bottom-1.5 left-0 right-0 text-center text-[10px] text-white/35">
        {t('preview.girar', 'Arrastra para girar · rueda para acercar')}
      </span>
    </div>
  )
}
