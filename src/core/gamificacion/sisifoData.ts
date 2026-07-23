/**
 * Datos y matemática pura de la Montaña de Sísifo (gamificación anual).
 *
 * Temática: materiales de la tierra. Se asciende "excavando" de la arcilla en la
 * superficie hasta el diamante en la cima. Todo el progreso se deriva de un solo
 * número, `altura` (0–365 días subidos): ver core/gamificacion/sisifo.ts.
 *
 * Los nombres/temas son un catálogo temático extenso (12 + 52·2 textos), así que
 * viven bilingües aquí en vez de inflar `dict.ts` (como los catálogos de datos).
 * La cromática por material da la identidad visual sin pedir 64 iconos únicos.
 */

import { useAjustes } from '../state/ajustesStore'

export const DIAS_META = 365
export const SEMANAS = 52
export const DIAS_POR_SEMANA = 7
/** Días de gracia (fallos sin castigo) por mes calendario. */
export const GRACIAS_MES = 2

/** ¿Interfaz en inglés? Se lee al vuelo; los componentes ya re-renderizan con `useT`. */
function enIngles(): boolean {
  return useAjustes.getState().idioma === 'en'
}

interface Bilingue {
  es: string
  en: string
}
function loc(x: Bilingue): string {
  return enIngles() ? x.en : x.es
}

export interface Rango {
  /** 1–12. */
  n: number
  es: string
  en: string
  /** Tono del estrato (base terroso → precioso). */
  color: string
}

/** Los 12 rangos, de la base a la cima. Semanas acumuladas al final de cada uno. */
export const RANGOS: Rango[] = [
  { n: 1, es: 'Explorador de Arcilla', en: 'Clay Explorer', color: '#b5651d' },
  { n: 2, es: 'Viajero de Pizarra', en: 'Slate Traveler', color: '#5a6672' },
  { n: 3, es: 'Caminante de Arenisca', en: 'Sandstone Walker', color: '#c2a878' },
  { n: 4, es: 'Rastreador de Granito', en: 'Granite Tracker', color: '#7d7d7d' },
  { n: 5, es: 'Pionero de Obsidiana', en: 'Obsidian Pioneer', color: '#2b2b33' },
  { n: 6, es: 'Navegante de Cobre', en: 'Copper Navigator', color: '#b87333' },
  { n: 7, es: 'Buscador de Bronce', en: 'Bronze Seeker', color: '#8c6d3f' },
  { n: 8, es: 'Aventurero de Plata', en: 'Silver Adventurer', color: '#c0c0c8' },
  { n: 9, es: 'Conquistador de Oro', en: 'Gold Conqueror', color: '#d4af37' },
  { n: 10, es: 'Guardián de Platino', en: 'Platinum Guardian', color: '#b6c1c7' },
  { n: 11, es: 'Maestro de Esmeralda', en: 'Emerald Master', color: '#2e8b57' },
  { n: 12, es: 'Leyenda de Diamante', en: 'Diamond Legend', color: '#7fd8ff' },
]

/**
 * Semanas acumuladas al FINAL de cada rango (distribución 5-4-4-5-4-4-5-4-4-5-4-4 = 52).
 * `altura` en días cruza `limite·7` para subir de rango. Exportado: la montaña
 * del overlay dibuja un escalón de color por rango usando estos mismos límites.
 */
export const LIMITES_SEMANA = [5, 9, 13, 18, 22, 26, 31, 35, 39, 44, 48, 52]

export interface CategoriaInsignia {
  es: string
  en: string
  color: string
  /** Rango de números de insignia [desde, hasta] (1-indexado, inclusivo). */
  desde: number
  hasta: number
}

