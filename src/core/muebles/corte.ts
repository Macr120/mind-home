import { orientaciones } from './despiece'
import { TABLERO_ESTANDAR } from './materiales'
import type { AvisoMueble, Despiece, MaterialTableroId, Mm, PiezaCorte } from './tipos'

/**
 * Optimizador del diagrama de cortes: acomoda las piezas del despiece en hojas
 * de tablero.
 *
 * El algoritmo es de BANDAS (estantes) con First-Fit Decreasing, multi-arranque
 * y una tercera etapa que reaprovecha los huecos ya cerrados. Se eligió frente a
 * maxrects —que empaqueta un 4-8 % mejor— porque una seccionadora solo hace
 * cortes de GUILLOTINA, de lado a lado: los patrones de maxrects encajan piezas
 * en L que nadie puede cortar, y un diagrama que no se puede cortar vale cero.
 *
 * Un despiece de muebles es además el caso favorable a las bandas: pocas
 * medidas distintas y muchas repeticiones, que al ordenar por alto caen solas en
 * la misma banda.
 */

/** Ancho de la ranura que se lleva el disco, en mm. */
export const KERF_DEFECTO: Mm = 3

/** Refile por lado: el canto de fábrica nunca viene recto. */
export const REFILE_DEFECTO: Mm = 10

/** Por debajo de esto un retazo es basura, no sobrante. */
export const MIN_SOBRANTE_MM: Mm = 100

/** Tope duro de piezas: por encima se recorta y se avisa. */
export const TOPE_PIEZAS_CORTE = 2000

export interface OpcionesCorte {
  kerfMm: Mm
  refileMm: Mm
  /** Hoja por material; sin entrada usa `TABLERO_ESTANDAR`. */
  hojaPorMaterial: Partial<Record<MaterialTableroId, { ancho: Mm; alto: Mm }>>
  /** Ordenaciones que se prueban (1–4). Con pocas piezas siempre salen 4. */
  intentos: number
}

export const OPCIONES_CORTE_DEFECTO: OpcionesCorte = {
  kerfMm: KERF_DEFECTO,
  refileMm: REFILE_DEFECTO,
  hojaPorMaterial: {},
  intentos: 4,
}

export interface PiezaColocada {
  piezaId: string
  /** 1..cantidad de la pieza de origen. */
  copia: number
  /** Lo que se escribe encima en el dibujo: 'A-3'. */
  etiqueta: string
  nombreEs: string
  clave: string
  /** Esquina superior izquierda EN LA HOJA CRUDA (el refile ya está sumado). */
  x: Mm
  y: Mm
  /** Ya orientados en la hoja. */
  ancho: Mm
  alto: Mm
  /** Girada 90° respecto a (ancho, alto) de la `PiezaCorte`. */
  rotada: boolean
  /** Cantos YA remapeados a la orientación en la hoja. */
  cantos: { arriba: boolean; abajo: boolean; izq: boolean; der: boolean }
  color: string
  /** Disco: se dibuja el círculo inscrito en su cuadrado. */
  forma?: 'circular'
}

export interface SobranteCorte {
  x: Mm
  y: Mm
  ancho: Mm
  alto: Mm
  utilizable: boolean
}

export interface HojaCorte {
  id: string
  materialId: MaterialTableroId
  grosor: Mm
  /** 1..N dentro de su grupo. */
  indice: number
  /** Hoja CRUDA. */
  ancho: Mm
  alto: Mm
  piezas: PiezaColocada[]
  sobrantes: SobranteCorte[]
  areaPiezasMm2: number
  aprovechamiento: number
  /** Metros lineales de sierra, para cotizar el servicio de corte. */
  cortesMl: number
}

export interface GrupoCorte {
  materialId: MaterialTableroId
  grosor: Mm
  hojas: HojaCorte[]
  m2Piezas: number
  m2Hojas: number
  desperdicioM2: number
  aprovechamiento: number
  cortesMl: number
}

export interface PlanCorte {
  grupos: GrupoCorte[]
  sinColocar: { piezaId: string; nombreEs: string; cantidad: number; motivo: 'no-cabe' | 'tope' }[]
  avisos: AvisoMueble[]
  opciones: OpcionesCorte
  /** Lo que tardó en optimizar, para decidir si bajar `intentos`. */
  ms: number
}

/** Una copia suelta de una pieza, que es lo que se acomoda de verdad. */
interface Unidad {
  piezaId: string
  copia: number
  etiqueta: string
  nombreEs: string
  clave: string
  ancho: Mm
  alto: Mm
  veta: PiezaCorte['veta']
  cantos: PiezaCorte['cantos']
  color: string
  forma?: PiezaCorte['forma']
}

