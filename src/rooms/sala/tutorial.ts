import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { clickTut } from '../../core/tutorial/dom'
import { lugaresViajeRepo } from '../../core/data/repository'
import { abrirApp } from '../../core/abrirApp'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const tutorialSala: TutorialDef = {
  id: 'app-sala',
  titulo: T('tut.app-sala.titulo', 'Viajes · Sala'),
  resumen: T(
    'tut.app-sala.resumen',
    'La sala es tu mundo viajero: pines de lugares visitados en el mapamundi, itinerarios de lugares por conocer (con fecha y plan día a día), rutas de viaje y bitácora con fotos.',
  ),
  preparar: () => {
    abrirApp('sala')
  },
  pasos: [
    {
      texto: T(
        'tut.app-sala.1.texto',
        'La sala guarda tus viajes: lo visitado, lo pendiente y los recuerdos.',
      ),
    },
    {
      sel: 'sala.tab.mapa',
      alEntrar: () => {
        clickTut('sala.tab.mapa')
      },
      titulo: T('tut.app-sala.2.titulo', 'El mapa'),
      texto: T(
        'tut.app-sala.2.texto',
        'El mapamundi pinta un pin por cada lugar visitado. Los lugares se buscan por nombre y se ubican solos.',
      ),
    },
    {
      sel: 'sala.porConocer',
      alEntrar: async (ctx) => {
        clickTut('sala.tab.porConocer')
        await ctx.unaVez('lugar-ejemplo', async () => {
          const id = await lugaresViajeRepo.add({
            nombre: 'Ejemplo (tutorial) 🎓',
            pais: 'País de ejemplo',
            visitado: 0,
            creadoEn: new Date().toISOString(),
          })
          ctx.datos.set('lugarId', id)
          ctx.alLimpiar(() => lugaresViajeRepo.remove(id as number))
        })
      },
      titulo: T('tut.app-sala.3.titulo', 'Itinerario'),
      texto: T(
        'tut.app-sala.3.texto',
        'Agregué «Ejemplo (tutorial) 🎓» a tus lugares por conocer; se borrará al terminar. A cada lugar puedes darle fecha, plan día a día y meta de ahorro.',
      ),
    },
    {
      sel: 'sala.tab.rutas',
      alEntrar: () => {
        clickTut('sala.tab.rutas')
      },
      titulo: T('tut.app-sala.4.titulo', 'Rutas'),
      texto: T(
        'tut.app-sala.4.texto',
        'Rutas encadena varios destinos en un mismo viaje y lo dibuja sobre el mapa.',
      ),
    },
    {
      sel: 'sala.tab.bitacora',
      alEntrar: () => {
        clickTut('sala.tab.bitacora')
      },
      titulo: T('tut.app-sala.5.titulo', 'Bitácora'),
      texto: T(
        'tut.app-sala.5.texto',
        'La bitácora guarda fotos y anécdotas por lugar: tu álbum de viajes.',
      ),
    },
    {
      sel: 'sala.tab.cronograma',
      alEntrar: () => {
        clickTut('sala.tab.cronograma')
      },
      titulo: T('tut.app-sala.6.titulo', 'Cronograma'),
      texto: T(
        'tut.app-sala.6.texto',
        'Los lugares con fecha aparecen aquí y en el calendario de la casa.',
      ),
    },
    {
      texto: T(
        'tut.app-sala.7.texto',
        'Listo: el lugar de ejemplo se borra ahora. Buen viaje.',
      ),
    },
  ],
}
