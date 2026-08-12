/**
 * Flujos del diario personal: corren sobre el AÑO de Pep@ en la casa demo
 * (solo navegan y señalan; no crean datos — el guard lo impediría igual).
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const cuerpoDiario: CuerpoTutorial = {
  preparar: () => {
    abrirApp('anecdotario')
  },
  pasos: [
    {
      texto: T(
        'tut.app-anecdotario--diario.1.texto',
        'Este es el diario de Pep@: un año entero, dos o tres entradas por semana. Aquí se cuenta TODO el arco — del hartazgo del arranque al maratón de hace dos semanas.',
      ),
    },
    {
      sel: 'anecdotario.form',
      titulo: T('tut.app-anecdotario--diario.2.titulo', 'Así se escribe'),
      texto: T(
        'tut.app-anecdotario--diario.2.texto',
        'Elige el ánimo del día, pon un título si quieres, escribe y adjunta fotos. Con una foto basta: no hace falta texto.',
      ),
    },
    {
      sel: 'anecdotario.calendario',
      titulo: T('tut.app-anecdotario--diario.3.titulo', 'El año en colores'),
      texto: T(
        'tut.app-anecdotario--diario.3.texto',
        'Cada día se pinta con su ánimo. Mira el bache del mes 7 (la lesión) y lo brillante que se ve Japón. Toca un día para filtrar sus entradas.',
      ),
    },
    {
      sel: 'anecdotario.lista',
      titulo: T('tut.app-anecdotario--diario.4.titulo', 'El archivador'),
      texto: T(
        'tut.app-anecdotario--diario.4.texto',
        'Las entradas se guardan solas en carpetas por año, mes y semana. Abre las semanas de Japón y lee el viaje completo.',
      ),
    },
  ],
}

export const cuerpoFotos: CuerpoTutorial = {
  preparar: () => {
    abrirApp('anecdotario')
  },
  pasos: [
    {
      texto: T(
        'tut.app-anecdotario--fotos.1.texto',
        'Los hitos del año de Pep@ llevan foto: el teclado usado, la llegada de Laika, dos postales de Japón y la medalla del maratón.',
      ),
    },
    {
      sel: 'anecdotario.lista',
      titulo: T('tut.app-anecdotario--fotos.2.titulo', 'Búscalas en el historial'),
      texto: T(
        'tut.app-anecdotario--fotos.2.texto',
        'Abre el mes 2 (el teclado), el mes 9 (Japón) o hace dos semanas (la medalla). Toca cualquier foto y se abre a pantalla completa.',
      ),
    },
    {
      texto: T(
        'tut.app-anecdotario--fotos.3.texto',
        'Cada entrada alimenta la racha y despierta al personaje: escribir aquí también es cuidar la casa.',
      ),
    },
  ],
}

