import type { CuerpoTutorial, TextoTut } from './tipos'
import { clickTut, elTut, esperarTut, irAPestanaMenu } from './dom'
import { useCam } from '../state/cameraStore'
import { useHud } from '../state/hudStore'
import { useLayout } from '../state/layoutStore'
import { useEditorUi } from '../state/editorUiStore'
import { abrirApp } from '../abrirApp'

/**
 * Tutoriales de los menús y el HUD de la casa (los de las apps viven en
 * `src/rooms/<id>/tutorial.ts`). Corren sobre la casa REAL del visitante, así
 * que dos reglas, no una sola:
 *
 * 1. Voz neutra: español sin marcas de género, sin la voz teatral del mago,
 *    2ª persona.
 * 2. Cada paso trae un HECHO CONCRETO, no solo el nombre del control. En las
 *    apps ese hecho sale del año de Pep@ («38 victorias, mejor vuelta 41.8s»);
 *    aquí no hay Pep@, así que el hecho es de la MECÁNICA del propio sistema
 *    («ese hueco de la esquina lo comparten cuatro cosas, y solo se ve una a
 *    la vez» en vez de «aquí está el cubo de vistas»). Un paso que solo nombra
 *    el botón que el usuario ya está mirando no cuenta como explicado.
 *
 * Cada paso, cuando cabe: (a) dónde estás en el recorrido, (b) qué información
 * produce o decide la pantalla, (c) qué cambia en el resto de la casa. Tarjeta
 * de 320 px: 2-3 frases por paso, no más — un paso que no cabe son dos pasos.
 */

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Abre `boton` solo si `sel` aún no está en pantalla (idempotente para Atrás). */
const abrirSiFalta = (sel: string, boton: string) => {
  if (!elTut(sel)) clickTut(boton)
}

/**
 * Cierra TODO lo que el tour de la casa pudo dejar abierto (menú lateral,
 * rueda, panel del reloj, panel de música). Cada paso lo llama antes de abrir
 * lo suyo: así navegar con Atrás/Siguiente nunca deja dos menús encimados.
 * Todo es no-op sobre lo que ya está cerrado.
 */
const cerrarPanelesHud = () => {
  clickTut('herr.fondo')
  if (elTut('musica.panel')) clickTut('musica.boton')
  if (elTut('reloj.panel')) clickTut('reloj.fase')
  if (elTut('chat.adjuntar.menu')) clickTut('chat.foto')
  clickTut('menu.retraer')
  // El paso del editor del tour de la casa lo deja abierto: al navegar se cierra.
  if (useLayout.getState().editMode) useLayout.getState().setEditMode(false)
}

/** Abre el editor en una pestaña concreta (preparar de los tours del editor). */
const abrirEditorEn = (tab: 'mapa' | 'personajes' | 'objetos' | 'config') => () => {
  useEditorUi.getState().setTab(tab)
  useLayout.getState().setEditMode(true)
}

