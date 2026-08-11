/**
 * Piezas comunes de OOXML: las comparten el escritor de hojas (`xlsx.ts`) y el
 * de gráficas (`xlsxChart.ts`). Viven aparte para que los dos usen el MISMO
 * nombre de hoja saneado: si el `<sheet name>` del libro y el `'Hoja'!$B$2` de
 * una gráfica no coinciden al carácter, la gráfica se ve (la pinta su caché)
 * pero queda muerta — no resalta celdas ni se actualiza al editar.
 */

/** Escapa para XML. El apóstrofo no hace falta: los atributos van con comillas dobles. */
export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** El nombre de una pestaña de Excel no admite `[]:*?/\` ni más de 31 caracteres. */
export const nombreHoja = (s: string, i: number) => {
  // El segundo `trim` es por el recorte: un nombre largo cortado en 31 puede
  // acabar en espacio, y ese espacio final viaja luego a los `<c:f>`.
  const limpio = s.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31).trim()
  return limpio || `Hoja${i + 1}`
}

/** 'B2' → '$B$2'. Una referencia de gráfica es absoluta siempre. */
const absoluta = (ref: string) => ref.replace(/^([A-Z]+)([0-9]+)$/, '$$$1$$$2')

/**
 * `'Ventas ''Q1'''!$B$2:$B$7` para el `<c:f>` de una gráfica. Son DOS escapes
 * encadenados y en este orden: primero el de Excel (comillas alrededor del
 * nombre y apóstrofos internos duplicados) y encima el de XML. Se entrecomilla
 * siempre, aunque el nombre no lo necesite: un caso especial menos.
 */
export const refHoja = (nombre: string, rango: string) =>
  esc(`'${nombre.replace(/'/g, "''")}'!${rango.split(':').map(absoluta).join(':')}`)
