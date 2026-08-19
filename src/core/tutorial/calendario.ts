/**
 * Los tutoriales del calendario del reloj: la rejilla («Calendario»), el
 * recorrido por las metas («Metas»: la lista, la hoja de cada una y su eje) y
 * los chips de enlace («Enlaces»).
 *
 * No son de ninguna app —el calendario dejó de ser un cuarto y vive en el HUD—,
 * pero tampoco son tutoriales de menú normales: corren sobre el AÑO de Pep@ en
 * la casa demo, así que se lanzan por `lanzarFlujo` como los de las apps (ver
 * `FLUJOS_NUCLEO` en registro.ts). Solo navegan y señalan; no crean datos.
 *
 * Reusan los anclajes `cal.*` de `CalendarioVista`.
 */
import type { CuerpoTutorial, TextoTut } from './tipos'
import { clickTut, esperarTut } from './dom'
import { abrirApp } from '../abrirApp'
import { useRutinasUI } from '../state/rutinasUiStore'
import { claveLS } from '../edicion'
import { construirAppDemo } from '../../demo/construir'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/**
 * La rejilla: qué hay dentro del calendario y cómo se lee el año. Absorbe el
 * antiguo tutorial de menú del reloj (arranca señalándolo) y sigue con la
 * semana de Pep@ y su panel de cumplimiento.
 *
 * Sin `preparar`: el paso 1 enseña el RELOJ con la casa a la vista (abrir el
 * calendario antes lo taparía) y es el paso 2 el que entra.
 */
export const cuerpoCalendario: CuerpoTutorial = {
  pasos: [
    {
      sel: 'reloj.widget',
      titulo: T('tut.calendario.1.titulo', 'El reloj'),
      texto: T(
        'tut.calendario.1.texto',
        'El calendario no es un cuarto: vive en el reloj de la casa, así que se abre desde donde estés.',
      ),
      // También al volver con «Atrás» (y si el tour se lanzó con el calendario
      // ya abierto): destapar el reloj que este paso señala.
      alEntrar: () => {
        useRutinasUI.getState().cerrarCalendario()
      },
    },
    {
      sel: 'cal.panel',
      titulo: T('tut.calendario.2.titulo', 'Una semana real'),
      texto: T(
        'tut.calendario.2.texto',
        'Turnos en la cafetería, clases de física, correr al amanecer, piano por la noche. Cada bloque es una rutina con su hora y su color; se arrastran para moverlas y se estiran para cambiar su duración.',
      ),
      // Aquí es donde se entra (el paso anterior solo mostró el reloj). El
      // clic en «Semana» repone la rejilla al volver desde los pasos de Año/Mes.
      alEntrar: async () => {
        useRutinasUI.getState().abrirCalendario('semana')
        // El modal tarda en montar: sin esperar, este primer clic cae en el vacío.
        await esperarTut('cal.vista.semana', 3000)
        clickTut('cal.vista.semana')
      },
      esperar: 'cal.panel',
    },
    {
      sel: 'cal.vistas',
      titulo: T('tut.calendario.3.titulo', 'Cuatro maneras de mirar'),
      texto: T(
        'tut.calendario.3.texto',
        'Día y Semana muestran la rejilla por horas; Mes y Año dan el panorama del año entero. El primer botón hace doble función: dice «Hoy» y te trae al presente, o «Día» si ya estás viendo otra fecha.',
      ),
    },
    {
      sel: 'cal.vista.objetivos',
      titulo: T('tut.calendario.3b.titulo', 'Y las misiones, aparte'),
      texto: T(
        'tut.calendario.3b.texto',
        'En rojo, para que no se confunda con las cuatro de arriba: Misiones junta la checklist de hoy de todas tus apps. Tus metas y sus planes viven en su propio cuarto.',
      ),
    },
    {
      sel: 'cal.filtro',
      titulo: T('tut.calendario.4.titulo', 'De dónde sale cada bloque'),
      texto: T(
        'tut.calendario.4.texto',
        'Las apps agendan solas: las citas de la Agenda, el sueño del Descanso, los ratos de estudio de la Biblioteca. Con el filtro dejas ver solo una app.',
      ),
    },
    {
      sel: 'cal.hoy',
      titulo: T('tut.calendario.5.titulo', 'Moverse por el año'),
      texto: T(
        'tut.calendario.5.texto',
        'Las flechas ‹ › recorren el periodo y Hoy vuelve al presente. Todo el año de Pep@ está aquí, semana por semana. Con + Nueva creas un evento, o lo trazas directo sobre la rejilla.',
      ),
    },
    {
      sel: 'cal.metas',
      titulo: T('tut.calendario.6.titulo', 'Hábito por hábito'),
      texto: T(
        'tut.calendario.6.texto',
        'Cada fila es una rutina y cada columna un día: verde si se cumplió. Aquí se palomea directo, y el porcentaje de arriba resume el periodo que estés viendo.',
      ),
    },
    {
      sel: 'cal.metas',
      titulo: T('tut.calendario.7.titulo', 'El arco del año'),
      texto: T(
        'tut.calendario.7.texto',
        'En vista Año la gráfica cuenta la historia completa: Pep@ arrancó cumpliendo un tercio de lo que se proponía y cerró arriba del 85 %. La constancia se construyó, no apareció.',
      ),
      alEntrar: () => {
        clickTut('cal.vista.anio')
      },
    },
    {
      sel: 'cal.metas',
      titulo: T('tut.calendario.8.titulo', 'Las caídas también cuentan'),
      texto: T(
        'tut.calendario.8.texto',
        'Los dos hoyos son reales: la lesión de rodilla del mes 7 y las tres semanas en Japón. Fallar no borra el progreso — el panel muestra el año como fue, no como debió ser. Y una rutina solo cuenta desde el día en que la creaste.',
      ),
      alEntrar: () => {
        clickTut('cal.vista.mes')
      },
    },
  ],
}

