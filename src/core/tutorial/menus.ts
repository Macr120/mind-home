import type { TextoTut, TutorialDef } from './tipos'
import { clickTut, elTut, esperarTut } from './dom'
import { useLayout } from '../state/layoutStore'
import { useEditorUi } from '../state/editorUiStore'
import { useRutinasUI } from '../state/rutinasUiStore'

/**
 * Tutoriales de los menús y el HUD de la casa (los de las apps viven en
 * `src/rooms/<id>/tutorial.ts`). Redacción en español neutro, sin marcas de
 * género y sin la voz teatral del mago.
 */

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Abre `boton` solo si `sel` aún no está en pantalla (idempotente para Atrás). */
const abrirSiFalta = (sel: string, boton: string) => {
  if (!elTut(sel)) clickTut(boton)
}

/** Cambia a una pestaña del menú lateral esperando a que exista su botón. */
export const irAPestanaMenu = async (tab: string) => {
  await esperarTut(tab, 2000)
  clickTut(tab)
}

export const tutorialCasa: TutorialDef = {
  id: 'casa',
  titulo: T('tut.casa.titulo', 'Tu casa'),
  resumen: T(
    'tut.casa.resumen',
    'La casa es el mapa de tus apps: cada cuarto guarda una. Te mueves con el joystick o WASD, cambias de vista con V y abres el menú con el botón de arriba a la izquierda. La rueda de herramientas da movimientos, juguetes y vehículos; el reloj lleva el calendario y los avisos.',
  ),
  preparar: () => {
    clickTut('menu.retraer')
  },
  pasos: [
    {
      texto: T(
        'tut.casa.1.texto',
        'Esta es tu casa: cada cuarto guarda una app. Te muestro los controles básicos.',
      ),
    },
    {
      sel: 'menu.abrir',
      titulo: T('tut.casa.2.titulo', 'El menú principal'),
      texto: T(
        'tut.casa.2.texto',
        'Este botón abre el menú: tus cuartos, el catálogo de plantillas (apps) y el inventario de objetos.',
      ),
    },
    {
      sel: 'nav.joystick',
      titulo: T('tut.casa.3.titulo', 'Moverse'),
      texto: T(
        'tut.casa.3.texto',
        'Camina con el joystick, con WASD o con las flechas del teclado. Al cruzar la puerta de un cuarto, entras.',
      ),
    },
    {
      sel: 'nav.vistas',
      titulo: T('tut.casa.4.titulo', 'Vistas'),
      texto: T(
        'tut.casa.4.texto',
        'Tres cámaras: isométrica, tercera y primera persona. Cambia aquí o con la tecla V.',
      ),
    },
    {
      sel: 'herr.boton',
      titulo: T('tut.casa.5.titulo', 'Herramientas'),
      texto: T(
        'tut.casa.5.texto',
        'La rueda de herramientas: movimientos (correr, bailar…), juguetes (láser, grafiti…) y vehículos.',
      ),
    },
    {
      sel: 'reloj.widget',
      titulo: T('tut.casa.6.titulo', 'El reloj'),
      texto: T(
        'tut.casa.6.texto',
        'La hora de la casa. Desde aquí se abren el calendario y el panel de rutinas con tus avisos del día.',
      ),
    },
    {
      sel: 'chat.caja',
      titulo: T('tut.casa.7.titulo', 'El chat'),
      texto: T(
        'tut.casa.7.texto',
        'El chat del arquitecto: cuéntale qué hiciste y lo registra en la app correcta, o pídele cambios en la casa.',
      ),
    },
    {
      texto: T(
        'tut.casa.8.texto',
        'Eso es lo básico. Cada menú y cada app tienen su propio botón ? con su tutorial.',
      ),
    },
  ],
}

