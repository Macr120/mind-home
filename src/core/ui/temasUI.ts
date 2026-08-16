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

export type TemaUIId =
  | 'medianoche'
  | 'neon'
  | 'bosque'
  | 'ambar'
  | 'ciruela'

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
  icon: string
  /** Variables CSS por modo, aplicadas a document.documentElement. */
  vars: Record<ModoVarsUI, VarsTemaUI>
}

export const TEMAS_UI: TemaUI[] = [
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

export const TEMA_UI_DEFAULT: TemaUIId = 'medianoche'
export const MODO_UI_DEFAULT: ModoUI = 'oscuro'

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
  const vars = tema.vars[base] ?? tema.vars.oscuro
  for (const [prop, valor] of Object.entries(vars)) {
    root.style.setProperty(prop, valor)
  }
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
    root.style.setProperty(
      '--ui-panel',
      `color-mix(in srgb, ${vars['--ui-panel']} max(26%, calc(var(--ui-vidrio-alfa, 92%) * 0.42)), transparent)`,
    )
    root.style.setProperty(
      '--ui-panel-2',
      `color-mix(in srgb, ${vars['--ui-panel-2']} max(32%, calc(var(--ui-vidrio-alfa, 92%) * 0.5)), transparent)`,
    )
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
}
