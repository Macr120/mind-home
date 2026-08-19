import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { AMBAR_FOCO } from '../../core/state/zonaTutStore'
import { focoMapa, focoMeta, focoZona, focoZonaOffset } from '../../demo/mapa/focos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

// ─── Flujos de la casa demo: estos tours NO abren el editor de caminos —
// cuentan la pista de Pep@ tal como está en el mapa y mandan al visitante a
// correrla (el editor se puede abrir aparte; en demo nada de eso se guarda).

export const cuerpoCarrera: CuerpoTutorial = {
  pasos: [
    {
      zona: () => focoZona('zona-pista'),
      texto: T(
        'tut.infra-caminos--carrera.1.texto',
        'Esta es la pista de Pep@: un óvalo de asfalto con línea de meta a cuadros. Es la única meta del mapa — todo el modo carrera gira alrededor de ella.',
      ),
    },
    {
      foco: () => focoMeta(AMBAR_FOCO),
      texto: T(
        'tut.infra-caminos--carrera.2.texto',
        'Ahí está la meta. Acércate a la bici o al coche del patio y móntate con su botón; con el vehículo puesto, pisa esta línea y sale el semáforo.',
      ),
    },
    {
      foco: () => focoZonaOffset('zona-pista', 0, 0, 3, 4, { color: AMBAR_FOCO }),
      texto: T(
        'tut.infra-caminos--carrera.3.texto',
        'Pégate al óvalo y derrapa en las curvas para no perder velocidad. También puedes correr contra un asistente, con ítems de por medio: banana, turbo y bomba.',
      ),
    },
    {
      foco: () => focoMeta(AMBAR_FOCO),
      texto: T(
        'tut.infra-caminos--carrera.4.texto',
        'Junto a la meta vive la tabla de tiempos: la bici de Pep@ acumula 38 victorias y una mejor vuelta de 41.8 s. Bátela — los récords que hagas en la demo se guardan.',
      ),
    },
    {
      zona: () => focoMapa(),
      texto: T(
        'tut.infra-caminos--carrera.5.texto',
        'El riel que rodea el mapa y la montaña rusa de la feria también son caminos: camina sobre la vía y aparece «Montar». Cada trazo es su propia red.',
      ),
    },
  ],
}

export const cuerpoTrazos: CuerpoTutorial = {
  pasos: [
    {
      zona: () => focoMapa(),
      texto: T(
        'tut.infra-caminos--trazos.1.texto',
        'Hay tres trazos, y desde aquí se ven los tres: pista (para carreras), riel (el tren que rodea el mapa) y coaster (la montaña rusa, con alturas por celda). No se mezclan aunque se toquen: cada uno busca vecinos de su propio tipo.',
      ),
    },
    {
      foco: () => focoZonaOffset('zona-feria', 0, 0, 3, 3, { alto: 4, color: AMBAR_FOCO }),
      texto: T(
        'tut.infra-caminos--trazos.2.texto',
        'La montaña rusa de la feria sube hasta seis niveles y las rampas entre celda y celda se interpolan solas. Súbete: el carrito recorre el circuito cerrado.',
      ),
    },
    {
      texto: T(
        'tut.infra-caminos--trazos.3.texto',
        'En tu propia casa los dibujas celda a celda con el editor de Circuitos, o a mano alzada con el trazo libre por sectores. Aquí en la demo el mapa ya viene trazado.',
      ),
    },
  ],
}

