/**
 * Flujos de la agenda: corren sobre el AÑO de Pep@ en la casa demo (solo
 * navegan y señalan; no crean datos — el guard lo impediría igual).
 */
import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const flujoTrabajo: TutorialDef = {
  id: 'app-agenda--trabajo',
  titulo: T('tut.app-agenda--trabajo.titulo', 'Trabajo y estudio'),
  resumen: T(
    'tut.app-agenda--trabajo.resumen',
    'La bandeja de pendientes sin fecha y un tablero Kanban donde las tarjetas se arrastran de columna.',
  ),
  preparar: () => {
    abrirApp('agenda', 'trabajo')
  },
  pasos: [
    {
      sel: 'agenda.trabajo.pendientes',
      titulo: T('tut.app-agenda--trabajo.1.titulo', 'La bandeja'),
      texto: T(
        'tut.app-agenda--trabajo.1.texto',
        'Lo que hay que hacer pero todavía no tiene día vive aquí, con su prioridad. Nada te obliga a ponerle fecha para apuntarlo.',
      ),
      alEntrar: () => {
        clickTut('agenda.tab.trabajo')
      },
    },
    {
      sel: 'agenda.trabajo.tablero',
      titulo: T('tut.app-agenda--trabajo.3.titulo', 'El tablero'),
      texto: T(
        'tut.app-agenda--trabajo.3.texto',
        'Los mismos pendientes, en tres columnas: por hacer, en curso y hecho. Mantén pulsada una tarjeta para arrastrarla a otra columna —soltarla en «hecho» la palomea también en el calendario—, o muévela con las flechas.',
      ),
      alEntrar: () => {
        clickTut('agenda.trabajo.tablero')
      },
    },
  ],
}

const flujoSalud: TutorialDef = {
  id: 'app-agenda--salud',
  titulo: T('tut.app-agenda--salud.titulo', 'Salud y mascotas'),
  resumen: T(
    'tut.app-agenda--salud.resumen',
    'Citas médicas, medicamentos con sus horarios y las mascotas con sus cuidados: todo se agenda solo en el calendario.',
  ),
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

const flujoPersonas: TutorialDef = {
  id: 'app-agenda--personas',
  titulo: T('tut.app-agenda--personas.titulo', 'Personas'),
  resumen: T(
    'tut.app-agenda--personas.resumen',
    'Tu libreta de contactos por relación, con cumpleaños que se repiten solos cada año en el calendario.',
  ),
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

export const flujosAgenda: TutorialDef[] = [flujoTrabajo, flujoSalud, flujoPersonas]
