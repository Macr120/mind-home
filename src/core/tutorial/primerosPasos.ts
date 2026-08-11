import type { PasoTutorial, TextoTut, TutorialDef } from './tipos'
import { clickTut, elTut, esperarTut } from './dom'
import { irAPestanaMenu } from './menus'
import { useCuartos } from '../state/cuartosStore'
import { useHouse } from '../state/houseStore'
import { useHud } from '../state/hudStore'
import { getPlantilla, plantillasCuarto } from '../registry'
import { asignarPlantillaACuarto } from '../gamificacion/plantillaBundle'
import { appsAsignadas } from '../bienvenida/bienvenidaStore'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** App del cuarto de demostración: la Agenda o, si ya está asignada, la primera libre. */
function plantillaDemo(): string | null {
  const ya = appsAsignadas()
  if (getPlantilla('agenda') && !ya.has('agenda')) return 'agenda'
  return plantillasCuarto().find((p) => !ya.has(p.id))?.id ?? null
}

/**
 * Deja el mapa a la vista con la rueda MONTADA: App.tsx la desmonta mientras el
 * menú lateral está abierto, y en teléfono vertical también con el chat
 * desplegado — que es justo como lo deja `iniciar` al arrancar cualquier tour.
 */
const prepararRueda = async () => {
  clickTut('menu.retraer')
  useHud.getState().setPlegado('chat', true)
  await esperarTut('herr.boton', 2000)
}

/** Rueda abierta en su nivel raíz (categorías), venga del estado que venga. */
const ruedaEnCategorias = async () => {
  await prepararRueda()
  if (!elTut('herr.cat.construccion')) {
    // Estaba cerrada, o abierta dentro de una categoría: cerrarla la devuelve al raíz.
    clickTut('herr.fondo')
    clickTut('herr.boton')
  }
  await esperarTut('herr.cat.construccion', 2000)
}

/** …y dentro de la categoría Construcción (segundo nivel). */
const ruedaEnConstruccion = async () => {
  await ruedaEnCategorias()
  clickTut('herr.cat.construccion')
  await esperarTut('herr.item.cuartos', 2000)
}

const PASO_TAB_CUARTOS: PasoTutorial = {
  sel: 'menu.tab.cuartos',
  // `menu.abrir` es no-op si ya está abierto: hace falta al volver con Atrás
  // desde los pasos de la rueda, que dejan el menú retraído.
  alEntrar: async () => {
    clickTut('menu.abrir')
    await irAPestanaMenu('menu.tab.cuartos')
  },
  texto: T(
    'tut.primeros.1.texto',
    'Lo primero: cómo se arma la casa. Todo empieza en la pestaña Cuartos.',
  ),
}

/** Vía de ESCRITORIO: el botón del menú, que abre el editor de mapa. */
const PASOS_CREAR_ESCRITORIO: PasoTutorial[] = [
  {
    sel: 'menu.cuartos.crear',
    titulo: T('tut.primeros.2.titulo', 'Crear cuarto'),
    texto: T(
      'tut.primeros.2.texto',
      'Con este botón dibujas cuartos nuevos en el mapa. Para enseñarte el resto del camino, ahora te creo uno…',
    ),
  },
]

/**
 * Vía de TELÉFONO: la rueda dibuja el cuarto directo sobre el mapa. El botón del
 * menú abre el editor, y en vertical su panel lateral tapa la casa entera, así
 * que aquí se enseña el atajo de construcción. Los pasos solo ILUMINAN la rueda:
 * el overlay del tutorial traga los toques, así que el cuarto lo sigue creando
 * el tour (paso siguiente) y nunca se queda una herramienta equipada.
 */
const PASOS_CREAR_MOVIL: PasoTutorial[] = [
  {
    sel: 'herr.boton',
    alEntrar: () => prepararRueda(),
    titulo: T('tut.primeros.2a.titulo', 'La rueda de herramientas'),
    texto: T(
      'tut.primeros.2a.texto',
      'En el teléfono los cuartos se dibujan sobre el mapa, sin abrir paneles. Todo sale de este botón junto al joystick: la rueda de herramientas.',
    ),
  },
  {
    sel: 'herr.cat.construccion',
    alEntrar: () => ruedaEnCategorias(),
    titulo: T('tut.primeros.2b.titulo', 'Construcción'),
    texto: T(
      'tut.primeros.2b.texto',
      'La rueda tiene dos niveles. Su cuarta categoría es la que levanta la casa: cuartos, muros, puertas, ventanas, pisos y techos.',
    ),
  },
  {
    sel: 'herr.item.cuartos',
    alEntrar: () => ruedaEnConstruccion(),
    titulo: T('tut.primeros.2c.titulo', 'Modo Cuartos'),
    texto: T(
      'tut.primeros.2c.texto',
      'Cuartos deja el pincel listo: la rueda se cierra y cada toque en el suelo levanta un cuarto nuevo. Para enseñarte el resto del camino, ahora te creo uno…',
    ),
  },
]