/** Las 5 familias geológicas: solo agrupan la rejilla de insignias visualmente. */
export const CATEGORIAS: CategoriaInsignia[] = [
  { es: 'Tierras y Sedimentos', en: 'Earth & Sediments', color: '#b5651d', desde: 1, hasta: 10 },
  { es: 'Rocas y Formaciones Volcánicas', en: 'Volcanic Rocks & Formations', color: '#a13d2d', desde: 11, hasta: 20 },
  { es: 'Minerales y Cristales Base', en: 'Base Minerals & Crystals', color: '#8a7fb5', desde: 21, hasta: 31 },
  { es: 'Metales y Aleaciones', en: 'Metals & Alloys', color: '#c9a227', desde: 32, hasta: 41 },
  { es: 'Gemas y Materiales Preciosos', en: 'Gems & Precious Materials', color: '#2fa4a4', desde: 42, hasta: 52 },
]

export interface Insignia {
  /** 1–52 (se gana en la semana N del ascenso). */
  n: number
  es: string
  en: string
  descEs: string
  descEn: string
}

/** Las 52 insignias, una por semana, en orden de ascenso. */
export const INSIGNIAS: Insignia[] = [
  // Tierras y Sedimentos
  { n: 1, es: 'Huella de Barro', en: 'Mud Print', descEs: 'Por dar el primer paso.', descEn: 'For taking the first step.' },
  { n: 2, es: 'Sello de Terracota', en: 'Terracotta Seal', descEs: 'Por consolidar los primeros hallazgos.', descEn: 'For consolidating your first finds.' },
  { n: 3, es: 'Bloque de Adobe', en: 'Adobe Block', descEs: 'Por construir una base sólida de actividad.', descEn: 'For building a solid base of activity.' },
  { n: 4, es: 'Polvo de Limo', en: 'Silt Dust', descEs: 'Por recorrer rutas sutiles.', descEn: 'For travelling subtle routes.' },
  { n: 5, es: 'Canto Rodado', en: 'River Pebble', descEs: 'Por fluir y adaptarse al entorno.', descEn: 'For flowing and adapting to your surroundings.' },
  { n: 6, es: 'Roca de Río', en: 'River Rock', descEs: 'Por la constancia en el movimiento.', descEn: 'For steady, constant movement.' },
  { n: 7, es: 'Cristal de Sal', en: 'Salt Crystal', descEs: 'Por extraer valor de lo cotidiano.', descEn: 'For extracting value from the everyday.' },
  { n: 8, es: 'Estrato de Tiza', en: 'Chalk Stratum', descEs: 'Por dejar una marca visible.', descEn: 'For leaving a visible mark.' },
  { n: 9, es: 'Losa de Caliza', en: 'Limestone Slab', descEs: 'Por aguantar el paso del tiempo.', descEn: 'For enduring the passage of time.' },
  { n: 10, es: 'Capa de Grava', en: 'Gravel Layer', descEs: 'Por superar terrenos difíciles.', descEn: 'For overcoming rough terrain.' },
  // Rocas y Formaciones Volcánicas
  { n: 11, es: 'Cumbre de Basalto', en: 'Basalt Peak', descEs: 'Por alcanzar un punto elevado.', descEn: 'For reaching a high point.' },
  { n: 12, es: 'Núcleo de Magma', en: 'Magma Core', descEs: 'Por mantener una racha ardiente.', descEn: 'For keeping a burning streak.' },
  { n: 13, es: 'Piedra Pómez', en: 'Pumice Stone', descEs: 'Por moverse con ligereza y rapidez.', descEn: 'For moving light and fast.' },
  { n: 14, es: 'Ceniza Volcánica', en: 'Volcanic Ash', descEs: 'Por resurgir o retomar la actividad.', descEn: 'For rising again or resuming activity.' },
  { n: 15, es: 'Filo de Pedernal', en: 'Flint Edge', descEs: 'Por decisiones rápidas y precisas.', descEn: 'For fast, precise decisions.' },
  { n: 16, es: 'Esquirla de Escoria', en: 'Slag Shard', descEs: 'Por limpiar y optimizar rutas.', descEn: 'For cleaning up and optimizing routes.' },
  { n: 17, es: 'Brecha de Toba', en: 'Tuff Breccia', descEs: 'Por encontrar conexiones inesperadas.', descEn: 'For finding unexpected connections.' },
  { n: 18, es: 'Muro de Mármol', en: 'Marble Wall', descEs: 'Por alcanzar la elegancia en el proceso.', descEn: 'For reaching elegance in the process.' },
  { n: 19, es: 'Veta de Carbón', en: 'Coal Seam', descEs: 'Por acumular energía potencial.', descEn: 'For storing up potential energy.' },
  { n: 20, es: 'Fuego de Pirita', en: 'Pyrite Fire', descEs: 'Por un descubrimiento sorprendente.', descEn: 'For a surprising discovery.' },
  // Minerales y Cristales Base
  { n: 21, es: 'Prisma de Cuarzo', en: 'Quartz Prism', descEs: 'Por enfocar los objetivos.', descEn: 'For focusing your goals.' },
  { n: 22, es: 'Reflejo de Citrino', en: 'Citrine Glint', descEs: 'Por mantener una racha diurna.', descEn: 'For keeping a daytime streak.' },
  { n: 23, es: 'Reliquia de Jaspe', en: 'Jasper Relic', descEs: 'Por encontrar puntos históricos.', descEn: 'For finding historic landmarks.' },
  { n: 24, es: 'Ojo de Tigre', en: 'Tiger’s Eye', descEs: 'Por la agudeza en la exploración.', descEn: 'For sharpness in exploration.' },
  { n: 25, es: 'Sombra de Ónice', en: 'Onyx Shadow', descEs: 'Por completar objetivos nocturnos.', descEn: 'For completing nighttime goals.' },
  { n: 26, es: 'Lágrima de Ágata', en: 'Agate Tear', descEs: 'Por la resistencia en largos trayectos.', descEn: 'For endurance on long journeys.' },
  { n: 27, es: 'Corazón de Hematita', en: 'Hematite Heart', descEs: 'Por mantener un ritmo constante.', descEn: 'For keeping a constant pace.' },
  { n: 28, es: 'Aura de Fluorita', en: 'Fluorite Aura', descEs: 'Por encontrar zonas de alta densidad.', descEn: 'For finding high-density areas.' },
  { n: 29, es: 'Sol de Ámbar', en: 'Amber Sun', descEs: 'Por capturar un momento perfecto.', descEn: 'For capturing a perfect moment.' },
  { n: 30, es: 'Estrella de Bismuto', en: 'Bismuth Star', descEs: 'Por la complejidad y estructura.', descEn: 'For complexity and structure.' },
  { n: 31, es: 'Brote de Crisocola', en: 'Chrysocolla Bloom', descEs: 'Por la regeneración y descanso.', descEn: 'For regeneration and rest.' },
  // Metales y Aleaciones
  { n: 32, es: 'Engranaje de Latón', en: 'Brass Gear', descEs: 'Por la sincronización perfecta.', descEn: 'For perfect synchronization.' },
  { n: 33, es: 'Hilo de Cobre', en: 'Copper Wire', descEs: 'Por conectar múltiples puntos.', descEn: 'For connecting multiple points.' },
  { n: 34, es: 'Escudo de Bronce', en: 'Bronze Shield', descEs: 'Por la persistencia y durabilidad.', descEn: 'For persistence and durability.' },
  { n: 35, es: 'Gota de Mercurio', en: 'Mercury Drop', descEs: 'Por la adaptabilidad extrema.', descEn: 'For extreme adaptability.' },
  { n: 36, es: 'Corona de Estaño', en: 'Tin Crown', descEs: 'Por proteger los logros obtenidos.', descEn: 'For protecting the achievements you’ve earned.' },
  { n: 37, es: 'Moneda de Electrum', en: 'Electrum Coin', descEs: 'Por la dualidad de habilidades.', descEn: 'For a duality of skills.' },
  { n: 38, es: 'Fusión de Titanio', en: 'Titanium Fusion', descEs: 'Por la máxima resistencia en una jornada.', descEn: 'For maximum endurance in a single day.' },
  { n: 39, es: 'Escala de Paladio', en: 'Palladium Climb', descEs: 'Por escalar en los rangos rápidamente.', descEn: 'For climbing the ranks quickly.' },
  { n: 40, es: 'Destello de Plata', en: 'Silver Flash', descEs: 'Por la agilidad en la recolección.', descEn: 'For agility while collecting.' },
  { n: 41, es: 'Pepita Dorada', en: 'Golden Nugget', descEs: 'Por un hallazgo de alto valor.', descEn: 'For a high-value find.' },
  // Gemas y Materiales Preciosos
  { n: 42, es: 'Fragmento de Meteorito', en: 'Meteorite Fragment', descEs: 'Por un logro fuera de lo común.', descEn: 'For an out-of-the-ordinary achievement.' },
  { n: 43, es: 'Alma de Turquesa', en: 'Turquoise Soul', descEs: 'Por la exploración de patrimonios.', descEn: 'For exploring heritage.' },
  { n: 44, es: 'Gota de Aguamarina', en: 'Aquamarine Drop', descEs: 'Por la fluidez en la navegación.', descEn: 'For fluid navigation.' },
  { n: 45, es: 'Resplandor de Malaquita', en: 'Malachite Glow', descEs: 'Por el crecimiento continuo.', descEn: 'For continuous growth.' },
  { n: 46, es: 'Eco de Azurita', en: 'Azurite Echo', descEs: 'Por la profundidad del recorrido.', descEn: 'For the depth of your journey.' },
  { n: 47, es: 'Profundidad de Zafiro', en: 'Sapphire Depth', descEs: 'Por la dedicación absoluta.', descEn: 'For absolute dedication.' },
  { n: 48, es: 'Hoja de Jade', en: 'Jade Leaf', descEs: 'Por la armonía y el equilibrio.', descEn: 'For harmony and balance.' },
  { n: 49, es: 'Fuego de Rubí', en: 'Ruby Fire', descEs: 'Por la pasión y la intensidad.', descEn: 'For passion and intensity.' },
  { n: 50, es: 'Prisma de Ópalo', en: 'Opal Prism', descEs: 'Por la versatilidad en todas las áreas.', descEn: 'For versatility across every area.' },
  { n: 51, es: 'Faceta de Zircón', en: 'Zircon Facet', descEs: 'Por la resistencia a la fricción.', descEn: 'For resistance to friction.' },
  { n: 52, es: 'Corona de Diamante', en: 'Diamond Crown', descEs: 'Por completar el ciclo de exploración completo.', descEn: 'For completing the full cycle of exploration.' },
]

