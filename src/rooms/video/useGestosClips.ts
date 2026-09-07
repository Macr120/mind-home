import { useRef, type RefObject } from 'react'
import { vibrar } from '../../core/audio/vibrar'
import type { ClipVideo, MedioVideo } from '../../core/data/db'
import { capturarPointer, conPulsacionLarga, frenarScrollTactil } from '../../core/ui/comun/arrastre'
import { IMAN_PX, MAX_ESCENA, MIN_CLIP } from './constantes'
import { clipsDe, fin, huecoDe, imantar, medioIdDe, puntosIman, tieneMedioTemporal } from './modelo'
import { sonidoFabrica } from './sonidos'

/**
 * Los gestos sobre los clips de la timeline: tocar selecciona; con el ratón,
 * arrastrar mueve al instante; con el dedo, solo tras una pulsación larga
 * (moverse antes es hacer scroll). Las asas recortan. Durante el gesto todo va
 * por ref (`transform`, `left/width`, burbuja) sin setState; se comete UNA vez
 * al soltar. El puntero lo captura el clip o el asa, nunca el scroller (eso
 * mataría botones y scroll: ver `core/ui/comun/arrastre.tsx`).
 */

export type LadoAsa = 'ini' | 'fin'
export const redondearDecima = (s: number) => Math.round(s * 10) / 10

/** Hasta dónde puede ir cada asa (segundos absolutos). */
function limitesRecorte(
  clips: ClipVideo[],
  clip: ClipVideo,
  lado: LadoAsa,
  medio?: MedioVideo,
): { min: number; max: number } {
  const ini = clip.inicio
  const fn = fin(clip)
  const h = huecoDe(clips, clip)
  const desde = clip.desde ?? 0
  const temporal = tieneMedioTemporal(clip)
  const bucle = clip.pista === 'musica' && clip.bucle
  const durMedio =
    medio?.duracion ?? (clip.pista === 'sfx' && clip.fuente.tipo === 'fabrica' ? sonidoFabrica(clip.fuente.clave)?.duracion : undefined)
  if (lado === 'ini') {
    return {
      min: Math.max(h.min, temporal && !bucle ? ini - desde : 0, clip.pista === 'video' ? fn - MAX_ESCENA : 0),
      max: fn - MIN_CLIP,
    }
  }
  const topeMedio = temporal && durMedio && !bucle ? ini + (durMedio - desde) : Infinity
  return { min: ini + MIN_CLIP, max: Math.min(h.max, topeMedio, clip.pista === 'video' ? ini + MAX_ESCENA : Infinity) }
}

type Gesto =
  | {
      tipo: 'mover'
      id: string
      el: HTMLElement
      x0: number
      clip: ClipVideo
      hueco: { min: number; max: number }
      candidatos: number[]
      principal: boolean
      orden: string[]
      vivo: number
      soltarFreno: () => void
    }
  | {
      tipo: 'recortar'
      id: string
      lado: LadoAsa
      el: HTMLElement
      x0: number
      clip: ClipVideo
      limites: { min: number; max: number }
      candidatos: number[]
      vivo: number
    }

export interface PropsGestoClip {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: () => void
  onClickCapture: (e: React.MouseEvent) => void
}

