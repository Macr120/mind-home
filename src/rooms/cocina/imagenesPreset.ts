/**
 * Fotos que la app ya trae de fábrica para las recetas y dietas de ejemplo, y
 * para las dos dietas del año demo (con su nombre en ES y en EN), por nombre.
 * Los archivos viven en `public/cocina/`.
 *
 * GENERADO por `scripts/generar-imagenes-cocina.mjs` — no lo edites a mano.
 */

const RECETAS: Record<string, string> = {
  "Pasta al pesto": 'pasta-al-pesto',
  "pasta-al-pesto": 'pasta-al-pesto',
  "Pizza margarita": 'pizza-margarita',
  "pizza-margarita": 'pizza-margarita',
  "Tacos al pastor": 'tacos-al-pastor',
  "tacos-al-pastor": 'tacos-al-pastor',
  "Chilaquiles verdes": 'chilaquiles-verdes',
  "chilaquiles-verdes": 'chilaquiles-verdes',
  "Ensalada mediterránea": 'ensalada-mediterranea',
  "ensalada-mediterr-nea": 'ensalada-mediterranea',
  "Salmón al horno": 'salmon-al-horno',
  "salm-n-al-horno": 'salmon-al-horno',
  "Pollo a la parrilla": 'pollo-a-la-parrilla',
  "pollo-a-la-parrilla": 'pollo-a-la-parrilla',
  "Bowl de quinoa": 'bowl-de-quinoa',
  "bowl-de-quinoa": 'bowl-de-quinoa',
  "Avena overnight": 'avena-overnight',
  "avena-overnight": 'avena-overnight',
}

const DIETAS: Record<string, string> = {
  "Mediterránea": 'dieta-mediterranea',
  "mediterr-nea": 'dieta-mediterranea',
  "Alta en proteína": 'dieta-alta-en-proteina',
  "alta-en-prote-na": 'dieta-alta-en-proteina',
  "Keto": 'dieta-keto',
  "keto": 'dieta-keto',
  "Vegetariana": 'dieta-vegetariana',
  "vegetariana": 'dieta-vegetariana',
  "Ganancia muscular": 'dieta-ganancia-muscular',
  "ganancia-muscular": 'dieta-ganancia-muscular',
  "Pérdida de grasa": 'dieta-perdida-de-grasa',
  "p-rdida-de-grasa": 'dieta-perdida-de-grasa',
  "Sin gluten": 'dieta-sin-gluten',
  "sin-gluten": 'dieta-sin-gluten',
}

const url = (slug: string | undefined) =>
  slug ? `${import.meta.env.BASE_URL}cocina/${slug}.webp` : null

/** La clave de siembra de la fila (`seed-<prefijo>-<clave>`), si es sembrada. */
const claveSeed = (uid: string | undefined, prefijo: string) =>
  uid?.startsWith(`seed-${prefijo}-`) ? uid.slice(`seed-${prefijo}-`.length) : undefined

/**
 * URL de la foto preguardada de una receta de ejemplo, o null si no trae.
 * Resuelve por la CLAVE del uid de siembra primero (la fila puede estar
 * traducida) y por nombre como respaldo (recetas del demo, ES/EN).
 */
export function urlImagenReceta(r: { nombre: string; uid?: string }): string | null {
  const clave = claveSeed(r.uid, 'recetas')
  return url((clave && RECETAS[clave]) || RECETAS[r.nombre])
}

/** URL de la portada preguardada de una dieta de ejemplo, o null si no trae. */
export function urlImagenDieta(d: { nombre: string; uid?: string }): string | null {
  const clave = claveSeed(d.uid, 'dietasGuardadas')
  return url((clave && DIETAS[clave]) || DIETAS[d.nombre])
}
