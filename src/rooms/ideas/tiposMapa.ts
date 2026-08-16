import type { TipoMapa } from '../../core/data/db'
import { tGlobal } from '../../core/i18n/useT'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { PALETA_RAMAS } from './constantes'

/**
 * Catálogo de formatos. Cada uno decide su layout (layouts.ts), su fondo y sus
 * uniones en el lienzo, y el contrato que se le pide a la IA.
 *
 * Dos familias por CÓMO se dibujan:
 * - JERÁRQUICOS (mental, árbol, llaves, círculo, flujo, Ishikawa, línea del
 *   tiempo, ciclo, árbol de decisiones): una raíz y nodos que cuelgan de un padre.
 * - POR ZONAS (Venn, comparación, pros/contras, fuerzas, FODA, Eisenhower,
 *   pirámide, tier list): una raíz por región —columna, cuadrante, nivel o
 *   fila— y cada elemento pertenece a una (`NodoMapa.zona`), no a un punto del
 *   árbol.
 *
 * Y dos familias por PARA QUÉ sirven, que es lo que separa las pestañas de la
 * app: `mapas` para entender un tema y `diagramas` para decidir.
 */

export interface DefTipoMapa {
  id: TipoMapa
  icono: NombreIcono
  nombreEs: string
  descripcionEs: string
  /** Pestaña en la que se ofrece y a la que abre. */
  familia: 'mapas' | 'diagramas'
  /** Los elementos caen en regiones (`zona`) en vez de colgar libremente. */
  porZonas?: boolean
  /** Las uniones llevan punta de flecha (secuencia dirigida). */
  flechas?: boolean
  /** Cada elemento pesa de 1 a 5 y cada región suma sus pesos. */
  pesos?: boolean
  /** No se dibuja en el lienzo: tiene su propia vista de tabla. */
  tabla?: boolean
  /** Cuántas raíces tiene: 1 salvo los de zonas (2-5). */
  raices?: number
  /** Colores de las raíces cuando el orden significa algo (tier list). */
  paleta?: string[]
}

/** Rojo → azul: el degradado con el que se leen las tiers de un vistazo. */
const PALETA_TIER = ['#fb7185', '#fb923c', '#facc15', '#34d399', '#38bdf8']

