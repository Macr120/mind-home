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
  | 'mover'

export type FormaArte = 'linea' | 'rect' | 'elipse' | 'compas'

export type FiltroArte = 'brillo+' | 'brillo-' | 'contraste+' | 'contraste-' | 'grises' | 'desenfoque'

/** Rectángulo en px del bitmap. */
export interface Caja {
  x: number
  y: number
  w: number
  h: number
}

/** Lo que la UI necesita saber de una capa (el bitmap vive en el motor). */
interface CapaInfo {
  capaId: string
  nombre: string
  visible: boolean
  opacidad: number
}

const BLANCO = '#ffffff'
/** Tolerancia del bote por canal (los bordes antialiased no cortan el relleno). */
const TOLERANCIA = 32
/** Alfa mínimo para que un píxel cuente como «pintado» (caja de la capa, objetos). */
const ALFA_PINTADO = 8
/**
 * Al separar en objetos: cuánto se ensancha cada mancha antes de agrupar (dos
 * trozos a menos de esta distancia son el mismo objeto: el antialiasing y los
 * trazos finos parten un dibujo en migas) y el tamaño mínimo de un objeto como
 * fracción del lienzo (lo menor se queda en la capa original).
 */
const RADIO_UNION = 2
const FRACCION_MIN_OBJETO = 0.0002
/**
 * Fondo de una imagen opaca (foto, IA): distancia RGB máxima al color de borde
 * dominante para inundarlo desde los bordes, y qué parte del lienzo tiene que
 * cubrir para creerse fondo (menos es un borde casual, no un fondo).
 */
const DISTANCIA_FONDO = 60
const FRACCION_MIN_FONDO = 0.05

let correlativoCapa = 0
const nuevaCapaId = () => `ca-${Date.now().toString(36)}-${(correlativoCapa++).toString(36)}`

export interface Lienzo {
  /** Monta las capas guardadas o, si no hay (o un cliente viejo editó `imagen`), una capa «Fondo». */
  iniciar(
    d: { imagen: Blob; capas?: CapaDibujo[]; capasEn?: string; actualizadoEn: string },
    nombreFondo: string,
  ): Promise<void>
  empezarTrazo(x: number, y: number): void
  /**
   * `rng` siembra el aerosol: con él, el mismo trazo sale idéntico en todos los
   * dispositivos (lo exige el replay de los dibujos compartidos). Sin él, azar.
   */
  trazar(
    x: number,
    y: number,
    color: string,
    grosor: number,
    herr: 'pincel' | 'spray' | 'borrador',
    presion?: number,
    rng?: () => number,
  ): void
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
  /**
   * Inserta una imagen como OBJETO: en una capa nueva (si hay sitio; si no, en
   * la activa), entera y centrada, conservando su proporción. Devuelve si nació
   * capa propia, en qué capa quedó y dónde (lo necesita el dibujo compartido
   * para mandar la misma colocación). Después se mueve y se escala con «mover».
   */
  insertarImagen(blob: Blob, nombreCapa: string, capaId?: string): Promise<{ nueva: boolean; capaId: string; caja: Caja }>
  /** Caja de lo pintado en la capa activa (px del bitmap); `null` si está vacía. */
  cajaActiva(): Caja | null
  /**
   * Mover/escalar la capa activa como un objeto: `empezar` congela su bitmap y
   * devuelve su caja (o `null` si está vacía), cada `transformar` repinta ese
   * bitmap en la caja destino y `terminar` cierra el gesto (con `cambio` en
   * false el snapshot de deshacer se retira: un tap no es una acción).
   */
  empezarTransformar(): Caja | null
  transformar(destino: Caja): void
  terminarTransformar(cambio: boolean): void
  /** Cancela el gesto de transformar restaurando el snapshot (entró un 2.º dedo). */
  cancelarTransformar(): void
  /**
   * Parte la capa activa en objetos, cada uno a una capa propia encima de ella
   * (`nombreDe(n)` los bautiza): las manchas sueltas de una capa dibujada, o en
   * una imagen opaca lo que no sea su fondo liso (ese se queda en la capa).
   * La mancha mayor de una capa sin fondo se queda donde está. Devuelve cuántas
   * capas nacieron (0 = no había nada suelto). No es deshacible. Respeta el tope.
   */
  separarObjetos(nombreDe: (n: number) => string): number
  /**
   * Cambia la resolución del lienzo: con `escalar` el dibujo se estira al tamaño
   * nuevo; sin él, cada capa conserva sus píxeles centrados (se recorta o se
   * amplía el lienzo). Vacía el historial (cambio estructural).
   */
  redimensionar(ancho: number, alto: number, escalar: boolean): void
  /** Vacía la capa activa (queda transparente). */
  limpiar(): void
  deshacer(): boolean
  rehacer(): boolean
  puedeDeshacer(): boolean
  puedeRehacer(): boolean
  /** Espejo de dibujo: reflejar cada trazo/forma sobre el eje vertical y/u horizontal. */
  setEspejo(v: boolean, h: boolean): void
  /** El espejo puesto ahora mismo (el replay compartido lo cambia y lo restaura). */
  espejo(): [boolean, boolean]
  // ─── Capas ───
  capas(): CapaInfo[]
  capaActiva(): string
  activarCapa(capaId: string): void
  /**
   * Añade una capa vacía encima de todas y la activa; `null` si se llegó al
   * tope. Con `capaId` nace con ESE id (en un dibujo compartido la capa tiene
   * que llamarse igual en todos los dispositivos).
   */
  agregarCapa(nombre: string, capaId?: string): string | null
  /** Copia una capa justo encima de la original y la activa; `null` si tope. */
  duplicarCapa(capaId: string, nombre: string, nuevoId?: string): string | null
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
  /**
   * Las capas de ESTE instante: copia todos los bitmaps de golpe (síncrono) y
   * luego los codifica. `aCapas()` no sirve para el snapshot compartido: entre
   * un PNG y el siguiente cabe un trazo, y el corte del log dejaría fuera lo
   * que la imagen no llegó a incluir.
   */
  capturarCapas(): Promise<CapaDibujo[]>

