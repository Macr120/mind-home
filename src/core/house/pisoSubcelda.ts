import { getPisoTipo, esSinPiso, type PisoTipo, type PisoTipoId } from './pisos'
import type { CeldaFormaLoseta } from './formasLoseta'
import type { PisoExteriorCelda } from '../data/db'

/**
 * Piso por SUB-CELDA (cuadrante ½×½): override que se pinta encima del piso base
 * (exterior/cuarto/zona). Un cuadrante de la celda (col,row) se guarda como una celda en
 * coordenadas de ¼: (col±0.25, row±0.25). Reutiliza la tabla `pisosExterior` (col/row son
 * números), sin esquema nuevo ni migración.
 */

/** Offsets (en celdas, ¼) de los 4 cuadrantes respecto al centro de una celda: NO, NE, SO, SE. */
export const CUADRANTES_OFF: { dc: number; dr: number }[] = [
  { dc: -0.25, dr: -0.25 },
  { dc: 0.25, dr: -0.25 },
  { dc: -0.25, dr: 0.25 },
  { dc: 0.25, dr: 0.25 },
]

/**
 * Registros de los 4 cuadrantes de la celda (col,row) según `lookup`, y si se pintó alguno.
 * Cada renderer dibuja 4 losetas de media celda (override del cuadrante con fallback al
 * material base) solo cuando `hayAlguno`; si no, una loseta entera como siempre.
 */
export function cuadrantesDeCelda<T>(
  col: number,
  row: number,
  lookup: (c: number, r: number) => T | undefined,
): { hayAlguno: boolean; recs: (T | undefined)[] } {
  const recs = CUADRANTES_OFF.map((o) => lookup(col + o.dc, row + o.dr))
  return { hayAlguno: recs.some((r) => r !== undefined), recs }
}

/** Material de piso resuelto para pasar a `PisoCelda` (base de celda u override de cuadrante). */
export interface MatPiso {
  /** "Quitar piso": no se dibuja loseta. */
  sinPiso: boolean
  color: string
  roughness: number
  metalness: number
  pisoConf: PisoTipo | null
  pisoImagen?: string
  pisoImagenAjuste: string
  forma?: CeldaFormaLoseta
}

/** Convierte un registro de piso (`pisosExterior`) en material de loseta. `imagenUrl` ya resuelta. */
export function matDeRegistroPiso(
  rec: PisoExteriorCelda,
  imagenUrl: string | undefined,
  colorDefecto: string,
): MatPiso {
  const tipoRaw = (rec.pisoTipo as string | null | undefined) ?? null
  if (esSinPiso(tipoRaw)) {
    return { sinPiso: true, color: colorDefecto, roughness: 0.85, metalness: 0, pisoConf: null, pisoImagenAjuste: 'x1' }
  }
  const conf = tipoRaw ? getPisoTipo(tipoRaw as PisoTipoId) : null
  const imagenActiva = !!(rec.pisoImagenActiva && rec.pisoImagen)
  return {
    sinPiso: false,
    // `|| `(no `??`): un color vacío ("") debe caer al del tipo o al de defecto.
    color: rec.pisoColor || conf?.color || colorDefecto,
    roughness: conf?.roughness ?? 0.85,
    metalness: conf?.metalness ?? 0,
    pisoConf: imagenActiva ? null : conf,
    pisoImagen: imagenActiva ? imagenUrl : undefined,
    pisoImagenAjuste: rec.pisoImagenAjuste ?? 'x1',
    forma: rec.forma,
  }
}
