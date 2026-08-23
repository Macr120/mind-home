import type { TextoTut, TutorialDef } from './tipos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/**
 * Ficha del primer paso de la guía de bienvenida. La bienvenida se monta en
 * cada arranque, así que sus pasos NO pueden viajar con ella: viven en
 * `primerosPasos.ts` y bajan al pulsar la tarjeta.
 */
export const tutorialPrimerosPasos: TutorialDef = {
  id: 'primeros-pasos',
  titulo: T('tut.primeros.titulo', 'Cómo abrir tus apps y crear más'),
  resumen: T('tut.primeros.resumen', 'Cómo entrar a tus apps y cómo crear una nueva: el cuarto, su app y sus tres accesos.'),
  cargar: () => import('./primerosPasos').then((m) => m.cuerpoPrimerosPasos()),
}
