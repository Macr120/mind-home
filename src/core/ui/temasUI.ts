/**
 * Temas de la INTERFAZ (chrome: menús, paneles, HUD, chat).
 * Distinto del tema 3D estacional (`core/house/temas.ts`), que re-viste la escena.
 *
 * Cada tema es un conjunto de variables CSS que se aplican en <html>. Los
 * componentes usan clases semánticas (`ui-app`, `ui-panel`, `text-accent`…)
 * definidas en `index.css`, por lo que cambiar de tema recolorea todo el chrome
 * sin tocar componente por componente.
 *
 * Cada tema tiene dos variantes (modo `oscuro` y `claro`). En modo claro,
 * además de las variables `--ui-*`, se sobreescribe `--color-white` de
 * Tailwind: así todas las utilidades `text-white/X`, `bg-white/X`,
 * `border-white/X` del chrome pasan a usar la tinta oscura del tema y la
 * interfaz completa se invierte sin reescribir componentes.
 *
 * El modo `transparente` no tiene paleta propia: vuelve translúcidos los fondos
 * de menús/paneles (`--ui-panel*`), de modo que la escena 3D se ve a través de
 * ellos (index.css añade el desenfoque y el menú lateral flota). Su variante
 * (clara u oscura) NO es fija: la elige la luz de la casa, porque el vidrio
 * hereda el color de lo que tiene detrás (ver `baseSegunLuz`).
 */

import { pintarBarraEstadoNativa } from './barraEstadoNativa'
import { mezclar } from '../house/temas'

/** Colores que entintan toda la interfaz; su paleta se deriva del matiz (ver `COLORES_UI`). */
type ColorUIId =
  | 'rojo'
  | 'coral'
  | 'dorado'
  | 'lima'
  | 'menta'
  | 'turquesa'
  | 'cielo'
  | 'indigo'
  | 'lavanda'
  | 'rosa'
  | 'grafito'

export type TemaUIId =
  | 'medianoche'
  | 'neon'
  | 'bosque'
  | 'ambar'
  | 'ciruela'
  | ColorUIId

export type ModoUI = 'oscuro' | 'claro' | 'transparente'
/** Modos con paleta propia; `transparente` deriva de `claro`. */
export type ModoVarsUI = 'oscuro' | 'claro'

/** Variante de paleta que usa cada modo (p. ej. para swatches de los temas). */
export function modoBase(modo: ModoUI): ModoVarsUI {
  return modo === 'oscuro' ? 'oscuro' : 'claro'
}

/** Luminancia relativa (WCAG) de un color #rrggbb. 0 = negro, 1 = blanco. */
export function luminancia(hex: string): number {
  const p = parseInt(hex.slice(1), 16)
  const canal = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return (
    0.2126 * canal((p >> 16) & 255) + 0.7152 * canal((p >> 8) & 255) + 0.0722 * canal(p & 255)
  )
}

/**
 * Variante de paleta del modo transparente según la luz de la escena que hay
 * DETRÁS del vidrio: con la casa de día el panel translúcido queda claro (tinta
 * oscura) y de noche queda oscuro (tinta clara). Con una sola variante fija, la
 * mitad del día el texto se leía a ~3:1 o menos.
 *
 * Umbrales con histéresis (entra en oscuro por debajo de 0.16, vuelve a claro
 * por encima de 0.24) para que el amanecer/atardecer conmuten UNA vez y no
 * parpadeen mientras el sol cruza el horizonte.
 */
const LUZ_A_OSCURO = 0.16
const LUZ_A_CLARO = 0.24

export function baseSegunLuz(fondoEscena: string | null, actual: ModoVarsUI): ModoVarsUI {
  // Sin color de fondo conocido (imagen personalizada): se queda como está.
  if (!fondoEscena) return actual
  const l = luminancia(fondoEscena)
  if (actual === 'claro') return l < LUZ_A_OSCURO ? 'oscuro' : 'claro'
  return l > LUZ_A_CLARO ? 'claro' : 'oscuro'
}

interface VarsTemaUI {
  /** Fondo de la app (lienzo 3D detrás). */
  '--ui-bg': string
  /** Fondo de paneles/menús sólidos. */
  '--ui-panel': string
  /** Fondo de paneles secundarios (un punto más claro). */
  '--ui-panel-2': string
  /** Color de acento (botones, resaltados, foco). */
  '--ui-accent': string
  /** Color de texto sobre el acento. */
  '--ui-accent-ink': string
  /** Tinta del texto base; en modo claro sustituye también al `white` de Tailwind. */
  '--ui-ink': string
}

export interface TemaUI {
  id: TemaUIId
  /** Etiqueta para el selector (se traduce por separado en el diccionario). */
  nombre: string
  /** Solo los temas dibujados a mano; los colores se reconocen por su muestra. */
  icon?: string
  /** Variables CSS por modo, aplicadas a document.documentElement. */
  vars: Record<ModoVarsUI, VarsTemaUI>
}