export const cuerpoCasa: CuerpoTutorial = {
  preparar: () => {
    clickTut('menu.retraer')
  },
  // Los menús se ABREN de verdad, uno por uno, y se ven abiertos: cada paso
  // cierra lo del anterior (cerrarPanelesHud) y despliega lo suyo.
  pasos: [
    {
      alEntrar: () => cerrarPanelesHud(),
      texto: T(
        'tut.casa.1.texto',
        'Esta es tu casa: cada cuarto guarda una app. Te muestro los controles básicos.',
      ),
    },
    {
      sel: 'menu.cuartos.lista',
      alEntrar: async () => {
        cerrarPanelesHud()
        useHud.getState().setPlegado('supIzq', false)
        clickTut('menu.abrir')
        await irAPestanaMenu('menu.tab.cuartos')
      },
      titulo: T('tut.casa.2.titulo', 'El menú principal'),
      texto: T(
        'tut.casa.2.texto',
        'Lo abrí para que lo veas: es el menú principal, con tus cuartos y sus apps. Sus otras pestañas traen el catálogo de plantillas (apps) y el inventario de objetos.',
      ),
    },
    {
      sel: 'menu.plantillas.catalogo',
      alEntrar: async () => {
        useHud.getState().setPlegado('supIzq', false)
        clickTut('menu.abrir')
        await irAPestanaMenu('menu.tab.plantillas')
      },
      titulo: T('tut.casa.2b.titulo', 'El catálogo de apps'),
      texto: T(
        'tut.casa.2b.texto',
        'Su segunda pestaña: el catálogo de plantillas — todas las apps que puede llevar la casa, cada una lista para asignarse a un cuarto.',
      ),
    },
    {
      sel: 'menu.inv.catalogo',
      alEntrar: async () => {
        useHud.getState().setPlegado('supIzq', false)
        clickTut('menu.abrir')
        await irAPestanaMenu('menu.tab.inventario')
      },
      titulo: T('tut.casa.2c.titulo', 'El inventario'),
      texto: T(
        'tut.casa.2c.texto',
        'Y la tercera: el inventario — los objetos y piezas que guardas de tus cuartos, listos para volver a colocarse donde quieras.',
      ),
    },
    {
      sel: 'nav.joystick',
      alEntrar: () => {
        cerrarPanelesHud()
        useHud.getState().setPlegado('infIzq', false)
      },
      titulo: T('tut.casa.3.titulo', 'Moverse'),
      texto: T(
        'tut.casa.3.texto',
        'Camina con el joystick, con WASD o con las flechas del teclado: la casa entera se recorre a pie. Pasear no abre las apps — para entrar, toca el objeto con la esfera flotante del cuarto.',
      ),
    },
    {
      sel: 'nav.vistas',
      alEntrar: async () => {
        cerrarPanelesHud()
        useHud.getState().setPlegado('infDer', false)
        // Recorrido EN VIVO: 3ª persona → 1ª → de vuelta a la isométrica.
        useCam.getState().setVista('tercera')
        await new Promise((r) => setTimeout(r, 900))
        useCam.getState().setVista('primera')
        await new Promise((r) => setTimeout(r, 900))
        useCam.getState().setVista('iso')
      },
      titulo: T('tut.casa.4.titulo', 'Tres formas de mirar'),
      texto: T(
        'tut.casa.4.texto',
        'Te las acabo de enseñar en vivo: isométrica, tercera y primera persona (o la tecla V). Tocar Iso también recentra la cámara sobre tu personaje: la salida rápida si te fuiste lejos explorando.',
      ),
    },
    {
      sel: 'nav.hueco',
      alEntrar: () => {
        cerrarPanelesHud()
        useHud.getState().setPlegado('infDer', false)
      },
      titulo: T('tut.casa.5.titulo', 'Un hueco, varios dueños'),
      texto: T(
        'tut.casa.5.texto',
        'Esa esquina no es solo el cubo de vistas: al acercarte a algo con lo que se puede interactuar —una silla, un vehículo, una cancha— cambia sola por lo que tienes cerca. Nada se activa sin que te acerques.',
      ),
    },
    {
      sel: 'herr.rueda',
      alEntrar: async () => {
        cerrarPanelesHud()
        // La rueda vive en la esquina inferior izquierda; en teléfono vertical
        // el chat desplegado la desmonta entera.
        useHud.getState().setPlegado('infIzq', false)
        useHud.getState().setPlegado('chat', true)
        if (!elTut('herr.rueda')) clickTut('herr.boton')
        await esperarTut('herr.rueda', 2000)
      },
      titulo: T('tut.casa.6.titulo', 'La rueda de herramientas'),
      texto: T(
        'tut.casa.6.texto',
        'Aquí está abierta: movimientos, juguetes, vehículos y construcción, hasta 3 equipados a la vez. Sale del botón junto al joystick, o del hueco de la esquina cuando vas con las manos libres.',
      ),
    },
    {
      sel: 'reloj.panel',
      alEntrar: async () => {
        cerrarPanelesHud()
        useHud.getState().setPlegado('supDer', false)
        abrirSiFalta('reloj.panel', 'reloj.fase')
        await esperarTut('reloj.panel', 2000)
      },
      titulo: T('tut.casa.7.titulo', 'El reloj'),
      texto: T(
        'tut.casa.7.texto',
        'La hora de la casa: tocarla abre el calendario completo, con sus Misiones del día. Y el sol o la luna abren este panel: el paso del tiempo y la luz de la escena.',
      ),
    },
    {
      sel: 'musica.panel',
      alEntrar: async () => {
        cerrarPanelesHud()
        useHud.getState().setPlegado('supDer', false)
        abrirSiFalta('musica.panel', 'musica.boton')
        await esperarTut('musica.panel', 2000)
      },
      titulo: T('tut.casa.8.titulo', 'La música de la casa'),
      texto: T(
        'tut.casa.8.texto',
        'La casa arranca en silencio: si quieres banda sonora, enciende aquí la música. Cada cuarto trae canciones temáticas precargadas, o deja sonar el ambiente general de la casa.',
      ),
    },
    {
      sel: 'editor.tabs',
      alEntrar: async () => {
        cerrarPanelesHud()
        useEditorUi.getState().setTab('mapa')
        useLayout.getState().setEditMode(true)
        await esperarTut('editor.tabs', 2000)
      },
      titulo: T('tut.casa.editor.titulo', 'El editor'),
      texto: T(
        'tut.casa.editor.texto',
        'El botón Editor de arriba abre esto: la personalización completa en cuatro pestañas — Mapa, Personajes, Objetos y Configuraciones. Aquí se dibuja y se viste la casa entera.',
      ),
    },
    // El bloque del chat cierra el tour (pedido del usuario): es la pieza con
    // más miga y así queda fresca al soltar al visitante.
    {
      sel: 'chat.caja',
      sinMago: true,
      alEntrar: () => {
        cerrarPanelesHud()
        // La rueda plegó el chat en vertical: aquí vuelve.
        useHud.getState().setPlegado('chat', false)
      },
      titulo: T('tut.casa.9.titulo', 'El chat'),
      texto: T(
        'tut.casa.9.texto',
        'El chat del arquitecto: cuéntale qué hiciste y lo registra en la app correcta, pídele cambios en la casa, imágenes y hasta modelos 3D para tus cuartos — o simplemente platica un rato.',
      ),
    },
    {
      sel: 'chat.asistente',
      sinMago: true,
      alEntrar: () => {
        cerrarPanelesHud()
        useHud.getState().setPlegado('chat', false)
      },
      titulo: T('tut.casa.asistente.titulo', 'Tu asistente'),
      texto: T(
        'tut.casa.asistente.texto',
        'Este botón es tu asistente: quien te contesta en el chat. Tócalo para abrir su menú y personalizarlo — su forma, su voz y su personalidad.',
      ),
    },
    {
      sel: 'chat.adjuntar.menu',
      sinMago: true,
      alEntrar: async () => {
        cerrarPanelesHud()
        useHud.getState().setPlegado('chat', false)
        abrirSiFalta('chat.adjuntar.menu', 'chat.foto')
        await esperarTut('chat.adjuntar.menu', 2000)
      },
      titulo: T('tut.casa.mas.titulo', 'El menú +'),
      texto: T(
        'tut.casa.mas.texto',
        'Lo abrí para que lo veas: con el + le adjuntas cosas al chat — sube una imagen o un PDF, toma una foto, o pasa a la Máscara AR y al Chat AR cara a cara.',
      ),
    },
    {
      alEntrar: () => {
        cerrarPanelesHud()
        // El paseo por vistas y editor deja la cámara donde cayó: el tour
        // TERMINA con el mapa centrado y encuadrado, listo para explorar.
        useCam.getState().reset()
      },
      texto: T(
        'tut.casa.10.texto',
        'Eso es lo básico. Cada menú y cada app tienen su propio botón ? con su tutorial: pídelo cuando algo no te cuadre.',
      ),
    },
  ],
}

