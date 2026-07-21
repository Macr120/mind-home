import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirEditorInfra } from '../../core/tutorial/infraEditor'
import { useCaminos } from '../../core/state/caminosStore'
import { usePistaLibreEditor } from '../../core/state/pistaLibreStore'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const c = () => useCaminos.getState()
const tz = () => usePistaLibreEditor.getState()

export const tutorialCaminos: TutorialDef = {
  id: 'infra-caminos',
  titulo: T('tut.infra-caminos.titulo', 'Caminos'),
  resumen: T(
    'tut.infra-caminos.resumen',
    'Caminos pinta tres cosas sobre el mapa: pista de carreras, riel de tren y montaña rusa. Pintas celda a celda, subes o bajas la altura para hacer rampas y desniveles, y en la pista marcas la línea de meta. Hay además un modo de trazo libre que dibuja la pista con puntos de control unidos por una curva suave. Con la meta puesta, montarte en un vehículo y cruzarla arranca una carrera cronometrada; junto a un riel puedes subirte al tren o al carrito.',
  ),
  preparar: () => abrirEditorInfra(() => c().iniciar(), 'caminos.header'),
  pasos: [
    {
      sel: 'caminos.barra',
      texto: T(
        'tut.infra-caminos.1.texto',
        'Caminos se pinta sobre el mapa. Arriba eliges QUÉ construyes y abajo CÓMO lo aplicas; la cámara sigue navegable, así que arrastrar mueve la vista y un toque pinta.',
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