/** Los cinco temas dibujados a mano. */
export const TEMAS_UI_BASE: TemaUI[] = [
  {
    id: 'medianoche',
    nombre: 'Medianoche',
    icon: '🌙',
    vars: {
      oscuro: {
        '--ui-bg': '#0f1115',
        '--ui-panel': '#12151c',
        '--ui-panel-2': '#171b24',
        '--ui-accent': '#6ea8fe',
        '--ui-accent-ink': '#0b1020',
        '--ui-ink': '#e7e9ee',
      },
      claro: {
        '--ui-bg': '#e9edf5',
        '--ui-panel': '#f8fafd',
        '--ui-panel-2': '#eef2f8',
        '--ui-accent': '#3b76e0',
        '--ui-accent-ink': '#ffffff',
        '--ui-ink': '#1c2333',
      },
    },
  },
  {
    id: 'neon',
    nombre: 'Neón',
    icon: '🟣',
    vars: {
      oscuro: {
        '--ui-bg': '#0a0a12',
        '--ui-panel': '#14122a',
        '--ui-panel-2': '#1c1838',
        '--ui-accent': '#c084fc',
        '--ui-accent-ink': '#150a1f',
        '--ui-ink': '#e9e6f2',
      },
      claro: {
        '--ui-bg': '#f1ebfa',
        '--ui-panel': '#fbf9fe',
        '--ui-panel-2': '#f3edfb',
        '--ui-accent': '#9333ea',
        '--ui-accent-ink': '#ffffff',
        '--ui-ink': '#251a33',
      },
    },
  },
  {
    id: 'bosque',
    nombre: 'Bosque',
    icon: '🌲',
    vars: {
      oscuro: {
        '--ui-bg': '#0b120e',
        '--ui-panel': '#101d16',
        '--ui-panel-2': '#15271d',
        '--ui-accent': '#34d399',
        '--ui-accent-ink': '#06140d',
        '--ui-ink': '#e6ede8',
      },
      claro: {
        '--ui-bg': '#eaf3ed',
        '--ui-panel': '#f7fbf8',
        '--ui-panel-2': '#edf5f0',
        '--ui-accent': '#059669',
        '--ui-accent-ink': '#ffffff',
        '--ui-ink': '#18281f',
      },
    },
  },
  {
    id: 'ambar',
    nombre: 'Ámbar',
    icon: '🟠',
    vars: {
      oscuro: {
        '--ui-bg': '#13110b',
        '--ui-panel': '#1d1810',
        '--ui-panel-2': '#272013',
        '--ui-accent': '#f59e0b',
        '--ui-accent-ink': '#1a1203',
        '--ui-ink': '#efe9dd',
      },
      claro: {
        '--ui-bg': '#f7f0e1',
        '--ui-panel': '#fdfaf2',
        '--ui-panel-2': '#f5eedd',
        '--ui-accent': '#d97706',
        '--ui-accent-ink': '#ffffff',
        '--ui-ink': '#2b2110',
      },
    },
  },
  {
    id: 'ciruela',
    nombre: 'Ciruela',
    icon: '🟪',
    vars: {
      oscuro: {
        '--ui-bg': '#120b14',
        '--ui-panel': '#1b1020',
        '--ui-panel-2': '#26172c',
        '--ui-accent': '#e879b9',
        '--ui-accent-ink': '#1c0814',
        '--ui-ink': '#eee6ec',
      },
      claro: {
        '--ui-bg': '#f6ecf3',
        '--ui-panel': '#fcf8fb',
        '--ui-panel-2': '#f5edf3',
        '--ui-accent': '#d23e8e',
        '--ui-accent-ink': '#ffffff',
        '--ui-ink': '#2c1a26',
      },
    },
  },
]