export const tutorialMenuCuartos: TutorialDef = {
  id: 'menu-cuartos',
  titulo: T('tut.menu-cuartos.titulo', 'Menú · Cuartos'),
  resumen: T(
    'tut.menu-cuartos.resumen',
    'La pestaña Cuartos lista los cuartos de tu casa por categoría, con su progreso. Cada tarjeta tiene Editar (personalizar el cuarto) y Entrar (abrir su app) o + Asignar si aún no tiene app. Abajo puedes crear cuartos nuevos.',
  ),
  preparar: () => {
    clickTut('menu.abrir')
  },
  pasos: [
    {
      sel: 'menu.tab.cuartos',
      alEntrar: () => irAPestanaMenu('menu.tab.cuartos'),
      texto: T(
        'tut.menu-cuartos.1.texto',
        'La pestaña Cuartos lista todos los cuartos de tu casa, agrupados por categoría.',
      ),
    },
    {
      sel: 'menu.resumen',
      titulo: T('tut.menu-cuartos.2.titulo', 'Tu resumen'),
      texto: T(
        'tut.menu-cuartos.2.texto',
        'Tu personaje vive de tu actividad real: aquí ves su estado y el nivel de cada app.',
      ),
    },
    {
      sel: 'menu.cuartos.lista',
      titulo: T('tut.menu-cuartos.3.titulo', 'Las tarjetas'),
      texto: T(
        'tut.menu-cuartos.3.texto',
        'Cada tarjeta es un cuarto: su icono, su nombre y el progreso de su app, agrupados en Cuerpo, Mente, Complemento y Configuración.',
      ),
    },
    {
      sel: 'menu.cuartos.editar',
      titulo: T('tut.menu-cuartos.4.titulo', 'Editar'),
      texto: T(
        'tut.menu-cuartos.4.texto',
        'Editar abre el editor del cuarto: forma, colores, muros y objetos. (No lo pulses ahora: cerraría este menú.)',
      ),
    },
    {
      sel: 'menu.cuartos.entrar',
      titulo: T('tut.menu-cuartos.5.titulo', 'Entrar y Asignar'),
      texto: T(
        'tut.menu-cuartos.5.texto',
        'Entrar abre la app del cuarto. Si un cuarto no tiene app todavía, verás + Asignar para elegirle una.',
      ),
    },
    {
      sel: 'menu.cuartos.crear',
      titulo: T('tut.menu-cuartos.6.titulo', 'Crear cuarto'),
      texto: T(
        'tut.menu-cuartos.6.texto',
        'Crear cuarto abre el editor de mapa con el pincel listo para dibujar el cuarto nuevo.',
      ),
    },
    {
      texto: T(
        'tut.menu-cuartos.7.texto',
        'En resumen: Editar para personalizar, Entrar para usar la app. Las otras pestañas tienen su propio tutorial.',
      ),
    },
  ],
}

export const tutorialMenuPlantillas: TutorialDef = {
  id: 'menu-plantillas',
  titulo: T('tut.menu-plantillas.titulo', 'Menú · Plantillas'),
  resumen: T(
    'tut.menu-plantillas.resumen',
    'Las plantillas son las apps de la casa: se asignan a un objeto de un cuarto. En esta pestaña está el catálogo completo, incluidas las plantillas que tú crees con bloques (notas, listas, contadores…).',
  ),
  preparar: () => {
    clickTut('menu.abrir')
  },
  pasos: [
    {
      sel: 'menu.tab.plantillas',
      alEntrar: () => irAPestanaMenu('menu.tab.plantillas'),
      texto: T(
        'tut.menu-plantillas.1.texto',
        'Una plantilla es una app (Cocina, Ejercicio, Finanzas…). Se asigna a un objeto de un cuarto y se abre al entrar.',
      ),
    },
    {
      sel: 'menu.plantillas.catalogo',
      titulo: T('tut.menu-plantillas.2.titulo', 'El catálogo'),
      texto: T(
        'tut.menu-plantillas.2.texto',
        'El catálogo completo: las apps de serie y las tuyas, organizadas por grupos. Toca una para asignarla a un cuarto.',
      ),
    },
    {
      sel: 'menu.plantillas.crear',
      titulo: T('tut.menu-plantillas.3.titulo', 'Plantillas propias'),
      texto: T(
        'tut.menu-plantillas.3.texto',
        'Crea plantillas propias armándolas con bloques: notas, checklists, contadores, hábitos, galerías…',
      ),
    },
    {
      texto: T(
        'tut.menu-plantillas.4.texto',
        'Un mismo cuarto puede tener varias apps: al entrar aparece un lanzador para elegir.',
      ),
    },
  ],
}

