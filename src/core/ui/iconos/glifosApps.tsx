import type { CSSProperties, ReactNode } from 'react'
import { useAjustes, type EstiloIconos } from '../../state/ajustesStore'
import type { NombreIcono } from './catalogo'
import { Icono } from './Icono'

/**
 * Glifos propios de las apps (de cuarto y del Exterior) y de los menús
 * principales, al estilo de los iconos de producto de
 * Google: piezas planas y macizas, cada una de un color. Los colores son los
 * tres del logo (public/icon.svg); el mosaico de fondo sigue siendo el color
 * del cuarto, que es el que se ve en el mapa.
 *
 * Se resuelven por el emoji de la plantilla (`cuarto.icon`): si el usuario le
 * pone otro emoji al cuarto, cae al icono de lucide de siempre.
 */

// Los colores van por variable: el estilo de iconos decide si son los del
// logo (coloridos) o grises (profesional). Ver `PALETAS` abajo.
const N = 'var(--glifo-n)' // naranja
const R = 'var(--glifo-r)' // rojo
const M = 'var(--glifo-m)' // morado

const GLIFOS: Record<string, ReactNode> = {
  // Cocina: olla con tapa.
  '🍳': (
    <>
      <rect x="2" y="24" width="8" height="5" rx="2.5" fill={M} />
      <rect x="38" y="24" width="8" height="5" rx="2.5" fill={M} />
      <rect x="8" y="21" width="32" height="20" rx="5" fill={R} />
      <rect x="6" y="14" width="36" height="5" rx="2.5" fill={N} />
      <circle cx="24" cy="10" r="3.5" fill={M} />
    </>
  ),
  // Ejercicio: mancuerna.
  '💪': (
    <>
      <rect x="10" y="21" width="28" height="6" rx="3" fill={N} />
      <rect x="4" y="12" width="9" height="24" rx="3.5" fill={R} />
      <rect x="35" y="12" width="9" height="24" rx="3.5" fill={M} />
    </>
  ),
  // Descanso: cama.
  '🛏️': (
    <>
      <rect x="4" y="9" width="7" height="33" rx="3" fill={M} />
      <rect x="13" y="16" width="11" height="7" rx="3.5" fill={R} />
      <rect x="9" y="24" width="35" height="11" rx="4" fill={N} />
      <rect x="38" y="30" width="6" height="12" rx="3" fill={M} />
    </>
  ),
  // Escritorio: lápiz.
  '✍️': (
    <g transform="rotate(45 24 24)">
      <rect x="18" y="3" width="12" height="8" rx="3.5" fill={M} />
      <rect x="18" y="12" width="12" height="21" fill={N} />
      <path d="M18 34h12l-6 11z" fill={R} />
    </g>
  ),
  // Finanzas: cartera con billete.
  '💰': (
    <>
      <rect x="9" y="6" width="26" height="14" rx="3" transform="rotate(-8 22 13)" fill={N} />
      <rect x="4" y="13" width="40" height="29" rx="6" fill={M} />
      <path fillRule="evenodd" d="M31 22h13v12H31a6 6 0 0 1 0-12zm4 6a2.2 2.2 0 1 0 0 .01z" fill={R} />
    </>
  ),
  // Biblioteca: tres libros, el último recargado.
  '📚': (
    <>
      <rect x="5" y="7" width="9" height="35" rx="2.5" fill={M} />
      <rect x="16" y="12" width="9" height="30" rx="2.5" fill={N} />
      <rect x="29" y="9" width="9" height="33" rx="2.5" transform="rotate(-16 33.5 42)" fill={R} />
    </>
  ),
  // Entretenimiento: mando.
  '🎮': (
    <>
      <rect x="3" y="13" width="42" height="24" rx="12" fill={M} />
      <rect x="10" y="23" width="12" height="4.5" rx="1.5" fill={N} />
      <rect x="13.75" y="19.25" width="4.5" height="12" rx="1.5" fill={N} />
      <circle cx="32" cy="22" r="3" fill={R} />
      <circle cx="37.5" cy="28" r="3" fill={N} />
    </>
  ),
  // Sala (viajes): avión.
  '✈️': (
    <g transform="rotate(45 24 24)">
      <path d="M24 17 45 29v5l-21-6-21 6v-5z" fill={R} />
      <path d="M24 37l9 5v3l-9-2-9 2v-3z" fill={M} />
      <rect x="20.5" y="2" width="7" height="42" rx="3.5" fill={N} />
    </g>
  ),
  // Jardín: flor de loto.
  '🧘': (
    <>
      <path d="M4 17c11 0 18 8 20 21C12 38 4 31 4 17z" fill={N} />
      <path d="M44 17c-11 0-18 8-20 21 12 0 20-7 20-21z" fill={M} />
      <path d="M24 6c8 9 8 23 0 32-8-9-8-23 0-32z" fill={R} />
    </>
  ),
  // Noticias: periódico.
  '📰': (
    <>
      <rect x="6" y="5" width="36" height="38" rx="5" fill={M} />
      <rect x="12" y="11" width="24" height="9" rx="2" fill={R} />
      <rect x="12" y="24" width="24" height="4" rx="2" fill={N} />
      <rect x="12" y="32" width="15" height="4" rx="2" fill={N} />
    </>
  ),
  // Agenda: calendario.
  '🗓️': (
    <>
      <rect x="5" y="9" width="38" height="34" rx="5" fill={M} />
      <path d="M5 14a5 5 0 0 1 5-5h28a5 5 0 0 1 5 5v6H5z" fill={R} />
      <rect x="13" y="4" width="5" height="10" rx="2.5" fill={N} />
      <rect x="30" y="4" width="5" height="10" rx="2.5" fill={N} />
      <rect x="26" y="27" width="10" height="9" rx="2" fill={N} />
    </>
  ),
  // Idiomas: dos globos de diálogo.
  '🌐': (
    <>
      <path d="M10 5h16a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H14l-7 6v-6.6A6 6 0 0 1 4 21V11a6 6 0 0 1 6-6z" fill={M} />
      <path d="M38 18H22a6 6 0 0 0-6 6v10a6 6 0 0 0 6 6h12l7 6v-6.6a6 6 0 0 0 3-5.4V24a6 6 0 0 0-6-6z" fill={N} />
      <path d="M25 35l5-11 5 11m-8-4h6" fill="none" stroke={R} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // Ideas: foco.
  '💡': (
    <>
      <path d="M24 4a14 14 0 0 1 8 25.5V32H16v-2.5A14 14 0 0 1 24 4z" fill={N} />
      <rect x="16" y="34" width="16" height="4.5" rx="2.25" fill={R} />
      <rect x="19" y="40.5" width="10" height="4.5" rx="2.25" fill={M} />
    </>
  ),
  // Metas: diana.
  '🎯': (
    <>
      <path fillRule="evenodd" d="M24 4a20 20 0 1 1 0 40 20 20 0 0 1 0-40zm0 4.5a15.5 15.5 0 1 0 0 31 15.5 15.5 0 0 0 0-31z" fill={R} />
      <path fillRule="evenodd" d="M24 12a12 12 0 1 1 0 24 12 12 0 0 1 0-24zm0 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z" fill={N} />
      <circle cx="24" cy="24" r="4.5" fill={M} />
    </>
  ),
  // Garage: llave inglesa.
  '🔧': (
    <g transform="rotate(45 24 24)">
      <rect x="20.5" y="17" width="7" height="29" rx="3.5" fill={N} />
      <path d="M19 3.3A9.5 9.5 0 1 0 29 3.3V11H19z" fill={M} />
      <circle cx="24" cy="40.5" r="2" fill={R} />
    </g>
  ),
  // Cómputo: calculadora.
  '🧮': (
    <>
      <rect x="9" y="3" width="30" height="42" rx="5" fill={M} />
      <rect x="14" y="8" width="20" height="10" rx="2" fill={N} />
      <circle cx="17" cy="25" r="2.6" fill={R} />
      <circle cx="24" cy="25" r="2.6" fill={R} />
      <circle cx="31" cy="25" r="2.6" fill={R} />
      <circle cx="17" cy="32.5" r="2.6" fill={R} />
      <circle cx="24" cy="32.5" r="2.6" fill={R} />
      <rect x="28.4" y="29.9" width="5.2" height="10.2" rx="2.6" fill={N} />
      <circle cx="17" cy="40" r="2.6" fill={R} />
      <circle cx="24" cy="40" r="2.6" fill={R} />
    </>
  ),
  // Escritura: hoja con pluma.
  '📝': (
    <>
      <rect x="6" y="4" width="28" height="38" rx="5" fill={M} />
      <rect x="11" y="11" width="18" height="3.5" rx="1.75" fill={N} />
      <rect x="11" y="18.5" width="14" height="3.5" rx="1.75" fill={N} />
      <rect x="11" y="26" width="9" height="3.5" rx="1.75" fill={N} />
      <g transform="rotate(35 37 30)">
        <rect x="33.5" y="12" width="7" height="22" rx="2.5" fill={R} />
        <path d="M33.5 35h7L37 42z" fill={N} />
      </g>
    </>
  ),
  // Arte: paleta.
  '🖌️': (
    <>
      <path
        fillRule="evenodd"
        d="M24 4c11 0 20 8 20 18 0 6-5 8-9.5 7-4-1-7 2-5 6.5 2 5-1 8.5-5.5 8.5C13 44 4 35 4 24S13 4 24 4zm-2 26a4 4 0 1 0 0 .01z"
        fill={M}
      />
      <circle cx="13" cy="22" r="3.8" fill={R} />
      <circle cx="20" cy="12.5" r="3.8" fill={N} />
      <circle cx="31" cy="13" r="3.8" fill={R} />
      <circle cx="36.5" cy="21" r="3.2" fill={N} />
    </>
  ),
  // Audio: teclado de sintetizador.
  '🎹': (
    <>
      <rect x="3" y="9" width="42" height="30" rx="5" fill={M} />
      <rect x="7" y="14" width="7.5" height="21" rx="2" fill={N} />
      <rect x="16" y="14" width="7.5" height="21" rx="2" fill={N} />
      <rect x="24.5" y="14" width="7.5" height="21" rx="2" fill={N} />
      <rect x="33.5" y="14" width="7.5" height="21" rx="2" fill={N} />
      <rect x="12" y="14" width="5" height="12" rx="1.5" fill={R} />
      <rect x="21" y="14" width="5" height="12" rx="1.5" fill={R} />
      <rect x="30.5" y="14" width="5" height="12" rx="1.5" fill={R} />
    </>
  ),
  // Video: claqueta.
  '🎞️': (
    <>
      <rect x="4" y="9" width="38" height="8" rx="2.5" transform="rotate(-12 4 17)" fill={N} />
      <rect x="4" y="20" width="40" height="23" rx="5" fill={M} />
      <path d="M20 25.5v12L30.5 31.5z" fill={R} />
    </>
  ),
  // Hobbies: guitarra.
  '🎸': (
    <g transform="rotate(40 24 24)">
      <rect x="21.5" y="4" width="5" height="24" rx="2" fill={M} />
      <rect x="19.5" y="1" width="9" height="7" rx="2.5" fill={R} />
      <circle cx="24" cy="29" r="7.5" fill={N} />
      <circle cx="24" cy="38.5" r="9" fill={N} />
      <circle cx="24" cy="33" r="3" fill={R} />
    </g>
  ),
}

// Apps del Exterior (se construyen sobre el terreno), también por su emoji.
const GLIFOS_EXTERIOR: Record<string, ReactNode> = {
  // Circuitos: pista con su línea central y la meta.
  '🛤️': (
    <>
      <rect x="6" y="11" width="36" height="26" rx="13" fill="none" stroke={M} strokeWidth="7" />
      <rect x="6" y="11" width="36" height="26" rx="13" fill="none" stroke={N} strokeWidth="2" strokeDasharray="4 4" />
      <rect x="21" y="4" width="6" height="14" rx="2" fill={R} />
    </>
  ),
  // Canchas: campo con sus líneas.
  '🏀': (
    <>
      <rect x="4" y="9" width="40" height="30" rx="5" fill={M} />
      <path d="M24 13v22" stroke={N} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="5.5" fill="none" stroke={N} strokeWidth="2.5" />
      <path d="M8 18h5v12H8M40 18h-5v12h5" fill="none" stroke={R} strokeWidth="2.5" strokeLinejoin="round" />
    </>
  ),
  // Santuario: granero.
  '🐄': (
    <>
      <rect x="9" y="20" width="30" height="23" rx="3" fill={R} />
      <path d="M24 5 45 21a2 2 0 0 1-1.2 3.6H4.2A2 2 0 0 1 3 21z" fill={M} />
      <rect x="18" y="28" width="12" height="15" rx="2" fill={N} />
      <path d="M19.5 29.5l9 12m0-12-9 12" stroke={R} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  // Comida (huerto): zanahoria.
  '🥕': (
    <g transform="rotate(35 24 26)">
      <ellipse cx="19.5" cy="10" rx="3" ry="7" transform="rotate(-18 19.5 10)" fill={M} />
      <ellipse cx="28.5" cy="10" rx="3" ry="7" transform="rotate(18 28.5 10)" fill={M} />
      <ellipse cx="24" cy="8" rx="3" ry="8" fill={R} />
      <path d="M15 18q9-5 18 0L25 45q-1 2-2 0z" fill={N} />
    </g>
  ),
  // Paintball: manchón de pintura.
  '🥎': (
    <>
      <circle cx="24" cy="24" r="14" fill={M} />
      <circle cx="9" cy="13" r="4" fill={M} />
      <circle cx="39" cy="11" r="3.5" fill={M} />
      <circle cx="41" cy="35" r="4.5" fill={M} />
      <circle cx="10" cy="38" r="3" fill={M} />
      <circle cx="24" cy="24" r="7" fill={N} />
      <circle cx="35" cy="42" r="2.5" fill={R} />
      <circle cx="20" cy="21" r="2.5" fill={R} />
    </>
  ),
}

// Pieza del logo con su canto oscuro detrás, como en public/icon.svg.
const pieza = (d: string, cara: string, canto: string) => (
  <>
    <path d={d} fill={canto} transform="translate(2 2)" />
    <path d={d} fill={cara} />
  </>
)

/** Glifos por nombre: vistas del chat, pestañas del editor y del menú MindHaOS. */
const GLIFOS_NOMBRE = {
  // — Menú MindHaOS: las tres piezas del logo —
  hogar: pieza('M13 5h22a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8H13a8 8 0 0 1-8-8V13a8 8 0 0 1 8-8z', N, 'var(--glifo-canto-n)'),
  interior: pieza('M5 5v37h37z', R, 'var(--glifo-canto-r)'),
  exterior: pieza('M5 5h37v37A37 37 0 0 1 5 5z', M, 'var(--glifo-canto-m)'),

  // — Vistas del chat —
  amigos: (
    <>
      <circle cx="32" cy="13" r="6" fill={M} />
      <path d="M21 36a11 11 0 0 1 22 0v1a2 2 0 0 1-2 2H23a2 2 0 0 1-2-2z" fill={M} />
      <circle cx="18" cy="17" r="7.5" fill={N} />
      <path d="M4 41a14 14 0 0 1 28 0v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill={R} />
    </>
  ),
  asistentes: (
    <>
      <path d="M8 40l19-19" stroke={N} strokeWidth="6" strokeLinecap="round" />
      <path d="M27 21l5-5" stroke={R} strokeWidth="6" strokeLinecap="round" />
      <path d="M36 3q1.6 7.4 9 9-7.4 1.6-9 9-1.6-7.4-9-9 7.4-1.6 9-9z" fill={M} />
      <path d="M14 6q1 5 6 6-5 1-6 6-1-5-6-6 5-1 6-6z" fill={R} />
      <path d="M40 26q.8 4.2 5 5-4.2.8-5 5-.8-4.2-5-5 4.2-.8 5-5z" fill={N} />
    </>
  ),
  lugares: (
    <>
      <ellipse cx="24" cy="42" rx="11" ry="3.5" fill={M} />
      <path d="M24 42S9 27 9 18a15 15 0 0 1 30 0c0 9-15 24-15 24z" fill={R} />
      <circle cx="24" cy="18" r="6" fill={N} />
    </>
  ),
  navegador: (
    <>
      <circle cx="24" cy="24" r="19" fill={M} />
      <ellipse cx="24" cy="24" rx="8" ry="17" fill="none" stroke={N} strokeWidth="3.5" />
      <path d="M7 24h34" stroke={R} strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),

  // — Pestañas del editor —
  mapa: (
    <g strokeWidth="2" strokeLinejoin="round">
      <path d="M5 10l12-4v32L5 42z" fill={M} stroke={M} />
      <path d="M17 6l14 4v32l-14-4z" fill={N} stroke={N} />
      <path d="M31 10l12-4v32l-12 4z" fill={R} stroke={R} />
    </g>
  ),
  personajes: (
    <>
      <path d="M8 44a16 16 0 0 1 32 0z" fill={R} />
      <circle cx="24" cy="17" r="10" fill={N} />
      <path d="M14 16a10 10 0 0 1 20 0c-5-3-15-3-20 0z" fill={M} />
    </>
  ),
  objetos: (
    <g strokeWidth="1.5" strokeLinejoin="round">
      <path d="M24 5l17 9-17 9-17-9z" fill={N} stroke={N} />
      <path d="M7 14l17 9v20L7 34z" fill={M} stroke={M} />
      <path d="M41 14L24 23v20l17-9z" fill={R} stroke={R} />
    </g>
  ),
  config: (
    <>
      <rect x="5" y="10" width="38" height="4" rx="2" fill={M} />
      <rect x="5" y="22" width="38" height="4" rx="2" fill={M} />
      <rect x="5" y="34" width="38" height="4" rx="2" fill={M} />
      <circle cx="15" cy="12" r="5" fill={N} />
      <circle cx="33" cy="24" r="5" fill={R} />
      <circle cx="22" cy="36" r="5" fill={N} />
    </>
  ),
} satisfies Record<string, ReactNode>

export type NombreGlifo = keyof typeof GLIFOS_NOMBRE

interface Props {
  /** Glifo por nombre (vistas, pestañas). */
  glifo?: NombreGlifo
  /** Emoji de una plantilla: su glifo si lo tiene, y si no el icono de siempre. */
  emoji?: string
  /** Icono del catálogo cuando no hay glifo (con `glifo`). */
  nombre?: NombreIcono
  size?: number | string
  /** Fuerza un estilo (las muestras del selector de estilo de iconos). */
  estilo?: EstiloIconos
}

// Coloridos: los tres colores del logo con su canto. Profesional: grises que
// salen del color del texto, así siguen al tema claro/oscuro y al atenuado
// de las pestañas inactivas.
const gris = (tinta: number) => `color-mix(in srgb, currentColor ${tinta}%, #8a8a8a)`
const PALETAS: Record<EstiloIconos, CSSProperties> = {
  emoji: {
    '--glifo-n': '#f6a413',
    '--glifo-r': '#f53b4b',
    '--glifo-m': '#b36bfb',
    '--glifo-canto-n': '#c14a05',
    '--glifo-canto-r': '#8e0a24',
    '--glifo-canto-m': '#8935d8',
  } as CSSProperties,
  profesional: {
    '--glifo-n': gris(35),
    '--glifo-r': gris(100),
    '--glifo-m': gris(65),
    '--glifo-canto-n': gris(10),
    '--glifo-canto-r': gris(10),
    '--glifo-canto-m': gris(10),
  } as CSSProperties,
}

/**
 * Icono de marca: el glifo a color (estilo «Coloridos», id `emoji`) o en
 * grises (estilo «Profesional»). Si no hay glifo, el `Icono` de siempre.
 */
export function IconoMarca({ glifo, emoji, nombre, size = '1.3em', estilo }: Props) {
  const estiloAjuste = useAjustes((s) => s.estiloIconos)
  const dibujo = glifo ? GLIFOS_NOMBRE[glifo] : emoji ? (GLIFOS[emoji] ?? GLIFOS_EXTERIOR[emoji]) : undefined
  if (!dibujo) return <Icono nombre={nombre} emoji={emoji} />
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-0.3em', ...PALETAS[estilo ?? estiloAjuste] }}
    >
      {dibujo}
    </svg>
  )
}
