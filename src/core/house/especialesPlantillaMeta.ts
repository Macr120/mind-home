/**
 * Metadata LIGERA de los objetos principales de plantilla (tipos, nombre y color
 * por defecto, guard). Sin dependencias de render ni de stores, para que
 * `modelosRecursos`/`plantillaBundle`/`disenoStore` lo importen sin arrastrar la
 * escena 3D ni arriesgar ciclos. Los componentes viven en `especialesPlantilla.tsx`.
 */

// Fase 1 — ambientales (se animan solos por proximidad)
export const TIPO_OLLA = 'olla-plantilla'
export const TIPO_PIZARRA = 'pizarra-ideas'
export const TIPO_DESPERTADOR = 'despertador-plantilla'
export const TIPO_LIBRERO_LIBRO = 'librero-libro'
export const TIPO_GLOBO = 'globo-terraqueo'
export const TIPO_ESTANTERIA_HERR = 'estanteria-herramientas'
export const TIPO_REPISA_JUEGOS = 'repisa-juegos'
export const TIPO_AGENDA = 'agenda-escritorio'

// Fase 2 — usables (el personaje ejecuta una acción; ver accionCuartoStore)
export const TIPO_CAMINADORA = 'caminadora'
export const TIPO_PERIODICO = 'periodico'
export const TIPO_LAPTOP = 'laptop'
export const TIPO_TAPETE = 'tapete-yoga'
export const TIPO_GUITARRA = 'guitarra-plantilla'
export const TIPO_PLANTA_REGAR = 'planta-regar'
export const TIPO_LIBRETA = 'libreta'
export const TIPO_SILLON = 'sillon-lectura'
export const TIPO_CALENDARIO = 'calendario-pared'

/** Nombre y color por defecto de cada objeto (siembra en biblioteca y color base). */
export const META_ESPECIAL_PLANTILLA: Record<string, { nombre: string; color: string }> = {
  [TIPO_OLLA]: { nombre: 'Olla que hierve', color: '#b91c1c' },
  [TIPO_PIZARRA]: { nombre: 'Pizarra de ideas', color: '#f59e0b' },
  [TIPO_DESPERTADOR]: { nombre: 'Despertador', color: '#dc2626' },
  [TIPO_LIBRERO_LIBRO]: { nombre: 'Librero con libro', color: '#8b5a2b' },
  [TIPO_GLOBO]: { nombre: 'Globo terráqueo', color: '#1d4ed8' },
  [TIPO_ESTANTERIA_HERR]: { nombre: 'Estantería de herramientas', color: '#6b7280' },
  [TIPO_REPISA_JUEGOS]: { nombre: 'Repisa de juegos', color: '#7c3aed' },
  [TIPO_AGENDA]: { nombre: 'Agenda de escritorio', color: '#a855f7' },
  [TIPO_CAMINADORA]: { nombre: 'Caminadora', color: '#334155' },
  [TIPO_PERIODICO]: { nombre: 'Escritorio de noticias', color: '#6b4423' },
  [TIPO_LAPTOP]: { nombre: 'Laptop de trabajo', color: '#475569' },
  [TIPO_TAPETE]: { nombre: 'Tapete de yoga', color: '#0d9488' },
  [TIPO_GUITARRA]: { nombre: 'Piano', color: '#3a2e2a' }, // tipo legado 'guitarra-plantilla', ahora es un piano
  [TIPO_PLANTA_REGAR]: { nombre: 'Árbol', color: '#15803d' },
  [TIPO_LIBRETA]: { nombre: 'Libreta', color: '#7c3aed' },
  [TIPO_SILLON]: { nombre: 'Sillón de lectura', color: '#9ca3af' },
  [TIPO_CALENDARIO]: { nombre: 'Calendario de pared', color: '#dc2626' },
}

export const TIPOS_ESPECIALES_PLANTILLA = new Set(Object.keys(META_ESPECIAL_PLANTILLA))

export const esEspecialPlantilla = (tipo: string) => TIPOS_ESPECIALES_PLANTILLA.has(tipo)
