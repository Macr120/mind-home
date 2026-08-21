import { leerCalidadImagen, type CalidadImagen } from './calidadImagen'

/**
 * Proveedor preferido de la vía CUENTA (créditos), por modalidad.
 *
 * Es el gemelo de `getProvVoz()`/`proveedorImagen()` de BYOK, pero aquí no hay
 * claves de por medio: las pone el servidor y el usuario solo dice a quién
 * prefiere. Los ids son los del PROXY (`anthropic`/`openai`/`gemini`), no los
 * del panel (`claude`/`chatgpt`/`gemini`), porque viajan tal cual en el cuerpo
 * de las Edge Functions.
 *
 * `null` = sin preferencia: manda la cadena por defecto del servidor. Se
 * distingue del valor por defecto a propósito — quien no toca la tabla no debe
 * congelar hoy lo que el servidor decida mañana (el ejemplo vivo es la imagen,
 * cuyo orden depende de la calidad elegida).
 *
 * Vive fuera de `api.ts` para que la web pública y los módulos livianos puedan
 * leerlo sin arrastrar el cliente de Supabase.
 */

export type ProvCerebroCuenta = 'anthropic' | 'gemini' | 'openai'
/** Los únicos que sirven voz e imagen en el proxy (igual que `ProveedorMediaId`). */
export type ProvMediaCuenta = 'openai' | 'gemini'

const LS_CEREBRO = 'mh.cuentaProv.cerebro'
const LS_VOZ = 'mh.cuentaProv.voz'
const LS_IMAGEN = 'mh.cuentaProv.imagen'

function leerMedia(clave: string): ProvMediaCuenta | null {
  const id = localStorage.getItem(clave)
  return id === 'openai' || id === 'gemini' ? id : null
}

export function getProvCerebroCuenta(): ProvCerebroCuenta | null {
  const id = localStorage.getItem(LS_CEREBRO)
  return id === 'anthropic' || id === 'gemini' || id === 'openai' ? id : null
}

export function setProvCerebroCuenta(id: ProvCerebroCuenta): void {
  localStorage.setItem(LS_CEREBRO, id)
}

export function getProvVozCuenta(): ProvMediaCuenta | null {
  return leerMedia(LS_VOZ)
}

export function setProvVozCuenta(id: ProvMediaCuenta): void {
  localStorage.setItem(LS_VOZ, id)
}

export function getProvImagenCuenta(): ProvMediaCuenta | null {
  return leerMedia(LS_IMAGEN)
}

export function setProvImagenCuenta(id: ProvMediaCuenta): void {
  localStorage.setItem(LS_IMAGEN, id)
}

/**
 * Quién servirá cada modalidad si el usuario no eligió: lo que hará el servidor
 * con su cadena por defecto. Solo lo usa el panel, para pintar el ● en la celda
 * correcta sin guardar nada.
 */
export function provCuentaEfectivo(calidad: CalidadImagen = leerCalidadImagen()): {
  cerebro: ProvCerebroCuenta
  voz: ProvMediaCuenta
  imagen: ProvMediaCuenta
} {
  return {
    cerebro: getProvCerebroCuenta() ?? 'anthropic',
    voz: getProvVozCuenta() ?? 'openai',
    // `IMG_CADENA_ALTA` arranca en Gemini y `IMG_CADENA_RAPIDA` en OpenAI.
    imagen: getProvImagenCuenta() ?? (calidad === 'buena' ? 'gemini' : 'openai'),
  }
}