export const TIPOS_MAPA: DefTipoMapa[] = [
  {
    id: 'mental',
    icono: 'nodos',
    nombreEs: 'Mapa mental',
    descripcionEs: 'Idea central y ramas que salen en todas direcciones.',
    familia: 'mapas',
  },
  {
    id: 'arbol',
    icono: 'rama',
    nombreEs: 'Árbol',
    descripcionEs: 'Jerarquía de arriba a abajo, tipo organigrama.',
    familia: 'mapas',
  },
  {
    id: 'etimologia',
    icono: 'libro',
    nombreEs: 'Árbol etimológico',
    descripcionEs: 'Una palabra desarmada: su origen, sus significados, sus usos y su familia.',
    familia: 'mapas',
  },
  {
    id: 'llaves',
    icono: 'llaves',
    nombreEs: 'Llaves',
    descripcionEs: 'El todo y sus partes, de izquierda a derecha.',
    familia: 'mapas',
  },
  {
    id: 'circulo',
    icono: 'objetivo',
    nombreEs: 'Círculo',
    descripcionEs: 'Un tema al centro rodeado de todo lo que sabes de él.',
    familia: 'mapas',
  },
  {
    id: 'flujo',
    icono: 'flujo',
    nombreEs: 'Diagrama de flujo',
    descripcionEs: 'Pasos en orden con flechas, con inicio, decisiones y fin.',
    familia: 'mapas',
    flechas: true,
  },
  {
    id: 'linea',
    icono: 'via',
    nombreEs: 'Línea del tiempo',
    descripcionEs: 'Hitos en orden sobre una línea, del primero al último.',
    familia: 'mapas',
  },
  {
    id: 'ciclo',
    icono: 'repetir',
    nombreEs: 'Ciclo',
    descripcionEs: 'Etapas que se repiten en círculo y vuelven a empezar.',
    familia: 'mapas',
    flechas: true,
  },
  {
    id: 'piramide',
    icono: 'niveles',
    nombreEs: 'Pirámide',
    descripcionEs: 'Niveles apilados: lo que sostiene abajo y la cima arriba.',
    familia: 'mapas',
    porZonas: true,
    raices: 4,
  },
  {
    id: 'venn',
    icono: 'venn',
    nombreEs: 'Diagrama de Venn',
    descripcionEs: 'Dos o tres conjuntos que se solapan y lo que comparten.',
    familia: 'mapas',
    porZonas: true,
    raices: 2,
  },
  {
    id: 'comparacion',
    icono: 'comparar',
    nombreEs: 'Comparación',
    descripcionEs: 'Dos temas enfrentados: lo propio de cada uno y lo común.',
    familia: 'mapas',
    porZonas: true,
    raices: 2,
  },
  {
    id: 'proscontras',
    icono: 'balanza',
    nombreEs: 'Ventajas y desventajas',
    descripcionEs: 'Una decisión a dos columnas: lo que suma y lo que resta, con pesos.',
    familia: 'diagramas',
    porZonas: true,
    pesos: true,
    raices: 2,
  },
  {
    id: 'fuerzas',
    icono: 'movimientos',
    nombreEs: 'Campo de fuerzas',
    descripcionEs: 'Lo que empuja el cambio contra lo que lo frena, con su fuerza.',
    familia: 'diagramas',
    porZonas: true,
    pesos: true,
    raices: 2,
  },
  {
    id: 'foda',
    icono: 'rejilla',
    nombreEs: 'FODA',
    descripcionEs: 'Cuatro cuadrantes: fortalezas, oportunidades, debilidades y amenazas.',
    familia: 'diagramas',
    porZonas: true,
    raices: 4,
  },
  {
    id: 'eisenhower',
    icono: 'cronometro',
    nombreEs: 'Eisenhower',
    descripcionEs: 'Urgente contra importante: qué haces ya, qué agendas, qué sueltas.',
    familia: 'diagramas',
    porZonas: true,
    raices: 4,
  },
  {
    id: 'decision',
    icono: 'brujula',
    nombreEs: 'Árbol de decisiones',
    descripcionEs: 'Cada opción y a dónde te lleva, rama por rama.',
    familia: 'diagramas',
    flechas: true,
  },
  {
    id: 'tier',
    icono: 'trofeo',
    nombreEs: 'Tier list',
    descripcionEs: 'Filas de la S a la D para ordenar cualquier cosa por nivel.',
    familia: 'diagramas',
    porZonas: true,
    raices: 5,
    paleta: PALETA_TIER,
  },
  {
    id: 'matriz',
    icono: 'calculadora',
    nombreEs: 'Matriz de decisión',
    descripcionEs: 'Varias opciones puntuadas contra los criterios que te importan.',
    familia: 'diagramas',
    // No es un lienzo: se dibuja como tabla (MatrizDecision.tsx).
    tabla: true,
  },
  {
    id: 'ishikawa',
    icono: 'pescado',
    nombreEs: 'Ishikawa',
    descripcionEs: 'Espina de pescado: un problema y las causas que lo provocan.',
    familia: 'diagramas',
  },
]

export const defTipo = (tipo: TipoMapa | undefined): DefTipoMapa =>
  TIPOS_MAPA.find((t) => t.id === (tipo ?? 'mental')) ?? TIPOS_MAPA[0]

/** Formatos de una pestaña, en el orden del catálogo. */
export const tiposDe = (familia: 'mapas' | 'diagramas'): DefTipoMapa[] =>
  TIPOS_MAPA.filter((t) => t.familia === familia)

/** Zonas de un Venn de 2 o 3 conjuntos, en el orden en que se listan al elegir. */
export const zonasVenn = (nConjuntos: number): string[] =>
  nConjuntos >= 3 ? ['a', 'b', 'c', 'ab', 'ac', 'bc', 'abc'] : ['a', 'b', 'ab']

/**
 * TODAS las regiones de cada formato por zonas, en el orden en que se leen. El
 * Venn va aparte porque las suyas dependen de cuántos conjuntos tenga.
 */
