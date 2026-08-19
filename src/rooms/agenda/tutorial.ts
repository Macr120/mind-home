/**
 * Flujos de la agenda: corren sobre el AÑO de Pep@ en la casa demo (solo
 * navegan y señalan; no crean datos — el guard lo impediría igual).
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, elTut, esperarTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const cuerpoTrabajo: CuerpoTutorial = {
  preparar: () => {
    abrirApp('agenda', 'trabajo')
  },
  pasos: [
    {
      sel: 'agenda.trabajo.pendientes',
      titulo: T('tut.app-agenda--trabajo.1.titulo', 'La bandeja'),
      texto: T(
        'tut.app-agenda--trabajo.1.texto',
        'Trabajo tiene dos vistas: la bandeja de Pendientes y el Tablero. En Pendientes vive lo que hay que hacer pero todavía no tiene día, con su prioridad; nada te obliga a ponerle fecha para apuntarlo.',
      ),
      alEntrar: () => {
        clickTut('agenda.tab.trabajo')
      },
    },
    {
      // Se señala la columna de en medio, no el botón de la sub-pestaña: las
      // columnas del kanban tienen sus propias anclas (agenda.tablero.*).
      sel: 'agenda.tablero.encurso',
      titulo: T('tut.app-agenda--trabajo.3.titulo', 'El tablero'),
      texto: T(
        'tut.app-agenda--trabajo.3.texto',
        'Todo el trabajo en tres columnas —por hacer, en curso y hecho—, también lo que ya tiene fecha. Mantén pulsada una tarjeta para arrastrarla de columna (soltarla en «hecho» la palomea también en el calendario), o muévela con las flechas.',
      ),
      alEntrar: async () => {
        clickTut('agenda.trabajo.tablero')
        await esperarTut('agenda.tablero.encurso', 2000)
      },
    },
  ],
}

export const cuerpoSalud: CuerpoTutorial = {
  preparar: () => {
    abrirApp('agenda', 'salud')
  },
  pasos: [
    {
      sel: 'agenda.tab.salud',
      titulo: T('tut.app-agenda--salud.1.titulo', 'El año de la rodilla'),
      texto: T(
        'tut.app-agenda--salud.1.texto',
        'Nutrición cada pocos meses, dentista, y las seis sesiones de fisioterapia del mes 7: la lesión que frenó a Pep@ está registrada aquí.',
      ),
      alEntrar: () => {
        clickTut('agenda.tab.salud')
      },
    },
    {
      sel: 'agenda.salud.medicamentos',
      titulo: T('tut.app-agenda--salud.2.titulo', 'Medicamentos'),
      texto: T(
        'tut.app-agenda--salud.2.texto',
        'Cada medicamento genera un bloque por toma en el calendario. El antiinflamatorio de la lesión duró tres semanas y quedó archivado; la vitamina sigue.',
      ),
      alEntrar: () => {
        clickTut('agenda.salud.sub.yo')
      },
    },
    {
      sel: 'agenda.salud.cuidados',
      titulo: T('tut.app-agenda--salud.4.titulo', 'Lo que se repite'),
      texto: T(
        'tut.app-agenda--salud.4.texto',
        'El chequeo anual, la revisión dental, los análisis: cuidados con periodo propio. Al darlos por hechos la próxima fecha salta sola, así que el calendario nunca apunta a algo que ya hiciste.',
      ),
    },
    {
      // La sección del ciclo solo existe con su interruptor encendido (el demo
      // lo siembra así): apagado, se cae al submenú Tú.
      sel: () => (elTut('agenda.salud.ciclo') ? 'agenda.salud.ciclo' : 'agenda.salud.sub.yo'),
      titulo: T('tut.app-agenda--salud.ciclo.titulo', 'El ciclo'),
      texto: T(
        'tut.app-agenda--salud.ciclo.texto',
        'Al final de Tú vive el ciclo, con su propio interruptor: sangrado, síntomas y ánimo por día, y con tus últimos periodos estima el siguiente y la ventana fértil. Apagarlo conserva todo lo registrado.',
      ),
      alEntrar: () => {
        clickTut('agenda.salud.sub.yo')
      },
    },
    {
      sel: 'agenda.salud.projimos',
      titulo: T('tut.app-agenda--salud.projimos.titulo', 'Prójimos'),
      texto: T(
        'tut.app-agenda--salud.projimos.texto',
        'Quienes están a tu cuidado: contactos de Personas marcados «A mi cuidado», cada uno con sus citas por especialidad, sus cuidados y sus medicamentos. Pep@ lleva aquí a su madre.',
      ),
      alEntrar: async () => {
        clickTut('agenda.salud.sub.projimos')
        await esperarTut('agenda.salud.projimos', 2000)
      },
    },
    {
      // Las mascotas viven ahora en su propio submenú de Salud.
      sel: 'agenda.salud.mascotas',
      titulo: T('tut.app-agenda--salud.3.titulo', 'Laika'),
      texto: T(
        'tut.app-agenda--salud.3.texto',
        'La gata tiene su ficha con peso y veterinario, y sus cuidados con periodo: vacuna anual, desparasitación cada tres meses, baño cada mes. Al darlos por hechos, la próxima cita se recalcula sola.',
      ),
      alEntrar: () => {
        clickTut('agenda.salud.sub.mascotas')
      },
    },
  ],
}

export const cuerpoPersonas: CuerpoTutorial = {
  preparar: () => {
    abrirApp('agenda', 'personas')
  },
  pasos: [
    {
      sel: 'agenda.tab.personas',
      titulo: T('tut.app-agenda--personas.1.titulo', 'El círculo de Pep@'),
      texto: T(
        'tut.app-agenda--personas.1.texto',
        'Familia, amistades, gente del trabajo y de la universidad, cada quien en su carpeta. Con su teléfono, su dirección y lo que no quieres olvidar.',
      ),
      alEntrar: () => {
        clickTut('agenda.tab.personas')
      },
    },
    {
      sel: 'agenda.personas.alta',
      titulo: T('tut.app-agenda--personas.2.titulo', 'Cumpleaños que no se olvidan'),
      texto: T(
        'tut.app-agenda--personas.2.texto',
        'Al guardar una fecha de nacimiento, el cumpleaños se repite cada año en el calendario y te avisa. La app calcula la edad sola.',
      ),
    },
    {
      texto: T(
        'tut.app-agenda--personas.3.texto',
        'Los planes con gente se ligan a su contacto: así ves cuándo fue la última vez que viste a alguien.',
      ),
    },
  ],
}


/**
 * ESENCIAL: corre en la casa real y recorre los tres menús de la agenda uno por
 * uno. Sin datos de por medio: sus anclas son las pestañas, que existen con la
 * BD vacía.
 */
