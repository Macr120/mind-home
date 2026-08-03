import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirEditorInfra } from '../../core/tutorial/infraEditor'
import { useCaminos } from '../../core/state/caminosStore'
import { usePistaLibreEditor } from '../../core/state/pistaLibreStore'
import { encenderParaTutorial } from '../_shared/ejemplos/tipos'
import { ejemploCaminos } from './ejemplos'
import { AMBAR_FOCO } from '../../core/state/zonaTutStore'
import { focoMapa, focoMeta, focoZona, focoZonaOffset } from '../../demo/mapa/focos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const c = () => useCaminos.getState()
const tz = () => usePistaLibreEditor.getState()

export const tutorialCaminos: TutorialDef = {
  id: 'infra-caminos',
  titulo: T('tut.infra-caminos.titulo', 'Circuitos'),
  resumen: T(
    'tut.infra-caminos.resumen',
    'Circuitos pinta tres cosas sobre el mapa: pista de carreras, riel de tren y montaña rusa. Pintas celda a celda, subes o bajas la altura para hacer rampas y desniveles, y en la pista marcas la línea de meta. Hay además un modo de trazo libre que dibuja la pista con puntos de control unidos por una curva suave. Con la meta puesta, montarte en un vehículo y cruzarla arranca una carrera cronometrada; junto a un riel puedes subirte al tren o al carrito.',
  ),
  preparar: () => abrirEditorInfra(() => c().iniciar(), 'caminos.header'),
  pasos: [
    {
      sel: 'caminos.barra',
      // Un circuito cerrado de ejemplo: la meta y el modo carrera no se
      // entienden mirando celdas sueltas.
      alEntrar: async (ctx) => {
        await ctx.unaVez('ejemplo', async () => {
          const apagar = await encenderParaTutorial(ejemploCaminos)
          if (apagar) ctx.alLimpiar(apagar)
        })
      },
      texto: T(
        'tut.infra-caminos.1.texto',
        'Caminos se pinta sobre el mapa. Arriba eliges QUÉ construyes y abajo CÓMO lo aplicas; la cámara sigue navegable, así que arrastrar mueve la vista y un toque pinta. Encendí un circuito de ejemplo con su meta; se esconde al terminar.',
      ),
    },
    {
      sel: 'caminos.tipo.pista',
      alEntrar: () => c().setTipo('pista'),
      titulo: T('tut.infra-caminos.2.titulo', 'Tres tipos de trazado'),
      texto: T(
        'tut.infra-caminos.2.texto',
        'Pista de carreras para los vehículos, riel para el tren y montaña rusa para el carrito. Empecemos por la pista.',
      ),
    },
    {
      sel: 'caminos.herr.pintar',
      alEntrar: () => c().setHerramienta('pintar'),
      titulo: T('tut.infra-caminos.3.titulo', 'Pintar y borrar'),
      texto: T(
        'tut.infra-caminos.3.texto',
        'Con Pintar, cada celda que toques se vuelve tramo, y las curvas y los cruces se dibujan solos según cómo se toquen entre sí. Si la celda ya tenía otro tipo, se reemplaza conservando su altura; el borrador quita el tramo.',
      ),
    },
    {
      sel: 'caminos.herr.meta',
      alEntrar: () => c().setTipo('pista'),
      esperar: 'caminos.herr.meta',
      titulo: T('tut.infra-caminos.4.titulo', 'La línea de meta'),
      texto: T(
        'tut.infra-caminos.4.texto',
        'Solo la pista la tiene, y solo hay una en todo el mapa: al ponerla en otra celda se quita de la anterior. Sin meta no hay carrera.',
      ),
    },
    {
      sel: 'caminos.herr.subir',
      alEntrar: () => c().setHerramienta('subir'),
      titulo: T('tut.infra-caminos.5.titulo', 'Altura'),
      texto: T(
        'tut.infra-caminos.5.texto',
        'Subir y Bajar cambian de nivel un tramo ya pintado, hasta seis niveles. Sirve para los desniveles de la montaña rusa y también para elevar pista o riel: las rampas entre alturas distintas se resuelven solas.',
      ),
    },
    {
      sel: 'caminos.tipo.riel',
      alEntrar: () => c().setTipo('riel'),
      titulo: T('tut.infra-caminos.6.titulo', 'Riel y montaña rusa'),
      texto: T(
        'tut.infra-caminos.6.texto',
        'Se pintan igual que la pista. El riel es para el tren, plano; la montaña rusa es la que pide altura para que valga la pena.',
      ),
    },
    {
      sel: 'caminos.barra.trazo',
      alEntrar: async (ctx) => {
        await tz().entrar() // async: crea/lee la fila de la pista libre
        await ctx.unaVez('trazo-limpieza', async () => {
          ctx.alLimpiar(() => tz().salir()) // no dejar al usuario en el sub-modo
        })
      },
      esperar: 'caminos.barra.trazo',
      titulo: T('tut.infra-caminos.7.titulo', 'Trazo libre'),
      texto: T(
        'tut.infra-caminos.7.texto',
        'Otra forma de hacer pista: en vez de celdas cuadriculadas, pones puntos de control sobre el mapa y se unen con una curva suave. Sale una cinta de asfalto con curvas de verdad.',
      ),
    },
    {
      sel: 'caminos.trazo.punto',
      alEntrar: () => tz().setHerramienta('punto'),
      titulo: T('tut.infra-caminos.8.titulo', 'Puntos'),
      texto: T(
        'tut.infra-caminos.8.texto',
        'Toca el mapa para ir poniendo puntos: el primero es la meta. Con las otras dos herramientas mueves un punto arrastrándolo o lo borras.',
      ),
    },
    {
      sel: 'caminos.trazo.cerrar',
      titulo: T('tut.infra-caminos.9.titulo', 'Cerrar el circuito'),
      texto: T(
        'tut.infra-caminos.9.texto',
        'Une el último punto con el primero. Hasta que el circuito no esté cerrado no se puede correr en él. El bote de basura borra el trazo entero y empiezas de cero.',
      ),
    },
    {
      titulo: T('tut.infra-caminos.10.titulo', 'Correr'),
      texto: T(
        'tut.infra-caminos.10.texto',
        'Ya fuera del editor: móntate en un vehículo con la rueda de herramientas y cruza la línea de meta. Sale el panel de carrera para elegir vueltas, dificultad y un asistente como rival; después arranca el semáforo y corres con crono, mejores tiempos por vehículo, cajas de ítems y botón de derrape.',
      ),
    },
    {
      titulo: T('tut.infra-caminos.11.titulo', 'El tren y el carrito'),
      texto: T(
        'tut.infra-caminos.11.texto',
        'Si caminas junto a un riel o a la montaña rusa aparece el botón para montarte: te subes y el vehículo recorre el trazado solo. Otro botón te baja cuando quieras.',
      ),
    },
    {
      sel: 'caminos.salir',
      titulo: T('tut.infra-caminos.12.titulo', 'Listo'),
      texto: T(
        'tut.infra-caminos.12.texto',
        'Se guarda solo mientras pintas. La ✕ cierra el editor y te devuelve la vista con la que entraste. Por chat también puedes pedirme «corre una carrera de 3 vueltas».',
      ),
    },
  ],
}

// ─── Flujos de la casa demo: estos tours NO abren el editor de caminos —
// cuentan la pista de Pep@ tal como está en el mapa y mandan al visitante a
// correrla (el editor se puede abrir aparte; en demo nada de eso se guarda).

const flujoCarrera: TutorialDef = {
  id: 'infra-caminos--carrera',
  titulo: T('tut.infra-caminos--carrera.titulo', 'Correr en la pista'),
  resumen: T(
    'tut.infra-caminos--carrera.resumen',
    'La pista del demo, la meta, cómo arrancar una carrera montado y la tabla de récords de Pep@ que puedes batir.',
  ),
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
      foco: () => focoZonaOffset('zona-pista', 1, 0, 4, 4, { color: AMBAR_FOCO }),
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

const flujoTrazos: TutorialDef = {
  id: 'infra-caminos--trazos',
  titulo: T('tut.infra-caminos--trazos.titulo', 'Pista, riel y coaster'),
  resumen: T(
    'tut.infra-caminos--trazos.resumen',
    'Los tres tipos de trazo del mapa y cómo se dibujan en tu propia casa.',
  ),
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

export const flujosCaminos: TutorialDef[] = [flujoCarrera, flujoTrazos]