const ZONAS: Partial<Record<TipoMapa, string[]>> = {
  comparacion: ['izq', 'centro', 'der'],
  proscontras: ['izq', 'der'],
  fuerzas: ['izq', 'der'],
  foda: ['f', 'd', 'o', 'a'],
  eisenhower: ['hacer', 'agendar', 'delegar', 'quitar'],
  piramide: ['p1', 'p2', 'p3', 'p4'],
  // `sin` es la bandeja: donde esperan las cosas que aún no tienen nivel.
  tier: ['s', 'a', 'b', 'c', 'd', 'sin'],
}

/**
 * Regiones que TIENEN raíz (una etiqueta propia). Se separa de `ZONAS` porque
 * la columna del medio de la comparación y la bandeja de la tier list no son de
 * nadie: el lienzo las titula él mismo y sus elementos van en color neutro.
 */
const ZONAS_RAIZ: Partial<Record<TipoMapa, string[]>> = {
  ...ZONAS,
  comparacion: ['izq', 'der'],
  tier: ['s', 'a', 'b', 'c', 'd'],
}

/**
 * Color de la región número `i`: la paleta propia del formato cuando el orden
 * significa algo (la tier list), o la de las ramas en todos los demás.
 */
export function colorRaiz(tipo: TipoMapa, i: number): string {
  const paleta = defTipo(tipo).paleta ?? PALETA_RAMAS
  return paleta[i % paleta.length]
}

/** Los que se dibujan como rejilla 2×2 (mismo sitio, distinto rótulo). */
export const esCuadrantes = (tipo: TipoMapa): boolean => tipo === 'foda' || tipo === 'eisenhower'

/** Regiones de un formato por zonas (vacío en los jerárquicos). */
export function zonasDe(tipo: TipoMapa, nRaices: number): string[] {
  return tipo === 'venn' ? zonasVenn(nRaices) : (ZONAS[tipo] ?? [])
}

/** Región de la raíz número `i` (cada raíz titula su columna, nivel o fila). */
export function zonaDeRaiz(tipo: TipoMapa, i: number): string {
  const zonas = ZONAS_RAIZ[tipo]
  return zonas ? (zonas[i] ?? zonas[0]) : String.fromCharCode(97 + i)
}

/**
 * Raíz que manda en una región: de ella toman nombre y color sus elementos.
 * -1 = región compartida (la intersección del Venn o la columna del medio).
 */
export function raizDeZona(tipo: TipoMapa, zona: string): number {
  const zonas = ZONAS_RAIZ[tipo]
  if (zonas) return zonas.indexOf(zona)
  return zona.length === 1 ? zona.charCodeAt(0) - 97 : -1
}

/**
 * Textos con los que nace un mapa en blanco: una raíz por región en los
 * formatos por zonas, y el tema tal cual en los demás.
 */
export function etiquetasRaiz(tipo: TipoMapa, nombre: string): string[] {
  const tMapa = (clave: string, es: string) => tGlobal(`ideas.mapa.${clave}`, es)
  switch (tipo) {
    case 'comparacion':
      return [tMapa('temaA', 'Tema A'), tMapa('temaB', 'Tema B')]
    case 'venn':
      return [tMapa('conjuntoA', 'Conjunto A'), tMapa('conjuntoB', 'Conjunto B')]
    case 'proscontras':
      return [tMapa('ventajas', 'Ventajas'), tMapa('desventajas', 'Desventajas')]
    case 'fuerzas':
      return [tMapa('impulsan', 'Empujan'), tMapa('frenan', 'Frenan')]
    case 'foda':
      return [
        tMapa('fortalezas', 'Fortalezas'),
        tMapa('debilidades', 'Debilidades'),
        tMapa('oportunidades', 'Oportunidades'),
        tMapa('amenazas', 'Amenazas'),
      ]
    case 'eisenhower':
      return [tMapa('hacer', 'Hazlo ya'), tMapa('agendar', 'Agéndalo'), tMapa('delegar', 'Delégalo'), tMapa('quitar', 'Quítalo')]
    case 'piramide':
      return [tMapa('cima', 'Cima'), tMapa('nivel3', 'Nivel 3'), tMapa('nivel2', 'Nivel 2'), tMapa('base', 'Base')]
    case 'tier':
      return ['S', 'A', 'B', 'C', 'D']
    default:
      return [nombre]
  }
}
