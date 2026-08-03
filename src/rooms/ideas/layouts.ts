import type { FormaNodo, NodoMapa, TipoMapa } from '../../core/data/db'
import { R_ANILLO, R_HIJO } from './constantes'
import { esCuadrantes, raizDeZona, zonaDeRaiz } from './tiposMapa'

/**
 * Geometría pura de los mapas (sin React): dónde nace cada nodo nuevo, cómo se
 * coloca un mapa entero generado por IA y dónde vive cada región de los mapas
 * por zonas (Venn y comparación). Unidades del mundo = px a zoom 1.
 */

const RAD = Math.PI / 180
/** Ángulo áureo: reparte hijos alrededor sin encimarse aunque no se sepa cuántos serán. */
const AUREO = 137.5 * RAD
/** Desvíos alternados respecto a la dirección abuelo→padre (mapa mental). */
const DESVIOS = [0, 35, -35, 70, -70, 105, -105]

// Separaciones de los layouts por niveles (árbol, llaves, flujo): la distancia
// justa para que los nodos no se encimen, sin dejar de más entre ellos.
const ARBOL_NIVEL = 115
const ARBOL_HOJA = 150
const LLAVES_NIVEL = 220
const LLAVES_HOJA = 70
const FLUJO_NIVEL = 130
const FLUJO_HOJA = 120

/** Alto de cada elemento apilado dentro de una región (Venn y comparación). */
const PASO_ZONA = 48

// Espina de pescado (Ishikawa): la cabeza —el problema— vive en el origen y la
// columna corre hacia la izquierda; las espinas salen inclinadas hacia ella.
const ISHI_BASE = 280
const ISHI_PASO = 250
const ISHI_ALTO = 180
/** Cuánto se recuesta la espina hacia la cabeza (el sesgo del diagrama). */
const ISHI_SESGO = 115
/** Paso de cada causa a lo largo de su espina, alejándose de la columna. */
const ISHI_CAUSA = 95

export function hijosDe(nodos: NodoMapa[], padreId: string | null): NodoMapa[] {
  return nodos.filter((n) => n.padreId === padreId)
}

export const raicesDe = (nodos: NodoMapa[]): NodoMapa[] => hijosDe(nodos, null)

/** nodoId del nodo y de toda su descendencia (para arrastrar y borrar subárboles). */
export function conDescendencia(nodos: NodoMapa[], nodoId: string): Set<string> {
  const porPadre = new Map<string, string[]>()
  for (const n of nodos) {
    if (!n.padreId) continue
    const lista = porPadre.get(n.padreId)
    if (lista) lista.push(n.nodoId)
    else porPadre.set(n.padreId, [n.nodoId])
  }
  const res = new Set<string>()
  const cola = [nodoId]
  while (cola.length > 0) {
    const id = cola.pop()!
    if (res.has(id)) continue
    res.add(id)
    for (const h of porPadre.get(id) ?? []) cola.push(h)
  }
  return res
}

// ---------------------------------------------------------------------------
// Formatos por zonas: Venn, columnas, cuadrantes, pirámide y tier list
// ---------------------------------------------------------------------------

/** Rejilla 2×2 (FODA y Eisenhower): las dos primeras regiones van arriba. */
const CUADRANTE_X = 220
const CUADRANTE_Y = [-330, 110]

// Pirámide: cuatro bandas entre la cima y la base, la de abajo la más ancha.
const PIR_CIMA = -330
const PIR_ALTO = 170
const PIR_SEMIBASE = 400

// Tier list: una fila por nivel y una bandeja debajo para lo aún sin clasificar.
const FILA_TIER = 140
const TIER_Y0 = -280
/** Dónde nace el primer elemento de una fila (los demás siguen a su derecha). */
const TIER_X0 = -340
const PASO_TIER = 165

/** Radio y centro de cada círculo del Venn (2 o 3 conjuntos). */
export function circulosVenn(n: number): { x: number; y: number; r: number }[] {
  if (n >= 3) {
    return [
      { x: -150, y: 85, r: 265 },
      { x: 150, y: 85, r: 265 },
      { x: 0, y: -155, r: 265 },
    ]
  }
  return [
    { x: -145, y: 0, r: 275 },
    { x: 145, y: 0, r: 275 },
  ]
}

/** Banda de la pirámide número `i` (0 = la cima): su alto y sus dos anchos. */
export function bandaPiramide(i: number): { y: number; h: number; wSup: number; wInf: number } {
  const y = PIR_CIMA + i * PIR_ALTO
  const semi = (yy: number) => (PIR_SEMIBASE * (yy - PIR_CIMA)) / (PIR_ALTO * 4)
  return { y, h: PIR_ALTO, wSup: semi(y), wInf: semi(y + PIR_ALTO) }
}

