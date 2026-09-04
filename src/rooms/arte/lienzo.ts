import type { CapaDibujo } from '../../core/data/db'
import { MAX_CAPAS, MAX_DESHACER } from './constantes'

/**
 * Motor del lienzo del Studio de arte, sin React. Molde de
 * `core/house/grafitiLienzo.ts` (trazos por segmentos, tap = punto, spray con
 * jitter, pila de `ImageData`) pero como FÁBRICA por editor, no singleton: hay
 * N dibujos y el editor se abre y cierra limpio.
 *
 * Multicapa: cada capa es un `<canvas>` propio apilado en el `host` (el
 * compositor del navegador los mezcla en GPU; un trazo solo repinta su capa).
 * Las capas son transparentes y el borrador usa `destination-out` (semántica
 * del grafiti); el fondo blanco lo pone el CSS del host y `aBlob()` al
 * componer, así el PNG exportado sigue siendo opaco.
 */

export type HerramientaArte =
  | 'pincel'
  | 'spray'
  | 'borrador'
  | 'linea'
  | 'rect'
  | 'elipse'
  | 'compas'
  | 'relleno'
  | 'gotero'
  | 'texto'

export type FormaArte = 'linea' | 'rect' | 'elipse' | 'compas'

export type FiltroArte = 'brillo+' | 'brillo-' | 'contraste+' | 'contraste-' | 'grises' | 'desenfoque'

/** Lo que la UI necesita saber de una capa (el bitmap vive en el motor). */
export interface CapaInfo {
  capaId: string
  nombre: string
  visible: boolean
  opacidad: number
}

const BLANCO = '#ffffff'
/** Tolerancia del bote por canal (los bordes antialiased no cortan el relleno). */
const TOLERANCIA = 32

let correlativoCapa = 0
const nuevaCapaId = () => `ca-${Date.now().toString(36)}-${(correlativoCapa++).toString(36)}`

export interface Lienzo {
  /** Monta las capas guardadas o, si no hay (o un cliente viejo editó `imagen`), una capa «Fondo». */
  iniciar(
    d: { imagen: Blob; capas?: CapaDibujo[]; capasEn?: string; actualizadoEn: string },
    nombreFondo: string,
  ): Promise<void>
  empezarTrazo(x: number, y: number): void
  trazar(x: number, y: number, color: string, grosor: number, herr: 'pincel' | 'spray' | 'borrador', presion?: number): void
  /** Cancela el trazo en curso restaurando el snapshot (entró un 2.º dedo). */
  cancelarTrazo(): void
  /** Comete una forma (línea/rect/elipse/compás) de un golpe, con snapshot previo. */
  cometerForma(herr: FormaArte, x0: number, y0: number, x1: number, y1: number, color: string, grosor: number): void
  /** Bote: flood fill scanline desde ese punto (compara los 4 canales RGBA). */
  rellenar(x: number, y: number, color: string): void
  /** Cuentagotas: color COMPUESTO del píxel (todas las capas visibles) como `#rrggbb`. */
  colorEn(x: number, y: number): string
  texto(x: number, y: number, texto: string, color: string, tam: number): void
  filtrar(filtro: FiltroArte): void
  /** Pinta una imagen cubriendo la capa activa (foto importada o resultado de la IA). */
  pintarImagen(blob: Blob): Promise<void>
  /** Vacía la capa activa (queda transparente). */
  limpiar(): void
  deshacer(): boolean
  rehacer(): boolean
  puedeDeshacer(): boolean
  puedeRehacer(): boolean
  /** Espejo de dibujo: reflejar cada trazo/forma sobre el eje vertical y/u horizontal. */
  setEspejo(v: boolean, h: boolean): void
  // ─── Capas ───
  capas(): CapaInfo[]
  capaActiva(): string
  activarCapa(capaId: string): void
  /** Añade una capa vacía encima de todas y la activa; `null` si se llegó al tope. */
  agregarCapa(nombre: string): string | null
  /** Copia una capa justo encima de la original y la activa; `null` si tope. */
  duplicarCapa(capaId: string, nombre: string): string | null
  /** `false` si es la única capa. */
  borrarCapa(capaId: string): boolean
  /** Fusiona la capa con la de abajo (respetando su opacidad); `false` si ya es la de abajo. */
  fusionarAbajo(capaId: string): boolean
  /** Sube (`+1`) o baja (`-1`) la capa un puesto; `false` si no hay a dónde. */
  moverCapa(capaId: string, delta: 1 | -1): boolean
  renombrarCapa(capaId: string, nombre: string): void
  setVisibleCapa(capaId: string, visible: boolean): void
  setOpacidadCapa(capaId: string, opacidad: number): void
  /** Miniatura de la capa como dataURL (PNG con alfa, para el panel). */
  miniaturaCapa(capaId: string, lado?: number): string
  /** Composición final: blanco + capas visibles con su opacidad (PNG opaco). */
  aBlob(): Promise<Blob>
  /** Las capas listas para persistir (solo re-encodea las tocadas). */
  aCapas(): Promise<CapaDibujo[]>
}

