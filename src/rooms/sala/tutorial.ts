/**
 * Flujos de la sala: corren sobre los viajes de Pep@ en la casa demo. Los
 * pasos localizan sus lugares POR LOS REPOS y navegan con clicks — no crean
 * datos (en la casa demo cualquier escritura está bloqueada).
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { clickTut, esperarTut } from '../../core/tutorial/dom'
import { abrirApp } from '../../core/abrirApp'
import { lugaresViajeRepo } from '../../core/data/repository'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/**
 * Baja los tres niveles de la bitácora hasta los recuerdos de un lugar de
 * Japón: carpeta de país → tarjeta del lugar → sus entradas.
 */
async function abrirRecuerdosJapon(): Promise<void> {
  clickTut('sala.tab.bitacora')
  const lugares = await lugaresViajeRepo.list()
  const japon = lugares.filter((l) => l.visitado === 1 && /jap[óo]n|japan/i.test(l.pais))
  const lugar = japon.find((l) => /kioto|kyoto/i.test(l.nombre)) ?? japon[0]
  if (!lugar?.id) return
  await esperarTut(`sala.bitacora.album.${lugar.pais}`, 3000)
  clickTut(`sala.bitacora.album.${lugar.pais}`)
  await esperarTut(`sala.bitacora.lugar.${lugar.id}`, 3000)
  clickTut(`sala.bitacora.lugar.${lugar.id}`)
}

export const cuerpoMapa: CuerpoTutorial = {
  preparar: () => {
    abrirApp('sala', 'mapa')
  },
  pasos: [
    {
      sel: 'sala.mapa.stats',
      alEntrar: () => {
        clickTut('sala.tab.mapa')
      },
      titulo: T('tut.app-sala--mapa.1.titulo', 'Dónde has estado'),
      texto: T(
        'tut.app-sala--mapa.1.texto',
        'Cuatro países y unas cuantas ciudades: casi todas de un mismo viaje. Toca cualquiera de los tres números para ver la lista debajo del mapa.',
      ),
    },
    {
      sel: 'sala.mapa.mundi',
      titulo: T('tut.app-sala--mapa.2.titulo', 'Los pines'),
      texto: T(
        'tut.app-sala--mapa.2.texto',
        'Los siete pines juntos de Japón son las tres semanas del viaje. Los ámbar —Seúl, la Patagonia, Islandia— son lo que todavía no. Tocando el mapa se pone un pin nuevo donde quieras.',
      ),
    },
  ],
}

export const cuerpoJapon: CuerpoTutorial = {
  preparar: () => {
    abrirApp('sala', 'bitacora')
  },
  pasos: [
    {
      sel: 'sala.bitacora',
      alEntrar: () => {
        clickTut('sala.tab.bitacora')
      },
      titulo: T('tut.app-sala--japon.1.titulo', 'Los álbumes'),
      texto: T(
        'tut.app-sala--japon.1.texto',
        'Una carpeta por país, con su foto de portada. Dentro, una tarjeta por lugar y, dentro de cada una, lo que Pep@ escribió ese día.',
      ),
    },
    {
      sel: 'sala.bitacora.recuerdos',
      alEntrar: abrirRecuerdosJapon,
      titulo: T('tut.app-sala--japon.2.titulo', 'Lo que escribió allá'),
      texto: T(
        'tut.app-sala--japon.2.texto',
        'Ocho entradas del viaje, cada una con su foto: el Fuji al amanecer, el bambú de Arashiyama, los ciervos de Nara. Se escriben en el momento, con el olor todavía encima.',
      ),
    },
    {
      texto: T(
        'tut.app-sala--japon.3.texto',
        'Dentro de cada lugar, el botón «Itinerario» abre la hoja del viaje: día por día, de dónde a dónde, dónde durmió, cómo se movió y cuánto costó.',
      ),
    },
  ],
}

export const cuerpoProximo: CuerpoTutorial = {
  preparar: () => {
    abrirApp('sala', 'porConocer')
  },
  pasos: [
    {
      sel: 'sala.porConocer',
      alEntrar: () => {
        clickTut('sala.tab.porConocer')
      },
      titulo: T('tut.app-sala--proximo.1.titulo', 'Lo pendiente'),
      texto: T(
        'tut.app-sala--proximo.1.texto',
        'Tres sueños apuntados. Seúl ya tiene fecha y plan; la Patagonia e Islandia son todavía una idea. Los que tienen fecha aparecen en tu calendario.',
      ),
    },
    {
      sel: 'sala.pc.hoja',
      titulo: T('tut.app-sala--proximo.2.titulo', 'De la hoja a la meta'),
      texto: T(
        'tut.app-sala--proximo.2.texto',
        'Los ocho días de Corea suman lo que costaría el viaje, y esa suma se guarda como meta de ahorro en el despacho: verla crecer allá es verla acercarse acá.',
      ),
    },
    {
      sel: 'sala.rutas',
      alEntrar: () => {
        clickTut('sala.tab.rutas')
      },
      titulo: T('tut.app-sala--proximo.3.titulo', 'Rutas'),
      texto: T(
        'tut.app-sala--proximo.3.texto',
        'Una ruta encadena lugares en orden y los dibuja en el mapa. La de Japón es el recorrido que ya hizo; la de Corea, el que quiere hacer.',
      ),
    },
  ],
}

