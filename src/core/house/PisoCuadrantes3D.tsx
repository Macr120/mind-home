import { SIZE } from './walls'
import { PisoCelda } from './PisoCelda'
import { CUADRANTES_OFF, type MatPiso } from './pisoSubcelda'

/** Tamaño de loseta de un cuadrante (½ celda con la misma rendija que la loseta entera). */
const TILE_CUADRANTE = SIZE / 2 - 0.12

/**
 * Cuatro losetas de ½ celda centradas en (cx,cz): cada cuadrante usa su override pintado
 * y, si no, el material base de la celda. Sustituye a la loseta entera cuando hay al menos
 * un cuadrante pintado. Mismo sistema para piso exterior, de cuarto o de zona.
 */
export function PisoCuadrantes3D({
  cx,
  cz,
  base,
  overrides,
  libres,
  atenuado = false,
}: {
  cx: number
  cz: number
  base: MatPiso
  /** 4 materiales (NO,NE,SO,SE); null = usar el base. */
  overrides: (MatPiso | null)[]
  /** 4 banderas: false = cuadrante ocupado por cuarto/zona (no se dibuja). Default: todos libres. */
  libres?: boolean[]
  atenuado?: boolean
}) {
  return (
    <>
      {CUADRANTES_OFF.map((o, i) => {
        if (libres && !libres[i]) return null
        const m = overrides[i] ?? base
        if (m.sinPiso) return null
        return (
          <PisoCelda
            key={i}
            lx={cx + o.dc * SIZE}
            lz={cz + o.dr * SIZE}
            tile={TILE_CUADRANTE}
            color={m.color}
            roughness={m.roughness}
            metalness={m.metalness}
            emissive="#000000"
            emissiveIntensity={0}
            pisoConf={m.pisoConf}
            pisoImagen={m.pisoImagen}
            pisoImagenAjuste={m.pisoImagenAjuste}
            formaLoseta={m.forma}
            atenuado={atenuado}
          />
        )
      })}
    </>
  )
}