export function useGestosClips({
  clips,
  medios,
  pxPorSeg,
  iman,
  tiempoRef,
  elementos,
  guiaRef,
  fmt,
  onSeleccion,
  onMover,
  onReordenar,
  onRecortar,
  marcarInteraccion,
}: {
  clips: ClipVideo[]
  medios: Map<number, MedioVideo>
  pxPorSeg: number
  iman: boolean
  tiempoRef: RefObject<number>
  /** Elemento DOM de cada clip (lo registra `ClipVista`). */
  elementos: RefObject<Map<string, HTMLElement>>
  guiaRef: RefObject<HTMLDivElement | null>
  fmt: (seg: number) => string
  /** `abrirPanel`: el toque abre el panel del clip (en móvil, el cajón); un arrastre no. */
  onSeleccion: (id: string, abrirPanel: boolean) => void
  onMover: (id: string, inicio: number) => void
  onReordenar: (ordenIds: string[]) => void
  onRecortar: (id: string, lado: LadoAsa, seg: number) => void
  marcarInteraccion: () => void
}) {
  const gesto = useRef<Gesto | null>(null)
  const arrastro = useRef(false)
  const umbralSeg = IMAN_PX / pxPorSeg
  const durDe = (id: string) => clips.find((c) => c.id === id)?.duracion ?? 0
  const inicioEnOrden = (orden: string[], id: string) => {
    let t = 0
    for (const k of orden) {
      if (k === id) return t
      t += durDe(k)
    }
    return t
  }

  const pintarGuia = (seg: number | null) => {
    const g = guiaRef.current
    if (!g) return
    if (seg == null) g.hidden = true
    else {
      g.hidden = false
      g.style.transform = `translateX(${seg * pxPorSeg}px)`
    }
  }
  const burbuja = (el: HTMLElement, texto: string | null) => {
    const b = el.querySelector<HTMLElement>('[data-burbuja]')
    if (!b) return
    if (texto == null) b.hidden = true
    else {
      b.hidden = false
      b.textContent = texto
    }
  }
  const guiaImantada = (bordes: number[], candidatos: number[]) => {
    for (const b of bordes) for (const c of candidatos) if (Math.abs(c - b) < 1e-6) return b
    return null
  }

  const activarMover = (clip: ClipVideo, el: HTMLElement, pointerId: number, x0: number, dedo: boolean) => {
    capturarPointer(el, pointerId)
    const soltarFreno = dedo ? frenarScrollTactil() : () => {}
    if (dedo) vibrar(10)
    // Realce por estilo inline: una clase la pisaría el re-render de la selección.
    el.style.zIndex = '20'
    el.style.boxShadow = '0 8px 16px rgba(0,0,0,0.45)'
    gesto.current = {
      tipo: 'mover',
      id: clip.id,
      el,
      x0,
      clip,
      hueco: huecoDe(clips, clip),
      candidatos: iman ? puntosIman(clips, clip.id, tiempoRef.current) : [],
      principal: clip.pista === 'video',
      orden: clipsDe(clips, 'video').map((c) => c.id),
      vivo: clip.inicio,
      soltarFreno,
    }
    onSeleccion(clip.id, false)
    marcarInteraccion()
  }

  const moverLibre = (g: Extract<Gesto, { tipo: 'mover' }>, dx: number) => {
    let nuevo = g.clip.inicio + dx
    if (g.candidatos.length) nuevo += imantar([nuevo, nuevo + g.clip.duracion], g.candidatos, umbralSeg)
    nuevo = Math.max(g.hueco.min, Math.min(g.hueco.max - g.clip.duracion, nuevo))
    pintarGuia(g.candidatos.length ? guiaImantada([nuevo, nuevo + g.clip.duracion], g.candidatos) : null)
    g.vivo = redondearDecima(Math.max(0, nuevo))
    g.el.style.transform = `translateX(${(g.vivo - g.clip.inicio) * pxPorSeg}px)`
    burbuja(g.el, fmt(g.vivo))
  }

  /** Pista principal: intercambio cuando el CENTRO del clip cruza el centro del vecino (como CapCut). */
  const moverPrincipal = (g: Extract<Gesto, { tipo: 'mover' }>, dx: number) => {
    const dur = g.clip.duracion
    const centro = g.clip.inicio + dx + dur / 2
    let i = g.orden.indexOf(g.id)
    for (let n = 0; n < 40; n++) {
      const der = g.orden[i + 1]
      const izq = g.orden[i - 1]
      if (der && centro > inicioEnOrden(g.orden, der) + durDe(der) / 2) {
        ;[g.orden[i], g.orden[i + 1]] = [g.orden[i + 1], g.orden[i]]
        i++
      } else if (izq && centro < inicioEnOrden(g.orden, izq) + durDe(izq) / 2) {
        ;[g.orden[i], g.orden[i - 1]] = [g.orden[i - 1], g.orden[i]]
        i--
      } else break
    }
    for (const id of g.orden) {
      if (id === g.id) continue
      const el = elementos.current.get(id)
      const c = clips.find((k) => k.id === id)
      if (el && c) el.style.transform = `translateX(${(inicioEnOrden(g.orden, id) - c.inicio) * pxPorSeg}px)`
    }
    g.el.style.transform = `translateX(${Math.max(-g.clip.inicio, dx) * pxPorSeg}px)`
    g.vivo = inicioEnOrden(g.orden, g.id)
    burbuja(g.el, fmt(g.vivo))
  }

  const recortar = (g: Extract<Gesto, { tipo: 'recortar' }>, dx: number) => {
    const ini0 = g.clip.inicio
    const fin0 = fin(g.clip)
    let borde = (g.lado === 'ini' ? ini0 : fin0) + dx
    if (g.candidatos.length) borde += imantar([borde], g.candidatos, umbralSeg)
    borde = Math.max(g.limites.min, Math.min(g.limites.max, borde))
    pintarGuia(g.candidatos.length ? guiaImantada([borde], g.candidatos) : null)
    g.vivo = redondearDecima(borde)
    if (g.lado === 'ini') {
      g.el.style.left = `${g.vivo * pxPorSeg}px`
      g.el.style.width = `${Math.max(12, (fin0 - g.vivo) * pxPorSeg)}px`
    } else g.el.style.width = `${Math.max(12, (g.vivo - ini0) * pxPorSeg)}px`
    if (g.clip.pista === 'video') {
      // Ripple en vivo: los siguientes de la pista principal se corren.
      const delta = g.lado === 'ini' ? -(g.vivo - ini0) : g.vivo - fin0
      for (const s of clipsDe(clips, 'video')) {
        if (s.inicio <= ini0) continue
        const el = elementos.current.get(s.id)
        if (el) el.style.transform = `translateX(${delta * pxPorSeg}px)`
      }
    }
    burbuja(g.el, `${redondearDecima(g.lado === 'ini' ? fin0 - g.vivo : g.vivo - ini0)}s`)
  }

  const terminar = (cometer: boolean) => {
    const g = gesto.current
    if (!g) return
    gesto.current = null
    if (g.tipo === 'mover') g.soltarFreno()
    // Devolver a cada clip la posición de sus props: React solo reescribe `left`/`width`
    // si cambian, así que dejarlos vacíos perdería los clips que no se tocaron.
    for (const c of clips) {
      const el = elementos.current.get(c.id)
      if (!el) continue
      el.style.transform = ''
      el.style.left = `${c.inicio * pxPorSeg}px`
      el.style.width = `${Math.max(12, c.duracion * pxPorSeg)}px`
    }
    g.el.style.zIndex = ''
    g.el.style.boxShadow = ''
    burbuja(g.el, null)
    pintarGuia(null)
    if (!cometer) return
    if (g.tipo === 'mover') {
      if (g.principal) {
        if (g.orden.join() !== clipsDe(clips, 'video').map((c) => c.id).join()) onReordenar(g.orden)
      } else if (g.vivo !== g.clip.inicio) onMover(g.id, g.vivo)
    } else if (g.vivo !== (g.lado === 'ini' ? g.clip.inicio : fin(g.clip))) onRecortar(g.id, g.lado, g.vivo)
  }

  const propsGesto = (clip: ClipVideo): PropsGestoClip => ({
    onPointerDown: (e) => {
      if (gesto.current || e.button !== 0) return
      if ((e.target as Element).closest('[data-asa], button')) return
      arrastro.current = false
      const el = e.currentTarget as HTMLElement
      const id = e.pointerId
      const x0 = e.clientX
      const dedo = e.pointerType !== 'mouse'
      conPulsacionLarga(
        e,
        () => activarMover(clip, el, id, x0, dedo),
        () => onSeleccion(clip.id, true),
      )
    },
    onPointerMove: (e) => {
      const g = gesto.current
      if (!g || g.tipo !== 'mover' || g.id !== clip.id) return
      e.preventDefault()
      arrastro.current = true
      marcarInteraccion()
      const dx = (e.clientX - g.x0) / pxPorSeg
      if (g.principal) moverPrincipal(g, dx)
      else moverLibre(g, dx)
    },
    onPointerUp: () => {
      const g = gesto.current
      if (g?.tipo === 'mover' && g.id === clip.id) terminar(true)
    },
    onPointerCancel: () => {
      const g = gesto.current
      if (g?.tipo === 'mover' && g.id === clip.id) terminar(false)
    },
    onClickCapture: (e) => {
      // Click parásito tras un arrastre: que no seleccione ni abra nada.
      if (arrastro.current) {
        arrastro.current = false
        e.stopPropagation()
        e.preventDefault()
      }
    },
  })

  const propsAsa = (clip: ClipVideo, lado: LadoAsa) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (gesto.current) return
      e.stopPropagation()
      capturarPointer(e.currentTarget, e.pointerId)
      const el = elementos.current.get(clip.id)
      if (!el) return
      const medioId = medioIdDe(clip)
      gesto.current = {
        tipo: 'recortar',
        id: clip.id,
        lado,
        el,
        x0: e.clientX,
        clip,
        limites: limitesRecorte(clips, clip, lado, medioId != null ? medios.get(medioId) : undefined),
        candidatos: iman ? puntosIman(clips, clip.id, tiempoRef.current) : [],
        vivo: lado === 'ini' ? clip.inicio : fin(clip),
      }
      marcarInteraccion()
    },
    onPointerMove: (e: React.PointerEvent) => {
      const g = gesto.current
      if (!g || g.tipo !== 'recortar' || g.id !== clip.id) return
      e.preventDefault()
      recortar(g, (e.clientX - g.x0) / pxPorSeg)
    },
    onPointerUp: () => {
      const g = gesto.current
      if (g?.tipo === 'recortar' && g.id === clip.id) terminar(true)
    },
    onPointerCancel: () => {
      const g = gesto.current
      if (g?.tipo === 'recortar' && g.id === clip.id) terminar(false)
    },
  })

  return { propsGesto, propsAsa }
}
