/**
 * Flujos de descanso: corren sobre el AÑO de Pep@ en la casa demo (solo
 * navegan y señalan; no crean datos — el guard lo impediría igual).
 */
import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const flujoNoche: TutorialDef = {
  id: 'app-descanso--noche',
  titulo: T('tut.app-descanso--noche.titulo', 'Cómo se puntúa una noche'),
  resumen: T(
    'tut.app-descanso--noche.resumen',
    'Descanso puntúa cada noche sobre cien: cuánto dormiste, a qué hora te acostaste y cuántas veces te despertaste. Con eso construye el historial del año.',
  ),
  preparar: () => {
    abrirApp('descanso')
  },
  pasos: [
    {
      sel: 'descanso.puntuacion',
      titulo: T('tut.app-descanso--noche.1.titulo', 'Cien puntos, tres partes'),
      texto: T(
        'tut.app-descanso--noche.1.texto',
        'La duración vale cincuenta, la constancia de tu hora de acostarte treinta y las interrupciones veinte. Dormir mucho un día no compensa acostarse a deshoras todos los demás.',
      ),
    },
    {
      sel: 'descanso.ultimas',
      titulo: T('tut.app-descanso--noche.2.titulo', 'La última semana'),
      texto: T(
        'tut.app-descanso--noche.2.texto',
        'Siete barras contra la línea de tu objetivo. Es la vista que dice de un vistazo si esta semana estás durmiendo lo que querías.',
      ),
    },
    {
      sel: 'descanso.historial',
      titulo: T('tut.app-descanso--noche.3.titulo', 'El año entero'),
      texto: T(
        'tut.app-descanso--noche.3.texto',
        'El historial se guarda por año, mes y semana. Baja hasta los primeros meses de Pep@ y compáralos con los últimos: se acostaba pasada la una y dormía cinco horas.',
      ),
    },
  ],
}

const flujoHorario: TutorialDef = {
  id: 'app-descanso--horario',
  titulo: T('tut.app-descanso--horario.titulo', 'Tu horario de sueño'),
  resumen: T(
    'tut.app-descanso--horario.resumen',
    'El horario se dibuja en una barra de veinticuatro horas, se refleja como bloque en el calendario de la casa y puede avisarte antes de dormir.',
  ),
  preparar: () => {
    abrirApp('descanso')
  },
  pasos: [
    {
      sel: 'descanso.horario',
      titulo: T('tut.app-descanso--horario.1.titulo', 'De once y media a siete'),
      texto: T(
        'tut.app-descanso--horario.1.texto',
        'Arrastra los extremos de la barra para mover tu hora de dormir y la de despertar; el cielo de arriba cambia con ellas. Este bloque aparece también en el calendario, cruzando la medianoche.',
      ),
    },
    {
      sel: 'descanso.horario',
      titulo: T('tut.app-descanso--horario.2.titulo', 'Alarma y recordatorios'),
      texto: T(
        'tut.app-descanso--horario.2.texto',
        'Puedes elegir el tono del despertador, pedir que te avise cuando toque ir a la cama y dejar las pantallas una hora antes. Los avisos son opcionales: aquí vienen apagados.',
      ),
    },
    {
      sel: 'descanso.registrar',
      titulo: T('tut.app-descanso--horario.3.titulo', 'Registrar la noche'),
      texto: T(
        'tut.app-descanso--horario.3.texto',
        'Cada mañana apuntas a qué hora te acostaste, a qué hora despertaste, cuántas veces te despertaste y qué tal fue. Eso es todo lo que la app necesita para el resto.',
      ),
    },
  ],
}

export const flujosDescanso: TutorialDef[] = [flujoNoche, flujoHorario]
