/** Nombres simpáticos para los animales de la granja (se asignan al azar al colocar). */
export const NOMBRES_ANIMAL = [
  'Pepa', 'Lola', 'Coco', 'Canela', 'Nube', 'Motas', 'Trufa', 'Bruno',
  'Rosita', 'Pancho', 'Manchas', 'Luna', 'Copito', 'Greta', 'Olivo', 'Pipa',
  'Turrón', 'Bombón', 'Chispa', 'Nieve', 'Caramelo', 'Frijol', 'Mora', 'Paco',
  'Tita', 'Bigotes', 'Galleta', 'Romero', 'Perla', 'Choco',
]

export const nombreAleatorio = (): string =>
  NOMBRES_ANIMAL[Math.floor(Math.random() * NOMBRES_ANIMAL.length)]