/**
 * El recorrido por las metas sobre los planes de Pep@: se abre una propuesta
 * desde su fila (la hoja editable), luego el posgrado (ya aceptado, que es el
 * que enseña el modo espejo) y desde su hoja el eje ACOTADO a esa meta.
 *
 * Nunca pulsa «Generar plan»: en la demo eso gastaría créditos y el guard del
 * sandbox tiraría el resultado.
 */
export const cuerpoMetas: CuerpoTutorial = {
  preparar: () => {
    // El primer paso señala una CARPETA: si quien abre el tour dejó el panel en
    // modo tablero, ese ancla no existiría y el tour se quedaría esperando. La
    // disposición se lee al montar, así que basta con dejarla escrita antes.
    localStorage.setItem(claveLS('mh.metas.columnas'), 'lista')
    // Las metas viven en su propio cuarto desde que dejaron el reloj.
    abrirApp('metas')
    // Los planes de Pep@ los siembran sus apps: el del maratón Ejercicio y el del
    // posgrado —el único ACEPTADO, el que enseña el modo espejo— Biblioteca. Quien
    // entra al demo directo a este tour solo trae el año del calendario, así que se
    // piden aquí (idempotente y sin efecto fuera del demo).
    void construirAppDemo('ejercicio')
    void construirAppDemo('biblioteca')
  },
  pasos: [
    {
      // Sin `sel`: la tarjeta acompaña al mago mientras el cuarto termina de
      // montar. Es el encuadre del tour — de qué va este cuarto y con qué habla —,
      // porque el recorrido de sus tres menús es el esencial de la app.
      titulo: T('tut.metas.0.titulo', 'Un cuarto para proponerte cosas'),
      texto: T(
        'tut.metas.0.texto',
        'Metas no guarda nada suyo: es donde te propones cosas y donde se ve todo lo que te propusiste, venga del cuarto que venga. Las metas nacen en las demás apps —correr en Ejercicio, la carrera en Biblioteca, ahorrar en el Despacho— y aquí se juntan agrupadas por la app que lleva cada una.',
      ),
    },
    {
      sel: 'cal.metas.grupo',
      titulo: T('tut.metas.1.titulo', 'Primero, las metas'),
      texto: T(
        'tut.metas.1.texto',
        'El cuarto abre en Metas, agrupadas por la app que las lleva: correr en Ejercicio, la carrera de física en Biblioteca. «Casa» no es ninguna app — esa categoría la inventó Pep@ para la obra de la cocina.',
      ),
      // `preparar` entra al cuarto, pero la app tarda en montar (va en lazy).
      esperar: 'cal.metas.grupo',
    },
    {
      sel: 'cal.metas.lista',
      titulo: T('tut.metas.2.titulo', 'De la meta a su plan'),
      texto: T(
        'tut.metas.2.texto',
        'Cada fila se lee como un tablero: su número en la carpeta, el plazo, el avance y el estado — por hacer, en curso o hecho, según lo que lleve cumplido. Un clic abre la meta: su plan si lo tiene (el ✨ lo anuncia) y, si no, su hoja con las sub-metas, las fechas y los pasos.',
      ),
    },
    {
      sel: 'cal.plan.lista',
      titulo: T('tut.metas.3.titulo', 'Tres planes, tres estados'),
      texto: T(
        'tut.metas.3.texto',
        'La cocina y el siguiente maratón siguen siendo propuestas; la solicitud de posgrado ya está en el cronograma. El del maratón se pidió sin fecha límite: la IA calculó que exige 24 semanas y lo dice en su resumen.',
      ),
      alEntrar: () => {
        clickTut('cal.cron.modo.planes')
      },
      esperar: 'cal.plan.lista',
    },
    {
      sel: 'cal.plan.hoja.fases',
      titulo: T('tut.metas.4.titulo', 'La hoja del plan'),
      texto: T(
        'tut.metas.4.texto',
        'El ✨ de una fila anuncia que la meta ya tiene plan, y su clic abre esta hoja: las fases y sus sub-metas, cada una con su periodo. Mientras es propuesta se edita entera: renombrar, mover fechas, agregar o quitar nodos sin descuadrar a los demás.',
      ),
      alEntrar: () => {
        clickTut('cal.plan.tarjeta.propuesta')
      },
      // Solo existe en la hoja de una propuesta: confirma que montó la correcta.
      esperar: 'cal.plan.hoja.aceptar',
    },
    {
      sel: 'cal.plan.hoja.check',
      titulo: T('tut.metas.5.titulo', 'Palomear sin comprometerse'),
      texto: T(
        'tut.metas.5.texto',
        'Los checks de una propuesta viven en la hoja, no en tus metas: puedes ir marcando lo hecho sin tocar tu cronograma. Las barras se llenan solas hacia arriba — la planificación de la cocina ya está cerrada.',
      ),
    },
    {
      sel: 'cal.plan.hoja.aceptar',
      titulo: T('tut.metas.6.titulo', 'Mover a cronograma real'),
      texto: T(
        'tut.metas.6.texto',
        'Este botón convierte cada fase y cada sub-meta en metas de verdad, con sus fechas puestas y colgando de la meta original. Lo que la meta ya tuviera se conserva.',
      ),
    },
    {
      sel: 'cal.plan.hoja.avance',
      titulo: T('tut.metas.7.titulo', 'Aceptado: una sola verdad'),
      texto: T(
        'tut.metas.7.texto',
        'El plan del posgrado ya se movió. Ahora sus checks son los de las sub-metas reales y la barra es la de tu cronograma: la hoja deja de llevar una cuenta aparte.',
      ),
      // Idempotente: volver a la lista no hace nada si ya estás en ella.
      alEntrar: async () => {
        clickTut('cal.plan.volver')
        await esperarTut('cal.plan.tarjeta.aceptado', 3000)
        clickTut('cal.plan.tarjeta.aceptado')
      },
      esperar: 'cal.plan.hoja.verCronograma',
    },
    {
      sel: 'cal.cron.eje',
      titulo: T('tut.metas.8.titulo', 'Y ahí están, en el eje'),
      texto: T(
        'tut.metas.8.texto',
        'El cronograma es el de ESTA meta: sus sub-metas ocupan su periodo sobre el eje del tiempo, con el plan superpuesto en violeta encima — lo propuesto y lo real, juntos.',
      ),
      alEntrar: () => {
        clickTut('cal.plan.hoja.verCronograma')
      },
      esperar: 'cal.cron.eje',
    },
    {
      sel: 'cal.cron.volver',
      titulo: T('tut.metas.9.titulo', 'Cada meta, su eje'),
      texto: T(
        'tut.metas.9.texto',
        'Este eje es el de UNA meta: aquí se le dan fechas a lo que no las tiene, se cuelgan sub-metas nuevas y «Volver» te regresa a su hoja. El menú Cronograma de arriba enseña el de todas juntas.',
      ),
    },
    {
      // Cierre del tour: el camino de vuelta. Sin `sel` porque lo que cuenta pasa
      // en OTRAS pantallas (el reloj y el panel de cada cuarto), no en esta.
      titulo: T('tut.metas.10.titulo', 'Y de aquí sale hacia toda la casa'),
      texto: T(
        'tut.metas.10.texto',
        'Nada de esto se queda encerrado: una meta con fechas aparece en el calendario del reloj como cualquier otra cosa agendada, y sus pasos de hoy salen en las Misiones de la app que la lleva —y en el globo rojo de ese cuarto—. Aquí se planea; se cumple en la app, registrando de verdad.',
      ),
    },
  ],
}

