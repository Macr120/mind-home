// Las 100 personas SINTÉTICAS de «Pregúntale a 100 personas»: gente inventada
// (no es una encuesta real). Cada rasgo entra al estado de su decisión en Jev.
// Se generan con semilla fija: siempre son las mismas 100.

export interface Persona {
  nombre: string
  edad: number
  ocupacion: string
  ciudad: string
  ingresos: 'bajos' | 'medios' | 'altos'
  familia: string
  forma: string
}

const NOMBRES = [
  'Sofía', 'Mateo', 'Valentina', 'Santiago', 'Camila', 'Diego', 'Lucía', 'Andrés', 'Isabela', 'Javier',
  'Mariana', 'Carlos', 'Daniela', 'Miguel', 'Fernanda', 'Luis', 'Regina', 'Jorge', 'Ximena', 'Pablo',
  'Paula', 'Ricardo', 'Renata', 'Tomás', 'Elena', 'Héctor', 'Gabriela', 'Emilio', 'Ana', 'Raúl',
  'Carmen', 'Óscar', 'Julia', 'Rafael', 'Rosa', 'Iván', 'Natalia', 'Arturo', 'Alejandra', 'Manuel',
  'Priya', 'Kenji', 'Aisha', 'Lucas', 'Olivia', 'Omar', 'Nina', 'James', 'Mei', 'Ahmed',
]

const OCUPACIONES = [
  'estudiante universitario', 'maestra de primaria', 'programador', 'enfermera', 'taxista', 'contadora',
  'dueño de una tienda', 'médica', 'albañil', 'diseñadora gráfica', 'mesero', 'abogada', 'jubilado',
  'ama de casa', 'vendedor', 'ingeniera', 'agricultor', 'chef', 'policía', 'periodista',
  'repartidor de apps', 'gerente de banco', 'artista', 'mecánico', 'psicóloga', 'emprendedora digital',
]

const CIUDADES = [
  'Ciudad de México', 'Guadalajara', 'Monterrey', 'Oaxaca', 'Mérida', 'Bogotá', 'Medellín', 'Lima',
  'Buenos Aires', 'Córdoba', 'Santiago de Chile', 'Madrid', 'Barcelona', 'Sevilla', 'Quito', 'Caracas',
  'San José', 'Montevideo', 'Los Ángeles', 'un pueblo pequeño',
]

const FAMILIAS = ['vive solo', 'vive con su pareja', 'tiene hijos pequeños', 'tiene hijos adultos', 'vive con sus padres', 'comparte piso']

const FORMAS = [
  'optimista y le encanta probar cosas nuevas',
  'desconfiado de la tecnología',
  'muy ahorrador, piensa cada gasto',
  'tradicional, valora la familia y las costumbres',
  'aventurero, prefiere experiencias a cosas',
  'práctico, decide por lo que le ahorra tiempo',
  'preocupado por el medio ambiente',
  'fanático de la tecnología',
  'escéptico, necesita pruebas antes de creer algo',
  'sociable y sigue lo que hacen sus amigos',
  'cauteloso, evita los riesgos',
  'idealista, piensa en lo que es justo',
]

/** mulberry32: pseudoaleatorio con semilla, para que las 100 sean siempre las mismas. */
export function azar(semilla: number): () => number {
  let a = semilla
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let x = Math.imul(a ^ (a >>> 15), 1 | a)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function crearPersonas(): Persona[] {
  const r = azar(100)
  const de = <T>(lista: readonly T[]): T => lista[Math.floor(r() * lista.length)] as T
  return Array.from({ length: 100 }, (_, i) => {
    // Las edades se reparten parejo de 18 a 77 para que cada grupo tenga voz.
    const edad = 18 + Math.floor(((i * 37) % 100) * 0.6)
    const ocupacion = edad >= 66 && r() < 0.6 ? 'jubilado' : edad <= 23 && r() < 0.5 ? 'estudiante universitario' : de(OCUPACIONES)
    const u = r()
    return {
      nombre: NOMBRES[i % NOMBRES.length] as string,
      edad,
      ocupacion,
      ciudad: de(CIUDADES),
      ingresos: u < 0.35 ? 'bajos' : u < 0.8 ? 'medios' : 'altos',
      familia: de(FAMILIAS),
      forma: de(FORMAS),
    }
  })
}

export const PERSONAS = crearPersonas()

/** Caras ya capturadas (data URL; '' = falló), por índice de persona. Viven lo que la sesión. */
export const CARAS: (string | undefined)[] = []

/** Grupos de edad del desglose de resultados. */
export const GRUPOS_EDAD = [
  { id: '18', desde: 18, hasta: 29 },
  { id: '30', desde: 30, hasta: 44 },
  { id: '45', desde: 45, hasta: 59 },
  { id: '60', desde: 60, hasta: 120 },
] as const
