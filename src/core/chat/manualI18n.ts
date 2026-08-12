import { useSyncExternalStore } from 'react'
import type { Idioma } from '../i18n/idiomas'
import { useAjustes } from '../state/ajustesStore'

/**
 * Las frases de ejemplo del manual de comandos, traducidas.
 *
 * El español y el inglés viven EN LÍNEA en `ManualComandos.tsx` (son 700 pares
 * y ahí se leen al lado de la carpeta a la que pertenecen). Los demás idiomas
 * viajan aparte y solo se descargan con el manual, que ya es `lazy`: quien
 * nunca lo abre no baja ni este módulo ni sus traducciones.
 *
 * Cada mapa va indexado por el TEXTO ESPAÑOL de origen, no por un id: así no
 * hay que numerar las 700 entradas, reordenar el catálogo no descoloca nada y,
 * si alguien cambia una frase en español, su traducción vieja deja de
 * encontrarse sola y se cae al respaldo en vez de mentir.
 */
export interface ManualTraducido {
  /** Por `Ejemplo.frase`. Conserva el marcado [orden]/{variable}. */
  frases: Record<string, string>
  /** Por `Atajo.accion`. */
  atajos: Record<string, string>
  /** Por `Atajo.teclas`, solo donde el nombre de la tecla cambie. */
  teclas?: Record<string, string>
}

const CARGADORES: Partial<Record<Idioma, () => Promise<ManualTraducido>>> = {
  pt: () => import('./manual.pt').then((m) => m.MANUAL_PT),
  fr: () => import('./manual.fr').then((m) => m.MANUAL_FR),
  de: () => import('./manual.de').then((m) => m.MANUAL_DE),
  it: () => import('./manual.it').then((m) => m.MANUAL_IT),
}

// Mismo mecanismo que los diccionarios de `i18n/dict.ts`: un mapa abierto que
// se rellena al llegar cada carga y una versión que despierta a los montados.
const CARGADOS = new Map<Idioma, ManualTraducido>()
const enMarcha = new Set<Idioma>()
const oyentes = new Set<() => void>()
let version = 0

/** Idempotente: dispara la carga del manual de ese idioma si hace falta. */
function asegurarManual(idioma: Idioma): void {
  const cargar = CARGADORES[idioma]
  if (!cargar || CARGADOS.has(idioma) || enMarcha.has(idioma)) return
  enMarcha.add(idioma)
  void cargar().then((m) => {
    CARGADOS.set(idioma, m)
    version++
    oyentes.forEach((fn) => fn())
  })
}

const store = {
  subscribe(fn: () => void): () => void {
    oyentes.add(fn)
    return () => oyentes.delete(fn)
  },
  getSnapshot: () => version,
}

// Suscripción a nivel de módulo, como en `useT`: sin efectos por componente y
// sin side effects en render. Este módulo solo se carga con el manual abierto.
asegurarManual(useAjustes.getState().idioma)
useAjustes.subscribe((s) => asegurarManual(s.idioma))

/**
 * El manual traducido del idioma activo, o `null` mientras llega (y siempre en
 * español e inglés, que no necesitan descarga). Quien lo use debe quedarse con
 * su texto en línea cuando esto sea `null`.
 */
export function useManualTraducido(idioma: Idioma): ManualTraducido | null {
  // No se lee: solo invalida el render cuando aterriza una carga.
  useSyncExternalStore(store.subscribe, store.getSnapshot)
  return CARGADOS.get(idioma) ?? null
}
