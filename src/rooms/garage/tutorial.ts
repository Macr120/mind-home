/**
 * Flujos del garaje: corren sobre el año de Pep@ en la casa demo. Los pasos
 * localizan sus dos vehículos POR LOS REPOS y navegan con clicks — no crean
 * datos (en la casa demo cualquier escritura está bloqueada).
 */
import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { clickTut, esperarTut } from '../../core/tutorial/dom'
import { abrirApp } from '../../core/abrirApp'
import { vehiculosRepo } from '../../core/data/repository'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/**
 * Entra al detalle de un vehículo por su tipo. Sale antes del detalle en que
 * estuviera: dentro de una ficha las pestañas del garaje no están montadas.
 */
async function abrirVehiculo(tipo: 'bicicleta' | 'auto'): Promise<void> {
  clickTut('garage.detalle.volver')
  clickTut('garage.tab.vehiculos')
  const vehiculos = await vehiculosRepo.list()
  const v = vehiculos.find((x) => x.tipo === tipo) ?? vehiculos[0]
  if (v?.id == null) return
  await esperarTut(`garage.veh.item.${v.id}`, 3000)
  clickTut(`garage.veh.item.${v.id}`)
}

/** Vuelve al garaje y abre una de sus pestañas (sirva o no desde un detalle). */
async function irAPestana(tab: 'resumen' | 'vehiculos' | 'talleres'): Promise<void> {
  clickTut('garage.detalle.volver')
  await esperarTut(`garage.tab.${tab}`, 3000)
  clickTut(`garage.tab.${tab}`)
}

const flujoVehiculos: TutorialDef = {
  id: 'app-garage--vehiculos',
  titulo: T('tut.app-garage--vehiculos.titulo', 'Una bici y un coche viejo'),
  resumen: T(
    'tut.app-garage--vehiculos.resumen',
    'El garaje lleva el mantenimiento de tus vehículos reales: cada uno con su ficha, su kilometraje y su historial de servicios. Arriba, un semáforo te dice si algo urge.',
  ),
  preparar: () => {
    abrirApp('garage')
  },
  pasos: [
    {
      sel: 'garage.resumen.semaforo',
      alEntrar: () => irAPestana('resumen'),
      titulo: T('tut.app-garage--vehiculos.1.titulo', '¿Me urge algo?'),
      texto: T(
        'tut.app-garage--vehiculos.1.texto',
        'Un solo semáforo para no tener que leer dos listas: rojo si algo venció, ámbar si viene en camino, verde si el garaje está en paz.',
      ),
    },
    {
      sel: 'garage.resumen.stats',
      titulo: T('tut.app-garage--vehiculos.2.titulo', 'Lo que llevas gastado'),
      texto: T(
        'tut.app-garage--vehiculos.2.texto',
        'Cuántos vehículos, cuántos trámites vivos y lo que llevas gastado en el año. A Pep@ el coche le salió caro.',
      ),
    },
    {
      sel: 'garage.detalle.historial',
      alEntrar: () => abrirVehiculo('bicicleta'),
      titulo: T('tut.app-garage--vehiculos.3.titulo', 'La bici de todos los días'),
      texto: T(
        'tut.app-garage--vehiculos.3.texto',
        'Su transporte real: cadena, cámaras, frenos. Fíjate cómo los servicios se juntan en los últimos meses — es el entrenamiento del maratón pasándole factura.',
      ),
    },
    {
      sel: 'garage.detalle.historial',
      alEntrar: () => abrirVehiculo('auto'),
      titulo: T('tut.app-garage--vehiculos.4.titulo', 'Y el coche heredado'),
      texto: T(
        'tut.app-garage--vehiculos.4.texto',
        'Aquí está la avería del mes 7: se quedó tirado, hubo grúa y casi diez mil pesos que no tenía. Cada servicio guarda su costo, su kilometraje y en qué taller fue.',
      ),
    },
    {
      sel: 'garage.detalle.portada',
      titulo: T('tut.app-garage--vehiculos.5.titulo', 'La ficha'),
      texto: T(
        'tut.app-garage--vehiculos.5.texto',
        'Marca, modelo, año, placas y el kilometraje al día. Con las placas puestas, el garaje habilita los trámites que solo aplican a un coche.',
      ),
    },
  ],
}

const flujoTramites: TutorialDef = {
  id: 'app-garage--tramites',
  titulo: T('tut.app-garage--tramites.titulo', 'Trámites que se agendan solos'),
  resumen: T(
    'tut.app-garage--tramites.resumen',
    'Programa la verificación, la tenencia, el seguro o el servicio periódico y el garaje pone su bloque en el calendario, más un aviso con la anticipación que le pidas.',
  ),
  preparar: () => {
    abrirApp('garage')
  },
  pasos: [
    {
      sel: 'garage.tramites',
      alEntrar: () => abrirVehiculo('auto'),
      titulo: T('tut.app-garage--tramites.1.titulo', 'Lo que viene'),
      texto: T(
        'tut.app-garage--tramites.1.texto',
        'Cada trámite guarda su próximo vencimiento, cada cuántos meses se repite y cuánto cuesta. Al completarlo, la fecha salta sola al siguiente.',
      ),
    },
    {
      sel: 'garage.tramites',
      alEntrar: () => abrirVehiculo('bicicleta'),
      titulo: T('tut.app-garage--tramites.2.titulo', 'La bici no paga tenencia'),
      texto: T(
        'tut.app-garage--tramites.2.texto',
        'Sin placas, el garaje esconde los trámites que no aplican: a la bici solo le ofrece su afinación periódica.',
      ),
    },
    {
      sel: 'garage.talleres',
      alEntrar: () => irAPestana('talleres'),
      titulo: T('tut.app-garage--tramites.3.titulo', 'La libreta'),
      texto: T(
        'tut.app-garage--tramites.3.texto',
        'El taller de confianza, la aseguradora, el verificentro, la ciclería del barrio y la grúa de aquella noche — con teléfono y dirección a un toque.',
      ),
    },
    {
      texto: T(
        'tut.app-garage--tramites.4.texto',
        'Todos esos trámites están también en el calendario de la casa, con su aviso previo. Y ojo: los vehículos que se manejan por el mapa son otra cosa, viven en el Inventario.',
      ),
    },
  ],
}

export const flujosGarage: TutorialDef[] = [flujoVehiculos, flujoTramites]
