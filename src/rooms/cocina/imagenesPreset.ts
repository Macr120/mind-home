/**
 * Fotos que la app ya trae de fábrica para las recetas y dietas de ejemplo,
 * por nombre. Los archivos viven en `public/cocina/`.
 *
 * GENERADO por `scripts/generar-imagenes-cocina.mjs` — no lo edites a mano.
 */

const RECETAS: Record<string, string> = {
  "Pasta al pesto": 'pasta-al-pesto',
  "Pizza margarita": 'pizza-margarita',
  "Tacos al pastor": 'tacos-al-pastor',
  "Chilaquiles verdes": 'chilaquiles-verdes',
  "Ensalada mediterránea": 'ensalada-mediterranea',
  "Salmón al horno": 'salmon-al-horno',
  "Pollo a la parrilla": 'pollo-a-la-parrilla',
  "Bowl de quinoa": 'bowl-de-quinoa',
  "Avena overnight": 'avena-overnight',
}

const DIETAS: Record<string, string> = {
  "Mediterránea": 'dieta-mediterranea',
  "Alta en proteína": 'dieta-alta-en-proteina',
  "Keto": 'dieta-keto',
  "Vegetariana": 'dieta-vegetariana',
  "Ganancia muscular": 'dieta-ganancia-muscular',
  "Pérdida de grasa": 'dieta-perdida-de-grasa',
  "Sin gluten": 'dieta-sin-gluten',
}

const url = (slug: string | undefined) =>
  slug ? `${import.meta.env.BASE_URL}cocina/${slug}.webp` : null

/** URL de la foto preguardada de una receta de ejemplo, o null si no trae. */
export function urlImagenReceta(nombre: string): string | null {
  return url(RECETAS[nombre])
}

/** URL de la portada preguardada de una dieta de ejemplo, o null si no trae. */
export function urlImagenDieta(nombre: string): string | null {
  return url(DIETAS[nombre])
}