// ─── Helpers puros derivados de `altura` (días subidos) ───

/** Insignias ganadas: una por cada semana completa subida (0–52). */
export function insigniasGanadas(altura: number): number {
  return Math.min(SEMANAS, Math.floor(altura / DIAS_POR_SEMANA))
}

/** Rango actual (1–12) según la altura. */
export function rangoDe(altura: number): number {
  const semanas = altura / DIAS_POR_SEMANA
  for (let i = 0; i < LIMITES_SEMANA.length; i++) {
    if (semanas < LIMITES_SEMANA[i]) return i + 1
  }
  return 12
}

/** Altura (en días) del rellano donde empieza el rango actual: destino del retroceso. */
export function inicioDeRango(altura: number): number {
  const r = rangoDe(altura)
  return r <= 1 ? 0 : LIMITES_SEMANA[r - 2] * DIAS_POR_SEMANA
}

/** Los 7 colores del arcoíris (rojo→violeta): ciclan por cada insignia semanal. */
const ARCOIRIS = ['#e11d48', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#6366f1', '#a855f7']

/** Color de la insignia nº n (1–52): cicla el arcoíris cada 7 semanas. */
export function colorArcoiris(n: number): string {
  return ARCOIRIS[(n - 1) % 7]
}

// ─── Accesores localizados (leen el idioma activo al vuelo) ───

export const nombreRango = (r: Rango): string => loc(r)
export const nombreInsignia = (b: Insignia): string => loc(b)
export const descInsignia = (b: Insignia): string => (enIngles() ? b.descEn : b.descEs)
export const nombreCategoria = (c: CategoriaInsignia): string => loc(c)
