import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { AjustesVivo, ClipAudio, NotaAudio, PistaAudio, ProyectoAudio } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import {
  ALTO_CARRIL,
  ALTO_REGLA,
  CUERDAS_TAB,
  esInstrumentoBateria,
  MAX_COMPASES,
  PALETA_PISTAS,
  PASOS_POR_COMPAS,
  TONO_ALTO,
  TONO_BAJO,
  TONOS_BATERIA,
  MAX_NOTAS_PISTA,
  segPorPaso,
} from './constantes'
import { posicion, transporteStore } from './motor'
import {
  CENTRO_FA,
  CENTRO_SOL,
  dibujarSilencio,
  dibujarVoz,
  type Entrada,
  figurasDe,
  lineasAdicionalesDe,
  radioCabeza,
  silenciosDe,
} from './notacion'

/**
 * El timeline: UN canvas 2D (divs por nota o SVG no aguantan 512×61 celdas
 * con scroll en un teléfono modesto; mismo criterio que los juegos del repo).
 * De arriba a abajo: la regla de compases, UN CARRIL POR PISTA (la vista de
 * composición: las notas de cada pista en miniatura, tap = activarla) y el
 * piano roll de la pista activa — todo comparte eje de tiempo, scroll y zoom.
 * Redibuja solo al cambiar algo, y con rAF continuo ÚNICAMENTE mientras suena
 * (el playhead). Un solo puntero: tap = añadir/borrar; arrastre desde una nota
 * = mover (o estirar desde su último cuarto); arrastre en vacío = paneo; la
 * regla fija la posición de arranque (o el bucle, si está activo).
 */

const REGLA = ALTO_REGLA
const GUTTER = 44
const NEGRAS = new Set([1, 3, 6, 8, 10])
const ZOOMS = [0.5, 1, 1.5, 2]

// ─── Vista de partitura (escritura musical tradicional) ────────────────────
// El eje vertical pasa de semitonos a GRADOS diatónicos: cada línea/espacio del
// pentagrama es un grado; los sostenidos comparten posición con su natural y
// llevan ♯. Pentagrama doble: sol (E4..F5) y fa (G2..A3), C4 en línea adicional.
const MEDIO_DIAT = 6 // px por grado (línea↔espacio)
const MARGEN_PARTITURA = 14
const GRADO_DE_SEMITONO = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]
const ES_SOSTENIDO = [false, true, false, true, false, false, true, false, true, false, true, false]
const SEMITONO_DE_GRADO = [0, 2, 4, 5, 7, 9, 11]
const diatDe = (midi: number) => Math.floor(midi / 12) * 7 + GRADO_DE_SEMITONO[((midi % 12) + 12) % 12]
const midiDe = (diat: number) => Math.floor(diat / 7) * 12 + SEMITONO_DE_GRADO[((diat % 7) + 7) % 7]
const DIAT_MAX = diatDe(TONO_ALTO)
const DIAT_MIN = diatDe(TONO_BAJO)
/** Grados de las 10 líneas (sol arriba, fa abajo); todos impares — las líneas
    adicionales de una nota fuera de pentagrama también caen en grado impar. */
const LINEAS_PENTAGRAMA = [45, 43, 41, 39, 37, 33, 31, 29, 27, 25]
/** Gutter ancho en partitura: clave + hasta 7 alteraciones de la armadura. */
const GUTTER_PARTITURA = 92

// Armadura por tónica MAYOR (índice = clase de tono): + sostenidos, − bemoles;
// las enarmónicas eligen la de MENOS alteraciones (C# → Db, 5♭). Las menores y
// pentatónicas usan su relativa; el blues, la de su menor.
const ARMADURA_MAYOR = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5]
/** Grados (C=0..B=6) que la armadura va alterando, en orden. */
const ORDEN_SOSTENIDOS = [3, 0, 4, 1, 5, 2, 6] // F C G D A E B
const ORDEN_BEMOLES = [6, 2, 5, 1, 4, 0, 3] // B E A D G C F
/** Posiciones (grado diatónico) de cada alteración en el pentagrama de sol; fa = −14. */
const SOSTENIDOS_SOL = [45, 42, 46, 43, 40, 44, 41]
const BEMOLES_SOL = [41, 44, 40, 43, 39, 42, 38]

function armaduraDe(escala: NonNullable<AjustesVivo['escala']>): number {
  const mayor = escala.tipo === 'mayor' || escala.tipo === 'pentaMayor'
  return ARMADURA_MAYOR[(mayor ? escala.tonica : (escala.tonica + 3) % 12 + 12) % 12]
}

type Modo =
  | { tipo: 'pan' }
  | { tipo: 'tap'; x0: number; y0: number; paso: number; tono: number; notaIdx: number | null }
  | { tipo: 'nota'; idx: number; borde: boolean; x0: number; y0: number; base: NotaAudio; movida: boolean }
  | { tipo: 'regla'; paso0: number; x0: number; movido: boolean }
  | { tipo: 'carril'; idx: number; x0: number; y0: number }
  | { tipo: 'clip'; idx: number; x0: number; base: number; movido: boolean }

/** Alto del área de clips de una pista de audio (sin filas: un solo carril). */
const ALTO_AREA_AUDIO = 112

