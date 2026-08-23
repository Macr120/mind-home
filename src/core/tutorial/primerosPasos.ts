import type { CuerpoTutorial, PasoTutorial, TextoTut, TutorialCtx } from './tipos'
import { clickTut, elTut, esperarTut } from './dom'
import { irAPestanaMenu } from './dom'
import { regionCeldas } from './zonaMapa'
import type { RegionMapa } from '../state/zonaTutStore'
import { useAsignar } from '../state/asignarStore'
import { useCuartos } from '../state/cuartosStore'
import { useDespierto } from '../state/despiertoStore'
import { useHouse } from '../state/houseStore'
import { useHud } from '../state/hudStore'
import { sitioCuartoNuevo } from '../state/layoutStore'
import type { Cell } from '../house/walls'
import { getPlantilla, plantillasCuarto } from '../registry'
import { asignarPlantillaACuarto } from '../gamificacion/plantillaBundle'
import { appsAsignadas } from '../bienvenida/bienvenidaStore'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** El verde del fantasma del pincel (ver PlanoCuartos3DController). */
const VERDE_FANTASMA = '#34d399'

/**
 * App del cuarto de demostración: **Metas**, para que ese cuarto exista desde el
 * primer día — es el planificador de toda la casa y donde caen las metas que
 * nacen en las demás apps. Si el usuario ya lo eligió en el paso «intereses» del
 * asistente, se cae a la primera app libre (crear un segundo cuarto de Metas no
 * enseñaría nada).
 */
function plantillaDemo(): string | null {
  const ya = appsAsignadas()
  if (getPlantilla('metas') && !ya.has('metas')) return 'metas'
  return plantillasCuarto().find((p) => !ya.has(p.id))?.id ?? null
}

/**
 * El sitio donde nacerá el cuarto demo: se calcula UNA vez y queda en el
 * contexto — al volver con Atrás desde después de crear, recalcularlo daría
 * OTRA celda (la de ese cuarto ya ocupa la original) y el fantasma mentiría.
 */
function sitioDemo(ctx: TutorialCtx): Cell | null {
  if (!ctx.datos.has('sitio')) ctx.datos.set('sitio', sitioCuartoNuevo())
  return (ctx.datos.get('sitio') as Cell | null) ?? null
}

const regionSitio = (ctx: TutorialCtx, color?: string): RegionMapa | null => {
  const s = sitioDemo(ctx)
  return s ? regionCeldas(s.col, s.row, s.col, s.row, { color, margen: 2 }) : null
}

/**
 * Deja el mapa a la vista con la rueda MONTADA: App.tsx la desmonta mientras el
 * menú lateral está abierto, y en teléfono vertical también con el chat
 * desplegado — que es justo como lo deja `iniciar` al arrancar cualquier tour.
 */
const prepararRueda = async () => {
  clickTut('menu.retraer')
  // La rueda vive en la esquina inferior izquierda (y el chat la desmonta en vertical).
  useHud.getState().setPlegado('infIzq', false)
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
  // desde los pasos de la rueda, que dejan el menú retraído. El cuadrante se
  // despliega antes (en móvil, la regla pliega sola al superior contrario).
  alEntrar: async () => {
    useHud.getState().setPlegado('supIzq', false)
    clickTut('menu.abrir')
    await irAPestanaMenu('menu.tab.cuartos')
  },
  texto: T(
    'tut.primeros.1.texto',
    'Este tutorial contesta dos cosas: cómo ENTRAR a tus apps y cómo CREAR una nueva. Las dos viven aquí, en la pestaña Cuartos.',
  ),
}

/**
 * Primera pregunta: cómo se entra a las apps. SIEMPRE presente — con la casa
 * vacía cambia el texto (la lista aún no tiene tarjetas que señalar) pero la
 * respuesta se da igual; el paso «Entrar» del final la demuestra en vivo.
 */
const pasoEntrar = (hayApps: boolean): PasoTutorial => ({
  sel: 'menu.cuartos.lista',
  alEntrar: async () => {
    useHud.getState().setPlegado('supIzq', false)
    clickTut('menu.abrir')
    await irAPestanaMenu('menu.tab.cuartos')
  },
  titulo: T('tut.primeros.entrar.titulo', 'Entrar a tus apps'),
  texto: hayApps
    ? T(
        'tut.primeros.entrar.texto',
        'Cada cuarto lleva su app y tienes tres puertas: su tarjeta aquí en el menú, el objeto con la esfera flotante en el mapa, y el acceso rápido del botón MPH de arriba.',
      )
    : T(
        'tut.primeros.entrar.vacio',
        'Aquí vivirán tus cuartos, cada uno con su app, y tendrás tres puertas: su tarjeta aquí en el menú, el objeto con la esfera flotante en el mapa, y el acceso rápido del botón MPH de arriba. Vamos a crear el primero…',
      ),
})

