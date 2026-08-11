/**
 * Catálogo de notaciones matemáticas para escribir expresiones sin pelearse con
 * el teclado: fracciones, raíces, potencias, matrices, trigonometría y letras
 * griegas.
 *
 * Todo lo de aquí se escribe en la SINTAXIS DEL MOTOR (mathjs), que es la misma
 * en los tres sitios donde se escriben ecuaciones —el formulario, la calculadora
 * y las hojas—, y de ahí sale sola la vista bonita (`motor.aTex`). Por eso el
 * catálogo solo trae notación que el motor sabe CALCULAR: una integral o un
 * límite se verían preciosos y luego no darían ningún resultado.
 *
 * El `tex` de cada una es solo la muestra del botón (`\square` = hueco).
 */

export interface Notacion {
  /** Lo que se escribe. `$0` marca dónde queda el cursor al insertarla. */
  escribe: string
  /** Muestra en LaTeX del botón. */
  tex: string
}

export interface GrupoNotacion {
  id: string
  labelEs: string
  notaciones: Notacion[]
}

const n = (tex: string, escribe: string): Notacion => ({ tex, escribe })

/** Operaciones del día a día: fracciones, potencias, raíces y logaritmos. */
const BASICAS: Notacion[] = [
  n('\\frac{\\square}{\\square}', '($0)/()'),
  n('\\square^{2}', '^2'),
  n('\\square^{3}', '^3'),
  n('\\square^{\\square}', '^($0)'),
  n('\\sqrt{\\square}', 'sqrt($0)'),
  n('\\sqrt[3]{\\square}', 'cbrt($0)'),
  n('\\sqrt[\\square]{\\square}', 'nthRoot($0, 2)'),
  n('\\left|\\square\\right|', 'abs($0)'),
  n('(\\square)', '($0)'),
  n('e^{\\square}', 'exp($0)'),
  n('\\ln(\\square)', 'log($0)'),
  n('\\log_{10}(\\square)', 'log10($0)'),
  n('\\log_{\\square}(\\square)', 'log($0, 2)'),
  n('\\square!', '$0!'),
  n('\\square \\bmod \\square', 'mod($0, 2)'),
  n('\\lfloor\\square\\rfloor', 'floor($0)'),
  n('\\lceil\\square\\rceil', 'ceil($0)'),
  n('\\mathrm{round}(\\square)', 'round($0)'),
  n('\\square \\le \\square', ' <= '),
  n('\\square \\ge \\square', ' >= '),
  n('\\square \\ne \\square', ' != '),
  n('\\infty', 'Infinity'),
  n('-\\infty', '-Infinity'),
]

/** Lo que el motor sabe hacer de cálculo y estadística sobre una lista. */
const CALCULO: Notacion[] = [
  n('\\frac{d}{dx}\\square', 'derivative($0, x)'),
  n('\\frac{d^{2}}{dx^{2}}\\square', 'derivative(derivative($0, x), x)'),
  n('\\sum \\square', 'sum($0)'),
  n('\\sum_{1}^{\\square}', 'sum(1:$0)'),
  n('\\prod \\square', 'prod($0)'),
  n('\\prod_{1}^{\\square}', 'prod(1:$0)'),
  n('\\bar{x}', 'mean($0)'),
  n('\\mathrm{Me}', 'median($0)'),
  n('\\sigma', 'std($0)'),
  n('\\sigma^{2}', 'variance($0)'),
  n('\\max', 'max($0)'),
  n('\\min', 'min($0)'),
  n('\\binom{\\square}{\\square}', 'combinations($0, 2)'),
  n('P(\\square,\\square)', 'permutations($0, 2)'),
  n('\\gcd', 'gcd($0, 2)'),
  n('\\mathrm{lcm}', 'lcm($0, 2)'),
]

/** Vectores, matrices y sus operaciones. */
const MATRICES: Notacion[] = [
  n('[\\square, \\square]', '[$0, 0]'),
  n('[\\square, \\square, \\square]', '[$0, 0, 0]'),
  n('\\begin{bmatrix}\\square & \\square\\\\ \\square & \\square\\end{bmatrix}', '[[$0, 0], [0, 0]]'),
  n(
    '\\begin{bmatrix}\\square & \\square & \\square\\\\ \\square & \\square & \\square\\\\ \\square & \\square & \\square\\end{bmatrix}',
    '[[$0, 0, 0], [0, 0, 0], [0, 0, 0]]',
  ),
  n('\\square : \\square', '1:$0'),
  n('\\det(\\square)', 'det($0)'),
  n('\\square^{-1}', 'inv($0)'),
  n('\\square^{T}', 'transpose($0)'),
  n('\\square \\cdot \\square', 'dot($0, )'),
  n('\\square \\times \\square', 'cross($0, )'),
  n('\\lVert\\square\\rVert', 'norm($0)'),
  n('I_{n}', 'identity($0)'),
  n('0_{n}', 'zeros($0)'),
  n('1_{n}', 'ones($0)'),
  n('\\mathrm{size}', 'size($0)'),
]

