import { useLayout } from '../state/layoutStore'
import { usePlanos } from '../state/planosStore'
import { useHouse } from '../state/houseStore'
import { useCuartos } from '../state/cuartosStore'
import {
  centroCuarto3D,
  footprintBounds,
  nivelBaseY,
  cellId,
  SIZE,
  WALL_H,
  FOOTPRINT_DEFAULT,
} from './walls'

/**
 * Selección de techos en 3D (capa Techos): un plano invisible y clicable sobre el techo de
 * cada cuarto del nivel. Al clicar se selecciona el cuarto (su techo se resalta en amarillo)
 * para editar material/forma en el panel y mostrar los +/− de extender/retraer.
 */
export function PlanoTechos3DEditor() {
  const planosActivo = usePlanos((s) => s.activo)
  const capa = usePlanos((s) => s.capa)
  const nivel = usePlanos((s) => s.nivel)
  const seleccion = usePlanos((s) => s.seleccion)
  const setSeleccion = usePlanos((s) => s.setSeleccion)
  const apilado = !useHouse((s) => s.explotado)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const niveles = useLayout((s) => s.niveles)
  const alturaTechoPorNivel = useLayout((s) => s.alturaTechoPorNivel)
  const cuartos = useCuartos((s) => s.cuartos)

  // Selección de techos en 3D incluso con el techo 🏠 apagado (como el piso): el plano
  // clicable flota sobre el alto de los muros para poder elegir el techo y editarlo.
  if (!planosActivo || capa !== 'techos') return null
  const alturas = alturaTechoPorNivel.get(nivel)

  return (
    <>
      {cuartos
        .filter((r) => placed[r.id] && (niveles[r.id] ?? 0) === nivel && cells[r.id])
        .map((room) => {
          const anchor = cells[room.id]
          const fp = footprints[room.id] ?? FOOTPRINT_DEFAULT
          const [x, , z] = centroCuarto3D(anchor, fp)
          const bounds = footprintBounds(fp)
          const altura = alturas?.get(cellId(anchor.col, anchor.row)) || WALL_H
          const y = nivelBaseY(nivel, apilado) + altura + 0.6
          const sel = seleccion?.tipo === 'cuarto' && seleccion.roomId === room.id
          return (
            <mesh
              key={room.id}
              position={[x, y, z]}
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={(e) => {
                e.stopPropagation()
                setSeleccion({ tipo: 'cuarto', roomId: room.id })
              }}
              onPointerOver={(e) => {
                e.stopPropagation()
                document.body.style.cursor = 'pointer'
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'default'
              }}
            >
              <planeGeometry args={[bounds.w * SIZE, bounds.h * SIZE]} />
              <meshBasicMaterial color="#fde047" transparent opacity={sel ? 0.5 : 0} depthWrite={false} />
            </mesh>
          )
        })}
    </>
  )
}
