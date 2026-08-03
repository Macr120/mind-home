import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { focoZona } from '../../demo/mapa/focos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

// Flujo de la casa demo (el primer tutorial de paintball): no construye nada —
// paintball es puro modo de juego y en demo se juega de verdad.
const flujoBatalla: TutorialDef = {
  id: 'infra-paintball--batalla',
  titulo: T('tut.infra-paintball--batalla.titulo', 'Batalla de paintball'),
  resumen: T(
    'tut.infra-paintball--batalla.resumen',
    'Cómo armar una batalla 1v1, 2v2 o campal contra los asistentes, con la casa entera como campo.',
  ),
  pasos: [
    {
      sel: 'herr.boton',
      texto: T(
        'tut.infra-paintball--batalla.1.texto',
        'Abre la rueda de herramientas: ahí vive Paintball, en la categoría de construcción y juegos, junto a los vehículos.',
      ),
    },
    {
      texto: T(
        'tut.infra-paintball--batalla.2.texto',
        'Elige el modo: 1v1, 2v2 o batalla campal. Tus rivales son los asistentes del mapa — Laika cuenta — y se juega en la planta baja.',
      ),
    },
    {
      zona: () => focoZona('zona-casa'),
      texto: T(
        'tut.infra-paintball--batalla.3.texto',
        'La casa entera es el campo: cúbrete tras los muros, asómate a disparar y cuida la espalda. Las salpicaduras se quedan pintadas durante la batalla.',
      ),
    },
    {
      texto: T(
        'tut.infra-paintball--batalla.4.texto',
        'El marcador de Pep@ va 47 victorias por 23 derrotas. En la demo las batallas cuentan de verdad: súbelo antes de irte.',
      ),
    },
  ],
}

export const flujosPaintball: TutorialDef[] = [flujoBatalla]