export const cuerpoMenuCuartos: CuerpoTutorial = {
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
        'Tu personaje vive de tu actividad real: aquí ves su humor, su nivel y su racha. Registra algo en cualquier app y lo notarás contento; unos días sin nada y se pone triste — nunca se castiga ni se reinicia.',
      ),
    },
    {
      sel: 'menu.resumen',
      titulo: T('tut.menu-cuartos.2b.titulo', 'Rango, insignias y resumen'),
      texto: T(
        'tut.menu-cuartos.2b.texto',
        'Los dos aros junto a tu personaje son la Montaña de Sísifo (rango del 1 al 12 e insignias) y abajo está tu Wrapped, el resumen de la semana, el mes o el año. Los dos tienen su propio tutorial.',
      ),
    },
    {
      sel: 'menu.cuartos.lista',
      titulo: T('tut.menu-cuartos.3.titulo', 'Las tarjetas'),
      texto: T(
        'tut.menu-cuartos.3.texto',
        'Cada tarjeta es un cuarto: su icono, su nombre y el progreso de su app, agrupados en Cuerpo, Mente, Complemento y Configuración. Los cuartos sin app asignada quedan al final del todo.',
      ),
    },
    {
      sel: 'menu.cuartos.editar',
      titulo: T('tut.menu-cuartos.4.titulo', 'Opciones del cuarto'),
      texto: T(
        'tut.menu-cuartos.4.texto',
        'El engrane despliega las opciones del cuarto en una fila: subirlo o bajarlo en la lista, borrarlo, y Editar, que abre su editor de forma, colores, muros y objetos.',
      ),
    },
    {
      // En una casa sin ninguna app asignada no hay «Entrar»: el mismo botón
      // dice «+ Asignar» (RoomSideMenu pinta una u otra ancla según haya app).
      sel: () => (elTut('menu.cuartos.entrar') ? 'menu.cuartos.entrar' : 'menu.cuartos.asignar'),
      titulo: T('tut.menu-cuartos.5.titulo', 'La tarjeta entera entra'),
      texto: T(
        'tut.menu-cuartos.5.texto',
        'La tarjeta completa es el botón: tócala en cualquier parte y entras a la app del cuarto. Si aún no tiene app, esa misma tarjeta dice + Asignar y abre el catálogo para elegirle una.',
      ),
    },
    {
      sel: 'menu.cuartos.crear',
      titulo: T('tut.menu-cuartos.6.titulo', 'Crear cuarto'),
      texto: T(
        'tut.menu-cuartos.6.texto',
        'Crear cuarto abre el editor de mapa con el pincel listo para dibujar el cuarto nuevo: forma, tamaño y ubicación quedan en tus manos. En el teléfono es más cómodo el atajo de la rueda de herramientas › Construcción › Cuartos, que dibuja directo sobre el mapa sin abrir el panel.',
      ),
    },
    {
      texto: T(
        'tut.menu-cuartos.7.texto',
        'En resumen: Editar para personalizar, Entrar para usar la app. Las otras pestañas de este menú tienen su propio tutorial.',
      ),
    },
  ],
}

export const cuerpoMenuPlantillas: CuerpoTutorial = {
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
      sel: 'menu.plant.sub.cuartos',
      titulo: T('tut.menu-plantillas.2.titulo', 'Dos vistas'),
      texto: T(
        'tut.menu-plantillas.2.texto',
        'Cuartos son las apps de siempre, cada una en su objeto. Infraestructura es distinta: pistas, canchas, huerto, granja o paintball se construyen directo sobre el terreno, sin ocupar un cuarto.',
      ),
    },
    {
      sel: 'menu.plantillas.catalogo',
      titulo: T('tut.menu-plantillas.3.titulo', 'El catálogo'),
      texto: T(
        'tut.menu-plantillas.3.texto',
        'Las apps de serie y las tuyas, organizadas por grupos. Toca una para asignarla a un cuarto o, en Infraestructura, para construirla en el mapa.',
      ),
    },
    {
      sel: 'menu.plantillas.crear',
      titulo: T('tut.menu-plantillas.4.titulo', 'Plantillas propias'),
      texto: T(
        'tut.menu-plantillas.4.texto',
        'Crea plantillas propias armándolas con bloques: notas, checklists, contadores, hábitos, galerías… Este botón abre su propio editor con su propio tutorial.',
      ),
    },
    {
      texto: T(
        'tut.menu-plantillas.5.texto',
        'Un mismo cuarto puede tener varias apps: al entrar aparece un lanzador para elegir cuál abrir.',
      ),
    },
  ],
}

export const cuerpoPlantillasCustom: CuerpoTutorial = {
  preparar: async () => {
    clickTut('menu.abrir')
    await irAPestanaMenu('menu.tab.plantillas')
    await esperarTut('menu.plantillas.crear', 2000)
    clickTut('menu.plantillas.crear')
  },
  pasos: [
    {
      sel: 'plantilla.custom.editor',
      esperar: 'plantilla.custom.editor',
      texto: T(
        'tut.plantillas-custom.1.texto',
        'Este editor arma una app tuya de cero: le das forma con nombre, emoji y bloques, y queda en el catálogo junto a las de serie.',
      ),
    },
    {
      sel: 'plantilla.custom.identidad',
      titulo: T('tut.plantillas-custom.2.titulo', 'Nombre, emoji y color'),
      texto: T(
        'tut.plantillas-custom.2.texto',
        'Cómo se va a llamar y de qué color se pinta en el menú, el catálogo y el calendario si agendas algo suyo.',
      ),
    },
    {
      sel: 'plantilla.custom.tipos',
      titulo: T('tut.plantillas-custom.3.titulo', 'Las herramientas'),
      texto: T(
        'tut.plantillas-custom.3.texto',
        'Doce tipos de bloque: notas, checklist, contador, hábito, sesiones, cuenta regresiva, galería, bitácora, valoración, progreso, lista y enlaces. Cada uno que agregues se vuelve una sección de tu app.',
      ),
    },
    {
      sel: 'plantilla.custom.menus',
      titulo: T('tut.plantillas-custom.menus.titulo', 'Menús y submenús'),
      texto: T(
        'tut.plantillas-custom.menus.texto',
        'Si tu app crece, repártela en pestañas superiores: cada menú lleva su nombre y su emoji, puede tener submenús, y agregas las herramientas dentro del que quieras. Sin menús, todo vive en una sola pantalla.',
      ),
    },
    {
      sel: 'plantilla.custom.bloques',
      titulo: T('tut.plantillas-custom.4.titulo', 'El orden importa'),
      texto: T(
        'tut.plantillas-custom.4.texto',
        'Los bloques agregados se reordenan con las flechas y se quitan con la ✕ — quitar uno borra sus datos al guardar, así que revisa antes de confirmar. Con el desplegable «Menú» pasan de una pestaña a otra sin perder nada.',
      ),
    },
    {
      sel: 'plantilla.custom.guardar',
      titulo: T('tut.plantillas-custom.5.titulo', 'Guardar'),
      texto: T(
        'tut.plantillas-custom.5.texto',
        'Con nombre y al menos un bloque, Guardar la deja lista en el catálogo. Desde ahí se asigna a un objeto igual que cualquier plantilla de serie.',
      ),
    },
    {
      texto: T(
        'tut.plantillas-custom.6.texto',
        'Puedes volver a editarla cuando quieras: sus bloques y sus datos no se tocan, solo cambia lo que edites.',
      ),
    },
  ],
}

