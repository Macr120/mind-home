/**
 * Lenguaje visual de la agenda: re-exporta el canon de `rooms/_shared/ui.tsx`
 * (misma tarjeta, mismo input, mismo modal) para no divergir.
 */
export { INPUT, TARJETA, Campo, Modal, BotonBorrar } from '../_shared/ui'

/** @deprecated Alias en cadena; el código nuevo usa `BotonSecundario` del kit. */
export const BTN_SEC = 'rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold transition hover:bg-white/10'