  // ─── Dibujo compartido (replay de operaciones) ───
  /**
   * Ejecuta `fn` con esa capa como activa y restaura la que estaba. Si la capa
   * no existe no hace nada: una operación ajena nunca pinta en la capa que no
   * era. Lo usa el aplicador para llevar cada operación a SU capa.
   */
  enCapa(capaId: string, fn: () => void): void
  /**
   * Ejecuta `fn` sin apuntar nada en las pilas de deshacer. El replay puede
   * repetir cientos de operaciones y cada snapshot es un `ImageData` entero.
   */
  sinHistorial(fn: () => void): void
  /** Deja la capa como estaba en el snapshot (su bitmap, o vacía). */
  ponerBase(capaId: string, base: ImageBitmap | null): void
  /** Pinta una imagen en esa capa: cubriendo el lienzo, o dentro de la caja dada. */
  pintarEn(capaId: string, imagen: ImageBitmap, caja?: Caja): void
  /** Mueve y escala lo que hay en la caja `de` de esa capa hasta la caja `a`. */
  transformarCaja(capaId: string, de: Caja, a: Caja): void
  /**
   * Reinicia el lienzo desde el snapshot de un dibujo compartido: tamaño, lista
   * de capas y bitmaps. Vacía el historial (es un cambio estructural).
   */
  cargarCapas(
    ancho: number,
    alto: number,
    capas: { capaId: string; nombre: string; visible: boolean; opacidad: number; imagen: ImageBitmap | null }[],
  ): void
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

/** Ensancha una máscara binaria `r` píxeles (ventana cuadrada, en dos pasadas separables). */
function dilatar(mascara: Uint8Array, ancho: number, alto: number, r: number): Uint8Array {
  const horizontal = new Uint8Array(mascara.length)
  for (let y = 0; y < alto; y++) {
    const base = y * ancho
    for (let x = 0; x < ancho; x++) {
      if (!mascara[base + x]) continue
      const x1 = Math.min(ancho - 1, x + r)
      for (let i = Math.max(0, x - r); i <= x1; i++) horizontal[base + i] = 1
    }
  }
  const res = new Uint8Array(mascara.length)
  for (let y = 0; y < alto; y++) {
    const base = y * ancho
    for (let x = 0; x < ancho; x++) {
      if (!horizontal[base + x]) continue
      const y1 = Math.min(alto - 1, y + r)
      for (let j = Math.max(0, y - r); j <= y1; j++) res[j * ancho + x] = 1
    }
  }
  return res
}

/**
 * Componentes conexas (8 vecinos) de una máscara: la etiqueta de cada píxel
 * (0 = fuera) y cuántos píxeles tiene cada etiqueta. Con pila explícita en un
 * `Int32Array` —cada píxel entra una sola vez— y no recursión (reventaría).
 */
function etiquetar(mascara: Uint8Array, ancho: number, alto: number): { etiqueta: Int32Array; tamanos: number[] } {
  const n = ancho * alto
  const etiqueta = new Int32Array(n)
  const pila = new Int32Array(n)
  const tamanos: number[] = [0]
  for (let semilla = 0; semilla < n; semilla++) {
    if (!mascara[semilla] || etiqueta[semilla]) continue
    const L = tamanos.length
    let tam = 0
    let tope = 0
    pila[tope++] = semilla
    etiqueta[semilla] = L
    while (tope > 0) {
      const i = pila[--tope]
      tam++
      const x = i % ancho
      const y = (i - x) / ancho
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= alto) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= ancho) continue
          const j = yy * ancho + xx
          if (mascara[j] && !etiqueta[j]) {
            etiqueta[j] = L
            pila[tope++] = j
          }
        }
      }
    }
    tamanos.push(tam)
  }
  return { etiqueta, tamanos }
}

