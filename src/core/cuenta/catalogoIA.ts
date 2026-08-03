import { costoOp, opImagen, type OpIA } from './costos'
import { leerCalidadImagen, type CalidadImagen } from './calidadImagen'

/**
 * Catálogo de lo que se puede pedirle a la IA y lo que cuesta.
 *
 * Una operación NO guarda un número: guarda de qué llamadas se compone. El
 * precio se deriva. Así el badge del botón, la pantalla de precios y la tabla de
 * docs/COSTOS.md salen todos de lo mismo, y la calidad de imagen elegida se
 * aplica sola en cualquier operación que genere imágenes (una dieta cuesta 20
 * créditos en calidad rápida y 55 en buena sin tocar el catálogo).
 *
 * Regla: fuera de este archivo NO se suman créditos a mano. Si aparece un
 * `costoOp(...) + costoOp(...)` en un componente, es una operación que falta
 * declarar aquí.
 *
 * Cada cuarto declara las suyas en `src/rooms/<id>/costosIA.ts` y las expone en
 * su `RoomModule` (`operacionesIA`); lo que no vive en un cuarto está en
 * `catalogoNucleo.ts`.
 */

/** Una llamada al proxy dentro de una operación compuesta. */
export interface ParteIA {
  /** Op primitiva. `imagen` es LÓGICA: se resuelve según la calidad elegida. */
  op: OpIA
  /** Veces que se llama. `'n'` = una por elemento del lote. Por defecto 1. */
  veces?: number | 'n'
  /** Solo cuenta si la app va a generar imágenes (fotos opcionales). */
  soloConImagen?: boolean
}

export interface OperacionIA {
  /** Id estable `<grupo>.<accion>`; es también la llave de i18n y de la doc. */
  id: string
  /** Etiqueta: clave de `dict.ts` y su fallback en español. */
  clave: string
  es: string
  /** De qué llamadas se compone. FUENTE ÚNICA del precio. */
  partes: ParteIA[]
  /** El precio depende de N (lotes): la pantalla pinta «N ×». */
  lote?: boolean
  /** El número es un promedio o un mínimo (contenido variable, reintentos). */
  aprox?: boolean
  /** Por qué cuesta lo que cuesta, cuando no es evidente. */
  notaClave?: string
  notaEs?: string
  /** Dónde está el botón, para la pantalla de precios («Recetario»). */
  dondeClave?: string
  dondeEs?: string
}

export interface CtxCosto {
  /** Tamaño del lote. Por defecto 1. */
  n?: number
  /** ¿Se generarán imágenes? Por defecto sí (lo decide `imagenIaActiva()`). */
  conImagen?: boolean
  /** Calidad vigente. Por defecto, la preferencia guardada. */
  calidad?: CalidadImagen
}

/** Créditos de una operación del catálogo. La única aritmética de créditos. */
export function costoOperacion(op: OperacionIA, ctx: CtxCosto = {}): number {
  const { n = 1, conImagen = true, calidad = leerCalidadImagen() } = ctx
  return op.partes.reduce((suma, parte) => {
    if (parte.soloConImagen && !conImagen) return suma
    const veces = parte.veces === 'n' ? n : (parte.veces ?? 1)
    const real = parte.op === 'imagen' ? opImagen(calidad) : parte.op
    return suma + costoOp(real, veces)
  }, 0)
}

/** Precio unitario de un lote (lo que cuesta CADA elemento). */
export function costoUnitario(op: OperacionIA, ctx: CtxCosto = {}): number {
  return costoOperacion(op, { ...ctx, n: 1 })
}
