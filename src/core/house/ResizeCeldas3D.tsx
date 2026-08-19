import { Html } from '@react-three/drei'
import { useT } from '../i18n/useT'
import { cellToWorld } from './walls'

/** Lado por el que crece o encoge un rectángulo de celdas. */
export type LadoRect = 'izq' | 'der' | 'arriba' | 'abajo'

/** Rectángulo de celdas del mapa (corral, tablón de parcelas). */
export interface RectCeldas {
  col: number
  row: number
  ancho: number
  alto: number
}

/**
 * Botones + / − alrededor de un rectángulo de celdas del mapa: cada toque lo
 * agranda o lo encoge UNA cuadrícula por ese lado. Mismo papel que el
 * `RoomCellEditor` de los cuartos, con la diferencia de que aquí la forma es
 * siempre un rectángulo, así que basta un botón por lado (en una esquina no se
 * sabría si quita su fila o su columna).
 *
 * Solo lo montan los editores de infraestructura, así que el `Html` de drei —
 * prohibido en juego— aquí sí vale, igual que en `RoomCellEditor`.
 */
export function ResizeCeldas3D({
  rect,
  y = 1,
  puede,
  onCambio,
}: {
  rect: RectCeldas
  /** Altura de los botones sobre el suelo. */
  y?: number
  /** ¿Cabe crecer/encoger por ese lado? (borde del mapa, otro corral, mínimo 1×1…) */
  puede: (lado: LadoRect, delta: 1 | -1) => boolean
  onCambio: (lado: LadoRect, delta: 1 | -1) => void
}) {
  const t = useT()
  const cCol = rect.col + (rect.ancho - 1) / 2
  const cRow = rect.row + (rect.alto - 1) / 2
  // El '+' va en la celda de FUERA de cada lado; el '−', en la primera de dentro.
  const sitios: { lado: LadoRect; delta: 1 | -1; col: number; row: number }[] = [
    { lado: 'izq', delta: 1, col: rect.col - 1, row: cRow },
    { lado: 'der', delta: 1, col: rect.col + rect.ancho, row: cRow },
    { lado: 'arriba', delta: 1, col: cCol, row: rect.row - 1 },
    { lado: 'abajo', delta: 1, col: cCol, row: rect.row + rect.alto },
    { lado: 'izq', delta: -1, col: rect.col, row: cRow },
    { lado: 'der', delta: -1, col: rect.col + rect.ancho - 1, row: cRow },
    { lado: 'arriba', delta: -1, col: cCol, row: rect.row },
    { lado: 'abajo', delta: -1, col: cCol, row: rect.row + rect.alto - 1 },
  ]

  return (
    <>
      {sitios.map(({ lado, delta, col, row }) => {
        if (!puede(lado, delta)) return null
        const [x, , z] = cellToWorld(col, row)
        const mas = delta === 1
        return (
          <Html
            key={`${lado}${delta}`}
            position={[x, mas ? y : y + 0.35, z]}
            center
            zIndexRange={[30, 0]}
          >
            <button
              type="button"
              onClick={() => onCambio(lado, delta)}
              title={
                mas ? t('infra.agrandar', 'Agrandar por este lado') : t('infra.encoger', 'Encoger por este lado')
              }
              aria-label={
                mas ? t('infra.agrandar', 'Agrandar por este lado') : t('infra.encoger', 'Encoger por este lado')
              }
              className={`ui-panel-glass flex items-center justify-center rounded-md border backdrop-blur-sm transition ${
                mas
                  ? 'h-8 w-8 border-emerald-400/40 text-lg font-bold text-emerald-400 hover:bg-emerald-400/25'
                  : 'h-7 w-7 border-white/20 text-base font-bold text-red-400 hover:bg-red-400/25'
              }`}
            >
              {mas ? '+' : '−'}
            </button>
          </Html>
        )
      })}
    </>
  )
}

/**
 * Celdas de la fila o columna que se añade (delta 1, la de fuera) o se levanta
 * (delta −1, la primera de dentro) por ese lado del rectángulo.
 */
export function bandaDeLado(rect: RectCeldas, lado: LadoRect, delta: 1 | -1): { col: number; row: number }[] {
  const banda: { col: number; row: number }[] = []
  if (lado === 'izq' || lado === 'der') {
    const col =
      lado === 'izq'
        ? delta === 1
          ? rect.col - 1
          : rect.col
        : delta === 1
          ? rect.col + rect.ancho
          : rect.col + rect.ancho - 1
    for (let row = rect.row; row < rect.row + rect.alto; row++) banda.push({ col, row })
    return banda
  }
  const row =
    lado === 'arriba'
      ? delta === 1
        ? rect.row - 1
        : rect.row
      : delta === 1
        ? rect.row + rect.alto
        : rect.row + rect.alto - 1
  for (let col = rect.col; col < rect.col + rect.ancho; col++) banda.push({ col, row })
  return banda
}
