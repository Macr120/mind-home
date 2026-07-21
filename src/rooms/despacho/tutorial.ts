import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { clickTut } from '../../core/tutorial/dom'
import { finanzasRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { abrirApp } from '../../core/abrirApp'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const tutorialDespacho: TutorialDef = {
  id: 'app-despacho',
  titulo: T('tut.app-despacho.titulo', 'Finanzas · Despacho'),
  resumen: T(
    'tut.app-despacho.resumen',
    'El despacho lleva tus finanzas: ingresos y gastos por categoría con resumen mensual, metas de ahorro, simuladores (interés compuesto, crédito) y mercados en vivo (divisas, cripto y acciones).',
  ),
  preparar: () => {
    abrirApp('despacho')
  },
  pasos: [
    {
      texto: T(
        'tut.app-despacho.1.texto',
        'El despacho es tu app de finanzas: movimientos, metas de ahorro, simuladores y mercados.',
      ),
    },
    {
      sel: 'despacho.mes',
      alEntrar: () => {
        clickTut('despacho.tab.resumen')
      },
      titulo: T('tut.app-despacho.2.titulo', 'Resumen'),
      texto: T(
        'tut.app-despacho.2.texto',
        'Resumen muestra el mes: ingresos, gastos por categoría y balance. Esta barra cambia de mes.',
      ),
    },
    {
      sel: 'despacho.mov.form',
      alEntrar: () => {
        clickTut('despacho.tab.movimientos')
      },
      titulo: T('tut.app-despacho.3.titulo', 'Capturar movimientos'),
      texto: T(
        'tut.app-despacho.3.texto',
        'Aquí capturas cada ingreso o gasto con su categoría y nota.',
      ),
    },
    {
      sel: 'despacho.movimientos',
      alEntrar: async (ctx) => {
        clickTut('despacho.tab.movimientos')
        await ctx.unaVez('gasto-ejemplo', async () => {
          const id = await finanzasRepo.add({
            fecha: fechaLocalISO(),
            tipo: 'gasto',
            categoria: 'Otros',
            monto: 1,
            nota: 'Ejemplo (tutorial) 🎓',
          })
          ctx.datos.set('gastoId', id)
          ctx.alLimpiar(() => finanzasRepo.remove(id as number))
        })
      },
      titulo: T('tut.app-despacho.4.titulo', 'La lista del mes'),
      texto: T(
        'tut.app-despacho.4.texto',
        'Apunté un gasto de $1 «Ejemplo (tutorial) 🎓» para que veas la lista. Cuenta en el resumen solo mientras dura el tutorial: se borra al terminar.',
      ),
    },
    {
      sel: 'despacho.tab.metas',
      alEntrar: () => {
        clickTut('despacho.tab.metas')
      },
      titulo: T('tut.app-despacho.5.titulo', 'Metas'),
      texto: T(
        'tut.app-despacho.5.texto',
        'Metas de ahorro con progreso; pueden ligarse a un viaje de la sala.',
      ),
    },
    {
      sel: 'despacho.tab.simuladores',
      alEntrar: () => {
        clickTut('despacho.tab.simuladores')
      },
      titulo: T('tut.app-despacho.6.titulo', 'Simular'),
      texto: T(
        'tut.app-despacho.6.texto',
        'Simuladores de interés compuesto, crédito y ahorro para probar escenarios sin tocar tus datos.',
      ),
    },
    {
      sel: 'despacho.tab.mercados',
      alEntrar: () => {
        clickTut('despacho.tab.mercados')
      },
      titulo: T('tut.app-despacho.7.titulo', 'Mercados'),
      texto: T(
        'tut.app-despacho.7.texto',
        'Mercados en vivo: divisas, cripto y acciones con tu watchlist (requiere internet).',
      ),
    },
    {
      texto: T(
        'tut.app-despacho.8.texto',
        'Listo: el gasto de ejemplo se borra ahora. También puedes capturar por chat («gasté 250 en súper»).',
      ),
    },
  ],
}
