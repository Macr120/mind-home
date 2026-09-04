import type { ProyectoAudio } from '../../core/data/db'
import { FX_DEFAULT, MAESTRO_DEFAULT, PASOS_POR_COMPAS, segPorPaso } from './constantes'
import { crearBusMaestro, crearCadenaPista, crearRetornos } from './efectos'
import { tocarNota } from './instrumentos'

/**
 * Export a WAV: render offline del proyecto (las mismas recetas de
 * `instrumentos.ts` y la misma cadena de `efectos.ts` sobre un
 * `OfflineAudioContext`) + encoder PCM 16-bit a mano.
 */

/**
 * Renderiza el proyecto completo como `AudioBuffer` estéreo 44.1 kHz (lo usan
 * el export WAV y los platos del mezclador). `buffersClips` (de
 * `motor.buffersDeClips()`) mezcla los clips de micrófono; un clip sin buffer
 * (blob de otro dispositivo) no suena, igual que en vivo.
 */
export async function renderizarBuffer(
  p: ProyectoAudio,
  buffersClips?: ReadonlyMap<number, AudioBuffer>,
): Promise<AudioBuffer> {
  const spb = segPorPaso(p.bpm)
  const haySolo = p.pistas.some((x) => x.solo)
  const sonables = p.pistas.filter((x) => (haySolo ? x.solo : !x.silenciada))
  // El buffer cubre hasta la ÚLTIMA nota real (las notas más allá de `compases`
  // caían fuera del render y el WAV salía en silencio) y el fin de los clips
  // + cola para liberaciones y, si hay reverb/delay, para los retornos.
  const pasosReales = sonables.reduce(
    (m, x) =>
      (x.clips ?? []).reduce(
        (mc, c) => Math.max(mc, c.inicio + c.duracionSeg / spb),
        x.notas.reduce((mm, n) => Math.max(mm, n[0] + n[1]), m),
      ),
    p.compases * PASOS_POR_COMPAS,
  )
  const hayCola = sonables.some((x) => (x.efectos?.reverb ?? 0) > 0.01 || (x.efectos?.delay ?? 0) > 0.01)
  const dur = pasosReales * spb + (hayCola ? 3.5 : 1.5)
  const sr = 44100
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * dur), sr)
  const maestro = crearBusMaestro(ctx, ctx.destination, p.volumenMaestro ?? MAESTRO_DEFAULT)
  const retornos = crearRetornos(ctx, maestro.entrada, p.bpm)
  for (const pista of sonables) {
    const g = ctx.createGain()
    g.gain.value = pista.volumen
    const cadena = crearCadenaPista(ctx, maestro.entrada, retornos, pista.efectos ?? FX_DEFAULT)
    g.connect(cadena.entrada)
    const swingSeg = ((p.swing ?? 0) / 100) * spb
    let previo: { paso: number; tono: number } | null = null
    for (const nota of pista.notas) {
      const desdeTono = previo && previo.paso < nota[0] ? previo.tono : undefined
      const t = nota[0] * spb + 0.05 + (Math.floor(nota[0]) % 2 === 1 ? swingSeg : 0)
      tocarNota(ctx, g, pista.instrumento, t, nota[2], Math.max(0.06, nota[1] * spb), nota[3] / 127, {
        sinte: pista.sinte,
        desdeTono,
      })
      previo = { paso: nota[0], tono: nota[2] }
    }
    // Clips de micrófono por la MISMA cadena (heredan volumen y efectos).
    if (pista.tipo === 'audio') {
      for (const clip of pista.clips ?? []) {
        const buf = buffersClips?.get(clip.grabacionId)
        if (!buf) continue
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.connect(g)
        src.start(clip.inicio * spb + 0.05, clip.recorteSeg, clip.duracionSeg)
      }
    }
  }
  return ctx.startRendering()
}

/** Renderiza el proyecto completo como `audio/wav` estéreo 44.1 kHz. */
export async function renderizarWav(p: ProyectoAudio, buffersClips?: ReadonlyMap<number, AudioBuffer>): Promise<Blob> {
  return wavDesdeBuffer(await renderizarBuffer(p, buffersClips))
}

/** AudioBuffer → WAV (cabecera RIFF de 44 bytes + muestras L/R intercaladas). */
function wavDesdeBuffer(buf: AudioBuffer): Blob {
  const canales = Math.min(2, buf.numberOfChannels)
  const muestras = buf.length
  const blockAlign = canales * 2
  const datos = new DataView(new ArrayBuffer(44 + muestras * blockAlign))
  const texto = (pos: number, s: string) => {
    for (let i = 0; i < s.length; i++) datos.setUint8(pos + i, s.charCodeAt(i))
  }
  texto(0, 'RIFF')
  datos.setUint32(4, 36 + muestras * blockAlign, true)
  texto(8, 'WAVE')
  texto(12, 'fmt ')
  datos.setUint32(16, 16, true)
  datos.setUint16(20, 1, true) // PCM
  datos.setUint16(22, canales, true)
  datos.setUint32(24, buf.sampleRate, true)
  datos.setUint32(28, buf.sampleRate * blockAlign, true)
  datos.setUint16(32, blockAlign, true)
  datos.setUint16(34, 16, true)
  texto(36, 'data')
  datos.setUint32(40, muestras * blockAlign, true)
  const izq = buf.getChannelData(0)
  const der = canales === 2 ? buf.getChannelData(1) : izq
  let pos = 44
  for (let i = 0; i < muestras; i++) {
    for (const canal of canales === 2 ? [izq, der] : [izq]) {
      const s = Math.max(-1, Math.min(1, canal[i]))
      datos.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      pos += 2
    }
  }
  return new Blob([datos.buffer], { type: 'audio/wav' })
}
