import { useRef, useState } from 'react'
import type { Rutina } from '../../data/db'
import { useT } from '../../i18n/useT'
import { ponerPeriodo, rangoConHijas, rangoDe } from '../../metas'
import { BarraMeta } from './BarraMeta'
import { anchoDeRango, isoDeX, xDeIso } from './escala'

/** Mismo anclaje que `BarraMeta`, para que el trazo salga justo donde caerá la barra. */
const ALTO = 16
const TOP = 2

/**
 * La franja del eje que le toca a UNA meta: su barra, o el sitio donde dibujarla.
 *
 * Una meta sin fechas no tenía forma de recibirlas desde aquí — había que bajar a
 * los dos inputs de fecha de la fila y teclearlas, teniendo el eje delante. Ahora
 * se arrastra sobre su franja y ya: es el mismo gesto con el que se traza un
 * evento en la rejilla del calendario, y en cuanto suelta hay barra que mover.
 *
 * Una meta plegada con hijas fechadas pinta la barra de resumen de sus hijas; ahí
 * no se traza, porque tiene periodo que enseñar aunque no sea suyo.
 */
export function PistaMeta({
  metas,
  meta,
  ancho,
  desde,
  pxPerDia,
  armada,
  hoyIso,
  onArmar,
}: {
  metas: Rutina[]
  meta: Rutina
  ancho: number
  desde: Date
  pxPerDia: number
  armada: boolean
  hoyIso: string
  onArmar: (r: Rutina) => void
}) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const [trazo, setTrazo] = useState<{ a: string; b: string } | null>(null)

  const propio = rangoDe(meta)
  const rango = propio ?? rangoConHijas(metas, meta)

  const isoEn = (clientX: number): string | null => {
    const caja = ref.current?.getBoundingClientRect()
    if (!caja) return null
    return isoDeX(desde, clientX - caja.left, pxPerDia)
  }

  const arrancar = (e: React.PointerEvent) => {
    if (rango || e.button !== 0) return
    const iso = isoEn(e.clientX)
    if (!iso) return
    e.preventDefault()
    e.stopPropagation() // el fondo del cronograma también arrastra: ahí desliza el tiempo
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Sin captura el gesto sigue igual; ver `capturarPointer` en BarraMeta.
    }
    setTrazo({ a: iso, b: iso })
  }

  const mover = (e: React.PointerEvent) => {
    if (!trazo) return
    const iso = isoEn(e.clientX)
    if (iso) setTrazo({ ...trazo, b: iso })
  }

  const soltar = () => {
    if (!trazo) return
    setTrazo(null)
    // `ponerPeriodo` ordena los extremos: trazar hacia la izquierda vale igual.
    void ponerPeriodo(meta, trazo.a, trazo.b)
  }

  // El trazo en curso: se pinta igual que la barra que va a nacir, para que soltar
  // no mueva nada de sitio.
  const previo = trazo && (trazo.a <= trazo.b ? { ini: trazo.a, fin: trazo.b } : { ini: trazo.b, fin: trazo.a })

  return (
    <div
      ref={ref}
      onPointerDown={arrancar}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={() => setTrazo(null)}
      title={rango ? undefined : t('cal.cron.trazar', 'Arrastra aquí para darle fechas')}
      style={{ width: ancho }}
      className={`relative ${rango ? '' : 'cursor-crosshair'}`}
    >
      {rango && (
        <BarraMeta
          metas={metas}
          meta={meta}
          rango={rango}
          propia={propio != null}
          desde={desde}
          pxPerDia={pxPerDia}
          armada={armada}
          hoyIso={hoyIso}
          onArmar={onArmar}
        />
      )}

      {previo && (
        <div
          style={{
            left: xDeIso(desde, previo.ini, pxPerDia),
            top: TOP,
            width: Math.max(anchoDeRango(previo.ini, previo.fin, pxPerDia), 3),
            height: ALTO,
          }}
          className="pointer-events-none absolute rounded border border-emerald-400 bg-emerald-500/30"
        />
      )}
    </div>
  )
}
