import type {
  ClipAvatar,
  ClipPrincipal,
  ClipVideo,
  DireccionTransicion,
  EstiloTexto,
  FiltroEscena,
  FuenteVisual,
  MedioVideo,
  TipoTransicion,
} from '../../core/data/db'
import { amortiguar, avanzarBoca, nuevaBocaHabla, type BocaHabla } from '../../core/house/bocaHabla'
import { tGlobal } from '../../core/i18n/useT'
import {
  DUR_ANIM_TEXTO,
  DUR_FUNDIDO_AVATAR,
  DUR_SALIDA_TEXTO,
  FILTROS,
  FUENTES_TEXTO,
  MARGEN_AVATAR,
  MAX_AVATARES_SIMULTANEOS,
  SEG_POR_CARACTER_MAQUINA,
  TAMANOS_AVATAR,
  TAMANOS_TEXTO,
} from './constantes'
import type { PoolFuentes } from './fuentes'
import {
  aperturaBoca,
  clipsActivos,
  durTransicionDe,
  fin,
  necesitaSaliente,
  principalEn,
  silenciada,
  type ProyectoAbierto,
} from './modelo'

/**
 * Render de UN frame de la composición (puro, sin estado): por capas, de abajo
 * arriba — fondo, clip principal (con su transición contra el saliente),
 * imágenes superpuestas, avatar, textos y el fundido por negro. Lo usan el
 * preview y el export con el mismo código: lo que ves es lo que sale.
 */

/** Último frame del clip principal antes de un corte con transición de dos frames y el MISMO `<video>`. */
export interface Instantanea {
  canvas: HTMLCanvasElement | null
  clipId: string | null
}

/** Suavizado por clip de avatar (boca y energía del gesto); vive en el motor, por reloj. */
export interface EstadoClipAvatar {
  boca: BocaHabla
  energia: number
  tPrev: number | null
}

/** Lo que implementa `AvatarLienzo`: render SÍNCRONO del personaje en su canvas WebGL. */
export interface RenderizadorAvatar {
  canvas: HTMLCanvasElement
  /** false = no listo (asistente sin montar, WebGL caído). */
  pintar(clip: ClipAvatar, t: number, estado: EstadoClipAvatar): boolean
  /** Resuelve cuando los modelos están cargados, o vence el plazo. */
  esperar(plazoMs?: number): Promise<void>
}

export interface CapaAvatar {
  motor: RenderizadorAvatar | null
  estados: Map<string, EstadoClipAvatar>
  /** Clip que la voz del dispositivo está leyendo en vivo (sin envolvente): boca sintética. */
  vivo?: string | null
}

/** La escena 3D de la casa capturada para el export: el `<video>` del captureStream y el recorte (px del lienzo) del encuadre. */
export interface Fuente3D {
  video: HTMLVideoElement
  recorte: () => { sx: number; sy: number; sw: number; sh: number }
}

export interface OpcionesRender {
  /** Preview del modo película: sin negro, sin fondo y sin `escena3d` — el mapa vivo se ve por debajo del canvas. */
  transparente?: boolean
  /** Export del modo película: de dónde sale cada clip `escena3d`. */
  fuente3d?: Fuente3D
}

/** Boca «sintética» para la voz en vivo: sílabas a ~4 por segundo con altibajos. */
export const bocaEnVivo = (t: number) => 0.2 + 0.5 * Math.abs(Math.sin(t * 8.5)) * (0.55 + 0.45 * Math.sin(t * 2.1 + 1))

/** Pinta un clip a pantalla completa respetando transform/clip/alpha vigentes; `filtroExtra` se suma al del clip. */
type Pintor = (ctx: CanvasRenderingContext2D, filtroExtra?: string) => void
type FnTransicion = (
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  saliente: Pintor,
  entrante: Pintor,
  p: number,
  dir: DireccionTransicion,
) => void

const conFiltro = (ctx: CanvasRenderingContext2D) => 'filter' in ctx

