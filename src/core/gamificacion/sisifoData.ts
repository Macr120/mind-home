/**
 * Datos y matemática pura de la Montaña de Sísifo (gamificación anual).
 *
 * Temática: materiales de la tierra. Se asciende "excavando" de la arcilla en la
 * superficie hasta el diamante en la cima. Todo el progreso se deriva de un solo
 * número, `altura` (0–365 días subidos): ver core/gamificacion/sisifo.ts.
 *
 * Los nombres/temas son un catálogo temático extenso (12 + 52·2 textos), así que
 * viven por idioma aquí en vez de inflar `dict.ts` (como los catálogos de datos).
 * La cromática por material da la identidad visual sin pedir 64 iconos únicos.
 *
 * Cada entrada ES un `PorIdioma<string>`: el español es obligatorio y los demás
 * idiomas son campos opcionales que se van añadiendo al traducir.
 */

import { porIdioma, type PorIdioma } from '../i18n/porIdioma'

export const DIAS_META = 365
export const SEMANAS = 52
export const DIAS_POR_SEMANA = 7
/** Días de gracia (fallos sin castigo) por mes calendario. */
export const GRACIAS_MES = 2

export interface Rango extends PorIdioma<string> {
  /** 1–12. */
  n: number
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

export interface CategoriaInsignia extends PorIdioma<string> {
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

export interface Insignia extends PorIdioma<string> {
  /** 1–52 (se gana en la semana N del ascenso). */
  n: number
  /** Por qué se gana, aparte porque es una segunda cadena localizable. */
  desc: PorIdioma<string>
}

/** Las 52 insignias, una por semana, en orden de ascenso. */
export const INSIGNIAS: Insignia[] = [
  // Tierras y Sedimentos
  { n: 1, es: 'Huella de Barro', en: 'Mud Print', desc: { es: 'Por dar el primer paso.', en: 'For taking the first step.' } },
  { n: 2, es: 'Sello de Terracota', en: 'Terracotta Seal', desc: { es: 'Por consolidar los primeros hallazgos.', en: 'For consolidating your first finds.' } },
  { n: 3, es: 'Bloque de Adobe', en: 'Adobe Block', desc: { es: 'Por construir una base sólida de actividad.', en: 'For building a solid base of activity.' } },
  { n: 4, es: 'Polvo de Limo', en: 'Silt Dust', desc: { es: 'Por recorrer rutas sutiles.', en: 'For travelling subtle routes.' } },
  { n: 5, es: 'Canto Rodado', en: 'River Pebble', desc: { es: 'Por fluir y adaptarse al entorno.', en: 'For flowing and adapting to your surroundings.' } },
  { n: 6, es: 'Roca de Río', en: 'River Rock', desc: { es: 'Por la constancia en el movimiento.', en: 'For steady, constant movement.' } },
  { n: 7, es: 'Cristal de Sal', en: 'Salt Crystal', desc: { es: 'Por extraer valor de lo cotidiano.', en: 'For extracting value from the everyday.' } },
  { n: 8, es: 'Estrato de Tiza', en: 'Chalk Stratum', desc: { es: 'Por dejar una marca visible.', en: 'For leaving a visible mark.' } },
  { n: 9, es: 'Losa de Caliza', en: 'Limestone Slab', desc: { es: 'Por aguantar el paso del tiempo.', en: 'For enduring the passage of time.' } },
  { n: 10, es: 'Capa de Grava', en: 'Gravel Layer', desc: { es: 'Por superar terrenos difíciles.', en: 'For overcoming rough terrain.' } },
  // Rocas y Formaciones Volcánicas
  { n: 11, es: 'Cumbre de Basalto', en: 'Basalt Peak', desc: { es: 'Por alcanzar un punto elevado.', en: 'For reaching a high point.' } },
  { n: 12, es: 'Núcleo de Magma', en: 'Magma Core', desc: { es: 'Por mantener una racha ardiente.', en: 'For keeping a burning streak.' } },
  { n: 13, es: 'Piedra Pómez', en: 'Pumice Stone', desc: { es: 'Por moverse con ligereza y rapidez.', en: 'For moving light and fast.' } },
  { n: 14, es: 'Ceniza Volcánica', en: 'Volcanic Ash', desc: { es: 'Por resurgir o retomar la actividad.', en: 'For rising again or resuming activity.' } },
  { n: 15, es: 'Filo de Pedernal', en: 'Flint Edge', desc: { es: 'Por decisiones rápidas y precisas.', en: 'For fast, precise decisions.' } },
  { n: 16, es: 'Esquirla de Escoria', en: 'Slag Shard', desc: { es: 'Por limpiar y optimizar rutas.', en: 'For cleaning up and optimizing routes.' } },
  { n: 17, es: 'Brecha de Toba', en: 'Tuff Breccia', desc: { es: 'Por encontrar conexiones inesperadas.', en: 'For finding unexpected connections.' } },
  { n: 18, es: 'Muro de Mármol', en: 'Marble Wall', desc: { es: 'Por alcanzar la elegancia en el proceso.', en: 'For reaching elegance in the process.' } },
  { n: 19, es: 'Veta de Carbón', en: 'Coal Seam', desc: { es: 'Por acumular energía potencial.', en: 'For storing up potential energy.' } },
  { n: 20, es: 'Fuego de Pirita', en: 'Pyrite Fire', desc: { es: 'Por un descubrimiento sorprendente.', en: 'For a surprising discovery.' } },
  // Minerales y Cristales Base
  { n: 21, es: 'Prisma de Cuarzo', en: 'Quartz Prism', desc: { es: 'Por enfocar los objetivos.', en: 'For focusing your goals.' } },
  { n: 22, es: 'Reflejo de Citrino', en: 'Citrine Glint', desc: { es: 'Por mantener una racha diurna.', en: 'For keeping a daytime streak.' } },
  { n: 23, es: 'Reliquia de Jaspe', en: 'Jasper Relic', desc: { es: 'Por encontrar puntos históricos.', en: 'For finding historic landmarks.' } },
  { n: 24, es: 'Ojo de Tigre', en: 'Tiger’s Eye', desc: { es: 'Por la agudeza en la exploración.', en: 'For sharpness in exploration.' } },
  { n: 25, es: 'Sombra de Ónice', en: 'Onyx Shadow', desc: { es: 'Por completar objetivos nocturnos.', en: 'For completing nighttime goals.' } },
  { n: 26, es: 'Lágrima de Ágata', en: 'Agate Tear', desc: { es: 'Por la resistencia en largos trayectos.', en: 'For endurance on long journeys.' } },
  { n: 27, es: 'Corazón de Hematita', en: 'Hematite Heart', desc: { es: 'Por mantener un ritmo constante.', en: 'For keeping a constant pace.' } },
  { n: 28, es: 'Aura de Fluorita', en: 'Fluorite Aura', desc: { es: 'Por encontrar zonas de alta densidad.', en: 'For finding high-density areas.' } },
  { n: 29, es: 'Sol de Ámbar', en: 'Amber Sun', desc: { es: 'Por capturar un momento perfecto.', en: 'For capturing a perfect moment.' } },
  { n: 30, es: 'Estrella de Bismuto', en: 'Bismuth Star', desc: { es: 'Por la complejidad y estructura.', en: 'For complexity and structure.' } },
  { n: 31, es: 'Brote de Crisocola', en: 'Chrysocolla Bloom', desc: { es: 'Por la regeneración y descanso.', en: 'For regeneration and rest.' } },
  // Metales y Aleaciones
  { n: 32, es: 'Engranaje de Latón', en: 'Brass Gear', desc: { es: 'Por la sincronización perfecta.', en: 'For perfect synchronization.' } },
  { n: 33, es: 'Hilo de Cobre', en: 'Copper Wire', desc: { es: 'Por conectar múltiples puntos.', en: 'For connecting multiple points.' } },
  { n: 34, es: 'Escudo de Bronce', en: 'Bronze Shield', desc: { es: 'Por la persistencia y durabilidad.', en: 'For persistence and durability.' } },
  { n: 35, es: 'Gota de Mercurio', en: 'Mercury Drop', desc: { es: 'Por la adaptabilidad extrema.', en: 'For extreme adaptability.' } },
  { n: 36, es: 'Corona de Estaño', en: 'Tin Crown', desc: { es: 'Por proteger los logros obtenidos.', en: 'For protecting the achievements you’ve earned.' } },
  { n: 37, es: 'Moneda de Electrum', en: 'Electrum Coin', desc: { es: 'Por la dualidad de habilidades.', en: 'For a duality of skills.' } },
  { n: 38, es: 'Fusión de Titanio', en: 'Titanium Fusion', desc: { es: 'Por la máxima resistencia en una jornada.', en: 'For maximum endurance in a single day.' } },
  { n: 39, es: 'Escala de Paladio', en: 'Palladium Climb', desc: { es: 'Por escalar en los rangos rápidamente.', en: 'For climbing the ranks quickly.' } },
  { n: 40, es: 'Destello de Plata', en: 'Silver Flash', desc: { es: 'Por la agilidad en la recolección.', en: 'For agility while collecting.' } },
  { n: 41, es: 'Pepita Dorada', en: 'Golden Nugget', desc: { es: 'Por un hallazgo de alto valor.', en: 'For a high-value find.' } },
  // Gemas y Materiales Preciosos
  { n: 42, es: 'Fragmento de Meteorito', en: 'Meteorite Fragment', desc: { es: 'Por un logro fuera de lo común.', en: 'For an out-of-the-ordinary achievement.' } },
  { n: 43, es: 'Alma de Turquesa', en: 'Turquoise Soul', desc: { es: 'Por la exploración de patrimonios.', en: 'For exploring heritage.' } },
  { n: 44, es: 'Gota de Aguamarina', en: 'Aquamarine Drop', desc: { es: 'Por la fluidez en la navegación.', en: 'For fluid navigation.' } },
  { n: 45, es: 'Resplandor de Malaquita', en: 'Malachite Glow', desc: { es: 'Por el crecimiento continuo.', en: 'For continuous growth.' } },
  { n: 46, es: 'Eco de Azurita', en: 'Azurite Echo', desc: { es: 'Por la profundidad del recorrido.', en: 'For the depth of your journey.' } },
  { n: 47, es: 'Profundidad de Zafiro', en: 'Sapphire Depth', desc: { es: 'Por la dedicación absoluta.', en: 'For absolute dedication.' } },
  { n: 48, es: 'Hoja de Jade', en: 'Jade Leaf', desc: { es: 'Por la armonía y el equilibrio.', en: 'For harmony and balance.' } },
  { n: 49, es: 'Fuego de Rubí', en: 'Ruby Fire', desc: { es: 'Por la pasión y la intensidad.', en: 'For passion and intensity.' } },
  { n: 50, es: 'Prisma de Ópalo', en: 'Opal Prism', desc: { es: 'Por la versatilidad en todas las áreas.', en: 'For versatility across every area.' } },
  { n: 51, es: 'Faceta de Zircón', en: 'Zircon Facet', desc: { es: 'Por la resistencia a la fricción.', en: 'For resistance to friction.' } },
  { n: 52, es: 'Corona de Diamante', en: 'Diamond Crown', desc: { es: 'Por completar el ciclo de exploración completo.', en: 'For completing the full cycle of exploration.' } },
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

export const nombreRango = (r: Rango): string => porIdioma(r)
export const nombreInsignia = (b: Insignia): string => porIdioma(b)
export const descInsignia = (b: Insignia): string => porIdioma(b.desc)
export const nombreCategoria = (c: CategoriaInsignia): string => porIdioma(c)
