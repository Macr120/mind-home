import type { NotaAudio } from '../../core/data/db'
import { PASOS_POR_COMPAS } from './constantes'

/**
 * Parser propio de Standard MIDI File (formato 0 y 1) para importar canciones a
 * la pestaña Aprender. Solo notas: se ignoran CC, pitch bend, program change,
 * sysex y el canal 10 (percusión). Errores tipados por `message`:
 * 'formato' (no es .mid o es formato 2) · 'smpte' (división por tiempo real) ·
 * 'vacio' (sin notas melódicas).
 */

export interface ResultadoMidi {
  bpm: number
  compases: number
  manoDer: NotaAudio[]
  manoIzq: NotaAudio[]
}

const MAX_PASOS_CANCION = 256 * PASOS_POR_COMPAS
const MAX_NOTAS_CANCION = 4000

interface NotaCruda {
  tick: number
  durTicks: number
  tono: number
  vel: number
}

export function analizarMidi(datos: ArrayBuffer): ResultadoMidi {
  const dv = new DataView(datos)
  const texto = (pos: number) =>
    String.fromCharCode(dv.getUint8(pos), dv.getUint8(pos + 1), dv.getUint8(pos + 2), dv.getUint8(pos + 3))
  if (dv.byteLength < 14 || texto(0) !== 'MThd' || dv.getUint32(4) !== 6) throw new Error('formato')
  const formato = dv.getUint16(8)
  if (formato > 1) throw new Error('formato')
  const division = dv.getUint16(12)
  if (division & 0x8000) throw new Error('smpte') // división SMPTE: fuera del alcance
  if (division === 0) throw new Error('formato')

  let usNegra = 500_000 // 120 bpm si nadie manda set_tempo; gana el PRIMERO
  let tempoVisto = false
  const pistas: NotaCruda[][] = []

  let pos = 14
  while (pos + 8 <= dv.byteLength) {
    const id = texto(pos)
    const largo = dv.getUint32(pos + 4)
    const ini = pos + 8
    const fin = Math.min(dv.byteLength, ini + largo)
    if (id === 'MTrk') {
      const notas = leerPista(dv, ini, fin, (us) => {
        if (!tempoVisto) {
          usNegra = us
          tempoVisto = true
        }
      })
      pistas.push(notas)
    }
    pos = ini + largo
  }

  const melodicas = pistas.filter((p) => p.length > 0)
  if (melodicas.length === 0) throw new Error('vacio')

  // Ticks → pasos de semicorchea (4 por negra), redondeados a 1/64 (0.25).
  const aPasos = (ticks: number) => Math.round((ticks / division) * 4 * 4) / 4
  const convertir = (crudas: NotaCruda[]): NotaAudio[] => {
    const salida: NotaAudio[] = []
    for (const n of crudas) {
      const inicio = aPasos(n.tick)
      if (inicio >= MAX_PASOS_CANCION) continue
      const dur = Math.max(0.25, aPasos(n.durTicks))
      salida.push([
        inicio,
        Math.min(dur, MAX_PASOS_CANCION - inicio),
        Math.max(21, Math.min(108, n.tono)),
        Math.max(1, Math.min(127, n.vel)),
      ])
    }
    return salida.sort((a, b) => a[0] - b[0] || a[2] - b[2]).slice(0, MAX_NOTAS_CANCION)
  }

  let manoDer: NotaAudio[]
  let manoIzq: NotaAudio[]
  if (melodicas.length >= 2) {
    // Convención de los .mid de piano: 1.ª pista = derecha, 2.ª = izquierda.
    manoDer = convertir(melodicas[0])
    manoIzq = convertir(melodicas[1])
  } else {
    // Una sola pista: se parte por el do central (C4 = 60).
    const todas = convertir(melodicas[0])
    manoDer = todas.filter((n) => n[2] >= 60)
    manoIzq = todas.filter((n) => n[2] < 60)
  }

  const finMax = [...manoDer, ...manoIzq].reduce((m, n) => Math.max(m, n[0] + n[1]), 0)
  if (finMax === 0) throw new Error('vacio')
  const bpm = Math.max(40, Math.min(240, Math.round(60_000_000 / usNegra)))
  return { bpm, compases: Math.max(1, Math.ceil(finMax / PASOS_POR_COMPAS)), manoDer, manoIzq }
}

function leerPista(dv: DataView, ini: number, fin: number, alTempo: (usNegra: number) => void): NotaCruda[] {
  const notas: NotaCruda[] = []
  // Note-on sin cerrar por (canal, tono), en cola FIFO (los solapes son legítimos).
  const abiertas = new Map<number, { tick: number; vel: number }[]>()
  let pos = ini
  let tick = 0
  let status = 0

  const varint = (): number => {
    let v = 0
    for (let i = 0; i < 4 && pos < fin; i++) {
      const b = dv.getUint8(pos++)
      v = (v << 7) | (b & 0x7f)
      if ((b & 0x80) === 0) break
    }
    return v
  }
  const cerrar = (canal: number, tono: number) => {
    const cola = abiertas.get((canal << 8) | tono)
    const on = cola?.shift()
    if (!on || canal === 9) return // canal 10 (índice 9): percusión, fuera
    notas.push({ tick: on.tick, durTicks: Math.max(1, tick - on.tick), tono, vel: on.vel })
  }

  while (pos < fin) {
    tick += varint()
    if (pos >= fin) break
    let b = dv.getUint8(pos++)
    if (b < 0x80) {
      // Running status: el byte era de datos; se reusa el estado anterior.
      if (status === 0) return notas // pista corrupta
      pos--
      b = status
    } else if (b < 0xf0) {
      status = b
    }
    if (b === 0xff) {
      const tipo = dv.getUint8(pos++)
      const largo = varint()
      if (tipo === 0x51 && largo === 3 && pos + 3 <= fin) {
        alTempo((dv.getUint8(pos) << 16) | (dv.getUint8(pos + 1) << 8) | dv.getUint8(pos + 2))
      }
      if (tipo === 0x2f) break // fin de pista
      pos += largo
      continue
    }
    if (b === 0xf0 || b === 0xf7) {
      pos += varint() // sysex: se salta por longitud
      continue
    }
    const hi = b & 0xf0
    const canal = b & 0x0f
    const d1 = pos < fin ? dv.getUint8(pos++) : 0
    if (hi === 0xc0 || hi === 0xd0) continue // program change / aftertouch: 1 byte de dato
    const d2 = pos < fin ? dv.getUint8(pos++) : 0
    if (hi === 0x90 && d2 > 0) {
      const clave = (canal << 8) | d1
      const cola = abiertas.get(clave)
      if (cola) cola.push({ tick, vel: d2 })
      else abiertas.set(clave, [{ tick, vel: d2 }])
    } else if (hi === 0x80 || (hi === 0x90 && d2 === 0)) {
      cerrar(canal, d1)
    }
  }
  // Notas que el archivo dejó abiertas: se cierran en el último tick leído.
  for (const clave of abiertas.keys()) {
    const canal = clave >> 8
    const tono = clave & 0xff
    while (abiertas.get(clave)?.length) cerrar(canal, tono)
  }
  return notas
}
