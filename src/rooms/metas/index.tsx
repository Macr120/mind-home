import { lazy } from 'react'
import type { Plantilla } from '../../core/appContrato'
import { FLUJOS_METAS } from '../../core/tutorial/calendario.meta'
import { COLOR_FABRICA } from './constantes'
import { esencialMetas } from './tutorial.meta'

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense).
const MetasApp = lazy(() => import('./MetasApp').then((m) => ({ default: m.MetasApp })))

/**
 * El cuarto donde vive lo que te propusiste: la lista de metas de toda la casa,
 * los planes que la IA propone para cada una y el cronograma donde caen.
 *
 * No declara `objetivosDia` ni `esquemas` porque no registra nada suyo: sus datos
 * son las metas (filas de `rutinas` con `esMeta`) y los planes (`planesMeta`) que
 * crean las demás apps. Sin `objetivosDia`, `objetivosDiaDe` devuelve `[]` y no se
 * sintetiza nada: la meta genérica «registra algo hoy» está muerta desde ago 2026.
 *
 * Tampoco lleva ya `sinMetaDiaria`. La bandera existía cuando el planificador no
 * tenía `FUENTES` de actividad y todo objetivo suyo era imposible; hoy sí las
 * tiene (planear ES la actividad de este cuarto, ver `gamificacion/actividad.ts`),
 * y quitarla es lo que le abre las dos puertas que necesita para ganar XP como
 * cualquier otra app: el catálogo de objetivos sugeridos y `plantillasAgendables`,
 * de la que cuelga la red de seguridad `otorgarSiDiaCerradoCompleto`.
 */
const metas: Plantilla = {
  id: 'metas',
  nombre: 'Metas · Planes y cronograma',
  icon: '🎯',
  categoria: 'mente',
  color: COLOR_FABRICA,
  App: MetasApp,
  esencial: esencialMetas,
  // Sus tours de EJEMPLO viven con los del reloj (core/tutorial/calendario.meta.ts):
  // sin esto el «?» del cuarto caía en el tutorial genérico.
  flujos: FLUJOS_METAS,
}

export default metas
