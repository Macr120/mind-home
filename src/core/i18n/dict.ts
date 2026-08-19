/**
 * Diccionario de traducciones de la interfaz.
 *
 * Diseño incremental: cada texto se pide con `t('clave', 'Español por defecto')`.
 * El español es la FUENTE DE VERDAD (vive en esos fallbacks del código), pero el
 * RESPALDO visible de los demás idiomas es el inglés: si falta la entrada en el
 * idioma activo se cae a `dict.en.ts`, y solo en último término al español. La
 * app NUNCA queda con claves crudas y se puede traducir por zonas sin romper nada.
 *
 * Cada idioma traducido vive en su `dict.<id>.ts` (claves agrupadas por área con
 * prefijo: `nav.*`, `cat.*`, `room.<id>.*`, …) y se carga con import() perezoso:
 * son ~90 KB gzip que un usuario en español nunca descarga. Con un idioma que no
 * sea español baja también el inglés (el respaldo). Mientras llega, la UI pinta
 * los fallbacks en español y `useT` re-renderiza al terminar la carga.
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
  ja: () => import('./dict.ja').then((m) => m.JA),
  zh: () => import('./dict.zh').then((m) => m.ZH),
  ko: () => import('./dict.ko').then((m) => m.KO),
  ru: () => import('./dict.ru').then((m) => m.RU),
  hi: () => import('./dict.hi').then((m) => m.HI),
  tr: () => import('./dict.tr').then((m) => m.TR),
  id: () => import('./dict.id').then((m) => m.ID),
  pl: () => import('./dict.pl').then((m) => m.PL),
  nl: () => import('./dict.nl').then((m) => m.NL),
  ar: () => import('./dict.ar').then((m) => m.AR),
}

/** Segunda capa: los textos de paso, que solo bajan al lanzar un tutorial. */
const CARGADORES_TUT: Partial<Record<Idioma, () => Promise<Dict>>> = {
  en: () => import('./dict.en.tut').then((m) => m.EN_TUT),
  pt: () => import('./dict.pt.tut').then((m) => m.PT_TUT),
  fr: () => import('./dict.fr.tut').then((m) => m.FR_TUT),
  de: () => import('./dict.de.tut').then((m) => m.DE_TUT),
  it: () => import('./dict.it.tut').then((m) => m.IT_TUT),
  ja: () => import('./dict.ja.tut').then((m) => m.JA_TUT),
  zh: () => import('./dict.zh.tut').then((m) => m.ZH_TUT),
  ko: () => import('./dict.ko.tut').then((m) => m.KO_TUT),
  ru: () => import('./dict.ru.tut').then((m) => m.RU_TUT),
  hi: () => import('./dict.hi.tut').then((m) => m.HI_TUT),
  tr: () => import('./dict.tr.tut').then((m) => m.TR_TUT),
  id: () => import('./dict.id.tut').then((m) => m.ID_TUT),
  pl: () => import('./dict.pl.tut').then((m) => m.PL_TUT),
  nl: () => import('./dict.nl.tut').then((m) => m.NL_TUT),
  ar: () => import('./dict.ar.tut').then((m) => m.AR_TUT),
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

/** Idempotente: dispara la carga del diccionario del idioma si hace falta.
 *  Con un idioma traducido que no sea el inglés carga TAMBIÉN el inglés: es el
 *  respaldo de las claves sin traducir (ver `traducir` en useT). */
export function asegurarIdioma(idioma: string): void {
  const cargar = CARGADORES[idioma as Idioma]
  if (cargar) void cargarCapa(idioma, idioma, cargar)
  if (cargar && idioma !== 'en') void cargarCapa('en', 'en', CARGADORES.en!)
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
  // El respaldo inglés de los pasos, sin esperar: si un paso falta en el idioma
  // activo debe salir en inglés (misma cascada que la capa base).
  if (idioma !== 'en') {
    const baseEn = enMarcha.get('en') ?? Promise.resolve()
    // Al mejor esfuerzo: si el chunk inglés falla no debe tumbar el tour (ni
    // dejar un unhandled rejection); `cargarCapa` ya des-cachea para reintentar.
    baseEn.then(() => cargarCapa('en:tut', 'en', CARGADORES_TUT.en!)).catch(() => {})
  }
  const base = enMarcha.get(idioma) ?? Promise.resolve()
  return base.then(() => cargarCapa(`${idioma}:tut`, idioma, cargar))
}
