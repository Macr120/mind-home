/**
 * El formulario que la app trae puesto: Matemáticas, Física y Química.
 *
 * Esto es la SEMILLA, no una vista. `siembra.ts` lo lee UNA vez —en el idioma
 * vigente en ese momento— y crea filas normales en `carpetasFormula` y
 * `formulas`: a partir de ahí son fórmulas del usuario, se editan, se mueven y
 * se borran como las que escriba él. No hay «copiar a mis fórmulas» ni una
 * sección aparte de solo lectura.
 *
 * La contrapartida, asumida a propósito: cambiar de idioma DESPUÉS ya no
 * retraduce lo sembrado, igual que no retraduce nada que el usuario escriba.
 * `catalogoEn.ts` sigue valiendo para quien instale la app en inglés.
 *
 * Reglas al añadir una fórmula:
 * - La multiplicación va SIEMPRE explícita (`m * g * h`): mathjs lee `mgh` como
 *   un símbolo llamado «mgh», no como un producto.
 * - El `tex` se escribe a mano. `parse().toTex()` funciona, pero envuelve en
 *   `\mathrm{}` las letras que coinciden con unidades (b, m, g…) y queda feo.
 * - Nada de `e`, `i`, `pi`, `tau` ni `phi` como símbolo: son de mathjs.
 * - Las constantes llevan `constante: true` y su valor: no se le piden al
 *   usuario, se inyectan al evaluar.
 */
import type { VariableFormula } from '../../core/data/db'
import { idiomaActual } from '../../core/i18n/useT'
import { AREAS_EN, FORMULAS_EN, GRUPOS_EN, UNIDADES_EN, VARIABLES_EN } from './catalogoEn'
import type { AreaFabrica } from './constantes'

export interface FormulaCatalogo {
  /** Slug estable: se vuelve `formulaId = 'cat-<area>-<slug>'` al copiar. */
  slug: string
  nombre: string
  /** LaTeX completo, con el símbolo del resultado incluido. */
  tex: string
  /** Lado derecho en sintaxis mathjs. */
  expresion: string
  resultado: string
  variables: VariableFormula[]
  /** Subcarpeta dentro del área. */
  grupo: string
}

export interface AreaCatalogo {
  id: AreaFabrica
  nombre: string
  emoji: string
  color: string
  formulas: FormulaCatalogo[]
}

const v = (simbolo: string, nombre: string, unidad?: string, valor?: number): VariableFormula => ({
  simbolo,
  nombre,
  unidad,
  valor,
})

const cte = (simbolo: string, nombre: string, valor: number, unidad?: string): VariableFormula => ({
  simbolo,
  nombre,
  unidad,
  valor,
  constante: true,
})

const G = cte('g', 'gravedad', 9.81, 'm/s²')

