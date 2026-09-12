import { contextoAudio, desbloquearAudio } from '../../core/audio/motor'
import { callarVoz, hablarVoz } from '../../core/audio/voz'
import type { FiltroVoz, MedioVideo } from '../../core/data/db'
import { PRECALENTAR_S, UMBRAL_DERIVA } from './constantes'
import type { ClipAudio, PoolFuentes } from './fuentes'
import { crearFiltroVoz, type CadenaVoz } from './filtrosVoz'
import {
  duracionTotal,
  esClipAudio,
  esClipNarracion,
  fin,
  medioIdDe,
  principalEn,
  silenciada,
  vozEfectiva,
  type ProyectoAbierto,
} from './modelo'
import {
  renderFrame,
  type EstadoClipAvatar,
  type Fuente3D,
  type Instantanea,
  type OpcionesRender,
  type RenderizadorAvatar,
} from './render'
import { sonidoFabrica } from './sonidos'
import { esVozDispositivo, nombreVozDispositivo, usaDispositivo } from './voces'

/**
 * Reloj y sincronización del preview (y del export, que instancia otro motor
 * sobre su propio canvas y pool): `performance.now()` es la única verdad. Todo
 * va POR TIEMPO: en cada tick cada clip de audio decide si debe sonar y se
 * corrige la deriva solo por umbral (el seek en WebView es caro); el `<video>`
 * del clip principal (y el del saliente durante una transición) igual. El
 * preview NO usa WebAudio: elementos planos (`createMediaElementSource`
 * ataría el elemento para siempre).
 */
export class MotorVideo {
  private ctx: CanvasRenderingContext2D
  private proyecto: ProyectoAbierto
  private pool: PoolFuentes
  private medios: Map<number, MedioVideo>
  private tActual = 0
  private t0 = 0
  private rafId = 0
  private intervaloId = 0
  private repintaId = 0
  reproduciendo = false
  onTiempo: ((t: number) => void) | null = null
  onFin: (() => void) | null = null
  /** Volumen global del motor (el export baja a 1 igual; queda para futuros usos). */
  private ganancia = 1
  /**
   * Reloj por setInterval en vez de rAF: el export lo necesita — con la pestaña
   * tapada el rAF se congela y la grabación no terminaría nunca.
   */
  private intervaloMs = 0
  /** Clips de audio a los que se llamó `play()` (ausente = parado). */
  private sonando = new Set<string>()
  /** Medios de `<video>` principal en marcha. */
  private videosSonando = new Set<number>()
  private instantanea: Instantanea = { canvas: null, clipId: null }
  private avatar: RenderizadorAvatar | null
  private estadosAvatar = new Map<string, EstadoClipAvatar>()
  /** Preview: las narraciones sin audio las lee la voz del dispositivo al pasar (nunca en el export). */
  private vozEnVivo = false
  /** Filtros de voz en el preview: el `<audio>` del clip pasa por WebAudio (el export monta su propio grafo). */
  private filtrosVoz = false
  private filtros = new Map<string, { fuente: MediaElementAudioSourceNode; cadena: CadenaVoz | null; id: FiltroVoz | undefined }>()
  private vivo: { id: string; inicio: number; fin: number } | null = null
  /** Clips ya leídos en esta pasada (la voz no se puede posicionar: cada uno se lee una vez por play/seek). */
  private leidos = new Set<string>()
  /** Modo película: preview transparente sobre el mapa, o la escena 3D capturada en el export. */
  private render: OpcionesRender

