/**
 * Flujos del garaje: corren sobre el año de Pep@ en la casa demo. Los pasos
 * localizan sus dos vehículos POR LOS REPOS y navegan con clicks — no crean
 * datos (en la casa demo cualquier escritura está bloqueada).
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
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
async function irAPestana(tab: 'resumen' | 'vehiculos'): Promise<void> {
  clickTut('garage.detalle.volver')
  await esperarTut(`garage.tab.${tab}`, 3000)
  clickTut(`garage.tab.${tab}`)
}

/** Abre uno de los tres cuadernos de la ficha (ya estando dentro de un vehículo). */
async function irACuaderno(tab: 'tramites' | 'documentos' | 'contactos'): Promise<void> {
  await esperarTut(`garage.detalle.tab.${tab}`, 3000)
  clickTut(`garage.detalle.tab.${tab}`)
}

export const cuerpoVehiculos: CuerpoTutorial = {
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
      sel: 'garage.veh.alta',
      titulo: T('tut.app-garage--vehiculos.2b.titulo', 'Dar de alta uno nuevo'),
      texto: T(
        'tut.app-garage--vehiculos.2b.texto',
        'Nombre, tipo, marca, modelo, año, placas y el odómetro de hoy. Con las placas puestas, el garaje sabe qué trámites ofrecerte más adelante.',
      ),
      alEntrar: () => irAPestana('vehiculos'),
    },
    {
      sel: 'garage.detalle.historial',
      alEntrar: () => abrirVehiculo('bicicleta'),
      titulo: T('tut.app-garage--vehiculos.3.titulo', 'La bici de todos los días'),
      texto: T(
        'tut.app-garage--vehiculos.3.texto',
        'Su transporte real: cadena, cámaras, frenos, uno por uno en su propio renglón — el mismo archivador de carpetas por año y mes que usan otras apps. Fíjate cómo los servicios se juntan en los últimos meses: es el entrenamiento del maratón pasándole factura.',
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

export const cuerpoTramites: CuerpoTutorial = {
  preparar: () => {
    abrirApp('garage')
  },
  pasos: [
    {
      sel: 'garage.detalle.tabs',
      alEntrar: () => abrirVehiculo('auto'),
      titulo: T('tut.app-garage--tramites.tabs.titulo', 'Tres cuadernos'),
      texto: T(
        'tut.app-garage--tramites.tabs.texto',
        'La ficha de cada vehículo reparte sus papeles en tres cuadernos: Trámites, Documentos y Contactos. El historial de servicios queda siempre debajo, se mire el cuaderno que se mire.',
      ),
    },
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
        'Sin placas solo se ofrece lo que aplica: a la bici, su mantenimiento periódico. La verificación, la tenencia o el seguro piden placas, así que su cuaderno de Documentos queda vacío.',
      ),
    },
    {
      sel: 'garage.documentos',
      alEntrar: async () => {
        await abrirVehiculo('auto')
        await irACuaderno('documentos')
      },
      titulo: T('tut.app-garage--tramites.2b.titulo', 'Los papeles, aparte'),
      texto: T(
        'tut.app-garage--tramites.2b.texto',
        'La tarjeta de circulación, la póliza y la tenencia no se mezclan con lo que se hace en el taller: tienen su propio cuaderno, con folio, vencimiento y aviso previo.',
      ),
    },
    {
      sel: 'garage.talleres',
      alEntrar: () => irACuaderno('contactos'),
      titulo: T('tut.app-garage--tramites.3.titulo', 'El cuaderno de Contactos'),
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

/**
 * ESENCIAL: corre en la casa real y recorre las dos pestañas raíz del garaje.
 * Sin entrar a ningún detalle de vehículo (sus pestañas raíz no están montadas
 * dentro de una ficha): sus anclas son la fila de pestañas y un par de
 * elementos fijos que existen con la BD vacía (el semáforo y la lista de
 * vehículos se siembran solos al montar la app, pero no se señalan filas de
 * datos, solo cabeceras y botones).
 */
export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('garage')
  },
  pasos: [
    {
      titulo: T('tut.app-garage--esencial.1.titulo', 'El garaje'),
      texto: T(
        'tut.app-garage--esencial.1.texto',
        'El garaje lleva tus vehículos: bicicletas, autos, motos y lo que uses para moverte. Cada uno con su historial de servicios y sus trámites, y todo lo que tenga fecha se agenda solo en el calendario de la casa.',
      ),
    },
    {
      sel: 'garage.tab.resumen',
      titulo: T('tut.app-garage--esencial.2.titulo', 'Resumen'),
      texto: T(
        'tut.app-garage--esencial.2.texto',
        'La pestaña de entrada: un semáforo dice de un vistazo si algo venció, si algo se acerca o si el garaje está en paz.',
      ),
      alEntrar: async () => {
        await esperarTut('garage.tab.resumen', 4000)
        clickTut('garage.tab.resumen')
      },
    },
    {
      sel: 'garage.resumen.stats',
      titulo: T('tut.app-garage--esencial.3.titulo', 'De un vistazo'),
      texto: T(
        'tut.app-garage--esencial.3.texto',
        'Cuántos vehículos tienes, cuántos trámites siguen activos y lo que llevas gastado en el año.',
      ),
    },
    {
      sel: 'garage.tab.vehiculos',
      titulo: T('tut.app-garage--esencial.4.titulo', 'Vehículos'),
      texto: T(
        'tut.app-garage--esencial.4.texto',
        'La lista completa, con placa, kilometraje y número de servicios en cada tarjeta. Al tocar uno se abre su ficha, con el historial de servicios y sus trámites.',
      ),
      alEntrar: () => {
        clickTut('garage.tab.vehiculos')
      },
    },
    {
      sel: 'garage.veh.alta',
      titulo: T('tut.app-garage--esencial.5.titulo', 'Dar de alta uno nuevo'),
      texto: T(
        'tut.app-garage--esencial.5.texto',
        'Nombre, tipo, marca, modelo, año, placas y el odómetro de hoy. Con las placas puestas, la ficha habilita también los trámites que solo aplican a un vehículo con matrícula, como la verificación o la tenencia.',
      ),
    },
  ],
}

