/**
 * Paywall con RevenueCat Web Billing.
 *
 * `appUserId` = user.id de Supabase: el webhook (revenuecat-webhook) traduce
 * los eventos de compra a `perfiles.plan`, que es la fuente de verdad. Aquí
 * solo se abre el checkout y se espera a que el webhook aterrice.
 */
import { Purchases, type Package } from '@revenuecat/purchases-js'
import { useSesion } from './sesionStore'

const claveWeb = import.meta.env.VITE_REVENUECAT_WEB_KEY as string | undefined

/** ¿El build trae pagos configurados? (public key `rcb_...` presente) */
export function hayPagos(): boolean {
  return !!claveWeb
}

let configuradoPara: string | null = null

/** Instancia de RC ligada al usuario de Supabase (idempotente por usuario). */
function rc(userId: string): Purchases {
  if (configuradoPara === userId) return Purchases.getSharedInstance()
  const inst = Purchases.configure(claveWeb!, userId)
  configuradoPara = userId
  return inst
}

export interface OfertaPro {
  paquete: Package
  /** Precio ya formateado por RC (ej. «$5.00»); vacío si no vino. */
  precio: string
  /** Ciclo de la suscripción; null en el pago único del unlock. */
  periodo: 'mes' | 'anio' | null
  /** Nivel de la suscripción (1, 2 o 3); 0 si no es un nivel. */
  nivel: number
  /** Créditos mensuales que da el nivel; 0 si no es un nivel. */
  creditos: number
}

/**
 * Niveles de la suscripción: el mismo plan multiplicado. Espejo de `NIVELES` en
 * el webhook, que es quien escribe `perfiles.nivel`; aquí solo se pintan y se
 * compran. Cambiar de nivel es comprar otro paquete —RevenueCat lo resuelve
 * como cambio de suscripción, no como alta nueva—, y bajar o cancelar se hace
 * desde `urlGestion()`.
 */
const NIVELES: Record<string, number> = {
  pro_x1: 1,
  pro_x2: 2,
  pro_x3: 3,
}

/** Créditos mensuales del nivel base; los demás son múltiplos exactos. */
const CREDITOS_BASE = 700

/**
 * Pago único que desbloquea la app e incluye el primer mes (plan trial de 30
 * días con pool + sync, sin tarjeta). One-time SIN entitlement; el alta real la
 * hace el webhook al ver el `product_id`.
 */
export const UNLOCK_PRODUCTO = 'unlock_casa'

function empaquetar(paquete: Package): OfertaPro {
  const producto = paquete.webBillingProduct
  const duracion = producto?.normalPeriodDuration ?? null
  const nivel = NIVELES[producto?.identifier ?? ''] ?? 0
  return {
    paquete,
    precio: producto?.currentPrice?.formattedPrice ?? '',
    periodo: duracion === 'P1M' ? 'mes' : duracion === 'P1Y' ? 'anio' : null,
    nivel,
    creditos: nivel * CREDITOS_BASE,
  }
}

/** Nivel base (×1), para el botón único de «hazte Pro». */
export async function obtenerOferta(): Promise<OfertaPro | null> {
  const niveles = await obtenerNiveles()
  return niveles[0] ?? null
}

/**
 * Los tres niveles, de menor a mayor. Se buscan en TODOS los offerings y por
 * identificador: así el orden en que estén configurados en RevenueCat no
 * decide cuál es el ×1.
 */
export async function obtenerNiveles(): Promise<OfertaPro[]> {
  const usuario = useSesion.getState().usuario
  if (!usuario || !claveWeb) return []
  const offerings = await rc(usuario.id).getOfferings()
  const encontrados = new Map<string, OfertaPro>()
  for (const oferta of Object.values(offerings.all)) {
    for (const paquete of oferta.availablePackages) {
      const id = paquete.webBillingProduct?.identifier ?? ''
      if (id in NIVELES && !encontrados.has(id)) encontrados.set(id, empaquetar(paquete))
    }
  }
  return [...encontrados.values()].sort((a, b) => a.nivel - b.nivel)
}

/**
 * Abre el checkout de RC y espera el entitlement. Devuelve true si quedó
 * activo; el plan del perfil llega vía webhook (se reintenta el refresco).
 */
export async function comprar(paquete: Package): Promise<boolean> {
  const usuario = useSesion.getState().usuario
  if (!usuario) return false
  const { customerInfo } = await rc(usuario.id).purchase({ rcPackage: paquete })
  const activo = 'pro' in customerInfo.entitlements.active
  if (activo) {
    // El webhook tarda unos segundos: reintentar hasta ver el plan en el perfil.
    for (let i = 0; i < 5; i++) {
      await useSesion.getState().refrescarPerfil()
      if (useSesion.getState().plan === 'pro') break
      await new Promise((r) => setTimeout(r, 3000))
    }
    void useSesion.getState().refrescarUso()
  }
  return activo
}

/**
 * Cambia de nivel (subir o bajar). RevenueCat lo resuelve como cambio de la
 * misma suscripción; el webhook lo recibe como PRODUCT_CHANGE y reescribe
 * `perfiles.nivel`, así que aquí se espera a ver el nivel nuevo.
 */
export async function cambiarNivel(paquete: Package, nivel: number): Promise<boolean> {
  const usuario = useSesion.getState().usuario
  if (!usuario) return false
  await rc(usuario.id).purchase({ rcPackage: paquete })
  for (let i = 0; i < 5; i++) {
    await useSesion.getState().refrescarPerfil()
    if (useSesion.getState().nivel === nivel) break
    await new Promise((r) => setTimeout(r, 3000))
  }
  void useSesion.getState().refrescarUso()
  return useSesion.getState().nivel === nivel
}

/**
 * Paquete del unlock (pago único), esté en el offering que esté — como las
 * recargas, no vive en el `default` de la suscripción.
 */
export async function obtenerUnlock(): Promise<OfertaPro | null> {
  const usuario = useSesion.getState().usuario
  if (!usuario || !claveWeb) return null
  const offerings = await rc(usuario.id).getOfferings()
  for (const oferta of Object.values(offerings.all)) {
    for (const paquete of oferta.availablePackages) {
      if (paquete.webBillingProduct?.identifier === UNLOCK_PRODUCTO) return empaquetar(paquete)
    }
  }
  return null
}

/**
 * Compra el unlock (one-time). El alta (unlock + trial de 30 días) llega por
 * webhook: se reintenta el refresco hasta ver `perfiles.unlock`.
 */
export async function comprarUnlock(paquete: Package): Promise<boolean> {
  const usuario = useSesion.getState().usuario
  if (!usuario) return false
  await rc(usuario.id).purchase({ rcPackage: paquete })
  for (let i = 0; i < 5; i++) {
    await useSesion.getState().refrescarPerfil()
    if (useSesion.getState().unlock) break
    await new Promise((r) => setTimeout(r, 3000))
  }
  void useSesion.getState().refrescarUso()
  return useSesion.getState().unlock
}

/** URL del portal de gestión de la suscripción (cancelar, cambiar pago). */
export async function urlGestion(): Promise<string | null> {
  const usuario = useSesion.getState().usuario
  if (!usuario || !claveWeb) return null
  try {
    const info = await rc(usuario.id).getCustomerInfo()
    return info.managementURL ?? null
  } catch {
    return null
  }
}
