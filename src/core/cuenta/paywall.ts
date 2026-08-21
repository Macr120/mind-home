/**
 * La caja de la casa: qué se vende, dónde se cobra y cómo aterriza en la cuenta.
 *
 * Desde ago 2026 la casa y los créditos se compran DENTRO de la app en todas
 * las plataformas, pero por cajas distintas (`canalPago()` en `plataforma.ts`):
 * navegador y escritorio cobran directo con RevenueCat Web Billing —sin
 * comisión—, y las apps de Android e iOS por compra in-app, que es lo único
 * que admiten sus normativas.
 *
 * Este módulo es la FACHADA: elige la caja, traduce sus paquetes al catálogo
 * (`productos.ts`) y espera a que el webhook escriba `perfiles`, que es la
 * fuente de verdad. Comprar en una plataforma se ve en las demás porque las
 * dos cajas usan el MISMO `appUserId`: el user.id de Supabase.
 */
import type { Caja, OfertaCruda } from './caja'
import { cajaNativa } from './paywallNativo'
import { cajaWeb } from './paywallWeb'
import { CATALOGO, productoDe, type Clase, type Producto } from './productos'
import { esAppNativa } from '../plataforma'
import { useSesion } from './sesionStore'

/** La caja de esta plataforma. La nativa carga su SDK sola, y solo si se usa. */
function caja(): Caja {
  return esAppNativa() ? cajaNativa : cajaWeb
}

/** ¿El build trae pagos configurados? (clave de RevenueCat de esta plataforma) */
export function hayPagos(): boolean {
  return caja().disponible()
}

export interface OfertaPro {
  /** Identificador del paquete: sirve de key en la UI. */
  id: string
  /** El paquete original de la tienda; se devuelve tal cual a `comprar()`. */
  paquete: unknown
  /** Precio ya formateado por la tienda (ej. «$6.00»); vacío si no vino. */
  precio: string
  /** Ciclo de la suscripción; null en los pagos únicos (unlock y recargas). */
  periodo: 'mes' | 'anio' | null
  /** Nivel de la suscripción (1, 2 o 3); 0 si no es un nivel. */
  nivel: number
  /** Créditos: mensuales si es un nivel, de una vez si es una recarga. */
  creditos: number
  clase: Clase
}

/**
 * Ofertas que esta tienda tiene a la venta y el catálogo reconoce, ordenadas
 * por VIGENCIA: en RevenueCat el precio es inmutable, así que cada subida deja
 * atrás un producto que sigue en el offering para no dejar sin plan a quien lo
 * compró. El primero de cada clase es siempre el que toca ofrecer hoy.
 */
async function ofertas(): Promise<OfertaPro[]> {
  const usuario = useSesion.getState().usuario
  if (!usuario || !hayPagos()) return []
  const crudas = await caja().ofertas(usuario.id)
  const lista: { oferta: OfertaPro; rango: number }[] = []
  for (const cruda of crudas) {
    const producto = productoDe(cruda.id, cruda.producto)
    if (!producto) continue
    lista.push({ oferta: empaquetar(cruda, producto), rango: vigencia(cruda, producto) })
  }
  return lista.sort((a, b) => a.rango - b.rango).map((x) => x.oferta)
}

function empaquetar(cruda: OfertaCruda, producto: Producto): OfertaPro {
  return {
    id: cruda.id,
    paquete: cruda.ref,
    precio: cruda.precio,
    // El periodo lo manda la tienda; el catálogo solo cubre lo que no vino.
    periodo: cruda.periodo ?? producto.periodo,
    nivel: producto.nivel,
    creditos: producto.creditos,
    clase: producto.clase,
  }
}

/** Cuanto MENOR, más vigente: es el orden de `Producto.productos`. */
function vigencia(cruda: OfertaCruda, producto: Producto): number {
  const i = producto.productos.findIndex((id) => cruda.producto.endsWith(id))
  return i < 0 ? CATALOGO.length : i
}

/** La primera oferta de una clase (la vigente), con un filtro extra opcional. */
async function primera(clase: Clase, filtro?: (o: OfertaPro) => boolean): Promise<OfertaPro | null> {
  const todas = await ofertas()
  return todas.find((o) => o.clase === clase && (!filtro || filtro(o))) ?? null
}

/** Nivel base (×1), para el botón único de «hazte Pro». */
export async function obtenerOferta(): Promise<OfertaPro | null> {
  const niveles = await obtenerNiveles()
  return niveles[0] ?? null
}

