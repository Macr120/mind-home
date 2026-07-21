import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { clickTut } from '../../core/tutorial/dom'
import { abrirApp } from '../../core/abrirApp'
import { vehiculosRepo } from '../../core/data/repository'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const tutorialGarage: TutorialDef = {
  id: 'app-garage',
  titulo: T('tut.app-garage.titulo', 'Garage'),
  resumen: T(
    'tut.app-garage.resumen',
    'El garage administra tus vehículos reales: cada uno con sus mantenimientos, fechas y recordatorios de servicio.',
  ),
  preparar: () => {
    abrirApp('garage')
  },
  pasos: [
    {
      texto: T(
        'tut.app-garage.1.texto',
        'El garage lleva el mantenimiento de tus vehículos reales.',
      ),
    },
    {
      sel: 'garage.tab.resumen',
      alEntrar: () => {
        clickTut('garage.tab.resumen')
      },
      titulo: T('tut.app-garage.2.titulo', 'Resumen'),
      texto: T(
        'tut.app-garage.2.texto',
        'El panorama: qué vehículos tienes y qué servicios se acercan.',
      ),
    },
    {
      sel: 'garage.veh.lista',
      alEntrar: async (ctx) => {
        clickTut('garage.tab.vehiculos')
        await ctx.unaVez('vehiculo-ejemplo', async () => {
          const id = await vehiculosRepo.add({
            nombre: 'Ejemplo (tutorial) 🎓',
            tipo: 'bicicleta',
            unidad: 'km',
            creadoEn: new Date().toISOString(),
          })
          ctx.alLimpiar(() => vehiculosRepo.remove(id))
        })
      },
      titulo: T('tut.app-garage.3.titulo', 'Vehículos'),
      texto: T(
        'tut.app-garage.3.texto',
        'Cada vehículo guarda su ficha y su historial de mantenimientos (aceite, llantas, verificación…). Añadí la bicicleta «Ejemplo (tutorial) 🎓» a tu lista; se borrará al terminar.',
      ),
    },
    {
      texto: T(
        'tut.app-garage.4.texto',
        'Los vehículos montables del mapa (bici, moto, auto, OVNI) son otra cosa: viven en el Inventario.',
      ),
    },
  ],
}