/**
 * Los chips de app (`ChipApp`) que cuelgan de una meta o de un paso de plan:
 * navegan a donde se registra, nunca registran ellos mismos. Reutiliza la
 * misma entrada que `tutorialMetas` (el plan del posgrado, ya aceptado) para
 * no depender de datos nuevos.
 */
export const cuerpoEnlaces: CuerpoTutorial = {
  preparar: () => {
    // Mismas garantías que cuerpoMetas: el paso 1 señala una CARPETA (modo
    // lista) y su alEntrar espera la fila del plan ACEPTADO, que siembra
    // Biblioteca (idempotente y sin efecto fuera del demo).
    localStorage.setItem(claveLS('mh.metas.columnas'), 'lista')
    abrirApp('metas')
    void construirAppDemo('biblioteca')
  },
  pasos: [
    {
      sel: 'cal.metas.grupo',
      titulo: T('tut.enlaces.1.titulo', 'De la meta a su app'),
      texto: T(
        'tut.enlaces.1.texto',
        'Cualquier meta o paso de plan puede llevar un chip con el icono de una app: es la respuesta a «¿y esto dónde se anota?».',
      ),
      // La hoja del plan aceptado solo lleva el chip en sus nodos; el de la META
      // entera (el que señalan los pasos siguientes) vive en la hoja de la meta,
      // así que se cruza a ella con «Ver la meta».
      alEntrar: async () => {
        await esperarTut('cal.metas.fila.aceptado', 3000)
        clickTut('cal.metas.fila.aceptado')
        await esperarTut('cal.plan.verMeta', 3000)
        clickTut('cal.plan.verMeta')
      },
      esperar: 'cal.enlace.boton',
    },
    {
      sel: 'cal.enlace.boton',
      titulo: T('tut.enlaces.2.titulo', 'Ponerlo o cambiarlo'),
      texto: T(
        'tut.enlaces.2.texto',
        'Enlazar app abre el selector: primero eliges la app, luego a qué parte de ella (si tiene varias secciones donde registrar).',
      ),
    },
    {
      sel: 'cal.enlace.chip',
      titulo: T('tut.enlaces.3.titulo', 'El chip ya puesto'),
      texto: T(
        'tut.enlaces.3.texto',
        'Con el chip puesto, tocarlo abre esa app directo en esa sección. Quitarlo no borra la meta ni sus fechas: solo suelta el enlace.',
      ),
    },
    {
      texto: T(
        'tut.enlaces.4.texto',
        'Solo las apps asignadas a un objeto de un cuarto aparecen como destino: enlazar a una sin cuarto sería un chip que no lleva a ningún sitio.',
      ),
    },
  ],
}