export const cuerpoMenuInventario: CuerpoTutorial = {
  preparar: () => {
    clickTut('menu.abrir')
  },
  pasos: [
    {
      sel: 'menu.tab.inventario',
      alEntrar: () => irAPestanaMenu('menu.tab.inventario'),
      texto: T(
        'tut.menu-inventario.1.texto',
        'El inventario: todos los objetos que puedes colocar en tu casa, listos para arrastrar.',
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
        'Tu biblioteca de objetos por categorías y carpetas. Puedes renombrarlos y organizarlos para encontrarlos rápido la próxima vez.',
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
        'Los que hacen algo, no solo decoran: vehículos montables, pistolas de juguete, fuentes, juegos de parque y luces.',
      ),
    },
    {
      sel: 'menu.inv.catalogo',
      titulo: T('tut.menu-inventario.4.titulo', 'Colocar'),
      texto: T(
        'tut.menu-inventario.4.texto',
        'Con este menú abierto, arrastra una miniatura directo a la escena 3D para colocarla donde quieras.',
      ),
    },
    {
      texto: T(
        'tut.menu-inventario.5.texto',
        'Para mover, pintar o borrar lo ya colocado, usa el Editor (pestaña Objetos) — este menú es solo para traer cosas nuevas a escena.',
      ),
    },
  ],
}

export const cuerpoEditorMapa: CuerpoTutorial = {
  preparar: abrirEditorEn('mapa'),
  pasos: [
    {
      sel: 'editor.tabs',
      texto: T(
        'tut.editor-mapa.1.texto',
        'El editor de la casa tiene 4 pestañas: Mapa, Personajes, Objetos y Configuraciones. Este tour es el de Mapa; los otros tres tienen el suyo.',
      ),
    },
    {
      sel: 'editor.contenido',
      titulo: T('tut.editor-mapa.2.titulo', 'El croquis'),
      texto: T(
        'tut.editor-mapa.2.texto',
        'Dibujas sobre una rejilla vista desde arriba: cuartos, muros, puertas, ventanas y pisos, con los modos y pinceles de la barra superior. Lo que trazas aparece al momento en el 3D, sin recargar nada.',
      ),
    },
    {
      texto: T(
        'tut.editor-mapa.3.texto',
        'Los techos son por celda: cada una puede tener su propia forma o material, así que un mismo cuarto puede combinar aguas distintas en vez de un solo techo plano.',
      ),
    },
    {
      texto: T(
        'tut.editor-mapa.4.texto',
        'La casa también tiene niveles: pisos apilables hacia arriba y un sótano hacia abajo. Cada nivel nuevo nace con su propia forma de subir —una escalera o un hueco en la losa— que perfora el piso de encima.',
      ),
    },
    {
      sel: 'editor.listo',
      titulo: T('tut.editor-mapa.5.titulo', 'Listo'),
      texto: T(
        'tut.editor-mapa.5.texto',
        'Todo se guarda solo mientras editas. Listo cierra el editor y te regresa al juego con la casa ya como la dejaste.',
      ),
    },
  ],
}

export const cuerpoEditorPersonajes: CuerpoTutorial = {
  preparar: abrirEditorEn('personajes'),
  pasos: [
    {
      sel: 'editor.contenido',
      texto: T(
        'tut.editor-personajes.1.texto',
        'Tu personaje principal y tus asistentes viven en el mismo editor: elige a quién editar arriba y las herramientas cambian según lo que tenga sentido para cada uno.',
      ),
    },
    {
      sel: 'editor.pers.tool.rostro',
      titulo: T('tut.editor-personajes.2.titulo', 'Rostro y foto'),
      texto: T(
        'tut.editor-personajes.2.texto',
        'Expresión, peinado y color de pelo, o directo una foto tuya para que el personaje se parezca a ti. No todos los cuerpos admiten rostro propio.',
      ),
    },
    {
      sel: 'editor.pers.tool.ropa',
      titulo: T('tut.editor-personajes.3.titulo', 'Ropa por categoría'),
      texto: T(
        'tut.editor-personajes.3.texto',
        'Cada prenda se pone, se quita y cambia de color por separado: camisa, pantalón, calzado, accesorios. Se combinan libremente.',
      ),
    },
    {
      sel: 'editor.pers.atuendos',
      titulo: T('tut.editor-personajes.4.titulo', 'Atuendos guardados'),
      texto: T(
        'tut.editor-personajes.4.texto',
        'Guarda una combinación completa de ropa como un atuendo y cámbiate entero con un toque, sin rearmar prenda por prenda cada vez.',
      ),
      // Los atuendos viven DENTRO de la herramienta Ropa (el paso anterior solo
      // mostró su botón): entrar aquí, y desplegada la sección, que nace plegada.
      alEntrar: () => {
        clickTut('editor.pers.tool.ropa')
        useEditorUi.getState().abrirConfigGrupo('ropa-atuendos')
      },
    },
    {
      sel: 'editor.pers.guardarropa',
      titulo: T('tut.editor-personajes.5.titulo', 'Guardarropa por cuarto'),
      texto: T(
        'tut.editor-personajes.5.texto',
        'Asigna un atuendo distinto a cada cuarto: tu avatar entra vestido para correr en Ejercicio y cambia solo al pasar a la cocina.',
      ),
      // Su ancla cuelga de la sección de la primera categoría, también plegada.
      alEntrar: () => {
        clickTut('editor.pers.tool.ropa')
        useEditorUi.getState().abrirConfigGrupo('ropa-cabeza')
      },
    },
    {
      texto: T(
        'tut.editor-personajes.6.texto',
        'Cuerpo, color y tamaño se editan igual que siempre; con IA activada también puedes generar un modelo 3D propio en vez de elegir uno de los presets.',
      ),
    },
  ],
}

