/**
 * Flujos del despacho: corren sobre el año financiero de Pep@ en la casa demo.
 * Los pasos solo navegan y señalan lo que YA está sembrado — no crean datos
 * (en la casa demo cualquier escritura está bloqueada).
 */
import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { clickTut, esperarTut } from '../../core/tutorial/dom'
import { abrirApp } from '../../core/abrirApp'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Abre un menú y espera su submenú antes de pulsarlo (aparece al re-render). */
async function irA(tab: string, sub?: string) {
  clickTut(`despacho.tab.${tab}`)
  if (!sub) return
  await esperarTut(`despacho.sub.${sub}`)
  clickTut(`despacho.sub.${sub}`)
}

const flujoAnio: TutorialDef = {
  id: 'app-despacho--anio',
  titulo: T('tut.app-despacho--anio.titulo', 'El año en que Pep@ ordenó su dinero'),
  resumen: T(
    'tut.app-despacho--anio.resumen',
    'El Presupuesto resume lo que entró, lo que salió y el neto del periodo que elijas: día, semana, mes o año. Debajo, tu patrimonio, el presupuesto mensual, en qué se te va el dinero y la tendencia de los últimos periodos.',
  ),
  preparar: () => {
    abrirApp('despacho')
  },
  pasos: [
    {
      sel: 'despacho.periodo',
      alEntrar: async () => {
        await irA('balance', 'balance')
      },
      titulo: T('tut.app-despacho--anio.1.titulo', 'Un año, cuatro lupas'),
      texto: T(
        'tut.app-despacho--anio.1.texto',
        'Elige día, semana, mes o año, y muévete con las flechas. Retrocede unos meses: verás el mes de la avería del coche y el del vuelo a Japón, los dos en rojo.',
      ),
    },
    {
      sel: 'despacho.tendencia',
      titulo: T('tut.app-despacho--anio.2.titulo', 'La forma del año'),
      texto: T(
        'tut.app-despacho--anio.2.texto',
        'Seis periodos hacia atrás, en barras. Las azules son los meses en que le sobró; las rojas, los que le costaron. Ahí se ve el bache y la remontada.',
      ),
    },
    {
      sel: 'despacho.categorias',
      titulo: T('tut.app-despacho--anio.3.titulo', '¿En qué se va?'),
      texto: T(
        'tut.app-despacho--anio.3.texto',
        'El desglose por categoría del periodo que estés viendo. Pep@ escribe las suyas a mano: la app reconoce las conocidas y le da color propio a las demás.',
      ),
    },
    {
      sel: 'despacho.presupuesto',
      titulo: T('tut.app-despacho--anio.4.titulo', 'El límite del mes'),
      texto: T(
        'tut.app-despacho--anio.4.texto',
        'Un presupuesto mensual y una barra que se pone roja al pasarse. Si miras por semana o por año, la app lo reparte sola.',
      ),
    },
    {
      sel: 'despacho.patrimonio',
      titulo: T('tut.app-despacho--anio.5.titulo', 'Lo que tienes hoy'),
      texto: T(
        'tut.app-despacho--anio.5.texto',
        'Apuntas tu patrimonio una vez y el balance del periodo se le suma o se le resta: así ves cómo terminarías.',
      ),
    },
    {
      sel: 'despacho.simulador',
      titulo: T('tut.app-despacho--anio.6.titulo', 'Y dentro de un año'),
      texto: T(
        'tut.app-despacho--anio.6.texto',
        'Proyecta doce meses con tus fijos a su vencimiento y lo variable con tu promedio, en dos escenarios: con patrimonio y sin él.',
      ),
    },
  ],
}

