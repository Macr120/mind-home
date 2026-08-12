/**
 * Registro de builders del año demo, por app (plantillaId).
 *
 * Cada builder vive en `src/rooms/<id>/demo.ts` con su contenido bilingüe en
 * `src/rooms/<id>/demo.data.ts` (generado offline por `scripts/generar-demo.mjs`)
 * y se carga con import DINÁMICO: ese contenido no entra al bundle inicial.
 *
 * Contrato: un builder inserta el año de su app con fechas relativas
 * (`ctx.fecha(offset)`, offset −364..0), SIN `ejemploDe` (la gamificación debe
 * contarlas) y sin depender de otros builders (activación por partes).
 */
import { fechaLocalISO, isoMasDias } from '../core/fechaLocal'
import type { Idioma } from '../core/i18n/idiomas'
import { idiomaActual } from '../core/i18n/useT'

/** Los idiomas que un `demo.data.i18n.ts` puede traer (el español es la base). */
export type ExtraIdiomas<T> = Partial<Record<Idioma, T>>

export interface CtxDemo {
  /** Fecha local de hoy (yyyy-mm-dd): el día 0 del año demo. */
  hoy: string
  /** Fecha ISO del día `off` (−364..0) relativo a hoy. */
  fecha: (off: number) => string
  idioma: Idioma
  /** Foto del contenido demo (public/demo/<clave>.webp); null si no existe. */
  foto: (clave: string) => Promise<Blob | null>
  /**
   * El contenido del año demo en el idioma del ctx.
   *
   * El español y el inglés viajan en `demo.data.ts`, que es lo que ya baja hoy
   * todo el mundo; los demás idiomas viven en `demo.data.i18n.ts` y solo se
   * descargan si el usuario está en uno de ellos. Lo que no esté traducido cae
   * al español, nunca al inglés: un idioma a medias se ve a medias.
   */
  textos: <B extends { es: unknown }>(
    base: B,
    extra?: () => Promise<{ default: ExtraIdiomas<B['es']> }>,
  ) => Promise<B['es']>
}

export type BuilderDemo = (ctx: CtxDemo) => Promise<void>

/** Builders por app: las 16 apps de cuarto tienen su año. */
export const BUILDERS_DEMO: Record<string, () => Promise<BuilderDemo>> = {
  ejercicio: () => import('../rooms/ejercicio/demo').then((m) => m.construirDemoEjercicio),
  cocina: () => import('../rooms/cocina/demo').then((m) => m.construirDemoCocina),
  descanso: () => import('../rooms/descanso/demo').then((m) => m.construirDemoDescanso),
  anecdotario: () => import('../rooms/anecdotario/demo').then((m) => m.construirDemoAnecdotario),
  jardin: () => import('../rooms/jardin/demo').then((m) => m.construirDemoJardin),
  hobbies: () => import('../rooms/hobbies/demo').then((m) => m.construirDemoHobbies),
  ideas: () => import('../rooms/ideas/demo').then((m) => m.construirDemoIdeas),
  biblioteca: () => import('../rooms/biblioteca/demo').then((m) => m.construirDemoBiblioteca),
  idiomas: () => import('../rooms/idiomas/demo').then((m) => m.construirDemoIdiomas),
  agenda: () => import('../rooms/agenda/demo').then((m) => m.construirDemoAgenda),
  // Clave SIN plantilla: el calendario ya no es una app de cuarto, pero su año
  // (las rutinas de Pep@, su cumplimiento y los tres planes) sigue haciendo falta.
  // Lo dispara el propio modal del reloj al abrirse dentro del demo.
  calendario: () => import('./anioCalendario').then((m) => m.construirDemoCalendario),
  diario: () => import('../rooms/diario/demo').then((m) => m.construirDemoDiario),
  entretenimiento: () =>
    import('../rooms/entretenimiento/demo').then((m) => m.construirDemoEntretenimiento),
  garage: () => import('../rooms/garage/demo').then((m) => m.construirDemoGarage),
  sala: () => import('../rooms/sala/demo').then((m) => m.construirDemoSala),
  despacho: () => import('../rooms/despacho/demo').then((m) => m.construirDemoDespacho),
  computo: () => import('../rooms/computo/demo').then((m) => m.construirDemoComputo),
}

/**
 * RNG determinista para las sesiones "de relleno" de los builders: el mismo
 * demo debe salir idéntico en cada construcción (Math.random daría casas
 * distintas y haría imposible afinar el contenido).
 */
export function rngDemo(semilla: number): () => number {
  let s = semilla
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

export function crearCtxDemo(): CtxDemo {
  const hoy = fechaLocalISO()
  const idioma = idiomaActual()
  return {
    hoy,
    fecha: (off) => isoMasDias(hoy, off),
    idioma,
    async textos(base, extra) {
      const propio = (base as ExtraIdiomas<unknown>)[idioma]
      if (propio !== undefined) return propio as never
      const traducido = extra && (await extra()).default[idioma]
      return (traducido ?? base.es) as never
    },
    foto: async (clave) => {
      try {
        // Con tope: un fetch colgado (server zombi, red móvil) no rechaza nunca
        // y dejaba la construcción del año — y el tour que la esperaba — parada
        // para siempre. La foto es decorativa: mejor sin ella que sin tour.
        const resp = await fetch(`/demo/${clave}.webp`, { signal: AbortSignal.timeout(10_000) })
        // El dev server responde index.html (200) para rutas inexistentes:
        // sin el chequeo de content-type se guardaría HTML como "foto".
        if (!resp.ok || !resp.headers.get('content-type')?.startsWith('image/')) return null
        return await resp.blob()
      } catch {
        return null
      }
    },
  }
}
