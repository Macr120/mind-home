// Datos de una guía: el guion narrado (marketing/guias/<tema>/guion.<id>.json)
// y los textos de la interfaz (web/i18n/guias/<id>.json). Cada idioma llega en
// su propio chunk: la página solo baja el suyo.

export interface Visual {
  tipo: 'titulo' | 'encabezado' | 'fondo' | 'grafica' | 'dato' | 'pasos' | 'lista' | 'foto' | 'herramienta' | 'aviso' | 'meme' | 'cita'
  meme?: string
  grafica?: string
  cifra?: string
  clave?: string
  claves?: string[]
  foto?: string
  herramienta?: string
}

export interface Linea {
  id: string
  escena: string
  visual: Visual
  texto: string
  mencion?: boolean
  /** Meme extra que acompaña a la línea, además de su visual. */
  meme?: string
  /** Plano de Pep@ en la grabación (si no, sale del tipo de visual). */
  plano?: 'mitad' | 'esquina' | 'cuerpo'
  /** Imagen o clip de medios.json → laminas, en la esquina del video; con varias, se reparten la línea. */
  lamina?: string | string[]
  /** En el video se narra sobre la toma de la casa: la grabación de la página se la salta. */
  enCasa?: boolean
}

export interface Parte {
  id: string
  titulo: string
  lineas: Linea[]
}

export interface Guion {
  idioma: string
  tema: string
  plantillaId: string
  pregunta: string
  subtitulo: string
  aviso: string
  partes: Parte[]
  cierre: { id: string; escena: string; texto: string; boton: string; mencion?: boolean; lamina?: string; anclas?: Record<string, string> }
  fuentes: { id: string; texto: string; url: string }[]
}

/** Árbol de textos de la interfaz: `t('ejercicio.rpe.n5')`. */
export type Textos = { [k: string]: string | Textos }

const GUIONES = import.meta.glob<Guion>('../../../marketing/guias/*/guion.*.json', { import: 'default' })
const TEXTOS = import.meta.glob<Textos>('../../i18n/guias/*.json', { import: 'default' })

export const IDIOMAS_GUIA = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar']

/** Idiomas con guion para un tema (el selector solo ofrece esos). */
export function idiomasDe(tema: string): string[] {
  return IDIOMAS_GUIA.filter((id) => `../../../marketing/guias/${tema}/guion.${id}.json` in GUIONES)
}

export async function cargarGuia(tema: string, idioma: string): Promise<{ guion: Guion; textos: Textos; idioma: string }> {
  const id = idiomasDe(tema).includes(idioma) ? idioma : 'es'
  const textosId = `../../i18n/guias/${id}.json` in TEXTOS ? id : 'es'
  const [guion, textos, base] = await Promise.all([
    GUIONES[`../../../marketing/guias/${tema}/guion.${id}.json`](),
    TEXTOS[`../../i18n/guias/${textosId}.json`](),
    TEXTOS['../../i18n/guias/es.json'](),
  ])
  // Lo que falte en un idioma cae al español en vez de dejar un hueco.
  return { guion, textos: fusionar(base, textos), idioma: id }
}

function fusionar(base: Textos, encima: Textos): Textos {
  const r: Textos = { ...base }
  for (const [k, v] of Object.entries(encima)) {
    const b = base[k]
    r[k] = typeof v === 'object' && typeof b === 'object' ? fusionar(b, v) : v
  }
  return r
}

export function crearT(textos: Textos) {
  return (clave: string): string => {
    let nodo: string | Textos | undefined = textos
    for (const parte of clave.split('.')) nodo = typeof nodo === 'object' ? nodo[parte] : undefined
    return typeof nodo === 'string' ? nodo : clave
  }
}

export type T = ReturnType<typeof crearT>
