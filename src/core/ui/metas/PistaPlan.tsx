import { useT } from '../../i18n/useT'
import { anchoDeRango, xDeIso } from './escala'

/** Mismo anclaje que `BarraMeta`: la propuesta cae justo donde caería la barra real. */
const ALTO = 16
const TOP = 2

/**
 * La franja de UN nodo propuesto: su barra fantasma sobre el mismo eje que las
 * metas reales, para poder compararlos sin cambiar de pantalla.
 *
 * Sin gestos ni escrituras: un plan se acepta entero o se descarta, así que aquí no
 * hay nada que mover ni dónde guardarlo (para cambiar el arranque está reanclar).
 *
 * La trama diagonal no es decoración: `BarraMeta` ya usa `border-dashed` para la
 * barra de resumen de una meta plegada, así que solo punteado se confundiría con
 * una meta de verdad.
 */
export function PistaPlan({
  rango,
  nombre,
  color,
  ancho,
  desde,
  pxPerDia,
}: {
  rango: { ini: string; fin: string }
  nombre: string
  color: string
  ancho: number
  desde: Date
  pxPerDia: number
}) {
  const t = useT()
  return (
    <div style={{ width: ancho }} className="relative">
      <div
        title={t('cal.plan.fantasma', 'Propuesta: todavía no está en tu cronograma')}
        style={{
          left: xDeIso(desde, rango.ini, pxPerDia),
          top: TOP,
          width: Math.max(anchoDeRango(rango.ini, rango.fin, pxPerDia), 3),
          height: ALTO,
          borderColor: `${color}99`,
          background: `repeating-linear-gradient(45deg, ${color}33 0 4px, transparent 4px 8px)`,
        }}
        className="pointer-events-none absolute overflow-hidden rounded border border-dashed px-1"
      >
        <span className="truncate text-[9px] leading-4" style={{ color: `${color}dd` }}>
          {nombre}
        </span>
      </div>
    </div>
  )
}