function filtroDe(filtro: FiltroEscena | undefined, extra?: string): string {
  const base = FILTROS[filtro ?? 'ninguno']
  return [base !== 'none' ? base : '', extra ?? ''].filter(Boolean).join(' ') || 'none'
}

/** drawImage en modo "cover" centrado. */
function cover(ctx: CanvasRenderingContext2D, fuente: CanvasImageSource, fw: number, fh: number, W: number, H: number) {
  if (fw <= 0 || fh <= 0) return
  const escala = Math.max(W / fw, H / fh)
  const w = fw * escala
  const h = fh * escala
  ctx.drawImage(fuente, (W - w) / 2, (H - h) / 2, w, h)
}

/** drawImage en modo "contain" centrado dentro de un rectángulo. */
function contain(
  ctx: CanvasRenderingContext2D,
  fuente: CanvasImageSource,
  fw: number,
  fh: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (fw <= 0 || fh <= 0 || w <= 0 || h <= 0) return
  const escala = Math.min(w / fw, h / fh)
  const dw = fw * escala
  const dh = fh * escala
  ctx.drawImage(fuente, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

function placeholder(ctx: CanvasRenderingContext2D, W: number, H: number, nombre: string | undefined) {
  ctx.fillStyle = '#1a1d24'
  ctx.fillRect(0, 0, W, H)
  if (conFiltro(ctx)) ctx.filter = 'none'
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = `${Math.round(H * 0.035)}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(nombre ?? tGlobal('video.medios.noDisponible', 'Medio no disponible en este dispositivo'), W / 2, H / 2)
}

/** Fuente visual (color, imagen o video) a pantalla completa, cover o contain, con filtro. */
function pintarFuente(
  ctx: CanvasRenderingContext2D,
  fuente: FuenteVisual,
  ajuste: 'cubrir' | 'encajar',
  filtro: FiltroEscena | undefined,
  pool: PoolFuentes,
  medios: Map<number, MedioVideo>,
  W: number,
  H: number,
  extra?: string,
  op?: OpcionesRender,
) {
  ctx.save()
  if (conFiltro(ctx)) ctx.filter = filtroDe(filtro, extra)
  if (fuente.tipo === 'color') {
    ctx.fillStyle = fuente.color
    ctx.fillRect(0, 0, W, H)
  } else if (fuente.tipo === 'escena3d') {
    if (op?.transparente) {
      /* el 3D vivo ya está debajo del canvas */
    } else if (op?.fuente3d && op.fuente3d.video.readyState >= 2) {
      const { sx, sy, sw, sh } = op.fuente3d.recorte()
      if (sw > 0 && sh > 0) ctx.drawImage(op.fuente3d.video, sx, sy, sw, sh, 0, 0, W, H)
    } else placeholder(ctx, W, H, tGlobal('video.pelicula.escena3d', 'Escena 3D'))
  } else {
    const f = pool.de(fuente.medioId)
    if (f?.tipo === 'imagen') {
      if (ajuste === 'encajar') contain(ctx, f.bitmap, f.bitmap.width, f.bitmap.height, 0, 0, W, H)
      else cover(ctx, f.bitmap, f.bitmap.width, f.bitmap.height, W, H)
    } else if (f?.tipo === 'video') {
      if (ajuste === 'encajar') contain(ctx, f.el, f.el.videoWidth, f.el.videoHeight, 0, 0, W, H)
      else cover(ctx, f.el, f.el.videoWidth, f.el.videoHeight, W, H)
    } else {
      // Medio ausente (borrado, u otro dispositivo: los binarios no sincronizan).
      placeholder(ctx, W, H, medios.get(fuente.medioId)?.nombre)
    }
  }
  ctx.restore()
}

// ─── Texto ───────────────────────────────────────────────────────────────────

/** Wrap por palabras con la fuente YA puesta en `ctx`; lo que no cabe en `maxLineas` se pierde. */
function partirLineas(ctx: CanvasRenderingContext2D, texto: string, maxAncho: number, maxLineas: number): string[] {
  const palabras = texto.split(/\s+/)
  const lineas: string[] = []
  let linea = ''
  for (const palabra of palabras) {
    const intento = linea ? `${linea} ${palabra}` : palabra
    if (ctx.measureText(intento).width > maxAncho && linea) {
      lineas.push(linea)
      linea = palabra
      if (lineas.length === maxLineas) break
    } else {
      linea = intento
    }
  }
  if (lineas.length < maxLineas && linea) lineas.push(linea)
  return lineas
}

/** Rectángulo redondeado; `roundRect` falta en WKWebView viejas (mismo feature-detect que `filter`). */
function trazarRectRedondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  if (typeof (ctx as { roundRect?: unknown }).roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const suavizar = (p: number) => 1 - (1 - p) ** 3

/**
 * Un clip de texto en su tiempo relativo: animación de entrada, caja,
 * tipografía, subtítulo y fundido de salida (la ventana es el clip entero).
 */
function pintarTexto(
  ctx: CanvasRenderingContext2D,
  texto: EstiloTexto,
  tRel: number,
  duracion: number,
  W: number,
  H: number,
) {
  if (!texto.contenido.trim() || tRel < 0 || tRel >= duracion) return
  const anim = texto.animacion ?? 'ninguna'
  const contenido = texto.contenido.trim()
  // La máquina va por caracteres: con 0.5 s fijos un título largo aparece de golpe.
  let durEntrada =
    anim === 'maquina' ? Math.max(DUR_ANIM_TEXTO, contenido.length * SEG_POR_CARACTER_MAQUINA) : DUR_ANIM_TEXTO
  durEntrada = Math.min(durEntrada, Math.max(0.2, duracion - DUR_SALIDA_TEXTO))
  const p = anim === 'ninguna' ? 1 : Math.min(1, tRel / durEntrada)
  const e = suavizar(p)
  let alpha = anim === 'fundido' || anim === 'subir' ? e : 1
  alpha *= Math.min(1, (duracion - tRel) / DUR_SALIDA_TEXTO)
  if (alpha <= 0) return
  const dy = anim === 'subir' ? (1 - e) * H * 0.04 : 0

  const tam = Math.round(TAMANOS_TEXTO[texto.tamano] * H)
  const familia = FUENTES_TEXTO[texto.fuente ?? 'sans']
  const fuenteTitulo = `bold ${tam}px ${familia}`
  const maxAncho = W * 0.84
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = fuenteTitulo
  const lineas = partirLineas(ctx, contenido, maxAncho, 3)

  const tamSub = Math.round(tam * 0.55)
  const fuenteSub = `${tamSub}px ${familia}`
  const sub = texto.subtitulo?.trim()
  let lineasSub: string[] = []
  if (sub) {
    ctx.font = fuenteSub
    lineasSub = partirLineas(ctx, sub, maxAncho, 2)
  }

  const paso = tam * 1.15
  const pasoSub = tamSub * 1.2
  const hueco = lineasSub.length ? tam * 0.3 : 0
  const altoBloque = lineas.length * paso + hueco + lineasSub.length * pasoSub
  const margen = H * 0.08
  const yTop =
    (texto.posicion === 'arriba' ? margen : texto.posicion === 'abajo' ? H - margen - altoBloque : (H - altoBloque) / 2) +
    dy

  ctx.globalAlpha = alpha
  if (texto.caja) {
    ctx.font = fuenteTitulo
    let ancho = Math.max(0, ...lineas.map((l) => ctx.measureText(l).width))
    if (lineasSub.length) {
      ctx.font = fuenteSub
      ancho = Math.max(ancho, ...lineasSub.map((l) => ctx.measureText(l).width))
    }
    const pad = tam * 0.45
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    trazarRectRedondo(ctx, W / 2 - ancho / 2 - pad, yTop - pad * 0.6, ancho + pad * 2, altoBloque + pad * 1.2, tam * 0.3)
    ctx.fill()
  }

  ctx.shadowColor = 'rgba(0,0,0,0.75)'
  ctx.shadowBlur = tam * 0.25
  ctx.fillStyle = texto.color
  ctx.font = fuenteTitulo
  // Máquina: presupuesto de caracteres sobre las líneas YA partidas (no refluyen).
  let presupuesto = anim === 'maquina' ? Math.floor(p * lineas.join(' ').length) : Infinity
  lineas.forEach((l, i) => {
    const visible = presupuesto >= l.length ? l : l.slice(0, Math.max(0, presupuesto))
    presupuesto -= l.length + 1
    if (visible) ctx.fillText(visible, W / 2, yTop + i * paso + paso / 2)
  })
  if (lineasSub.length && (anim !== 'maquina' || p >= 1)) {
    ctx.font = fuenteSub
    const y0 = yTop + lineas.length * paso + hueco
    lineasSub.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * pasoSub + pasoSub / 2))
  }
  ctx.restore()
}

// ─── Transiciones ────────────────────────────────────────────────────────────

const VECTOR: Record<DireccionTransicion, [number, number]> = {
  izq: [-1, 0],
  der: [1, 0],
  arriba: [0, -1],
  abajo: [0, 1],
}

function escalado(ctx: CanvasRenderingContext2D, W: number, H: number, s: number, pintor: Pintor, extra?: string) {
  ctx.save()
  ctx.translate(W / 2, H / 2)
  ctx.scale(s, s)
  ctx.translate(-W / 2, -H / 2)
  pintor(ctx, extra)
  ctx.restore()
}

const disolver: FnTransicion = (ctx, _W, _H, sal, ent, p) => {
  sal(ctx)
  ctx.save()
  ctx.globalAlpha = p
  ent(ctx)
  ctx.restore()
}

const TRANSICIONES: Record<Exclude<TipoTransicion, 'corte' | 'fundido'>, FnTransicion> = {
  disolver,
  deslizar: (ctx, W, H, sal, ent, p, dir) => {
    const [dx, dy] = VECTOR[dir]
    ctx.save()
    ctx.translate(dx * p * W, dy * p * H)
    sal(ctx)
    ctx.restore()
    ctx.save()
    ctx.translate(-dx * (1 - p) * W, -dy * (1 - p) * H)
    ent(ctx)
    ctx.restore()
  },
  barrido: (ctx, W, H, sal, ent, p, dir) => {
    sal(ctx)
    ctx.save()
    ctx.beginPath()
    if (dir === 'izq') ctx.rect(0, 0, p * W, H)
    else if (dir === 'der') ctx.rect((1 - p) * W, 0, p * W, H)
    else if (dir === 'arriba') ctx.rect(0, 0, W, p * H)
    else ctx.rect(0, (1 - p) * H, W, p * H)
    ctx.clip()
    ent(ctx)
    ctx.restore()
  },
  zoom: (ctx, W, H, sal, ent, p) => {
    escalado(ctx, W, H, 1 + 0.15 * p, sal)
    ctx.save()
    ctx.globalAlpha = p
    escalado(ctx, W, H, 0.85 + 0.15 * p, ent)
    ctx.restore()
  },
  desenfoque: (ctx, W, H, sal, ent, p, dir) => {
    if (!conFiltro(ctx)) return disolver(ctx, W, H, sal, ent, p, dir)
    const px = Math.round(Math.sin(Math.PI * p) * H * 0.02)
    const blur = px > 0 ? `blur(${px}px)` : undefined
    sal(ctx, blur)
    ctx.save()
    ctx.globalAlpha = p
    ent(ctx, blur)
    ctx.restore()
  },
}

/** La misma transición que usa el motor, entre dos imágenes ya pintadas (vista previa de la rejilla). */
export function pintarTransicion(
  ctx: CanvasRenderingContext2D,
  tipo: TipoTransicion,
  p: number,
  fuenteA: CanvasImageSource,
  fuenteB: CanvasImageSource,
  dir: DireccionTransicion = 'izq',
) {
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const pintor =
    (fuente: CanvasImageSource): Pintor =>
    (c, extra) => {
      c.save()
      if (conFiltro(c)) c.filter = extra ?? 'none'
      c.drawImage(fuente, 0, 0, W, H)
      c.restore()
    }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.clearRect(0, 0, W, H)
  if (tipo === 'corte') return pintor(p < 0.5 ? fuenteA : fuenteB)(ctx)
  if (tipo === 'fundido') {
    pintor(p < 0.5 ? fuenteA : fuenteB)(ctx)
    ctx.save()
    ctx.globalAlpha = p < 0.5 ? p * 2 : (1 - p) * 2
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
    return
  }
  TRANSICIONES[tipo](ctx, W, H, pintor(fuenteA), pintor(fuenteB), suavizar(p), dir)
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

/** Los clips de avatar activos, pintados desde el canvas WebGL del renderizador. */
function pintarAvatares(
  ctx: CanvasRenderingContext2D,
  capa: CapaAvatar,
  activos: ClipAvatar[],
  t: number,
  W: number,
  H: number,
) {
  if (!capa.motor) return
  for (const clip of activos.slice(0, MAX_AVATARES_SIMULTANEOS)) {
    const tRel = t - clip.inicio
    let e = capa.estados.get(clip.id)
    if (!e) {
      e = { boca: nuevaBocaHabla(), energia: 0, tPrev: null }
      capa.estados.set(clip.id, e)
    }
    const dt = e.tPrev == null ? 1 / 30 : tRel - e.tPrev
    e.tPrev = tRel
    avanzarBoca(e.boca, capa.vivo === clip.id ? bocaEnVivo(tRel) : aperturaBoca(clip, tRel), dt)
    e.energia = amortiguar(e.energia, e.boca.hablando ? 1 : 0, dt > 0 ? Math.min(dt, 0.25) : 1 / 30, 0.3)
    if (!capa.motor.pintar(clip, t, e)) continue
    const lado = Math.round(TAMANOS_AVATAR[clip.tamano] * H)
    const m = Math.round(Math.min(W, H) * MARGEN_AVATAR)
    const x =
      clip.esquina === 'supIzq' || clip.esquina === 'infIzq' ? m : clip.esquina === 'centro' ? (W - lado) / 2 : W - m - lado
    const y =
      clip.esquina === 'supIzq' || clip.esquina === 'supDer' ? m : clip.esquina === 'centro' ? (H - lado) / 2 : H - m - lado
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, tRel / DUR_FUNDIDO_AVATAR, (clip.duracion - tRel) / DUR_FUNDIDO_AVATAR))
    ctx.drawImage(capa.motor.canvas, x, y, lado, lado)
    ctx.restore()
  }
}

// ─── El frame ────────────────────────────────────────────────────────────────

/** Misma fuente VIVA a ambos lados del corte: el saliente tiene que salir de la foto (todas las tomas 3D comparten un `<video>`). */
const mismaFuenteVideo = (a: ClipPrincipal, b: ClipPrincipal) =>
  (a.fuente.tipo === 'video' && b.fuente.tipo === 'video' && a.fuente.medioId === b.fuente.medioId) ||
  (a.fuente.tipo === 'escena3d' && b.fuente.tipo === 'escena3d')

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  proyecto: ProyectoAbierto,
  t: number,
  pool: PoolFuentes,
  medios: Map<number, MedioVideo>,
  instantanea?: Instantanea,
  avatar?: CapaAvatar,
  op?: OpcionesRender,
): void {
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const clips = proyecto.clips
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  if (conFiltro(ctx)) ctx.filter = 'none'
  if (op?.transparente) ctx.clearRect(0, 0, W, H)
  else {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
  }
  const activos = clipsActivos(clips, t)

  // 1. Fondo (debajo del video): el último activo. En el preview transparente el fondo es el mapa vivo.
  if (!op?.transparente && !silenciada(proyecto, 'fondo')) {
    const fondos = activos.filter((c): c is ClipVideo & { pista: 'fondo' } => c.pista === 'fondo')
    const fondo = fondos[fondos.length - 1]
    if (fondo) pintarFuente(ctx, fondo.fuente, 'cubrir', fondo.filtro, pool, medios, W, H)
  }

  // 2. Clip principal, con transición contra el saliente.
  const pos = principalEn(clips, t)
  if (pos) {
    const pintorDe =
      (clip: ClipPrincipal): Pintor =>
      (c, extra) =>
        pintarFuente(c, clip.fuente, clip.ajuste ?? 'cubrir', clip.filtro, pool, medios, W, H, extra, op)
    const entrante = pintorDe(pos.clip)
    let saliente: Pintor | null = null
    if (pos.saliente) {
      if (mismaFuenteVideo(pos.saliente, pos.clip)) {
        // Un solo <video> por medio: el saliente sale de la foto tomada antes del corte (si la hay).
        const foto = instantanea?.clipId === pos.saliente.id ? instantanea.canvas : null
        if (foto) {
          saliente = (c, extra) => {
            c.save()
            if (conFiltro(c)) c.filter = extra ?? 'none'
            c.drawImage(foto, 0, 0)
            c.restore()
          }
        }
      } else saliente = pintorDe(pos.saliente)
    }
    if (saliente && pos.transicion && necesitaSaliente(pos.transicion)) {
      TRANSICIONES[pos.transicion.tipo as Exclude<TipoTransicion, 'corte' | 'fundido'>](
        ctx,
        W,
        H,
        saliente,
        entrante,
        suavizar(pos.p),
        pos.transicion.direccion ?? 'izq',
      )
    } else entrante(ctx)

    // Foto para el próximo corte: mismo medio, transición de dos frames y quedan pocos frames.
    const sig = pos.siguiente
    if (
      instantanea &&
      sig &&
      necesitaSaliente(sig.transicion) &&
      mismaFuenteVideo(pos.clip, sig) &&
      fin(pos.clip) - t <= durTransicionDe(sig.transicion, sig, pos.clip) + 0.3
    ) {
      if (!instantanea.canvas) instantanea.canvas = document.createElement('canvas')
      const lienzo = instantanea.canvas
      if (lienzo.width !== W || lienzo.height !== H) {
        lienzo.width = W
        lienzo.height = H
      }
      const c2 = lienzo.getContext('2d')
      if (c2) {
        entrante(c2)
        instantanea.clipId = pos.clip.id
      }
    }
  }

  // 3. Imágenes superpuestas.
  if (!silenciada(proyecto, 'imagen')) {
    for (const c of activos) {
      if (c.pista !== 'imagen') continue
      const f = pool.de(c.medioId)
      if (f?.tipo !== 'imagen') continue
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, c.opacidad))
      contain(ctx, f.bitmap, f.bitmap.width, f.bitmap.height, c.encuadre.x * W, c.encuadre.y * H, c.encuadre.ancho * W, c.encuadre.alto * H)
      ctx.restore()
    }
  }

  // 4. Avatar (el PIP; los actores del modo película viven en la casa 3D, no aquí).
  if (avatar) {
    pintarAvatares(
      ctx,
      avatar,
      activos.filter((c): c is ClipAvatar => c.pista === 'avatar' && c.modo !== 'escena').sort((a, b) => a.inicio - b.inicio),
      t,
      W,
      H,
    )
  }

  // 5. Textos.
  if (!silenciada(proyecto, 'texto')) {
    for (const c of activos) if (c.pista === 'texto') pintarTexto(ctx, c.texto, t - c.inicio, c.duracion, W, H)
  }

  // 6. Fundido por negro (entrada del clip y salida hacia el siguiente).
  let alpha = 0
  if (pos) {
    if (pos.transicion?.tipo === 'fundido' && pos.tLocal < pos.durTransicion) alpha = 1 - pos.tLocal / pos.durTransicion
    const sig = pos.siguiente
    if (sig?.transicion?.tipo === 'fundido') {
      const d = durTransicionDe(sig.transicion, sig, pos.clip)
      const resta = pos.clip.duracion - pos.tLocal
      if (resta < d) alpha = Math.max(alpha, 1 - resta / d)
    }
  }
  if (alpha > 0) {
    ctx.save()
    ctx.globalAlpha = Math.min(1, alpha)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
}