export const tutorialMenuInventario: TutorialDef = {
  id: 'menu-inventario',
  titulo: T('tut.menu-inventario.titulo', 'Menú · Inventario'),
  resumen: T(
    'tut.menu-inventario.resumen',
    'El inventario guarda los objetos para decorar la casa: la biblioteca por categorías y los objetos especiales (vehículos, fuentes, juegos de parque, luces). Con el menú abierto puedes arrastrarlos directo a la escena.',
  ),
  preparar: () => {
    clickTut('menu.abrir')
  },
  pasos: [
    {
      sel: 'menu.tab.inventario',
      alEntrar: () => irAPestanaMenu('menu.tab.inventario'),
      texto: T(
        'tut.menu-inventario.1.texto',
        'El inventario: todos los objetos que puedes colocar en tu casa.',
      ),
    },
    {
      sel: 'menu.inv.sub.objetos',
      alEntrar: async () => {
        await irAPestanaMenu('menu.tab.inventario')
        clickTut('menu.inv.sub.objetos')
      },
      titulo: T('tut.menu-inventario.2.titulo', 'Objetos'),
      texto: T(
        'tut.menu-inventario.2.texto',
        'Tu biblioteca de objetos por categorías y carpetas. Puedes renombrarlos y organizarlos.',
      ),
    },
    {
      sel: 'menu.inv.sub.especiales',
      alEntrar: () => {
        clickTut('menu.inv.sub.especiales')
      },
      titulo: T('tut.menu-inventario.3.titulo', 'Objetos especiales'),
      texto: T(
        'tut.menu-inventario.3.texto',
        'Los que hacen algo: vehículos montables, pistolas de juguete, fuentes, juegos de parque y luces.',
      ),
    },
    {
      sel: 'menu.inv.catalogo',
      titulo: T('tut.menu-inventario.4.titulo', 'Colocar'),
      texto: T(
        'tut.menu-inventario.4.texto',
        'Con este menú abierto, arrastra una miniatura directo a la escena 3D para colocarla.',
      ),
    },
    {
      texto: T(
        'tut.menu-inventario.5.texto',
        'Para mover, pintar o borrar lo ya colocado, usa el Editor (pestaña Objetos).',
      ),
    },
  ],
}

export const tutorialEditorMapa: TutorialDef = {
  id: 'editor-mapa',
  titulo: T('tut.editor-mapa.titulo', 'El editor'),
  resumen: T(
    'tut.editor-mapa.resumen',
    'El editor personaliza toda la casa en 4 pestañas: Mapa (dibujar cuartos y muros en el croquis), Personajes (tu avatar y asistentes), Objetos (muebles: color, tamaño, rotación) y Configuraciones (estilo visual, tema, idioma).',
  ),
  preparar: () => {
    useEditorUi.getState().setTab('mapa')
    useLayout.getState().setEditMode(true)
  },
  pasos: [
    {
      sel: 'editor.tabs',
      texto: T(
        'tut.editor-mapa.1.texto',
        'El editor de la casa tiene 4 pestañas: Mapa, Personajes, Objetos y Configuraciones. Vamos una por una.',
      ),
    },
    {
      sel: 'editor.contenido',
      alEntrar: () => useEditorUi.getState().setTab('mapa'),
      titulo: T('tut.editor-mapa.2.titulo', 'Mapa'),
      texto: T(
        'tut.editor-mapa.2.texto',
        'Dibuja cuartos, muros y pisos en el croquis con los modos y pinceles de arriba. Lo que trazas aparece al momento en el 3D.',
      ),
    },
    {
      sel: 'editor.contenido',
      alEntrar: () => useEditorUi.getState().setTab('personajes'),
      titulo: T('tut.editor-mapa.3.titulo', 'Personajes'),
      texto: T(
        'tut.editor-mapa.3.texto',
        'Tu avatar y tus asistentes: cuerpo, color, tamaño, ropa y animaciones, con vista previa 3D.',
      ),
    },
    {
      sel: 'editor.contenido',
      alEntrar: () => useEditorUi.getState().setTab('objetos'),
      titulo: T('tut.editor-mapa.4.titulo', 'Objetos'),
      texto: T(
        'tut.editor-mapa.4.texto',
        'Los objetos colocados: color, tamaño y rotación. También puedes crear objetos propios por piezas.',
      ),
    },
    {
      sel: 'editor.contenido',
      alEntrar: () => useEditorUi.getState().setTab('config'),
      titulo: T('tut.editor-mapa.5.titulo', 'Configuraciones'),
      texto: T(
        'tut.editor-mapa.5.texto',
        'El estilo visual del mapa (tema, luz, render), el tema de la interfaz, el idioma y las notificaciones.',
      ),
    },
    {
      sel: 'editor.listo',
      titulo: T('tut.editor-mapa.6.titulo', 'Listo'),
      texto: T(
        'tut.editor-mapa.6.texto',
        'Todo se guarda solo mientras editas. Listo cierra el editor y te regresa al juego.',
      ),
    },
  ],
}

