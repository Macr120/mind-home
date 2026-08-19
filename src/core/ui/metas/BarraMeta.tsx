import { useState } from 'react'
import type { Rutina } from '../../data/db'
import { useT } from '../../i18n/useT'
import { ponerPeriodo, progresoDe, rangoConHijas, vencida } from '../../metas'
import { colorDe } from '../coloresRutina'
import { ROJO, VERDE } from '../../../rooms/_shared/acento'
import { anchoDeRango, diasDeDx, isoMasDias, xDeIso } from './escala'

/** Alto de la barra y a qué altura de la fila se ancla (arriba, junto al nombre). */
const ALTO = 16
const TOP = 2
/** Asas de los extremos, para estirar. */
const ASA = 6
/** Por debajo de esto el nombre no cabe dentro y se pinta a la derecha. */
const ANCHO_MIN_TEXTO = 44

type Modo = 'mover' | 'ini' | 'fin'

/**
 * `setPointerCapture` puede lanzar si el pointerId ya no está activo (el usuario
 * soltó justo entre el evento y el handler, o algún caso raro de navegador/OS):
 * sin capturar el gesto igual sigue, así que no vale la pena dejar que un fallo
 * aquí tumbe el `pointerdown` entero.
 */
function capturarPointer(e: React.PointerEvent) {
  try {
    e.currentTarget.setPointerCapture(e.pointerId)
  } catch {
    // Intencional: el gesto continúa igual, solo sin captura.
  }
}

/**
 * La barra de una meta en el cronograma: su periodo, su nombre y su avance.
 *
 * Mover corre el periodo entero conservando la duración; las asas de los extremos
 * estiran. Mientras se arrastra solo se pinta; se escribe al soltar, porque una
 * escritura por cada `pointermove` machacaría IndexedDB y repintaría el calendario
 * entero.
 *
 * Ya no hay periodos "imposibles" que rechazar: sin escalera de peldaños, una meta
 * puede durar lo que quiera aunque no coincida con su madre. Si una sub-meta se
 * sale del periodo de la suya, eso es información — se ve — no un error.
 *
 * `data-barra` la marca para que el paneo del fondo (arrastrar el cronograma para
 * deslizar el tiempo) sepa que aquí empieza otra cosa y no debe arrancar.
 */
export function BarraMeta({
  metas,
  meta,
  rango,
  propia,
  desde,
  pxPerDia,
  armada,
  hoyIso,
  onArmar,
}: {
  metas: Rutina[]
  meta: Rutina
  rango: { ini: string; fin: string }
  /** ¿El rango es suyo, o el resumen de sus hijas mientras está plegada? */
  propia: boolean
  desde: Date
  pxPerDia: number
  armada: boolean
  hoyIso: string
  onArmar: (r: Rutina) => void
}) {
  const t = useT()
  const [gesto, setGesto] = useState<{ modo: Modo; x0: number; dias: number } | null>(null)

  // El periodo que se está viendo: el guardado, o el que dibuja el gesto en curso.
  const previo = ((): { ini: string; fin: string } => {
    if (!gesto) return rango
    const d = gesto.dias
    if (gesto.modo === 'mover') return { ini: isoMasDias(rango.ini, d), fin: isoMasDias(rango.fin, d) }
    if (gesto.modo === 'ini') return { ini: isoMasDias(rango.ini, d), fin: rango.fin }
    return { ini: rango.ini, fin: isoMasDias(rango.fin, d) }
  })()

  const arrancar = (e: React.PointerEvent, modo: Modo) => {
    // La barra de resumen no se arrastra: sus fechas son de sus hijas, y moverla
    // tendría que repartir el cambio entre ellas sin saber cómo.
    if (!propia) return
    e.preventDefault()
    e.stopPropagation()
    capturarPointer(e)
    setGesto({ modo, x0: e.clientX, dias: 0 })
  }

  const mover = (e: React.PointerEvent) => {
    if (!gesto) return
    setGesto({ ...gesto, dias: diasDeDx(e.clientX - gesto.x0, pxPerDia) })
  }

  const soltar = async () => {
    if (!gesto) return
    const { ini: i, fin: f } = previo
    setGesto(null)
    if (i === rango.ini && f === rango.fin) return
    await ponerPeriodo(meta, i, f)
  }

  const progreso = progresoDe(metas, meta)
  const tarde = vencida(meta, hoyIso, metas)
  const color = meta.completada ? VERDE : tarde ? ROJO : colorDe(meta)

  const izquierda = xDeIso(desde, previo.ini, pxPerDia)
  const ancho = Math.max(anchoDeRango(previo.ini, previo.fin, pxPerDia), 3)
  const dentro = ancho >= ANCHO_MIN_TEXTO

  const resumen = !propia && rangoConHijas(metas, meta)
  const titulo = [
    meta.nombre,
    `${previo.ini} → ${previo.fin}`,
    progreso > 0 ? t('cal.cron.avance', '{n}% hecho').replace('{n}', String(Math.round(progreso * 100))) : null,
    resumen ? t('cal.cron.resumen', 'Resume el periodo de sus sub-metas') : null,
    tarde ? t('cal.cron.vencida', 'Venció sin completarse') : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <div
        data-barra
        title={titulo}
        onPointerDown={(e) => arrancar(e, 'mover')}
        onPointerMove={mover}
        onPointerUp={() => void soltar()}
        onPointerCancel={() => setGesto(null)}
        onClick={() => !gesto && onArmar(meta)}
        style={{
          left: izquierda,
          top: TOP,
          width: ancho,
          height: ALTO,
          // La de resumen va hueca (solo contorno): así se distingue de un periodo
          // de verdad y no compite con las barras de sus propias hijas.
          background: propia ? `color-mix(in srgb, ${color} 20%, transparent)` : 'transparent',
          borderColor: `${color}${propia ? 'aa' : '66'}`,
        }}
        className={`absolute overflow-hidden rounded border ${propia ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer border-dashed'} ${
          armada ? 'ring-2 ring-white/80' : ''
        }`}
      >
        {/* El avance: relleno sólido del mismo color, de izquierda a derecha. */}
        {progreso > 0 && (
          <span
            style={{ width: `${progreso * 100}%`, background: `${color}${meta.completada ? 'cc' : '88'}` }}
            className="absolute inset-y-0 start-0"
          />
        )}

        {dentro && (
          <span
            className={`pointer-events-none absolute inset-y-0 start-1.5 end-1.5 flex items-center truncate text-[10px] font-medium leading-none text-white/90 ${
              meta.completada ? 'line-through opacity-60' : ''
            }`}
          >
            {meta.nombre}
          </span>
        )}

        {/* La barra de resumen no se estira: ver `arrancar`. */}
        {propia && (
          <>
            <span
              onPointerDown={(e) => arrancar(e, 'ini')}
              style={{ width: ASA }}
              className="absolute inset-y-0 start-0 cursor-ew-resize"
            />
            <span
              onPointerDown={(e) => arrancar(e, 'fin')}
              style={{ width: ASA }}
              className="absolute inset-y-0 end-0 cursor-ew-resize"
            />
          </>
        )}
      </div>

      {/* Barra demasiado corta para su nombre: va fuera, pegada a su derecha. */}
      {!dentro && (
        <span
          style={{ left: izquierda + ancho + 4, top: TOP }}
          className={`pointer-events-none absolute flex items-center whitespace-nowrap text-[10px] leading-none text-white/45 ${
            meta.completada ? 'line-through opacity-60' : ''
          }`}
        >
          <span style={{ height: ALTO }} className="flex items-center">
            {meta.nombre}
          </span>
        </span>
      )}
    </>
  )
}
