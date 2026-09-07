import type { FormaLibre, PuntoUV } from '../../data/db'
import { formasLibresRepo, VACIO } from '../../data/repository'
import { useFormaLibre, puntosEfectivos } from '../../state/formaLibreStore'
import { usePlanos } from '../../state/planosStore'
import { COLOR_ARISTA, GROSOR_ARISTA, mundoASvg, uvASvg } from '../../house/planoGeometria'
import { getPisoTipo, esSinPiso, type PisoTipoId } from '../../house/pisos'
import {
  MIN_PUNTOS_CERRAR,
  contornoMuestreado,
  formaCerrada,
  intervalosVanos,
  longitudContorno,
  puntosMundoForma,
  segmentosDeContorno,
  tieneMuro,
  tienePiso,
  type PuntoXZ,
} from '../../house/formasLibre'

/**
 * Capa del croquis con las formas de construcción LIBRE del nivel: piso (área
 * semitransparente), muro (trazo a lo largo del contorno muestreado, con marcas de vanos),
 * vértices de control y puntos medios de la forma seleccionada, el borrador que se está
 * dibujando y el trazo a mano alzada en curso. La geometría sale de `formasLibre.ts`, la
 * misma que usa el render 3D y la colisión.
 *
 * En modo Libre la capa es sorda al puntero (manda el rect de captura de `PlanoCanvas`);
 * fuera de él, tocar una forma salta al modo Libre con esa forma seleccionada.
 */

const COLOR_SEL = '#34d399'
const COLOR_HOVER = '#f59e0b'
const COLOR_PISO_DEFECTO = '#8b8b8b'
const COLOR_VANO: Record<'puerta' | 'ventana', string> = { puerta: '#22c55e', ventana: '#38bdf8' }

type PuntoSvg = { x: number; y: number }