/** Los pares de extremos reflejados de una forma según el espejo activo (el primero es el original). */
export function extremosEspejados(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  espejoV: boolean,
  espejoH: boolean,
  ancho: number,
  alto: number,
): [number, number, number, number][] {
  const res: [number, number, number, number][] = [[x0, y0, x1, y1]]
  if (espejoV) res.push([ancho - x0, y0, ancho - x1, y1])
  if (espejoH) res.push([x0, alto - y0, x1, alto - y1])
  if (espejoV && espejoH) res.push([ancho - x0, alto - y0, ancho - x1, alto - y1])
  return res
}

/** Traza una línea/rect/elipse/compás sobre ese contexto (la usa también el canvas de preview). */
export function dibujarFormaEn(
  destino: CanvasRenderingContext2D,
  herr: FormaArte,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  grosor: number,
): void {
  destino.strokeStyle = color
  destino.lineWidth = grosor
  destino.lineCap = 'round'
  destino.lineJoin = 'round'
  destino.beginPath()
  if (herr === 'linea') {
    destino.moveTo(x0, y0)
    destino.lineTo(x1, y1)
  } else if (herr === 'rect') {
    destino.rect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0))
  } else if (herr === 'compas') {
    // Compás: centro donde bajas, radio hasta donde sueltas.
    destino.arc(x0, y0, Math.hypot(x1 - x0, y1 - y0), 0, Math.PI * 2)
  } else {
    destino.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, 0, 0, Math.PI * 2)
  }
  destino.stroke()
}

interface CapaViva {
  capaId: string
  nombre: string
  visible: boolean
  opacidad: number
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  /** Último PNG conocido: si la capa no se tocó, `aCapas()` lo reutiliza sin re-encodear. */
  blob?: Blob
  sucia: boolean
}

/**
 * Estado de una «pluma» del trazo en curso (con espejo hay hasta 4): último
 * punto crudo y último punto medio, para el suavizado con curvas cuadráticas.
 */
interface Pluma {
  ux: number
  uy: number
  mx: number
  my: number
}

