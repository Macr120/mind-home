import type { AjustesCotizacion, MaterialTaller } from '../data/db'
import type { PlanCorte } from './corte'
import { getTubo } from './materiales'
import type { AvisoMueble, Despiece, Mm } from './tipos'

/**
 * Cotizador del taller: convierte el despiece (y el plan de corte, si lo hay) en
 * un presupuesto con los precios que el usuario tiene en su catálogo.
 *
 * La decisión de fondo es cómo se cobra el tablero. Por defecto se cobran HOJAS
 * COMPLETAS, porque es lo que el carpintero compra de verdad: el 20 % que se
 * desperdicia lo paga él, no el proveedor. Cobrar solo el m² usado subvalúa cada
 * trabajo justo en la fracción de desperdicio (12-30 %), y es la forma más común
 * en que una herramienta de presupuesto hace perder dinero. Como el diagrama de
 * cortes ya calculó cuántas hojas hacen falta, el precio y el dibujo salen del
 * mismo número — que es la razón de optimizar antes de cotizar.
 *
 * Cambiar de moneda NO convierte importes: no hay tipo de cambio aquí.
 */

export type GrupoRenglon =
  | 'tablero'
  | 'canto'
  | 'tubo'
  | 'herraje'
  | 'servicio'
  | 'manoObra'
  | 'extra'
  | 'descuento'

export interface RenglonPresupuesto {
  id: string
  grupo: GrupoRenglon
  /** `MaterialTaller.clave` de la que salió el precio. */
  clave?: string
  concepto: string
  detalle?: string
  cantidad: number
  unidad: string
  unitario: number
  /** Ya redondeado a los decimales de la moneda: los totales suman renglones. */
  subtotal: number
  gravable: boolean
}

export interface Presupuesto {
  renglones: RenglonPresupuesto[]
  subtotalMateriales: number
  subtotalManoObra: number
  descuento: number
  baseGravable: number
  impuesto: number
  total: number
  moneda: string
  decimales: number
  avisos: AvisoMueble[]
  /** Hay errores en el despiece: el total no es de fiar hasta resolverlos. */
  conErrores: boolean
}

const m2DeHoja = (m: MaterialTaller): number =>
  ((m.hojaAncho ?? 2440) * (m.hojaAlto ?? 1220)) / 1e6

/** Redondeo a los decimales de la moneda. Se aplica UNA vez, por renglón. */
const red = (n: number, dec: number): number => {
  const f = 10 ** dec
  return Math.round(n * f) / f
}

/** El material activo que mejor empata, o `null` si el usuario no lo tiene dado de alta. */
function buscar(
  catalogo: MaterialTaller[],
  tipo: MaterialTaller['tipo'],
  puntua: (m: MaterialTaller) => number,
): MaterialTaller | null {
  let mejor: MaterialTaller | null = null
  let mejorPunto = 0
  for (const m of catalogo) {
    if (m.tipo !== tipo || !m.activo) continue
    const p = puntua(m)
    if (p > mejorPunto) {
      mejor = m
      mejorPunto = p
    }
  }
  return mejor
}