const MATEMATICAS: FormulaCatalogo[] = [
  {
    slug: 'area-circulo',
    grupo: 'Geometría',
    nombre: 'Área del círculo',
    tex: 'A = \\pi r^{2}',
    expresion: 'pi * r^2',
    resultado: 'A',
    variables: [v('r', 'radio', 'm', 1)],
  },
  {
    slug: 'circunferencia',
    grupo: 'Geometría',
    nombre: 'Circunferencia',
    tex: 'C = 2\\pi r',
    expresion: '2 * pi * r',
    resultado: 'C',
    variables: [v('r', 'radio', 'm', 1)],
  },
  {
    slug: 'area-triangulo',
    grupo: 'Geometría',
    nombre: 'Área del triángulo',
    tex: 'A = \\dfrac{b\\,h}{2}',
    expresion: 'b * h / 2',
    resultado: 'A',
    variables: [v('b', 'base', 'm', 3), v('h', 'altura', 'm', 4)],
  },
  {
    slug: 'area-trapecio',
    grupo: 'Geometría',
    nombre: 'Área del trapecio',
    tex: 'A = \\dfrac{(B + b)\\,h}{2}',
    expresion: '(B + b) * h / 2',
    resultado: 'A',
    variables: [v('B', 'base mayor', 'm', 5), v('b', 'base menor', 'm', 3), v('h', 'altura', 'm', 2)],
  },
  {
    slug: 'volumen-cilindro',
    grupo: 'Geometría',
    nombre: 'Volumen del cilindro',
    tex: 'V = \\pi r^{2} h',
    expresion: 'pi * r^2 * h',
    resultado: 'V',
    variables: [v('r', 'radio', 'm', 1), v('h', 'altura', 'm', 2)],
  },
  {
    slug: 'volumen-esfera',
    grupo: 'Geometría',
    nombre: 'Volumen de la esfera',
    tex: 'V = \\tfrac{4}{3}\\pi r^{3}',
    expresion: '4/3 * pi * r^3',
    resultado: 'V',
    variables: [v('r', 'radio', 'm', 1)],
  },
  {
    slug: 'volumen-cono',
    grupo: 'Geometría',
    nombre: 'Volumen del cono',
    tex: 'V = \\dfrac{\\pi r^{2} h}{3}',
    expresion: 'pi * r^2 * h / 3',
    resultado: 'V',
    variables: [v('r', 'radio', 'm', 1), v('h', 'altura', 'm', 3)],
  },
  {
    slug: 'pitagoras',
    grupo: 'Álgebra',
    nombre: 'Teorema de Pitágoras',
    tex: 'c = \\sqrt{a^{2} + b^{2}}',
    expresion: 'sqrt(a^2 + b^2)',
    resultado: 'c',
    variables: [v('a', 'cateto', 'm', 3), v('b', 'cateto', 'm', 4)],
  },
  {
    slug: 'formula-general',
    grupo: 'Álgebra',
    nombre: 'Fórmula general (raíz positiva)',
    tex: 'x = \\dfrac{-b + \\sqrt{b^{2} - 4ac}}{2a}',
    expresion: '(-b + sqrt(b^2 - 4*a*c)) / (2*a)',
    resultado: 'x',
    variables: [v('a', 'coeficiente cuadrático', '', 1), v('b', 'coeficiente lineal', '', -5), v('c', 'término independiente', '', 6)],
  },
  {
    slug: 'discriminante',
    grupo: 'Álgebra',
    nombre: 'Discriminante',
    tex: '\\Delta = b^{2} - 4ac',
    expresion: 'b^2 - 4*a*c',
    resultado: 'D',
    variables: [v('a', 'coeficiente cuadrático', '', 1), v('b', 'coeficiente lineal', '', -5), v('c', 'término independiente', '', 6)],
  },
  {
    slug: 'pendiente',
    grupo: 'Álgebra',
    nombre: 'Pendiente de una recta',
    tex: 'm = \\dfrac{y_{2} - y_{1}}{x_{2} - x_{1}}',
    expresion: '(y2 - y1) / (x2 - x1)',
    resultado: 'm',
    variables: [v('x1', 'x del primer punto', '', 0), v('y1', 'y del primer punto', '', 0), v('x2', 'x del segundo punto', '', 2), v('y2', 'y del segundo punto', '', 6)],
  },
  {
    slug: 'distancia-puntos',
    grupo: 'Álgebra',
    nombre: 'Distancia entre dos puntos',
    tex: 'd = \\sqrt{(x_{2} - x_{1})^{2} + (y_{2} - y_{1})^{2}}',
    expresion: 'sqrt((x2 - x1)^2 + (y2 - y1)^2)',
    resultado: 'd',
    variables: [v('x1', 'x del primer punto', '', 0), v('y1', 'y del primer punto', '', 0), v('x2', 'x del segundo punto', '', 3), v('y2', 'y del segundo punto', '', 4)],
  },
  {
    slug: 'cambio-base',
    grupo: 'Álgebra',
    nombre: 'Cambio de base del logaritmo',
    tex: '\\log_{b} x = \\dfrac{\\ln x}{\\ln b}',
    expresion: 'log(x) / log(b)',
    resultado: 'L',
    variables: [v('x', 'argumento', '', 8), v('b', 'base', '', 2)],
  },
  {
    slug: 'termino-aritmetica',
    grupo: 'Sucesiones',
    nombre: 'Término n de una aritmética',
    tex: 'a_{n} = a_{1} + (n - 1)\\,d',
    expresion: 'a1 + (n - 1) * d',
    resultado: 'an',
    variables: [v('a1', 'primer término', '', 3), v('n', 'posición', '', 10), v('d', 'diferencia', '', 2)],
  },
  {
    slug: 'suma-geometrica',
    grupo: 'Sucesiones',
    nombre: 'Suma de una geométrica',
    tex: 'S_{n} = a_{1}\\,\\dfrac{1 - r^{n}}{1 - r}',
    expresion: 'a1 * (1 - r^n) / (1 - r)',
    resultado: 'Sn',
    variables: [v('a1', 'primer término', '', 2), v('r', 'razón', '', 0.5), v('n', 'número de términos', '', 8)],
  },
  {
    slug: 'ley-senos',
    grupo: 'Trigonometría',
    nombre: 'Ley de senos',
    tex: 'a = \\dfrac{b\\,\\operatorname{sen} A}{\\operatorname{sen} B}',
    expresion: 'b * sin(A) / sin(B)',
    resultado: 'a',
    variables: [v('b', 'lado conocido', 'm', 10), v('A', 'ángulo opuesto a a', 'rad', 0.6), v('B', 'ángulo opuesto a b', 'rad', 1.2)],
  },
  {
    slug: 'ley-cosenos',
    grupo: 'Trigonometría',
    nombre: 'Ley de cosenos',
    tex: 'c = \\sqrt{a^{2} + b^{2} - 2ab\\cos C}',
    expresion: 'sqrt(a^2 + b^2 - 2*a*b*cos(C))',
    resultado: 'c',
    variables: [v('a', 'lado', 'm', 3), v('b', 'lado', 'm', 4), v('C', 'ángulo entre a y b', 'rad', 1.5708)],
  },
  {
    slug: 'interes-compuesto',
    grupo: 'Finanzas',
    nombre: 'Interés compuesto',
    tex: 'M = P\\left(1 + \\dfrac{tasa}{n}\\right)^{n\\,t}',
    expresion: 'P * (1 + tasa/n)^(n*t)',
    resultado: 'M',
    variables: [v('P', 'capital inicial', '', 10000), v('tasa', 'tasa anual (0.08 = 8 %)', '', 0.08), v('n', 'capitalizaciones al año', '', 12), v('t', 'años', 'años', 5)],
  },
]

