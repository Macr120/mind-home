import { useEffect, useRef } from 'react'
import type { NotaAudio } from '../../core/data/db'
import type { CarrilCascada } from './Cascada'
import { dibujarVoz, type Entrada, figurasDe, lineasAdicionalesDe, radioCabeza } from './notacion'

/**
 * Partitura de práctica: el pentagrama doble (sol y fa) con las notas
 * desplazándose de derecha a izquierda; cada nota cruza la línea vertical de
 * «ahora» EXACTAMENTE en su instante. Es la vista alternativa a `Cascada`
 * dentro de la práctica (mismos carriles, mismo reloj); va igual de pegada
 * ENCIMA de `TecladoPantalla`.
 *
 * La geometría diatónica replica la de la partitura de `PianoRoll.tsx`
 * (comentario espejo allá): grados por semitono, sostenidos con ♯ compartiendo
 * grado, C4 (grado 35) en línea adicional entre ambos pentagramas.
 */

const GRADO_DE_SEMITONO = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]
const ES_SOSTENIDO = [false, true, false, true, false, false, true, false, true, false, true, false]
const diatDe = (midi: number) => Math.floor(midi / 12) * 7 + GRADO_DE_SEMITONO[((midi % 12) + 12) % 12]
/** Grados de las 10 líneas (sol arriba, fa abajo), todos impares. */
const LINEAS_PENTAGRAMA = [45, 43, 41, 39, 37, 33, 31, 29, 27, 25]

/** Dónde cae la línea de «ahora» (a la derecha quedan ~4 s de porvenir). */
const NOW_X = 72
const VISTA_S = 4

export function PartituraPractica({
  carriles,
  spb,
  pos,
}: {
  carriles: CarrilCascada[]
  /** Segundos por paso EFECTIVOS (ya escalados por la velocidad elegida). */
  spb: number
  /** Posición actual en pasos (el playhead del motor o la virtual de Espera). */
  pos: () => number
}) {
  const contRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const props = useRef({ carriles, spb, pos })
  useEffect(() => {
    props.current = { carriles, spb, pos }
  })

  useEffect(() => {
    let id = 0
    const dibujar = () => {
      id = window.requestAnimationFrame(dibujar)
      const canvas = canvasRef.current
      const cont = contRef.current
      if (!canvas || !cont) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = cont.clientWidth
      const H = cont.clientHeight
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr)
        canvas.height = Math.round(H * dpr)
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const { carriles, spb, pos } = props.current

      // Medio-espacio por grado, adaptado al alto (el rango 25..45 debe caber holgado).
      const MEDIO = Math.max(4.5, Math.min(9, H / 34))
      const yDe = (g: number) => H / 2 + (35 - g) * MEDIO
      const ahora = pos()
      const pasosVisibles = VISTA_S / spb
      const pxPaso = (W - NOW_X) / pasosVisibles
      const xDe = (paso: number) => NOW_X + (paso - ahora) * pxPaso

      // Líneas de negra (cada 4 pasos) como referencia rítmica tenue.
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      for (let p = Math.ceil((ahora - NOW_X / pxPaso) / 4) * 4; p <= ahora + pasosVisibles; p += 4) {
        const x = xDe(p)
        if (x < 8) continue
        ctx.beginPath()
        ctx.moveTo(x + 0.5, yDe(46))
        ctx.lineTo(x + 0.5, yDe(24))
        ctx.stroke()
      }

      // Los dos pentagramas, de lado a lado (cruzan la zona de las claves).
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      for (const linea of LINEAS_PENTAGRAMA) {
        const y = yDe(linea)
        ctx.beginPath()
        ctx.moveTo(8, y + 0.5)
        ctx.lineTo(W, y + 0.5)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = `${Math.round(MEDIO * 7.3)}px serif`
      ctx.fillText('𝄞', 10, yDe(41))
      ctx.font = `${Math.round(MEDIO * 6)}px serif`
      ctx.fillText('𝄢', 14, yDe(30))

      const pintar = (notas: NotaAudio[], color: string, alpha: number) => {
        ctx.globalAlpha = alpha
        ctx.fillStyle = color
        ctx.strokeStyle = color
        const rx = radioCabeza(MEDIO)
        // Un pulso de margen: las barras de corcheas no lo cruzan, así que un
        // grupo cortado por el borde se pinta entero.
        const margen = 4 * pxPaso
        const entradas: Entrada[] = []
        const sostenidos: { x: number; y: number }[] = []
        for (const nota of notas) {
          if (nota[0] + nota[1] < ahora - (NOW_X + margen) / pxPaso || nota[0] > ahora + pasosVisibles + 4) continue
          const g = diatDe(nota[2])
          const x = xDe(nota[0])
          const y = yDe(g)
          if (x + nota[1] * pxPaso < 40 - margen) continue
          // Banda tenue con la duración real; encima, las figuras (ligadas si son
          // varias), con la cabeza centrada en su instante: cruza «ahora» al sonar.
          ctx.globalAlpha = alpha * 0.25
          ctx.fillRect(x, y - 1, Math.max(3, nota[1] * pxPaso - 2), 2)
          const adicionales = lineasAdicionalesDe(g)
          let xAnterior: number | undefined
          for (const tramo of figurasDe(nota[0], nota[1])) {
            const xt = xDe(tramo.paso) + MEDIO * 0.2
            if (xt - rx > W + margen) break
            // Líneas adicionales: grados impares entre el pentagrama y la nota (C4 incluido).
            ctx.globalAlpha = alpha * 0.7
            for (const l of adicionales) {
              const yl = yDe(l)
              ctx.beginPath()
              ctx.moveTo(xt - rx - MEDIO * 0.6, yl + 0.5)
              ctx.lineTo(xt + rx + MEDIO * 0.6, yl + 0.5)
              ctx.stroke()
            }
            entradas.push({ paso: tramo.paso, figura: tramo.figura, x: xt, y, diat: g, xAnterior })
            xAnterior = xt
          }
          if (ES_SOSTENIDO[((nota[2] % 12) + 12) % 12]) sostenidos.push({ x: x - MEDIO * 2.1, y: y + MEDIO * 0.8 })
        }
        ctx.globalAlpha = alpha
        dibujarVoz(ctx, entradas, MEDIO)
        ctx.font = `${Math.round(MEDIO * 2.2)}px system-ui`
        for (const s of sostenidos) ctx.fillText('♯', s.x, s.y)
        ctx.globalAlpha = 1
      }
      // El acompañamiento primero (fantasma) y encima lo que tocas tú.
      for (const carril of carriles) if (!carril.tuya) pintar(carril.notas, carril.color, 0.3)
      for (const carril of carriles) if (carril.tuya) pintar(carril.notas, carril.color, 0.95)

      // La línea de «ahora»: la nota se toca al cruzarla.
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.moveTo(NOW_X + 0.5, yDe(47))
      ctx.lineTo(NOW_X + 0.5, yDe(23))
      ctx.stroke()
    }
    id = window.requestAnimationFrame(dibujar)
    return () => window.cancelAnimationFrame(id)
  }, [])

  return (
    <div
      ref={contRef}
      className="relative min-h-0 flex-1 overflow-hidden rounded-t-xl border border-b-0 border-white/10 bg-black/40"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}
