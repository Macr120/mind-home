import type { TextosEjemplosCocina } from './ejemplos.i18n'

/**
 * INGLÉS de la siembra de cocina. Referencia curada del resto de idiomas
 * (`ejemplos.i18n.<id>.ts`), como `dict.en.ts` lo es de la interfaz.
 */
export const EJEMPLOS_COCINA_EN: TextosEjemplosCocina = {
  recetas: {
    'pasta-al-pesto': {
      nombre: 'Pesto pasta',
      carpeta: 'Italian',
      etiquetas: ['pasta', 'quick', 'vegetarian'],
      ingredientes: ['200 g pasta', '4 tablespoons pesto', '30 g Parmesan cheese', '1 tablespoon olive oil'],
      pasos: ['Cook the pasta al dente.', 'Drain it and toss with the pesto.', 'Serve with grated Parmesan.'],
    },
    'pizza-margarita': {
      nombre: 'Margherita pizza',
      carpeta: 'Italian',
      etiquetas: ['oven', 'vegetarian'],
      ingredientes: ['1 pizza base', '150 g tomato sauce', '125 g mozzarella', 'Basil leaves'],
      pasos: ['Spread the sauce over the base.', 'Add the mozzarella.', 'Bake at 220 °C for 12 min.', 'Finish with basil.'],
    },
    'tacos-al-pastor': {
      nombre: 'Tacos al pastor',
      carpeta: 'Mexican',
      etiquetas: ['pork', 'classic'],
      ingredientes: ['400 g marinated pork', '9 corn tortillas', '1/2 pineapple', '1 onion', 'Cilantro to taste'],
      pasos: ['Grill the marinated pork.', 'Chop it finely with pineapple.', 'Serve on tortillas with onion and cilantro.'],
    },
    'chilaquiles-verdes': {
      nombre: 'Green chilaquiles',
      carpeta: 'Mexican',
      etiquetas: ['breakfast'],
      ingredientes: ['200 g tortilla chips', '300 ml green salsa', '2 eggs', '50 g fresh cheese', 'Cream to taste'],
      pasos: ['Heat the green salsa.', 'Add the chips and toss.', 'Serve with egg, cheese and cream.'],
    },
    'ensalada-mediterr-nea': {
      nombre: 'Mediterranean salad',
      carpeta: 'Healthy',
      etiquetas: ['light', 'vegetarian'],
      ingredientes: ['1 cucumber', '2 tomatoes', '80 g feta cheese', '10 olives', '2 tablespoons olive oil'],
      pasos: ['Chop the vegetables.', 'Add feta and olives.', 'Dress with olive oil.'],
    },
    'salm-n-al-horno': {
      nombre: 'Baked salmon',
      carpeta: 'Healthy',
      etiquetas: ['fish', 'high protein'],
      ingredientes: ['2 salmon fillets (300 g)', '1 lemon', '2 garlic cloves', 'Dill and salt to taste'],
      pasos: ['Place the salmon on a tray.', 'Season with garlic, lemon and dill.', 'Bake at 200 °C for 18 min.'],
    },
    'pollo-a-la-parrilla': {
      nombre: 'Grilled chicken',
      carpeta: 'Healthy',
      etiquetas: ['chicken', 'high protein'],
      ingredientes: ['300 g chicken breast', '1 tablespoon olive oil', 'Spices and salt to taste', '1 lemon'],
      pasos: ['Season the chicken.', 'Grill 6-7 min per side.', 'Rest and serve with lemon.'],
    },
    'bowl-de-quinoa': {
      nombre: 'Quinoa bowl',
      carpeta: 'Healthy',
      etiquetas: ['vegetarian', 'fiber'],
      ingredientes: ['150 g quinoa', '100 g cooked chickpeas', '1 carrot', '1/2 avocado', '2 tablespoons olive oil'],
      pasos: ['Cook the quinoa.', 'Chop the vegetables.', 'Mix everything and dress.'],
    },
    'avena-overnight': {
      nombre: 'Overnight oats',
      carpeta: 'Healthy',
      etiquetas: ['breakfast', 'quick'],
      ingredientes: ['60 g oats', '200 ml milk', '1 banana', '1 tablespoon chia seeds'],
      pasos: ['Mix oats, milk and chia.', 'Refrigerate overnight.', 'Serve with banana slices.'],
    },
  },
  dietas: {
    'mediterr-nea': {
      nombre: 'Mediterranean',
      descripcion: 'Rich in vegetables, fish and olive oil. Balanced and sustainable.',
    },
    'alta-en-prote-na': {
      nombre: 'High protein',
      descripcion: 'Prioritizes protein for body recomposition and satiety.',
    },
    keto: {
      nombre: 'Keto',
      descripcion: 'Low in carbs and high in healthy fats.',
    },
    vegetariana: {
      nombre: 'Vegetarian',
      descripcion: 'Meat-free, based on vegetables, legumes and whole grains.',
    },
    'ganancia-muscular': {
      nombre: 'Muscle gain',
      descripcion: 'Caloric surplus with high protein to build muscle mass.',
    },
    'p-rdida-de-grasa': {
      nombre: 'Fat loss',
      descripcion: 'Caloric deficit with high protein to preserve muscle.',
    },
    'sin-gluten': {
      nombre: 'Gluten-free',
      descripcion: 'Avoids wheat and derivatives; based on corn, rice, fish and vegetables.',
    },
  },
  dia: [
    { nombre: 'Overnight oats with banana', nota: 'Example: this is what a logged day looks like.' },
    { nombre: 'Greek yogurt with walnuts' },
    { nombre: 'Grilled chicken with rice and vegetables' },
    { nombre: 'Baked salmon with salad' },
  ],
  lista: {
    nombre: 'Example: Weekly groceries',
    items: [
      'Chicken breast',
      'Salmon',
      'Eggs',
      'Tomato',
      'Avocado',
      'Spinach',
      'Greek yogurt',
      'Feta cheese',
      'Oats',
      'Brown rice',
      'Olive oil',
      'Corn tortillas',
    ],
  },
}
