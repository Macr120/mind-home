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
import type { TFunc } from '../i18n/useT'
import { CompraCancelada, type Caja, type OfertaCruda } from './caja'
import { cajaNativa } from './paywallNativo'
import { cajaWeb } from './paywallWeb'
import { CATALOGO, idBase, productoDe, type Clase, type Producto } from './productos'
import { esAppNativa, nombrePlataforma } from '../plataforma'
import { useSesion } from './sesionStore'
import { obtenerSupabase } from './supabase'

export { CompraCancelada }

/** La caja de esta plataforma. La nativa carga su SDK sola, y solo si se usa. */
function caja(): Caja {
  return esAppNativa() ? cajaNativa : cajaWeb
}

/**
 * Techo de espera para lo que se le PREGUNTA a la tienda (el catálogo y la
 * restauración). No lo lleva la compra en sí: ahí la hoja de pago es del
 * sistema y tarda lo que tarde la persona.
 *
 * Existe porque una promesa de la tienda puede no volver NUNCA —ni resolver ni
 * fallar—: `getOfferings()` acaba en la consulta de productos de StoreKit, y
 * esa se ha visto colgada en dispositivo. Sin techo, la pantalla de compra se
 * quedaba «cargando» para siempre y con ella su botón deshabilitado: es el
 * fallo por el que Apple rechazó la 1.0 el 9-sep-2026 («2.1(a) — Buy the house
 * button was unresponsive»). Con techo, la espera SIEMPRE termina y la UI
 * puede contarlo y reintentar.
 *
 * 30 s y no 12: en el sandbox de App Review la consulta de productos tarda lo
 * que tarda, y con 12 s el revisor veía «la tienda no respondió» antes de que
 * la tienda hubiera contestado (21-sep-2026). Mientras se espera, la UI lo dice
 * en tono neutro y el botón sigue vivo; el error solo llega tras agotar
 * también los reintentos de `ofertas()`.
 */
const ESPERA_TIENDA = 30_000

/** Pausas entre reintentos del catálogo (dos reintentos tras el primer fallo). */
const PAUSAS_REINTENTO = [1_000, 3_000]

/**
 * Se agotó el techo. Va como TIPO y no como texto porque quien lo enseña es la
 * UI, que tiene el idioma: un `Error` con su mensaje dentro salía en español en
 * una app en inglés (visto en el iPad al probar «Restaurar compras»).
 */
export class TiendaSinRespuesta extends Error {
  constructor() {
    super('tienda: sin respuesta')
    this.name = 'TiendaSinRespuesta'
  }
}

function conTecho<T>(promesa: Promise<T>, ms = ESPERA_TIENDA): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    const reloj = setTimeout(() => rechazar(new TiendaSinRespuesta()), ms)
    promesa.then(resolver, rechazar).finally(() => clearTimeout(reloj))
  })
}

/**
 * Un fallo de la tienda, dicho en el idioma de quien mira. Vive aquí y no en la
 * UI porque lo enseñan dos pantallas —la puerta y Configuraciones › Cuenta— y
 * una de ellas ya importa de la otra. El techo es la única excepción que
 * sabemos nombrar; del resto, que vienen de RevenueCat, se enseña su mensaje.
 */
export function textoDeFallo(e: unknown, t: TFunc): string {
  if (e instanceof TiendaSinRespuesta) {
    return t('puerta.sinOferta', 'La tienda no respondió. Revisa tu conexión y vuelve a intentarlo.')
  }
  return e instanceof Error ? e.message : String(e)
}

/**
 * La línea técnica de un fallo, para pintarla en gris bajo el mensaje: el
 * código de RevenueCat (`readableErrorCode` en las apps, `errorCode` en la web)
 * y el mensaje de la tienda que hay debajo. Cuatro revisiones de Apple
 * describieron «an error message» sin decir cuál; con el código en pantalla,
 * una captura basta para saber qué pasó.
 */
export function detalleDeFallo(e: unknown): string {
  if (e instanceof TiendaSinRespuesta) return `timeout ${ESPERA_TIENDA / 1000}s`
  if (!e || typeof e !== 'object') return String(e)
  const err = e as {
    code?: unknown
    errorCode?: unknown
    readableErrorCode?: unknown
    userInfo?: { readableErrorCode?: unknown }
    underlyingErrorMessage?: unknown
    message?: unknown
  }
  const codigo = err.userInfo?.readableErrorCode ?? err.readableErrorCode ?? err.code ?? err.errorCode
  const fondo = err.underlyingErrorMessage ?? err.message
  return [codigo, fondo]
    .filter((x) => x !== undefined && x !== null && String(x) !== '')
    .map(String)
    .join(' · ')
}

/** Lo que la bitácora del servidor guarda de un paso de la caja. */
type Paso = 'catalogo' | 'compra' | 'perfil' | 'confirmar'