export const cuerpoEditorObjetos: CuerpoTutorial = {
  preparar: abrirEditorEn('objetos'),
  pasos: [
    {
      sel: 'editor.contenido',
      texto: T(
        'tut.editor-objetos.1.texto',
        'Toca un objeto de la escena (o de la lista) para editarlo: color, tamaño y rotación son los tres ajustes que comparten todos.',
      ),
    },
    {
      texto: T(
        'tut.editor-objetos.2.texto',
        'Los objetos con app asignada abren su plantilla al entrar al cuarto; los que no, son solo decoración — ambos se editan igual.',
      ),
    },
    {
      texto: T(
        'tut.editor-objetos.3.texto',
        'El engrane ⚙️ de un objeto lo convierte en editable por piezas: arma tus propios modelos combinando formas básicas, o pide uno a la IA describiéndolo.',
      ),
    },
  ],
}

export const cuerpoEditorConfig: CuerpoTutorial = {
  preparar: abrirEditorEn('config'),
  pasos: [
    {
      sel: 'editor.contenido',
      texto: T(
        'tut.editor-config.1.texto',
        'Ocho secciones plegables, no una lista larga: toca el título para abrir solo la que te interesa.',
      ),
    },
    {
      sel: 'editor.config.cuenta',
      alEntrar: () => useEditorUi.getState().abrirConfigGrupo('cuenta'),
      titulo: T('tut.editor-config.2.titulo', 'Cuenta e IA'),
      texto: T(
        'tut.editor-config.2.texto',
        'Iniciar sesión, tu plan y cuánto llevas gastado de IA este mes; justo al lado, la tabla de precios de cada operación. Los dos tienen su propio tutorial detallado.',
      ),
    },
    {
      sel: 'editor.config.estilo',
      alEntrar: () => useEditorUi.getState().abrirConfigGrupo('estilo'),
      titulo: T('tut.editor-config.3.titulo', 'Estilo visual'),
      texto: T(
        'tut.editor-config.3.texto',
        'El tema del mapa (luz, niebla, iluminación) y los estilos de postprocesado, todo cargado bajo demanda para no pesar de más.',
      ),
    },
    {
      sel: 'editor.config.interfaz',
      alEntrar: () => useEditorUi.getState().abrirConfigGrupo('interfaz'),
      titulo: T('tut.editor-config.4.titulo', 'Interfaz e idioma'),
      texto: T(
        'tut.editor-config.4.texto',
        'Idioma, tema de la interfaz (claro/oscuro/automático), estilo de iconos y densidad — todo lo que cambia CÓMO se ve la casa, no qué contiene.',
      ),
    },
    {
      sel: 'editor.config.notificaciones',
      alEntrar: () => useEditorUi.getState().abrirConfigGrupo('notificaciones'),
      titulo: T('tut.editor-config.5.titulo', 'Notificaciones'),
      texto: T(
        'tut.editor-config.5.texto',
        'Qué avisos llegan y cuáles se callan: rutinas, avisos de plan y recordatorios se pueden apagar por separado.',
      ),
    },
    {
      texto: T(
        'tut.editor-config.6.texto',
        'Música y Tutoriales tienen su propio recorrido; Respaldo de datos también, y es el que más conviene revisar antes de un cambio de dispositivo.',
      ),
    },
  ],
}

export const cuerpoRespaldo: CuerpoTutorial = {
  preparar: () => {
    useEditorUi.getState().setTab('config')
    useLayout.getState().setEditMode(true)
    useEditorUi.getState().abrirConfigGrupo('respaldo')
  },
  pasos: [
    {
      sel: 'respaldo.estado',
      esperar: 'respaldo.estado',
      titulo: T('tut.respaldo.1.titulo', 'Dónde vive tu casa'),
      texto: T(
        'tut.respaldo.1.texto',
        'Sin cuenta ni sincronización, tus datos están solo en este dispositivo. El aviso de arriba dice si el navegador tiene permiso para protegerlos de una limpieza automática.',
      ),
    },
    {
      sel: 'respaldo.exportar',
      titulo: T('tut.respaldo.2.titulo', 'Exportar'),
      texto: T(
        'tut.respaldo.2.texto',
        'Descarga un único archivo JSON con todas tus tablas: cuartos, metas, registros, todo. Es tu copia de seguridad manual.',
      ),
    },
    {
      sel: 'respaldo.restaurar',
      titulo: T('tut.respaldo.3.titulo', 'Restaurar'),
      texto: T(
        'tut.respaldo.3.texto',
        'Restaurar REEMPLAZA todos los datos actuales por los del archivo — pide confirmación antes y muestra cuántos registros trae, así que no hay sorpresas.',
      ),
    },
    {
      texto: T(
        'tut.respaldo.4.texto',
        'Conviene respaldar antes de cambiar de dispositivo, de navegador, o simplemente de vez en cuando: es la única copia que tienes sin cuenta.',
      ),
    },
  ],
}

