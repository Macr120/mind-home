/**
 * Flujos del calendario: corren sobre el AÑO de Pep@ en la casa demo (solo
 * navegan y señalan; no crean datos — el guard lo impediría igual).
 *
 * Reusan los anclajes `cal.*` de CalendarioVista, compartida con el modal del
 * reloj de la casa.
 */
import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const flujoSemana: TutorialDef = {
  id: 'app-calendario--semana',
  titulo: T('tut.app-calendario--semana.titulo', 'La semana de Pep@'),
  resumen: T(
    'tut.app-calendario--semana.resumen',
    'El calendario reúne todo lo agendado de la casa —turnos, clases, hábitos y lo que aportan las demás apps— en vistas Día, Semana, Mes, Año y Cronograma.',
  ),
  preparar: () => {
    abrirApp('calendario')
  },
  pasos: [
    {
      sel: 'cal.panel',
      titulo: T('tut.app-calendario--semana.1.titulo', 'Una semana real'),
      texto: T(
        'tut.app-calendario--semana.1.texto',
        'Turnos en la cafetería, clases de física, correr al amanecer, piano por la noche. Cada bloque es una rutina con su hora y su color; se arrastran para moverlas y se estiran para cambiar su duración.',
      ),
      alEntrar: () => {
        clickTut('cal.vista.semana')
      },
    },
    {
      sel: 'cal.vistas',
      titulo: T('tut.app-calendario--semana.2.titulo', 'Cinco maneras de mirar'),
      texto: T(
        'tut.app-calendario--semana.2.texto',
        'Día y Semana muestran la rejilla por horas; Mes y Año dan el panorama del año entero; Cronograma pone las metas en el tiempo.',
      ),
    },
    {
      sel: 'cal.filtro',
      titulo: T('tut.app-calendario--semana.3.titulo', 'De dónde sale cada bloque'),
      texto: T(
        'tut.app-calendario--semana.3.texto',
        'Las apps agendan solas: las citas de la Agenda, el sueño del Descanso, los ratos de estudio de la Biblioteca. Con el filtro dejas ver solo una app.',
      ),
    },
    {
      sel: 'cal.hoy',
      titulo: T('tut.app-calendario--semana.4.titulo', 'Moverse por el año'),
      texto: T(
        'tut.app-calendario--semana.4.texto',
        'Las flechas ‹ › recorren el periodo y Hoy vuelve al presente. Todo el año de Pep@ está aquí, semana por semana.',
      ),
    },
  ],
}

const flujoMetas: TutorialDef = {
  id: 'app-calendario--metas',
  titulo: T('tut.app-calendario--metas.titulo', 'El año de disciplina'),
  resumen: T(
    'tut.app-calendario--metas.resumen',
    'El panel de Metas mide qué tanto cumples lo que agendaste: matriz por hábito y día, porcentaje por semana o mes y una gráfica del año.',
  ),
  preparar: () => {
    abrirApp('calendario')
  },
  pasos: [
    {
      sel: 'cal.metas',
      titulo: T('tut.app-calendario--metas.1.titulo', 'Hábito por hábito'),
      texto: T(
        'tut.app-calendario--metas.1.texto',
        'Cada fila es una rutina y cada columna un día: verde si se cumplió. Aquí se palomea directo, y el porcentaje de arriba resume el periodo que estés viendo.',
      ),
      alEntrar: () => {
        clickTut('cal.vista.semana')
      },
    },
    {
      sel: 'cal.metas',
      titulo: T('tut.app-calendario--metas.2.titulo', 'El arco del año'),
      texto: T(
        'tut.app-calendario--metas.2.texto',
        'En vista Año la gráfica cuenta la historia completa: Pep@ arrancó cumpliendo un tercio de lo que se proponía y cerró arriba del 85 %. La constancia se construyó, no apareció.',
      ),
      alEntrar: () => {
        clickTut('cal.vista.anio')
      },
    },
    {
      sel: 'cal.metas',
      titulo: T('tut.app-calendario--metas.3.titulo', 'Las caídas también cuentan'),
      texto: T(
        'tut.app-calendario--metas.3.texto',
        'Los dos hoyos son reales: la lesión de rodilla del mes 7 y las tres semanas en Japón. Fallar no borra el progreso — el panel muestra el año como fue, no como debió ser.',
      ),
      alEntrar: () => {
        clickTut('cal.vista.mes')
      },
    },
    {
      texto: T(
        'tut.app-calendario--metas.4.texto',
        'Una rutina solo cuenta desde el día en que la creaste: adoptar un hábito a mitad de año no arruina tus números anteriores.',
      ),
    },
  ],
}

export const flujosCalendario: TutorialDef[] = [flujoSemana, flujoMetas]