export function crearLienzo(host: HTMLDivElement, ancho: number, alto: number): Lienzo {
  host.style.width = `${ancho}px`
  host.style.height = `${alto}px`

  let capas: CapaViva[] = []
  let activaId = ''
  let espejoV = false
  let espejoH = false

  let pila: { capaId: string; img: ImageData }[] = []
  let rehacerPila: { capaId: string; img: ImageData }[] = []
  // Plumas del trazo en curso (el espejo se congela al empezar el trazo).
  let plumas: Pluma[] = []
  let espejoTrazoV = false
  let espejoTrazoH = false
  let trazando = false

  const porId = (capaId: string) => capas.find((c) => c.capaId === capaId)
  const activa = () => porId(activaId) ?? capas[0]

  const aplicarEstilo = (c: CapaViva) => {
    c.canvas.style.display = c.visible ? '' : 'none'
    c.canvas.style.opacity = String(c.opacidad)
  }

  const crearCapa = (nombre: string, capaId = nuevaCapaId()): CapaViva => {
    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto
    canvas.className = 'absolute left-0 top-0'
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    const c: CapaViva = { capaId, nombre, visible: true, opacidad: 1, canvas, ctx, sucia: false }
    aplicarEstilo(c)
    return c
  }

  /** Reencola los canvas en el host siguiendo el orden del array (0 abajo). */
  const ordenarDom = () => {
    for (const c of capas) host.appendChild(c.canvas)
  }

  const foto = (c: CapaViva) => c.ctx.getImageData(0, 0, ancho, alto)

  /** Snapshot de ESA capa para deshacer; toda acción nueva vacía la pila de rehacer. */
  const snapshot = (c: CapaViva) => {
    pila.push({ capaId: c.capaId, img: foto(c) })
    if (pila.length > MAX_DESHACER) pila.shift()
    rehacerPila = []
    c.sucia = true
  }

  /** La capa activa lista para pintar: si estaba oculta se vuelve visible (nada de trazos fantasma). */
  const paraPintar = () => {
    const c = activa()
    if (!c.visible) {
      c.visible = true
      aplicarEstilo(c)
    }
    return c
  }

  /** Grosor efectivo: con presión de stylus el trazo adelgaza o engorda. */
  const conPresion = (grosor: number, presion?: number) =>
    presion === undefined ? grosor : grosor * (0.35 + presion * 1.3)

  /** Composición de todas las capas visibles sobre blanco, en un canvas nuevo. */
  const componer = () => {
    const comp = document.createElement('canvas')
    comp.width = ancho
    comp.height = alto
    const cctx = comp.getContext('2d')!
    cctx.fillStyle = BLANCO
    cctx.fillRect(0, 0, ancho, alto)
    for (const c of capas) {
      if (!c.visible || c.opacidad <= 0) continue
      cctx.globalAlpha = c.opacidad
      cctx.drawImage(c.canvas, 0, 0)
    }
    cctx.globalAlpha = 1
    return comp
  }

  const aPng = (canvas: HTMLCanvasElement) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob falló'))), 'image/png')
    })

  return {
    async iniciar(d, nombreFondo) {
      pila = []
      rehacerPila = []
      for (const c of capas) c.canvas.remove()
      capas = []
      // Las capas guardadas solo valen si el último guardado fue CON capas; si
      // un cliente viejo editó `imagen`, esta manda y se vuelve a una sola capa.
      const guardadas = d.capas && d.capas.length > 0 && d.capasEn === d.actualizadoEn ? d.capas : null
      if (guardadas) {
        for (const cd of guardadas) {
          const c = crearCapa(cd.nombre, cd.capaId)
          c.visible = cd.visible
          c.opacidad = cd.opacidad
          aplicarEstilo(c)
          const bmp = await createImageBitmap(cd.imagen)
          c.ctx.drawImage(bmp, 0, 0, ancho, alto)
          bmp.close()
          c.blob = cd.imagen
          capas.push(c)
        }
      } else {
        const c = crearCapa(nombreFondo)
        const bmp = await createImageBitmap(d.imagen)
        c.ctx.drawImage(bmp, 0, 0, ancho, alto)
        bmp.close()
        c.sucia = true // el PNG plano no sirve como blob de capa (hay que re-encodear al guardar)
        capas.push(c)
      }
      ordenarDom()
      activaId = capas[capas.length - 1].capaId
    },

    empezarTrazo(x, y) {
      const c = paraPintar()
      snapshot(c)
      trazando = true
      espejoTrazoV = espejoV
      espejoTrazoH = espejoH
      plumas = extremosEspejados(x, y, x, y, espejoV, espejoH, ancho, alto).map(([px, py]) => ({
        ux: px,
        uy: py,
        mx: px,
        my: py,
      }))
    },

    trazar(x, y, color, grosor, herr, presion) {
      if (!trazando) return
      const { ctx } = activa()
      const puntos = extremosEspejados(x, y, x, y, espejoTrazoV, espejoTrazoH, ancho, alto)
      const g = conPresion(grosor, presion)
      ctx.globalCompositeOperation = herr === 'borrador' ? 'destination-out' : 'source-over'
      for (let k = 0; k < plumas.length; k++) {
        const p = plumas[k]
        const [px, py] = puntos[k]
        if (herr === 'spray') {
          // Aerosol: nubes de puntitos con jitter a lo largo del tramo.
          ctx.fillStyle = color
          ctx.globalAlpha = 0.3
          const pasos = Math.max(1, Math.ceil(Math.hypot(px - p.ux, py - p.uy) / 3))
          for (let i = 1; i <= pasos; i++) {
            const sx = p.ux + ((px - p.ux) * i) / pasos
            const sy = p.uy + ((py - p.uy) * i) / pasos
            for (let j = 0; j < 7; j++) {
              const a = Math.random() * Math.PI * 2
              const r = Math.sqrt(Math.random()) * g
              ctx.beginPath()
              ctx.arc(sx + Math.cos(a) * r, sy + Math.sin(a) * r, 1.6, 0, Math.PI * 2)
              ctx.fill()
            }
          }
          ctx.globalAlpha = 1
        } else {
          ctx.strokeStyle = color
          ctx.fillStyle = color
          if (Math.hypot(px - p.ux, py - p.uy) < 0.5) {
            // Tap sin arrastre: punto redondo (una línea de largo 0 no pinta).
            ctx.beginPath()
            ctx.arc(px, py, g / 2, 0, Math.PI * 2)
            ctx.fill()
          } else {
            // Suavizado: curva cuadrática entre puntos medios con el punto
            // crudo anterior de control (los trazos rápidos no salen poligonales).
            const nmx = (p.ux + px) / 2
            const nmy = (p.uy + py) / 2
            ctx.lineWidth = g
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.beginPath()
            ctx.moveTo(p.mx, p.my)
            ctx.quadraticCurveTo(p.ux, p.uy, nmx, nmy)
            ctx.stroke()
            p.mx = nmx
            p.my = nmy
          }
        }
        p.ux = px
        p.uy = py
      }
      ctx.globalCompositeOperation = 'source-over'
    },

    cancelarTrazo() {
      if (!trazando) return
      trazando = false
      const entrada = pila.pop()
      if (entrada) porId(entrada.capaId)?.ctx.putImageData(entrada.img, 0, 0)
    },

    cometerForma(herr, x0, y0, x1, y1, color, grosor) {
      const c = paraPintar()
      snapshot(c)
      for (const [a0, b0, a1, b1] of extremosEspejados(x0, y0, x1, y1, espejoV, espejoH, ancho, alto))
        dibujarFormaEn(c.ctx, herr, a0, b0, a1, b1, color, grosor)
    },

    rellenar(x, y, color) {
      const px = Math.floor(x)
      const py = Math.floor(y)
      if (px < 0 || py < 0 || px >= ancho || py >= alto) return
      const c = paraPintar()
      snapshot(c)
      const img = foto(c)
      const d = img.data
      const idx = (py * ancho + px) * 4
      const [or, og, ob, oa] = [d[idx], d[idx + 1], d[idx + 2], d[idx + 3]]
      const objetivo = document.createElement('canvas')
      objetivo.width = objetivo.height = 1
      const octx = objetivo.getContext('2d')!
      octx.fillStyle = color
      octx.fillRect(0, 0, 1, 1)
      const [nr, ng, nb] = octx.getImageData(0, 0, 1, 1).data
      if (
        Math.abs(or - nr) <= TOLERANCIA &&
        Math.abs(og - ng) <= TOLERANCIA &&
        Math.abs(ob - nb) <= TOLERANCIA &&
        255 - oa <= TOLERANCIA
      )
        return
      // El alfa también se compara: en una capa transparente los píxeles vacíos
      // comparten RGB con cualquier trazo negro puro y el bote se desbordaría.
      const igual = (i: number) =>
        Math.abs(d[i] - or) <= TOLERANCIA &&
        Math.abs(d[i + 1] - og) <= TOLERANCIA &&
        Math.abs(d[i + 2] - ob) <= TOLERANCIA &&
        Math.abs(d[i + 3] - oa) <= TOLERANCIA
      const pintar = (i: number) => {
        d[i] = nr
        d[i + 1] = ng
        d[i + 2] = nb
        d[i + 3] = 255
      }
      // Scanline con pila de tramos (sin recursión: reventaría en móvil).
      const cola: [number, number][] = [[px, py]]
      while (cola.length > 0) {
        const [cx, cy] = cola.pop()!
        let x0 = cx
        const base = cy * ancho
        while (x0 > 0 && igual((base + x0 - 1) * 4)) x0--
        let x1 = cx
        while (x1 < ancho - 1 && igual((base + x1 + 1) * 4)) x1++
        let arriba = false
        let abajo = false
        for (let i = x0; i <= x1; i++) {
          pintar((base + i) * 4)
          if (cy > 0) {
            const ok = igual((base - ancho + i) * 4)
            if (ok && !arriba) cola.push([i, cy - 1])
            arriba = ok
          }
          if (cy < alto - 1) {
            const ok = igual((base + ancho + i) * 4)
            if (ok && !abajo) cola.push([i, cy + 1])
            abajo = ok
          }
        }
      }
      c.ctx.putImageData(img, 0, 0)
    },

    colorEn(x, y) {
      // Muestrea la composición visible (no la capa activa): lo que ves es lo que tomas.
      const px = Math.max(0, Math.min(ancho - 1, Math.floor(x)))
      const py = Math.max(0, Math.min(alto - 1, Math.floor(y)))
      const uno = document.createElement('canvas')
      uno.width = uno.height = 1
      const uctx = uno.getContext('2d', { willReadFrequently: true })!
      uctx.fillStyle = BLANCO
      uctx.fillRect(0, 0, 1, 1)
      for (const c of capas) {
        if (!c.visible || c.opacidad <= 0) continue
        uctx.globalAlpha = c.opacidad
        uctx.drawImage(c.canvas, px, py, 1, 1, 0, 0, 1, 1)
      }
      const d = uctx.getImageData(0, 0, 1, 1).data
      return `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`
    },

    texto(x, y, texto, color, tam) {
      const c = paraPintar()
      snapshot(c)
      c.ctx.fillStyle = color
      c.ctx.font = `bold ${tam}px system-ui, sans-serif`
      c.ctx.textBaseline = 'middle'
      c.ctx.fillText(texto, x, y)
    },

    filtrar(filtro) {
      const c = paraPintar()
      snapshot(c)
      const { ctx, canvas } = c
      if (filtro === 'desenfoque') {
        // Truco universal (WebKit no trae `ctx.filter`): reducir a ¼ y reescalar
        // con suavizado, dos pasadas. Se limpia antes de repintar: la capa tiene
        // alfa y el borroso no debe caer ENCIMA del nítido.
        const chico = document.createElement('canvas')
        chico.width = Math.max(1, Math.round(ancho / 4))
        chico.height = Math.max(1, Math.round(alto / 4))
        const cctx = chico.getContext('2d')!
        cctx.imageSmoothingEnabled = true
        ctx.imageSmoothingEnabled = true
        for (let i = 0; i < 2; i++) {
          cctx.clearRect(0, 0, chico.width, chico.height)
          cctx.drawImage(canvas, 0, 0, chico.width, chico.height)
          ctx.clearRect(0, 0, ancho, alto)
          ctx.drawImage(chico, 0, 0, ancho, alto)
        }
        return
      }
      const img = foto(c)
      const d = img.data
      const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v)
      for (let i = 0; i < d.length; i += 4) {
        if (filtro === 'grises') {
          const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
          d[i] = d[i + 1] = d[i + 2] = g
        } else if (filtro === 'brillo+' || filtro === 'brillo-') {
          const delta = filtro === 'brillo+' ? 20 : -20
          d[i] = clamp(d[i] + delta)
          d[i + 1] = clamp(d[i + 1] + delta)
          d[i + 2] = clamp(d[i + 2] + delta)
        } else {
          const f = filtro === 'contraste+' ? 1.15 : 0.87
          d[i] = clamp((d[i] - 128) * f + 128)
          d[i + 1] = clamp((d[i + 1] - 128) * f + 128)
          d[i + 2] = clamp((d[i + 2] - 128) * f + 128)
        }
      }
      c.ctx.putImageData(img, 0, 0)
    },

    async pintarImagen(blob) {
      const c = paraPintar()
      snapshot(c)
      const bmp = await createImageBitmap(blob)
      c.ctx.drawImage(bmp, 0, 0, ancho, alto)
      bmp.close()
    },

    limpiar() {
      const c = activa()
      snapshot(c)
      c.ctx.clearRect(0, 0, ancho, alto)
    },

    deshacer() {
      const entrada = pila.pop()
      if (!entrada) return false
      const c = porId(entrada.capaId)
      if (!c) return false
      rehacerPila.push({ capaId: c.capaId, img: foto(c) })
      c.ctx.putImageData(entrada.img, 0, 0)
      c.sucia = true
      return true
    },

    rehacer() {
      const entrada = rehacerPila.pop()
      if (!entrada) return false
      const c = porId(entrada.capaId)
      if (!c) return false
      pila.push({ capaId: c.capaId, img: foto(c) })
      if (pila.length > MAX_DESHACER) pila.shift()
      c.ctx.putImageData(entrada.img, 0, 0)
      c.sucia = true
      return true
    },

    puedeDeshacer: () => pila.length > 0,
    puedeRehacer: () => rehacerPila.length > 0,

    setEspejo(v, h) {
      espejoV = v
      espejoH = h
    },

    capas: () => capas.map(({ capaId, nombre, visible, opacidad }) => ({ capaId, nombre, visible, opacidad })),
    capaActiva: () => activaId,

    activarCapa(capaId) {
      if (porId(capaId)) activaId = capaId
    },

    agregarCapa(nombre) {
      if (capas.length >= MAX_CAPAS) return null
      const c = crearCapa(nombre)
      c.sucia = true
      capas.push(c)
      ordenarDom()
      activaId = c.capaId
      return c.capaId
    },

    duplicarCapa(capaId, nombre) {
      const origen = porId(capaId)
      if (!origen || capas.length >= MAX_CAPAS) return null
      const c = crearCapa(nombre)
      c.visible = origen.visible
      c.opacidad = origen.opacidad
      aplicarEstilo(c)
      c.ctx.drawImage(origen.canvas, 0, 0)
      c.sucia = true
      capas.splice(capas.indexOf(origen) + 1, 0, c)
      ordenarDom()
      activaId = c.capaId
      return c.capaId
    },

    borrarCapa(capaId) {
      const c = porId(capaId)
      if (!c || capas.length <= 1) return false
      const i = capas.indexOf(c)
      c.canvas.remove()
      capas.splice(i, 1)
      // Sus snapshots ya no restauran nada: fuera de las pilas.
      pila = pila.filter((e) => e.capaId !== capaId)
      rehacerPila = rehacerPila.filter((e) => e.capaId !== capaId)
      if (activaId === capaId) activaId = capas[Math.max(0, i - 1)].capaId
      return true
    },

    fusionarAbajo(capaId) {
      const c = porId(capaId)
      if (!c) return false
      const i = capas.indexOf(c)
      if (i === 0) return false
      const abajo = capas[i - 1]
      if (c.visible && c.opacidad > 0) {
        abajo.ctx.globalAlpha = c.opacidad
        abajo.ctx.drawImage(c.canvas, 0, 0)
        abajo.ctx.globalAlpha = 1
      }
      abajo.sucia = true
      c.canvas.remove()
      capas.splice(i, 1)
      // La fusión no es deshacible: los snapshots de ambas quedan rancios.
      pila = pila.filter((e) => e.capaId !== capaId && e.capaId !== abajo.capaId)
      rehacerPila = rehacerPila.filter((e) => e.capaId !== capaId && e.capaId !== abajo.capaId)
      if (activaId === capaId) activaId = abajo.capaId
      return true
    },

    moverCapa(capaId, delta) {
      const c = porId(capaId)
      if (!c) return false
      const i = capas.indexOf(c)
      const j = i + delta
      if (j < 0 || j >= capas.length) return false
      capas[i] = capas[j]
      capas[j] = c
      ordenarDom()
      return true
    },

    renombrarCapa(capaId, nombre) {
      const c = porId(capaId)
      if (c) c.nombre = nombre
    },

    setVisibleCapa(capaId, visible) {
      const c = porId(capaId)
      if (!c) return
      c.visible = visible
      aplicarEstilo(c)
    },

    setOpacidadCapa(capaId, opacidad) {
      const c = porId(capaId)
      if (!c) return
      c.opacidad = opacidad
      aplicarEstilo(c)
    },

    miniaturaCapa(capaId, lado = 48) {
      const c = porId(capaId)
      if (!c) return ''
      const esc = lado / Math.max(ancho, alto)
      const mini = document.createElement('canvas')
      mini.width = Math.max(1, Math.round(ancho * esc))
      mini.height = Math.max(1, Math.round(alto * esc))
      const mctx = mini.getContext('2d')!
      mctx.drawImage(c.canvas, 0, 0, mini.width, mini.height)
      return mini.toDataURL()
    },

    aBlob: () => aPng(componer()),

    async aCapas() {
      const res: CapaDibujo[] = []
      for (const c of capas) {
        if (c.sucia || !c.blob) {
          c.blob = await aPng(c.canvas)
          c.sucia = false
        }
        res.push({ capaId: c.capaId, nombre: c.nombre, visible: c.visible, opacidad: c.opacidad, imagen: c.blob })
      }
      return res
    },
  }
}