const flujoCaptura: TutorialDef = {
  id: 'app-despacho--captura',
  titulo: T('tut.app-despacho--captura.titulo', 'Fijos y variables'),
  resumen: T(
    'tut.app-despacho--captura.resumen',
    'Un gasto fijo se captura UNA vez y la app lo cuenta sola cada mes; lo variable se apunta cuando pasa. Los dos viven en la misma lista, ordenada por fecha en carpetas de año y mes.',
  ),
  preparar: () => {
    abrirApp('despacho')
  },
  pasos: [
    {
      sel: 'despacho.repetidos',
      alEntrar: async () => {
        await irA('balance', 'gastos')
      },
      titulo: T('tut.app-despacho--captura.1.titulo', 'Los fijos de Pep@'),
      texto: T(
        'tut.app-despacho--captura.1.texto',
        'La renta, el internet, el celular, el streaming y el seguro del coche: cinco altas del mes 2, cuando decidió ordenarse. Cada una se cuenta sola desde entonces.',
      ),
    },
    {
      sel: 'despacho.mov.fijo',
      titulo: T('tut.app-despacho--captura.2.titulo', 'Cómo se captura'),
      texto: T(
        'tut.app-despacho--captura.2.texto',
        'El formulario va por pasos: monto, si es variable o fijo, categoría (escribes la tuya y te sugiere las conocidas), cada cuánto se repite y la nota.',
      ),
    },
    {
      sel: 'despacho.movimientos',
      titulo: T('tut.app-despacho--captura.3.titulo', 'Un año de movimientos'),
      texto: T(
        'tut.app-despacho--captura.3.texto',
        'Cientos de gastos guardados en carpetas de año y mes. Busca el mes 7: ahí está la avería que se llevó casi diez mil pesos de golpe.',
      ),
    },
    {
      sel: 'despacho.repetidos',
      alEntrar: async () => {
        await irA('balance', 'ingresos')
      },
      titulo: T('tut.app-despacho--captura.4.titulo', 'De dónde sale el dinero'),
      texto: T(
        'tut.app-despacho--captura.4.texto',
        'Dos sueldos quincenales de la cafetería, las clases de física que empezó a dar al decidir el viaje, y las propinas semanales, que nunca son iguales.',
      ),
    },
    {
      texto: T(
        'tut.app-despacho--captura.5.texto',
        'En tu casa también puedes capturar por chat: «gasté 250 en súper» y queda apuntado.',
      ),
    },
  ],
}

const flujoMetas: TutorialDef = {
  id: 'app-despacho--metas',
  titulo: T('tut.app-despacho--metas.titulo', 'Japón, la emergencia y la deuda'),
  resumen: T(
    'tut.app-despacho--metas.resumen',
    'Metas junta tus objetivos de ahorro e inversión en una lista con su barra, y deja las deudas aparte con su propio simulador. Cada una tiene un cronograma donde ponerles fecha.',
  ),
  preparar: () => {
    abrirApp('despacho')
  },
  pasos: [
    {
      sel: 'despacho.metas.lista',
      alEntrar: async () => {
        await irA('metas', 'ahorroInversion')
      },
      titulo: T('tut.app-despacho--metas.1.titulo', 'La meta que cumplió'),
      texto: T(
        'tut.app-despacho--metas.1.texto',
        'El viaje a Japón, al 100 %: once meses de ahorro, las clases particulares, el aguinaldo y lo que le regalaron en su cumpleaños. Debajo, el fondo de emergencia que arrancó al volver y una inversión pequeña.',
      ),
    },
    {
      sel: 'despacho.cronograma.ahorro',
      titulo: T('tut.app-despacho--metas.2.titulo', 'La meta en el tiempo'),
      texto: T(
        'tut.app-despacho--metas.2.texto',
        'Cada meta puede bajar al calendario: le pones fechas y aparece entre tus días. Con ✨ la IA propone el plan de aportaciones.',
      ),
    },
    {
      sel: 'despacho.deuda.lista',
      alEntrar: async () => {
        await irA('metas', 'deuda')
      },
      titulo: T('tut.app-despacho--metas.3.titulo', 'Lo que debía'),
      texto: T(
        'tut.app-despacho--metas.3.texto',
        'La avería del coche se pagó con tarjeta y tardó meses en saldarse. Las deudas van aparte porque se leen al revés: aquí bajar es ganar.',
      ),
    },
    {
      sel: 'despacho.tab.mercados',
      alEntrar: async () => {
        await irA('mercados', 'divisas')
      },
      titulo: T('tut.app-despacho--metas.4.titulo', 'Mercados'),
      texto: T(
        'tut.app-despacho--metas.4.texto',
        'Pep@ vigila el yen desde que decidió el viaje y ahora el won, por el siguiente. Divisas, cripto, acciones y materias primas en vivo (necesita internet).',
      ),
    },
  ],
}

export const flujosDespacho: TutorialDef[] = [flujoAnio, flujoCaptura, flujoMetas]
