import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref, type RefObject } from 'react'
import type { ClipVideo, MedioVideo, PistaId } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { emojiActor, nombreActor } from './actores'
import { ClipVista } from './ClipVista'
import { indicePrincipalEn } from './clipsNuevos'
import {
  ALTO_PISTA,
  ALTO_PISTA_VIDEO,
  ALTO_REGLA,
  ANCHO_CABECERA,
  COLA_SEG,
  IMAN_PX,
  NIVEL_ZOOM_DEFECTO,
  NIVELES_ZOOM_VIDEO,
  ORDEN_PISTAS,
  PISTAS,
} from './constantes'
import { clipsDe, duracionTotal, finPrincipal, imantar, medioIdDe, pistasConClips, puntosIman, silenciada, type ProyectoAbierto } from './modelo'
import { Regla } from './Regla'
import { nombreFuenteSonido } from './sonidos'
import { redondearDecima, useGestosClips, type LadoAsa } from './useGestosClips'
import { useMiniaturas } from './useMiniaturas'

/** Dónde caería un ítem arrastrado desde el panel de medios. */
export interface DestinoArrastre {
  pista: PistaId
  seg: number
}

export interface TimelineHandle {
  zoom: (delta: 1 | -1) => void
  /** La pista bajo el puntero (si acepta el ítem) y el tiempo, ya imantado o ajustado al hueco de la principal. */
  destinoEn: (clientX: number, clientY: number, acepta: PistaId[], dur: number) => DestinoArrastre | null
  /** Resalta la fila destino y pinta la guía y la sombra del clip futuro; `null` lo limpia. */
  pintarDestino: (destino: (DestinoArrastre & { dur: number }) | null) => void
}