export const tutorialEditorCuarto: TutorialDef = {
  id: 'editor-cuarto',
  titulo: T('tut.editor-cuarto.titulo', 'Editar un cuarto'),
  resumen: T(
    'tut.editor-cuarto.resumen',
    'Al editar un cuarto concreto, el croquis se enfoca en él: forma, piso, muros, color y nombre. La flecha del panel vuelve al mapa completo, y el botón flotante sobre el cuarto sale de él.',
  ),
  pasos: [
    {
      texto: T(
        'tut.editor-cuarto.1.texto',
        'Estás editando un cuarto concreto: el croquis y la cámara se enfocan en él.',
      ),
    },
    {
      sel: 'editor.contenido',
      titulo: T('tut.editor-cuarto.2.titulo', 'Qué se edita'),
      texto: T(
        'tut.editor-cuarto.2.texto',
        'Aquí cambias su forma, piso, muros, puertas, color y nombre, y gestionas sus objetos y su app.',
      ),
    },
    {
      sel: 'editor.volverMapa',
      titulo: T('tut.editor-cuarto.3.titulo', 'Volver al mapa'),
      texto: T(
        'tut.editor-cuarto.3.texto',
        'Esta flecha vuelve al mapa completo sin cerrar el editor.',
      ),
    },
    {
      texto: T(
        'tut.editor-cuarto.4.texto',
        'También hay un botón flotante «Salir del cuarto» sobre el propio cuarto en el 3D.',
      ),
    },
  ],
}

export const tutorialHerramientas: TutorialDef = {
  id: 'herramientas',
  titulo: T('tut.herramientas.titulo', 'Rueda de herramientas'),
  resumen: T(
    'tut.herramientas.resumen',
    'La rueda de herramientas equipa a tu personaje: movimientos (correr, bailar, saltar…), juguetes (láser, portales, grafiti…) y vehículos montables. Tiene dos niveles (categoría → herramienta) y puedes llevar hasta 3 equipadas.',
  ),
  preparar: () => {
    clickTut('menu.retraer')
  },
  pasos: [
    {
      sel: 'herr.boton',
      texto: T(
        'tut.herramientas.1.texto',
        'Este botón abre la rueda de herramientas de tu personaje.',
      ),
    },
    {
      sel: 'herr.rueda',
      alEntrar: () => abrirSiFalta('herr.rueda', 'herr.boton'),
      esperar: 'herr.rueda',
      titulo: T('tut.herramientas.2.titulo', 'Dos niveles'),
      texto: T(
        'tut.herramientas.2.texto',
        'Primero eliges categoría (Movimientos, Juguetes o Vehículos) y luego la herramienta. Puedes equipar hasta 3 a la vez.',
      ),
    },
    {
      sel: 'herr.rueda',
      alEntrar: () => abrirSiFalta('herr.rueda', 'herr.boton'),
      titulo: T('tut.herramientas.3.titulo', 'El centro'),
      texto: T(
        'tut.herramientas.3.texto',
        'El centro (Cubo) suelta todo y devuelve el cubo de vistas. Las herramientas equipadas ponen sus controles junto a él.',
      ),
    },
    {
      alEntrar: () => {
        clickTut('herr.fondo')
      },
      texto: T(
        'tut.herramientas.4.texto',
        'Se cierra tocando fuera de la rueda. Pruébala cuando quieras.',
      ),
    },
  ],
}