export const cuerpoEditorCuarto: CuerpoTutorial = {
  pasos: [
    {
      texto: T(
        'tut.editor-cuarto.1.texto',
        'Estás editando un cuarto concreto: el croquis y la cámara se enfocan en él, no en toda la casa.',
      ),
    },
    {
      sel: 'editor.contenido',
      titulo: T('tut.editor-cuarto.2.titulo', 'Qué se edita'),
      texto: T(
        'tut.editor-cuarto.2.texto',
        'Forma, piso, muros, puertas, color y nombre del cuarto, y sus objetos. La app asignada también se cambia desde aquí: es lo que más trae a la gente a este panel.',
      ),
    },
    {
      sel: 'editor.volverMapa',
      titulo: T('tut.editor-cuarto.3.titulo', 'Volver al mapa'),
      texto: T(
        'tut.editor-cuarto.3.texto',
        'Esta flecha vuelve al mapa completo sin cerrar el editor, para seguir trabajando en otro cuarto.',
      ),
    },
    {
      texto: T(
        'tut.editor-cuarto.4.texto',
        'También hay un botón flotante «Salir del cuarto» sobre el propio cuarto en el 3D, por si prefieres tocarlo ahí.',
      ),
    },
  ],
}

export const cuerpoHerramientas: CuerpoTutorial = {
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
        'Primero eliges categoría y luego la herramienta concreta dentro de ella. Puedes equipar hasta 3 herramientas a la vez, de categorías distintas o repetidas.',
      ),
    },
    {
      sel: 'herr.rueda',
      alEntrar: () => abrirSiFalta('herr.rueda', 'herr.boton'),
      titulo: T('tut.herramientas.3.titulo', 'La cuarta categoría'),
      texto: T(
        'tut.herramientas.3.texto',
        'Construcción no equipa un juguete: activa el modo de dibujo del mapa (cuartos, muros, puertas, ventanas, pisos, techos) sin pasar por el editor completo. Es el mismo croquis, solo que se llega más rápido.',
      ),
    },
    {
      sel: 'herr.rueda',
      alEntrar: () => abrirSiFalta('herr.rueda', 'herr.boton'),
      titulo: T('tut.herramientas.4.titulo', 'El centro'),
      texto: T(
        'tut.herramientas.4.texto',
        'El centro suelta todo lo equipado y devuelve el hueco de la esquina a su estado normal (el cubo de vistas u otro contextual, según lo que tengas cerca).',
      ),
    },
    {
      alEntrar: () => {
        clickTut('herr.fondo')
      },
      texto: T(
        'tut.herramientas.5.texto',
        'Se cierra tocando fuera de la rueda. Pruébala cuando quieras: nada de esto se guarda como permanente, es solo mientras la llevas puesta.',
      ),
    },
  ],
}

export const cuerpoNavegacion: CuerpoTutorial = {
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
        'En iso mandas la cámara con el cubo: sus esquinas dan los ángulos isométricos y sus caras, las vistas planas. En 3ª/1ª su hueco lo ocupa un pad que arrastras para mirar alrededor.',
      ),
    },
    {
      sel: 'nav.hueco',
      titulo: T('tut.navegacion.3.titulo', 'Cuando hay algo cerca'),
      texto: T(
        'tut.navegacion.3.texto',
        'Ese mismo hueco deja de ser cámara al acercarte a algo interactivo: una cancha ofrece su botón de jugar, un vehículo el de subirte, una silla el de sentarte. Solo una cosa a la vez, y siempre por proximidad — nunca automático.',
      ),
    },
    {
      sel: 'nav.rotar',
      titulo: T('tut.navegacion.4.titulo', 'Rotar y centrar'),
      texto: T(
        'tut.navegacion.4.texto',
        'Cada flecha gira un cuarto de vuelta: el mapa en iso, tu mirada en 3ª/1ª. El tercer botón solo aparece con el mapa delante, y lo recentra si te perdiste explorando.',
      ),
    },
    {
      sel: 'nav.joystick',
      titulo: T('tut.navegacion.5.titulo', 'Moverse'),
      texto: T(
        'tut.navegacion.5.texto',
        'Camina con el joystick, WASD o las flechas. En el agua nadas; con un vehículo montado, conduces con los mismos controles.',
      ),
    },
    {
      texto: T(
        'tut.navegacion.6.texto',
        'El botón Editor de arriba funciona en cualquier vista: ábrelo en 3ª/1ª persona y editas caminando, tocando objetos, muros o personajes justo donde están.',
      ),
    },
  ],
}

