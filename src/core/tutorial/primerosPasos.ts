import type { CuerpoTutorial, PasoTutorial, TextoTut, TutorialCtx } from './tipos'
import { clickTut, esperarTut } from './dom'
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

const PASO_TAB_CUARTOS: PasoTutorial = {
  sel: 'menu.tab.cuartos',
  // `menu.abrir` es no-op si ya está abierto: hace falta al volver con Atrás
  // desde el preview, que deja el menú retraído. El cuadrante se despliega
  // antes (en móvil, la regla pliega sola al superior contrario).
  alEntrar: async () => {
    useHud.getState().setPlegado('supIzq', false)
    clickTut('menu.abrir')
    await irAPestanaMenu('menu.tab.cuartos')
  },
  texto: T(
    'tut.primeros.1.texto',
    'Este tutorial contesta dos cosas de tu MindHaOS (Casa Mental OS): cómo ENTRAR a tus apps y cómo CREAR una nueva. Las dos viven aquí, en la pestaña Hogar.',
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
        'Cada cuarto lleva su app y tienes tres puertas: su tarjeta aquí en el menú, el objeto con la esfera flotante en el mapa, y el acceso rápido del botón del logo, arriba.',
      )
    : T(
        'tut.primeros.entrar.vacio',
        'Aquí vivirán tus cuartos, cada uno con su app, y tendrás tres puertas: su tarjeta aquí en el menú, el objeto con la esfera flotante en el mapa, y el acceso rápido del botón del logo, arriba. Vamos a crear el primero…',
      ),
})

/**
 * «Crear cuarto»: el mismo botón en los dos dispositivos (en teléfono vertical
 * equipa el constructor sobre el mapa; en el resto abre el editor de mapa). Al
 * colocar el cuarto se sale solo y se abre «+ Asignar» para darle su app.
 */
const PASO_CREAR: PasoTutorial = {
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
    'Con este botón colocas un cuarto nuevo en el mapa y, en cuanto lo sueltas, pasas directo a elegir su app. Mira — te enseño dónde quedaría el tuyo…',
  ),
}

/**
 * El preview ANTES de crear: la cámara vuela al sitio elegido y el fantasma
 * verde del pincel (silueta + muros) enseña dónde nacerá el cuarto. El paso
 * siguiente lo materializa AHÍ MISMO: `sitioDemo` congela la celda y
 * `colocarCuartoNuevo` usa la misma búsqueda determinista.
 */
const PASO_PREVIEW: PasoTutorial = {
  alEntrar: () => {
    // Fuera el menú (y el diálogo de asignar, al volver con Atrás) para ver el mapa.
    useAsignar.getState().cerrar()
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
    // Al volver con Atrás desde «+ Asignar» el diálogo taparía el cuarto.
    useAsignar.getState().cerrar()
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
    'Y aquí está: el cuarto se levantó justo donde marcaba el preview, con su puerta al frente. Todavía no lleva app, así que en cuanto se construye se abre solo el panel para darle una.',
  ),
}

/** Despierta el cuarto de práctica fuera de su app, a la vista (idempotente para Atrás). */
const despertarDemo = (ctx: TutorialCtx) => {
  useHouse.getState().closeRoom()
  clickTut('menu.retraer')
  const id = ctx.datos.get('cuartoId') as string | undefined
  if (id) useDespierto.getState().despertar({ tipo: 'cuarto', id })
}

/**
 * Del cuarto ya creado en adelante. Como en «Crear cuarto» de verdad, al
 * construirlo se pasa directo a «+ Asignar».
 */
const PASOS_APP: PasoTutorial[] = [
  {
    sel: 'asignar.catalogo',
    alEntrar: async (ctx) => {
      // REGLA: un solo menú abierto a la vez — el lateral (abierto si se vuelve
      // con Atrás desde la tarjeta) se retrae antes de abrir el diálogo de asignar.
      clickTut('menu.retraer')
      const id = ctx.datos.get('cuartoId') as string | undefined
      if (id) useAsignar.getState().abrir(id)
      await esperarTut('asignar.catalogo', 2000)
    },
    titulo: T('tut.primeros.apps.titulo', 'Las apps disponibles'),
    texto: T(
      'tut.primeros.apps.texto',
      'Este es + Asignar, con todas las apps disponibles: cada una arma su cuarto con sus muebles. Si lo cierras sin elegir, la tarjeta del cuarto lo vuelve a ofrecer. Le doy una al tuyo…',
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
      'Le di su app: mira cómo el cuarto tomó su nombre, su icono y sus muebles. Desde ahora su tarjeta entera es el botón de entrar.',
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
      'Entramos: esta es la app del cuarto. Para volver luego: su tarjeta en el menú, el objeto con la esfera en el mapa, o el acceso rápido del botón del logo, arriba.',
    ),
  },
  {
    // La pulsación larga, DEMOSTRADA: el cuarto despierta (tiembla, con su menú).
    alEntrar: despertarDemo,
    foco: (ctx) => regionSitio(ctx),
    titulo: T('tut.primeros.press.titulo', 'Mantén pulsado'),
    texto: T(
      'tut.primeros.press.texto',
      'Mira cómo tiembla: mantener pulsado un cuarto o un objeto lo despierta, con su menú. Así lo mueves si no te gustó dónde quedó, o lo borras.',
    ),
  },
  {
    // Mismo gesto sobre un objeto: su menú trae «Enlace» (web o entrada de app).
    alEntrar: despertarDemo,
    foco: (ctx) => regionSitio(ctx),
    titulo: T('tut.primeros.enlace.titulo', 'Objetos que llevan a algo'),
    texto: T(
      'tut.primeros.enlace.texto',
      'Con un objeto, ese menú trae además «Enlace»: conviértelo en la puerta a una página web o a una entrada de tus apps —una receta, un libro, un récord—. Luego basta tocarlo para ir directo.',
    ),
  },
  {
    alEntrar: () => {
      useDespierto.getState().terminar()
    },
    texto: T(
      'tut.primeros.6.texto',
      'Eso es todo: crear el cuarto, darle su app, entrar y acomodarlo. Este era de práctica — me lo llevo al terminar, para que armes tu MindHaOS a tu gusto.',
    ),
  },
]

/**
 * Cuerpo del paso 1 de la guía de bienvenida. Contesta las dos preguntas de
 * arranque: cómo ENTRAR a tus apps (tarjeta, esfera, botón del logo) y cómo CREAR
 * una nueva — con el preview del pincel, «+ Asignar» que se abre solo, la
 * pulsación larga demostrada y un cuarto de PRÁCTICA que se borra al salir.
 * El paseo por la casa es el paso 2 (`tutorialCasa`).
 *
 * Se arma AL LANZARLO, no al importar el módulo, para leer las apps asignadas
 * en ese momento: el paso de entrar cambia de texto si la casa aún no tiene apps.
 */
export function cuerpoPrimerosPasos(): CuerpoTutorial {
  const hayApps = appsAsignadas().size > 0
  return {
    preparar: () => {
      clickTut('menu.abrir')
    },
    pasos: [
      PASO_TAB_CUARTOS,
      pasoEntrar(hayApps),
      PASO_CREAR,
      PASO_PREVIEW,
      PASO_MATERIALIZAR,
      ...PASOS_APP,
    ],
  }
}