/**
 * Máscara del fondo liso de una imagen opaca: el color dominante de sus bordes,
 * inundado desde ellos por los píxeles parecidos a ESE color (no al vecino: un
 * degradado suave no se lo lleva todo). `null` si lo que cubre no da para fondo.
 */
function fondoDe(d: Uint8ClampedArray, ancho: number, alto: number): Uint8Array | null {
  const bordes: number[] = []
  for (let x = 0; x < ancho; x++) bordes.push(x, (alto - 1) * ancho + x)
  for (let y = 1; y < alto - 1; y++) bordes.push(y * ancho, y * ancho + ancho - 1)
  // Color de borde dominante: cuantizado a 32 niveles por canal y promediado.
  const cubos = new Map<number, [number, number, number, number]>()
  for (const i of bordes) {
    const k = i * 4
    const clave = ((d[k] >> 3) << 10) | ((d[k + 1] >> 3) << 5) | (d[k + 2] >> 3)
    const acc = cubos.get(clave) ?? [0, 0, 0, 0]
    acc[0] += d[k]
    acc[1] += d[k + 1]
    acc[2] += d[k + 2]
    acc[3]++
    cubos.set(clave, acc)
  }
  let mejor: [number, number, number, number] | null = null
  for (const acc of cubos.values()) if (!mejor || acc[3] > mejor[3]) mejor = acc
  if (!mejor) return null
  const rr = mejor[0] / mejor[3]
  const gg = mejor[1] / mejor[3]
  const bb = mejor[2] / mejor[3]
  const tope2 = DISTANCIA_FONDO * DISTANCIA_FONDO
  const parecido = (i: number) => {
    const k = i * 4
    const dr = d[k] - rr
    const dg = d[k + 1] - gg
    const db = d[k + 2] - bb
    return dr * dr + dg * dg + db * db <= tope2
  }
  const n = ancho * alto
  const fondo = new Uint8Array(n)
  const pila = new Int32Array(n)
  let tope = 0
  for (const i of bordes) {
    if (!fondo[i] && parecido(i)) {
      fondo[i] = 1
      pila[tope++] = i
    }
  }
  let cubierto = tope
  const visitar = (j: number) => {
    if (fondo[j] || !parecido(j)) return
    fondo[j] = 1
    pila[tope++] = j
    cubierto++
  }
  while (tope > 0) {
    const i = pila[--tope]
    const x = i % ancho
    if (x > 0) visitar(i - 1)
    if (x < ancho - 1) visitar(i + 1)
    if (i >= ancho) visitar(i - ancho)
    if (i + ancho < n) visitar(i + ancho)
  }
  return cubierto >= n * FRACCION_MIN_FONDO ? fondo : null
}