export const cuerpoChat: CuerpoTutorial = {
  pasos: [
    {
      sel: 'chat.caja',
      texto: T(
        'tut.chat.1.texto',
        'El chat del arquitecto: registra tu día, edita la casa y responde tus dudas, todo desde el mismo cuadro.',
      ),
    },
    {
      sel: 'chat.input',
      titulo: T('tut.chat.2.titulo', 'Escribir'),
      texto: T(
        'tut.chat.2.texto',
        'Escribe libre: «corrí 20 min», «gasté 250 en el súper»… El chip de al lado muestra a qué app irá. Usa @cuarto para forzar destino si lo adivina mal.',
      ),
    },
    {
      sel: 'chat.voz',
      titulo: T('tut.chat.3.titulo', 'Dictar por voz'),
      texto: T(
        'tut.chat.3.texto',
        'El micrófono transcribe lo que digas al cuadro de texto — útil para registrar sin soltar lo que traes en las manos.',
      ),
    },
    {
      // Solo muestra el «+» (patrón botón-primero): si se vuelve con Atrás desde
      // los pasos AR, el menú desplegado se cierra para no tapar este botón.
      sel: 'chat.foto',
      alEntrar: () => {
        if (elTut('chat.adjuntar.mascara')) clickTut('chat.foto')
      },
      titulo: T('tut.chat.4.titulo', 'Adjuntar'),
      texto: T(
        'tut.chat.4.texto',
        'El + despliega cinco opciones: subir una imagen o un PDF y tomar una foto —con IA activa, un ticket o la báscula se interpretan solos— más dos que no piden IA: la máscara AR y el chat AR.',
      ),
    },
    {
      sel: 'chat.adjuntar.mascara',
      alEntrar: async () => {
        abrirSiFalta('chat.adjuntar.mascara', 'chat.foto')
        await esperarTut('chat.adjuntar.mascara', 2000)
      },
      titulo: T('tut.chat.4b.titulo', 'La máscara AR'),
      texto: T(
        'tut.chat.4b.texto',
        'Enciende la cámara y te pone la máscara sobre la cara, siguiéndote en vivo — la misma del video de presentación de la casa. Funciona sin IA y sin cuenta.',
      ),
    },
    {
      sel: 'chat.adjuntar.chatAr',
      alEntrar: async () => {
        abrirSiFalta('chat.adjuntar.chatAr', 'chat.foto')
        await esperarTut('chat.adjuntar.chatAr', 2000)
      },
      titulo: T('tut.chat.4c.titulo', 'El chat AR'),
      texto: T(
        'tut.chat.4c.texto',
        'La misma conversación de siempre, pero con tu cámara de fondo y el asistente en 3D delante, con emociones que acompañan lo que responde.',
      ),
    },
    {
      sel: 'chat.asistente',
      // Se retira el menú Adjuntar del paso anterior: aquí el foco es el asistente.
      alEntrar: () => {
        if (elTut('chat.adjuntar.mascara')) clickTut('chat.foto')
      },
      titulo: T('tut.chat.5.titulo', 'Asistentes'),
      texto: T(
        'tut.chat.5.texto',
        'Tu asistente pone cara y voz a las respuestas. Tócalo para ver la conversación, cambiar de asistente o crear más.',
      ),
    },
    {
      sel: 'chat.manual',
      alEntrar: () => abrirSiFalta('chat.manual', 'chat.asistente'),
      titulo: T('tut.chat.6.titulo', 'El manual'),
      texto: T(
        'tut.chat.6.texto',
        'El manual lista los comandos: agregar o quitar cuartos, crear objetos, recordar cosas…',
      ),
    },
    {
      sel: 'chat.modelo',
      titulo: T('tut.chat.7.titulo', 'El modelo de IA'),
      texto: T(
        'tut.chat.7.texto',
        'Este icono elige qué IA responde y guarda tu clave si usas la tuya. Sin ninguna configurada, el chat sigue funcionando por palabras clave, sin entender lenguaje libre.',
      ),
    },
    {
      texto: T(
        'tut.chat.8.texto',
        'También puedes preguntar «¿cómo funciona la cocina?» o pedir «tutorial de ejercicio» aquí mismo, y qué quedó guardado se revisa en el tour de Registros.',
      ),
    },
  ],
}

export const cuerpoChatRegistros: CuerpoTutorial = {
  preparar: () => {
    clickTut('chat.asistente')
  },
  pasos: [
    {
      sel: 'chat.tabs',
      alEntrar: async () => {
        abrirSiFalta('chat.tabs', 'chat.asistente')
        await esperarTut('chat.tab.registros', 2000)
        clickTut('chat.tab.registros')
      },
      texto: T(
        'tut.chat-registros.1.texto',
        'Chats muestra con quién platicaste; Registros, lo que quedó guardado de esas conversaciones.',
      ),
    },
    {
      sel: 'chat.memorias',
      titulo: T('tut.chat-registros.2.titulo', 'Lo que recuerda de ti'),
      texto: T(
        'tut.chat-registros.2.texto',
        'Datos que el asistente decidió que valía la pena recordar entre sesiones —una alergia, una meta, una preferencia— para no preguntártelo de nuevo. Se olvidan tocando su ✕.',
      ),
    },
    {
      texto: T(
        'tut.chat-registros.3.texto',
        'Lo registrado en tus apps (comidas, gastos, sesiones) vive en cada app, no aquí: esta pestaña es solo la memoria de la conversación misma.',
      ),
    },
  ],
}

export const cuerpoMusica: CuerpoTutorial = {
  preparar: () => {
    clickTut('menu.retraer')
  },
  pasos: [
    {
      sel: 'musica.boton',
      alEntrar: () => abrirSiFalta('musica.panel', 'musica.boton'),
      esperar: 'musica.panel',
      texto: T(
        'tut.musica.1.texto',
        'Este botón abre el control de música de la casa.',
      ),
    },
    {
      sel: 'musica.ambiental',
      titulo: T('tut.musica.2.titulo', 'Encender o apagar'),
      texto: T(
        'tut.musica.2.texto',
        'Un interruptor para toda la música ambiental de la casa. Apagado, la casa queda en silencio salvo los sonidos de acciones concretas.',
      ),
    },
    {
      sel: 'musica.tema',
      titulo: T('tut.musica.3.titulo', 'Tema por cuarto'),
      texto: T(
        'tut.musica.3.texto',
        'Cada cuarto puede sonar distinto: automático según su app, uno elegido a mano, o silencio total en ese cuarto sin tocar el resto de la casa.',
      ),
    },
    {
      sel: 'musica.fuente',
      titulo: T('tut.musica.4.titulo', 'De dónde sale el sonido'),
      texto: T(
        'tut.musica.4.texto',
        'Generada (compone sola según el ambiente), Mis pistas (lo que tú subiste) o Sistema (lo que ya estés reproduciendo fuera de la app, sin que se pise).',
      ),
    },
    {
      sel: 'musica.volumen',
      titulo: T('tut.musica.5.titulo', 'Volúmenes por separado'),
      texto: T(
        'tut.musica.5.texto',
        'La música y los sonidos de acciones (pasos, clics, logros) se ajustan por separado — puedes bajar la música y dejar los efectos, o al revés.',
      ),
    },
    {
      texto: T(
        'tut.musica.6.texto',
        'El botón del HUD se puede quitar de la pantalla principal; sigue disponible en Editor › Configuraciones › Música.',
      ),
    },
  ],
}

