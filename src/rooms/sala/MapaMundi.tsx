import { useEffect, useMemo, useRef, useState } from 'react'
import { useBaseClara } from '../../core/ui/useBaseUI'
import { colorDe, tierraFill, tierraStroke } from './coloresMapa'
import type { EstadoMundo } from './estadosMundo'
import { desproyectar, MUNDO_H, MUNDO_W, PAISES_MUNDO, proyectar } from './mundo'

export interface PinMapa {
  id: number
  lat: number
  lng: number
  visitado: boolean
}

interface Props {
  pines: PinMapa[]
  /** Polilínea de una ruta (paradas en orden). */
  ruta?: { lat: number; lng: number }[]
  seleccionado?: number | null
  /** Si se define, un toque/click sobre el mapa (sin arrastrar) lo dispara. */
  onClickMapa?: (lat: number, lng: number) => void
  onClickPin?: (id: number) => void
  /** Rellena los países que contienen pines visitados. */
  resaltarPaises?: boolean
  /** Dibuja las fronteras de estados/provincias (se cargan bajo demanda). */
  verEstados?: boolean
  className?: string
}

// Recorte vertical del lienzo: de lat 84 (norte de Groenlandia) a lat -58 (Cabo de Hornos).
const Y_TOP = ((90 - 84) / 180) * MUNDO_H
const Y_BOT = ((90 + 58) / 180) * MUNDO_H
const VISTA0 = { x: 0, y: Y_TOP, w: MUNDO_W, h: Y_BOT - Y_TOP }
const W_MIN = MUNDO_W / 16 // zoom máximo 16×

type Vista = typeof VISTA0

function clampVista(v: Vista): Vista {
  const w = Math.min(Math.max(v.w, W_MIN), MUNDO_W)
  const h = w * (VISTA0.h / VISTA0.w)
  return {
    w,
    h,
    x: Math.min(Math.max(v.x, 0), MUNDO_W - w),
    y: Math.min(Math.max(v.y, Y_TOP), Y_BOT - h),
  }
}

