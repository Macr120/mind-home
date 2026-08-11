/**
 * Colores del mapamundi. Viven aquí porque los comparten dos pintores muy
 * distintos: los `<path>` del SVG plano y el canvas 2D del que sale la textura
 * del globo.
 *
 * El SVG puede usar `color-mix(… var(--ui-ink) …)` y se reajusta solo al cambiar
 * de tema. El canvas no: `ctx.fillStyle` no entiende de `var()`, así que ahí hay
 * que resolver la tinta a mano con `getComputedStyle`.
 */

/**
 * Paleta de países y estados visitados. El color se elige por hash estable del
 * nombre, así cada entidad conserva el suyo entre sesiones.
 *
 * Dos versiones del mismo orden: los tonos 400 lucen sobre el fondo oscuro pero
 * se lavan sobre el claro, así que ahí se baja a los 600.
 */
const PALETA_OSCURA = [
  '#2dd4bf', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c',
  '#a3e635', '#34d399', '#38bdf8', '#e879f9', '#f87171',
]
const PALETA_CLARA = [
  '#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c',
  '#65a30d', '#059669', '#0284c7', '#c026d3', '#dc2626',
]

export function colorDe(clave: string, claro: boolean): string {
  let h = 0
  for (let i = 0; i < clave.length; i++) h = (h * 31 + clave.charCodeAt(i)) | 0
  const paleta = claro ? PALETA_CLARA : PALETA_OSCURA
  return paleta[Math.abs(h) % paleta.length]
}

/**
 * Tierra sin visitar. Antes era `rgba(255,255,255,0.10)` literal: el remapeo del
 * modo claro solo alcanza a las utilidades `*-white/X` de Tailwind, nunca a un
 * `rgba()` escrito a mano, así que el mapa quedaba blanco sobre blanco.
 *
 * En claro la tierra sube de tono: el océano (`bg-black/30`) se queda en un 7 %
 * de tinta, y con el 10 % de la base oscura la costa apenas se distinguía.
 */
export const tierraFill = (claro: boolean) =>
  `color-mix(in srgb, var(--ui-ink) ${claro ? 18 : 10}%, transparent)`
export const tierraStroke = (claro: boolean) =>
  `color-mix(in srgb, var(--ui-ink) ${claro ? 38 : 20}%, transparent)`

/** Tinta del tema resuelta a `#rrggbb`, para lo que se pinta desde JS. */
export function tintaResuelta(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--ui-ink').trim()
  return v || '#e7e9ee'
}

/** `color` con alfa, aceptando `#rgb`, `#rrggbb` o cualquier cosa que ya sea rgb(). */
export function conAlfa(color: string, alfa: number): string {
  const hex = color.startsWith('#') ? color.slice(1) : null
  if (!hex) return color
  const largo = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const n = parseInt(largo, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`
}
