/**
 * ESENCIAL del estudio musical: corre en la casa real y recorre las dos
 * pestañas sin crear datos. No entra al editor: abrir una canción de fábrica la
 * materializa como proyecto (`Albumes.tsx`), así que el editor se explica en
 * pasos sin spotlight, con la lista a la vista.
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, esperarTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/**
 * Deja a la vista la pestaña Canciones. El tour puede lanzarse con un proyecto
 * abierto (el «?» de la app) y el editor tapa las pestañas: se cierra primero,
 * y él mismo guarda al desmontarse. Sin editor, ese `clickTut` no hace nada.
 */
const aCanciones = async () => {
  clickTut('audio.editor.volver')
  await esperarTut('audio.tab.canciones', 4000)
  clickTut('audio.tab.canciones')
}

export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('audio')
  },
  pasos: [
    {
      titulo: T('tut.app-audio--esencial.1.titulo', 'El estudio musical'),
      texto: T(
        'tut.app-audio--esencial.1.texto',
        'Aquí se compone, se graba y se mezcla música. Son dos menús: Canciones, con tus proyectos y el editor donde se hacen, y Mezclar, con dos platos de DJ.',
      ),
    },
    {
      sel: 'audio.tab.canciones',
      titulo: T('tut.app-audio--esencial.2.titulo', 'Canciones'),
      texto: T(
        'tut.app-audio--esencial.2.texto',
        'Tus proyectos comparten la lista con canciones de fábrica, piezas conocidas de dominio público. Cada tarjeta se escucha aquí mismo, se abre en el editor o se guarda en un álbum, que funciona como una carpeta.',
      ),
      alEntrar: aCanciones,
    },
    {
      sel: 'audio.canciones.crear',
      titulo: T('tut.app-audio--esencial.3.titulo', 'Empezar una canción'),
      texto: T(
        'tut.app-audio--esencial.3.texto',
        '«Nuevo proyecto» abre el editor con una pista vacía, e «Importar .mid» convierte un archivo MIDI en un proyecto con sus notas.',
      ),
      alEntrar: async () => {
        await aCanciones()
        // Dentro de un álbum la cabecera es otra: los dos botones viven en la raíz.
        clickTut('audio.album.volver')
      },
    },
    {
      titulo: T('tut.app-audio--esencial.4.titulo', 'El editor'),
      texto: T(
        'tut.app-audio--esencial.4.texto',
        'Al abrir una canción, el editor ocupa el cuarto: las pistas a la izquierda y el piano roll a la derecha, donde las notas se dibujan sobre la rejilla. Cada pista lleva su instrumento sintetizado, del piano a la batería, y se toca con el teclado en pantalla, el físico o uno MIDI.',
      ),
    },
    {
      titulo: T('tut.app-audio--esencial.5.titulo', 'Grabar, exportar y la IA'),
      texto: T(
        'tut.app-audio--esencial.5.texto',
        'El botón de grabar da un compás de cuenta con metrónomo y guarda lo que tocas como notas; en una pista de audio, graba el micrófono. En «Extras» están «Practicar», «WAV» para descargar la canción e «IA», que compone o continúa la pista activa.',
      ),
    },
    {
      sel: 'audio.grabaciones',
      titulo: T('tut.app-audio--esencial.6.titulo', 'Grabaciones'),
      texto: T(
        'tut.app-audio--esencial.6.texto',
        'Las tomas de micrófono quedan aquí aunque las quites de su pista o borres el proyecto. Se escuchan, se renombran y se descargan.',
      ),
      alEntrar: aCanciones,
    },
    {
      sel: 'audio.tab.mezclar',
      titulo: T('tut.app-audio--esencial.7.titulo', 'Mezclar'),
      texto: T(
        'tut.app-audio--esencial.7.texto',
        'Dos platos de DJ unidos por un crossfader. «Cargar canción» trae una del estudio, un audio de tu dispositivo o una muestra de iTunes, y cada plato tiene pitch, ecualizador, cue y SYNC para igualar el tempo.',
      ),
      alEntrar: async () => {
        await esperarTut('audio.tab.mezclar', 4000)
        clickTut('audio.tab.mezclar')
      },
    },
  ],
}