/** Mapamundi SVG con zoom (rueda/pellizco/botones), arrastre y pines. */
export function MapaMundi({
  pines,
  ruta,
  seleccionado,
  onClickMapa,
  onClickPin,
  resaltarPaises,
  verEstados,
  className = '',
}: Props) {
  const [vista, setVista] = useState<Vista>(VISTA0)
  const claro = useBaseClara()
  const contRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  // Punteros activos (para arrastre y pellizco) y desplazamiento acumulado (click vs. arrastre).
  const punteros = useRef(new Map<number, { x: number; y: number }>())
  const arrastre = useRef(0)
  const [paisesConPin, setPaisesConPin] = useState<Set<string>>(new Set())
  const [estados, setEstados] = useState<EstadoMundo[] | null>(null)

  // Los contornos de estados pesan ~700 KB: se traen solo la primera vez que se piden.
  useEffect(() => {
    if (!verEstados || estados) return
    let activo = true
    void import('./estadosMundo').then((m) => {
      if (activo) setEstados(m.ESTADOS_MUNDO)
    })
    return () => {
      activo = false
    }
  }, [verEstados, estados])

  const escala = () => {
    const rect = contRef.current?.getBoundingClientRect()
    return vista.w / Math.max(rect?.width ?? 1, 1)
  }

  const zoomHacia = (factor: number, clientX?: number, clientY?: number) => {
    const rect = contRef.current?.getBoundingClientRect()
    setVista((v) => {
      const px = rect && clientX != null ? (clientX - rect.left) / rect.width : 0.5
      const py = rect && clientY != null ? (clientY - rect.top) / rect.height : 0.5
      const w = Math.min(Math.max(v.w / factor, W_MIN), MUNDO_W)
      const h = w * (VISTA0.h / VISTA0.w)
      return clampVista({ w, h, x: v.x + (v.w - w) * px, y: v.y + (v.h - h) * py })
    })
  }

  // La rueda necesita preventDefault (React la registra como pasiva).
  useEffect(() => {
    const el = contRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomHacia(e.deltaY < 0 ? 1.3 : 1 / 1.3, e.clientX, e.clientY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    try {
      contRef.current?.setPointerCapture(e.pointerId)
    } catch {
      /* puntero ya liberado */
    }
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (punteros.current.size === 1) arrastre.current = 0
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const previo = punteros.current.get(e.pointerId)
    if (!previo) return
    const actual = { x: e.clientX, y: e.clientY }

    if (punteros.current.size === 2) {
      // Pellizco: zoom según el cambio de distancia entre los dos dedos.
      const otro = [...punteros.current.entries()].find(([id]) => id !== e.pointerId)?.[1]
      if (otro) {
        const dPrev = Math.hypot(previo.x - otro.x, previo.y - otro.y)
        const dAct = Math.hypot(actual.x - otro.x, actual.y - otro.y)
        if (dPrev > 0) zoomHacia(dAct / dPrev, (actual.x + otro.x) / 2, (actual.y + otro.y) / 2)
      }
    } else {
      const k = escala()
      const dx = (actual.x - previo.x) * k
      const dy = (actual.y - previo.y) * k
      arrastre.current += Math.abs(actual.x - previo.x) + Math.abs(actual.y - previo.y)
      setVista((v) => clampVista({ ...v, x: v.x - dx, y: v.y - dy }))
    }
    punteros.current.set(e.pointerId, actual)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    // Ignora pointerups que no iniciaron sobre el mapa (p. ej. burbujeo de un pin).
    if (!punteros.current.delete(e.pointerId)) return
    // Toque sin arrastre = click sobre el mapa.
    if (arrastre.current < 6 && onClickMapa && punteros.current.size === 0) {
      const rect = contRef.current?.getBoundingClientRect()
      if (rect) {
        const x = vista.x + ((e.clientX - rect.left) / rect.width) * vista.w
        const y = vista.y + ((e.clientY - rect.top) / rect.height) * vista.h
        const { lat, lng } = desproyectar(x, y)
        onClickMapa(Math.round(lat * 1e4) / 1e4, Math.round(lng * 1e4) / 1e4)
      }
    }
  }

  // Qué países contienen un pin visitado (point-in-fill nativo del SVG).
  useEffect(() => {
    if (!resaltarPaises || !svgRef.current) return
    const visitados = pines.filter((p) => p.visitado).map((p) => proyectar(p.lat, p.lng))
    const set = new Set<string>()
    try {
      for (const path of svgRef.current.querySelectorAll<SVGPathElement>('path[data-pais]')) {
        for (const pt of visitados) {
          if (path.isPointInFill(new DOMPoint(pt.x, pt.y))) {
            set.add(path.dataset.pais!)
            break
          }
        }
      }
    } catch {
      /* navegador sin isPointInFill: sin resaltado */
    }
    setPaisesConPin(set)
  }, [resaltarPaises, pines])

  // Qué estados contienen un pin visitado. Se prueba con un path fuera de
  // pantalla para no depender de cuáles están montados; la caja de cada estado
  // descarta casi todos antes del point-in-fill.
  const [estadosConPin, setEstadosConPin] = useState<Set<number>>(new Set())
  useEffect(() => {
    if (!resaltarPaises || !estados || !svgRef.current) return
    const visitados = pines.filter((p) => p.visitado).map((p) => proyectar(p.lat, p.lng))
    const set = new Set<number>()
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    tmp.setAttribute('fill', 'none')
    svgRef.current.appendChild(tmp)
    try {
      estados.forEach((e, i) => {
        for (const pt of visitados) {
          if (pt.x < e.b[0] || pt.x > e.b[2] || pt.y < e.b[1] || pt.y > e.b[3]) continue
          tmp.setAttribute('d', e.d)
          if (tmp.isPointInFill(new DOMPoint(pt.x, pt.y))) {
            set.add(i)
            break
          }
        }
      })
    } catch {
      /* navegador sin isPointInFill: sin pintado */
    } finally {
      tmp.remove()
    }
    setEstadosConPin(set)
  }, [resaltarPaises, estados, pines])

  const paths = useMemo(
    () =>
      // Los ids de mundo.ts pueden repetirse (Natural Earth marca con "-99" los
      // territorios en disputa), así que la identidad de cada path lleva el índice.
      PAISES_MUNDO.map((p, i) => {
        const pid = `${p.id}:${i}`
        const color = paisesConPin.has(pid) ? colorDe(p.nombre, claro) : null
        return (
          <path
            key={pid}
            data-pais={pid}
            d={p.d}
            fill={color ?? tierraFill(claro)}
            // Con los estados visibles el país baja de tono y deja lucir al estado.
            fillOpacity={color ? (verEstados ? 0.16 : 0.33) : 1}
            stroke={color ?? tierraStroke(claro)}
            strokeOpacity={color ? 0.6 : 1}
          />
        )
      }),
    [paisesConPin, verEstados, claro],
  )

  // Fronteras de estados visibles. La vista se cuantiza a pasos de 100 unidades
  // para no refiltrar los ~3900 contornos en cada frame del arrastre.
  const Q = 100
  const qx0 = Math.floor(vista.x / Q) * Q - Q
  const qy0 = Math.floor(vista.y / Q) * Q - Q
  const qx1 = Math.ceil((vista.x + vista.w) / Q) * Q + Q
  const qy1 = Math.ceil((vista.y + vista.h) / Q) * Q + Q
  const pathsEstados = useMemo(() => {
    if (!verEstados || !estados) return null
    return estados.map((e, i) => {
      if (!(e.b[2] >= qx0 && e.b[0] <= qx1 && e.b[3] >= qy0 && e.b[1] <= qy1)) return null
      const color = estadosConPin.has(i) ? colorDe(`${e.pais}:${e.nombre}`, claro) : null
      return (
        <path
          key={i}
          d={e.d}
          fill={color ?? 'none'}
          fillOpacity={color ? 0.45 : undefined}
          stroke={color ?? undefined}
          strokeOpacity={color ? 0.9 : undefined}
        />
      )
    })
  }, [verEstados, estados, estadosConPin, qx0, qy0, qx1, qy1, claro])

  const puntosRuta = (ruta ?? []).map((p) => proyectar(p.lat, p.lng))

  // Posición de un punto proyectado como % del recuadro visible.
  const pct = (x: number, y: number) => ({
    left: `${((x - vista.x) / vista.w) * 100}%`,
    top: `${((y - vista.y) / vista.h) * 100}%`,
  })

  return (
    <div
      ref={contRef}
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-black/30 select-none ${
        onClickMapa ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
      } ${className}`}
      style={{ aspectRatio: `${VISTA0.w} / ${VISTA0.h}`, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={(e) => punteros.current.delete(e.pointerId)}
    >
      <svg
        ref={svgRef}
        viewBox={`${vista.x} ${vista.y} ${vista.w} ${vista.h}`}
        className="h-full w-full"
        strokeWidth={vista.w / 1500}
      >
        {paths}
        {pathsEstados && (
          <g fill="none" className="pointer-events-none stroke-white/25" strokeWidth={vista.w / 2800}>
            {pathsEstados}
          </g>
        )}
        {puntosRuta.length > 1 && (
          <polyline
            points={puntosRuta.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={claro ? '#0d9488' : '#2dd4bf'}
            strokeWidth={vista.w / 350}
            strokeDasharray={`${vista.w / 120} ${vista.w / 240}`}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Números de parada de la ruta */}
      {puntosRuta.map((p, i) => (
        <span
          key={i}
          className="ui-noche absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-black"
          style={pct(p.x, p.y)}
        >
          {i + 1}
        </span>
      ))}

      {/* Pines */}
      {pines.map((pin) => {
        const { x, y } = proyectar(pin.lat, pin.lng)
        const sel = seleccionado === pin.id
        return (
          <button
            key={pin.id}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onClickPin?.(pin.id)}
            className={`absolute -translate-x-1/2 -translate-y-full transition-transform ${
              sel ? 'z-10 scale-150' : 'hover:scale-125'
            }`}
            style={pct(x, y)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              className={claro ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]' : 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'}
            >
              <path
                d="M12 1.5a7.5 7.5 0 0 0-7.5 7.5c0 5.3 7.5 13.5 7.5 13.5S19.5 14.3 19.5 9A7.5 7.5 0 0 0 12 1.5Z"
                className={pin.visitado ? 'fill-teal-400' : 'fill-amber-400/90'}
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="1"
              />
              <circle cx="12" cy="9" r="2.8" fill="rgba(0,0,0,0.55)" />
            </svg>
          </button>
        )
      })}

      {/* Controles de zoom */}
      <div className="ui-noche absolute end-2 top-2 flex flex-col gap-1">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => zoomHacia(1.5)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-lg text-white/80 backdrop-blur hover:bg-black/80"
        >
          +
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => zoomHacia(1 / 1.5)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-lg text-white/80 backdrop-blur hover:bg-black/80"
        >
          −
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setVista(VISTA0)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-xs text-white/80 backdrop-blur hover:bg-black/80"
        >
          ⤢
        </button>
      </div>
    </div>
  )
}
