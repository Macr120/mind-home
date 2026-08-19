import { useRef, useState } from 'react'
import type { NodoPlan, PlanMeta } from '../../data/db'
import { useT } from '../../i18n/useT'
import { fecharNodoPlan, nodoFechado, nodoIncoherente, rangoDeNodo } from '../../planMeta'
import { anchoDeRango, isoDeX, isoMasDias, xDeIso } from './escala'

/** Mismo anclaje que `BarraMeta`: la propuesta cae justo donde caería la barra real. */
const ALTO = 16
const TOP = 2
/** Asas de los extremos, para estirar. */
const ASA = 6

type Modo = 'mover' | 'ini' | 'fin'

/**
 * La franja de UN nodo propuesto: su barra fantasma sobre el mismo eje que las metas
 * reales, para poder compararlos sin cambiar de pantalla.
 *
 * Y para darle fechas: un nodo sin fechar no pinta barra, sino sitio para trazarla
 * arrastrando — el mismo gesto que `PistaMeta` para una meta real. Ya fechado, la
 * barra se corre entera o se estira por sus extremos. Escribir en cada `pointermove`
 * machacaría IndexedDB, así que mientras se arrastra solo se pinta.
 *
 * La trama diagonal no es decoración: `BarraMeta` ya usa `border-dashed` para la
 * barra de resumen de una meta plegada, así que solo punteado se confundiría con
 * una meta de verdad.
 */
