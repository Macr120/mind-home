import { gruposCardioRepo, gruposFlexRepo, gruposFuerzaRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import { MAPA } from './anim/mapa'
import { slugTexto } from './slug'

/**
 * Encontrar un ejercicio del catálogo en el texto libre del chat («muéstrame
 * cómo se hace el press banca», «show me the bench press»). Se compara por
 * SLUG: el del texto contiene el del ejercicio, en español canónico o en el
 * nombre traducido al idioma activo; gana la coincidencia más larga (mismo
 * criterio que `resolverComandoApp`).
 */

/** Verbos de «enséñame cómo se hace» (sobre texto normalizado, sin acentos). */
export const RE_DEMO_EJERCICIO =
  /^(?:muestrame|ensename|demuestra(?:me)?|haz(?:me)?|como se hace(?:n)?|como hacer)\b/

/** Slug de un texto libre, acotado con guiones para comparar por tokens. */
const acotar = (texto: string): string => `-${slugTexto(texto)}-`

/** Slug traducido de un ejercicio de fábrica (vacío si no hay traducción). */
function slugTraducido(slug: string): string {
  const nombre = tGlobal(`ejercicio.ej.${slug}`, '')
  return nombre ? slugTexto(nombre) : ''
}

/** Mejor slug de fábrica contenido en el texto (síncrono: solo `MAPA`, sin BD). */
function slugFabricaEn(texto: string): string | null {
  const s = acotar(texto)
  let mejor: string | null = null
  for (const slug of Object.keys(MAPA)) {
    const tr = slugTraducido(slug)
    if (s.includes(`-${slug}-`) || (tr && s.includes(`-${tr}-`))) {
      if (!mejor || slug.length > mejor.length) mejor = slug
    }
  }
  return mejor
}

/** ¿El texto pide ver cómo se hace un ejercicio de fábrica? (síncrono; lo usa la ayuda para ceder). */
export function pareceDemoEjercicio(normalizado: string): boolean {
  return RE_DEMO_EJERCICIO.test(normalizado.trim()) && slugFabricaEn(normalizado) !== null
}

export interface EjercicioHallado {
  nombre: string
  descripcion?: string
}

/**
 * Ejercicio del catálogo VIVO (fuerza, cardio, flex, propios incluidos) cuyo
 * nombre —canónico o traducido— aparece en el texto. Si el usuario nunca abrió
 * la app las tablas están vacías y se cae a la semilla de `catalogo.ts`.
 */
export async function encontrarEjercicio(texto: string): Promise<EjercicioHallado | null> {
  const [fuerza, cardio, flex] = await Promise.all([
    gruposFuerzaRepo.list(),
    gruposCardioRepo.list(),
    gruposFlexRepo.list(),
  ])
  let ejercicios: EjercicioHallado[] = [...fuerza, ...cardio, ...flex].flatMap((g) => g.ejercicios)
  if (ejercicios.length === 0) {
    const c = await import('./catalogo')
    ejercicios = [...c.CATALOGO_FUERZA, ...c.CATALOGO_CARDIO, ...c.CATALOGO_FLEX].flatMap((g) => g.ejercicios)
  }
  const s = acotar(texto)
  let mejor: EjercicioHallado | null = null
  let largo = 0
  for (const e of ejercicios) {
    const slug = slugTexto(e.nombre)
    if (!slug) continue
    const tr = slugTraducido(slug)
    if (s.includes(`-${slug}-`) || (tr && s.includes(`-${tr}-`))) {
      if (slug.length > largo) {
        mejor = { nombre: e.nombre, descripcion: e.descripcion }
        largo = slug.length
      }
    }
  }
  return mejor
}