/**
 * El ESENCIAL del calendario: qué es y para qué sirve cada una de sus vistas.
 * A diferencia de `cuerpoCalendario`, corre en la casa REAL y no necesita datos
 * —solo señala mandos, nunca los textos hablan de lo agendado—, así que tampoco
 * lleva `preparar`: el paso 1 enseña el RELOJ con la casa a la vista y es el
 * paso 2 el que entra.
 *
 * Los botones de vista viven en la cabecera, que sigue montada en TODAS las
 * vistas (incluida Misiones), así que sus anclas nunca desaparecen mientras el
 * modal esté abierto y volver con «Atrás» siempre encuentra dónde pulsar.
 */
export const cuerpoCalendarioEsencial: CuerpoTutorial = {
  pasos: [
    {
      sel: 'reloj.widget',
      titulo: T('tut.calendario--esencial.1.titulo', 'El reloj de la casa'),
      texto: T(
        'tut.calendario--esencial.1.texto',
        'El calendario no es un cuarto: vive en el reloj del HUD, así que se abre desde donde estés sin entrar a ningún sitio.',
      ),
      // También al volver con «Atrás» (y si el tour se lanzó con el calendario
      // ya abierto): destapar el reloj que este paso señala.
      alEntrar: () => {
        useRutinasUI.getState().cerrarCalendario()
      },
    },
    {
      sel: 'cal.panel',
      titulo: T('tut.calendario--esencial.2.titulo', 'Todo lo agendado, junto'),
      texto: T(
        'tut.calendario--esencial.2.texto',
        'Aquí cae todo lo que tiene fecha y hora: lo que creas con «+ Nueva» o trazando sobre la rejilla, y lo que las demás apps agendan solas. El filtro de arriba deja ver una sola app cuando se junta demasiado.',
      ),
      // Aquí es donde se entra (el paso anterior solo mostró el reloj). Pedir la
      // vista al abrir no basta al volver con «Atrás»: el store ya vale 'dia' y
      // no cambiaría nada, así que el clic es el que repone la vista Día.
      alEntrar: async () => {
        useRutinasUI.getState().abrirCalendario('dia')
        // El modal tarda en montar: sin esperar, este primer clic cae en el vacío.
        await esperarTut('cal.hoy', 3000)
        clickTut('cal.hoy')
      },
      esperar: 'cal.panel',
    },
    {
      sel: 'cal.hoy',
      titulo: T('tut.calendario--esencial.3.titulo', 'Día'),
      texto: T(
        'tut.calendario--esencial.3.texto',
        'La rejilla de una jornada de 24 horas: sirve para ver a qué hora está cada cosa y si algo se encima. Este botón hace doble función: dice «Hoy» y te trae al presente, o «Día» si ya estás viendo otra fecha.',
      ),
      alEntrar: () => {
        clickTut('cal.hoy')
      },
    },
    {
      sel: 'cal.vista.semana',
      titulo: T('tut.calendario--esencial.4.titulo', 'Semana'),
      texto: T(
        'tut.calendario--esencial.4.texto',
        'La misma rejilla por horas, pero con los siete días lado a lado. Es donde se ve cómo queda repartida la semana, y donde los bloques se arrastran de un día a otro o se estiran para durar más.',
      ),
      alEntrar: () => {
        clickTut('cal.vista.semana')
      },
    },
    {
      sel: 'cal.vista.mes',
      titulo: T('tut.calendario--esencial.5.titulo', 'Mes'),
      texto: T(
        'tut.calendario--esencial.5.texto',
        'Deja el eje de horas y pinta los días como casillas con lo que cae en cada uno. Es la vista del panorama: qué semanas vienen cargadas y qué días quedan libres.',
      ),
      alEntrar: () => {
        clickTut('cal.vista.mes')
      },
    },
    {
      sel: 'cal.vista.anio',
      titulo: T('tut.calendario--esencial.6.titulo', 'Año'),
      texto: T(
        'tut.calendario--esencial.6.texto',
        'Los doce meses de un tirón. A esta distancia ya no se leen las horas: lo que se ve es la constancia, qué tanto se sostuvo lo que te propusiste a lo largo del año.',
      ),
      alEntrar: () => {
        clickTut('cal.vista.anio')
      },
    },
    {
      // Solo lo señala: pulsarlo cambiaría el cuerpo del calendario y taparía lo
      // que este paso explica. La cabecera sigue montada, así que el botón está
      // ahí en cualquier vista.
      sel: 'cal.vista.objetivos',
      titulo: T('tut.calendario--esencial.7.titulo', 'Y las misiones, aparte'),
      texto: T(
        'tut.calendario--esencial.7.texto',
        'En rojo, para que no se lea como una quinta vista: Misiones junta en una sola pantalla la checklist de hoy de todas las apps. Las metas y sus planes no están aquí — viven en su propio cuarto.',
      ),
    },
  ],
}