/** Vía de ESCRITORIO: el botón del menú, que abre el editor de mapa. */
const PASOS_CREAR_ESCRITORIO: PasoTutorial[] = [
  {
    sel: 'menu.cuartos.crear',
    // Al volver con Atrás desde el preview el menú quedó retraído: se reabre.
    alEntrar: async () => {
      useHud.getState().setPlegado('supIzq', false)
      clickTut('menu.abrir')
      await irAPestanaMenu('menu.tab.cuartos')
    },
    titulo: T('tut.primeros.2.titulo', 'Crear cuarto'),
    texto: T(
      'tut.primeros.2.texto',
      'Con este botón dibujas cuartos nuevos en el mapa, celda por celda. Mira — te enseño dónde quedaría el tuyo…',
    ),
  },
]

/**
 * Vía de TELÉFONO: la rueda dibuja el cuarto directo sobre el mapa. El botón del
 * menú abre el editor, y en vertical su panel lateral tapa la casa entera, así
 * que aquí se enseña el atajo de construcción. Los pasos solo ILUMINAN la rueda:
 * el overlay del tutorial traga los toques, así que el cuarto lo sigue creando
 * el tour (pasos del preview) y nunca se queda una herramienta equipada.
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
      'Cuartos deja el pincel listo: la rueda se cierra y cada toque en el suelo levanta un cuarto nuevo. Mira — te enseño dónde quedaría el tuyo…',
    ),
  },
]

/**
 * El preview ANTES de crear: la cámara vuela al sitio elegido y el fantasma
 * verde del pincel (silueta + muros) enseña dónde nacerá el cuarto. El paso
 * siguiente lo materializa AHÍ MISMO: `sitioDemo` congela la celda y
 * `colocarCuartoNuevo` usa la misma búsqueda determinista.
 */
const PASO_PREVIEW: PasoTutorial = {
  alEntrar: () => {
    // La vía móvil deja la rueda abierta y la de escritorio el menú: fuera
    // ambos para ver el mapa (no-op si ya están cerrados).
    clickTut('herr.fondo')
    clickTut('menu.retraer')
  },
  fantasma: (ctx) => sitioDemo(ctx),
  foco: (ctx) => regionSitio(ctx, VERDE_FANTASMA),
  titulo: T('tut.primeros.prev.titulo', 'Aquí va tu cuarto'),
  texto: T(
    'tut.primeros.prev.texto',
    'Este es el preview del pincel: la silueta verde con sus muros marca dónde se levantará el cuarto. Al construir a mano la verás igual bajo tu dedo, antes de soltar el toque.',
  ),
}

const PASO_MATERIALIZAR: PasoTutorial = {
  alEntrar: async (ctx) => {
    await ctx.unaVez('cuarto-demo', async () => {
      const pid = plantillaDemo()
      ctx.datos.set('plantillaId', pid)
      const categoria = pid ? getPlantilla(pid)?.categoria : undefined
      const id = await useCuartos.getState().crear(categoria ? { categoria } : undefined)
      ctx.datos.set('cuartoId', id)
      // Es un cuarto de PRÁCTICA: al salir del tour (terminado o abandonado) se
      // borra, para que el usuario arme su casa a su gusto. `eliminar` deja el
      // borrado pendiente cuando ya lleva app: se confirma aquí mismo, sin diálogo.
      ctx.alLimpiar(async () => {
        useDespierto.getState().terminar()
        const s = useCuartos.getState()
        await s.eliminar(id)
        if (useCuartos.getState().eliminarPendiente?.id === id) await s.confirmarEliminarCuarto()
      })
    })
  },
  foco: (ctx) => regionSitio(ctx),
  titulo: T('tut.primeros.mat.titulo', '¡Construido!'),
  texto: T(
    'tut.primeros.mat.texto',
    'Y aquí está: el cuarto se levantó justo donde marcaba el preview, con su puerta al frente. Todavía no lleva app — eso es lo que sigue.',
  ),
}