export const fmtSeg = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${Math.floor((s % 1) * 10)}`

/**
 * La timeline multipista (DOM, no canvas: pocos nodos, miniaturas por
 * `background-image`, botones y roles dentro, scroll nativo con `sticky`). Un
 * solo scroller para regla y pistas; cabeceras pegadas a la izquierda; el
 * playhead cruza las pistas y se mueve por `transform` desde `registrarTiempo`
 * (nunca setState por frame); zoom anclado al segundo bajo el cursor.
 */
export function TimelinePistas({
  ref,
  proyecto,
  medios,
  seleccion,
  iman,
  tiempoRef,
  registrarTiempo,
  onSeleccion,
  onSeek,
  onMover,
  onReordenar,
  onRecortar,
  onSilenciar,
  onBorrar,
  onDividir,
  onTransicion,
  pistasExtra,
  className = '',
}: {
  ref?: Ref<TimelineHandle>
  proyecto: ProyectoAbierto
  medios: MedioVideo[]
  seleccion: string | null
  iman: boolean
  tiempoRef: RefObject<number>
  registrarTiempo: (fn: (t: number) => void) => () => void
  onSeleccion: (id: string | null, abrirPanel?: boolean) => void
  onSeek: (t: number) => void
  onMover: (id: string, inicio: number) => void
  onReordenar: (ordenIds: string[]) => void
  onRecortar: (id: string, lado: LadoAsa, seg: number) => void
  onSilenciar: (pista: PistaId) => void
  onBorrar: (id: string) => void
  onDividir: (id: string) => void
  onTransicion: (id: string) => void
  /** Pistas vacías que se pintan mientras se arrastra un ítem que las acepta («Suelta aquí»). */
  pistasExtra?: PistaId[]
  className?: string
}) {
  const t = useT()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const lineaRef = useRef<HTMLDivElement>(null)
  const cabezaRef = useRef<HTMLDivElement>(null)
  const guiaRef = useRef<HTMLDivElement>(null)
  const elementos = useRef(new Map<string, HTMLElement>())
  const interaccion = useRef(0)
  const [nivel, setNivel] = useState(NIVEL_ZOOM_DEFECTO)
  const [anchoVisible, setAnchoVisible] = useState(600)
  const pxPorSeg = NIVELES_ZOOM_VIDEO[nivel].pxPorSeg
  const clips = proyecto.clips
  const total = duracionTotal(clips)
  const anchoContenido = Math.max((total + COLA_SEG) * pxPorSeg, anchoVisible)
  const conClips = new Set(pistasConClips(clips))
  const extra = new Set(pistasExtra ?? [])
  const pistas = ORDEN_PISTAS.filter((p) => p === 'video' || conClips.has(p) || extra.has(p))
  const porId = new Map(medios.filter((m) => m.id != null).map((m) => [m.id!, m]))
  const urlDe = useMiniaturas(medios)
  const marcarInteraccion = () => {
    interaccion.current = performance.now()
  }

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setAnchoVisible(Math.max(0, Math.round(e.contentRect.width - ANCHO_CABECERA))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Playhead por ref; auto-scroll solo cuando sale de la vista y el usuario no está tocando el scroll.
  useEffect(
    () =>
      registrarTiempo((seg) => {
        const x = seg * pxPorSeg
        const tr = `translateX(${x}px)`
        if (lineaRef.current) lineaRef.current.style.transform = tr
        if (cabezaRef.current) cabezaRef.current.style.transform = tr
        const el = scrollerRef.current
        if (!el || interaccion.current > performance.now() - 400) return
        const izq = el.scrollLeft
        const ancho = el.clientWidth - ANCHO_CABECERA
        if (x < izq || x > izq + ancho - 24) el.scrollLeft = Math.max(0, x - ancho / 4)
      }),
    [registrarTiempo, pxPorSeg],
  )

  // Zoom que no marea: el segundo bajo el cursor (o el playhead visible, o el centro) se queda donde estaba.
  const objetivo = useRef<{ seg: number; offset: number } | null>(null)
  const irANivel = (destino: number, clientX?: number) => {
    const n = Math.min(NIVELES_ZOOM_VIDEO.length - 1, Math.max(0, destino))
    if (n === nivel) return
    const el = scrollerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const visible = el.clientWidth - ANCHO_CABECERA
    const xPlayhead = tiempoRef.current * pxPorSeg
    const offset =
      clientX != null
        ? clientX - rect.left - ANCHO_CABECERA
        : xPlayhead >= el.scrollLeft && xPlayhead <= el.scrollLeft + visible
          ? xPlayhead - el.scrollLeft
          : visible / 2
    objetivo.current = { seg: (el.scrollLeft + offset) / pxPorSeg, offset }
    setNivel(n)
  }
  useLayoutEffect(() => {
    const el = scrollerRef.current
    const o = objetivo.current
    if (el && o) el.scrollLeft = Math.max(0, o.seg * pxPorSeg - o.offset)
    objetivo.current = null
  }, [pxPorSeg])
  // Destino de un arrastre desde el panel de medios: todo imperativo, como los gestos de los clips.
  const sombraRef = useRef<HTMLDivElement>(null)
  const destinoEn = (clientX: number, clientY: number, acepta: PistaId[], dur: number): DestinoArrastre | null => {
    const fila = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-pista]')
    const pista = fila?.dataset.pista as PistaId | undefined
    if (!fila || !pista || !acepta.includes(pista)) return null
    marcarInteraccion()
    let seg = Math.max(0, (clientX - fila.getBoundingClientRect().left) / pxPorSeg)
    if (pista === 'video') {
      // La principal es compacta: el clip entra antes o después del que está bajo el puntero.
      const main = clipsDe(clips, 'video')
      seg = main[indicePrincipalEn(main, seg, 'mitad')]?.inicio ?? finPrincipal(clips)
    } else if (iman) {
      seg += imantar([seg, seg + dur], puntosIman(clips, '', tiempoRef.current), IMAN_PX / pxPorSeg)
    }
    return { pista, seg: redondearDecima(Math.max(0, seg)) }
  }
  const pintarDestino = (d: (DestinoArrastre & { dur: number }) | null) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.querySelectorAll('[data-destino]').forEach((el) => el.removeAttribute('data-destino'))
    const guia = guiaRef.current
    const sombra = sombraRef.current
    const fila = d ? scroller.querySelector<HTMLElement>(`[data-pista="${d.pista}"]`) : null
    if (!d || !fila) {
      if (guia) guia.hidden = true
      if (sombra) sombra.hidden = true
      return
    }
    fila.setAttribute('data-destino', '')
    const x = d.seg * pxPorSeg
    if (guia) {
      guia.hidden = false
      guia.style.transform = `translateX(${x}px)`
    }
    if (sombra) {
      const filaEntera = fila.parentElement as HTMLElement
      sombra.hidden = false
      sombra.style.top = `${filaEntera.offsetTop + 4}px`
      sombra.style.height = `${filaEntera.offsetHeight - 8}px`
      sombra.style.width = `${Math.max(12, d.dur * pxPorSeg)}px`
      sombra.style.transform = `translateX(${x}px)`
    }
  }
  const irANivelRef = useRef(irANivel)
  const destinoEnRef = useRef(destinoEn)
  const pintarDestinoRef = useRef(pintarDestino)
  useEffect(() => {
    irANivelRef.current = irANivel
    destinoEnRef.current = destinoEn
    pintarDestinoRef.current = pintarDestino
  })
  useImperativeHandle(
    ref,
    () => ({
      zoom: (d) => irANivelRef.current(nivel + d),
      destinoEn: (x, y, acepta, dur) => destinoEnRef.current(x, y, acepta, dur),
      pintarDestino: (d) => pintarDestinoRef.current(d),
    }),
    [nivel],
  )
  // La rueda con ctrl/⌘ hace zoom: listener a mano porque React registra `wheel` pasivo.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const alRueda = (e: WheelEvent) => {
      marcarInteraccion()
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      irANivelRef.current(nivel + (e.deltaY < 0 ? 1 : -1), e.clientX)
    }
    el.addEventListener('wheel', alRueda, { passive: false })
    return () => el.removeEventListener('wheel', alRueda)
  }, [nivel])

  // Scrub: pinta ya y seekea con throttle; el seek final va en el pointerup.
  const ultimoSeek = useRef(0)
  const alScrub = (seg: number, final: boolean) => {
    marcarInteraccion()
    const tr = `translateX(${seg * pxPorSeg}px)`
    if (lineaRef.current) lineaRef.current.style.transform = tr
    if (cabezaRef.current) cabezaRef.current.style.transform = tr
    const ahora = performance.now()
    if (final || ahora - ultimoSeek.current > 80) {
      ultimoSeek.current = ahora
      onSeek(seg)
    }
  }

  const { propsGesto, propsAsa } = useGestosClips({
    clips,
    medios: porId,
    pxPorSeg,
    iman,
    tiempoRef,
    elementos,
    guiaRef,
    fmt: fmtSeg,
    onSeleccion,
    onMover,
    onReordenar,
    onRecortar,
    marcarInteraccion,
  })

  const nombreDe = (c: ClipVideo): { nombre: string; emoji?: string; ausente: boolean } => {
    const medioId = medioIdDe(c)
    const medio = medioId != null ? porId.get(medioId) : undefined
    const ausente = medioId != null && !medio
    const noDisponible = t('video.medios.noDisponible', 'Medio no disponible en este dispositivo')
    switch (c.pista) {
      case 'video':
      case 'fondo':
        if (c.fuente.tipo === 'escena3d') {
          // Plano del modo película: su número en la principal y la vista de su cámara.
          const n = clipsDe(proyecto.clips, 'video').findIndex((k) => k.id === c.id) + 1
          const vista = t(`video.pelicula.vista.${c.fuente.cam.vista}`, c.fuente.cam.vista)
          return { nombre: `${t('video.pelicula.planoN', 'Plano {n}', { n })} · ${vista}`, ausente: false }
        }
        return { nombre: c.fuente.tipo === 'color' ? t('video.guion.color', 'Color') : (medio?.nombre ?? noDisponible), ausente }
      case 'imagen':
        return { nombre: medio?.nombre ?? noDisponible, ausente }
      case 'texto':
        return { nombre: c.texto.contenido, ausente: false }
      case 'voz':
        return { nombre: c.texto?.trim() || medio?.nombre || t('video.clip.sinAudio', 'Sin audio todavía'), ausente }
      case 'musica':
        return { nombre: medio?.nombre ?? noDisponible, ausente }
      case 'sfx':
        return { nombre: nombreFuenteSonido(t, c.fuente, porId), ausente: c.fuente.tipo === 'medio' && ausente }
      case 'avatar':
        return { nombre: c.texto.trim() || nombreActor(t, c.asistenteId), emoji: emojiActor(c.asistenteId), ausente: false }
    }
  }

  const tecladoDe = (c: ClipVideo) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSeleccion(c.id, true)
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      onBorrar(c.id)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      const paso = (e.shiftKey ? 1 : 0.1) * (e.key === 'ArrowLeft' ? -1 : 1)
      onMover(c.id, Math.max(0, c.inicio + paso))
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault()
      onDividir(c.id)
    }
  }

  const registrarDe = (id: string) => (el: HTMLElement | null) => {
    if (el) elementos.current.set(id, el)
    else elementos.current.delete(id)
  }

  // Modo película: la principal son los planos y la pista de avatar, los personajes.
  const pelicula = proyecto.escenario === '3d'
  const etiquetaPista: Record<PistaId, string> = {
    texto: t('video.pista.texto', 'Texto'),
    imagen: t('video.pista.imagen', 'Imagen superpuesta'),
    avatar: pelicula ? t('video.pelicula.pista.avatar', 'Personajes') : t('video.pista.avatar', 'Avatar'),
    video: pelicula ? t('video.pelicula.pista.video', 'Planos') : t('video.pista.video', 'Pista principal'),
    fondo: t('video.pista.fondo', 'Fondo'),
    voz: t('video.pista.voz', 'Narración'),
    musica: t('video.pista.musica', 'Música'),
    sfx: t('video.pista.sfx', 'Sonidos'),
  }

  return (
    <div
      ref={scrollerRef}
      data-timeline
      className={`relative overflow-auto overscroll-contain rounded-xl border border-white/10 bg-white/5 select-none ${className}`}
      onScroll={marcarInteraccion}
      onPointerDown={marcarInteraccion}
    >
      <div className="relative" style={{ width: ANCHO_CABECERA + anchoContenido }}>
        <div className="sticky top-0 z-30 flex">
          <div className="ui-panel-2 sticky start-0 z-40 shrink-0 border-b border-e border-white/10" style={{ width: ANCHO_CABECERA, height: ALTO_REGLA }} />
          <Regla nivel={nivel} total={total} ancho={anchoContenido} cabezaRef={cabezaRef} onScrub={alScrub} />
        </div>
        {pistas.map((p) => {
          const muda = silenciada(proyecto, p)
          const alto = p === 'video' ? ALTO_PISTA_VIDEO : ALTO_PISTA
          const lista = clipsDe(clips, p)
          return (
            <div key={p} className="flex border-b border-white/5" style={{ height: alto }}>
              <div
                className="ui-panel-2 sticky start-0 z-20 flex shrink-0 flex-col items-center justify-center gap-0.5 border-e border-white/10"
                style={{ width: ANCHO_CABECERA }}
                title={etiquetaPista[p]}
              >
                <span className="text-sm" style={{ color: PISTAS[p].color }}>
                  <Icono nombre={PISTAS[p].icono} title={etiquetaPista[p]} />
                </span>
                <button
                  type="button"
                  onClick={() => onSilenciar(p)}
                  aria-pressed={muda}
                  aria-label={
                    PISTAS[p].audio
                      ? muda
                        ? t('video.pista.sonar', 'Activar el sonido de la pista {pista}', { pista: etiquetaPista[p] })
                        : t('video.pista.silenciar', 'Silenciar la pista {pista}', { pista: etiquetaPista[p] })
                      : muda
                        ? t('video.pista.mostrar', 'Mostrar la pista {pista}', { pista: etiquetaPista[p] })
                        : t('video.pista.ocultar', 'Ocultar la pista {pista}', { pista: etiquetaPista[p] })
                  }
                  className={`grid h-5 w-5 place-items-center rounded text-[11px] transition ${muda ? 'bg-red-500/30 text-red-300' : 'text-white/40 hover:bg-white/10'}`}
                >
                  <Icono nombre={PISTAS[p].audio ? (muda ? 'silencio' : 'bocina') : muda ? 'cerrar' : 'ver'} />
                </button>
              </div>
              <div
                className="relative data-destino:bg-white/[0.07]"
                style={{ width: anchoContenido }}
                data-pista={p}
                onPointerUp={(e) => {
                  if (e.target === e.currentTarget) onSeleccion(null)
                }}
              >
                {lista.length === 0 && (extra.has(p) || p === 'video') && (
                  <p className="absolute inset-y-0 left-2 flex items-center text-xs text-white/40">
                    {extra.has(p)
                      ? t('video.lateral.sueltaAqui', 'Suelta aquí: {pista}', { pista: etiquetaPista[p] })
                      : t('video.timeline.vaciaClip', 'Toca «Añadir» para poner el primer clip')}
                  </p>
                )}
                {lista.map((c) => {
                  const { nombre, emoji, ausente } = nombreDe(c)
                  const medioId = medioIdDe(c)
                  const urlMiniatura =
                    (c.pista === 'video' || c.pista === 'fondo' || c.pista === 'imagen') && medioId != null ? urlDe(medioId) : undefined
                  return (
                    <ClipVista
                      key={c.id}
                      clip={c}
                      pxPorSeg={pxPorSeg}
                      seleccionado={c.id === seleccion}
                      nombre={nombre}
                      emoji={emoji}
                      urlMiniatura={urlMiniatura}
                      ausente={ausente}
                      registrar={registrarDe(c.id)}
                      propsGesto={propsGesto(c)}
                      propsAsa={(lado) => propsAsa(c, lado)}
                      onTransicion={() => onTransicion(c.id)}
                      onTeclado={tecladoDe(c)}
                      fmtDur={(s) => `${Math.round(s * 10) / 10}s`}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
        <div
          ref={lineaRef}
          className="pointer-events-none absolute bottom-0 z-10 w-0.5 bg-white/90"
          style={{ top: ALTO_REGLA, left: ANCHO_CABECERA }}
        />
        <div
          ref={guiaRef}
          hidden
          className="pointer-events-none absolute z-10 w-px bg-white/70"
          style={{ top: ALTO_REGLA, bottom: 0, left: ANCHO_CABECERA }}
        />
        <div
          ref={sombraRef}
          hidden
          className="pointer-events-none absolute z-10 rounded-md border-2 border-dashed border-white/70 bg-white/10"
          style={{ left: ANCHO_CABECERA }}
        />
      </div>
    </div>
  )
}