export const cuerpoCuentaIA: CuerpoTutorial = {
  preparar: () => {
    useEditorUi.getState().setTab('config')
    useLayout.getState().setEditMode(true)
    useEditorUi.getState().abrirConfigGrupo('cuenta')
  },
  pasos: [
    {
      sel: 'editor.config.cuenta',
      esperar: 'editor.config.cuenta',
      texto: T(
        'tut.cuenta-ia.1.texto',
        'Aquí se enciende la IA de la casa: sin esto, el chat sigue funcionando por palabras clave, y funciones como generar una receta, un plan o una imagen quedan apagadas.',
      ),
    },
    {
      sel: 'cuenta.sesion',
      titulo: T('tut.cuenta-ia.2.titulo', 'Con o sin cuenta'),
      texto: T(
        'tut.cuenta-ia.2.texto',
        'Puedes usar la IA con tu propia clave de proveedor (sin cuenta, sin créditos) o con una cuenta que trae créditos y sincroniza entre dispositivos.',
      ),
    },
    {
      sel: 'editor.config.ia',
      alEntrar: () => useEditorUi.getState().abrirConfigGrupo('ia'),
      esperar: 'ia.calidad',
      titulo: T('tut.cuenta-ia.3.titulo', 'Precios de la IA'),
      texto: T(
        'tut.cuenta-ia.3.texto',
        'Esta tabla es informativa aunque no tengas cuenta: es justo lo que hace falta para decidir si vale la pena. Se ve por cuarto, operación por operación.',
      ),
    },
    {
      sel: 'ia.calidad',
      titulo: T('tut.cuenta-ia.4.titulo', 'La única palanca'),
      texto: T(
        'tut.cuenta-ia.4.texto',
        'La calidad de imagen es lo único que cambia el precio de la tabla entera: Rápida es buena y barata (la que se usa por defecto); Buena da más detalle y mejor texto dentro de la imagen.',
      ),
    },
    {
      sel: 'ia.tabla',
      titulo: T('tut.cuenta-ia.5.titulo', 'Una unidad, muchas operaciones'),
      texto: T(
        'tut.cuenta-ia.5.texto',
        'Una respuesta cuesta 1 crédito, un plan largo 4, una imagen o un modelo 3D 10 — la regla es la misma para todos los cuartos, esta tabla solo la despliega una por una.',
      ),
    },
  ],
}

export const cuerpoEjemplos: CuerpoTutorial = {
  preparar: () => {
    abrirApp('anecdotario')
  },
  pasos: [
    {
      // El id del paquete es 'anecdotario.recuerdos' (BarraEjemplo pinta
      // `ejemplo.<paquete.id>`); con 'ejemplo.anecdotario' a secas nunca casó.
      sel: 'ejemplo.anecdotario.recuerdos',
      texto: T(
        'tut.ejemplos.1.texto',
        'Esta barra aparece en casi todas las apps cuando aún no tienen datos tuyos: un botón para verla llena de ejemplo, en vez de empezar frente a una pantalla vacía.',
      ),
    },
    {
      texto: T(
        'tut.ejemplos.2.texto',
        'Ver un ejemplo no borra ni mezcla nada tuyo: son filas propias, marcadas como ejemplo, que se ocultan (no se borran) al apagarlo. Volver a encenderlo las trae de vuelta tal cual estaban.',
      ),
    },
    {
      texto: T(
        'tut.ejemplos.3.texto',
        'Dentro de la casa demo esta barra no aparece: el año entero de Pep@ ya cumple ese papel, así que no hace falta un ejemplo aparte.',
      ),
    },
  ],
}

export const cuerpoInicio: CuerpoTutorial = {
  preparar: () => {
    clickTut('menu.retraer')
  },
  pasos: [
    {
      // Solo muestra el botón (patrón botón-primero): si se vuelve con Atrás
      // desde los pasos del panel, este lo cierra para destapar el lanzador.
      sel: 'menu.rapido',
      alEntrar: () => {
        if (elTut('inicio.rejilla')) clickTut('inicio.cerrar')
      },
      texto: T(
        'tut.inicio.1.texto',
        'El botón con el nombre de tu casa abre la pantalla de inicio: tus apps en una rejilla, con la mecánica de un teléfono.',
      ),
    },
    {
      sel: 'inicio.rejilla',
      alEntrar: async () => {
        abrirSiFalta('inicio.rejilla', 'menu.rapido')
        await esperarTut('inicio.rejilla', 2000)
      },
      esperar: 'inicio.rejilla',
      titulo: T('tut.inicio.2.titulo', 'Un toque, una app'),
      texto: T(
        'tut.inicio.2.texto',
        'Aquí salen solo los cuartos que ya tienen app, con su nivel, su racha y sus listas cumplidas. El contador rojo de la esquina son sus misiones pendientes de hoy, y tocar la tarjeta entra directo.',
      ),
    },
    {
      sel: 'inicio.rejilla',
      titulo: T('tut.inicio.3.titulo', 'Mantén pulsada una tarjeta'),
      texto: T(
        'tut.inicio.3.texto',
        'La pulsación larga la levanta y todas tiemblan, como en un teléfono: arrástrala para reordenar, o toca el lápiz de su esquina para editar su ficha.',
      ),
    },
    {
      // En una casa recién estrenada el reto puede no estar todavía: se cae a la rejilla.
      sel: () => (elTut('inicio.reto') ? 'inicio.reto' : 'inicio.rejilla'),
      titulo: T('tut.inicio.4.titulo', 'Tu reto, a la vista'),
      texto: T(
        'tut.inicio.4.texto',
        'Los dos aros son la Montaña de Sísifo: el rango del año y las insignias ganadas. Tocarlos abre la montaña completa, la misma del menú lateral.',
      ),
    },
    {
      sel: 'inicio.fondo',
      titulo: T('tut.inicio.5.titulo', 'Fondo y vista 3D'),
      texto: T(
        'tut.inicio.5.texto',
        'Este botón le pone fondo de pantalla a la rejilla, atenuado para que las tarjetas se lean. El de al lado alterna entre el icono de cada cuarto y su miniatura amueblada en 3D.',
      ),
    },
    {
      texto: T(
        'tut.inicio.6.texto',
        'Crear cuartos, borrarlos o asignar apps sigue siendo cosa del menú lateral: esta pantalla es para entrar rápido. Se cierra tocando fuera.',
      ),
    },
  ],
}

