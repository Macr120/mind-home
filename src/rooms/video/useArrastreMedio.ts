import { useEffect, useRef, type RefObject } from 'react'
import { vibrar } from '../../core/audio/vibrar'
import type { PistaId } from '../../core/data/db'
import { capturarPointer, conPulsacionLarga, frenarScrollTactil } from '../../core/ui/comun/arrastre'
import type { ItemArrastre } from './clipsNuevos'
import type { DestinoArrastre, TimelineHandle } from './TimelinePistas'

/**
 * Arrastrar una tarjeta del panel de medios hasta una pista de la timeline.
 * Espejo de `useGestosClips`: todo por refs (fantasma, destino, resaltado),
 * sin setState por movimiento. El puntero se captura en la TARJETA (nunca en
 * el panel: mataría sus botones y su scroll) y nada se desmonta durante el
 * gesto: en Android los eventos táctiles viven en el nodo donde empezó el
 * toque. Con el ratón se arrastra al pasar el umbral; con el dedo, tras la
 * pulsación larga (moverse antes es hacer scroll del panel); el toque corto
 * es el `click` normal de la tarjeta, que añade en el cursor.
 */

export interface PropsArrastreItem {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
  onClickCapture: (e: React.MouseEvent) => void
  style: { touchAction: 'manipulation' }
}

interface Gesto {
  item: ItemArrastre
  pointerId: number
  dur: number
  acepta: PistaId[]
  fantasma: HTMLElement
  destino: DestinoArrastre | null
  soltarFreno: () => void
}

/** Chip que viaja con el puntero; cuelga de `<body>` para quedar sobre la pantalla completa (`fixed z-[60]`). */
function crearFantasma(etiqueta: string): HTMLElement {
  const el = document.createElement('div')
  el.textContent = etiqueta
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText =
    'position:fixed;left:0;top:0;z-index:80;pointer-events:none;max-width:12rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
    'padding:4px 10px;border-radius:9999px;background:rgba(0,0,0,.8);color:#fff;font:600 11px/1.4 system-ui,sans-serif;box-shadow:0 8px 16px rgba(0,0,0,.45)'
  document.body.appendChild(el)
  return el
}

export function useArrastreMedio({
  timelineRef,
  aceptaDe,
  duracionDe,
  etiquetaDe,
  onEmpezar,
  onSoltar,
  onTerminar,
}: {
  timelineRef: RefObject<TimelineHandle | null>
  /** Pistas que aceptan el ítem; vacío = no se puede arrastrar (tope de clips). */
  aceptaDe: (item: ItemArrastre) => PistaId[]
  /** Duración del clip futuro (para la sombra y el imán). */
  duracionDe: (item: ItemArrastre) => number
  etiquetaDe: (item: ItemArrastre) => string
  onEmpezar: (item: ItemArrastre, acepta: PistaId[]) => void
  onSoltar: (item: ItemArrastre, destino: DestinoArrastre) => void
  /** `soltado` = terminó sobre una pista válida. */
  onTerminar: (soltado: boolean) => void
}) {
  const gesto = useRef<Gesto | null>(null)
  const arrastro = useRef(false)

  // Desmontaje a mitad de gesto (cambio de proyecto, cierre del editor): sin fantasma huérfano ni freno colgado.
  useEffect(
    () => () => {
      gesto.current?.fantasma.remove()
      gesto.current?.soltarFreno()
      gesto.current = null
    },
    [],
  )

  const activar = (item: ItemArrastre, el: HTMLElement, pointerId: number, dedo: boolean) => {
    const acepta = aceptaDe(item)
    if (acepta.length === 0) return
    capturarPointer(el, pointerId)
    const soltarFreno = dedo ? frenarScrollTactil() : () => {}
    if (dedo) vibrar(10)
    gesto.current = {
      item,
      pointerId,
      dur: duracionDe(item),
      acepta,
      fantasma: crearFantasma(etiquetaDe(item)),
      destino: null,
      soltarFreno,
    }
    onEmpezar(item, acepta)
  }

  const terminar = (cometer: boolean) => {
    const g = gesto.current
    if (!g) return
    gesto.current = null
    g.soltarFreno()
    g.fantasma.remove()
    timelineRef.current?.pintarDestino(null)
    const soltado = cometer && g.destino != null
    if (soltado && g.destino) onSoltar(g.item, g.destino)
    onTerminar(soltado)
  }

  const propsDe = (item: ItemArrastre): PropsArrastreItem => ({
    onPointerDown: (e) => {
      if (gesto.current || e.button !== 0) return
      if ((e.target as Element).closest('[data-no-arrastre]')) return
      arrastro.current = false
      const el = e.currentTarget as HTMLElement
      const id = e.pointerId
      const dedo = e.pointerType !== 'mouse'
      conPulsacionLarga(e, () => activar(item, el, id, dedo))
    },
    onPointerMove: (e) => {
      const g = gesto.current
      if (!g || g.pointerId !== e.pointerId) return
      e.preventDefault()
      arrastro.current = true
      g.fantasma.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 12}px)`
      g.destino = timelineRef.current?.destinoEn(e.clientX, e.clientY, g.acepta, g.dur) ?? null
      timelineRef.current?.pintarDestino(g.destino ? { ...g.destino, dur: g.dur } : null)
    },
    onPointerUp: (e) => {
      const g = gesto.current
      if (!g || g.pointerId !== e.pointerId) return
      // El destino se decide donde se SUELTA: un gesto de un solo movimiento (el que activa) no tendría destino.
      g.destino = timelineRef.current?.destinoEn(e.clientX, e.clientY, g.acepta, g.dur) ?? null
      terminar(true)
    },
    onPointerCancel: (e) => {
      if (gesto.current?.pointerId === e.pointerId) terminar(false)
    },
    onClickCapture: (e) => {
      // Click parásito tras un arrastre: que no añada nada.
      if (arrastro.current) {
        arrastro.current = false
        e.stopPropagation()
        e.preventDefault()
      }
    },
    style: { touchAction: 'manipulation' },
  })

  return { propsDe }
}
