/**
 * Tours del núcleo que no son ninguna app pero SÍ corren sobre el año de Pep@
 * en la casa demo (a diferencia de los de `menus.ts`, que corren en la casa
 * real): la lista «Hoy» de una app concreta, y el resumen del jugador —rango
 * de Sísifo, insignias y Wrapped—, que solo dice algo con un año entero
 * detrás. Se registran en `FLUJOS_NUCLEO` (`registro.ts`) bajo las claves
 * 'hoy' y 'progreso', que `demo/construir.ts` sabe qué años construir para
 * cada una (`APPS_DE_TOUR`).
 */
import type { CuerpoTutorial, TextoTut } from './tipos'
import { clickTut, esperarTut } from './dom'
import { abrirApp } from '../abrirApp'
import { irAPestanaMenu } from './dom'
import { useSisifoUi } from '../state/sisifoUiStore'
import { useWrappedUi } from '../state/wrappedUiStore'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const cuerpoHoy: CuerpoTutorial = {
  preparar: () => {
    abrirApp('cocina')
  },
  pasos: [
    {
      sel: 'hoy.cabecera',
      alEntrar: async () => {
        clickTut('hoy.cabecera')
        await esperarTut('hoy.lista', 2000)
      },
      texto: T(
        'tut.hoy.1.texto',
        'En el encabezado de cada app vive su botón Misiones: la checklist de lo que esa app te pide HOY. El reloj de la casa tiene el mismo botón con todas las apps juntas.',
      ),
    },
    {
      sel: 'hoy.lista',
      titulo: T('tut.hoy.2.titulo', 'Tres fuentes, una lista'),
      texto: T(
        'tut.hoy.2.texto',
        'Las misiones propias de la app (el agua, las calorías), lo que agendaste para hoy en el calendario y los pasos de tus metas vigentes: todo junto, agrupado bajo el plan o la meta del que sale cada paso.',
      ),
    },
    {
      // El id de la fila no es predecible (`obj:cocina|clave`, `rut:12|0`…):
      // se toma la primera visible en vez de fijar un id concreto.
      sel: () => document.querySelector('[data-tut^="hoy.fila."]')?.getAttribute('data-tut') ?? 'hoy.lista',
      titulo: T('tut.hoy.3.titulo', 'Se tacha porque el dato existe'),
      texto: T(
        'tut.hoy.3.texto',
        'El botón de la fila registra el dato REAL en la app — un vaso de agua, una comida — y el paso se tacha solo porque ese registro ya está ahí, no porque alguien lo marcó. Volver a pulsarlo con el paso cumplido no duplica nada: el botón desaparece.',
      ),
    },
    {
      sel: 'hoy.objetivo',
      titulo: T('tut.hoy.4.titulo', 'Tu cifra de cada día'),
      texto: T(
        'tut.hoy.4.texto',
        'Los pasos con cifra ajustable la cambian aquí mismo. Ponerla en 0 apaga ese objetivo del día sin borrar el historial de días anteriores.',
      ),
    },
    {
      sel: 'hoy.agendar',
      titulo: T('tut.hoy.5.titulo', 'De un objetivo a una rutina'),
      texto: T(
        'tut.hoy.5.texto',
        'El calendario agenda ese mismo objetivo con hora fija: abre el mismo editor que las rutinas del reloj, así que queda registrado en los dos sitios a la vez.',
      ),
    },
    {
      // Con «Ocultar terminados» encendido este plegable no existe: se cae a la
      // lista entera en vez de dejar el paso sin nada que señalar.
      sel: () => (document.querySelector('[data-tut="hoy.hechos"]') ? 'hoy.hechos' : 'hoy.lista'),
      titulo: T('tut.hoy.6.titulo', 'Lo cumplido no desaparece'),
      texto: T(
        'tut.hoy.6.texto',
        'Baja a «Hechos», plegado: ver el registro surtir efecto es parte de la recompensa, y desde ahí se puede deshacer si se coló uno de más.',
      ),
    },
    {
      texto: T(
        'tut.hoy.7.texto',
        'Y si te falta algo, «Nueva checklist» crea la tuya: una lista propia de esta app que se repite cada día. Las metas de las que salen estos pasos se planean en el cuarto de Metas.',
      ),
    },
  ],
}

