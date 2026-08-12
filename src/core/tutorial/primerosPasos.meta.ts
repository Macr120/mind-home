import type { TextoTut, TutorialDef } from './tipos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/**
 * Ficha del primer paso de la guía de bienvenida. La bienvenida se monta en
 * cada arranque, así que sus pasos NO pueden viajar con ella: viven en
 * `primerosPasos.ts` y bajan al pulsar la tarjeta.
 */
export const tutorialPrimerosPasos: TutorialDef = {
  id: 'primeros-pasos',
  titulo: T('tut.primeros.titulo', 'Primeros pasos'),
  resumen: T('tut.primeros.resumen', 'Crea un cuarto desde el menú, asígnale su app y entra a verla.'),
  cargar: () => import('./primerosPasos').then((m) => m.cuerpoPrimerosPasos()),
}