function cuerpoBitacora(paso: Paso, resultado: 'ok' | 'error' | 'cancelada', datos: Record<string, string>) {
  return {
    paso,
    resultado,
    plataforma: nombrePlataforma(),
    os: typeof navigator === 'undefined' ? '' : navigator.userAgent.slice(0, 200),
    ...datos,
  }
}

/**
 * Bitácora en el servidor (`compras_log`, vía `confirmar-compra`), sin esperar
 * ni fallar: existe para que la próxima revisión de Apple deje rastro de qué
 * vio el revisor, aunque no adjunte captura. Cuatro rechazos no lo dejaron.
 */
export function reportar(paso: Paso, resultado: 'ok' | 'error' | 'cancelada', datos: Record<string, string> = {}): void {
  void (async () => {
    const sb = await obtenerSupabase()
    if (!sb || !useSesion.getState().usuario) return
    await sb.functions.invoke('confirmar-compra', { body: cuerpoBitacora(paso, resultado, datos) })
  })().catch(() => {})
}

/**
 * Le pide al servidor que confirme la compra con RevenueCat (servidor a
 * servidor) y la aplique al perfil AHORA, sin esperar al webhook. Devuelve si
 * el servidor vio algo comprado; si la función no está o falla, false, y la
 * fachada cae a esperar el webhook como antes.
 */
async function confirmarCompra(producto: string): Promise<boolean> {
  const sb = await obtenerSupabase()
  if (!sb) return false
  try {
    const { data, error } = await sb.functions.invoke<{ ok: boolean; confirmado?: boolean }>('confirmar-compra', {
      body: cuerpoBitacora('confirmar', 'ok', { producto }),
    })
    return !error && !!data?.confirmado
  } catch {
    return false
  }
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
  /** Id del producto en ESTA tienda (Apple lleva el bundle delante): bitácora. */
  producto: string
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
  // Con reintentos: la consulta de productos de StoreKit falla o vuelve vacía
  // a ratos —sobre todo en el sandbox de App Review— y a los pocos segundos
  // contesta. Se rinde solo tras el último intento, y entonces sí lanza.
  let crudas: OfertaCruda[] = []
  let fallo: unknown = null
  for (let intento = 0; intento <= PAUSAS_REINTENTO.length; intento++) {
    if (intento > 0) await new Promise((r) => setTimeout(r, PAUSAS_REINTENTO[intento - 1]))
    try {
      crudas = await conTecho(caja().ofertas(usuario.id))
      fallo = null
      if (crudas.length) break
    } catch (e) {
      fallo = e
    }
  }
  if (fallo) {
    reportar('catalogo', 'error', { codigo: detalleDeFallo(fallo).slice(0, 80), mensaje: textoSinTraducir(fallo) })
    throw fallo
  }
  if (!crudas.length) reportar('catalogo', 'error', { codigo: 'sin-productos', mensaje: 'la tienda devolvió 0 productos' })
  const lista: { oferta: OfertaPro; rango: number }[] = []
  for (const cruda of crudas) {
    const producto = productoDe(cruda.id, cruda.producto)
    if (!producto) continue
    lista.push({ oferta: empaquetar(cruda, producto), rango: vigencia(cruda, producto) })
  }
  return lista.sort((a, b) => a.rango - b.rango).map((x) => x.oferta)
}

/** El mensaje crudo de un error, sin pasar por el idioma: es para la bitácora. */
function textoSinTraducir(e: unknown): string {
  return (e instanceof Error ? e.message : String(e)).slice(0, 500)
}

function empaquetar(cruda: OfertaCruda, producto: Producto): OfertaPro {
  return {
    id: cruda.id,
    paquete: cruda.ref,
    producto: cruda.producto,
    precio: cruda.precio,
    // El periodo lo manda la tienda; el catálogo solo cubre lo que no vino.
    periodo: cruda.periodo ?? producto.periodo,
    nivel: producto.nivel,
    creditos: producto.creditos,
    clase: producto.clase,
  }
}

/**
 * Cuanto MENOR, más vigente: es el orden de `Producto.productos`.
 *
 * Se compara con el id NORMALIZADO, no con el crudo: Google Play cuelga el plan
 * base del producto (`pro_x1_v2:mensual`) y así ningún id de Play terminaba en
 * el del catálogo. Todos empataban en el último puesto y, el día que una subida
 * de precio deje el producto viejo en el offering —que es justo cuando esto
 * hace falta—, Android podría ofrecer el viejo. `idBase()` es la misma función
 * que usa el servidor en `_shared/compras.ts`.
 */
