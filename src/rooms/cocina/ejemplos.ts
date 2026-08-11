import type { DietaGuardada, Receta } from '../../core/data/db'

/**
 * Las recetas y dietas que la app trae de fábrica.
 *
 * Viven aquí y no dentro de `seed.ts` porque los lee también
 * `scripts/generar-imagenes-cocina.mjs` desde Node: este módulo solo tiene datos
 * y tipos (nada de Dexie), así que se puede importar fuera del navegador.
 */

/** Receta de ejemplo sin los campos que pone la siembra (fuente/creadaEn). */
export type RecetaEjemplo = Omit<Receta, 'id' | 'fuente' | 'creadaEn' | 'foto'>

/** Dieta de ejemplo: nombra sus recetas, la siembra las traduce a ids. */
export type DietaEjemplo = Omit<DietaGuardada, 'id' | 'creadoEn' | 'recetaIds' | 'foto'> & {
  recetas: string[]
}

export const RECETAS_EJEMPLO: RecetaEjemplo[] = [
  {
    nombre: 'Pasta al pesto', emoji: '🍝', carpeta: 'Italiana', porciones: 2, minutos: 20,
    etiquetas: ['pasta', 'rápida', 'vegetariana'], momentos: ['comida', 'cena'],
    ingredientes: ['200 g de pasta', '4 cucharadas de pesto', '30 g de queso parmesano', '1 cucharada de aceite de oliva'],
    pasos: ['Cuece la pasta al dente.', 'Escúrrela y mézclala con el pesto.', 'Sirve con parmesano rallado.'],
    calorias: 520, proteinas: 16, carbohidratos: 70, grasas: 20,
  },
  {
    nombre: 'Pizza margarita', emoji: '🍕', carpeta: 'Italiana', porciones: 2, minutos: 30,
    etiquetas: ['horno', 'vegetariana'], momentos: ['comida', 'cena'],
    ingredientes: ['1 base de pizza', '150 g de salsa de tomate', '125 g de mozzarella', 'Hojas de albahaca'],
    pasos: ['Extiende la salsa sobre la base.', 'Añade la mozzarella.', 'Hornea a 220 °C 12 min.', 'Termina con albahaca.'],
    calorias: 610, proteinas: 24, carbohidratos: 78, grasas: 22,
  },
  {
    nombre: 'Tacos al pastor', emoji: '🌮', carpeta: 'Mexicana', porciones: 3, minutos: 40,
    etiquetas: ['cerdo', 'clásico'], momentos: ['comida', 'cena'],
    ingredientes: ['400 g de carne de cerdo adobada', '9 tortillas de maíz', '1/2 piña', '1 cebolla', 'Cilantro al gusto'],
    pasos: ['Asa la carne adobada.', 'Pícala fina con piña.', 'Sirve en tortillas con cebolla y cilantro.'],
    calorias: 430, proteinas: 28, carbohidratos: 34, grasas: 20,
  },
  {
    nombre: 'Chilaquiles verdes', emoji: '🍳', carpeta: 'Mexicana', porciones: 2, minutos: 25,
    etiquetas: ['desayuno'], momentos: ['desayuno'],
    ingredientes: ['200 g de totopos', '300 ml de salsa verde', '2 huevos', '50 g de queso fresco', 'Crema al gusto'],
    pasos: ['Calienta la salsa verde.', 'Añade los totopos y mezcla.', 'Sirve con huevo, queso y crema.'],
    calorias: 480, proteinas: 18, carbohidratos: 52, grasas: 22,
  },
  {
    nombre: 'Ensalada mediterránea', emoji: '🥗', carpeta: 'Saludable', porciones: 2, minutos: 15,
    etiquetas: ['ligera', 'vegetariana'], momentos: ['comida', 'cena'],
    ingredientes: ['1 pepino', '2 jitomates', '80 g de queso feta', '10 aceitunas', '2 cucharadas de aceite de oliva'],
    pasos: ['Pica las verduras.', 'Añade feta y aceitunas.', 'Aliña con aceite de oliva.'],
    calorias: 280, proteinas: 10, carbohidratos: 14, grasas: 20,
  },
  {
    nombre: 'Salmón al horno', emoji: '🐟', carpeta: 'Saludable', porciones: 2, minutos: 25,
    etiquetas: ['pescado', 'alta proteína'], momentos: ['comida', 'cena'],
    ingredientes: ['2 filetes de salmón (300 g)', '1 limón', '2 dientes de ajo', 'Eneldo y sal al gusto'],
    pasos: ['Coloca el salmón en una charola.', 'Sazona con ajo, limón y eneldo.', 'Hornea a 200 °C 18 min.'],
    calorias: 370, proteinas: 40, carbohidratos: 2, grasas: 22,
  },
  {
    nombre: 'Pollo a la parrilla', emoji: '🍗', carpeta: 'Saludable', porciones: 2, minutos: 20,
    etiquetas: ['pollo', 'alta proteína'], momentos: ['comida', 'cena'],
    ingredientes: ['300 g de pechuga de pollo', '1 cucharada de aceite de oliva', 'Especias y sal al gusto', '1 limón'],
    pasos: ['Sazona el pollo.', 'Ásalo 6-7 min por lado.', 'Reposa y sirve con limón.'],
    calorias: 330, proteinas: 52, carbohidratos: 2, grasas: 12,
  },
  {
    nombre: 'Bowl de quinoa', emoji: '🥙', carpeta: 'Saludable', porciones: 2, minutos: 25,
    etiquetas: ['vegetariana', 'fibra'], momentos: ['comida', 'cena'],
    ingredientes: ['150 g de quinoa', '100 g de garbanzos cocidos', '1 zanahoria', '1/2 aguacate', '2 cucharadas de aceite de oliva'],
    pasos: ['Cuece la quinoa.', 'Pica las verduras.', 'Mezcla todo y aliña.'],
    calorias: 430, proteinas: 16, carbohidratos: 58, grasas: 16,
  },
  {
    nombre: 'Avena overnight', emoji: '🥣', carpeta: 'Saludable', porciones: 1, minutos: 5,
    etiquetas: ['desayuno', 'rápida'], momentos: ['desayuno', 'snack'],
    ingredientes: ['60 g de avena', '200 ml de leche', '1 plátano', '1 cucharada de semillas de chía'],
    pasos: ['Mezcla avena, leche y chía.', 'Refrigera toda la noche.', 'Sirve con plátano en rodajas.'],
    calorias: 350, proteinas: 14, carbohidratos: 55, grasas: 8,
  },
]