/**
 * Los tres niveles mensuales, de menor a mayor y sin repetir nivel: si el
 * producto viejo de un nivel sigue en el offering, se queda fuera.
 */
export async function obtenerNiveles(): Promise<OfertaPro[]> {
  const todas = await ofertas()
  const vistos = new Set<number>()
  const niveles: OfertaPro[] = []
  for (const oferta of todas) {
    if (oferta.clase !== 'nivel' || oferta.periodo !== 'mes' || vistos.has(oferta.nivel)) continue
    vistos.add(oferta.nivel)
    niveles.push(oferta)
  }
  return niveles.sort((a, b) => a.nivel - b.nivel)
}

/** Paquete anual del nivel ×1; null si no está en ningún offering. */
export async function obtenerAnual(): Promise<OfertaPro | null> {
  return primera('nivel', (o) => o.periodo === 'anio')
}

/** Paquete de recarga de créditos (consumible, sin suscripción). */
export async function obtenerCreditos(): Promise<OfertaPro | null> {
  return primera('creditos')
}

/**
 * El pago único que desbloquea la casa e incluye el primer mes. Vuelve a
 * venderse en las tres plataformas (ago 2026): en las tiendas por compra
 * in-app y en la web directo.
 */
export async function obtenerUnlock(): Promise<OfertaPro | null> {
  return primera('unlock')
}

/**
 * Reintenta el refresco del perfil hasta que el webhook aterrice (tarda unos
 * segundos): la compra no vale hasta que `perfiles` lo dice.
 */
async function esperarPerfil(listo: () => boolean): Promise<boolean> {
  for (let i = 0; i < 5; i++) {
    await useSesion.getState().refrescarPerfil()
    if (listo()) break
    await new Promise((r) => setTimeout(r, 3000))
  }
  void useSesion.getState().refrescarUso()
  return listo()
}

async function pasarPorCaja(paquete: unknown): Promise<boolean> {
  const usuario = useSesion.getState().usuario
  if (!usuario) return false
  return caja().comprar(usuario.id, paquete)
}

/** Compra la suscripción. Devuelve true si el plan ya llegó al perfil. */
export async function comprar(paquete: unknown): Promise<boolean> {
  if (!(await pasarPorCaja(paquete))) return false
  return esperarPerfil(() => useSesion.getState().plan === 'pro')
}

/**
 * Cambia de nivel (subir o bajar). RevenueCat lo resuelve como cambio de la
 * misma suscripción; el webhook lo recibe como PRODUCT_CHANGE y reescribe
 * `perfiles.nivel`, así que aquí se espera a ver el nivel nuevo.
 */
export async function cambiarNivel(paquete: unknown, nivel: number): Promise<boolean> {
  if (!(await pasarPorCaja(paquete))) return false
  return esperarPerfil(() => useSesion.getState().nivel === nivel)
}

/** Compra una recarga de créditos: se espera a ver subir el saldo. */
export async function comprarCreditos(paquete: unknown): Promise<boolean> {
  const antes = useSesion.getState().creditosExtra
  if (!(await pasarPorCaja(paquete))) return false
  return esperarPerfil(() => useSesion.getState().creditosExtra > antes)
}

/** Compra la casa: se espera a ver el unlock (y con él, el primer mes). */
export async function comprarUnlock(paquete: unknown): Promise<boolean> {
  if (!(await pasarPorCaja(paquete))) return false
  return esperarPerfil(() => useSesion.getState().unlock)
}

/**
 * «Restaurar compras»: Apple lo EXIGE en cualquier app con pagos, y sirve para
 * quien reinstala o estrena teléfono. Devuelve true si tras restaurar la
 * cuenta tiene algo (la casa o un plan).
 */
export async function restaurarCompras(): Promise<boolean> {
  const usuario = useSesion.getState().usuario
  if (!usuario || !hayPagos()) return false
  await caja().restaurar(usuario.id)
  return esperarPerfil(() => useSesion.getState().unlock || useSesion.getState().plan !== 'local')
}

/** URL del portal de gestión de la suscripción (cancelar, cambiar pago). */
export async function urlGestion(): Promise<string | null> {
  const usuario = useSesion.getState().usuario
  if (!usuario || !hayPagos()) return null
  return caja().urlGestion(usuario.id)
}
