/**
 * Temas de la INTERFAZ (chrome: menús, paneles, HUD, chat).
 * Distinto del tema 3D estacional (`core/house/temas.ts`), que re-viste la escena.
 *
 * Cada tema es un conjunto de variables CSS que se aplican en <html>. Los
 * componentes usan clases semánticas (`ui-app`, `ui-panel`, `text-accent`…)
 * definidas en `index.css`, por lo que cambiar de tema recolorea todo el chrome
 * sin tocar componente por componente. Todos son de familia oscura para que el
 * texto claro (`text-white/X`) siga siendo legible.
 */

export type TemaUIId =
  | 'medianoche'
  | 'neon'
  | 'bosque'
  | 'ambar'
  | 'ciruela'

export interface TemaUI {
  id: TemaUIId
  /** Etiqueta para el selector (se traduce por separado en el diccionario). */
  nombre: string
  icon: string
  /** Variables CSS aplicadas a document.documentElement. */
  vars: {
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
  }
}

export const TEMAS_UI: TemaUI[] = [
  {
    id: 'medianoche',
    nombre: 'Medianoche',
    icon: '🌙',
    vars: {
      '--ui-bg': '#0f1115',
      '--ui-panel': '#12151c',
      '--ui-panel-2': '#171b24',
      '--ui-accent': '#6ea8fe',
      '--ui-accent-ink': '#0b1020',
    },
  },
  {
    id: 'neon',
    nombre: 'Neón',
    icon: '🟣',
    vars: {
      '--ui-bg': '#0a0a12',
      '--ui-panel': '#14122a',
      '--ui-panel-2': '#1c1838',
      '--ui-accent': '#c084fc',
      '--ui-accent-ink': '#150a1f',
    },
  },
  {
    id: 'bosque',
    nombre: 'Bosque',
    icon: '🌲',
    vars: {
      '--ui-bg': '#0b120e',
      '--ui-panel': '#101d16',
      '--ui-panel-2': '#15271d',
      '--ui-accent': '#34d399',
      '--ui-accent-ink': '#06140d',
    },
  },
  {
    id: 'ambar',
    nombre: 'Ámbar',
    icon: '🟠',
    vars: {
      '--ui-bg': '#13110b',
      '--ui-panel': '#1d1810',
      '--ui-panel-2': '#272013',
      '--ui-accent': '#f59e0b',
      '--ui-accent-ink': '#1a1203',
    },
  },
  {
    id: 'ciruela',
    nombre: 'Ciruela',
    icon: '🟪',
    vars: {
      '--ui-bg': '#120b14',
      '--ui-panel': '#1b1020',
      '--ui-panel-2': '#26172c',
      '--ui-accent': '#e879b9',
      '--ui-accent-ink': '#1c0814',
    },
  },
]

export const TEMA_UI_DEFAULT: TemaUIId = 'medianoche'

export function getTemaUI(id: TemaUIId): TemaUI {
  return TEMAS_UI.find((t) => t.id === id) ?? TEMAS_UI[0]
}

/** Aplica las variables CSS del tema al documento. */
export function aplicarTemaUI(id: TemaUIId): void {
  const tema = getTemaUI(id)
  const root = document.documentElement
  for (const [prop, valor] of Object.entries(tema.vars)) {
    root.style.setProperty(prop, valor)
  }
  root.dataset.temaUi = id
}
