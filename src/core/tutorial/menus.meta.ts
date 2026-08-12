import type { CuerpoTutorial, TextoTut, TutorialDef } from './tipos'

/**
 * Fichas de los tutoriales de menús y HUD: id, título y resumen. Es lo ÚNICO
 * que entra al bundle de arranque —el selector las pinta y su medidor de zonas
 * amarillas las lee cada 200 ms—; los pasos viven en `menus.ts`, que solo se
 * descarga al lanzar un tour (ver `CuerpoTutorial` en `tipos.ts`).
 */

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/**
 * Ficha con su cargador. `cuerpo` es el nombre del export en `menus.ts`, y el
 * `keyof` lo valida en compilación: un nombre mal escrito no compila.
 */
const tour = (
  id: string,
  titulo: TextoTut,
  resumen: TextoTut,
  cuerpo: keyof typeof import('./menus'),
): TutorialDef => ({
  id,
  titulo,
  resumen,
  cargar: () => import('./menus').then((m) => m[cuerpo] as CuerpoTutorial),
})

export const tutorialCasa = tour(
  'casa',
  T('tut.casa.titulo', 'Tu casa'),
  T(
    'tut.casa.resumen',
    'La casa es el mapa de tus apps: cada cuarto guarda una. Te mueves con el joystick o WASD, cambias de vista con V y abres el menú con el botón de arriba a la izquierda. El hueco de la esquina cambia solo según lo que tengas cerca; el reloj lleva el calendario, las rutinas y la música.',
  ),
  'cuerpoCasa',
)

export const tutorialMenuCuartos = tour(
  'menu-cuartos',
  T('tut.menu-cuartos.titulo', 'Menú · Cuartos'),
  T(
    'tut.menu-cuartos.resumen',
    'La pestaña Cuartos lista los cuartos de tu casa por categoría, con su progreso. Cada tarjeta tiene Editar (personalizar el cuarto) y Entrar (abrir su app) o + Asignar si aún no tiene app. Arriba vive tu resumen: humor, rango y racha; abajo puedes crear cuartos nuevos.',
  ),
  'cuerpoMenuCuartos',
)

export const tutorialMenuPlantillas = tour(
  'menu-plantillas',
  T('tut.menu-plantillas.titulo', 'Menú · Plantillas'),
  T(
    'tut.menu-plantillas.resumen',
    'Las plantillas son las apps de la casa: se asignan a un objeto de un cuarto. Esta pestaña tiene dos vistas —Cuartos (las apps de siempre) e Infraestructura (lo que se construye directo en el mapa)— y el catálogo incluye las plantillas que tú mismo armas con bloques.',
  ),
  'cuerpoMenuPlantillas',
)

export const tutorialPlantillasCustom = tour(
  'plantillas-custom',
  T('tut.plantillas-custom.titulo', 'Tus propias plantillas'),
  T(
    'tut.plantillas-custom.resumen',
    'El editor de plantillas propias arma una app entera con bloques: notas, checklist, contador, enlaces, hábito, galería y más. Le pones nombre, emoji y color, eliges sus bloques y queda lista para asignar como cualquier otra app.',
  ),
  'cuerpoPlantillasCustom',
)

export const tutorialMenuInventario = tour(
  'menu-inventario',
  T('tut.menu-inventario.titulo', 'Menú · Inventario'),
  T(
    'tut.menu-inventario.resumen',
    'El inventario guarda los objetos para decorar la casa: la biblioteca por categorías y los objetos especiales (vehículos, fuentes, juegos de parque, luces). Con el menú abierto puedes arrastrarlos directo a la escena.',
  ),
  'cuerpoMenuInventario',
)

export const tutorialEditorMapa = tour(
  'editor-mapa',
  T('tut.editor-mapa.titulo', 'El editor · Mapa'),
  T(
    'tut.editor-mapa.resumen',
    'El editor personaliza toda la casa en 4 pestañas: Mapa, Personajes, Objetos y Configuraciones — cada una con su propio tutorial. La de Mapa dibuja cuartos, muros, puertas, ventanas, pisos y techos en un croquis que se ve en 3D al instante, y también da niveles: pisos apilables y un sótano.',
  ),
  'cuerpoEditorMapa',
)

export const tutorialEditorPersonajes = tour(
  'editor-personajes',
  T('tut.editor-personajes.titulo', 'El editor · Personajes'),
  T(
    'tut.editor-personajes.resumen',
    'Tu avatar y tus asistentes comparten editor: cuerpo, rostro (con foto), color, tamaño, ropa y animaciones, con vista previa 3D. El avatar además tiene guardarropa a medida y puede vestir distinto en cada cuarto.',
  ),
  'cuerpoEditorPersonajes',
)

export const tutorialEditorObjetos = tour(
  'editor-objetos',
  T('tut.editor-objetos.titulo', 'El editor · Objetos'),
  T(
    'tut.editor-objetos.resumen',
    'Cada objeto colocado se edita en color, tamaño y rotación desde aquí, y también se pueden crear objetos propios armándolos por piezas.',
  ),
  'cuerpoEditorObjetos',
)

