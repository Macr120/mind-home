import type { CuerpoTutorial, TextoTut, TutorialDef } from './tipos'

/**
 * Ficha del tutorial ESENCIAL de una app: corre en la casa real y recorre los
 * menús principales uno por uno, sin crear ni necesitar datos. El TÍTULO es
 * compartido entre todas las apps («Lo esencial»): el contexto lo da siempre la
 * cabecera de la lista o la propia app abierta, y así no se traduce 18 veces.
 * El RESUMEN sí es por app: es la respuesta del chat a «¿cómo funciona X?».
 */
export const fichaEsencial = (
  plantillaId: string,
  resumen: TextoTut,
  cargar: () => Promise<CuerpoTutorial>,
): TutorialDef => ({
  id: `app-${plantillaId}--esencial`,
  titulo: { clave: 'tut.esencial.titulo', es: 'Lo esencial' },
  resumen,
  cargar,
})
