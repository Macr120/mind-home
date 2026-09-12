import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { NotaAudio } from '../../core/data/db'
import { tecladoVistaStore } from './tecladoVista'

/**
 * Cascada de práctica: las notas caen hacia el teclado y tocan el borde
 * inferior EXACTAMENTE en su instante. Va montada pegada ENCIMA de
 * `TecladoPantalla` y replica su geometría (si cambia el layout del teclado —
 * insets de los botones ‹ ›, gap de teclas — hay que actualizar estas
 * constantes; hay un comentario espejo allá). Las blancas visibles salen de
 * `tecladoVista`, el mismo dato que usa el teclado.
 */

/** Un carril de la cascada: las notas de una pista con su color del proyecto. */
export interface CarrilCascada {
  notas: NotaAudio[]
  color: string
  /** Las pistas que tocas TÚ van en color pleno; el resto, fantasma. */
  tuya: boolean
}

const BLANCAS = [0, 2, 4, 5, 7, 9, 11]
/** semitono de negra → su blanca anfitriona (a cuyo borde derecho se pega). */
const ANFITRIONA: Record<number, number> = { 1: 0, 3: 2, 6: 5, 8: 7, 10: 9 }
/** Botón de octava w-8 (32 px) + gap-1.5 (6 px) a cada lado del teclado. */
const INSET = 38
/** Segundos de antelación visibles (la nota nace arriba y cae). */
const VISTA_S = 3

export function Cascada({
  carriles,
  octava,
  spb,
  pos,
}: {
  carriles: CarrilCascada[]
  /** Tono MIDI de la primera tecla visible (2 octavas + 1 en pantalla). */
  octava: number
  /** Segundos por paso EFECTIVOS (ya escalados por la velocidad elegida). */
  spb: number
  /** Posición actual en pasos (el playhead del motor o la virtual de Espera). */
  pos: () => number
}) {
  const contRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const blancas = useSyncExternalStore(tecladoVistaStore.subscribe, tecladoVistaStore.getSnapshot)
  const props = useRef({ carriles, octava, spb, pos, blancas })
  useEffect(() => {
    props.current = { carriles, octava, spb, pos, blancas }
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
      const { carriles, octava, spb, pos, blancas: n } = props.current

      // Geometría replicada de TecladoPantalla: n blancas flex con gap de 1 px.
      const wb = (W - INSET * 2 - (n - 1)) / n
      const xBlanca = (j: number) => INSET + j * (wb + 1)
      const xDe = (tono: number): { x: number; w: number } | null => {
        const rel = tono - octava
        if (rel < 0 || rel > ((n - 1) / 7) * 12) return null
        const oct = Math.floor(rel / 12)
        const sem = rel - oct * 12
        const iBlanca = BLANCAS.indexOf(sem)
        if (iBlanca >= 0) {
          const j = oct * 7 + iBlanca
          if (j > n - 1) return null
          return { x: xBlanca(j), w: wb }
        }
        const j = oct * 7 + BLANCAS.indexOf(ANFITRIONA[sem])
        if (j >= n - 1) return null // la negra cuelga del borde derecho de su blanca
        return { x: xBlanca(j) + wb * 0.7, w: wb * 0.6 }
      }

      const ahora = pos()
      const pasosVisibles = VISTA_S / spb

      // Líneas de negra (cada 4 pasos) como referencia rítmica tenue.
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      const primera = Math.ceil(ahora / 4) * 4
      for (let p = primera; p <= ahora + pasosVisibles; p += 4) {
        const y = H - ((p - ahora) / pasosVisibles) * H
        ctx.beginPath()
        ctx.moveTo(INSET, y + 0.5)
        ctx.lineTo(W - INSET, y + 0.5)
        ctx.stroke()
      }

      const pintar = (notas: NotaAudio[], color: string, alpha: number) => {
        ctx.globalAlpha = alpha
        ctx.fillStyle = color
        for (const nota of notas) {
          if (nota[0] + nota[1] < ahora - 1 || nota[0] > ahora + pasosVisibles) continue
          const geo = xDe(nota[2])
          if (!geo) continue
          const yFin = H - ((nota[0] - ahora) / pasosVisibles) * H
          const alto = Math.max(4, (nota[1] / pasosVisibles) * H)
          const y = Math.max(-alto, yFin - alto)
          if (y > H) continue
          ctx.beginPath()
          ctx.roundRect(geo.x, y, geo.w, Math.min(alto, H - y), 3)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }
      // El acompañamiento primero (fantasma) y encima lo que tocas tú.
      for (const carril of carriles) if (!carril.tuya) pintar(carril.notas, carril.color, 0.3)
      for (const carril of carriles) if (carril.tuya) pintar(carril.notas, carril.color, 0.95)

      // Línea de llegada: el borde del teclado.
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.moveTo(INSET, H - 0.5)
      ctx.lineTo(W - INSET, H - 0.5)
      ctx.stroke()
    }
    id = window.requestAnimationFrame(dibujar)
    return () => window.cancelAnimationFrame(id)
  }, [])

  return (
    <div ref={contRef} className="relative min-h-0 flex-1 overflow-hidden rounded-t-xl border border-b-0 border-white/10 bg-black/40">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}
