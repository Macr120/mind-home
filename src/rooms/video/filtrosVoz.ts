import type { FiltroVoz } from '../../core/data/db'

/**
 * Filtros de voz de la narración y de las tomas de micrófono: seis efectos
 * populares como cadenas de nodos ESTÁNDAR de Web Audio (sin worklets), así la
 * misma topología suena igual en el preview (contexto vivo, `motor.ts`) y en
 * el export (el grafo que alimenta al grabador, `exportar.ts`). Se aplican al
 * audio del clip —grabado, importado o TTS generado—; la lectura en vivo del
 * preview no pasa por aquí. El cambio de tono es el «Jungle» de los ejemplos
 * de Web Audio de Chrome: dos líneas de retardo moduladas en diente de sierra
 * con fundido cruzado, que no altera la duración.
 */

export const FILTROS_VOZ: readonly { id: FiltroVoz; claveNombre: string; es: string }[] = [
  { id: 'ardilla', claveNombre: 'video.filtroVoz.ardilla', es: 'Ardilla' },
  { id: 'grave', claveNombre: 'video.filtroVoz.grave', es: 'Grave' },
  { id: 'robot', claveNombre: 'video.filtroVoz.robot', es: 'Robot' },
  { id: 'eco', claveNombre: 'video.filtroVoz.eco', es: 'Eco' },
  { id: 'radio', claveNombre: 'video.filtroVoz.radio', es: 'Radio' },
  { id: 'cueva', claveNombre: 'video.filtroVoz.cueva', es: 'Cueva' },
]

export interface CadenaVoz {
  entrada: AudioNode
  salida: AudioNode
  /** Suelta todos los nodos y para los osciladores y bucles de modulación. */
  desconectar(): void
}

export function crearFiltroVoz(ctx: BaseAudioContext, id: FiltroVoz): CadenaVoz {
  switch (id) {
    case 'ardilla':
      return cambioDeTono(ctx, 1)
    case 'grave':
      return cambioDeTono(ctx, -0.7)
    case 'robot':
      return robot(ctx)
    case 'eco':
      return eco(ctx)
    case 'radio':
      return radio(ctx)
    case 'cueva':
      return cueva(ctx)
  }
}

/** Cadena mínima: dos ganancias como puertos, y todo lo demás entre ellas. */
function puertos(ctx: BaseAudioContext) {
  return { entrada: ctx.createGain(), salida: ctx.createGain() }
}

function desconectarTodo(nodos: AudioNode[], fuentes: AudioScheduledSourceNode[] = []) {
  for (const f of fuentes) {
    try {
      f.stop()
    } catch {
      /* ya parada */
    }
  }
  for (const n of [...fuentes, ...nodos]) n.disconnect()
}

// ─── Cambio de tono (Jungle) ─────────────────────────────────────────────────

const RETARDO = 0.1
const FUNDIDO = 0.05
const CICLO = 0.1

/** Rampa del tiempo de retardo: bajando (tono arriba) o subiendo (tono abajo); la 2ª mitad del ciclo a 0. */
function bufferRampa(ctx: BaseAudioContext, subir: boolean): AudioBuffer {
  const n1 = Math.round(CICLO * ctx.sampleRate)
  const n2 = Math.round((CICLO - 2 * FUNDIDO) * ctx.sampleRate)
  const buf = ctx.createBuffer(1, n1 + n2, ctx.sampleRate)
  const p = buf.getChannelData(0)
  for (let i = 0; i < n1; i++) p[i] = subir ? (n1 - i) / (n1 + n2) : i / n1
  return buf
}

/** Ventana de fundido cruzado entre las dos líneas de retardo. */
function bufferFundido(ctx: BaseAudioContext): AudioBuffer {
  const n1 = Math.round(CICLO * ctx.sampleRate)
  const n2 = Math.round((CICLO - 2 * FUNDIDO) * ctx.sampleRate)
  const nf = FUNDIDO * ctx.sampleRate
  const buf = ctx.createBuffer(1, n1 + n2, ctx.sampleRate)
  const p = buf.getChannelData(0)
  for (let i = 0; i < n1; i++) p[i] = i < nf ? Math.sqrt(i / nf) : i >= n1 - nf ? Math.sqrt(1 - (i - (n1 - nf)) / nf) : 1
  return buf
}