const FISICA: FormulaCatalogo[] = [
  {
    slug: 'velocidad-media',
    grupo: 'Cinemática',
    nombre: 'Velocidad media',
    tex: 'v = \\dfrac{\\Delta x}{\\Delta t}',
    expresion: 'd / t',
    resultado: 'v',
    variables: [v('d', 'distancia', 'm', 100), v('t', 'tiempo', 's', 12)],
  },
  {
    slug: 'mrua-velocidad',
    grupo: 'Cinemática',
    nombre: 'Velocidad con aceleración constante',
    tex: 'v = v_{0} + a\\,t',
    expresion: 'v0 + a * t',
    resultado: 'v',
    variables: [v('v0', 'velocidad inicial', 'm/s', 0), v('a', 'aceleración', 'm/s²', 9.81), v('t', 'tiempo', 's', 3)],
  },
  {
    slug: 'mrua-posicion',
    grupo: 'Cinemática',
    nombre: 'Posición con aceleración constante',
    tex: 'x = x_{0} + v_{0}t + \\tfrac{1}{2}a\\,t^{2}',
    expresion: 'x0 + v0 * t + a * t^2 / 2',
    resultado: 'x',
    variables: [v('x0', 'posición inicial', 'm', 0), v('v0', 'velocidad inicial', 'm/s', 0), v('a', 'aceleración', 'm/s²', 9.81), v('t', 'tiempo', 's', 3)],
  },
  {
    slug: 'torricelli',
    grupo: 'Cinemática',
    nombre: 'Torricelli (velocidad sin tiempo)',
    tex: 'v = \\sqrt{v_{0}^{2} + 2a\\,\\Delta x}',
    expresion: 'sqrt(v0^2 + 2 * a * d)',
    resultado: 'v',
    variables: [v('v0', 'velocidad inicial', 'm/s', 0), v('a', 'aceleración', 'm/s²', 9.81), v('d', 'desplazamiento', 'm', 20)],
  },
  {
    slug: 'alcance-tiro',
    grupo: 'Cinemática',
    nombre: 'Alcance del tiro parabólico',
    tex: 'R = \\dfrac{v_{0}^{2}\\,\\operatorname{sen}(2\\theta)}{g}',
    expresion: 'v0^2 * sin(2 * ang) / g',
    resultado: 'R',
    variables: [v('v0', 'velocidad inicial', 'm/s', 20), v('ang', 'ángulo de lanzamiento', 'rad', 0.785), G],
  },
  {
    slug: 'segunda-ley',
    grupo: 'Dinámica',
    nombre: 'Segunda ley de Newton',
    tex: 'F = m\\,a',
    expresion: 'm * a',
    resultado: 'F',
    variables: [v('m', 'masa', 'kg', 10), v('a', 'aceleración', 'm/s²', 2)],
  },
  {
    slug: 'peso',
    grupo: 'Dinámica',
    nombre: 'Peso',
    tex: 'P = m\\,g',
    expresion: 'm * g',
    resultado: 'P',
    variables: [v('m', 'masa', 'kg', 70), G],
  },
  {
    slug: 'friccion',
    grupo: 'Dinámica',
    nombre: 'Fuerza de fricción',
    tex: 'F_{r} = \\mu\\,N',
    expresion: 'mu * N',
    resultado: 'Fr',
    variables: [v('mu', 'coeficiente de fricción', '', 0.3), v('N', 'fuerza normal', 'N', 700)],
  },
  {
    slug: 'hooke',
    grupo: 'Dinámica',
    nombre: 'Ley de Hooke',
    tex: 'F = k\\,x',
    expresion: 'k * x',
    resultado: 'F',
    variables: [v('k', 'constante del resorte', 'N/m', 200), v('x', 'deformación', 'm', 0.05)],
  },
  {
    slug: 'energia-cinetica',
    grupo: 'Energía',
    nombre: 'Energía cinética',
    tex: 'E_{k} = \\tfrac{1}{2}m\\,v^{2}',
    expresion: 'm * v^2 / 2',
    resultado: 'Ek',
    variables: [v('m', 'masa', 'kg', 70), v('v', 'velocidad', 'm/s', 3)],
  },
  {
    slug: 'energia-potencial',
    grupo: 'Energía',
    nombre: 'Energía potencial gravitatoria',
    tex: 'E_{p} = m\\,g\\,h',
    expresion: 'm * g * h',
    resultado: 'Ep',
    variables: [v('m', 'masa', 'kg', 70), G, v('h', 'altura', 'm', 10)],
  },
  {
    slug: 'trabajo',
    grupo: 'Energía',
    nombre: 'Trabajo',
    tex: 'W = F\\,d\\cos\\theta',
    expresion: 'F * d * cos(ang)',
    resultado: 'W',
    variables: [v('F', 'fuerza', 'N', 50), v('d', 'desplazamiento', 'm', 4), v('ang', 'ángulo entre F y d', 'rad', 0)],
  },
  {
    slug: 'potencia',
    grupo: 'Energía',
    nombre: 'Potencia',
    tex: 'P = \\dfrac{W}{t}',
    expresion: 'W / t',
    resultado: 'P',
    variables: [v('W', 'trabajo', 'J', 500), v('t', 'tiempo', 's', 10)],
  },
  {
    slug: 'periodo-pendulo',
    grupo: 'Ondas',
    nombre: 'Periodo del péndulo simple',
    tex: 'T = 2\\pi\\sqrt{\\dfrac{L}{g}}',
    expresion: '2 * pi * sqrt(L / g)',
    resultado: 'T',
    variables: [v('L', 'longitud', 'm', 1), G],
  },
  {
    slug: 'velocidad-onda',
    grupo: 'Ondas',
    nombre: 'Velocidad de una onda',
    tex: 'v = \\lambda\\,f',
    expresion: 'lon * f',
    resultado: 'v',
    variables: [v('lon', 'longitud de onda', 'm', 0.5), v('f', 'frecuencia', 'Hz', 680)],
  },
  {
    slug: 'presion',
    grupo: 'Ondas',
    nombre: 'Presión',
    tex: 'P = \\dfrac{F}{A}',
    expresion: 'F / A',
    resultado: 'P',
    variables: [v('F', 'fuerza', 'N', 700), v('A', 'área', 'm²', 0.02)],
  },
  {
    slug: 'ley-ohm',
    grupo: 'Electricidad',
    nombre: 'Ley de Ohm',
    tex: 'V = I\\,R',
    expresion: 'I * R',
    resultado: 'V',
    variables: [v('I', 'corriente', 'A', 2), v('R', 'resistencia', 'Ω', 60)],
  },
  {
    slug: 'potencia-electrica',
    grupo: 'Electricidad',
    nombre: 'Potencia eléctrica',
    tex: 'P = V\\,I',
    expresion: 'V * I',
    resultado: 'P',
    variables: [v('V', 'voltaje', 'V', 120), v('I', 'corriente', 'A', 2)],
  },
]