/** Los cuatro vértices de una banda, listos para un `<polygon>`. */
export function poligonoPiramide(i: number): string {
  const b = bandaPiramide(i)
  const abajo = b.y + b.h
  return `${-b.wSup},${b.y} ${b.wSup},${b.y} ${b.wInf},${abajo} ${-b.wInf},${abajo}`
}

/** Centro de una región: dónde nace el primer elemento que caiga en ella. */
export function centroZona(tipo: TipoMapa, zona: string, nRaices: number): { x: number; y: number } {
  if (tipo === 'comparacion' || tipo === 'proscontras' || tipo === 'fuerzas') {
    // Sin columna del medio las dos se juntan hacia el centro.
    const ancho = tipo === 'comparacion' ? 390 : 250
    const x = zona === 'izq' ? -ancho : zona === 'der' ? ancho : 0
    return { x, y: -60 }
  }
  if (esCuadrantes(tipo)) {
    const i = Math.max(0, raizDeZona(tipo, zona))
    return { x: i % 2 === 0 ? -CUADRANTE_X : CUADRANTE_X, y: CUADRANTE_Y[i < 2 ? 0 : 1] }
  }
  if (tipo === 'piramide') {
    return { x: 0, y: bandaPiramide(Math.max(0, raizDeZona(tipo, zona))).y + 100 }
  }
  if (tipo === 'tier') {
    // La bandeja (sin raíz, `raizDeZona` = -1) cuelga debajo de la última fila.
    const i = raizDeZona(tipo, zona)
    return { x: TIER_X0, y: TIER_Y0 + (i < 0 ? 5 : i) * FILA_TIER }
  }
  const tres = nRaices >= 3
  const mapa: Record<string, { x: number; y: number }> = tres
    ? {
        a: { x: -270, y: 175 },
        b: { x: 270, y: 175 },
        c: { x: 0, y: -290 },
        ab: { x: 0, y: 215 },
        ac: { x: -180, y: -40 },
        bc: { x: 180, y: -40 },
        abc: { x: 0, y: 55 },
      }
    : {
        a: { x: -270, y: 0 },
        b: { x: 270, y: 0 },
        ab: { x: 0, y: 0 },
      }
  return mapa[zona] ?? { x: 0, y: 0 }
}

/**
 * Sitio del elemento número `i` dentro de su región. Todas las regiones apilan
 * hacia abajo menos las filas de la tier list, que crecen hacia la derecha.
 */
const sitioEnZona = (tipo: TipoMapa, centro: { x: number; y: number }, i: number) =>
  tipo === 'tier'
    ? { x: centro.x + i * PASO_TIER, y: centro.y }
    : { x: centro.x, y: centro.y + i * PASO_ZONA }

/** Posición del siguiente elemento de una región. */
export function posEnZona(
  nodos: NodoMapa[],
  tipo: TipoMapa,
  zona: string,
  nRaices: number,
): { x: number; y: number } {
  const enZona = nodos.filter((n) => n.padreId != null && n.zona === zona).length
  return sitioEnZona(tipo, centroZona(tipo, zona, nRaices), enZona)
}

/** Recoloca todos los elementos de una región (tras borrar uno, para que no queden huecos). */
export function reapilarZona(
  nodos: NodoMapa[],
  tipo: TipoMapa,
  zona: string,
  nRaices: number,
): { nodoId: string; x: number; y: number }[] {
  const centro = centroZona(tipo, zona, nRaices)
  return nodos
    .filter((n) => n.padreId != null && n.zona === zona)
    .map((n, i) => ({ nodoId: n.nodoId, ...sitioEnZona(tipo, centro, i) }))
}

/** Posición de una raíz (conjunto, columna, cuadrante, nivel o fila). */
export function posRaizZonas(tipo: TipoMapa, indice: number, nRaices: number): { x: number; y: number } {
  if (tipo === 'comparacion') return { x: indice === 0 ? -390 : 390, y: -105 }
  if (tipo === 'proscontras' || tipo === 'fuerzas') return { x: indice === 0 ? -250 : 250, y: -105 }
  const c = centroZona(tipo, zonaDeRaiz(tipo, indice), nRaices)
  // La etiqueta de la fila va a la izquierda de sus elementos; las demás,
  // encabezando su región justo encima del primero.
  if (tipo === 'tier') return { x: c.x - 160, y: c.y }
  if (esCuadrantes(tipo) || tipo === 'piramide') return { x: c.x, y: c.y - 55 }
  const v = circulosVenn(nRaices)[indice] ?? { x: 0, y: 0, r: 265 }
  // La etiqueta del conjunto vive en el borde de arriba de su círculo.
  return { x: v.x, y: v.y - v.r - 34 }
}

