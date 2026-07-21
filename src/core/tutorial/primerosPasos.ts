import type { TextoTut, TutorialDef } from './tipos'
import { clickTut } from './dom'
import { irAPestanaMenu } from './menus'
import { useCuartos } from '../state/cuartosStore'
import { useHouse } from '../state/houseStore'
import { getPlantilla, plantillasCuarto } from '../registry'
import { asignarPlantillaACuarto } from '../gamificacion/plantillaBundle'
import { appsAsignadas } from '../bienvenida/bienvenidaStore'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** App del cuarto de demostración: el Calendario o, si ya está asignado, la primera libre. */
function plantillaDemo(): string | null {
  const ya = appsAsignadas()
  if (getPlantilla('calendario') && !ya.has('calendario')) return 'calendario'
  return plantillasCuarto().find((p) => !ya.has(p.id))?.id ?? null
}

/**
 * Paso 1 de la guía de bienvenida: demuestra el ciclo completo de la casa
 * creando un cuarto REAL (que se queda), asignándole su app y entrando a
 * verla. El paseo por la casa es el paso 2 (`tutorialCasa`).
 */
export const tutorialPrimerosPasos: TutorialDef = {
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
    {
      sel: 'menu.tab.cuartos',
      alEntrar: () => irAPestanaMenu('menu.tab.cuartos'),
      texto: T(
        'tut.primeros.1.texto',
        'Lo primero: cómo se arma la casa. Todo empieza en la pestaña Cuartos.',
      ),
    },
    {
      sel: 'menu.cuartos.crear',
      titulo: T('tut.primeros.2.titulo', 'Crear cuarto'),
      texto: T(
        'tut.primeros.2.texto',
        'Con este botón dibujas cuartos nuevos en el mapa. Para enseñarte el resto del camino, ahora te creo uno…',
      ),
    },
    {
      sel: (ctx) => `menu.cuartos.card.${String(ctx.datos.get('cuartoId'))}`,
      alEntrar: async (ctx) => {
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
  ],
}
