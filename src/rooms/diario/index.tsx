import { lazy } from 'react'
import type { Plantilla } from '../../core/appContrato'
import { lecturasDiarioRepo } from '../../core/data/repository'
import { esencialDiario, flujosDiario } from './tutorial.meta'
import { COLOR_FABRICA } from './constantes'
import { OPERACIONES_IA } from './costosIA'
import { planMetasDiario } from './plan'

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo (capturar, esquemas,
// metaDiaria) sí es eager: lo usa el núcleo sin abrir el cuarto.
const DiarioApp = lazy(() => import('./DiarioApp').then((m) => ({ default: m.DiarioApp })))

const diario: Plantilla = {
  id: 'diario',
  nombre: 'Noticias · Periódico',
  icon: '📰',
  categoria: 'complemento',
  color: COLOR_FABRICA,
  App: DiarioApp,
  operacionesIA: OPERACIONES_IA,
  esencial: esencialDiario,
  flujos: flujosDiario,
  // Acotamiento del planificador ✨: en Noticias el plan es de lectura.
  planMetas: planMetasDiario,
  metaDiaria: {
    clave: 'diario.metaDiaria',
    etiquetaEs: 'Lee el diario de hoy',
    seccion: 'titulares',
    del: async (fecha) => ({
      hecho: (await lecturasDiarioRepo.list()).filter((l) => l.fecha === fecha).length,
      objetivo: 1,
    }),
  },
  comandos: [
    { seccion: 'titulares', etiqueta: 'Titulares', nombres: ['titulares', 'titulares del dia'] },
    { seccion: 'efemerides', etiqueta: 'Efemérides', nombres: ['efemerides', 'tal dia como hoy'] },
  ],
}

export default diario