/**
 * Recuadro de fondo de cada región, medido desde su centro. Solo los formatos
 * rectangulares: el Venn dibuja círculos y la pirámide, trapecios.
 */
const CAJA: Partial<Record<TipoMapa, { w: number; h: number; dx: number; dy: number }>> = {
  comparacion: { w: 380, h: 520, dx: -190, dy: -150 },
  proscontras: { w: 380, h: 520, dx: -190, dy: -150 },
  fuerzas: { w: 380, h: 520, dx: -190, dy: -150 },
  foda: { w: 380, h: 400, dx: -190, dy: -70 },
  eisenhower: { w: 380, h: 400, dx: -190, dy: -70 },
  tier: { w: 1200, h: 112, dx: -220, dy: -56 },
}

export function cajasZonas(
  tipo: TipoMapa,
  zonas: string[],
  nRaices: number,
): { zona: string; x: number; y: number; w: number; h: number }[] {
  const caja = CAJA[tipo]
  if (!caja) return []
  return zonas.map((zona) => {
    const c = centroZona(tipo, zona, nRaices)
    return { zona, x: c.x + caja.dx, y: c.y + caja.dy, w: caja.w, h: caja.h }
  })
}

// ---------------------------------------------------------------------------
// Ishikawa: espina de pescado
// ---------------------------------------------------------------------------

/** Punto de la columna del que arranca la espina de una categoría. */
export const baseEspina = (categoria: { x: number }): { x: number; y: number } => ({
  x: categoria.x + ISHI_SESGO,
  y: 0,
})

/** Posición de la categoría número `i`: alternan arriba y abajo de la columna. */
function posEspina(i: number): { x: number; y: number } {
  return {
    x: -(ISHI_BASE + Math.floor(i / 2) * ISHI_PASO),
    y: i % 2 === 0 ? -ISHI_ALTO : ISHI_ALTO,
  }
}

/** Causa número `k` de una categoría: sigue la espina alejándose de la columna. */
function posCausa(categoria: { x: number; y: number }, k: number): { x: number; y: number } {
  const largo = Math.hypot(ISHI_SESGO, ISHI_ALTO)
  const paso = ISHI_CAUSA * (k + 1)
  return {
    x: categoria.x - (ISHI_SESGO / largo) * paso,
    y: categoria.y + (Math.sign(categoria.y) * ISHI_ALTO * paso) / largo,
  }
}

// ---------------------------------------------------------------------------
// Línea del tiempo: el tema abre la recta y los hitos se van alternando
// ---------------------------------------------------------------------------

const LINEA_INICIO = 230
const LINEA_PASO = 210
const LINEA_ALTO = 95
/** Separación de los detalles que cuelgan de un hito. */
const LINEA_DETALLE = 58

/** Hito número `i`: hacia la derecha, alternando arriba y abajo de la recta. */
function posHito(i: number): { x: number; y: number } {
  return { x: LINEA_INICIO + i * LINEA_PASO, y: i % 2 === 0 ? -LINEA_ALTO : LINEA_ALTO }
}

/**
 * Etapa `i` de las `total` de un ciclo: repartidas por igual empezando arriba.
 * Mismo radio que el anillo del mapa circular, del que toma la geometría.
 */