const QUIMICA: FormulaCatalogo[] = [
  {
    slug: 'gas-ideal',
    grupo: 'Gases',
    nombre: 'Ley del gas ideal (presión)',
    tex: 'P = \\dfrac{n\\,R\\,T}{V}',
    expresion: 'n * R * T / V',
    resultado: 'P',
    variables: [v('n', 'moles', 'mol', 1), cte('R', 'constante de los gases', 0.082057, 'L·atm/(mol·K)'), v('T', 'temperatura', 'K', 298), v('V', 'volumen', 'L', 22.4)],
  },
  {
    slug: 'boyle',
    grupo: 'Gases',
    nombre: 'Ley de Boyle',
    tex: 'P_{2} = \\dfrac{P_{1} V_{1}}{V_{2}}',
    expresion: 'P1 * V1 / V2',
    resultado: 'P2',
    variables: [v('P1', 'presión inicial', 'atm', 1), v('V1', 'volumen inicial', 'L', 10), v('V2', 'volumen final', 'L', 5)],
  },
  {
    slug: 'charles',
    grupo: 'Gases',
    nombre: 'Ley de Charles',
    tex: 'V_{2} = \\dfrac{V_{1} T_{2}}{T_{1}}',
    expresion: 'V1 * T2 / T1',
    resultado: 'V2',
    variables: [v('V1', 'volumen inicial', 'L', 5), v('T1', 'temperatura inicial', 'K', 273), v('T2', 'temperatura final', 'K', 373)],
  },
  {
    slug: 'gay-lussac',
    grupo: 'Gases',
    nombre: 'Ley de Gay-Lussac',
    tex: 'P_{2} = \\dfrac{P_{1} T_{2}}{T_{1}}',
    expresion: 'P1 * T2 / T1',
    resultado: 'P2',
    variables: [v('P1', 'presión inicial', 'atm', 1), v('T1', 'temperatura inicial', 'K', 273), v('T2', 'temperatura final', 'K', 373)],
  },
  {
    slug: 'molaridad',
    grupo: 'Disoluciones',
    nombre: 'Molaridad',
    tex: 'M = \\dfrac{n}{V}',
    expresion: 'n / V',
    resultado: 'M',
    variables: [v('n', 'moles de soluto', 'mol', 0.5), v('V', 'volumen de disolución', 'L', 2)],
  },
  {
    slug: 'molalidad',
    grupo: 'Disoluciones',
    nombre: 'Molalidad',
    tex: 'm = \\dfrac{n}{kg}',
    expresion: 'n / kg',
    resultado: 'mol',
    variables: [v('n', 'moles de soluto', 'mol', 0.5), v('kg', 'masa de disolvente', 'kg', 1)],
  },
  {
    slug: 'dilucion',
    grupo: 'Disoluciones',
    nombre: 'Dilución',
    tex: 'C_{2} = \\dfrac{C_{1} V_{1}}{V_{2}}',
    expresion: 'C1 * V1 / V2',
    resultado: 'C2',
    variables: [v('C1', 'concentración inicial', 'M', 2), v('V1', 'volumen inicial', 'L', 0.5), v('V2', 'volumen final', 'L', 2)],
  },
  {
    slug: 'porcentaje-masa',
    grupo: 'Disoluciones',
    nombre: 'Porcentaje en masa',
    tex: '\\%_{m} = \\dfrac{m_{s}}{m_{t}} \\times 100',
    expresion: 'ms / mt * 100',
    resultado: 'pm',
    variables: [v('ms', 'masa de soluto', 'g', 5), v('mt', 'masa total', 'g', 100)],
  },
  {
    slug: 'ph',
    grupo: 'Disoluciones',
    nombre: 'pH',
    tex: 'pH = -\\log_{10}\\left[H^{+}\\right]',
    expresion: '-log10(H)',
    resultado: 'pH',
    variables: [v('H', 'concentración de H⁺', 'mol/L', 0.0001)],
  },
  {
    slug: 'poh',
    grupo: 'Disoluciones',
    nombre: 'pOH a partir del pH',
    tex: 'pOH = 14 - pH',
    expresion: '14 - pH',
    resultado: 'pOH',
    variables: [v('pH', 'pH de la disolución', '', 4)],
  },
  {
    slug: 'moles',
    grupo: 'Estequiometría',
    nombre: 'Moles a partir de la masa',
    tex: 'n = \\dfrac{m}{M}',
    expresion: 'm / M',
    resultado: 'n',
    variables: [v('m', 'masa', 'g', 36), v('M', 'masa molar', 'g/mol', 18)],
  },
  {
    slug: 'masa-de-moles',
    grupo: 'Estequiometría',
    nombre: 'Masa a partir de los moles',
    tex: 'm = n\\,M',
    expresion: 'n * M',
    resultado: 'm',
    variables: [v('n', 'moles', 'mol', 2), v('M', 'masa molar', 'g/mol', 18)],
  },
  {
    slug: 'numero-particulas',
    grupo: 'Estequiometría',
    nombre: 'Número de partículas',
    tex: 'N = n\\,N_{A}',
    expresion: 'n * NA',
    resultado: 'N',
    variables: [v('n', 'moles', 'mol', 1), cte('NA', 'número de Avogadro', 6.02214076e23, '1/mol')],
  },
  {
    slug: 'rendimiento',
    grupo: 'Estequiometría',
    nombre: 'Rendimiento de la reacción',
    tex: '\\%_{R} = \\dfrac{real}{teorico} \\times 100',
    expresion: 'real / teorico * 100',
    resultado: 'pR',
    variables: [v('real', 'producto obtenido', 'g', 8.2), v('teorico', 'producto teórico', 'g', 10)],
  },
  {
    slug: 'calor-sensible',
    grupo: 'Termoquímica',
    nombre: 'Calor sensible',
    tex: 'Q = m\\,c\\,\\Delta T',
    expresion: 'm * c * dT',
    resultado: 'Q',
    variables: [v('m', 'masa', 'g', 500), v('c', 'calor específico', 'J/(g·°C)', 4.18), v('dT', 'cambio de temperatura', '°C', 25)],
  },
  {
    slug: 'calor-latente',
    grupo: 'Termoquímica',
    nombre: 'Calor latente',
    tex: 'Q = m\\,L',
    expresion: 'm * L',
    resultado: 'Q',
    variables: [v('m', 'masa', 'g', 100), v('L', 'calor latente', 'J/g', 334)],
  },
  {
    slug: 'densidad',
    grupo: 'Termoquímica',
    nombre: 'Densidad',
    tex: 'd = \\dfrac{m}{V}',
    expresion: 'm / V',
    resultado: 'd',
    variables: [v('m', 'masa', 'g', 100), v('V', 'volumen', 'mL', 125)],
  },
  {
    slug: 'entalpia-reaccion',
    grupo: 'Termoquímica',
    nombre: 'Entalpía de reacción',
    tex: '\\Delta H = \\sum H_{prod} - \\sum H_{react}',
    expresion: 'Hp - Hr',
    resultado: 'dH',
    variables: [v('Hp', 'entalpía de los productos', 'kJ/mol', -394), v('Hr', 'entalpía de los reactivos', 'kJ/mol', 0)],
  },
]

