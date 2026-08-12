import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { focoCanchas, focoZona } from '../../demo/mapa/focos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

// ─── Flujo de la casa demo: el editor de canchas está bloqueado en demo
// (colocar canchas edita el mapa), así que el tour no lo abre — manda al
// visitante a JUGAR el complejo que ya está construido.

export const cuerpoJugar: CuerpoTutorial = {
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

