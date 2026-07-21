import { CanvasTexture, SRGBColorSpace } from 'three'

/**
 * Hoja del mes del calendario de pared, dibujada en canvas (patrón de
 * `texturasMuro.ts`): mes y año reales, iniciales de los días en el idioma
 * activo y los números, con HOY en un círculo de color. Semana lunes → domingo,
 * igual que el calendario 2D.
 */

/** Lámina colgada: foto arriba, hoja del mes abajo (metros). */
export const CAL = { w: 0.76, foto: 0.52, mes: 0.46, base: 1.02, grosor: 0.02 }

export function texturaMes(iso: string, locale: string, acento: string): CanvasTexture {
  const w = 512
  const h = Math.round((w * CAL.mes) / CAL.w)
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const x = cv.getContext('2d')!
  const [año, mes, dia] = iso.split('-').map(Number)
  const primero = new Date(año, mes - 1, 1)

  x.fillStyle = '#faf8f4'
  x.fillRect(0, 0, w, h)
  x.textAlign = 'center'
  x.textBaseline = 'middle'

  x.fillStyle = acento
  x.font = `bold ${Math.round(h * 0.13)}px sans-serif`
  // Mes y año por separado: `{month,year}` juntos dan "julio DE 2026" en español.
  x.fillText(`${primero.toLocaleDateString(locale, { month: 'long' })} ${año}`.toUpperCase(), w / 2, h * 0.11)

  const colW = w / 7
  x.font = `bold ${Math.round(h * 0.07)}px sans-serif`
  x.fillStyle = '#9ca3af'
  for (let i = 0; i < 7; i++) {
    // El 1/ene/2024 fue lunes: da las iniciales ya en orden L→D.
    const d = new Date(2024, 0, 1 + i)
    x.fillText(d.toLocaleDateString(locale, { weekday: 'narrow' }).toUpperCase(), colW * (i + 0.5), h * 0.24)
  }

  const primeraCol = (primero.getDay() + 6) % 7 // columna del día 1 con semana L→D
  const ultimo = new Date(año, mes, 0).getDate()
  for (let n = 1; n <= ultimo; n++) {
    const celda = primeraCol + n - 1
    const cx = colW * ((celda % 7) + 0.5)
    // Paso de fila ajustado a 6 semanas: los meses largos que abren en fin de
    // semana (p. ej. agosto de 2026) ocupan una fila más.
    const cy = h * 0.345 + Math.floor(celda / 7) * h * 0.108
    if (n === dia) {
      x.beginPath()
      x.arc(cx, cy, h * 0.055, 0, Math.PI * 2)
      x.fillStyle = acento
      x.fill()
    }
    x.fillStyle = n === dia ? '#ffffff' : celda % 7 >= 5 ? '#b91c1c' : '#374151'
    x.font = `${n === dia ? 'bold ' : ''}${Math.round(h * 0.08)}px sans-serif`
    x.fillText(String(n), cx, cy)
  }

  const tex = new CanvasTexture(cv)
  tex.colorSpace = SRGBColorSpace
  return tex
}