export const tutorialEditorConfig = tour(
  'editor-config',
  T('tut.editor-config.titulo', 'El editor · Configuraciones'),
  T(
    'tut.editor-config.resumen',
    'Ocho secciones plegables: Cuenta, Precios de la IA, Estilo visual del mapa, Interfaz e idioma, Música, Tutoriales, Notificaciones y Respaldo de datos. Cada una se abre por separado y recuerda si la dejaste abierta.',
  ),
  'cuerpoEditorConfig',
)

export const tutorialRespaldo = tour(
  'respaldo',
  T('tut.respaldo.titulo', 'Respaldo de datos'),
  T(
    'tut.respaldo.resumen',
    'Todo lo que guardas vive en este dispositivo. Respaldo de datos exporta todo a un archivo, restaura desde uno y avisa si el navegador podría liberar espacio borrándolo sin avisar.',
  ),
  'cuerpoRespaldo',
)

export const tutorialEditorCuarto = tour(
  'editor-cuarto',
  T('tut.editor-cuarto.titulo', 'Editar un cuarto'),
  T(
    'tut.editor-cuarto.resumen',
    'Al editar un cuarto concreto, el croquis se enfoca en él: forma, piso, muros, color, nombre y —lo que más se usa aquí— qué app tiene asignada o si conviene cambiarla. La flecha del panel vuelve al mapa completo, y el botón flotante sobre el cuarto sale de él.',
  ),
  'cuerpoEditorCuarto',
)

export const tutorialHerramientas = tour(
  'herramientas',
  T('tut.herramientas.titulo', 'Rueda de herramientas'),
  T(
    'tut.herramientas.resumen',
    'La rueda equipa a tu personaje en cuatro categorías: movimientos (correr, bailar, saltar…), juguetes (láser, portales, grafiti…), vehículos montables y construcción (un atajo a los modos del editor de mapa). Dos niveles —categoría → herramienta— y hasta 3 equipadas a la vez.',
  ),
  'cuerpoHerramientas',
)

export const tutorialNavegacion = tour(
  'navegacion',
  T('tut.navegacion.titulo', 'Cámara y movimiento'),
  T(
    'tut.navegacion.resumen',
    'Hay tres vistas: isométrica, tercera y primera persona (tecla V). Te mueves con el joystick, WASD o flechas; el hueco de la esquina orienta la cámara salvo que tengas algo cerca, en cuyo caso ofrece esa acción en su lugar. En 3ª/1ª persona existe además el Editor 3D para tocar el mundo directamente.',
  ),
  'cuerpoNavegacion',
)

export const tutorialChat = tour(
  'chat',
  T('tut.chat.titulo', 'El chat del arquitecto'),
  T(
    'tut.chat.resumen',
    'El chat registra lo que le cuentes en la app correcta («corrí 20 min» va a Ejercicio), edita la casa por texto, dicta por voz y lee una foto. Cada asistente tiene su cara y su voz; el manual lista todo lo que puedes pedir, y lo que ya quedó registrado vive en su pestaña Registros.',
  ),
  'cuerpoChat',
)

export const tutorialChatRegistros = tour(
  'chat-registros',
  T('tut.chat-registros.titulo', 'Chat · Registros y memorias'),
  T(
    'tut.chat-registros.resumen',
    'La pestaña Registros del chat guarda tus conversaciones anteriores y lo que el asistente recuerda de ti entre sesiones, para no repetírselo cada vez.',
  ),
  'cuerpoChatRegistros',
)

export const tutorialMusica = tour(
  'musica',
  T('tut.musica.titulo', 'La música de la casa'),
  T(
    'tut.musica.resumen',
    'Música ambiental general o un tema por cuarto, con tres fuentes posibles: generada, tus propias pistas o el audio del sistema. Se apaga entera si prefieres jugar en silencio.',
  ),
  'cuerpoMusica',
)

export const tutorialCuentaIA = tour(
  'cuenta-ia',
  T('tut.cuenta-ia.titulo', 'La IA y tu cuenta'),
  T(
    'tut.cuenta-ia.resumen',
    'La IA se activa en Editor › Configuraciones. Cada operación —una respuesta, un plan, una imagen, un modelo 3D— tiene su tarifa en créditos, visible antes de pedirla. Con tu propia clave de proveedor no se gastan créditos: pagas directo a él.',
  ),
  'cuerpoCuentaIA',
)

export const tutorialEjemplos = tour(
  'ejemplos',
  T('tut.ejemplos.titulo', 'Empezar con un ejemplo'),
  T(
    'tut.ejemplos.resumen',
    'Casi cada app trae una barra para ver un ejemplo de fábrica con datos ya puestos, y ocultarlo después sin perder nada propio. No aparece dentro de la casa demo: ahí el año entero YA es el ejemplo.',
  ),
  'cuerpoEjemplos',
)

/** Los tutoriales de menús/HUD por id (el chat los busca aquí). */
export const TUTORIALES_MENU: TutorialDef[] = [
  tutorialCasa,
  tutorialMenuCuartos,
  tutorialMenuPlantillas,
  tutorialPlantillasCustom,
  tutorialMenuInventario,
  tutorialEditorMapa,
  tutorialEditorPersonajes,
  tutorialEditorObjetos,
  tutorialEditorConfig,
  tutorialRespaldo,
  tutorialEditorCuarto,
  tutorialHerramientas,
  tutorialNavegacion,
  tutorialChat,
  tutorialChatRegistros,
  tutorialMusica,
  tutorialCuentaIA,
  tutorialEjemplos,
]