/** hsl(h, s %, l %) → #rrggbb. */
function hsl(h: number, s: number, l: number): string {
  const S = s / 100
  const L = l / 100
  const a = S * Math.min(L, 1 - L)
  const canal = (n: number) => {
    const k = (n + h / 30) % 12
    const v = L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${canal(0)}${canal(8)}${canal(4)}`
}

/**
 * Tema entintado a partir de un matiz: fondo y paneles apenas teñidos, acento
 * vivo y tinta del mismo tono. Las proporciones copian las de los temas a mano
 * (medianoche ≈ matiz 220). `sat` 0 da un tema neutro (grafito). La tinta sobre
 * el acento se decide por luminancia, como hace `tinta()` en las apps.
 */
function temaDesdeMatiz(id: TemaUIId, nombre: string, h: number, sat = 1): TemaUI {
  const acentoOscuro = hsl(h, 85 * sat, 66)
  const acentoClaro = hsl(h, 70 * sat, 44)
  const tintaSobreAcento = (acento: string) =>
    luminancia(acento) > 0.25 ? hsl(h, 60 * sat, 8) : '#ffffff'
  return {
    id,
    nombre,
    vars: {
      oscuro: {
        '--ui-bg': hsl(h, 22 * sat, 7),
        '--ui-panel': hsl(h, 22 * sat, 10),
        '--ui-panel-2': hsl(h, 20 * sat, 14),
        '--ui-accent': acentoOscuro,
        '--ui-accent-ink': tintaSobreAcento(acentoOscuro),
        '--ui-ink': hsl(h, 12 * sat, 92),
      },
      claro: {
        '--ui-bg': hsl(h, 38 * sat, 93),
        '--ui-panel': hsl(h, 45 * sat, 98),
        '--ui-panel-2': hsl(h, 38 * sat, 95),
        '--ui-accent': acentoClaro,
        '--ui-accent-ink': tintaSobreAcento(acentoClaro),
        '--ui-ink': hsl(h, 28 * sat, 15),
      },
    },
  }
}

const COLORES_BASE: { id: ColorUIId; nombre: string; matiz: number; sat?: number }[] = [
  { id: 'rojo', nombre: 'Rojo', matiz: 0 },
  { id: 'coral', nombre: 'Coral', matiz: 16 },
  { id: 'dorado', nombre: 'Dorado', matiz: 42 },
  { id: 'lima', nombre: 'Lima', matiz: 85 },
  { id: 'menta', nombre: 'Menta', matiz: 150 },
  { id: 'turquesa', nombre: 'Turquesa', matiz: 175 },
  { id: 'cielo', nombre: 'Cielo', matiz: 200 },
  { id: 'indigo', nombre: 'Índigo', matiz: 235 },
  { id: 'lavanda', nombre: 'Lavanda', matiz: 265 },
  { id: 'rosa', nombre: 'Rosa', matiz: 335 },
  { id: 'grafito', nombre: 'Grafito', matiz: 220, sat: 0 },
]

/** Colores que entintan toda la interfaz (segunda columna del selector). */
export const COLORES_UI: TemaUI[] = COLORES_BASE.map((c) =>
  temaDesdeMatiz(c.id, c.nombre, c.matiz, c.sat),
)

/** Catálogo completo: lo que resuelven el chat, los widgets y `getTemaUI`. */
export const TEMAS_UI: TemaUI[] = [...TEMAS_UI_BASE, ...COLORES_UI]

export const TEMA_UI_DEFAULT: TemaUIId = 'medianoche'
/** Con qué luz arranca una instalación nueva. Claro: es lo que espera quien abre
 *  la app de día y por primera vez; el oscuro sigue a un toque en Configuraciones. */
export const MODO_UI_DEFAULT: ModoUI = 'claro'

/** Defaults del vidrio: equivalen al look previo (panel ~92% + blur 12px). */
export const VIDRIO_TRANSPARENCIA_DEFAULT = 0.15
export const VIDRIO_INTENSIDAD_DEFAULT = 0.6

/**
 * Vidrio de la interfaz (paneles y chips flotantes sobre el 3D): opacidad del
 * panel y desenfoque del fondo. Ambos 0..1, desde los sliders de Configuraciones.
 * transparencia 0 = panel sólido; 1 = 60% transparente (tope para no perder lectura).
 */
export function aplicarVidrioUI(transparencia: number, intensidad: number): void {
  const root = document.documentElement
  root.style.setProperty('--ui-vidrio-alfa', `${Math.round(100 - transparencia * 60)}%`)
  root.style.setProperty('--ui-vidrio-blur', `${Math.round(intensidad * 20)}px`)
}

/** Tinte de fábrica: la paleta del tema tal cual. */
export const TINTE_UI_DEFAULT = 0

// Cuánto acento entra en el fondo y en los paneles con el tinte al máximo: más,
// y la tinta del texto (y los rótulos `text-white/35`) dejan de leerse.
const TINTE_FONDO_MAX = 0.45
const TINTE_PANEL_MAX = 0.38

let tinteUI = TINTE_UI_DEFAULT
/** Lo último aplicado, para rehacerlo con la misma base cuando solo cambia el tinte. */
let ultimoAplicado: { id: TemaUIId; modo: ModoUI; base?: ModoVarsUI } | null = null

/** Fondo y paneles teñidos con el acento; con 0 la paleta vuelve intacta. */
function entintar(vars: VarsTemaUI, tinte: number): VarsTemaUI {
  if (tinte <= 0) return vars
  const acento = vars['--ui-accent']
  return {
    ...vars,
    '--ui-bg': mezclar(vars['--ui-bg'], acento, tinte * TINTE_FONDO_MAX),
    '--ui-panel': mezclar(vars['--ui-panel'], acento, tinte * TINTE_PANEL_MAX),
    '--ui-panel-2': mezclar(vars['--ui-panel-2'], acento, tinte * TINTE_PANEL_MAX),
  }
}

/**
 * Tinte de la interfaz (0..1, la barra de Configuraciones): cuánto se tiñen
 * fondo y paneles del CHROME con el acento del tema, además de los botones; las
 * apps de los cuartos quedan fuera (`.ui-app`). Reaplica el tema en curso con
 * la misma base, para que el vidrio no pierda la suya.
 */
export function aplicarTinteUI(tinte: number): void {
  tinteUI = tinte
  if (ultimoAplicado) aplicarTemaUI(ultimoAplicado.id, ultimoAplicado.modo, ultimoAplicado.base)
}

function getTemaUI(id: TemaUIId): TemaUI {
  return TEMAS_UI.find((t) => t.id === id) ?? TEMAS_UI[0]
}

/**
 * Aplica las variables CSS del tema y modo al documento. `baseTransparente`
 * llega desde `useVidrioSegunLuz` para que el modo transparente siga la luz de
 * la casa; los otros modos la ignoran.
 */
export function aplicarTemaUI(id: TemaUIId, modo: ModoUI, baseTransparente?: ModoVarsUI): void {
  const tema = getTemaUI(id)
  const root = document.documentElement
  const base = modo === 'transparente' ? (baseTransparente ?? modoBase(modo)) : modoBase(modo)
  ultimoAplicado = { id, modo, base: baseTransparente }
  const puro = tema.vars[base] ?? tema.vars.oscuro
  const vars = entintar(puro, tinteUI)
  for (const [prop, valor] of Object.entries(vars)) {
    root.style.setProperty(prop, valor)
  }
  // Las apps de los cuartos NO se tiñen: traen sus colores y las entinta el
  // color del cuarto. `.ui-app` (index.css) vuelve a esta paleta pura.
  root.style.setProperty('--ui-bg-puro', puro['--ui-bg'])
  root.style.setProperty('--ui-panel-puro', puro['--ui-panel'])
  root.style.setProperty('--ui-panel-2-puro', puro['--ui-panel-2'])
  // Panel del tema SIN el rebaje del modo transparente: lo usan las superficies
  // que deben leerse sí o sí sobre la escena (tarjeta del tutorial, `.ui-panel-legible`).
  root.style.setProperty('--ui-panel-solido', vars['--ui-panel'])
  // Transparente: los menús dejan pasar la escena 3D. El fondo de la app
  // (--ui-bg) sigue sólido, así las apps de los cuartos abren normales.
  //
  // La opacidad se deriva del slider «Transparencia» (--ui-vidrio-alfa), para
  // que también gradúe los menús y no solo los paneles flotantes. Las tarjetas
  // internas (--ui-panel-2) van un punto por encima porque se apilan sobre el
  // panel exterior: al mismo valor la suma de ambas capas quedaba casi opaca.
  // El mínimo evita que con el slider a tope el texto quede sobre la escena
  // desnuda.
  if (modo === 'transparente') {
    const vidrio = (color: string, minimo: number, factor: number) =>
      `color-mix(in srgb, ${color} max(${minimo}%, calc(var(--ui-vidrio-alfa, 92%) * ${factor})), transparent)`
    root.style.setProperty('--ui-panel', vidrio(vars['--ui-panel'], 26, 0.42))
    root.style.setProperty('--ui-panel-2', vidrio(vars['--ui-panel-2'], 32, 0.5))
    root.style.setProperty('--ui-panel-puro', vidrio(puro['--ui-panel'], 26, 0.42))
    root.style.setProperty('--ui-panel-2-puro', vidrio(puro['--ui-panel-2'], 32, 0.5))
  }
  // Con base clara, el `white` de Tailwind pasa a ser la tinta oscura del tema:
  // texto, bordes y hovers `*-white/X` de toda la app se invierten solos.
  // Las zonas marcadas con `.ui-noche` (lightbox, overlays nocturnos) lo
  // restauran localmente en index.css.
  if (base === 'claro') {
    root.style.setProperty('--color-white', vars['--ui-ink'])
  } else {
    root.style.removeProperty('--color-white')
  }
  root.dataset.temaUi = id
  root.dataset.modoUi = modo
  // Los re-mapeos del modo claro en index.css cuelgan de la BASE, para que
  // `transparente` los herede sin duplicar cada selector.
  root.dataset.baseUi = base
  // La barra de estado (Android/PWA) acompaña al fondo del tema activo.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', vars['--ui-bg'])
  // En iOS el `theme-color` no pinta nada: la barra la manda el sistema.
  pintarBarraEstadoNativa(base)
}