export const tutorialNavegacion: TutorialDef = {
  id: 'navegacion',
  titulo: T('tut.navegacion.titulo', 'Cámara y movimiento'),
  resumen: T(
    'tut.navegacion.resumen',
    'Hay tres vistas: isométrica, tercera y primera persona (tecla V). Te mueves con el joystick, WASD o flechas; el cubo y los botones de rotación orientan la cámara. En 3ª/1ª persona existe además el Editor 3D para tocar el mundo directamente.',
  ),
  pasos: [
    {
      sel: 'nav.vistas',
      texto: T(
        'tut.navegacion.1.texto',
        'Tres cámaras: Iso (vista de casa de muñecas), 3ª y 1ª persona. Cambia aquí o con la tecla V.',
      ),
    },
    {
      sel: 'nav.controles',
      titulo: T('tut.navegacion.2.titulo', 'Orientarse'),
      texto: T(
        'tut.navegacion.2.texto',
        'En iso, el cubo gira la cámara por caras; en 3ª/1ª, arrastra el pad para mirar alrededor.',
      ),
    },
    {
      sel: 'nav.rotar',
      titulo: T('tut.navegacion.3.titulo', 'Rotar y centrar'),
      texto: T(
        'tut.navegacion.3.texto',
        'Rota la vista a los lados o céntrala de nuevo en el mapa.',
      ),
    },
    {
      sel: 'nav.joystick',
      titulo: T('tut.navegacion.4.titulo', 'Moverse'),
      texto: T(
        'tut.navegacion.4.texto',
        'Camina con el joystick, WASD o las flechas. En el agua nadas; con un vehículo montado, conduces.',
      ),
    },
    {
      texto: T(
        'tut.navegacion.5.texto',
        'En 3ª/1ª persona aparece el botón Editor 3D: toca objetos, muros o personajes para editarlos en el sitio.',
      ),
    },
  ],
}

export const tutorialRelojCalendario: TutorialDef = {
  id: 'reloj-calendario',
  titulo: T('tut.reloj-calendario.titulo', 'Reloj y calendario'),
  resumen: T(
    'tut.reloj-calendario.resumen',
    'El reloj muestra la hora de la casa y abre el calendario: vistas Día, Semana, Mes, Año y Cronograma. Puedes crear eventos con + Nueva o trazando directo en la rejilla; las apps aportan sus propios eventos.',
  ),
  pasos: [
    {
      sel: 'reloj.widget',
      texto: T(
        'tut.reloj-calendario.1.texto',
        'El reloj de la casa: la hora, la fase del cielo y el acceso al calendario y a las rutinas.',
      ),
    },
    {
      sel: 'cal.panel',
      alEntrar: () => useRutinasUI.getState().abrirCalendario(),
      esperar: 'cal.panel',
      titulo: T('tut.reloj-calendario.2.titulo', 'El calendario'),
      texto: T(
        'tut.reloj-calendario.2.texto',
        'Todo lo agendado de tu casa en un solo calendario.',
      ),
    },
    {
      sel: 'cal.vistas',
      titulo: T('tut.reloj-calendario.3.titulo', 'Vistas'),
      texto: T(
        'tut.reloj-calendario.3.texto',
        'Día y Semana muestran la rejilla por horas; Mes y Año, el panorama; Cronograma, tus metas en el tiempo.',
      ),
    },
    {
      sel: 'cal.hoy',
      titulo: T('tut.reloj-calendario.4.titulo', 'Navegar'),
      texto: T(
        'tut.reloj-calendario.4.texto',
        'Hoy regresa a la fecha actual; las flechas ‹ › avanzan o retroceden el periodo.',
      ),
    },
    {
      sel: 'cal.nueva',
      titulo: T('tut.reloj-calendario.5.titulo', 'Crear eventos'),
      texto: T(
        'tut.reloj-calendario.5.texto',
        '+ Nueva crea un evento; también puedes trazar directo en la rejilla con el mouse para darle hora y duración.',
      ),
    },
    {
      texto: T(
        'tut.reloj-calendario.6.texto',
        'Las apps agregan sus propios eventos (viajes, metas con fecha) sin que tengas que copiarlos.',
      ),
    },
  ],
}