/** `factor` en −1…1: positivo sube el tono (1 ≈ +7 semitonos), negativo lo baja (−0,7 ≈ −7). */
function cambioDeTono(ctx: BaseAudioContext, factor: number): CadenaVoz {
  const { entrada, salida } = puertos(ctx)
  const rampa = bufferRampa(ctx, factor > 0)
  const fundido = bufferFundido(ctx)
  const fuente = (buffer: AudioBuffer) => {
    const s = ctx.createBufferSource()
    s.buffer = buffer
    s.loop = true
    return s
  }
  const mods = [fuente(rampa), fuente(rampa)]
  const fundidos = [fuente(fundido), fuente(fundido)]
  const retardos = [ctx.createDelay(1), ctx.createDelay(1)]
  const mezclas = [ctx.createGain(), ctx.createGain()]
  const modGanancias = [ctx.createGain(), ctx.createGain()]
  for (let i = 0; i < 2; i++) {
    modGanancias[i].gain.value = 0.5 * RETARDO * Math.abs(factor)
    mods[i].connect(modGanancias[i])
    modGanancias[i].connect(retardos[i].delayTime)
    mezclas[i].gain.value = 0
    fundidos[i].connect(mezclas[i].gain)
    entrada.connect(retardos[i])
    retardos[i].connect(mezclas[i])
    mezclas[i].connect(salida)
  }
  const t0 = ctx.currentTime + 0.05
  const t1 = t0 + CICLO - FUNDIDO
  mods[0].start(t0)
  fundidos[0].start(t0)
  mods[1].start(t1)
  fundidos[1].start(t1)
  return {
    entrada,
    salida,
    desconectar: () => desconectarTodo([entrada, salida, ...retardos, ...mezclas, ...modGanancias], [...mods, ...fundidos]),
  }
}

// ─── Robot: modulación en anillo ─────────────────────────────────────────────

function robot(ctx: BaseAudioContext): CadenaVoz {
  const { entrada, salida } = puertos(ctx)
  const anillo = ctx.createGain()
  anillo.gain.value = 0
  const portadora = ctx.createOscillator()
  portadora.type = 'sine'
  portadora.frequency.value = 50
  portadora.connect(anillo.gain)
  entrada.connect(anillo)
  anillo.connect(salida)
  portadora.start()
  return { entrada, salida, desconectar: () => desconectarTodo([entrada, salida, anillo], [portadora]) }
}

// ─── Eco: retardo con realimentación ─────────────────────────────────────────

function eco(ctx: BaseAudioContext): CadenaVoz {
  const { entrada, salida } = puertos(ctx)
  const retardo = ctx.createDelay(1)
  retardo.delayTime.value = 0.28
  const realimentacion = ctx.createGain()
  realimentacion.gain.value = 0.4
  const humedo = ctx.createGain()
  humedo.gain.value = 0.55
  entrada.connect(salida)
  entrada.connect(retardo)
  retardo.connect(realimentacion)
  realimentacion.connect(retardo)
  retardo.connect(humedo)
  humedo.connect(salida)
  return { entrada, salida, desconectar: () => desconectarTodo([entrada, salida, retardo, realimentacion, humedo]) }
}

// ─── Radio: banda estrecha y saturación ──────────────────────────────────────

function radio(ctx: BaseAudioContext): CadenaVoz {
  const { entrada, salida } = puertos(ctx)
  const pasoAlto = ctx.createBiquadFilter()
  pasoAlto.type = 'highpass'
  pasoAlto.frequency.value = 600
  const pasoBajo = ctx.createBiquadFilter()
  pasoBajo.type = 'lowpass'
  pasoBajo.frequency.value = 2800
  const saturacion = ctx.createWaveShaper()
  const curva = new Float32Array(1024)
  const k = 25
  for (let i = 0; i < curva.length; i++) {
    const x = (i * 2) / (curva.length - 1) - 1
    curva[i] = ((1 + k) * x) / (1 + k * Math.abs(x))
  }
  saturacion.curve = curva
  saturacion.oversample = '2x'
  salida.gain.value = 1.3
  entrada.connect(pasoAlto)
  pasoAlto.connect(pasoBajo)
  pasoBajo.connect(saturacion)
  saturacion.connect(salida)
  return { entrada, salida, desconectar: () => desconectarTodo([entrada, salida, pasoAlto, pasoBajo, saturacion]) }
}

// ─── Cueva: reverberación por convolución ────────────────────────────────────

/** Respuesta al impulso sintética: ruido con caída exponencial (sin archivo que cargar). */
function impulso(ctx: BaseAudioContext, segundos: number, caida: number): AudioBuffer {
  const n = Math.round(segundos * ctx.sampleRate)
  const buf = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const p = buf.getChannelData(c)
    for (let i = 0; i < n; i++) p[i] = (Math.random() * 2 - 1) * (1 - i / n) ** caida
  }
  return buf
}

function cueva(ctx: BaseAudioContext): CadenaVoz {
  const { entrada, salida } = puertos(ctx)
  const reverb = ctx.createConvolver()
  reverb.buffer = impulso(ctx, 2.2, 3.5)
  const seco = ctx.createGain()
  seco.gain.value = 0.7
  const humedo = ctx.createGain()
  humedo.gain.value = 0.8
  entrada.connect(seco)
  seco.connect(salida)
  entrada.connect(reverb)
  reverb.connect(humedo)
  humedo.connect(salida)
  return { entrada, salida, desconectar: () => desconectarTodo([entrada, salida, reverb, seco, humedo]) }
}