function vigencia(cruda: OfertaCruda, producto: Producto): number {
  const base = idBase(cruda.producto)
  const i = producto.productos.indexOf(base)
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
async function esperarPerfil(listo: () => boolean, intentos = 15): Promise<boolean> {
  for (let i = 0; i < intentos; i++) {
    await useSesion.getState().refrescarPerfil()
    if (listo()) break
    await new Promise((r) => setTimeout(r, 3000))
  }
  void useSesion.getState().refrescarUso()
  return listo()
}

/**
 * Pasa por la caja de esta plataforma. Vuelve cuando la tienda COBRÓ; lanza
 * `CompraCancelada` si el usuario cerró la hoja y cualquier otro fallo tal
 * cual. Los dos quedan en la bitácora del servidor.
 */
async function pasarPorCaja(oferta: OfertaPro): Promise<void> {
  const usuario = useSesion.getState().usuario
  if (!usuario) throw new Error('compra: sin sesión')
  try {
    await caja().comprar(usuario.id, oferta.paquete)
  } catch (e) {
    if (e instanceof CompraCancelada) reportar('compra', 'cancelada', { producto: oferta.producto })
    else reportar('compra', 'error', { producto: oferta.producto, codigo: detalleDeFallo(e).slice(0, 80), mensaje: textoSinTraducir(e) })
    throw e
  }
}

/**
 * Lo que sigue a un cobro: el servidor lo confirma con RevenueCat y lo
 * aplica al perfil ya (`confirmar-compra`), y luego se relee el perfil hasta
 * verlo. Devuelve true si el perfil ya lo refleja; false si la tienda cobró
 * pero el perfil AÚN no lo dice —que NO es un error: se enseña como «pago
 * recibido, activando…» y el webhook lo completa en cuanto llega.
 *
 * Hasta el 21-sep-2026 solo existía la espera al webhook, con ~15 s de techo:
 * si tardaba más, quien acababa de pagar veía «la compra no se completó».
 */
async function aterrizar(oferta: OfertaPro, listo: () => boolean): Promise<boolean> {
  await confirmarCompra(oferta.producto)
  const ok = await esperarPerfil(listo)
  if (!ok) {
    const { errorPerfil } = useSesion.getState()
    reportar('perfil', 'error', {
      producto: oferta.producto,
      codigo: errorPerfil ? 'perfil-no-leido' : 'perfil-sin-cambio',
      mensaje: errorPerfil ?? 'la tienda cobró y el perfil aún no lo refleja',
    })
  }
  return ok
}

/** Compra la suscripción. Devuelve true si el plan ya llegó al perfil. */
export async function comprar(oferta: OfertaPro): Promise<boolean> {
  await pasarPorCaja(oferta)
  return aterrizar(oferta, () => useSesion.getState().plan === 'pro')
}

/**
 * Cambia de nivel (subir o bajar). RevenueCat lo resuelve como cambio de la
 * misma suscripción; el webhook lo recibe como PRODUCT_CHANGE y reescribe
 * `perfiles.nivel`, así que aquí se espera a ver el nivel nuevo.
 */
export async function cambiarNivel(oferta: OfertaPro): Promise<boolean> {
  await pasarPorCaja(oferta)
  return aterrizar(oferta, () => useSesion.getState().nivel === oferta.nivel && useSesion.getState().plan === 'pro')
}

/** Compra una recarga de créditos: se espera a ver subir el saldo. */
export async function comprarCreditos(oferta: OfertaPro): Promise<boolean> {
  const antes = useSesion.getState().creditosExtra
  await pasarPorCaja(oferta)
  return aterrizar(oferta, () => useSesion.getState().creditosExtra > antes)
}

/** Compra la casa: se espera a ver el unlock (y con él, el primer mes). */
export async function comprarUnlock(oferta: OfertaPro): Promise<boolean> {
  await pasarPorCaja(oferta)
  return aterrizar(oferta, () => useSesion.getState().unlock)
}

/**
 * «Restaurar compras»: Apple lo EXIGE en cualquier app con pagos, y sirve para
 * quien reinstala o estrena teléfono. Devuelve true si tras restaurar la
 * cuenta tiene algo (la casa o un plan).
 */
export async function restaurarCompras(): Promise<boolean> {
  const usuario = useSesion.getState().usuario
  if (!usuario || !hayPagos()) return false
  await conTecho(caja().restaurar(usuario.id))
  // Lo restaurado ya está en RevenueCat: el servidor lo aplica sin esperar al webhook.
  await confirmarCompra('restaurar')
  return esperarPerfil(() => useSesion.getState().unlock || useSesion.getState().plan !== 'local', 5)
}

/** URL del portal de gestión de la suscripción (cancelar, cambiar pago). */
export async function urlGestion(): Promise<string | null> {
  const usuario = useSesion.getState().usuario
  if (!usuario || !hayPagos()) return null
  return caja().urlGestion(usuario.id)
}
