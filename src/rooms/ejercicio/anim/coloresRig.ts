import type { Avatar } from '../../../core/state/disenoStore'
import { PRENDA_COLOR_DEFAULT, type PrendaId, type Ropa } from '../../../core/house/apariencia'
import { COLOR_FORMA } from '../../../core/chat/mascotas'

/**
 * El rig del visor no reutiliza los meshes de `Prendas` para el cuerpo (sus
 * mangas/perneras pivotan en hombro y cadera y no seguirían a un codo o una
 * rodilla): pinta cada segmento del color de la prenda que lo cubre. Capa,
 * bufanda, corbata, mochila, la campana de falda/vestido y `ropaCustom` no se
 * dibujan. Las prendas de cabeza sí se reutilizan tal cual (`ropaCabeza`).
 */
export interface ColoresRig {
  piel: string
  torso: string
  brazo: string
  antebrazo: string
  muslo: string
  pantorrilla: string
  /** Calzado (botas/tenis); sin él no se dibuja el pie. */
  pie?: string
  /** Guantes; sin ellos no se dibuja la mano. */
  mano?: string
  /** Botas: la caña cubre media pantorrilla. */
  botas: boolean
}

const PRENDAS_CABEZA: PrendaId[] = ['lentes', 'sombrero', 'gorra', 'gorroChef']

/** Solo las prendas que van fijas a la cabeza (giran con el cuello). */
export function ropaCabeza(ropa: Ropa | undefined): Ropa | undefined {
  if (!ropa) return undefined
  const r: Ropa = {}
  for (const id of PRENDAS_CABEZA) if (ropa[id]) r[id] = ropa[id]
  return r
}

/**
 * Colores del rig a partir del avatar. Con forma integrada (mago, gato…) o
 * .glb el visor usa igualmente el box-man: la piel toma el color de la forma y
 * el resto los colores base, que siempre existen en `Avatar`.
 */
export function coloresRig(av: Avatar): ColoresRig {
  const c = (id: PrendaId): string | undefined => {
    const p = av.ropa?.[id]
    return p ? p.color || PRENDA_COLOR_DEFAULT[id] : undefined
  }
  const piel = av.forma ? av.formaColor || COLOR_FORMA[av.forma] : av.cabeza
  const abrigo = c('chamarra') ?? c('camisa')
  return {
    piel,
    torso: abrigo ?? c('vestido') ?? c('playera') ?? av.torso,
    brazo: abrigo ?? c('playera') ?? piel,
    antebrazo: abrigo ?? piel,
    muslo: c('pantalon') ?? c('shorts') ?? c('falda') ?? c('vestido') ?? av.piernas,
    pantorrilla: c('pantalon') ?? av.piernas,
    pie: c('botas') ?? c('tenis'),
    mano: c('guantes'),
    botas: !!av.ropa?.botas,
  }
}