export const CATALOGO: AreaCatalogo[] = [
  { id: 'matematicas', nombre: 'Matemáticas', emoji: '📐', color: '#38bdf8', formulas: MATEMATICAS },
  { id: 'fisica', nombre: 'Física', emoji: '⚛️', color: '#a78bfa', formulas: FISICA },
  { id: 'quimica', nombre: 'Química', emoji: '🧪', color: '#4ade80', formulas: QUIMICA },
]

/** El mismo catálogo con los nombres en inglés (la notación no cambia). */
const CATALOGO_EN: AreaCatalogo[] = CATALOGO.map((area) => ({
  ...area,
  nombre: AREAS_EN[area.id] ?? area.nombre,
  formulas: area.formulas.map((f) => ({
    ...f,
    nombre: FORMULAS_EN[f.slug] ?? f.nombre,
    grupo: GRUPOS_EN[f.grupo] ?? f.grupo,
    variables: f.variables.map((x) => ({
      ...x,
      nombre: VARIABLES_EN[x.nombre] ?? x.nombre,
      unidad: x.unidad ? (UNIDADES_EN[x.unidad] ?? x.unidad) : x.unidad,
    })),
  })),
}))

/** La semilla en el idioma activo. La lee `siembra.ts`, una sola vez. */
export const catalogoActual = (): AreaCatalogo[] => (idiomaActual() === 'en' ? CATALOGO_EN : CATALOGO)

/** `formulaId` de una fórmula sembrada: determinista entre dispositivos. */
export const idCatalogo = (area: string, slug: string) => `cat-${area}-${slug}`