export function cotizar(
  despiece: Despiece,
  plan: PlanCorte | null,
  catalogo: MaterialTaller[],
  aj: AjustesCotizacion,
): Presupuesto {
  const dec = Math.max(0, Math.min(4, aj.decimales ?? 2))
  const renglones: RenglonPresupuesto[] = []
  const avisos: AvisoMueble[] = []
  const faltantes: string[] = []

  const empuja = (r: Omit<RenglonPresupuesto, 'subtotal'> & { subtotal?: number }) => {
    if (r.cantidad <= 0) return
    renglones.push({ ...r, subtotal: red(r.cantidad * r.unitario, dec) } as RenglonPresupuesto)
  }

  // ---- Tablero ----------------------------------------------------------
  // Con plan de corte se cobra lo que de verdad hay que comprar; sin él (el
  // despiece no se pudo optimizar) se cae a m² con merma, y se avisa.
  const sinPlan = !plan || plan.grupos.length === 0
  const modo = sinPlan && aj.modoTablero === 'hoja' ? 'm2-con-merma' : aj.modoTablero
  if (sinPlan && aj.modoTablero === 'hoja') {
    avisos.push({
      nivel: 'aviso',
      clave: 'muebles.cot.sinPlan',
      textoEs: 'Sin diagrama de cortes no se sabe cuántas hojas comprar: se cobra por metro cuadrado más merma.',
    })
  }

  const grupos = sinPlan
    ? despiece.areaM2.map((a) => ({
        materialId: a.materialId,
        grosor: a.grosor,
        m2Piezas: a.m2,
        hojas: 0,
        aprovechamiento: 0,
      }))
    : plan!.grupos.map((g) => ({
        materialId: g.materialId,
        grosor: g.grosor,
        m2Piezas: g.m2Piezas,
        hojas: g.hojas.length,
        aprovechamiento: g.aprovechamiento,
      }))

  for (const g of grupos) {
    const mat = buscar(catalogo, 'tablero', (m) => {
      if (m.materialId !== g.materialId) return 0
      if (m.grosor === g.grosor) return 3
      // Sin el grosor exacto sirve el mismo material: el precio por m² de una
      // melamina de 16 y una de 18 se parece más que el de dos materiales.
      return m.grosor ? 1 : 2
    })
    if (!mat) {
      faltantes.push(g.materialId)
      continue
    }
    const areaHoja = m2DeHoja(mat)
    const precioHoja = mat.unidad === 'hoja' ? mat.precio : mat.precio * areaHoja
    const precioM2 = mat.unidad === 'hoja' ? mat.precio / areaHoja : mat.precio
    // Si la fila del catálogo no es del grosor exacto se dice en el detalle,
    // no pegado al nombre («Melamina 16 mm 3 mm» no es un concepto).
    const otroGrosor = mat.grosor !== g.grosor && g.grosor ? `para ${g.grosor} mm` : ''

    if (modo === 'hoja') {
      empuja({
        id: `tablero.${g.materialId}.${g.grosor}`,
        grupo: 'tablero',
        clave: mat.clave,
        concepto: mat.nombre,
        detalle: [
          `${mat.hojaAncho ?? 2440} × ${mat.hojaAlto ?? 1220} mm`,
          `${Math.round(g.aprovechamiento * 100)} %`,
          otroGrosor,
        ]
          .filter(Boolean)
          .join(' · '),
        cantidad: g.hojas,
        unidad: 'hoja',
        unitario: precioHoja,
        gravable: true,
      })
    } else {
      const merma = modo === 'm2-con-merma' ? 1 + Math.max(0, aj.mermaPct) / 100 : 1
      empuja({
        id: `tablero.${g.materialId}.${g.grosor}`,
        grupo: 'tablero',
        clave: mat.clave,
        concepto: mat.nombre,
        detalle: [modo === 'm2-con-merma' ? `+${Math.round(aj.mermaPct)} % de merma` : '', otroGrosor]
          .filter(Boolean)
          .join(' · '),
        cantidad: red(g.m2Piezas * merma, 2),
        unidad: 'm2',
        unitario: precioM2,
        gravable: true,
      })
    }
  }

  if (modo === 'm2' && plan && plan.grupos.length) {
    const desperdicio = plan.grupos.reduce((a, g) => a + g.desperdicioM2, 0)
    avisos.push({
      nivel: 'aviso',
      clave: 'muebles.cot.avisoM2',
      textoEs: 'Cobrando solo el material usado: el desperdicio ({m2} m²) va por tu cuenta.',
      vars: { m2: desperdicio.toFixed(2) },
    })
  }

  // ---- Canto ------------------------------------------------------------
  const factorCanto = 1 + Math.max(0, aj.desperdicioCantoPct) / 100
  for (const c of despiece.cantoMl) {
    const mat = buscar(catalogo, 'canto', (m) => (m.cintaMm === c.cintaMm ? 3 : 1))
    if (!mat) {
      faltantes.push('canto')
      continue
    }
    empuja({
      id: `canto.${c.materialId}.${c.cintaMm}`,
      grupo: 'canto',
      clave: mat.clave,
      concepto: mat.nombre,
      detalle: `+${Math.round(aj.desperdicioCantoPct)} %`,
      cantidad: red(c.ml * factorCanto, 2),
      unidad: 'ml',
      unitario: mat.precio,
      gravable: true,
    })
  }

  // ---- Tubo -------------------------------------------------------------
  // Al revés que el tablero, por defecto se cobra al metro: el tubo se vende
  // cortado en cualquier herrería y el retazo sí se reutiliza.
  const factorTubo = 1 + Math.max(0, aj.desperdicioTuboPct) / 100
  for (const t of despiece.tuboMl) {
    const secc = t.seccion[0]
    const mat = buscar(catalogo, 'tubo', (m) => {
      if (m.tuboId !== t.materialId) return 0
      const mismaSeccion = (m.seccion?.[0] ?? 0) === secc
      return mismaSeccion ? 3 : 1
    })
    if (!mat) {
      faltantes.push('tubo')
      continue
    }
    const nombreTubo = `${mat.nombre}`
    if (aj.modoTubo === 'tramo') {
      const largoTramo = (mat.largoComercial ?? getTubo(t.materialId).largoComercial) / 1000
      const tramos = Math.ceil((t.ml * factorTubo) / largoTramo)
      empuja({
        id: `tubo.${t.materialId}.${secc}`,
        grupo: 'tubo',
        clave: mat.clave,
        concepto: nombreTubo,
        detalle: `${largoTramo.toFixed(1)} m por tramo`,
        cantidad: tramos,
        unidad: 'tramo',
        unitario: mat.precio * largoTramo,
        gravable: true,
      })
    } else {
      empuja({
        id: `tubo.${t.materialId}.${secc}`,
        grupo: 'tubo',
        clave: mat.clave,
        concepto: nombreTubo,
        detalle: `+${Math.round(aj.desperdicioTuboPct)} %`,
        cantidad: red(t.ml * factorTubo, 2),
        unidad: 'ml',
        unitario: mat.precio,
        gravable: true,
      })
    }
  }

  // ---- Herrajes ---------------------------------------------------------
  for (const h of despiece.herrajes) {
    const mat = buscar(catalogo, 'herraje', (m) => (m.herrajeClave === h.id ? 3 : 0))
    if (!mat) {
      faltantes.push(h.nombreEs)
      continue
    }
    if (mat.unidad !== h.unidad) {
      // No se multiplica en silencio: 4 bisagras «por par» no son 4 piezas.
      avisos.push({
        nivel: 'aviso',
        clave: 'muebles.cot.unidadDistinta',
        textoEs: '«{material}» se cotiza por {catalogo} en tu catálogo y el mueble lo pide por {mueble}.',
        vars: { material: mat.nombre, catalogo: mat.unidad, mueble: h.unidad },
      })
    }
    empuja({
      id: `herraje.${h.id}`,
      grupo: 'herraje',
      clave: mat.clave,
      concepto: mat.nombre,
      cantidad: h.cantidad,
      unidad: mat.unidad,
      unitario: mat.precio,
      gravable: true,
    })
  }

  // ---- Servicios de taller ---------------------------------------------
  if (aj.cobrarCorte) {
    const cortesMl = plan?.grupos.reduce((a, g) => a + g.cortesMl, 0) ?? 0
    const matCorte = buscar(catalogo, 'servicio', (m) => (m.clave === 'srv-corte' ? 3 : 0))
    if (matCorte && cortesMl > 0) {
      empuja({
        id: 'servicio.corte',
        grupo: 'servicio',
        clave: matCorte.clave,
        concepto: matCorte.nombre,
        cantidad: red(cortesMl, 1),
        unidad: 'ml',
        unitario: matCorte.precio,
        gravable: true,
      })
    }
    const mlCanto = despiece.cantoMl.reduce((a, c) => a + c.ml, 0)
    const matCanto = buscar(catalogo, 'servicio', (m) => (m.clave === 'srv-canto' ? 3 : 0))
    if (matCanto && mlCanto > 0) {
      empuja({
        id: 'servicio.canto',
        grupo: 'servicio',
        clave: matCanto.clave,
        concepto: matCanto.nombre,
        cantidad: red(mlCanto, 1),
        unidad: 'ml',
        unitario: matCanto.precio,
        gravable: true,
      })
    }
  }

  const subtotalMateriales = renglones.reduce((a, r) => a + r.subtotal, 0)

  // ---- Mano de obra -----------------------------------------------------
  if (aj.manoObraActiva && aj.manoObraValor > 0) {
    const m2Totales = despiece.areaM2.reduce((a, x) => a + x.m2, 0)
    const piezas = despiece.tableros.reduce((a, t) => a + t.cantidad, 0)
    if (aj.manoObraModo === 'hora') {
      empuja({
        id: 'manoObra',
        grupo: 'manoObra',
        concepto: 'Mano de obra',
        detalle: `${aj.horasPorM2} h por m²`,
        cantidad: red(m2Totales * aj.horasPorM2, 1),
        unidad: 'hora',
        unitario: aj.manoObraValor,
        gravable: true,
      })
    } else if (aj.manoObraModo === 'pct') {
      empuja({
        id: 'manoObra',
        grupo: 'manoObra',
        concepto: 'Mano de obra',
        detalle: `${aj.manoObraValor} % de los materiales`,
        cantidad: 1,
        unidad: 'pz',
        unitario: red((subtotalMateriales * aj.manoObraValor) / 100, dec),
        gravable: true,
      })
    } else {
      empuja({
        id: 'manoObra',
        grupo: 'manoObra',
        concepto: 'Mano de obra',
        cantidad: piezas,
        unidad: 'pz',
        unitario: aj.manoObraValor,
        gravable: true,
      })
    }
  }

  for (const [i, extra] of (aj.extras ?? []).entries()) {
    empuja({
      id: `extra.${i}`,
      grupo: 'extra',
      concepto: extra.nombre,
      cantidad: 1,
      unidad: 'pz',
      unitario: extra.monto,
      gravable: true,
    })
  }

  const subtotalManoObra = renglones
    .filter((r) => r.grupo === 'manoObra')
    .reduce((a, r) => a + r.subtotal, 0)
  const bruto = renglones.reduce((a, r) => a + r.subtotal, 0)
  const descuento = red((bruto * Math.max(0, aj.descuentoPct)) / 100, dec)
  if (descuento > 0) {
    renglones.push({
      id: 'descuento',
      grupo: 'descuento',
      concepto: 'Descuento',
      detalle: `${aj.descuentoPct} %`,
      cantidad: 1,
      unidad: 'pz',
      unitario: -descuento,
      subtotal: -descuento,
      gravable: true,
    })
  }

  // ---- Impuesto ---------------------------------------------------------
  // Incluido: no se suma, se desglosa hacia atrás sobre lo ya cobrado.
  const neto = bruto - descuento
  const pct = Math.max(0, aj.impuestoPct)
  let baseGravable = neto
  let impuesto = 0
  let total = neto
  if (pct > 0) {
    if (aj.impuestoIncluido) {
      baseGravable = red(neto / (1 + pct / 100), dec)
      impuesto = red(neto - baseGravable, dec)
      total = neto
    } else {
      impuesto = red((neto * pct) / 100, dec)
      total = red(neto + impuesto, dec)
    }
  }

  if (faltantes.length) {
    const unicos = [...new Set(faltantes)]
    avisos.push({
      nivel: 'aviso',
      clave: 'muebles.cot.sinPrecio',
      textoEs: 'Sin precio en tu catálogo: {lista}. Esos renglones no se cobraron.',
      vars: { lista: unicos.join(', ') },
    })
  }

  return {
    renglones,
    subtotalMateriales: red(subtotalMateriales, dec),
    subtotalManoObra: red(subtotalManoObra, dec),
    descuento,
    baseGravable: red(baseGravable, dec),
    impuesto,
    total: red(total, dec),
    moneda: aj.moneda || 'MXN',
    decimales: dec,
    avisos: [...avisos, ...despiece.avisos.filter((a) => a.nivel === 'error')],
    conErrores: despiece.avisos.some((a) => a.nivel === 'error'),
  }
}

/** Firma barata del catálogo, para no recotizar con cada tecla. */
export function firmaCatalogo(catalogo: MaterialTaller[]): string {
  return catalogo.map((m) => `${m.clave}:${m.precio}:${m.unidad}:${m.activo ? 1 : 0}`).join('|')
}

/** Cuánto ocupa el mueble en metros cuadrados de tablero (para la ficha). */
export const m2Totales = (d: Despiece): number => d.areaM2.reduce((a, x) => a + x.m2, 0)

/** Metros lineales de tubo del mueble (para la ficha). */
export const mlTubo = (d: Despiece): Mm => d.tuboMl.reduce((a, x) => a + x.ml, 0)
