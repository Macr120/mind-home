import type { Plantilla } from '../../core/appContrato'
import { lazy } from 'react'
import { ideasRepo, mapasIdeasRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { registrarProveedorMaterial } from '../../core/materialApps'
import { COLOR_FABRICA } from './constantes'
import { flujosIdeas } from './tutorial.meta'
import { OPERACIONES_IA } from './costosIA'
import { planMetasIdeas } from './plan'

// Mapas e ideas enlazables desde otras apps (la enciclopedia los usa de
// material). `crear.ts` se importa en diferido: arrastra layouts y el catálogo
// de formatos, y este módulo es eager.
registrarProveedorMaterial({
  tipo: 'mapa',
  appId: 'ideas',
  seccion: 'mapas',
  crear: async (nombre) => {
    const { crearMapaVacio } = await import('./crear')
    return crearMapaVacio(nombre, 'mental')
  },
  nombre: async (id) => (await mapasIdeasRepo.list()).find((m) => m.id === id)?.nombre ?? null,
  listar: async () =>
    (await mapasIdeasRepo.list()).filter((m) => m.id != null).map((m) => ({ id: m.id!, nombre: m.nombre })),
  // Un mapa mental de lo que dice la entrada: es el formato que sirve para
  // cualquier tema (los demás piden una decisión, una comparación…).
  generar: async (ctx) => {
    const { crearMapaIA } = await import('./crear')
    return crearMapaIA(`${ctx.titulo}. ${ctx.texto}`.slice(0, 600), 'mental')
  },
  Vista: lazy(() => import('./VistaMaterial').then((m) => ({ default: m.VistaMapa }))),
})

registrarProveedorMaterial({
  tipo: 'idea',
  appId: 'ideas',
  seccion: 'diario',
  crear: async (texto) =>
    ideasRepo.add({ texto, fecha: fechaLocalISO(), creadoEn: new Date().toISOString() }),
  nombre: async (id) => (await ideasRepo.list()).find((i) => i.id === id)?.texto ?? null,
  listar: async () =>
    (await ideasRepo.list()).filter((i) => i.id != null).map((i) => ({ id: i.id!, nombre: i.texto })),
  // La idea nace ya desarrollada: el título de la entrada con los puntos que
  // la IA saca de lo que ahí se cuenta.
  generar: async (ctx) => {
    const { desarrollarIdea } = await import('./ia')
    const textos = await desarrollarIdea({ texto: `${ctx.titulo}. ${ctx.texto}`.slice(0, 600), puntos: [] })
    const id = await ideasRepo.add({
      texto: ctx.titulo,
      puntos: textos.map((texto, i) => ({ puntoId: `pt-${Date.now().toString(36)}-${i}`, texto })),
      fecha: fechaLocalISO(),
      creadoEn: new Date().toISOString(),
    })
    return { id, nombre: ctx.titulo }
  },
  Vista: lazy(() => import('./VistaMaterial').then((m) => ({ default: m.VistaIdea }))),
})

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo sí es eager: lo usa
// el núcleo sin abrir el cuarto.
const IdeasApp = lazy(() => import('./IdeasApp').then((m) => ({ default: m.IdeasApp })))

const ideas: Plantilla = {
  id: 'ideas',
  nombre: 'Ideas · Diario, mapas y diagramas',
  icon: '💡',
  categoria: 'mente',
  color: COLOR_FABRICA,
  App: IdeasApp,
  operacionesIA: OPERACIONES_IA,
  flujos: flujosIdeas,
  // Acotamiento del planificador ✨: de la idea a algo real, o a una decisión.
  planMetas: planMetasIdeas,
  comandos: [
    {
      seccion: 'diario',
      etiqueta: 'Diario de ideas',
      nombres: ['diario de ideas', 'lluvia de ideas', 'lluvias de ideas', 'ideas'],
    },
    {
      seccion: 'mapas',
      etiqueta: 'Mapas',
      nombres: ['mapa mental', 'mapas mentales', 'mapa conceptual', 'mapas conceptuales'],
    },
    {
      seccion: 'diagramas',
      etiqueta: 'Diagramas',
      nombres: ['diagramas', 'foda', 'ishikawa', 'ventajas y desventajas', 'pros y contras'],
    },
  ],
}

export default ideas