export const cuerpoProgreso: CuerpoTutorial = {
  preparar: async () => {
    clickTut('menu.abrir')
    await irAPestanaMenu('menu.tab.cuartos')
  },
  pasos: [
    {
      sel: 'progreso.resumen',
      esperar: 'progreso.resumen',
      texto: T(
        'tut.progreso.1.texto',
        'La carta de tu personaje: Pep@ lleva un año entero de actividad real detrás, así que cada número aquí tiene una historia real que lo explica.',
      ),
    },
    {
      sel: 'progreso.avatar',
      titulo: T('tut.progreso.2.titulo', 'El personaje'),
      texto: T(
        'tut.progreso.2.texto',
        'Tocarlo abre el editor de personajes. Su humor —feliz, contento, triste o dormido— sube con cada registro nuevo y baja solo si pasan días sin ninguno; nunca se reinicia de golpe.',
      ),
    },
    {
      sel: 'progreso.sisifo.rango',
      titulo: T('tut.progreso.3.titulo', 'El rango de Sísifo'),
      texto: T(
        'tut.progreso.3.texto',
        'Doce rangos de ascenso: cada día con actividad sube un escalón de 365. Pep@ ya lleva varios rangos ganados; tócalo para ver la montaña completa.',
      ),
      alEntrar: () => {
        useSisifoUi.getState().abrir()
      },
      esperar: 'sisifo.overlay',
    },
    {
      sel: 'sisifo.progreso',
      titulo: T('tut.progreso.4.titulo', 'Escalones y días de gracia'),
      texto: T(
        'tut.progreso.4.texto',
        'Cada 7 escalones llega una insignia, cada tramo de semanas sube el rango. Fallar un día no rompe nada: hay 2 días de gracia al mes antes de retroceder al inicio del rango actual.',
      ),
    },
    {
      sel: 'sisifo.insignias',
      titulo: T('tut.progreso.5.titulo', '52 insignias por familia'),
      texto: T(
        'tut.progreso.5.texto',
        'Agrupadas por familia geológica, en misterio hasta que se ganan: sin nombre ni descripción visibles hasta el desbloqueo.',
      ),
      alEntrar: () => {
        useSisifoUi.getState().cerrar()
      },
    },
    {
      sel: 'progreso.wrapped',
      titulo: T('tut.progreso.6.titulo', 'Tu resumen'),
      texto: T(
        'tut.progreso.6.texto',
        'Wrapped arma el resumen de tu semana, mes o año en láminas — tiene su propio tour, con datos de sobra en un año como el de Pep@.',
      ),
    },
    {
      sel: 'progreso.radar',
      titulo: T('tut.progreso.7.titulo', 'El radar por cuarto'),
      texto: T(
        'tut.progreso.7.texto',
        'Cada vértice es un cuarto de la casa, y su tamaño es la suma de XP de las apps que tiene asignadas. Un cuarto vacío de actividad se nota al vuelo: su vértice se hunde hacia el centro.',
      ),
    },
  ],
}

export const cuerpoWrapped: CuerpoTutorial = {
  preparar: () => {
    useWrappedUi.getState().abrir()
  },
  pasos: [
    {
      sel: 'wrapped.laminas',
      esperar: 'wrapped.laminas',
      texto: T(
        'tut.wrapped.1.texto',
        'Estilo historias: toca el lado derecho para avanzar, el izquierdo para retroceder, y mantén pulsado para pausar en una lámina.',
      ),
    },
    {
      sel: 'wrapped.tipo',
      titulo: T('tut.wrapped.2.titulo', 'Semana, mes o año'),
      texto: T(
        'tut.wrapped.2.texto',
        'Cada tipo arma sus propias láminas con sus propios datos — el resumen anual de Pep@ es el más largo, con los momentos más altos y más bajos del año entero.',
      ),
    },
    {
      sel: 'wrapped.periodo',
      titulo: T('tut.wrapped.3.titulo', 'Moverse por periodos'),
      texto: T(
        'tut.wrapped.3.texto',
        'Las flechas ‹ › recorren periodos ya cerrados: no se puede adelantar más allá de hoy, así que siempre se compara contra algo real.',
      ),
    },
    {
      sel: 'wrapped.compartir',
      titulo: T('tut.wrapped.4.titulo', 'Compartir una lámina'),
      texto: T(
        'tut.wrapped.4.texto',
        'Copia el texto de la lámina que estés viendo, lista para pegar donde quieras — sin capturas de pantalla.',
      ),
    },
    {
      texto: T(
        'tut.wrapped.5.texto',
        'Un punto junto al botón que lo abre avisa cuando hay un resumen nuevo sin ver; abrirlo lo apaga.',
      ),
    },
  ],
}

