/**
 * Flujos del jardín: corren sobre el año de práctica de Pep@ en la casa demo
 * (solo navegan y señalan; no crean datos).
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const cuerpoPracticar: CuerpoTutorial = {
  preparar: () => {
    abrirApp('jardin', 'meditacion')
  },
  pasos: [
    {
      sel: 'jardin.calma',
      titulo: T('tut.app-jardin--practicar.1.titulo', 'La calma acumulada'),
      texto: T(
        'tut.app-jardin--practicar.1.texto',
        'Cada minuto de práctica riega este jardín. El de Pep@ creció un año entero: de semilla a bosque.',
      ),
    },
    {
      sel: 'jardin.med.pistas',
      titulo: T('tut.app-jardin--practicar.2.titulo', 'Meditar con sonido'),
      texto: T(
        'tut.app-jardin--practicar.2.texto',
        'Elige una pista (bosque, mar, lluvia, cuencos) y una duración, o medita en silencio con campana. La sesión se guarda sola al terminar.',
      ),
      alEntrar: () => {
        clickTut('jardin.tab.meditacion')
      },
    },
    {
      sel: 'jardin.med.sesiones',
      titulo: T('tut.app-jardin--practicar.3.titulo', 'Un año de sesiones'),
      texto: T(
        'tut.app-jardin--practicar.3.texto',
        'Aquí está el año de Pep@: empezó con tres por semana y en el mes 7 —la lesión, el gasto del coche— la práctica se volvió casi diaria. Fue lo que sostuvo el bache.',
      ),
    },
    {
      sel: 'jardin.resp.patron',
      titulo: T('tut.app-jardin--practicar.4.titulo', 'Respirar'),
      texto: T(
        'tut.app-jardin--practicar.4.texto',
        'Dos patrones guiados: la caja 4-4-4-4 para centrarte y el 4-7-8 para soltar el día. La pantalla respira contigo.',
      ),
      alEntrar: () => {
        clickTut('jardin.tab.respiracion')
      },
    },
  ],
}

export const cuerpoGratitud: CuerpoTutorial = {
  preparar: () => {
    abrirApp('jardin', 'gratitud')
  },
  pasos: [
    {
      sel: 'jardin.gratitud.alta',
      titulo: T('tut.app-jardin--gratitud.1.titulo', 'Hoy agradezco…'),
      texto: T(
        'tut.app-jardin--gratitud.1.texto',
        'Tres renglones al día. Con uno basta; tres, mejor. Se guarda una entrada por día y se puede corregir sobre la marcha.',
      ),
      alEntrar: () => {
        clickTut('jardin.tab.gratitud')
      },
    },
    {
      sel: 'jardin.gratitud.historial',
      titulo: T('tut.app-jardin--gratitud.2.titulo', 'Las de Pep@'),
      texto: T(
        'tut.app-jardin--gratitud.2.texto',
        'Noventa días de agradecimientos reales: el teclado, Laika dormida encima de los apuntes, la rodilla sanando, volver de Japón. Léelos con calma.',
      ),
    },
    {
      texto: T(
        'tut.app-jardin--gratitud.3.texto',
        'Este cuarto no lleva rachas ni castiga faltar: es a propósito. La calma no se compite.',
      ),
    },
  ],
}