export const tutorialChat: TutorialDef = {
  id: 'chat',
  titulo: T('tut.chat.titulo', 'El chat del arquitecto'),
  resumen: T(
    'tut.chat.resumen',
    'El chat registra lo que le cuentes en la app correcta («corrí 20 min» va a Ejercicio), edita la casa por texto y guarda memorias. Cada asistente tiene su cara y su voz; el manual lista todo lo que puedes pedir.',
  ),
  pasos: [
    {
      sel: 'chat.caja',
      texto: T(
        'tut.chat.1.texto',
        'El chat del arquitecto: registra tu día, edita la casa y responde tus dudas.',
      ),
    },
    {
      sel: 'chat.input',
      titulo: T('tut.chat.2.titulo', 'Escribir'),
      texto: T(
        'tut.chat.2.texto',
        'Escribe libre: «corrí 20 min», «gasté 250 en el súper»… El chip de al lado muestra a qué app irá. Usa @cuarto para forzar destino.',
      ),
    },
    {
      sel: 'chat.asistente',
      titulo: T('tut.chat.3.titulo', 'Asistentes'),
      texto: T(
        'tut.chat.3.texto',
        'Tu asistente pone cara y voz a las respuestas. Tócalo para ver la conversación, cambiar de asistente o crear más.',
      ),
    },
    {
      sel: 'chat.manual',
      alEntrar: () => abrirSiFalta('chat.manual', 'chat.asistente'),
      titulo: T('tut.chat.4.titulo', 'El manual'),
      texto: T(
        'tut.chat.4.texto',
        'El manual lista los comandos: agregar o quitar cuartos, crear objetos, recordar cosas…',
      ),
    },
    {
      texto: T(
        'tut.chat.5.texto',
        'También puedes preguntar «¿cómo funciona la cocina?» o pedir «tutorial de ejercicio» aquí mismo.',
      ),
    },
  ],
}

export const tutorialRutinas: TutorialDef = {
  id: 'rutinas',
  titulo: T('tut.rutinas.titulo', 'Rutinas'),
  resumen: T(
    'tut.rutinas.resumen',
    'El panel de rutinas lleva tu checklist del día: cada rutina tiene pasos y cada paso puede registrar en su propia app. A la hora señalada el asistente avisa, y todo lo agendado se ve también en el calendario.',
  ),
  preparar: () => {
    const ui = useRutinasUI.getState()
    if (!ui.panel) ui.togglePanel()
  },
  pasos: [
    {
      sel: 'rutinas.panel',
      texto: T(
        'tut.rutinas.1.texto',
        'El panel de rutinas: la checklist de hoy arriba y todas tus rutinas abajo.',
      ),
    },
    {
      sel: 'rutinas.nueva',
      titulo: T('tut.rutinas.2.titulo', 'Crear rutinas'),
      texto: T(
        'tut.rutinas.2.texto',
        'Una rutina tiene hora, repetición y pasos; cada paso puede registrar en su app (p. ej. «desayuno» en Cocina).',
      ),
    },
    {
      texto: T(
        'tut.rutinas.3.texto',
        'A su hora, el asistente te avisa. Todo lo agendado también aparece en el calendario del reloj.',
      ),
    },
  ],
}

/** Los tutoriales de menús/HUD por id (el chat los busca aquí). */
export const TUTORIALES_MENU: TutorialDef[] = [
  tutorialCasa,
  tutorialMenuCuartos,
  tutorialMenuPlantillas,
  tutorialMenuInventario,
  tutorialEditorMapa,
  tutorialEditorCuarto,
  tutorialHerramientas,
  tutorialNavegacion,
  tutorialRelojCalendario,
  tutorialChat,
  tutorialRutinas,
]