/** Del cuarto ya creado en adelante: igual en los dos dispositivos. */
const PASOS_APP: PasoTutorial[] = [
  {
    sel: (ctx) => `menu.cuartos.card.${String(ctx.datos.get('cuartoId'))}`,
    alEntrar: async () => {
      // La vía del teléfono deja el menú retraído: volver a abrirlo desmonta la
      // rueda (App.tsx) y devuelve la lista. En escritorio no cambia nada. El
      // diálogo de asignar puede venir abierto al volver con Atrás.
      useAsignar.getState().cerrar()
      useHud.getState().setPlegado('supIzq', false)
      clickTut('menu.abrir')
      await irAPestanaMenu('menu.tab.cuartos')
    },
    titulo: T('tut.primeros.3.titulo', 'Tu cuarto nuevo'),
    texto: T(
      'tut.primeros.3.texto',
      '¡Aquí está! Un cuarto recién creado, todavía sin app: por eso su tarjeta dice + Asignar.',
    ),
  },
  {
    sel: 'asignar.catalogo',
    alEntrar: async (ctx) => {
      // REGLA: un solo menú abierto a la vez — el lateral se retrae antes de
      // abrir el diálogo de asignar.
      clickTut('menu.retraer')
      const id = ctx.datos.get('cuartoId') as string | undefined
      if (id) useAsignar.getState().abrir(id)
      await esperarTut('asignar.catalogo', 2000)
    },
    titulo: T('tut.primeros.apps.titulo', 'Las apps disponibles'),
    texto: T(
      'tut.primeros.apps.texto',
      'Esto abre + Asignar: el panel con todas las apps disponibles. Cada una arma su cuarto con sus muebles y su app. Le doy una al tuyo…',
    ),
  },
  {
    sel: (ctx) => `menu.cuartos.card.${String(ctx.datos.get('cuartoId'))}`,
    alEntrar: async (ctx) => {
      // Primero se cierra el diálogo (regla: un solo menú abierto) y luego
      // vuelve el lateral, que es donde vive la tarjeta señalada.
      useAsignar.getState().cerrar()
      useHud.getState().setPlegado('supIzq', false)
      clickTut('menu.abrir')
      await irAPestanaMenu('menu.tab.cuartos')
      await ctx.unaVez('asignar-demo', async () => {
        const id = ctx.datos.get('cuartoId') as string | undefined
        const pid = ctx.datos.get('plantillaId') as string | null
        if (id && pid) await asignarPlantillaACuarto(id, pid)
      })
    },
    titulo: T('tut.primeros.4.titulo', 'Asignar una app'),
    texto: T(
      'tut.primeros.4.texto',
      'Con + Asignar le di su app: mira cómo el cuarto tomó su nombre, su icono y sus muebles. Desde ahora su tarjeta entera es el botón de entrar.',
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
      'Entramos: esta es la app del cuarto. Para volver luego: su tarjeta en el menú, el objeto con la esfera en el mapa, o el acceso rápido del botón MPH de arriba.',
    ),
  },
  {
    // La pulsación larga, DEMOSTRADA: el cuarto despierta (tiembla, con su menú).
    alEntrar: (ctx) => {
      useHouse.getState().closeRoom()
      clickTut('menu.retraer')
      const id = ctx.datos.get('cuartoId') as string | undefined
      if (id) useDespierto.getState().despertar({ tipo: 'cuarto', id })
    },
    foco: (ctx) => regionSitio(ctx),
    titulo: T('tut.primeros.press.titulo', 'Mantén pulsado'),
    texto: T(
      'tut.primeros.press.texto',
      'Mira cómo tiembla: mantener pulsado un cuarto o un objeto lo despierta, con su menú. Así lo mueves si no te gustó dónde quedó, o lo borras.',
    ),
  },
  {
    alEntrar: () => {
      useDespierto.getState().terminar()
    },
    texto: T(
      'tut.primeros.6.texto',
      'Eso es todo: crear el cuarto, darle su app, entrar y acomodarlo. Este era de práctica — me lo llevo al terminar, para que armes tu casa a tu gusto.',
    ),
  },
]

/**
 * Cuerpo del paso 1 de la guía de bienvenida. Contesta las dos preguntas de
 * arranque: cómo ENTRAR a tus apps (tarjeta, esfera, botón MPH) y cómo CREAR
 * una nueva — con el preview del pincel, el panel de apps disponibles, la
 * pulsación larga demostrada y un cuarto de PRÁCTICA que se borra al salir.
 * El paseo por la casa es el paso 2 (`tutorialCasa`).
 *
 * Se arma AL LANZARLO, no al importar el módulo, para leer `movilVertical` y
 * las apps asignadas en ese momento: el paso de crear cambia de vía según el
 * dispositivo, y el de entrar cambia de texto si la casa aún no tiene apps.
 */
export function cuerpoPrimerosPasos(): CuerpoTutorial {
  const movil = useHud.getState().movilVertical
  const hayApps = appsAsignadas().size > 0
  return {
    preparar: () => {
      clickTut('menu.abrir')
    },
    pasos: [
      PASO_TAB_CUARTOS,
      pasoEntrar(hayApps),
      ...(movil ? PASOS_CREAR_MOVIL : PASOS_CREAR_ESCRITORIO),
      PASO_PREVIEW,
      PASO_MATERIALIZAR,
      ...PASOS_APP,
    ],
  }
}