export function posEtapa(i: number, total: number): { x: number; y: number } {
  const angulo = (i / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2
  const radio = R_ANILLO + 130
  return { x: Math.cos(angulo) * radio, y: Math.sin(angulo) * radio }
}

/** Reparte otra vez las etapas al entrar una nueva (si no, el círculo se abolla). */
export const reapilarCiclo = (etapas: NodoMapa[], total: number) =>
  etapas.map((e, i) => ({ nodoId: e.nodoId, ...posEtapa(i, total) }))

/** Detalle número `k` de un hito: se aleja de la recta en la misma dirección. */
const posDetalle = (hito: { x: number; y: number }, k: number) => ({
  x: hito.x,
  y: hito.y + Math.sign(hito.y || 1) * LINEA_DETALLE * (k + 1),
})

/**
 * Formato del que un tipo toma prestada la geometría: el ciclo se coloca como
 * el círculo y el árbol de decisiones como las llaves. Lo único suyo son las
 * uniones, y de eso se encarga el lienzo.
 */
const geometriaDe = (tipo: TipoMapa): TipoMapa =>
  tipo === 'ciclo' ? 'circulo' : tipo === 'decision' ? 'llaves' : tipo

// ---------------------------------------------------------------------------
// Nodos nuevos creados a mano
// ---------------------------------------------------------------------------

/**
 * Posición para un hijo nuevo de `padre` según el formato: los jerárquicos
 * crecen en su dirección natural y esquivan lo ya puesto alargando el paso.
 */
export function colocarHijo(tipo: TipoMapa, nodos: NodoMapa[], padre: NodoMapa): { x: number; y: number } {
  const hermanos = hijosDe(nodos, padre.nodoId).length
  const libre = (x: number, y: number) => !nodos.some((n) => Math.hypot(n.x - x, n.y - y) < 90)

  if (tipo === 'ishikawa') {
    // De la cabeza cuelgan las categorías (espinas); de una espina, sus causas.
    return padre.padreId == null ? posEspina(hermanos) : posCausa(padre, hermanos)
  }

  if (tipo === 'linea') {
    // Del tema cuelgan los hitos; de un hito, sus detalles.
    return padre.padreId == null ? posHito(hermanos) : posDetalle(padre, hermanos)
  }

  // Las etapas del ciclo se reparten por igual: la nueva entra en su sitio y el
  // lienzo recoloca a las demás (`reapilarCiclo`).
  if (tipo === 'ciclo' && padre.padreId == null) return posEtapa(hermanos, hermanos + 1)

  const geo = geometriaDe(tipo)

  if (geo === 'arbol' || geo === 'llaves' || geo === 'flujo') {
    // Árbol y flujo crecen hacia abajo (organigrama); llaves, a la derecha.
    const vertical = geo === 'arbol' || geo === 'flujo'
    const paso = geo === 'arbol' ? ARBOL_NIVEL : geo === 'llaves' ? LLAVES_NIVEL : FLUJO_NIVEL
    const sep = geo === 'arbol' ? ARBOL_HOJA : geo === 'llaves' ? LLAVES_HOJA : FLUJO_HOJA
    // Los hermanos se reparten a ambos lados del padre, alternando y alejándose.
    const desvio = Math.ceil(hermanos / 2) * sep * (hermanos % 2 === 1 ? 1 : -1)
    for (let intento = 0; intento < 6; intento++) {
      const avance = paso + intento * 60
      const x = vertical ? padre.x + desvio : padre.x + avance
      const y = vertical ? padre.y + avance : padre.y + desvio
      if (libre(x, y) || intento === 5) return { x, y }
    }
  }

  // Mental y círculo: radial alrededor del padre.
  let angulo: number
  if (padre.padreId == null) {
    angulo = hermanos * AUREO
  } else {
    const abuelo = nodos.find((n) => n.nodoId === padre.padreId)
    angulo = abuelo ? Math.atan2(padre.y - abuelo.y, padre.x - abuelo.x) : hermanos * AUREO
    angulo += DESVIOS[hermanos % DESVIOS.length] * RAD
  }
  let radio = geo === 'circulo' && padre.padreId == null ? R_ANILLO + 70 : R_HIJO
  for (let intento = 0; intento < 5; intento++) {
    const x = padre.x + Math.cos(angulo) * radio
    const y = padre.y + Math.sin(angulo) * radio
    if (libre(x, y)) return { x, y }
    radio += 40
  }
  return { x: padre.x + Math.cos(angulo) * radio, y: padre.y + Math.sin(angulo) * radio }
}

// ---------------------------------------------------------------------------
// Mapas completos generados por IA
// ---------------------------------------------------------------------------

/** Rama propuesta: árbol anidado aún sin posiciones. */
export interface NodoPropuesto {
  texto: string
  hijos: NodoPropuesto[]
  /** Solo en el diagrama de flujo. */
  forma?: FormaNodo
}

/** Nodo ya colocado; `padre` es el índice en el arreglo (-1 = sin padre). */
export interface NodoColocado {
  texto: string
  padre: number
  x: number
  y: number
  profundidad: number
  forma?: FormaNodo
}

const cuentaHojas = (n: NodoPropuesto): number =>
  n.hijos.length === 0 ? 1 : n.hijos.reduce((s, h) => s + cuentaHojas(h), 0)

/**
 * Recorre el árbol propuesto en DFS asignando a cada nodo una posición de hoja
 * (las hojas son contiguas, así que un nodo interno es el promedio de las suyas)
 * y deja que `sitio` traduzca (profundidad, posición) a coordenadas del mundo.
 */
function recorrer(
  raiz: string,
  ramas: NodoPropuesto[],
  sitio: (profundidad: number, pos: number, totalHojas: number) => { x: number; y: number },
): NodoColocado[] {
  const totalHojas = ramas.reduce((s, r) => s + cuentaHojas(r), 0) || 1
  const res: NodoColocado[] = [{ texto: raiz, padre: -1, x: 0, y: 0, profundidad: 0 }]
  let hoja = 0

  const colocar = (n: NodoPropuesto, padreIdx: number, profundidad: number): number => {
    const idx = res.length
    res.push({ texto: n.texto, padre: padreIdx, x: 0, y: 0, profundidad, forma: n.forma })
    let pos: number
    if (n.hijos.length === 0) {
      pos = hoja
      hoja += 1
    } else {
      const posiciones = n.hijos.map((h) => colocar(h, idx, profundidad + 1))
      pos = posiciones.reduce((s, p) => s + p, 0) / posiciones.length
    }
    const p = sitio(profundidad, pos, totalHojas)
    res[idx].x = p.x
    res[idx].y = p.y
    return pos
  }

  for (const rama of ramas) colocar(rama, 0, 1)
  const p0 = sitio(0, (totalHojas - 1) / 2, totalHojas)
  res[0].x = p0.x
  res[0].y = p0.y
  return res
}

/**
 * Layout de dos niveles colocados POR ÍNDICE en vez de por posición de hoja: la
 * raíz en el origen, cada rama donde le toque por su número y sus hijos
 * siguiéndola. Lo usan la espina de pescado y la línea del tiempo, donde lo que
 * manda es el ORDEN (de qué lado cae, qué tan a la derecha), no cuántas hojas hay.
 */
function porIndice(
  raiz: string,
  ramas: NodoPropuesto[],
  sitioRama: (i: number) => { x: number; y: number },
  sitioHijo: (rama: { x: number; y: number }, k: number) => { x: number; y: number },
): NodoColocado[] {
  const res: NodoColocado[] = [{ texto: raiz, padre: -1, x: 0, y: 0, profundidad: 0 }]
  ramas.forEach((rama, i) => {
    const p = sitioRama(i)
    const idx = res.length
    res.push({ texto: rama.texto, padre: 0, x: p.x, y: p.y, profundidad: 1 })
    rama.hijos.forEach((hijo, k) => {
      const q = sitioHijo(p, k)
      res.push({ texto: hijo.texto, padre: idx, x: q.x, y: q.y, profundidad: 2 })
    })
  })
  return res
}

/** Coloca un mapa entero recién propuesto, según su formato. */
export function layoutMapa(tipo: TipoMapa, raiz: string, ramas: NodoPropuesto[]): NodoColocado[] {
  if (tipo === 'ishikawa') return porIndice(raiz, ramas, posEspina, posCausa)
  if (tipo === 'linea') return porIndice(raiz, ramas, posHito, posDetalle)

  const geo = geometriaDe(tipo)
  if (geo === 'arbol') {
    return recorrer(raiz, ramas, (prof, pos, total) => ({
      x: (pos - (total - 1) / 2) * ARBOL_HOJA,
      y: prof * ARBOL_NIVEL,
    }))
  }
  if (geo === 'llaves') {
    return recorrer(raiz, ramas, (prof, pos, total) => ({
      x: prof * LLAVES_NIVEL,
      y: (pos - (total - 1) / 2) * LLAVES_HOJA,
    }))
  }
  if (geo === 'flujo') {
    return recorrer(raiz, ramas, (prof, pos, total) => ({
      x: (pos - (total - 1) / 2) * FLUJO_HOJA,
      y: prof * FLUJO_NIVEL,
    }))
  }
  if (geo === 'circulo') {
    // Anillos concéntricos: el nivel 1 rodea al centro y el 2 queda por fuera.
    return recorrer(raiz, ramas, (prof, pos, total) => {
      if (prof === 0) return { x: 0, y: 0 }
      const angulo = (pos / total) * 2 * Math.PI - Math.PI / 2
      const radio = R_ANILLO + prof * 130
      return { x: Math.cos(angulo) * radio, y: Math.sin(angulo) * radio }
    })
  }
  // Mental: radial clásico, la raíz en el centro.
  return recorrer(raiz, ramas, (prof, pos, total) => {
    if (prof === 0) return { x: 0, y: 0 }
    const angulo = (pos / total) * 2 * Math.PI
    const radio = prof * R_ANILLO
    return { x: Math.cos(angulo) * radio, y: Math.sin(angulo) * radio }
  })
}