/** Las trigonométricas del motor, directas, inversas e hiperbólicas. */
const TRIGONOMETRIA: Notacion[] = [
  n('\\sin', 'sin($0)'),
  n('\\cos', 'cos($0)'),
  n('\\tan', 'tan($0)'),
  n('\\sec', 'sec($0)'),
  n('\\csc', 'csc($0)'),
  n('\\cot', 'cot($0)'),
  n('\\sin^{-1}', 'asin($0)'),
  n('\\cos^{-1}', 'acos($0)'),
  n('\\tan^{-1}', 'atan($0)'),
  n('\\mathrm{atan2}', 'atan2($0, )'),
  n('\\sinh', 'sinh($0)'),
  n('\\cosh', 'cosh($0)'),
  n('\\tanh', 'tanh($0)'),
  n('\\mathrm{sech}', 'sech($0)'),
  n('\\mathrm{csch}', 'csch($0)'),
  n('\\coth', 'coth($0)'),
  n('\\sinh^{-1}', 'asinh($0)'),
  n('\\cosh^{-1}', 'acosh($0)'),
  n('\\tanh^{-1}', 'atanh($0)'),
  n('\\square^{\\circ}', ' deg'),
  n('\\mathrm{rad}', ' rad'),
]

/**
 * Letras griegas y constantes. Las griegas son NOMBRES DE VARIABLE normales
 * («alpha») que el motor pinta como α en la vista bonita; las cinco de la
 * derecha ya valen algo para mathjs (ver `SIMBOLOS_RESERVADOS`) y por eso van
 * marcadas aparte: no se pueden usar como incógnita.
 */
const SIMBOLOS: Notacion[] = [
  n('\\alpha', 'alpha'),
  n('\\beta', 'beta'),
  n('\\gamma', 'gamma'),
  n('\\delta', 'delta'),
  n('\\varepsilon', 'epsilon'),
  n('\\zeta', 'zeta'),
  n('\\eta', 'eta'),
  n('\\theta', 'theta'),
  n('\\vartheta', 'vartheta'),
  n('\\iota', 'iota'),
  n('\\kappa', 'kappa'),
  n('\\lambda', 'lambda'),
  n('\\mu', 'mu'),
  n('\\nu', 'nu'),
  n('\\xi', 'xi'),
  n('\\rho', 'rho'),
  n('\\varrho', 'varrho'),
  n('\\sigma', 'sigma'),
  n('\\upsilon', 'upsilon'),
  n('\\chi', 'chi'),
  n('\\psi', 'psi'),
  n('\\omega', 'omega'),
  n('\\Gamma', 'Gamma'),
  n('\\Delta', 'Delta'),
  n('\\Theta', 'Theta'),
  n('\\Lambda', 'Lambda'),
  n('\\Xi', 'Xi'),
  n('\\Sigma', 'Sigma'),
  n('\\Upsilon', 'Upsilon'),
  n('\\Phi', 'Phi'),
  n('\\Psi', 'Psi'),
  n('\\Omega', 'Omega'),
  n('\\pi', 'pi'),
  n('e', 'e'),
  n('\\tau', 'tau'),
  n('\\varphi', 'phi'),
  n('i', 'i'),
]

export const GRUPOS_NOTACION: GrupoNotacion[] = [
  { id: 'basicas', labelEs: 'Básicas', notaciones: BASICAS },
  { id: 'calculo', labelEs: 'Cálculo', notaciones: CALCULO },
  { id: 'matrices', labelEs: 'Matrices', notaciones: MATRICES },
  { id: 'trigonometria', labelEs: 'Trigonometría', notaciones: TRIGONOMETRIA },
  { id: 'simbolos', labelEs: 'Símbolos', notaciones: SIMBOLOS },
]

/**
 * Mete la notación en el texto por donde esté el cursor (o al final si no hay)
 * y dice dónde dejarlo: en el hueco marcado con `$0`, listo para escribir.
 */
export function insertarNotacion(
  texto: string,
  escribe: string,
  desde = texto.length,
  hasta = desde,
): { texto: string; cursor: number } {
  const hueco = escribe.indexOf('$0')
  const trozo = escribe.replace('$0', '')
  return {
    texto: texto.slice(0, desde) + trozo + texto.slice(hasta),
    cursor: desde + (hueco < 0 ? trozo.length : hueco),
  }
}