  constructor(
    canvas: HTMLCanvasElement,
    proyecto: ProyectoAbierto,
    pool: PoolFuentes,
    medios: MedioVideo[],
    opts?: {
      ganancia?: number
      intervaloMs?: number
      avatar?: RenderizadorAvatar | null
      vozEnVivo?: boolean
      filtrosVoz?: boolean
      transparente?: boolean
      fuente3d?: Fuente3D
    },
  ) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('sin canvas 2d')
    this.ctx = ctx
    this.proyecto = proyecto
    this.pool = pool
    this.medios = new Map(medios.filter((m) => m.id != null).map((m) => [m.id!, m]))
    this.ganancia = opts?.ganancia ?? 1
    this.intervaloMs = opts?.intervaloMs ?? 0
    this.avatar = opts?.avatar ?? null
    this.vozEnVivo = opts?.vozEnVivo ?? false
    this.filtrosVoz = opts?.filtrosVoz ?? false
    this.render = { transparente: opts?.transparente, fuente3d: opts?.fuente3d }
  }

  /** El editor muta el proyecto: el motor lee la referencia nueva, poda lo que ya no existe y repinta. */
  fijarProyecto(p: ProyectoAbierto) {
    this.proyecto = p
    const vivos = new Set(p.clips.map((c) => c.id))
    this.pool.podar(vivos)
    for (const id of [...this.sonando]) if (!vivos.has(id)) this.sonando.delete(id)
    for (const id of [...this.estadosAvatar.keys()]) if (!vivos.has(id)) this.estadosAvatar.delete(id)
    for (const id of [...this.leidos]) if (!vivos.has(id)) this.leidos.delete(id)
    if (this.vivo && !vivos.has(this.vivo.id)) {
      callarVoz()
      this.vivo = null
    }
    if (!this.reproduciendo) {
      this.sincronizarAudio()
      this.pintar()
      this.repintarPronto()
    }
  }

  fijarAvatar(r: RenderizadorAvatar | null) {
    this.avatar = r
    if (!this.reproduciendo) this.pintar()
  }

  tiempo(): number {
    return this.tActual
  }

  /** Arranca desde el tiempo actual. LLAMAR DESDE UN GESTO (autoplay). */
  play() {
    if (this.reproduciendo) return
    desbloquearAudio()
    if (this.tActual >= duracionTotal(this.proyecto.clips) - 0.01) this.tActual = 0
    this.leidos.clear()
    this.reproduciendo = true
    this.t0 = performance.now() - this.tActual * 1000
    this.instantanea.clipId = null
    if (this.intervaloMs > 0) this.intervaloId = window.setInterval(this.tick, this.intervaloMs)
    this.tick()
  }

  pausa() {
    if (!this.reproduciendo) return
    this.reproduciendo = false
    window.cancelAnimationFrame(this.rafId)
    window.clearInterval(this.intervaloId)
    this.intervaloId = 0
    this.sincronizarAudio()
    this.sincronizarVivo()
    this.sincronizarPrincipal()
  }

  /** Salta a un tiempo (scrub): lo que deja de sonar se pausa, lo que sigue se re-seeka por umbral. */
  seek(t: number) {
    const total = duracionTotal(this.proyecto.clips)
    this.tActual = Math.max(0, Math.min(total, t))
    this.t0 = performance.now() - this.tActual * 1000
    this.instantanea.clipId = null
    this.leidos.clear()
    this.sincronizarAudio()
    this.sincronizarVivo()
    if (!this.reproduciendo) {
      this.pintar()
      this.repintarPronto()
    }
    this.onTiempo?.(this.tActual)
  }

  destruir() {
    this.pausa()
    for (const f of this.filtros.values()) {
      f.cadena?.desconectar()
      f.fuente.disconnect()
    }
    this.filtros.clear()
    window.clearTimeout(this.repintaId)
    this.onTiempo = null
    this.onFin = null
  }

  /** Los `<video>` y bitmaps cargan async: en pausa, un segundo pintado corto después. */
  private repintarPronto() {
    window.clearTimeout(this.repintaId)
    this.repintaId = window.setTimeout(() => {
      if (!this.reproduciendo) this.renderizar()
    }, 150)
  }

  private volumenEfectivo(c: ClipAudio | { pista: 'video'; volumen: number }): number {
    return Math.min(1, Math.max(0, c.volumen * (this.proyecto.volumenPistas?.[c.pista] ?? 1) * this.ganancia))
  }

  private fijarVolumen(el: HTMLMediaElement, v: number) {
    if (Math.abs(el.volume - v) > 0.001) el.volume = v
  }

  private duracionMedioDe(c: ClipAudio, el: HTMLAudioElement): number | undefined {
    if (Number.isFinite(el.duration) && el.duration > 0) return el.duration
    if (c.pista === 'sfx' && c.fuente.tipo === 'fabrica') return sonidoFabrica(c.fuente.clave)?.duracion
    const id = medioIdDe(c)
    return id != null ? this.medios.get(id)?.duracion : undefined
  }

  /** Cada clip de audio decide si debe sonar en `tActual`; los cercanos se instancian (precalentar). */
  private sincronizarAudio() {
    const t = this.tActual
    for (const c of this.proyecto.clips) {
      if (!esClipAudio(c)) continue
      const dentro = t >= c.inicio && t < fin(c)
      const pronto = !dentro && t < c.inicio && c.inicio - t <= PRECALENTAR_S
      const suena = this.sonando.has(c.id)
      if (!dentro && !pronto && !suena) continue
      const el = this.pool.audioDe(c)
      if (!el) {
        this.sonando.delete(c.id)
        continue
      }
      this.aplicarFiltroVoz(c, el)
      const durMedio = this.duracionMedioDe(c, el)
      const local = (c.desde ?? 0) + (t - c.inicio)
      const bucle = c.pista === 'musica' && c.bucle
      const objetivo = bucle && durMedio ? local % durMedio : local
      const debe =
        this.reproduciendo && dentro && !silenciada(this.proyecto, c.pista) && (bucle || !durMedio || local < durMedio)
      if (debe && !suena) {
        el.loop = bucle
        this.fijarVolumen(el, this.volumenEfectivo(c))
        if (Math.abs(el.currentTime - objetivo) > 0.05) el.currentTime = objetivo
        void el.play().catch(() => {})
        this.sonando.add(c.id)
      } else if (!debe && suena) {
        el.pause()
        this.sonando.delete(c.id)
      } else if (debe) {
        this.fijarVolumen(el, this.volumenEfectivo(c))
        if (Math.abs(el.currentTime - objetivo) > UMBRAL_DERIVA) el.currentTime = objetivo
      } else if (!this.reproduciendo && dentro) {
        // Scrub en pausa: dejar el audio apuntando a su sitio para arrancar sin hueco.
        if (el.readyState >= 1 && Math.abs(el.currentTime - objetivo) > UMBRAL_DERIVA) el.currentTime = objetivo
      }
    }
  }

  /**
   * Filtro de voz del clip (narración o avatar) en el preview: la primera vez
   * que lo necesita, su `<audio>` pasa a WebAudio (queda atado a ese elemento,
   * que es del pool de este motor) y la cadena se rehace al cambiar de filtro.
   * Sin filtro nunca, el elemento sigue plano, como siempre.
   */
  private aplicarFiltroVoz(c: ClipAudio, el: HTMLAudioElement) {
    if (!this.filtrosVoz) return
    const deseado = c.pista === 'voz' || c.pista === 'avatar' ? c.filtroVoz : undefined
    let entrada = this.filtros.get(c.id)
    if (!entrada) {
      if (!deseado) return
      const ctx = contextoAudio()
      if (!ctx) return
      desbloquearAudio()
      try {
        entrada = { fuente: ctx.createMediaElementSource(el), cadena: null, id: undefined }
      } catch {
        return // el elemento ya estaba atado a otro grafo: sin filtro
      }
      this.filtros.set(c.id, entrada)
    } else if (entrada.id === deseado) return
    const ctx = entrada.fuente.context
    entrada.cadena?.desconectar()
    entrada.fuente.disconnect()
    if (deseado) {
      const cadena = crearFiltroVoz(ctx, deseado)
      entrada.fuente.connect(cadena.entrada)
      cadena.salida.connect(ctx.destination)
      entrada.cadena = cadena
    } else {
      entrada.fuente.connect(ctx.destination)
      entrada.cadena = null
    }
    entrada.id = deseado
  }

  /**
   * Narraciones con guion y sin audio: en el preview las lee la voz del
   * dispositivo al pasar por ellas (gratis, en vivo). Nunca en el export (no se
   * puede grabar) ni con voz IA (costaría créditos en cada reproducción).
   */
  private sincronizarVivo() {
    if (!this.vozEnVivo) return
    const t = this.tActual
    if (this.vivo && (!this.reproduciendo || t >= this.vivo.fin || t < this.vivo.inicio - 0.05)) {
      callarVoz()
      this.vivo = null
    }
    if (!this.reproduciendo || this.vivo) return
    for (const c of this.proyecto.clips) {
      // Con audio propio (y disponible en este dispositivo) suena ese; si no, la voz en vivo.
      if (!esClipNarracion(c) || (c.medioId != null && this.medios.has(c.medioId)) || !c.texto?.trim() || this.leidos.has(c.id)) continue
      if (t < c.inicio || t >= fin(c) || silenciada(this.proyecto, c.pista)) continue
      const voz = vozEfectiva(this.proyecto, c)
      if (!usaDispositivo(voz)) continue
      this.leidos.add(c.id)
      const id = c.id
      this.vivo = { id, inicio: c.inicio, fin: fin(c) }
      const arranco = hablarVoz(c.texto, {
        vozNombre: voz && esVozDispositivo(voz) ? nombreVozDispositivo(voz) : undefined,
        onFin: () => {
          if (this.vivo?.id === id) this.vivo = null
        },
      })
      if (!arranco) this.vivo = null
      return // una voz a la vez
    }
  }

  /** El `<video>` del clip principal (y el del saliente, prolongado y mudo, durante la transición). */
  private sincronizarPrincipal() {
    const pos = principalEn(this.proyecto.clips, this.tActual)
    const activos = new Map<number, { objetivo: number; volumen: number }>()
    if (pos) {
      const f = pos.clip.fuente
      if (f.tipo === 'video') {
        const volumen = silenciada(this.proyecto, 'video') ? 0 : this.volumenEfectivo(pos.clip)
        activos.set(f.medioId, { objetivo: (pos.clip.desde ?? 0) + pos.tLocal, volumen })
      }
      const s = pos.saliente
      if (s && s.fuente.tipo === 'video' && !activos.has(s.fuente.medioId)) {
        activos.set(s.fuente.medioId, { objetivo: (s.desde ?? 0) + s.duracion + pos.tLocal, volumen: 0 })
      }
    }
    for (const [medioId, { objetivo, volumen }] of activos) {
      const fu = this.pool.de(medioId)
      if (fu?.tipo !== 'video') continue
      const el = fu.el
      if (!this.reproduciendo) {
        if (Math.abs(el.currentTime - objetivo) > 0.05) el.currentTime = objetivo
        if (!el.paused) el.pause()
        this.videosSonando.delete(medioId)
        continue
      }
      this.fijarVolumen(el, volumen)
      if (el.paused || !this.videosSonando.has(medioId)) {
        if (Math.abs(el.currentTime - objetivo) > 0.05) el.currentTime = objetivo
        void el.play().catch(() => {})
        this.videosSonando.add(medioId)
      } else if (Math.abs(el.currentTime - objetivo) > UMBRAL_DERIVA) el.currentTime = objetivo
    }
    for (const medioId of [...this.videosSonando]) {
      if (activos.has(medioId)) continue
      const fu = this.pool.de(medioId)
      if (fu?.tipo === 'video') fu.el.pause()
      this.videosSonando.delete(medioId)
    }
  }

  private renderizar() {
    renderFrame(
      this.ctx,
      this.proyecto,
      this.tActual,
      this.pool,
      this.medios,
      this.instantanea,
      { motor: this.avatar, estados: this.estadosAvatar, vivo: this.vivo?.id ?? null },
      this.render,
    )
  }

  private pintar() {
    this.sincronizarPrincipal()
    this.renderizar()
  }

  private tick = () => {
    if (!this.reproduciendo) return
    this.tActual = (performance.now() - this.t0) / 1000
    const total = duracionTotal(this.proyecto.clips)
    if (this.tActual >= total) {
      this.tActual = total
      this.sincronizarAudio()
      this.pintar()
      this.pausa()
      this.onTiempo?.(this.tActual)
      this.onFin?.()
      return
    }
    this.sincronizarAudio()
    this.sincronizarVivo()
    this.pintar()
    this.onTiempo?.(this.tActual)
    if (this.intervaloMs === 0) this.rafId = window.requestAnimationFrame(this.tick)
  }
}
