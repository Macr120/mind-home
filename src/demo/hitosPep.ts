/**
 * Los hitos del año de Pep@: offsets y montos que COMPARTEN varios builders.
 *
 * La avería del coche es el mismo dinero en el garaje y en las finanzas, y el
 * viaje a Japón se paga con el ahorro que se ve en el despacho y se recorre en
 * la sala. Sin una fuente única, cada builder inventaría su versión y la
 * historia dejaría de cuadrar al cruzar de cuarto.
 *
 * Son datos puros (no importa ningún builder): cada app sigue siendo
 * independiente y se puede materializar por separado.
 */

// ── Ventanas del año (offsets −364..0, 0 = hoy) ────────────────────────────
/** Día 1 del viaje a Japón. */
export const JAPON_INICIO = -124
/** Día 21: el vuelo de regreso. */
export const JAPON_FIN = -104
/** El bache del mes 7: lesión de rodilla y el coche muerto. */
export const BACHE_INICIO = -184
export const BACHE_FIN = -155
/** El coche se murió en el periférico. */
export const AVERIA_DIA = -178
/** El maratón, hace ~2 semanas. */
export const MARATON_DIA = -14

/** ¿El día cae dentro del viaje? (las rutinas de casa se pausan). */
export const enJapon = (off: number): boolean => off >= JAPON_INICIO && off <= JAPON_FIN
/** ¿El día cae en el bache del mes 7? */
export const enBache = (off: number): boolean => off >= BACHE_INICIO && off <= BACHE_FIN

// ── Dinero (MXN): un barista de medio tiempo que además estudia ────────────
/** Sueldo quincenal de la cafetería (×2 al mes). */
export const SUELDO_QUINCENA = 3750
/** Clases particulares de física: nacen al decidir Japón (mes 4). */
export const CLASES_FISICA = 1500
export const CLASES_DESDE = -274
export const RENTA = 3500

/** La meta del año, alcanzada justo antes de volar. */
export const META_JAPON = 45000
export const VUELO_JAPON = 19800
export const JR_PASS = 8900
export const HOSPEDAJE_JAPON = 6200
/** El imprevisto que dolió: grúa y bomba de gasolina (garaje + finanzas). */
export const AVERIA_COCHE = 9800
/** Aguinaldo de diciembre y el regalo de cumpleaños de la familia: el
 *  empujón que faltaba para llegar a los 45 000. */
export const AGUINALDO = 3750
export const REGALO_FAMILIA = 5000

export const PRESUPUESTO_MES = 6500
export const PATRIMONIO_HOY = 11800

// ── El viaje que viene (lo cruza la sala con el despacho) ──────────────────
export const META_COREA = 38000
export const AHORRADO_COREA = 3500
/** Días desde hoy hasta el primer día del plan de Corea. */
export const COREA_EN_DIAS = 330