export function crearLienzo(host: HTMLDivElement, anchoInicial: number, altoInicial: number): Lienzo {
  // Mutables: `redimensionar` los cambia (todo lo demás los lee al vuelo).
  let ancho = anchoInicial
  let alto = altoInicial
  host.style.width = `${ancho}px`
  host.style.height = `${alto}px`

  let capas: CapaViva[] = []
  let activaId = ''
  let espejoV = false
  let espejoH = false

  let pila: { capaId: string; img: ImageData }[] = []
  let rehacerPila: { capaId: string; img: ImageData }[] = []
  // Gesto de mover/escalar en curso: bitmap congelado de la capa y su caja.
  let transf: { capaId: string; copia: HTMLCanvasElement; caja: Caja; img: ImageData } | null = null
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

  /** Caja de los píxeles pintados de la capa; `null` si está vacía. */
  const cajaDe = (c: CapaViva): Caja | null => {
    const d = foto(c).data
    let x0 = ancho
    let y0 = alto
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < alto; y++) {
      const base = y * ancho
      for (let x = 0; x < ancho; x++) {
        if (d[(base + x) * 4 + 3] <= ALFA_PINTADO) continue
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
  }

  /**
   * Replay de un dibujo compartido en marcha: las acciones no apuntan nada en
   * las pilas (serían cientos de `ImageData`, y ahí deshacer es otra operación).
   */
  let replay = false

  /** Snapshot de ESA capa para deshacer; toda acción nueva vacía la pila de rehacer. */
  const snapshot = (c: CapaViva) => {
    c.sucia = true
    if (replay) return
    pila.push({ capaId: c.capaId, img: foto(c) })
    if (pila.length > MAX_DESHACER) pila.shift()
    rehacerPila = []
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

    trazar(x, y, color, grosor, herr, presion, rng) {
      if (!trazando) return
      const azar = rng ?? Math.random
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
              const a = azar() * Math.PI * 2
              const r = Math.sqrt(azar()) * g
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

    async insertarImagen(blob, nombreCapa, capaId) {
      const bmp = await createImageBitmap(blob)
      // Encaje «contain» centrado: entra entera y a la mayor escala que quepa.
      const esc = Math.min(ancho / bmp.width, alto / bmp.height)
      const w = Math.max(1, Math.round(bmp.width * esc))
      const h = Math.max(1, Math.round(bmp.height * esc))
      const x = Math.round((ancho - w) / 2)
      const y = Math.round((alto - h) / 2)
      let c: CapaViva
      const nueva = capas.length < MAX_CAPAS
      if (nueva) {
        // Capa propia: nace encima de todas y activa (como `agregarCapa`).
        c = crearCapa(nombreCapa, capaId)
        c.sucia = true
        capas.push(c)
        ordenarDom()
        activaId = c.capaId
      } else {
        c = paraPintar()
        snapshot(c)
      }
      c.ctx.drawImage(bmp, x, y, w, h)
      bmp.close()
      return { nueva, capaId: c.capaId, caja: { x, y, w, h } }
    },

    cajaActiva: () => cajaDe(activa()),

    empezarTransformar() {
      const c = paraPintar()
      const caja = cajaDe(c)
      if (!caja) return null
      const copia = document.createElement('canvas')
      copia.width = ancho
      copia.height = alto
      copia.getContext('2d')!.drawImage(c.canvas, 0, 0)
      // El snapshot de deshacer se guarda aparte: solo entra en la pila si el
      // gesto cambió algo (un tap sobre el objeto no es una acción).
      transf = { capaId: c.capaId, copia, caja, img: foto(c) }
      return caja
    },

    transformar(destino) {
      if (!transf) return
      const c = porId(transf.capaId)
      if (!c) return
      const { copia, caja } = transf
      c.ctx.clearRect(0, 0, ancho, alto)
      c.ctx.drawImage(
        copia,
        caja.x,
        caja.y,
        caja.w,
        caja.h,
        destino.x,
        destino.y,
        Math.max(1, destino.w),
        Math.max(1, destino.h),
      )
    },

    terminarTransformar(cambio) {
      if (!transf) return
      const { capaId, img } = transf
      transf = null
      if (!cambio) return
      pila.push({ capaId, img })
      if (pila.length > MAX_DESHACER) pila.shift()
      rehacerPila = []
      const c = porId(capaId)
      if (c) c.sucia = true
    },

    cancelarTransformar() {
      if (!transf) return
      const { capaId, img } = transf
      transf = null
      porId(capaId)?.ctx.putImageData(img, 0, 0)
    },

    separarObjetos(nombreDe) {
      const c = activa()
      const libres = MAX_CAPAS - capas.length
      if (libres <= 0) return 0
      const img = foto(c)
      const d = img.data
      const n = ancho * alto
      const pintado = new Uint8Array(n)
      let opacos = 0
      for (let i = 0; i < n; i++) {
        if (d[i * 4 + 3] > ALFA_PINTADO) {
          pintado[i] = 1
          opacos++
        }
      }
      if (!opacos) return 0
      // Imagen opaca (foto, IA): su fondo liso se queda en la capa; lo demás son objetos.
      let conFondo = false
      if (opacos >= n * 0.97) {
        const fondo = fondoDe(d, ancho, alto)
        if (fondo) {
          conFondo = true
          for (let i = 0; i < n; i++) if (fondo[i]) pintado[i] = 0
        }
      }
      const { etiqueta, tamanos } = etiquetar(dilatar(pintado, ancho, alto, RADIO_UNION), ancho, alto)
      // Tamaño REAL de cada mancha (sin el ensanche), de mayor a menor.
      const reales = new Array<number>(tamanos.length).fill(0)
      for (let i = 0; i < n; i++) if (pintado[i]) reales[etiqueta[i]]++
      const orden = reales
        .map((tam, L) => ({ L, tam }))
        .filter((o) => o.L > 0 && o.tam >= n * FRACCION_MIN_OBJETO)
        .sort((a, b) => b.tam - a.tam)
      // Sin fondo, la mancha mayor se queda en la capa original.
      const sueltas = (conFondo ? orden : orden.slice(1)).slice(0, libres)
      if (!sueltas.length) return 0
      const i0 = capas.indexOf(c)
      sueltas.forEach(({ L }, k) => {
        const nueva = crearCapa(nombreDe(k + 1))
        nueva.visible = c.visible
        nueva.opacidad = c.opacidad
        aplicarEstilo(nueva)
        const datos = nueva.ctx.createImageData(ancho, alto)
        const nd = datos.data
        for (let i = 0; i < n; i++) {
          if (!pintado[i] || etiqueta[i] !== L) continue
          const p = i * 4
          nd[p] = d[p]
          nd[p + 1] = d[p + 1]
          nd[p + 2] = d[p + 2]
          nd[p + 3] = d[p + 3]
          d[p + 3] = 0
        }
        nueva.ctx.putImageData(datos, 0, 0)
        nueva.sucia = true
        // La mayor queda justo encima de la original; las demás, en escalera.
        capas.splice(i0 + 1 + k, 0, nueva)
      })
      c.ctx.putImageData(img, 0, 0)
      c.sucia = true
      ordenarDom()
      activaId = capas[i0 + 1].capaId
      // Partir la capa no es deshacible: sus snapshots quedan rancios.
      pila = pila.filter((e) => e.capaId !== c.capaId)
      rehacerPila = rehacerPila.filter((e) => e.capaId !== c.capaId)
      return sueltas.length
    },

    redimensionar(nuevoAncho, nuevoAlto, escalar) {
      const viejoAncho = ancho
      const viejoAlto = alto
      ancho = nuevoAncho
      alto = nuevoAlto
      host.style.width = `${ancho}px`
      host.style.height = `${alto}px`
      for (const c of capas) {
        const copia = document.createElement('canvas')
        copia.width = viejoAncho
        copia.height = viejoAlto
        copia.getContext('2d')!.drawImage(c.canvas, 0, 0)
        // Cambiar el tamaño del canvas lo vacía: se repinta desde la copia.
        c.canvas.width = ancho
        c.canvas.height = alto
        if (escalar) c.ctx.drawImage(copia, 0, 0, viejoAncho, viejoAlto, 0, 0, ancho, alto)
        else c.ctx.drawImage(copia, Math.round((ancho - viejoAncho) / 2), Math.round((alto - viejoAlto) / 2))
        c.sucia = true
      }
      pila = []
      rehacerPila = []
      transf = null
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

    espejo: () => [espejoV, espejoH],

    capas: () => capas.map(({ capaId, nombre, visible, opacidad }) => ({ capaId, nombre, visible, opacidad })),
    capaActiva: () => activaId,

    activarCapa(capaId) {
      if (porId(capaId)) activaId = capaId
    },

    agregarCapa(nombre, capaId) {
      if (capas.length >= MAX_CAPAS || (capaId != null && porId(capaId))) return null
      const c = crearCapa(nombre, capaId)
      c.sucia = true
      capas.push(c)
      ordenarDom()
      activaId = c.capaId
      return c.capaId
    },

    duplicarCapa(capaId, nombre, nuevoId) {
      const origen = porId(capaId)
      if (!origen || capas.length >= MAX_CAPAS || (nuevoId != null && porId(nuevoId))) return null
      const c = crearCapa(nombre, nuevoId)
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

    enCapa(capaId, fn) {
      if (!porId(capaId)) return
      const antes = activaId
      activaId = capaId
      try {
        fn()
      } finally {
        activaId = antes
      }
    },

    sinHistorial(fn) {
      const antes = replay
      replay = true
      try {
        fn()
      } finally {
        replay = antes
      }
    },

    ponerBase(capaId, base) {
      const c = porId(capaId)
      if (!c) return
      c.ctx.clearRect(0, 0, ancho, alto)
      if (base) c.ctx.drawImage(base, 0, 0, ancho, alto)
      c.sucia = true
    },

    pintarEn(capaId, imagen, caja) {
      const c = porId(capaId)
      if (!c) return
      if (caja) c.ctx.drawImage(imagen, caja.x, caja.y, Math.max(1, caja.w), Math.max(1, caja.h))
      else c.ctx.drawImage(imagen, 0, 0, ancho, alto)
      c.sucia = true
    },

    transformarCaja(capaId, de, a) {
      const c = porId(capaId)
      if (!c) return
      const copia = document.createElement('canvas')
      copia.width = ancho
      copia.height = alto
      copia.getContext('2d')!.drawImage(c.canvas, 0, 0)
      c.ctx.clearRect(0, 0, ancho, alto)
      c.ctx.drawImage(copia, de.x, de.y, de.w, de.h, a.x, a.y, Math.max(1, a.w), Math.max(1, a.h))
      c.sucia = true
    },

    cargarCapas(nuevoAncho, nuevoAlto, nuevas) {
      pila = []
      rehacerPila = []
      transf = null
      trazando = false
      for (const c of capas) c.canvas.remove()
      capas = []
      ancho = nuevoAncho
      alto = nuevoAlto
      host.style.width = `${ancho}px`
      host.style.height = `${alto}px`
      for (const cd of nuevas) {
        const c = crearCapa(cd.nombre, cd.capaId)
        c.visible = cd.visible
        c.opacidad = cd.opacidad
        aplicarEstilo(c)
        if (cd.imagen) c.ctx.drawImage(cd.imagen, 0, 0, ancho, alto)
        c.sucia = true
        capas.push(c)
      }
      // Un snapshot sin capas dejaría el editor sin lienzo donde pintar.
      if (!capas.length) capas.push(crearCapa('1'))
      ordenarDom()
      activaId = capas[capas.length - 1].capaId
    },

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

    async capturarCapas() {
      // Las copias, TODAS antes del primer `await`: así el snapshot es de un
      // solo instante aunque siga entrando pintura mientras se codifica.
      const copias = capas.map((c) => {
        const k = document.createElement('canvas')
        k.width = ancho
        k.height = alto
        k.getContext('2d')!.drawImage(c.canvas, 0, 0)
        return { c, k }
      })
      const res: CapaDibujo[] = []
      for (const { c, k } of copias) {
        res.push({
          capaId: c.capaId,
          nombre: c.nombre,
          visible: c.visible,
          opacidad: c.opacidad,
          imagen: await aPng(k),
        })
      }
      return res
    },
  }
}
