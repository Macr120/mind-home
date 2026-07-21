// Copia local de normalizar: importarla del dispatcher crea un ciclo
// (dispatcher → registry → cocina/index → este módulo) que rompe la
// inicialización, porque cocina/index usa CATEGORIAS_COMPRA a nivel de módulo.
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')
const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(DIACRITICOS, '')

/** Categorías (pasillos) de la lista de compras del súper. */
export const CATEGORIAS_COMPRA: { id: string; label: string; icon: string }[] = [
  { id: 'frutas-verduras', label: 'Frutas y verduras', icon: '🥦' },
  { id: 'proteinas', label: 'Proteínas', icon: '🥩' },
  { id: 'lacteos', label: 'Lácteos', icon: '🧀' },
  { id: 'panaderia', label: 'Panadería y tortillas', icon: '🍞' },
  { id: 'abarrotes', label: 'Abarrotes', icon: '🌾' },
  { id: 'dulces', label: 'Dulces y botanas', icon: '🍬' },
  { id: 'bebidas', label: 'Bebidas', icon: '🥤' },
  { id: 'congelados', label: 'Congelados', icon: '🧊' },
  { id: 'hogar', label: 'Hogar y limpieza', icon: '🧻' },
  { id: 'otros', label: 'Otros', icon: '📦' },
]

export const getCategoriaCompra = (id: string) =>
  CATEGORIAS_COMPRA.find((c) => c.id === id) ?? CATEGORIAS_COMPRA[CATEGORIAS_COMPRA.length - 1]

/** Palabras clave (sin acentos) → categoría, para clasificar en automático. */
const CLAVES: [string, string[]][] = [
  ['frutas-verduras', ['manzana', 'platano', 'naranja', 'limon', 'fresa', 'uva', 'mango', 'papaya', 'sandia', 'melon', 'pina', 'aguacate', 'jitomate', 'tomate', 'cebolla', 'ajo', 'papa', 'papas', 'zanahoria', 'lechuga', 'espinaca', 'brocoli', 'calabaza', 'calabacita', 'chile', 'pepino', 'cilantro', 'perejil', 'elote', 'nopal', 'champinon', 'champinones', 'hongos', 'fruta', 'verdura', 'apio', 'betabel', 'rabano', 'chayote']],
  ['proteinas', ['pollo', 'res', 'carne', 'cerdo', 'puerco', 'pescado', 'atun', 'salmon', 'camaron', 'camarones', 'huevo', 'huevos', 'pechuga', 'bistec', 'molida', 'jamon', 'salchicha', 'tocino', 'chorizo', 'pavo', 'costilla', 'arrachera', 'tofu']],
  ['lacteos', ['leche', 'queso', 'yogurt', 'yogur', 'crema', 'mantequilla', 'requeson', 'panela', 'oaxaca', 'manchego']],
  ['panaderia', ['pan', 'tortilla', 'tortillas', 'bolillo', 'baguette', 'tostadas', 'pita']],
  ['dulces', ['chocolate', 'dulce', 'dulces', 'galleta', 'galletas', 'botana', 'papitas', 'chicle', 'caramelo', 'paleta', 'gomitas', 'pastel', 'dona', 'donas', 'chips']],
  ['bebidas', ['agua', 'refresco', 'jugo', 'cerveza', 'vino', 'soda', 'cafe', 'te', 'electrolitos']],
  ['congelados', ['congelado', 'congelada', 'congelados', 'helado', 'hielo', 'nieve']],
  ['hogar', ['jabon', 'shampoo', 'papel', 'servilletas', 'detergente', 'cloro', 'limpiador', 'esponja', 'desodorante', 'toallas', 'pilas', 'bolsas']],
  ['abarrotes', ['arroz', 'pasta', 'frijol', 'frijoles', 'lenteja', 'lentejas', 'garbanzo', 'avena', 'cereal', 'aceite', 'sal', 'azucar', 'harina', 'mayonesa', 'catsup', 'mostaza', 'vinagre', 'salsa', 'sopa', 'consome', 'caldo', 'pimienta', 'canela', 'miel', 'mermelada', 'especias', 'oregano', 'comino', 'cacahuate', 'nuez', 'almendras', 'granola', 'proteina']],
]

/** Adivina la categoría por palabras del nombre; 'otros' si nada coincide. */
export function adivinarCategoria(nombre: string): string {
  const tokens = new Set(normalizar(nombre).split(/[^a-z0-9]+/).filter(Boolean))
  for (const [cat, claves] of CLAVES) {
    if (claves.some((k) => tokens.has(k))) return cat
  }
  return 'otros'
}
