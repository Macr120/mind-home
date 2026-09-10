import type { TemaId } from '../house/temas'
import type { TemaUIId, ModoUI } from './temasUI'
import type { EstiloUIId } from './estilosUI'

/**
 * Apariencia de la interfaz que acompaña a cada tema de la casa (color, luz,
 * forma y tinte), para que el cambio de tema se sienta completo. Mismo
 * papel que `FONDO_POR_TEMA` y `TECHO_POR_TEMA` para el fondo y el techo:
 * la aplica `useAjustes.aplicarAparienciaDeTema` cuando cambia `temaGlobal`.
 */
export interface AparienciaUI {
  temaUI: TemaUIId
  modoUI: ModoUI
  estiloUI: EstiloUIId
  tinteUI: number
}

export const UI_POR_TEMA: Record<TemaId, AparienciaUI> = {
  // Pergamino y tinta.
  medieval: { temaUI: 'dorado', modoUI: 'oscuro', estiloUI: 'tinta', tinteUI: 0.45 },
  // Ciencia ficción limpia.
  espacio: { temaUI: 'turquesa', modoUI: 'oscuro', estiloUI: 'plano', tinteUI: 0.35 },
  // Cómic oscuro (el tema sugiere el render «comic»).
  terror: { temaUI: 'rojo', modoUI: 'oscuro', estiloUI: 'tinta', tinteUI: 0.4 },
  barbie: { temaUI: 'rosa', modoUI: 'claro', estiloUI: 'redondo', tinteUI: 0.6 },
  // El tema sugiere el render «retro» (pixelado).
  vaquero: { temaUI: 'ambar', modoUI: 'claro', estiloUI: 'pixel', tinteUI: 0.45 },
  cyberpunk: { temaUI: 'neon', modoUI: 'oscuro', estiloUI: 'plano', tinteUI: 0.55 },
  navidad: { temaUI: 'bosque', modoUI: 'claro', estiloUI: 'redondo', tinteUI: 0.5 },
}
