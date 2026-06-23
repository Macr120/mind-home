import type { ReactNode } from 'react'

/**
 * Previsualización ISOMÉTRICA (estilizada) de una forma de techo, por id.
 * Cada forma se compone de caras con distinto sombreado (currentColor + opacidad)
 * para dar sensación de volumen 3D. Cubre formas de celda y de cuarto.
 */

const TOP = 0.95 // techo (cara superior)
const DER = 0.62 // cara derecha
const IZQ = 0.4 // cara izquierda

function P({ pts, o }: { pts: string; o: number }) {
  return <polygon points={pts} fill="currentColor" fillOpacity={o} />
}

const ISO: Record<string, ReactNode> = {
  // Losa plana: diamante + dos cantos.
  plano: (
    <>
      <P pts="14,6 25,11.5 14,17 3,11.5" o={TOP} />
      <P pts="14,17 25,11.5 25,13.5 14,19" o={DER} />
      <P pts="14,17 3,11.5 3,13.5 14,19" o={IZQ} />
    </>
  ),
  // Un agua: plano inclinado (atrás alto, frente bajo) + cantos.
  una_agua: (
    <>
      <P pts="14,3 25,9 14,16 3,9" o={TOP} />
      <P pts="14,16 25,9 25,11 14,18" o={DER} />
      <P pts="14,16 3,9 3,11 14,18" o={IZQ} />
    </>
  ),
  // Dos aguas: hastial frontal + dos faldones que recogen hacia atrás.
  dos_aguas: (
    <>
      <P pts="7,16 21,16 14,7" o={TOP} />
      <P pts="21,16 14,7 17,5 24,14" o={DER} />
      <P pts="7,16 14,7 11,5 4,14" o={IZQ} />
    </>
  ),
  // Pirámide (4 caras a un ápice) sobre base cuadrada.
  piramidal: (
    <>
      <P pts="14,3 25,12 14,9" o={TOP} />
      <P pts="14,3 3,12 14,9" o={0.8} />
      <P pts="14,3 25,12 14,17" o={DER} />
      <P pts="14,3 3,12 14,17" o={IZQ} />
    </>
  ),
  // Bóveda: medio cilindro.
  abovedado: (
    <>
      <P pts="4,13 25,13 14,18" o={IZQ} />
      <path d="M4,13 Q14,1 24,13 L20,15 Q12,4 6,15 Z" fill="currentColor" fillOpacity={DER} />
      <path d="M4,13 Q14,1 24,13" fill="none" stroke="currentColor" strokeWidth={1.2} strokeOpacity={0.9} />
    </>
  ),
  // Cúpula: media esfera sobre el diamante.
  cupula: (
    <>
      <P pts="5,13 23,13 14,17.5" o={IZQ} />
      <path d="M5,13 A9,9 0 0 1 23,13 Z" fill="currentColor" fillOpacity={DER} />
    </>
  ),
  // Un pico: base triangular con UN vértice levantado.
  un_pico: (
    <>
      <P pts="4,5 24,13 14,18" o={TOP} />
      <P pts="4,5 4,13 24,13" o={DER} />
      <P pts="4,5 4,13 14,18" o={IZQ} />
    </>
  ),
  // Dos picos: base triangular con DOS vértices levantados (plano plegado).
  dos_picos: (
    <>
      <P pts="4,6 24,6 14,18" o={TOP} />
      <P pts="4,6 24,6 24,13 4,13" o={0.78} />
      <P pts="24,6 24,13 14,18" o={DER} />
      <P pts="4,6 4,13 14,18" o={IZQ} />
    </>
  ),
  // Pirámide de 3 caras (tienda triangular).
  piramide3: (
    <>
      <P pts="14,4 4,13 24,13" o={TOP} />
      <P pts="14,4 4,13 14,18" o={IZQ} />
      <P pts="14,4 24,13 14,18" o={DER} />
    </>
  ),
  // Cono sobre base circular.
  cono: (
    <>
      <path d="M6,14.5 A8,2.4 0 0 0 22,14.5 Z" fill="currentColor" fillOpacity={IZQ} />
      <P pts="14,3 22,14.5 14,14.5" o={DER} />
      <P pts="14,3 6,14.5 14,14.5" o={TOP} />
    </>
  ),
}

export function TechoPresetIcono({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 28 22" className={className ?? 'h-5 w-7'} aria-hidden>
      {ISO[id] ?? ISO.plano}
    </svg>
  )
}