export function PistaPlan({
  plan,
  nodo,
  color,
  ancho,
  desde,
  pxPerDia,
  editable,
}: {
  plan: PlanMeta
  nodo: NodoPlan
  color: string
  ancho: number
  desde: Date
  pxPerDia: number
  /** El plan sigue siendo propuesta: aceptado, lo que se mueve son las metas reales. */
  editable: boolean
}) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const [trazo, setTrazo] = useState<{ a: string; b: string } | null>(null)
  const [gesto, setGesto] = useState<{ modo: Modo; ini: string; fin: string } | null>(null)

  const guardado = rangoDeNodo(plan, nodo)
  const rango = gesto ?? guardado
  const incoherente = nodoIncoherente(plan, nodo)

  const isoEn = (clientX: number): string | null => {
    const caja = ref.current?.getBoundingClientRect()
    if (!caja) return null
    return isoDeX(desde, clientX - caja.left, pxPerDia)
  }

  // --- Trazar el periodo de un nodo que aún no lo tiene ---

  const arrancarTrazo = (e: React.PointerEvent) => {
    if (!editable || guardado || e.button !== 0) return
    const iso = isoEn(e.clientX)
    if (!iso) return
    e.preventDefault()
    e.stopPropagation() // el fondo del cronograma también arrastra: ahí desliza el tiempo
    capturar(e)
    setTrazo({ a: iso, b: iso })
  }

  const moverTrazo = (e: React.PointerEvent) => {
    if (!trazo) return
    const iso = isoEn(e.clientX)
    if (iso) setTrazo({ ...trazo, b: iso })
  }

  const soltarTrazo = () => {
    if (!trazo) return
    setTrazo(null)
    // `fecharNodoPlan` ordena los extremos: trazar hacia la izquierda vale igual.
    void fecharNodoPlan(plan, nodo.id, trazo.a, trazo.b)
  }

  // --- Mover o estirar la barra ya fechada ---

  const arrancarGesto = (e: React.PointerEvent, modo: Modo) => {
    if (!editable || !guardado) return
    e.preventDefault()
    e.stopPropagation()
    capturar(e)
    setGesto({ modo, ...guardado })
  }

  const moverGesto = (e: React.PointerEvent) => {
    if (!gesto || !guardado) return
    const iso = isoEn(e.clientX)
    if (!iso) return
    if (gesto.modo === 'mover') {
      // El puntero manda el inicio; la duración se conserva (el nodo la lleva en días).
      const dias = nodoFechado(nodo) ? nodo.fin - nodo.ini : 0
      setGesto({ ...gesto, ini: iso, fin: isoMasDias(iso, dias) })
    } else if (gesto.modo === 'ini') setGesto({ ...gesto, ini: iso })
    else setGesto({ ...gesto, fin: iso })
  }

  const soltarGesto = () => {
    if (!gesto) return
    const { ini, fin } = gesto
    setGesto(null)
    if (guardado && ini === guardado.ini && fin === guardado.fin) return
    void fecharNodoPlan(plan, nodo.id, ini, fin)
  }

  // El trazo en curso: se pinta igual que la barra que va a nacer, para que soltar
  // no mueva nada de sitio.
  const previo = trazo && (trazo.a <= trazo.b ? { ini: trazo.a, fin: trazo.b } : { ini: trazo.b, fin: trazo.a })
  const puedeTrazar = editable && !guardado

  return (
    <div
      ref={ref}
      onPointerDown={arrancarTrazo}
      onPointerMove={moverTrazo}
      onPointerUp={soltarTrazo}
      onPointerCancel={() => setTrazo(null)}
      title={puedeTrazar ? t('cal.cron.trazar', 'Arrastra aquí para darle fechas') : undefined}
      style={{ width: ancho }}
      className={`relative ${puedeTrazar ? 'cursor-crosshair' : ''}`}
    >
      {rango && (
        <div
          data-barra
          onPointerDown={(e) => arrancarGesto(e, 'mover')}
          onPointerMove={moverGesto}
          onPointerUp={soltarGesto}
          onPointerCancel={() => setGesto(null)}
          title={[
            nodo.nombre,
            `${rango.ini} → ${rango.fin}`,
            t('cal.plan.fantasma', 'Propuesta: todavía no está en tu cronograma'),
            incoherente ? t('cal.plan.incoherente', 'Se sale del periodo de su fase') : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          style={{
            left: xDeIso(desde, rango.ini, pxPerDia),
            top: TOP,
            width: Math.max(anchoDeRango(rango.ini, rango.fin, pxPerDia), 3),
            height: ALTO,
            borderColor: incoherente ? '#fbbf24' : `color-mix(in srgb, ${color} 60%, transparent)`,
            background: `repeating-linear-gradient(45deg, color-mix(in srgb, ${color} 20%, transparent) 0 4px, transparent 4px 8px)`,
          }}
          className={`absolute overflow-hidden rounded border border-dashed px-1 ${
            editable ? 'cursor-grab touch-none active:cursor-grabbing' : 'pointer-events-none'
          }`}
        >
          <span className="truncate text-[9px] leading-4" style={{ color: `color-mix(in srgb, ${color} 87%, transparent)` }}>
            {nodo.nombre}
          </span>

          {editable && (
            <>
              <span
                onPointerDown={(e) => arrancarGesto(e, 'ini')}
                style={{ width: ASA }}
                className="absolute inset-y-0 start-0 cursor-ew-resize"
              />
              <span
                onPointerDown={(e) => arrancarGesto(e, 'fin')}
                style={{ width: ASA }}
                className="absolute inset-y-0 end-0 cursor-ew-resize"
              />
            </>
          )}
        </div>
      )}

      {previo && (
        <div
          style={{
            left: xDeIso(desde, previo.ini, pxPerDia),
            top: TOP,
            width: Math.max(anchoDeRango(previo.ini, previo.fin, pxPerDia), 3),
            height: ALTO,
          }}
          className="pointer-events-none absolute rounded border border-plan bg-plan/30"
        />
      )}
    </div>
  )
}

/**
 * `setPointerCapture` puede lanzar si el pointerId ya no está activo; sin capturar
 * el gesto sigue igual (mismo caso que `capturarPointer` en `BarraMeta`).
 */
function capturar(e: React.PointerEvent) {
  try {
    e.currentTarget.setPointerCapture(e.pointerId)
  } catch {
    // Intencional: el gesto continúa, solo sin captura.
  }
}