function pathDe(pts: PuntoSvg[], cerrar: boolean): string {
  if (!pts.length) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`
  return cerrar ? `${d} Z` : d
}

/** Punto del contorno (mundo) a la longitud de arco `s` (para ubicar las marcas de vanos). */
function puntoEnArco(contorno: PuntoXZ[], cerrada: boolean, s: number): PuntoXZ | null {
  let acum = 0
  const segs = segmentosDeContorno(contorno, cerrada)
  for (let k = 0; k < segs.length; k++) {
    const seg = segs[k]
    const len = Math.hypot(seg.x2 - seg.x1, seg.z2 - seg.z1)
    if (s <= acum + len || k === segs.length - 1) {
      const t = len < 1e-9 ? 0 : Math.max(0, Math.min(1, (s - acum) / len))
      return { x: seg.x1 + (seg.x2 - seg.x1) * t, z: seg.z1 + (seg.z2 - seg.z1) * t }
    }
    acum += len
  }
  return null
}

export function CapaFormasLibresSvg({
  nivel,
  gridCols,
  gridRows,
  trazo,
}: {
  nivel: number
  gridCols: number
  gridRows: number
  /** Trazo a mano alzada en curso (mundo), lo alimenta el rect de captura del croquis. */
  trazo?: PuntoXZ[] | null
}) {
  const formas = formasLibresRepo.useAll() ?? VACIO
  const edicion = useFormaLibre((s) => s.edicion)
  const borrador = useFormaLibre((s) => s.borrador)
  const hover = useFormaLibre((s) => s.hover)
  const arrastre = useFormaLibre((s) => s.arrastre)
  const modo = usePlanos((s) => s.modo)
  const herramienta = usePlanos((s) => s.herramienta)
  const formaLibreSel = usePlanos((s) => s.formaLibreSel)

  const enLibre = modo === 'libre'
  const editando = enLibre && herramienta !== 'trazar'
  const aSvg = (p: PuntoXZ): PuntoSvg => mundoASvg(p.x, p.z, gridCols, gridRows)

  const renderForma = (f: FormaLibre) => {
    if (f.id == null) return null
    const control = puntosEfectivos(f, edicion)
    const ptsMundo = puntosMundoForma(control, gridCols, gridRows)
    const cerrada = formaCerrada(f) && ptsMundo.length >= MIN_PUNTOS_CERRAR
    const contorno = contornoMuestreado(ptsMundo, cerrada, f.suave)
    if (contorno.length < 2) return null
    const svgPts = contorno.map(aSvg)
    const sel = formaLibreSel === f.id
    const enHover = hover?.tipo === 'forma' && hover.id === f.id

    const conPiso = tienePiso(f.tipo) && contorno.length >= 3 && !esSinPiso(f.pisoTipo)
    const conMuro = tieneMuro(f.tipo)
    const colorPiso =
      f.pisoColor || getPisoTipo((f.pisoTipo ?? null) as PisoTipoId | null)?.color || COLOR_PISO_DEFECTO
    const strokePiso = enHover ? COLOR_HOVER : sel ? COLOR_SEL : colorPiso
    const strokeMuro = enHover ? COLOR_HOVER : sel ? COLOR_SEL : f.muroColor || COLOR_ARISTA.pared

    // Marcas de los vanos sobre el contorno del muro.
    const marcas: { key: string; p: PuntoSvg; color: string }[] = []
    if (conMuro && f.vanos?.length) {
      const L = longitudContorno(contorno, cerrada)
      intervalosVanos(f.vanos, L).forEach((iv, k) => {
        const q = puntoEnArco(contorno, cerrada, iv.sc)
        if (q) marcas.push({ key: `v-${k}`, p: aSvg(q), color: COLOR_VANO[iv.vano.tipo] })
      })
    }

    // Vértices de control y puntos medios de cada tramo (solo la forma seleccionada al editar).
    const handles = sel && editando
    const controlSvg = handles ? control.map((p: PuntoUV) => uvASvg(p.u, p.v)) : []
    const nTramos = handles ? (cerrada ? controlSvg.length : controlSvg.length - 1) : 0
    const verticeActivo = (i: number) =>
      (hover?.tipo === 'vertice' && hover.id === f.id && hover.i === i) ||
      (arrastre?.clase === 'vertice' && arrastre.id === f.id && arrastre.i === i)
    const tramoActivo = (i: number) => hover?.tipo === 'tramo' && hover.id === f.id && hover.i === i

    return (
      <g key={`fl-${f.id}`}>
        {conPiso && (
          <path
            d={pathDe(svgPts, true)}
            fill={colorPiso}
            fillOpacity={0.35}
            stroke={strokePiso}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        )}
        {conMuro && (
          <>
            <path
              d={pathDe(svgPts, cerrada)}
              fill="none"
              stroke={strokeMuro}
              strokeWidth={GROSOR_ARISTA + (sel ? 2 : 0)}
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="none"
            />
            {marcas.map((m) => (
              <circle
                key={m.key}
                cx={m.p.x}
                cy={m.p.y}
                r={4}
                fill={m.color}
                stroke="#ffffff"
                strokeWidth={1}
                pointerEvents="none"
              />
            ))}
          </>
        )}
        {handles && (
          <g pointerEvents="none">
            {controlSvg.map((p, i) => {
              if (i >= nTramos) return null
              const q = controlSvg[(i + 1) % controlSvg.length]
              return (
                <circle
                  key={`m-${i}`}
                  cx={(p.x + q.x) / 2}
                  cy={(p.y + q.y) / 2}
                  r={3.5}
                  fill={tramoActivo(i) ? COLOR_HOVER : COLOR_SEL}
                  opacity={0.7}
                />
              )
            })}
            {controlSvg.map((p, i) => (
              <circle
                key={`c-${i}`}
                cx={p.x}
                cy={p.y}
                r={5}
                fill={verticeActivo(i) ? COLOR_HOVER : '#ffffff'}
                stroke={COLOR_SEL}
                strokeWidth={2}
              />
            ))}
          </g>
        )}
      </g>
    )
  }

  const borradorSvg = borrador ? borrador.map((p) => uvASvg(p.u, p.v)) : []
  const trazoSvg = trazo?.length ? trazo.map(aSvg) : []

  return (
    // Solo dibuja: en modo Libre manda el rect de captura y, fuera de él, las formas no
    // deben robarle los clics a las celdas/aristas de rejilla que quedan debajo (se
    // entra al modo Libre por su chip).
    <g pointerEvents="none">
      {formas.map((f) => (f.nivel === nivel ? renderForma(f) : null))}

      {/* Borrador: la forma que se está dibujando (vértices en UV). */}
      {borradorSvg.length > 0 && (
        <g pointerEvents="none">
          {borradorSvg.length > 1 && (
            <polyline
              points={borradorSvg.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={COLOR_SEL}
              strokeWidth={2}
              strokeDasharray="6 4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {borradorSvg.map((p, i) => (
            <circle
              key={`b-${i}`}
              cx={p.x}
              cy={p.y}
              // El primero crece con 3 o más puntos: «toca aquí para cerrar».
              r={i === 0 && borradorSvg.length >= MIN_PUNTOS_CERRAR ? 6 : 4}
              fill={COLOR_SEL}
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          ))}
        </g>
      )}

      {/* Trazo a mano alzada en curso. */}
      {trazoSvg.length > 1 && (
        <polyline
          points={trazoSvg.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={COLOR_SEL}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          pointerEvents="none"
        />
      )}
    </g>
  )
}
