/**
 * Flujos de descanso: corren sobre el AÑO de Pep@ en la casa demo (solo
 * navegan y señalan; no crean datos — el guard lo impediría igual).
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { esperarTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const cuerpoNoche: CuerpoTutorial = {
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

export const cuerpoHorario: CuerpoTutorial = {
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

/**
 * ESENCIAL: corre en la casa real y recorre las secciones de Descanso una por
 * una. Es una app de página única (sin pestañas): sus anclas son cabeceras no
 * clicables, así que solo se espera a que aparezcan, sin `clickTut`.
 */
export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('descanso')
  },
  pasos: [
    {
      titulo: T('tut.app-descanso--esencial.1.titulo', 'Descanso'),
      texto: T(
        'tut.app-descanso--esencial.1.texto',
        'Esta app lleva el seguimiento de tu sueño en una sola pantalla: la puntuación de la última noche, tu horario con sus avisos, el registro diario y el historial completo.',
      ),
    },
    {
      sel: 'descanso.puntuacion',
      titulo: T('tut.app-descanso--esencial.2.titulo', 'La puntuación'),
      texto: T(
        'tut.app-descanso--esencial.2.texto',
        'Cada noche registrada recibe una puntuación que combina cuánto dormiste, a qué hora te acostaste y cuántas veces te despertaste. Sin registros todavía, aquí te invita a apuntar la primera noche.',
      ),
      alEntrar: async () => {
        await esperarTut('descanso.puntuacion', 4000)
      },
    },
    {
      sel: 'descanso.horario',
      titulo: T('tut.app-descanso--esencial.3.titulo', 'Horario y avisos'),
      texto: T(
        'tut.app-descanso--esencial.3.texto',
        'Ajustas tu hora de dormir y de despertar arrastrando los extremos de la franja del día; el mismo horario aparece como bloque en el calendario de la casa. Aquí también enciendes el despertador con su tono y los avisos para bajar el ritmo antes de dormir.',
      ),
    },
    {
      sel: 'descanso.registrar',
      titulo: T('tut.app-descanso--esencial.4.titulo', 'Registrar la noche'),
      texto: T(
        'tut.app-descanso--esencial.4.texto',
        'El formulario para anotar cómo dormiste: la fecha, la hora en que te acostaste y despertaste, las interrupciones y una calificación de calidad, con espacio para una nota.',
      ),
    },
    {
      sel: 'descanso.historial',
      titulo: T('tut.app-descanso--esencial.5.titulo', 'El historial'),
      texto: T(
        'tut.app-descanso--esencial.5.texto',
        'Todas las noches que vayas registrando quedan aquí, organizadas por año, mes y semana, para revisar tu descanso a lo largo del tiempo.',
      ),
    },
  ],
}