interface Banda {
  y: Mm
  alto: Mm
  cursorX: Mm
}

interface Hueco {
  x: Mm
  y: Mm
  ancho: Mm
  alto: Mm
}

interface HojaInterna {
  piezas: PiezaColocada[]
  bandas: Banda[]
  huecos: Hueco[]
  cursorY: Mm
}

/**
 * Cantos remapeados al girar la pieza 90°: lo que era el borde de arriba pasa a
 * ser el de la izquierda. Sin esto el diagrama manda pegar la cinta en el lado
 * equivocado y la pieza se tira.
 */
function cantosEnHoja(c: PiezaCorte['cantos'], rotada: boolean): PiezaColocada['cantos'] {
  if (!rotada) return { ...c }
  return { arriba: c.der, abajo: c.izq, izq: c.arriba, der: c.abajo }
}

/** Letra por pieza distinta (A, B, … Z, AA): la leyenda va en la tabla de al lado. */
export function letra(i: number): string {
  let n = i
  let s = ''
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

const ORDENES: ((a: Unidad, b: Unidad) => number)[] = [
  (a, b) => b.alto - a.alto || b.ancho - a.ancho,
  (a, b) => b.ancho - a.ancho || b.alto - a.alto,
  (a, b) => b.ancho * b.alto - a.ancho * a.alto,
  (a, b) => Math.max(b.ancho, b.alto) - Math.max(a.ancho, a.alto),
]

/** Coloca una unidad en la primera hoja que la admita. Devuelve `false` si no cabe en ninguna. */
function intentarEn(hojas: HojaInterna[], u: Unidad, W0: Mm, H0: Mm, kerf: Mm): boolean {
  const opciones = orientaciones(u)
  for (const hoja of hojas) {
    // 1) Huecos ya cerrados, del más ajustado al más holgado (best fit).
    const huecos = [...hoja.huecos].sort((a, b) => a.ancho * a.alto - b.ancho * b.alto)
    for (const hueco of huecos) {
      for (const o of opciones) {
        if (o.w > hueco.ancho || o.h > hueco.alto) continue
        hoja.piezas.push(colocada(u, hueco.x, hueco.y, o))
        hoja.huecos = hoja.huecos.filter((h) => h !== hueco)
        // Corte de guillotina dentro del hueco: primero vertical, luego horizontal.
        const derecha = { x: hueco.x + o.w + kerf, y: hueco.y, ancho: hueco.ancho - o.w - kerf, alto: hueco.alto }
        const abajo = { x: hueco.x, y: hueco.y + o.h + kerf, ancho: o.w, alto: hueco.alto - o.h - kerf }
        if (derecha.ancho >= MIN_SOBRANTE_MM && derecha.alto >= MIN_SOBRANTE_MM) hoja.huecos.push(derecha)
        if (abajo.ancho >= MIN_SOBRANTE_MM && abajo.alto >= MIN_SOBRANTE_MM) hoja.huecos.push(abajo)
        return true
      }
    }
    // 2) Banda abierta con altura suficiente; se prefiere la que menos desperdicia.
    for (const banda of hoja.bandas) {
      const caben = opciones
        .filter((o) => o.h <= banda.alto && banda.cursorX + o.w <= W0)
        .sort((a, b) => banda.alto - a.h - (banda.alto - b.h))
      const o = caben[0]
      if (!o) continue
      hoja.piezas.push(colocada(u, banda.cursorX, banda.y, o))
      const sobra = banda.alto - o.h - kerf
      if (sobra >= MIN_SOBRANTE_MM && o.w >= MIN_SOBRANTE_MM) {
        hoja.huecos.push({ x: banda.cursorX, y: banda.y + o.h + kerf, ancho: o.w, alto: sobra })
      }
      // El kerf se cobra DESPUÉS de comprobar: una pieza que termina al ras del
      // borde no necesita corte, y sumarlo antes la perdería.
      banda.cursorX += o.w + kerf
      return true
    }
    // 3) Abrir banda nueva, con la orientación más alta que quepa.
    const paraBanda = opciones
      .filter((o) => hoja.cursorY + o.h <= H0 && o.w <= W0)
      .sort((a, b) => b.h - a.h)
    const o = paraBanda[0]
    if (o) {
      const banda: Banda = { y: hoja.cursorY, alto: o.h, cursorX: 0 }
      hoja.piezas.push(colocada(u, 0, banda.y, o))
      banda.cursorX = o.w + kerf
      hoja.bandas.push(banda)
      hoja.cursorY += o.h + kerf
      return true
    }
  }
  return false
}

function colocada(u: Unidad, x: Mm, y: Mm, o: { w: Mm; h: Mm; rotada: boolean }): PiezaColocada {
  return {
    piezaId: u.piezaId,
    copia: u.copia,
    etiqueta: u.etiqueta,
    nombreEs: u.nombreEs,
    clave: u.clave,
    x,
    y,
    ancho: o.w,
    alto: o.h,
    rotada: o.rotada,
    cantos: cantosEnHoja(u.cantos, o.rotada),
    color: u.color,
    ...(u.forma ? { forma: u.forma } : {}),
  }
}

function hojaVacia(): HojaInterna {
  return { piezas: [], bandas: [], huecos: [], cursorY: 0 }
}

/** Empaca una tanda ya ordenada. Devuelve las hojas y lo que no cupo en ninguna. */
function empacar(
  unidades: Unidad[],
  W0: Mm,
  H0: Mm,
  kerf: Mm,
): { hojas: HojaInterna[]; sinColocar: Unidad[] } {
  const hojas: HojaInterna[] = []
  const sinColocar: Unidad[] = []
  for (const u of unidades) {
    if (intentarEn(hojas, u, W0, H0, kerf)) continue
    const nueva = hojaVacia()
    hojas.push(nueva)
    if (!intentarEn([nueva], u, W0, H0, kerf)) {
      hojas.pop()
      sinColocar.push(u)
    }
  }
  return { hojas, sinColocar }
}

/** Sobrantes de una hoja cerrada: colas de banda, franja inferior y huecos vivos. */
function sobrantesDe(hoja: HojaInterna, W0: Mm, H0: Mm, refile: Mm): SobranteCorte[] {
  const fuera: SobranteCorte[] = []
  const anota = (x: Mm, y: Mm, ancho: Mm, alto: Mm) => {
    if (ancho <= 0 || alto <= 0) return
    fuera.push({
      x: x + refile,
      y: y + refile,
      ancho,
      alto,
      utilizable: ancho >= MIN_SOBRANTE_MM && alto >= MIN_SOBRANTE_MM,
    })
  }
  for (const b of hoja.bandas) anota(b.cursorX, b.y, W0 - b.cursorX, b.alto)
  anota(0, hoja.cursorY, W0, H0 - hoja.cursorY)
  for (const h of hoja.huecos) anota(h.x, h.y, h.ancho, h.alto)
  return fuera
}

/** Metros de sierra de una hoja: un corte por banda a lo ancho, más los verticales. */
function cortesMlDe(hoja: HojaInterna, W0: Mm): number {
  let mm = hoja.bandas.length * W0
  for (const b of hoja.bandas) {
    const enBanda = hoja.piezas.filter((p) => p.y === b.y).length
    mm += Math.max(0, enBanda) * b.alto
  }
  return mm / 1000
}

/**
 * Punto de entrada. Nunca lanza: lo que no cabe sale en `sinColocar` y en
 * `avisos`, para que la UI pueda pintar el resto del diagrama igualmente.
 */
export function planificarCorte(despiece: Despiece, parciales?: Partial<OpcionesCorte>): PlanCorte {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const op: OpcionesCorte = { ...OPCIONES_CORTE_DEFECTO, ...parciales }
  const kerf = Math.max(0, op.kerfMm)
  const refile = Math.max(0, op.refileMm)
  const avisos: AvisoMueble[] = []
  const sinColocar: PlanCorte['sinColocar'] = []

  // Una letra por pieza distinta, en el orden en que vienen del despiece.
  const etiquetas = new Map(despiece.tableros.map((p, i) => [p.id, letra(i)]))

  const claveGrupo = (p: PiezaCorte) => `${p.materialId}|${p.grosor}`
  const grupos: GrupoCorte[] = []
  const porGrupo = new Map<string, PiezaCorte[]>()
  for (const p of despiece.tableros) {
    const k = claveGrupo(p)
    const lista = porGrupo.get(k)
    if (lista) lista.push(p)
    else porGrupo.set(k, [p])
  }

  for (const [k, piezas] of porGrupo) {
    const [materialId, grosorTxt] = k.split('|')
    const grosor = Number(grosorTxt)
    const hoja = op.hojaPorMaterial[materialId as MaterialTableroId] ?? TABLERO_ESTANDAR
    const W0 = hoja.ancho - 2 * refile
    const H0 = hoja.alto - 2 * refile

    let unidades: Unidad[] = []
    for (const p of piezas) {
      for (let i = 1; i <= p.cantidad; i++) {
        unidades.push({
          piezaId: p.id,
          copia: i,
          etiqueta: `${etiquetas.get(p.id) ?? '?'}-${i}`,
          nombreEs: p.nombreEs,
          clave: p.clave,
          ancho: p.ancho,
          alto: p.alto,
          veta: p.veta,
          cantos: p.cantos,
          color: p.color,
          forma: p.forma,
        })
      }
    }
    let intentos = Math.max(1, Math.min(ORDENES.length, op.intentos))
    if (unidades.length > TOPE_PIEZAS_CORTE) {
      const sobran = unidades.length - TOPE_PIEZAS_CORTE
      unidades = unidades.slice(0, TOPE_PIEZAS_CORTE)
      intentos = 1
      sinColocar.push({ piezaId: '', nombreEs: '', cantidad: sobran, motivo: 'tope' })
      avisos.push({
        nivel: 'aviso',
        clave: 'muebles.corte.tope',
        textoEs: 'Demasiadas piezas: se optimizó solo una parte.',
      })
    }

    let mejor: { hojas: HojaInterna[]; sinColocar: Unidad[] } | null = null
    let mejorAprov = -1
    for (let i = 0; i < intentos; i++) {
      const tanda = [...unidades].sort(ORDENES[i])
      const r = empacar(tanda, W0, H0, kerf)
      const area = r.hojas.reduce(
        (a, h) => a + h.piezas.reduce((s, p) => s + p.ancho * p.alto, 0),
        0,
      )
      const aprov = r.hojas.length ? area / (r.hojas.length * hoja.ancho * hoja.alto) : 0
      const mejora =
        !mejor ||
        r.hojas.length < mejor.hojas.length ||
        (r.hojas.length === mejor.hojas.length && aprov > mejorAprov)
      if (mejora) {
        mejor = r
        mejorAprov = aprov
      }
    }
    if (!mejor) continue

    for (const u of mejor.sinColocar) {
      const previo = sinColocar.find((s) => s.piezaId === u.piezaId && s.motivo === 'no-cabe')
      if (previo) previo.cantidad += 1
      else sinColocar.push({ piezaId: u.piezaId, nombreEs: u.nombreEs, cantidad: 1, motivo: 'no-cabe' })
    }

    const hojasFinales: HojaCorte[] = mejor.hojas.map((h, i) => {
      const areaPiezasMm2 = h.piezas.reduce((s, p) => s + p.ancho * p.alto, 0)
      return {
        id: `${materialId}-${grosor}-${i + 1}`,
        materialId: materialId as MaterialTableroId,
        grosor,
        indice: i + 1,
        ancho: hoja.ancho,
        alto: hoja.alto,
        // El empaque trabaja en el rect útil; el dibujo es de la hoja cruda.
        piezas: h.piezas.map((p) => ({ ...p, x: p.x + refile, y: p.y + refile })),
        sobrantes: sobrantesDe(h, W0, H0, refile),
        areaPiezasMm2,
        aprovechamiento: areaPiezasMm2 / (hoja.ancho * hoja.alto),
        cortesMl: cortesMlDe(h, W0),
      }
    })

    // Un grupo cuyas piezas no caben en la hoja no llega a tener ninguna: se
    // cuenta el error en `sinColocar` y no se lista un grupo vacío.
    if (!hojasFinales.length) continue

    const m2Piezas = hojasFinales.reduce((a, h) => a + h.areaPiezasMm2, 0) / 1e6
    const m2Hojas = (hojasFinales.length * hoja.ancho * hoja.alto) / 1e6
    grupos.push({
      materialId: materialId as MaterialTableroId,
      grosor,
      hojas: hojasFinales,
      m2Piezas,
      m2Hojas,
      desperdicioM2: m2Hojas - m2Piezas,
      aprovechamiento: m2Hojas > 0 ? m2Piezas / m2Hojas : 0,
      cortesMl: hojasFinales.reduce((a, h) => a + h.cortesMl, 0),
    })
  }

  for (const s of sinColocar) {
    if (s.motivo !== 'no-cabe') continue
    avisos.push({
      nivel: 'error',
      clave: 'muebles.corte.noCabe',
      textoEs: '«{pieza}» no cabe en la hoja: revisa la medida o usa un tablero más grande.',
      vars: { pieza: s.nombreEs },
      ref: s.piezaId,
    })
  }

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  return { grupos, sinColocar, avisos, opciones: op, ms: Math.round(t1 - t0) }
}