export const DIETAS_EJEMPLO: DietaEjemplo[] = [
  {
    nombre: 'Mediterránea', descripcion: 'Rica en vegetales, pescado y aceite de oliva. Equilibrada y sostenible.',
    calorias: 2000, proteinas: 110, carbohidratos: 210, grasas: 70,
    recetas: ['Ensalada mediterránea', 'Salmón al horno', 'Pasta al pesto'],
  },
  {
    nombre: 'Alta en proteína', descripcion: 'Prioriza proteína para recomposición corporal y saciedad.',
    calorias: 2200, proteinas: 180, carbohidratos: 170, grasas: 70,
    recetas: ['Salmón al horno', 'Tacos al pastor', 'Chilaquiles verdes'],
  },
  {
    nombre: 'Keto', descripcion: 'Baja en carbohidratos y alta en grasas saludables.',
    calorias: 1800, proteinas: 120, carbohidratos: 40, grasas: 130,
    recetas: ['Salmón al horno', 'Ensalada mediterránea'],
  },
  {
    nombre: 'Vegetariana', descripcion: 'Sin carne, basada en vegetales, legumbres y cereales integrales.',
    calorias: 2000, proteinas: 90, carbohidratos: 250, grasas: 65,
    recetas: ['Ensalada mediterránea', 'Pasta al pesto', 'Bowl de quinoa', 'Avena overnight'],
  },
  {
    nombre: 'Ganancia muscular', descripcion: 'Superávit calórico con proteína alta para ganar masa muscular.',
    calorias: 2800, proteinas: 170, carbohidratos: 300, grasas: 85,
    recetas: ['Pollo a la parrilla', 'Salmón al horno', 'Tacos al pastor', 'Pasta al pesto', 'Avena overnight'],
  },
  {
    nombre: 'Pérdida de grasa', descripcion: 'Déficit calórico con proteína alta para conservar músculo.',
    calorias: 1600, proteinas: 140, carbohidratos: 120, grasas: 50,
    recetas: ['Ensalada mediterránea', 'Salmón al horno', 'Pollo a la parrilla', 'Bowl de quinoa'],
  },
  {
    nombre: 'Sin gluten', descripcion: 'Evita el trigo y derivados; base de maíz, arroz, pescado y verduras.',
    calorias: 2000, proteinas: 120, carbohidratos: 180, grasas: 70,
    recetas: ['Tacos al pastor', 'Chilaquiles verdes', 'Salmón al horno', 'Ensalada mediterránea', 'Pollo a la parrilla'],
  },
]

/** Nombre de archivo ASCII y estable para la imagen de una receta o dieta. */
export function slugCocina(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
}