export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('agenda')
  },
  pasos: [
    {
      titulo: T('tut.app-agenda--esencial.1.titulo', 'Tu agenda'),
      texto: T(
        'tut.app-agenda--esencial.1.texto',
        'La agenda guarda lo que no es un hábito: pendientes, citas, contactos. Son tres menús, y todo lo que lleva fecha se agenda solo en el calendario de la casa.',
      ),
    },
    {
      sel: 'agenda.tab.trabajo',
      titulo: T('tut.app-agenda--esencial.2.titulo', 'Trabajo'),
      texto: T(
        'tut.app-agenda--esencial.2.texto',
        'La bandeja junta los pendientes sin fecha para que no se pierdan, y el tablero mueve tus tareas por columnas: por hacer, en curso y hecho.',
      ),
      alEntrar: async () => {
        await esperarTut('agenda.tab.trabajo', 4000)
        clickTut('agenda.tab.trabajo')
      },
    },
    {
      sel: 'agenda.tab.salud',
      titulo: T('tut.app-agenda--esencial.3.titulo', 'Salud'),
      texto: T(
        'tut.app-agenda--esencial.3.texto',
        'Citas médicas, medicamentos y cuidados, en tres submenús: Tú, Prójimos (quienes están a tu cuidado) y Mascotas.',
      ),
      alEntrar: () => {
        clickTut('agenda.tab.salud')
      },
    },
    {
      sel: 'agenda.tab.personas',
      titulo: T('tut.app-agenda--esencial.4.titulo', 'Personas'),
      texto: T(
        'tut.app-agenda--esencial.4.texto',
        'Tu libreta de contactos por relación. Los cumpleaños que guardes se repiten solos cada año en el calendario.',
      ),
      alEntrar: () => {
        clickTut('agenda.tab.personas')
      },
    },
  ],
}
