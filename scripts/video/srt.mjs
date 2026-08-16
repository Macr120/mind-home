/** Parseo y serialización de SRT compartidos por guion/doblar/montar. */

function aSegundos(t) {
  const m = t.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/)
  if (!m) throw new Error(`Tiempo SRT inválido: «${t}»`)
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000
}

export function aTiempo(s) {
  const ms = Math.round(s * 1000)
  const hh = String(Math.floor(ms / 3600000)).padStart(2, '0')
  const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')
  const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')
  return `${hh}:${mm}:${ss},${String(ms % 1000).padStart(3, '0')}`
}

/** → [{ n, inicio, fin, texto }] con tiempos en segundos. */
export function parsearSrt(texto) {
  return texto
    .replace(/^﻿/, '')
    .replace(/\r/g, '')
    .trim()
    .split(/\n\n+/)
    .filter(Boolean)
    .map((bloque) => {
      const lineas = bloque.split('\n')
      const [inicio, fin] = lineas[1].split('-->').map(aSegundos)
      return { n: Number(lineas[0]), inicio, fin, texto: lineas.slice(2).join('\n').trim() }
    })
}

export function serializarSrt(segmentos) {
  return segmentos.map((s) => `${s.n}\n${aTiempo(s.inicio)} --> ${aTiempo(s.fin)}\n${s.texto}`).join('\n\n') + '\n'
}

/**
 * Presupuesto de tiempo HABLABLE de un segmento: su propio hueco más el
 * silencio hasta el siguiente (invadiéndolo como mucho 0.3 s).
 */
export function presupuesto(segmentos, i) {
  const s = segmentos[i]
  const tope = segmentos[i + 1] ? Math.min(segmentos[i + 1].inicio, s.fin + 0.3) : s.fin + 0.3
  return tope - s.inicio
}
