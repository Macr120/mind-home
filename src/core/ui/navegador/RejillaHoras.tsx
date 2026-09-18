import { useT } from '../../i18n/useT'
import { formatoDuracion } from './util'

/**
 * Rejilla día de la semana × hora del día: cada celda se tiñe según los
 * segundos navegados en esa hora (a más, más opaca). Sin librería: divs.
 */
export function RejillaHoras({ datos, color }: { datos: number[][]; color: string }) {
  const t = useT()
  const max = Math.max(1, ...datos.flat())
  const dias = [
    t('nav.dia.lun', 'L'),
    t('nav.dia.mar', 'M'),
    t('nav.dia.mie', 'X'),
    t('nav.dia.jue', 'J'),
    t('nav.dia.vie', 'V'),
    t('nav.dia.sab', 'S'),
    t('nav.dia.dom', 'D'),
  ]
  return (
    <div className="grid gap-px" style={{ gridTemplateColumns: 'auto repeat(24, minmax(0, 1fr))' }} aria-hidden>
      <span />
      {[0, 6, 12, 18].map((h, i) => (
        <span key={h} className="text-[9px] text-white/35" style={{ gridColumn: `${h + 2} / span ${i === 3 ? 6 : 6}` }}>
          {h}h
        </span>
      ))}
      {datos.map((fila, d) => (
        <RejillaFila key={d} etiqueta={dias[d]} fila={fila} max={max} color={color} />
      ))}
    </div>
  )
}

function RejillaFila({ etiqueta, fila, max, color }: { etiqueta: string; fila: number[]; max: number; color: string }) {
  const t = useT()
  return (
    <>
      <span className="pe-1 text-[9px] leading-3 text-white/35">{etiqueta}</span>
      {fila.map((seg, h) => (
        <span
          key={h}
          className="h-3 rounded-[2px] bg-white/5"
          title={seg > 0 ? `${etiqueta} ${h}:00 · ${formatoDuracion(seg, t)}` : undefined}
          style={seg > 0 ? { backgroundColor: color, opacity: 0.25 + 0.75 * (seg / max) } : undefined}
        />
      ))}
    </>
  )
}