/** Del cuarto ya creado en adelante: igual en los dos dispositivos. */
const PASOS_APP: PasoTutorial[] = [
  {
    sel: (ctx) => `menu.cuartos.card.${String(ctx.datos.get('cuartoId'))}`,
    alEntrar: async (ctx) => {
      // La vía del teléfono deja el menú retraído: volver a abrirlo desmonta la
      // rueda (App.tsx) y devuelve la lista. En escritorio no cambia nada.
      clickTut('menu.abrir')
      await irAPestanaMenu('menu.tab.cuartos')
      await ctx.unaVez('cuarto-demo', async () => {
        const pid = plantillaDemo()
        ctx.datos.set('plantillaId', pid)
        const categoria = pid ? getPlantilla(pid)?.categoria : undefined
        const id = await useCuartos.getState().crear(categoria ? { categoria } : undefined)
        ctx.datos.set('cuartoId', id)
      })
    },
    titulo: T('tut.primeros.3.titulo', 'Tu cuarto nuevo'),
    texto: T(
      'tut.primeros.3.texto',
      '¡Aquí está! Un cuarto recién creado, todavía sin app: por eso su botón dice + Asignar.',
    ),
  },
  {
    sel: (ctx) => `menu.cuartos.card.${String(ctx.datos.get('cuartoId'))}`,
    alEntrar: async (ctx) => {
      await ctx.unaVez('asignar-demo', async () => {
        const id = ctx.datos.get('cuartoId') as string | undefined
        const pid = ctx.datos.get('plantillaId') as string | null
        if (id && pid) await asignarPlantillaACuarto(id, pid)
      })
    },
    titulo: T('tut.primeros.4.titulo', 'Asignar una app'),
    texto: T(
      'tut.primeros.4.texto',
      'Con + Asignar le di su app: mira cómo el cuarto tomó su nombre, su icono y sus muebles, y su botón ahora dice Entrar.',
    ),
  },
  {
    alEntrar: (ctx) => {
      const id = ctx.datos.get('cuartoId') as string | undefined
      if (id && ctx.datos.get('plantillaId')) useHouse.getState().openRoom(id)
    },
    titulo: T('tut.primeros.5.titulo', 'Entrar'),
    texto: T(
      'tut.primeros.5.texto',
      'Entramos: esta es la app del cuarto. Al pasear también entras cruzando su puerta, y sales con ‹ Volver a la casa.',
    ),
  },
  {
    alEntrar: () => {
      useHouse.getState().closeRoom()
      clickTut('menu.retraer')
    },
    texto: T(
      'tut.primeros.6.texto',
      'El cuarto se queda en tu casa, con su app lista. Así se arma el resto: un cuarto por cada cosa que quieras llevar.',
    ),
  },
]

/**
 * Paso 1 de la guía de bienvenida: demuestra el ciclo completo de la casa
 * creando un cuarto REAL (que se queda), asignándole su app y entrando a
 * verla. El paseo por la casa es el paso 2 (`tutorialCasa`).
 *
 * Se arma AL LANZARLO, no al importar el módulo, para leer `movilVertical` en
 * ese momento: el paso de crear cambia de vía según el dispositivo.
 */
export function defPrimerosPasos(): TutorialDef {
  const movil = useHud.getState().movilVertical
  return {
    id: 'primeros-pasos',
    titulo: T('tut.primeros.titulo', 'Primeros pasos'),
    resumen: T(
      'tut.primeros.resumen',
      'Crea un cuarto desde el menú, asígnale su app y entra a verla.',
    ),
    preparar: () => {
      clickTut('menu.abrir')
    },
    pasos: [
      PASO_TAB_CUARTOS,
      ...(movil ? PASOS_CREAR_MOVIL : PASOS_CREAR_ESCRITORIO),
      ...PASOS_APP,
    ],
  }
}
