/**
 * Diccionario de traducciones de la interfaz.
 *
 * Diseño incremental: cada texto se pide con `t('clave', 'Español por defecto')`.
 * Si falta la entrada en el idioma activo, se cae al español (o al fallback que
 * pasa el componente), por lo que la app NUNCA queda con claves crudas y se
 * puede traducir por zonas sin romper nada.
 *
 * Cada idioma traducido vive en su `dict.<id>.ts` (claves agrupadas por área con
 * prefijo: `nav.*`, `cat.*`, `room.<id>.*`, …) y se carga con import() perezoso:
 * son ~90 KB gzip que un usuario en español nunca descarga. Mientras llega, la
 * UI pinta los fallbacks en español y `useT` re-renderiza al terminar la carga.
 * Añadir un idioma es añadirlo a `idiomas.ts` y colgar su cargador de CARGADORES.
 *
 * DOS CAPAS por idioma: la interfaz (`dict.<id>.ts`) y los textos de PASO de los
 * tutoriales (`dict.<id>.tut.ts`, ~19 % del total), que solo hacen falta con un
 * tour corriendo. Los títulos y resúmenes de los tours se quedan en la primera:
 * el selector y el chat los pintan sin abrir nada.
 */
import type { Idioma } from './idiomas'

export type Dict = Record<string, string>

/**
 * Español explícito (opcional). Normalmente no hace falta porque el fallback
 * del componente ya está en español, pero se deja el mapa por si se quiere
 * forzar un texto distinto al literal del componente.
 */
const ES: Dict = {}

/**
 * Diccionarios ya cargados. Mapa ABIERTO: un idioma aparece cuando su cargador
 * termina, así que quien lea debe hacerlo con `?.` (ver `useT.traducir`).
 */
export const DICTS: Record<string, Dict> = { es: ES }

// --- Carga perezosa del inglés + aviso a React (useSyncExternalStore) ---

let version = 0
const oyentes = new Set<() => void>()

/** Suscripción/versión para que `useT` re-renderice cuando llega un diccionario. */
export const dictStore = {
  subscribe(fn: () => void): () => void {
    oyentes.add(fn)
    return () => oyentes.delete(fn)
  },
  getSnapshot: () => version,
}

/**
 * Un cargador por idioma traducido. El español no tiene: su texto viaja en línea
 * en cada `t('clave', 'Español')`, que es el último respaldo de la cascada.
 */
const CARGADORES: Partial<Record<Idioma, () => Promise<Dict>>> = {
  en: () => import('./dict.en').then((m) => m.EN),
  pt: () => import('./dict.pt').then((m) => m.PT),
  fr: () => import('./dict.fr').then((m) => m.FR),
  de: () => import('./dict.de').then((m) => m.DE),
  it: () => import('./dict.it').then((m) => m.IT),
}

/** Segunda capa: los textos de paso, que solo bajan al lanzar un tutorial. */
const CARGADORES_TUT: Partial<Record<Idioma, () => Promise<Dict>>> = {
  en: () => import('./dict.en.tut').then((m) => m.EN_TUT),
  pt: () => import('./dict.pt.tut').then((m) => m.PT_TUT),
  fr: () => import('./dict.fr.tut').then((m) => m.FR_TUT),
  de: () => import('./dict.de.tut').then((m) => m.DE_TUT),
  it: () => import('./dict.it.tut').then((m) => m.IT_TUT),
}

const enMarcha = new Map<string, Promise<void>>()

/** Funde la capa en el diccionario del idioma y avisa a los `useT` montados. */
function cargarCapa(clave: string, idioma: string, cargar: () => Promise<Dict>): Promise<void> {
  let p = enMarcha.get(clave)
  if (!p) {
    p = cargar().then(
      (d) => {
        DICTS[idioma] = { ...DICTS[idioma], ...d }
        version++
        oyentes.forEach((fn) => fn())
      },
      (e) => {
        // Un fallo puntual del chunk (dev server recargando, red caída) no debe
        // quedarse cacheado: sin esto, TODOS los tutoriales del idioma seguían
        // fallando al instante hasta recargar la página.
        enMarcha.delete(clave)
        throw e
      },
    )
    enMarcha.set(clave, p)
  }
  return p
}

/** Idempotente: dispara la carga del diccionario del idioma si hace falta. */
export function asegurarIdioma(idioma: string): void {
  const cargar = CARGADORES[idioma as Idioma]
  if (cargar) void cargarCapa(idioma, idioma, cargar)
}

/**
 * Espera a los textos de paso del idioma activo. Lo llama `useTutorial.iniciar`
 * ANTES de publicar el cuerpo del tour, así que la tarjeta nunca se pinta en
 * español mientras llegan. Sin traducción para ese idioma resuelve al instante.
 */
export function asegurarDictTut(idioma: string): Promise<void> {
  const cargar = CARGADORES_TUT[idioma as Idioma]
  if (!cargar) return Promise.resolve()
  // La capa base primero: fundir la de pasos sobre un idioma aún sin cargar lo
  // dejaría a medias y la carga base lo sobrescribiría al llegar.
  asegurarIdioma(idioma)
  const base = enMarcha.get(idioma) ?? Promise.resolve()
  return base.then(() => cargarCapa(`${idioma}:tut`, idioma, cargar))
}
