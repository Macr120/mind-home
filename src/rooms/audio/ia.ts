import { conversarIA, extraerJSON } from '../../core/chat/ia'
import type { InstrumentoAudio, NotaAudio } from '../../core/data/db'
import { MAX_COMPASES_IA, MAX_NOTAS_IA, PASOS_POR_COMPAS, TONOS_BATERIA, esInstrumentoBateria } from './constantes'

/**
 * Composición con IA del Studio de audio. Lanza con el motivo real (la UI lo
 * muestra tal cual) y reintenta UNA vez solo por error de formato, como
 * `rooms/ideas/ia.ts`. Los topes se aplican EN CÓDIGO, no solo en el prompt.
 */

function system(instrumento: InstrumentoAudio, bpm: number, compases: number): string {
  const total = compases * PASOS_POR_COMPAS
  const rango =
    esInstrumentoBateria(instrumento)
      ? 'tono SOLO uno de: 36 (bombo), 38 (caja), 42 (hi-hat cerrado), 46 (hi-hat abierto), 39 (palmada), 41 (tom grave), 48 (tom agudo), 49 (platillo); duracion siempre 1'
      : instrumento === 'bajo'
        ? 'tono: entero MIDI 28..55; duracion: entero 1..16'
        : 'tono: entero MIDI 48..84; duracion: entero 1..16'
  return [
    `Eres un compositor MIDI. Compón para el instrumento «${instrumento}» a ${bpm} BPM, compás 4/4, ${compases} ${compases === 1 ? 'compás' : 'compases'}.`,
    `La rejilla es la semicorchea: ${PASOS_POR_COMPAS} pasos por compás (${total} en total).`,
    'Responde ÚNICAMENTE con un objeto JSON, sin texto ni markdown alrededor, con esta forma:',
    '{"notas":[[inicio,duracion,tono,velocidad],...]}',
    `inicio: entero 0..${total - 1}; ${rango}; velocidad: entero 40..127.`,
    `Máximo ${MAX_NOTAS_IA} notas y no más de 4 sonando a la vez. Que suene musical: frases, silencios y variación.`,
  ].join('\n')
}

/** Coerciones y clamps defensivos del JSON del modelo. */
function validar(obj: Record<string, unknown>, instrumento: InstrumentoAudio, totalPasos: number): NotaAudio[] {
  const crudas = Array.isArray(obj.notas) ? (obj.notas as unknown[]) : []
  const vistas = new Set<string>()
  const notas: NotaAudio[] = []
  for (const cruda of crudas.slice(0, MAX_NOTAS_IA * 2)) {
    if (!Array.isArray(cruda) || cruda.length < 4) continue
    const inicio = Math.round(Number(cruda[0]))
    let dur = Math.round(Number(cruda[1]))
    let tono = Math.round(Number(cruda[2]))
    const vel = Math.round(Number(cruda[3]))
    if (![inicio, dur, tono, vel].every(Number.isFinite)) continue
    if (inicio < 0 || inicio >= totalPasos) continue
    if (esInstrumentoBateria(instrumento)) {
      if (!(TONOS_BATERIA as readonly number[]).includes(tono)) continue
      dur = 1
    } else {
      tono = Math.max(21, Math.min(108, tono))
      dur = Math.max(1, Math.min(16, Math.min(dur, totalPasos - inicio)))
    }
    const clave = `${inicio}:${tono}`
    if (vistas.has(clave)) continue
    vistas.add(clave)
    notas.push([inicio, dur, tono, Math.max(40, Math.min(127, vel))])
    if (notas.length >= MAX_NOTAS_IA) break
  }
  if (notas.length < 2) throw new Error('La IA no devolvió notas usables')
  return notas.sort((a, b) => a[0] - b[0] || a[2] - b[2])
}

async function pedir(sys: string, texto: string, instrumento: InstrumentoAudio, totalPasos: number): Promise<NotaAudio[]> {
  let ultimo: unknown = null
  for (let intento = 0; intento < 2; intento++) {
    const respuesta = await conversarIA(sys, [{ rol: 'usuario', texto }], 1400)
    try {
      return validar(extraerJSON(respuesta), instrumento, totalPasos)
    } catch (e) {
      ultimo = e
      console.warn('[audio] respuesta de IA no usable, reintentando:', respuesta.slice(0, 300))
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error('La IA no devolvió notas usables')
}

/** Compone una toma nueva desde una descripción («bajo funk de 2 compases»). */
export async function generarNotas(opts: {
  descripcion: string
  instrumento: InstrumentoAudio
  bpm: number
  compases: number
}): Promise<NotaAudio[]> {
  const compases = Math.max(1, Math.min(MAX_COMPASES_IA, opts.compases))
  return pedir(
    system(opts.instrumento, opts.bpm, compases),
    opts.descripcion,
    opts.instrumento,
    compases * PASOS_POR_COMPAS,
  )
}

/** Continúa las notas existentes desde `desde`, siguiendo su estilo. */
export async function continuarNotas(opts: {
  notas: NotaAudio[]
  instrumento: InstrumentoAudio
  bpm: number
  desde: number
  compases: number
}): Promise<NotaAudio[]> {
  const compases = Math.max(1, Math.min(MAX_COMPASES_IA, opts.compases))
  const totalPasos = opts.desde + compases * PASOS_POR_COMPAS
  const contexto = opts.notas
    .slice(-48)
    .map((n) => `[${n[0]},${n[1]},${n[2]},${n[3]}]`)
    .join(',')
  const texto = `Estas son las últimas notas ya escritas (mismo formato): [${contexto}]. Continúa la música desde el paso ${opts.desde} (inicio >= ${opts.desde}), siguiendo su estilo.`
  const sys = system(opts.instrumento, opts.bpm, Math.ceil(totalPasos / PASOS_POR_COMPAS)).replace(
    `inicio: entero 0..`,
    `inicio: entero ${opts.desde}..`,
  )
  const notas = await pedir(sys, texto, opts.instrumento, totalPasos)
  // Lo anterior al punto de continuación no se toca: se descarta lo que la IA repita.
  return notas.filter((n) => n[0] >= opts.desde)
}