export function PianoRoll({
  proyecto,
  pista,
  colorIdx,
  version,
  posInicio,
  loop,
  escala,
  velocidadNueva = 100,
  expandido,
  onExpandir,
  onCascada,
  onActiva,
  onNotas,
  onClips,
  picosClips,
  onPosInicio,
  onLoop,
}: {
  proyecto: ProyectoAudio
  pista: PistaAudio
  colorIdx: number
  /** Cambia con cada mutación externa de notas: fuerza el redibujo. */
  version: number
  posInicio: number
  loop: { inicio: number; fin: number } | null
  /** Escala activa del proyecto: en partitura pinta su armadura. */
  escala?: AjustesVivo['escala']
  /** Velocidad de las notas nuevas (el chip «Fuerza» de la batería). */
  velocidadNueva?: number
  /** El timeline a pantalla completa (el editor esconde panel y teclado). */
  expandido: boolean
  onExpandir: () => void
  /** Tercera vista del timeline: la cascada de práctica (vertical). */
  onCascada?: () => void
  /** Tap en un carril de la vista de composición: activa esa pista. */
  onActiva: (pistaId: string) => void
  onNotas: (notas: NotaAudio[]) => void
  /** Cambia los clips de la pista de audio activa (arrastre horizontal en su carril). */
  onClips?: (clips: ClipAudio[]) => void
  /** Picos de onda por `grabacionId`; null = sin blob en este dispositivo (se pinta «!»). */
  picosClips?: Map<number, number[] | null>
  onPosInicio: (paso: number) => void
  onLoop: (loop: { inicio: number; fin: number } | null) => void
}) {
  const t = useT()
  const [zoom, setZoom] = useState(1)
  const [partitura, setPartitura] = useState(false)
  const estado = useSyncExternalStore(transporteStore.subscribe, transporteStore.getSnapshot)
  const contRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scroll = useRef({ x: 0, y: 0 })
  const modo = useRef<Modo | null>(null)
  const punteroActivo = useRef<number | null>(null)
  /** Copia de trabajo durante un arrastre de nota (se comete al soltar). */
  const trabajo = useRef<NotaAudio[] | null>(null)
  /** Copia de trabajo durante el arrastre de un clip de audio. */
  const trabajoClips = useRef<ClipAudio[] | null>(null)
  const durUltima = useRef(2)

  const esBateria = esInstrumentoBateria(pista.instrumento)
  const esAudio = pista.tipo === 'audio'
  /** Ancho temporal de los clips: sus segundos al BPM del proyecto. */
  const spbProyecto = segPorPaso(proyecto.bpm)
  // El zoom escala LOS DOS ejes: ancho de paso y alto de fila/pentagrama.
  const altoFila = (esBateria ? 32 : 14) * zoom
  const filas = esBateria ? TONOS_BATERIA.length : TONO_ALTO - TONO_BAJO + 1
  const anchoPaso = 8 * zoom
  const medioDiat = MEDIO_DIAT * zoom
  const margenPartitura = MARGEN_PARTITURA * zoom
  const altoPartitura = (DIAT_MAX - DIAT_MIN) * medioDiat + margenPartitura * 2
  const totalPasos = proyecto.compases * PASOS_POR_COMPAS
  /** Donde termina la vista de composición (regla + carriles) y empieza el roll. */
  const topeRoll = REGLA + proyecto.pistas.length * ALTO_CARRIL
  /** Partitura solo para pistas melódicas (la batería tiene su secuenciador). */
  const modoPartitura = partitura && !esBateria && !esAudio
  /** Guitarra/bajo sin partitura → TABLATURA (cuerdas grave→aguda). */
  const cuerdas = CUERDAS_TAB[pista.instrumento]
  const modoTab = !modoPartitura && !!cuerdas
  const espacioCuerda = 20 * zoom
  const margenTab = 14 * zoom
  const altoTab = cuerdas ? (cuerdas.length - 1) * espacioCuerda + margenTab * 2 : 0
  /** Cuerda donde se toca/dibuja una nota: la más aguda cuyo aire no la rebasa. */
  const cuerdaDe = (midi: number) => {
    if (!cuerdas) return 0
    for (let i = cuerdas.length - 1; i > 0; i--) if (midi >= cuerdas[i]) return i
    return 0
  }
  /** Origen X del tiempo: en partitura el gutter crece para la clave + armadura.
      Expandido, la vista de teclas pierde el piano del borde: todo el ancho para las notas. */
  const G = modoPartitura ? GUTTER_PARTITURA : expandido && !modoTab && !esBateria && !esAudio ? 0 : GUTTER
  /** Hasta dónde se puede desplazar/escribir (la canción crece sola al editar). */
  const pasosLibres = MAX_COMPASES * PASOS_POR_COMPAS
  const armadura = modoPartitura && escala ? armaduraDe(escala) : 0
  const gradosAlterados = new Set((armadura > 0 ? ORDEN_SOSTENIDOS : ORDEN_BEMOLES).slice(0, Math.abs(armadura)))
  /** Grado donde se DIBUJA la nota: en tonalidades con bemoles el sostenido se
      reescribe como bemol del grado siguiente (La# → Si♭). */
  const diatVisualDe = (midi: number) =>
    armadura < 0 && ES_SOSTENIDO[((midi % 12) + 12) % 12] ? diatDe(midi) + 1 : diatDe(midi)

  // Batería de arriba a abajo: hat abierto, hat, caja, bombo.
  const filaDe = (tono: number) =>
    esBateria ? TONOS_BATERIA.length - 1 - (TONOS_BATERIA as readonly number[]).indexOf(tono) : TONO_ALTO - tono
  const tonoDe = (fila: number) =>
    esBateria ? TONOS_BATERIA[TONOS_BATERIA.length - 1 - fila] ?? null : TONO_ALTO - fila

  const dibujar = () => {
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

    // Clamp del scroll: hasta el tope de la canción posible (no el actual — se
    // puede pasear y escribir a la derecha; los compases crecen al editar).
    const maxX = Math.max(0, pasosLibres * anchoPaso - (W - G))
    const contenidoAlto = modoPartitura ? altoPartitura : modoTab ? altoTab : esAudio ? ALTO_AREA_AUDIO : filas * altoFila
    const maxY = Math.max(0, contenidoAlto - (H - topeRoll))
    scroll.current.x = Math.max(0, Math.min(maxX, scroll.current.x))
    scroll.current.y = Math.max(0, Math.min(maxY, scroll.current.y))
    const sx = scroll.current.x
    const sy = scroll.current.y
    /** Centro vertical de un grado diatónico en pantalla (vista de partitura). */
    const yDiat = (diat: number) => topeRoll + margenPartitura + (DIAT_MAX - diat) * medioDiat - sy
    /** Centro vertical de una cuerda (tablatura; la aguda arriba). */
    const yCuerda = (i: number) =>
      topeRoll + margenTab + ((cuerdas?.length ?? 1) - 1 - i) * espacioCuerda - sy

    const pasoIni = Math.floor(sx / anchoPaso)
    const pasoFin = Math.min(pasosLibres, Math.ceil((sx + W - G) / anchoPaso))
    if (modoPartitura) {
      // Líneas de compás (en partitura la rejilla fina sobra) y pentagramas.
      for (let p = Math.ceil(pasoIni / PASOS_POR_COMPAS) * PASOS_POR_COMPAS; p <= pasoFin; p += PASOS_POR_COMPAS) {
        const x = G + p * anchoPaso - sx
        ctx.strokeStyle = 'rgba(255,255,255,0.22)'
        ctx.beginPath()
        ctx.moveTo(x, Math.max(topeRoll, yDiat(46)))
        ctx.lineTo(x, Math.min(H, yDiat(24)))
        ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'
      for (const linea of LINEAS_PENTAGRAMA) {
        const y = yDiat(linea)
        if (y < topeRoll + 1 || y > H) continue
        ctx.beginPath()
        ctx.moveTo(G, y + 0.5)
        ctx.lineTo(W, y + 0.5)
        ctx.stroke()
      }
    } else if (modoTab && cuerdas) {
      // Tablatura: líneas de compás + una línea por cuerda.
      for (let p = Math.ceil(pasoIni / PASOS_POR_COMPAS) * PASOS_POR_COMPAS; p <= pasoFin; p += PASOS_POR_COMPAS) {
        const x = G + p * anchoPaso - sx
        ctx.strokeStyle = 'rgba(255,255,255,0.22)'
        ctx.beginPath()
        ctx.moveTo(x, yCuerda(cuerdas.length - 1) - espacioCuerda / 2)
        ctx.lineTo(x, yCuerda(0) + espacioCuerda / 2)
        ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      for (let i = 0; i < cuerdas.length; i++) {
        const y = yCuerda(i)
        if (y < topeRoll + 1 || y > H) continue
        ctx.beginPath()
        ctx.moveTo(G, y + 0.5)
        ctx.lineTo(W, y + 0.5)
        ctx.stroke()
      }
    } else if (esAudio) {
      // Pista de audio: sin filas — solo las líneas de compás bajo los clips.
      for (let p = Math.ceil(pasoIni / PASOS_POR_COMPAS) * PASOS_POR_COMPAS; p <= pasoFin; p += PASOS_POR_COMPAS) {
        const x = G + p * anchoPaso - sx
        ctx.strokeStyle = 'rgba(255,255,255,0.22)'
        ctx.beginPath()
        ctx.moveTo(x, topeRoll)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
    } else if (esBateria) {
      // Secuenciador de pasos: una celda por golpe posible, acento por negra y compás.
      for (let f = Math.floor(sy / altoFila); f <= Math.min(filas - 1, Math.floor((sy + H - topeRoll) / altoFila)); f++) {
        const y = topeRoll + f * altoFila - sy
        for (let p = pasoIni; p < pasoFin; p++) {
          const x = G + p * anchoPaso - sx
          ctx.fillStyle =
            p % PASOS_POR_COMPAS === 0
              ? 'rgba(255,255,255,0.07)'
              : p % 4 === 0
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(255,255,255,0.028)'
          ctx.fillRect(x + 1, y + 2, anchoPaso - 2, altoFila - 4)
        }
      }
      for (let p = Math.ceil(pasoIni / PASOS_POR_COMPAS) * PASOS_POR_COMPAS; p <= pasoFin; p += PASOS_POR_COMPAS) {
        const x = G + p * anchoPaso - sx
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'
        ctx.beginPath()
        ctx.moveTo(x, topeRoll)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
    } else {
      // Filas (zebra: teclas negras más oscuras).
      for (let f = Math.floor(sy / altoFila); f <= Math.min(filas - 1, Math.floor((sy + H - topeRoll) / altoFila)); f++) {
        const tono = tonoDe(f)
        const y = topeRoll + f * altoFila - sy
        const negra = tono != null && NEGRAS.has(((tono % 12) + 12) % 12)
        ctx.fillStyle = negra ? 'rgba(0,0,0,0.35)' : f % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.045)'
        ctx.fillRect(G, y, W - G, altoFila)
      }

      // Rejilla vertical: fina por paso, media por negra, fuerte por compás.
      for (let p = pasoIni; p <= pasoFin; p++) {
        const x = G + p * anchoPaso - sx
        const compas = p % PASOS_POR_COMPAS === 0
        const negra4 = p % 4 === 0
        ctx.strokeStyle = compas ? 'rgba(255,255,255,0.28)' : negra4 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'
        ctx.beginPath()
        ctx.moveTo(x, topeRoll)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
    }

    // Regla: fondo, bucle y números de compás.
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fillRect(0, 0, W, REGLA)
    if (loop) {
      ctx.fillStyle = 'rgba(250,204,21,0.25)'
      ctx.fillRect(G + loop.inicio * anchoPaso - sx, 0, (loop.fin - loop.inicio) * anchoPaso, REGLA)
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '10px system-ui'
    ctx.textBaseline = 'middle'
    for (let c = 0; c <= MAX_COMPASES; c++) {
      const x = G + c * PASOS_POR_COMPAS * anchoPaso - sx
      if (x < G - 20 || x > W) continue
      ctx.fillText(String(c + 1), x + 3, REGLA / 2)
    }
    // Marcador de arranque (triángulo).
    const xIni = G + posInicio * anchoPaso - sx
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.moveTo(xIni - 5, 2)
    ctx.lineTo(xIni + 5, 2)
    ctx.lineTo(xIni, REGLA - 3)
    ctx.closePath()
    ctx.fill()

    // Notas: primero las demás pistas en fantasma, la activa al final.
    const pintarNotas = (notas: NotaAudio[], color: string, alpha: number, soloTonoValido: boolean) => {
      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      for (const nota of notas) {
        if (soloTonoValido && esBateria && !(TONOS_BATERIA as readonly number[]).includes(nota[2])) continue
        const f = filaDe(nota[2])
        if (f < 0 || f >= filas) continue
        const x = G + nota[0] * anchoPaso - sx
        const y = topeRoll + f * altoFila - sy + 1
        const w = Math.max(3, nota[1] * anchoPaso - 1)
        if (x + w < G || x > W || y + altoFila < topeRoll || y > H) continue
        ctx.beginPath()
        // Batería: la nota LLENA su celda del secuenciador.
        if (esBateria) ctx.roundRect(x + 1, y + 1, anchoPaso - 2, altoFila - 4, 4)
        else ctx.roundRect(x, y, w, altoFila - 2, 3)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    // Tablatura: barra de duración sobre la cuerda + pastilla con el traste.
    const pintarTab = (notas: NotaAudio[], color: string) => {
      if (!cuerdas) return
      for (const nota of notas) {
        const i = cuerdaDe(nota[2])
        const traste = Math.max(0, nota[2] - cuerdas[i])
        const y = yCuerda(i)
        const x = G + nota[0] * anchoPaso - sx
        const w = Math.max(3, nota[1] * anchoPaso - 1)
        if (x + w < G || x > W || y < topeRoll + 3 || y > H) continue
        ctx.fillStyle = color
        ctx.fillRect(x + 2, y - 1, Math.max(2, w - 4), 2)
        const anchoPastilla = traste > 9 ? 18 : 14
        ctx.beginPath()
        ctx.roundRect(x, y - 7, anchoPastilla, 14, 4)
        ctx.fill()
        ctx.fillStyle = '#0f1115'
        ctx.font = 'bold 9px system-ui'
        const txt = String(traste)
        ctx.fillText(txt, x + anchoPastilla / 2 - txt.length * 2.5, y)
      }
    }
    // Partitura: cada nota se escribe con sus figuras (redonda, blanca, negra,
    // corchea, semicorchea; con puntillo; ligadas si no cabe en una o cruza el
    // compás) y una banda tenue marca hasta dónde llega (y desde dónde se
    // estira). Con armadura, sus alteraciones se OMITEN en la nota (y el
    // «extraño» lleva ♮/♯/♭); líneas adicionales fuera de los pentagramas.
    // Los silencios, solo en la pista activa: los huecos de UNA voz.
    const pintarPartitura = (notas: NotaAudio[], color: string, alpha: number, conSilencios: boolean) => {
      const rx = radioCabeza(medioDiat)
      // Un pulso de margen a cada lado: las barras de corcheas no lo cruzan, así
      // que un grupo cortado por el borde se pinta entero.
      const margen = 4 * anchoPaso
      const entradas: Entrada[] = []
      const simbolos: { x: number; y: number; texto: string }[] = []
      ctx.globalAlpha = alpha
      for (const nota of notas) {
        const sost = ES_SOSTENIDO[((nota[2] % 12) + 12) % 12]
        const diat = diatVisualDe(nota[2])
        const grado = ((diat % 7) + 7) % 7
        let simbolo = ''
        if (sost && armadura < 0) simbolo = gradosAlterados.has(grado) ? '' : '♭'
        else if (sost) simbolo = gradosAlterados.has(grado) ? '' : '♯'
        else if (gradosAlterados.has(grado)) simbolo = '♮'
        const y = yDiat(diat)
        const x = G + nota[0] * anchoPaso - sx
        const w = Math.max(3, nota[1] * anchoPaso - 1)
        // Las plicas asoman hasta 7 grados por encima o por debajo de la cabeza.
        if (x + w < G - margen || x > W + margen || y < topeRoll - medioDiat * 7 || y > H + medioDiat * 7) continue
        ctx.globalAlpha = alpha * 0.22
        ctx.fillStyle = color
        ctx.fillRect(x, y - 1, w, 2)
        ctx.globalAlpha = alpha
        const adicionales = lineasAdicionalesDe(diat)
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'
        let xAnterior: number | undefined
        for (const tramo of figurasDe(nota[0], nota[1])) {
          const xt = G + tramo.paso * anchoPaso - sx + rx
          if (xt - rx > W + margen) break
          for (const l of adicionales) {
            const yl = yDiat(l)
            ctx.beginPath()
            ctx.moveTo(xt - rx - medioDiat * 0.6, yl + 0.5)
            ctx.lineTo(xt + rx + medioDiat * 0.6, yl + 0.5)
            ctx.stroke()
          }
          entradas.push({ paso: tramo.paso, figura: tramo.figura, x: xt, y, diat, xAnterior })
          xAnterior = xt
        }
        if (simbolo) simbolos.push({ x: x - medioDiat * 1.4, y, texto: simbolo })
      }
      ctx.fillStyle = color
      ctx.strokeStyle = color
      dibujarVoz(ctx, entradas, medioDiat)
      ctx.font = `${Math.round(7 + 3 * zoom)}px system-ui`
      for (const s of simbolos) ctx.fillText(s.texto, s.x, s.y)
      if (conSilencios) {
        const desde = Math.floor(pasoIni / PASOS_POR_COMPAS) * PASOS_POR_COMPAS
        const hasta = Math.min(totalPasos, Math.ceil(pasoFin / PASOS_POR_COMPAS) * PASOS_POR_COMPAS)
        ctx.globalAlpha = alpha * 0.8
        ctx.fillStyle = color
        for (const s of silenciosDe(notas, desde, hasta)) {
          const x = G + s.paso * anchoPaso - sx + 2
          if (x < G - 24 || x > W) continue
          // En el pentagrama donde vive la voz en ese compás (el de sol si hay duda).
          const c0 = Math.floor(s.paso / PASOS_POR_COMPAS) * PASOS_POR_COMPAS
          const enCompas = notas.filter((n) => n[0] < c0 + PASOS_POR_COMPAS && n[0] + n[1] > c0)
          const centro = enCompas.length > 0 && enCompas.every((n) => diatDe(n[2]) < 35) ? CENTRO_FA : CENTRO_SOL
          // Redonda y blanca cuelgan/reposan en el espacio de encima de la línea central.
          dibujarSilencio(ctx, x, yDiat(s.pasos >= 8 ? centro + 1 : centro), medioDiat, s.glifo)
        }
      }
      ctx.globalAlpha = 1
    }
    // Clips de la pista de audio activa: bloque redondeado con su onda (o «!» sin blob).
    const pintarClips = () => {
      const clips = trabajoClips.current ?? pista.clips ?? []
      const color = PALETA_PISTAS[colorIdx % PALETA_PISTAS.length]
      const yBloque = topeRoll + 12 - sy
      const alto = ALTO_AREA_AUDIO - 24
      ctx.font = '10px system-ui'
      for (const clip of clips) {
        const x = G + clip.inicio * anchoPaso - sx
        const w = Math.max(6, (clip.duracionSeg / spbProyecto) * anchoPaso)
        if (x + w < G || x > W) continue
        const picos = picosClips?.get(clip.grabacionId)
        ctx.globalAlpha = 0.16
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(x, yBloque, w, alto, 6)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.strokeStyle = color
        ctx.beginPath()
        ctx.roundRect(x, yBloque, w, alto, 6)
        ctx.stroke()
        if (picos === null) {
          // El clip existe pero su grabación vive en otro dispositivo: no puede sonar.
          ctx.fillStyle = 'rgba(248,113,113,0.9)'
          ctx.fillText('!', x + w / 2 - 2, yBloque + alto / 2)
        } else if (picos && picos.length > 0) {
          ctx.fillStyle = color
          const cy = yBloque + alto / 2
          for (let i = 0; i < picos.length; i++) {
            const xi = x + 2 + ((w - 4) * i) / picos.length
            if (xi < G || xi > W) continue
            const h = Math.max(1, picos[i] * (alto - 12))
            ctx.fillRect(xi, cy - h / 2, 1, h)
          }
        }
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.fillText(clip.nombre, Math.max(G + 4, x + 6), yBloque + 9)
      }
    }
    // En tablatura solo la pista activa (los fantasmas confundirían los trastes);
    // la pista de audio no comparte mundo con ninguna.
    if (!modoTab && !esAudio) {
      for (let i = 0; i < proyecto.pistas.length; i++) {
        const otra = proyecto.pistas[i]
        // Solo las pistas del mismo mundo: melódicas entre sí, batería con batería.
        if (otra.pistaId === pista.pistaId || esInstrumentoBateria(otra.instrumento) !== esBateria) continue
        if (modoPartitura) pintarPartitura(otra.notas, PALETA_PISTAS[i % PALETA_PISTAS.length], 0.28, false)
        else pintarNotas(otra.notas, PALETA_PISTAS[i % PALETA_PISTAS.length], 0.28, true)
      }
    }
    const activas = trabajo.current ?? pista.notas
    if (esAudio) pintarClips()
    else if (modoPartitura) pintarPartitura(activas, PALETA_PISTAS[colorIdx % PALETA_PISTAS.length], 1, true)
    else if (modoTab) pintarTab(activas, PALETA_PISTAS[colorIdx % PALETA_PISTAS.length])
    else pintarNotas(activas, PALETA_PISTAS[colorIdx % PALETA_PISTAS.length], 1, false)

    // Gutter: claves + armadura (partitura), teclas o etiquetas de batería.
    // En partitura/tablatura va SIN fondo propio (clearRect deja el fondo de la
    // tarjeta, igual que el resto del lienzo): solo borra lo que scrollea debajo.
    if (G > 0) {
      if (modoPartitura || modoTab) {
        ctx.clearRect(0, topeRoll, G, H - topeRoll)
      } else {
        ctx.fillStyle = '#12141a'
        ctx.fillRect(0, topeRoll, G, H - topeRoll)
      }
    }
    ctx.font = '9px system-ui'
    if (modoPartitura) {
      // Las líneas siguen POR el gutter: el pentagrama toca la clave.
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'
      for (const linea of LINEAS_PENTAGRAMA) {
        const y = yDiat(linea)
        if (y < topeRoll + 1 || y > H) continue
        ctx.beginPath()
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(G, y + 0.5)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = `${Math.round(Math.min(44, 30 * zoom))}px serif`
      ctx.fillText('𝄞', 4, yDiat(41))
      ctx.font = `${Math.round(Math.min(36, 24 * zoom))}px serif`
      ctx.fillText('𝄢', 6, yDiat(30))
      // Armadura de la escala activa, en los dos pentagramas.
      if (armadura !== 0) {
        const glifo = armadura > 0 ? '♯' : '♭'
        const posiciones = armadura > 0 ? SOSTENIDOS_SOL : BEMOLES_SOL
        ctx.font = '13px system-ui'
        for (let i = 0; i < Math.abs(armadura); i++) {
          const x = 26 + i * 8
          ctx.fillText(glifo, x, yDiat(posiciones[i]))
          ctx.fillText(glifo, x, yDiat(posiciones[i] - 14))
        }
      }
    } else if (modoTab && cuerdas) {
      // Las líneas de cuerda cruzan el gutter y cada una lleva su nota al aire.
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      for (let i = 0; i < cuerdas.length; i++) {
        const y = yCuerda(i)
        if (y < topeRoll + 1 || y > H) continue
        ctx.beginPath()
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(G, y + 0.5)
        ctx.stroke()
      }
      const NOMBRES_CLASE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.font = '10px system-ui'
      for (let i = 0; i < cuerdas.length; i++) {
        const y = yCuerda(i)
        if (y < topeRoll + 3 || y > H) continue
        ctx.fillText(NOMBRES_CLASE[cuerdas[i] % 12], 5, y - 1)
      }
    } else if (!esAudio && G > 0) {
      for (let f = Math.floor(sy / altoFila); f <= Math.min(filas - 1, Math.floor((sy + H - topeRoll) / altoFila)); f++) {
        const tono = tonoDe(f)
        if (tono == null) continue
        const y = topeRoll + f * altoFila - sy
        if (esBateria) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)'
          const nombres: Record<number, string> = {
            36: 'Kick', 38: 'Snare', 42: 'Hat', 46: 'Open', 39: 'Clap', 41: 'Tom L', 48: 'Tom H', 49: 'Crash',
          }
          ctx.fillText(nombres[tono] ?? '', 4, y + altoFila / 2)
        } else {
          const semitono = ((tono % 12) + 12) % 12
          ctx.fillStyle = NEGRAS.has(semitono) ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.85)'
          ctx.fillRect(0, y + 0.5, G - 4, altoFila - 1)
          if (semitono === 0) {
            ctx.fillStyle = '#111'
            ctx.fillText(`C${Math.floor(tono / 12) - 1}`, 4, y + altoFila / 2)
          }
        }
      }
    }

    // ─── Carriles de la composición: la miniatura de CADA pista bajo la regla ─
    ctx.fillStyle = '#101318'
    ctx.fillRect(0, REGLA, W, topeRoll - REGLA)
    for (let p = Math.ceil(pasoIni / 4) * 4; p <= pasoFin; p += 4) {
      // Solo negras y compases: en miniatura la rejilla fina es ruido.
      const x = G + p * anchoPaso - sx
      ctx.strokeStyle = p % PASOS_POR_COMPAS === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)'
      ctx.beginPath()
      ctx.moveTo(x, REGLA)
      ctx.lineTo(x, topeRoll)
      ctx.stroke()
    }
    for (let i = 0; i < proyecto.pistas.length; i++) {
      const carril = proyecto.pistas[i]
      const y0 = REGLA + i * ALTO_CARRIL
      const color = PALETA_PISTAS[i % PALETA_PISTAS.length]
      const esActiva = carril.pistaId === pista.pistaId
      if (esActiva) {
        ctx.fillStyle = 'rgba(255,255,255,0.07)'
        ctx.fillRect(0, y0, W, ALTO_CARRIL)
      }
      // Banda de color de la pista en la franja del gutter.
      ctx.fillStyle = color
      ctx.fillRect(0, y0, 3, ALTO_CARRIL)
      // Miniatura: tono → altura dentro del carril (batería: sus 4 filas fijas;
      // pista de audio: un bloque por clip).
      ctx.globalAlpha = esActiva ? 0.95 : 0.6
      const rango = TONO_ALTO - TONO_BAJO
      if (carril.tipo === 'audio') {
        for (const clip of carril.clips ?? []) {
          const x = G + clip.inicio * anchoPaso - sx
          const w = Math.max(4, (clip.duracionSeg / spbProyecto) * anchoPaso)
          if (x + w < G || x > W) continue
          ctx.beginPath()
          ctx.roundRect(x, y0 + 5, w, ALTO_CARRIL - 10, 4)
          ctx.fill()
        }
      } else {
        for (const nota of carril.notas) {
          const x = G + nota[0] * anchoPaso - sx
          const w = Math.max(2, nota[1] * anchoPaso - 1)
          if (x + w < G || x > W) continue
          const frac =
            esInstrumentoBateria(carril.instrumento)
              ? ((TONOS_BATERIA as readonly number[]).indexOf(nota[2]) + 0.5) / TONOS_BATERIA.length
              : Math.max(0, Math.min(1, (nota[2] - TONO_BAJO) / rango))
          const y = y0 + (ALTO_CARRIL - 8) * (1 - frac) + 2
          ctx.fillRect(x, y, w, 3)
        }
      }
      ctx.globalAlpha = 1
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.beginPath()
      ctx.moveTo(0, y0 + ALTO_CARRIL - 0.5)
      ctx.lineTo(W, y0 + ALTO_CARRIL - 0.5)
      ctx.stroke()
    }

    // Más allá del final ACTUAL de la canción todo se atenúa (se puede escribir
    // ahí: los compases crecen solos al soltar la nota).
    const xFin = G + totalPasos * anchoPaso - sx
    if (xFin < W) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(Math.max(G, xFin), REGLA, W - Math.max(G, xFin), H - REGLA)
    }

    // Playhead.
    if (estado !== 'parado') {
      const x = G + posicion() * anchoPaso - sx
      if (x >= G && x <= W) {
        ctx.strokeStyle = '#f8fafc'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
        ctx.lineWidth = 1
      }
    }
  }

  const pedirDibujo = useRef(0)
  const dibujarPronto = () => {
    window.cancelAnimationFrame(pedirDibujo.current)
    pedirDibujo.current = window.requestAnimationFrame(dibujar)
  }

  // Redibuja al cambiar datos/vista, al re-medir el contenedor y en vivo mientras suena.
  useEffect(() => {
    dibujarPronto()
    const cont = contRef.current
    if (!cont) return
    const ro = new ResizeObserver(dibujarPronto)
    ro.observe(cont)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redibujo imperativo
  }, [version, zoom, partitura, expandido, pista.pistaId, proyecto.compases, loop, posInicio, estado, esBateria])

  useEffect(() => {
    if (estado === 'parado') return
    let id = 0
    const paso = () => {
      dibujar()
      id = window.requestAnimationFrame(paso)
    }
    id = window.requestAnimationFrame(paso)
    return () => window.cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bucle de playhead
  }, [estado])

  // ─── Puntero ─────────────────────────────────────────────────────────────
  const puntoDe = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { cx: e.clientX - r.left, cy: e.clientY - r.top }
  }

  const alBajar = (e: React.PointerEvent) => {
    if (punteroActivo.current != null) return // un solo puntero; el 2.º se ignora
    punteroActivo.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    const { cx, cy } = puntoDe(e)
    if (cy < REGLA) {
      const paso = Math.max(0, Math.min(totalPasos, Math.round((cx - G + scroll.current.x) / anchoPaso)))
      modo.current = { tipo: 'regla', paso0: paso, x0: cx, movido: false }
      return
    }
    if (cy < topeRoll) {
      // Vista de composición: tap = activar esa pista; arrastre = paneo.
      modo.current = { tipo: 'carril', idx: Math.floor((cy - REGLA) / ALTO_CARRIL), x0: cx, y0: cy }
      return
    }
    if (cx < G) {
      modo.current = { tipo: 'pan' }
      return
    }
    if (esAudio) {
      // Área de clips: arrastre horizontal sobre un clip lo mueve; en vacío, paneo.
      // Borrar NO va por tap (una grabación no se quita por un toque accidental).
      const pasoClip = (cx - G + scroll.current.x) / anchoPaso
      const clips = pista.clips ?? []
      const idx = clips.findIndex((c) => pasoClip >= c.inicio && pasoClip <= c.inicio + c.duracionSeg / spbProyecto)
      if (idx >= 0) {
        trabajoClips.current = clips.map((c) => ({ ...c }))
        modo.current = { tipo: 'clip', idx, x0: cx, base: clips[idx].inicio, movido: false }
      } else {
        modo.current = { tipo: 'pan' }
      }
      return
    }
    const pasoF = (cx - G + scroll.current.x) / anchoPaso
    let tono: number | null
    let idx: number
    if (modoPartitura) {
      // El eje vertical son grados diatónicos; el tap produce la nota del grado
      // SEGÚN la armadura (en Sol mayor, la línea de Fa da Fa#).
      const diat = DIAT_MAX - Math.round((cy - topeRoll + scroll.current.y - margenPartitura) / medioDiat)
      if (diat < DIAT_MIN || diat > DIAT_MAX) tono = null
      else {
        tono = midiDe(diat)
        if (gradosAlterados.has(((diat % 7) + 7) % 7)) tono += armadura > 0 ? 1 : -1
      }
      idx = pista.notas.findIndex((n) => diatVisualDe(n[2]) === diat && pasoF >= n[0] && pasoF < n[0] + n[1])
    } else if (modoTab && cuerdas) {
      // Tap en una cuerda = su nota al aire; el traste se ajusta arrastrando en vertical.
      const i = cuerdas.length - 1 - Math.round((cy - topeRoll + scroll.current.y - margenTab) / espacioCuerda)
      if (i < 0 || i >= cuerdas.length) {
        tono = null
        idx = -1
      } else {
        tono = cuerdas[i]
        idx = pista.notas.findIndex((n) => cuerdaDe(n[2]) === i && pasoF >= n[0] && pasoF < n[0] + n[1])
      }
    } else {
      const fila = Math.floor((cy - topeRoll + scroll.current.y) / altoFila)
      tono = tonoDe(fila)
      idx = pista.notas.findIndex((n) => n[2] === tono && pasoF >= n[0] && pasoF < n[0] + n[1])
    }
    if (tono == null || pasoF < 0) {
      modo.current = { tipo: 'pan' }
      return
    }
    if (idx >= 0) {
      const nota = pista.notas[idx]
      const borde = !esBateria && pasoF > nota[0] + nota[1] * 0.75
      trabajo.current = pista.notas.map((n) => [...n] as NotaAudio)
      modo.current = { tipo: 'nota', idx, borde, x0: cx, y0: cy, base: [...nota] as NotaAudio, movida: false }
    } else {
      modo.current = { tipo: 'tap', x0: cx, y0: cy, paso: Math.floor(pasoF), tono, notaIdx: null }
    }
  }

  const alMover = (e: React.PointerEvent) => {
    if (e.pointerId !== punteroActivo.current || !modo.current) return
    const { cx, cy } = puntoDe(e)
    const m = modo.current
    if (m.tipo === 'pan') {
      scroll.current.x -= e.movementX
      scroll.current.y -= e.movementY
      dibujarPronto()
      return
    }
    if (m.tipo === 'tap' || m.tipo === 'carril') {
      if (Math.hypot(cx - m.x0, cy - m.y0) > 6) {
        modo.current = { tipo: 'pan' }
      }
      return
    }
    if (m.tipo === 'clip') {
      const clips = trabajoClips.current
      if (!clips) return
      const nuevo = Math.max(0, Math.min(pasosLibres - 1, Math.round(m.base + (cx - m.x0) / anchoPaso)))
      if (nuevo !== clips[m.idx].inicio) m.movido = true
      clips[m.idx].inicio = nuevo
      dibujarPronto()
      return
    }
    if (m.tipo === 'regla') {
      // Arrastrar sobre la regla SIEMPRE crea/ajusta el bucle (y lo enciende);
      // el tap corto solo mueve el arranque.
      if (!m.movido && Math.abs(cx - m.x0) < 8) return
      m.movido = true
      const paso = Math.max(0, Math.min(totalPasos, (cx - G + scroll.current.x) / anchoPaso))
      const c0 = Math.floor(Math.min(m.paso0, paso) / PASOS_POR_COMPAS)
      const c1 = Math.floor(Math.max(m.paso0, paso) / PASOS_POR_COMPAS)
      onLoop({ inicio: c0 * PASOS_POR_COMPAS, fin: Math.min(totalPasos, (c1 + 1) * PASOS_POR_COMPAS) })
      return
    }
    // Mover/estirar la nota sobre la copia de trabajo (se comete al soltar).
    const notas = trabajo.current
    if (!notas) return
    const dPasos = Math.round((cx - m.x0) / anchoPaso)
    // En tab el vertical cambia de TRASTE (semitono cada 8 px, sin depender del zoom).
    const dFilas = Math.round((cy - m.y0) / (modoPartitura ? medioDiat : modoTab ? 8 : altoFila))
    if (dPasos !== 0 || dFilas !== 0) m.movida = true
    const nota = notas[m.idx]
    if (m.borde) {
      nota[1] = Math.max(1, Math.min(pasosLibres - nota[0], m.base[1] + dPasos))
      durUltima.current = nota[1]
    } else {
      nota[0] = Math.max(0, Math.min(pasosLibres - m.base[1], m.base[0] + dPasos))
      if (!esBateria) {
        // En partitura se transpone por GRADOS (el sostenido de origen se conserva).
        const objetivo = modoPartitura
          ? midiDe(diatDe(m.base[2]) - dFilas) + (ES_SOSTENIDO[((m.base[2] % 12) + 12) % 12] ? 1 : 0)
          : m.base[2] - dFilas
        // El bajo baja hasta su cuerda al aire más grave (E1 < TONO_BAJO del roll).
        const piso = cuerdas ? Math.min(TONO_BAJO, cuerdas[0]) : TONO_BAJO
        nota[2] = Math.max(piso, Math.min(TONO_ALTO, objetivo))
      }
    }
    dibujarPronto()
  }

  const alSoltar = (e: React.PointerEvent) => {
    if (e.pointerId !== punteroActivo.current) return
    punteroActivo.current = null
    const m = modo.current
    modo.current = null
    if (!m) return
    if (m.tipo === 'regla') {
      if (!m.movido) onPosInicio(Math.max(0, Math.min(totalPasos - 1, m.paso0)))
      return
    }
    if (m.tipo === 'carril') {
      const carril = proyecto.pistas[m.idx]
      if (carril) onActiva(carril.pistaId)
      return
    }
    if (m.tipo === 'clip') {
      const clips = trabajoClips.current
      trabajoClips.current = null
      if (clips && m.movido) onClips?.([...clips].sort((a, b) => a.inicio - b.inicio))
      return
    }
    if (m.tipo === 'tap') {
      if (pista.notas.length >= MAX_NOTAS_PISTA) return
      const dur = esBateria ? 1 : durUltima.current
      const nueva: NotaAudio = [
        Math.min(m.paso, pasosLibres - 1),
        Math.min(dur, pasosLibres - m.paso),
        m.tono,
        velocidadNueva,
      ]
      onNotas([...pista.notas, nueva].sort((a, b) => a[0] - b[0] || a[2] - b[2]))
      return
    }
    if (m.tipo === 'nota') {
      const notas = trabajo.current
      trabajo.current = null
      if (!notas) return
      if (!m.movida) {
        // Tap sobre la nota: se borra.
        onNotas(pista.notas.filter((_, i) => i !== m.idx))
      } else {
        onNotas(notas.sort((a, b) => a[0] - b[0] || a[2] - b[2]))
      }
    }
  }

  return (
    // El marco (borde/fondo) lo pone la tarjeta del timeline que integra pistas + roll.
    <div className="relative min-h-0 min-w-0 flex-1">
      <div ref={contRef} className="h-full overflow-hidden" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          onPointerDown={alBajar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
      <div className="absolute right-2 top-8 flex flex-col gap-1">
        <button
          type="button"
          onClick={onExpandir}
          aria-pressed={expandido}
          aria-label={expandido ? t('audio.roll.contraer', 'Contraer el timeline') : t('audio.roll.expandir', 'Expandir el timeline')}
          title={expandido ? t('audio.roll.contraer', 'Contraer el timeline') : t('audio.roll.expandir', 'Expandir el timeline')}
          className={`grid h-8 w-8 place-items-center rounded-lg border transition ${
            expandido
              ? 'border-white/50 bg-white/25 text-white'
              : 'border-white/10 bg-black/50 text-white/70 hover:bg-black/70'
          }`}
        >
          <Icono nombre="expandir" />
        </button>
        {/* Conmutador de vista: roll → partitura → cascada (batería/audio saltan la partitura). */}
        {(onCascada || (!esBateria && !esAudio)) &&
          (() => {
            const hayPartitura = !esBateria && !esAudio
            const aPartitura = hayPartitura && !partitura
            const siguiente = aPartitura
              ? t('audio.roll.verPartitura', 'Ver la partitura')
              : onCascada
                ? t('audio.roll.verCascada', 'Practicar en cascada')
                : t('audio.roll.verRoll', 'Ver el piano roll')
            return (
              <button
                type="button"
                onClick={() => {
                  if (aPartitura) return setPartitura(true)
                  // Cerrar el ciclo: al volver de la cascada se cae en el roll.
                  setPartitura(false)
                  onCascada?.()
                }}
                aria-label={siguiente}
                title={siguiente}
                className={`grid h-8 w-8 place-items-center rounded-lg border transition ${
                  partitura
                    ? 'border-white/50 bg-white/25 text-white'
                    : 'border-white/10 bg-black/50 text-white/70 hover:bg-black/70'
                }`}
              >
                <Icono nombre={aPartitura ? 'metronomo' : 'bajar'} />
              </button>
            )
          })()}
        <button
          type="button"
          onClick={() => setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + 1)])}
          disabled={zoom === ZOOMS[ZOOMS.length - 1]}
          aria-label={t('audio.roll.zoomMas', 'Acercar')}
          title={t('audio.roll.zoomMas', 'Acercar')}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/50 text-white/70 transition hover:bg-black/70 disabled:opacity-40"
        >
          <Icono nombre="agregar" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => ZOOMS[Math.max(0, ZOOMS.indexOf(z) - 1)])}
          disabled={zoom === ZOOMS[0]}
          aria-label={t('audio.roll.zoomMenos', 'Alejar')}
          title={t('audio.roll.zoomMenos', 'Alejar')}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/50 text-white/70 transition hover:bg-black/70 disabled:opacity-40"
        >
          <Icono nombre="quitar" />
        </button>
      </div>
    </div>
  )
}
