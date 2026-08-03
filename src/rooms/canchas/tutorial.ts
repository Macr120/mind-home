import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirEditorInfra } from '../../core/tutorial/infraEditor'
import { useCanchas } from '../../core/state/canchasStore'
import { focoCanchas, focoZona } from '../../demo/mapa/focos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const k = () => useCanchas.getState()

export const tutorialCanchas: TutorialDef = {
  id: 'infra-canchas',
  titulo: T('tut.infra-canchas.titulo', 'Canchas'),
  resumen: T(
    'tut.infra-canchas.resumen',
    'Canchas coloca canchas de fútbol, tenis, básquet y béisbol sobre el mapa: eliges el deporte, el color del piso y el tamaño, y un fantasma te muestra dónde va a caer antes de soltarla. En modo Editar tocas una cancha ya puesta para cambiarle color, tamaño y rotación, o quitarla. Después, al entrar caminando a una cancha empieza el minijuego: solo o contra un asistente, con dificultad y marcador.',
  ),
  preparar: () => abrirEditorInfra(() => k().iniciar(), 'canchas.header'),
  pasos: [
    {
      sel: 'canchas.barra',
      texto: T(
        'tut.infra-canchas.1.texto',
        'Las canchas se colocan enteras sobre el mapa, no celda a celda. Arriba eliges el deporte y abajo cambian los controles según lo que estés haciendo.',
      ),
    },
    {
      sel: 'canchas.clase.futbol',
      alEntrar: () => k().setClase('futbol'),
      titulo: T('tut.infra-canchas.2.titulo', 'El deporte'),
      texto: T(
        'tut.infra-canchas.2.texto',
        'Fútbol, tenis, básquet o béisbol. Al elegir uno, un fantasma de la cancha sigue tu cursor por el mapa: el toque la coloca ahí.',
      ),
    },
    {
      sel: 'canchas.panel.colocar',
      titulo: T('tut.infra-canchas.3.titulo', 'Color y tamaño'),
      texto: T(
        'tut.infra-canchas.3.texto',
        'Antes de colocarla decides el color del piso y su tamaño, entre la mitad y el doble. El fantasma ya te la muestra tal cual va a quedar.',
      ),
    },
    {
      sel: 'canchas.rotar',
      titulo: T('tut.infra-canchas.4.titulo', 'Orientación'),
      texto: T(
        'tut.infra-canchas.4.texto',
        'Este botón (o la tecla R) gira el fantasma 90°, para acomodar la cancha a lo largo o a lo ancho del terreno que tengas libre.',
      ),
    },
    {
      sel: 'canchas.panel.vacio',
      alEntrar: async (ctx) => {
        k().setClase(null)
        await ctx.unaVez('canchas-limpieza', async () => {
          ctx.alLimpiar(() => k().setClase('futbol')) // no dejar el editor en modo Editar
        })
      },
      esperar: 'canchas.panel.vacio',
      titulo: T('tut.infra-canchas.5.titulo', 'Modo Editar'),
      texto: T(
        'tut.infra-canchas.5.texto',
        'Editar apaga el fantasma: ahora el toque selecciona una cancha que ya esté en el mapa. Al seleccionarla, aquí abajo salen su color, su tamaño, el giro y el bote para quitarla, y los cambios se ven en vivo.',
      ),
    },
    {
      titulo: T('tut.infra-canchas.6.titulo', 'Jugar'),
      texto: T(
        'tut.infra-canchas.6.texto',
        'Fuera del editor, al entrar caminando a una cancha te pregunto cómo quieres jugar: solo o contra un asistente, y con qué dificultad. Aparece el marcador y, donde estaba el cubo de vistas, el botón de acción: en fútbol y básquet lo mantienes para cargar la potencia y lo sueltas para tirar; en tenis das un toque para sacar y para golpear cuando la pelota bota cerca (apuntas con el frente de tu personaje, y el timing decide si sale profunda o se queda en la red), y en béisbol te plantas solo en la caja de bateo: mantienes para cargar el swing y sueltas cuando el lanzamiento te llega. Buen contacto es hit, y con fuerza suficiente se va sobre la barda de home run (tres strikes son ponche). La barra espaciadora hace lo mismo.',
      ),
    },
    {
      titulo: T('tut.infra-canchas.7.titulo', 'El marcador'),
      texto: T(
        'tut.infra-canchas.7.texto',
        'El marcador se queda en pantalla durante el partido. El tenis lleva juegos y sets como uno de verdad, y jugando solo se te guarda el mejor peloteo como récord.',
      ),
    },
    {
      sel: 'canchas.salir',
      titulo: T('tut.infra-canchas.8.titulo', 'Listo'),
      texto: T(
        'tut.infra-canchas.8.texto',
        'Se guarda solo. Sal con la ✕ y ve caminando a estrenar la cancha. Por chat también puedes pedirme «pon una cancha de fútbol».',
      ),
    },
  ],
}

// ─── Flujo de la casa demo: el editor de canchas está bloqueado en demo
// (colocar canchas edita el mapa), así que el tour no lo abre — manda al
// visitante a JUGAR el complejo que ya está construido.

const flujoJugar: TutorialDef = {
  id: 'infra-canchas--jugar',
  titulo: T('tut.infra-canchas--jugar.titulo', 'Jugar en las canchas'),
  resumen: T(
    'tut.infra-canchas--jugar.resumen',
    'El complejo deportivo del demo: cómo arranca cada juego al entrar a la cancha y los marcadores de Pep@ que puedes mejorar.',
  ),
  pasos: [
    {
      zona: () => focoZona('zona-canchas'),
      texto: T(
        'tut.infra-canchas--jugar.1.texto',
        'Este es el complejo deportivo de Pep@: fútbol, básquet, tenis y béisbol, uno junto a otro. Cada cancha es un rectángulo sobre el mapa — entrar caminando a él arranca su juego.',
      ),
    },
    {
      foco: () => focoCanchas('futbol', 'basket'),
      texto: T(
        'tut.infra-canchas--jugar.5.texto',
        'Arriba, la cancha de fútbol y la de básquet. El fútbol se juega con dribbling y tiro; el básquet, midiendo la potencia del lanzamiento.',
      ),
    },
    {
      foco: () => focoCanchas('beisbol', 'tenis'),
      texto: T(
        'tut.infra-canchas--jugar.3.texto',
        'Abajo, el campo de béisbol y la cancha de tenis: el tenis tiene rebote y peloteo, y el béisbol es puro bateo, contra máquina o pitcher.',
      ),
    },
    {
      texto: T(
        'tut.infra-canchas--jugar.2.texto',
        'El botón de carga aparece en el hueco del cubo de navegación y tira hacia donde mira tu personaje: apunta primero, carga después.',
      ),
    },
    {
      foco: () => focoCanchas('basket'),
      texto: T(
        'tut.infra-canchas--jugar.4.texto',
        'El marcador se guarda por cancha: Pep@ dejó un 21-15 en básquet y una racha de 18 peloteos en tenis. En la demo los partidos cuentan — mejóralos.',
      ),
    },
  ],
}

export const flujosCanchas: TutorialDef[] = [flujoJugar]
