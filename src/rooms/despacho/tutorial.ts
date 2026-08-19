/**
 * Flujos del despacho: corren sobre el año financiero de Pep@ en la casa demo.
 * Los pasos solo navegan y señalan lo que YA está sembrado — no crean datos
 * (en la casa demo cualquier escritura está bloqueada).
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
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

export const cuerpoAnio: CuerpoTutorial = {
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
        'Tu patrimonio sale solo de la pestaña Patrimonio: activos menos pasivos. Aquí se le suma o resta el balance del periodo, para ver cómo terminarías.',
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

export const cuerpoCaptura: CuerpoTutorial = {
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

export const cuerpoMetas: CuerpoTutorial = {
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
      sel: 'hoy.cabecera',
      titulo: T('tut.app-despacho--metas.2.titulo', 'La meta en el tiempo'),
      texto: T(
        'tut.app-despacho--metas.2.texto',
        'Estas metas se guardan sobre el eje del tiempo en el cuarto de Metas: le pones fechas a una y aparece entre tus días del calendario. Con ✨ la IA propone el plan de aportaciones.',
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

export const cuerpoCalculadoras: CuerpoTutorial = {
  preparar: () => {
    abrirApp('despacho')
  },
  pasos: [
    {
      sel: 'despacho.calc.tabs',
      alEntrar: async () => {
        await irA('metas', 'financieras')
      },
      texto: T(
        'tut.app-despacho--calculadoras.1.texto',
        'Cuatro reglas de finanzas personales, cada una en su pestaña: fondo de emergencia, libertad financiera, 50/30/20 y el enganche del auto (20/4/10).',
      ),
    },
    {
      sel: 'despacho.calc.panel',
      titulo: T('tut.app-despacho--calculadoras.2.titulo', 'Ya parte de tu balance'),
      texto: T(
        'tut.app-despacho--calculadoras.2.texto',
        'Los campos llegan precargados con tu ingreso o gasto real del mes — tócalos para simular otra cifra sin perder de vista la real.',
      ),
    },
    {
      sel: 'despacho.calc.crearMeta',
      titulo: T('tut.app-despacho--calculadoras.3.titulo', 'De cálculo a meta'),
      texto: T(
        'tut.app-despacho--calculadoras.3.texto',
        'Con un toque, el resultado se convierte en una meta de ahorro real, lista para bajar al cronograma y ponerle fecha. (No lo pulses en la demo: crearía una meta de verdad.)',
      ),
    },
  ],
}

/**
 * Esencial: corre en la casa REAL, así que solo recorre los cuatro menús de
 * primer nivel — anclas que existen con la BD vacía — y no crea ningún dato.
 */
export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('despacho')
  },
  pasos: [
    {
      titulo: T('tut.app-despacho--esencial.1.titulo', 'Tus finanzas'),
      texto: T(
        'tut.app-despacho--esencial.1.texto',
        'El despacho ordena tu dinero en cuatro menús: lo que tienes, lo que entra y sale, tus metas y los mercados. Cada uno abre sus propias secciones debajo.',
      ),
    },
    {
      sel: 'despacho.tab.patrimonio',
      titulo: T('tut.app-despacho--esencial.2.titulo', 'Patrimonio'),
      texto: T(
        'tut.app-despacho--esencial.2.texto',
        'Lo que tienes y lo que debes, en dos listas: activos y pasivos. La tercera sección proyecta esa foto hacia adelante con la tasa que le pongas a cada línea.',
      ),
      alEntrar: async () => {
        await esperarTut('despacho.tab.patrimonio', 4000)
        clickTut('despacho.tab.patrimonio')
      },
    },
    {
      sel: 'despacho.tab.balance',
      titulo: T('tut.app-despacho--esencial.3.titulo', 'Flujo'),
      texto: T(
        'tut.app-despacho--esencial.3.texto',
        'El dinero que entra y el que sale, separado en gastos, ingresos y balance. El balance resume el periodo que elijas —día, semana, mes o año— con su presupuesto, sus categorías y su tendencia.',
      ),
      alEntrar: () => {
        clickTut('despacho.tab.balance')
      },
    },
    {
      sel: 'despacho.tab.metas',
      titulo: T('tut.app-despacho--esencial.4.titulo', 'Metas'),
      texto: T(
        'tut.app-despacho--esencial.4.texto',
        'Tus objetivos de dinero en tres secciones: ahorro e inversión, deuda, y unas calculadoras que proponen un monto a partir de tu propio balance. Cada meta puede bajar al cronograma y llevar fecha.',
      ),
      alEntrar: () => {
        clickTut('despacho.tab.metas')
      },
    },
    {
      sel: 'despacho.tab.mercados',
      titulo: T('tut.app-despacho--esencial.5.titulo', 'Mercados'),
      texto: T(
        'tut.app-despacho--esencial.5.texto',
        'Cotizaciones en vivo de divisas, cripto, acciones y materias primas; necesita conexión. Es un tablero de consulta: la app no recomienda qué comprar ni qué vender.',
      ),
      alEntrar: () => {
        clickTut('despacho.tab.mercados')
      },
    },
  ],
}

export const cuerpoPatrimonio: CuerpoTutorial = {
  preparar: () => {
    abrirApp('despacho')
  },
  pasos: [
    {
      sel: 'despacho.patr.neto',
      alEntrar: async () => {
        await irA('patrimonio', 'activos')
      },
      titulo: T('tut.app-despacho--patrimonio.1.titulo', 'Lo que vale hoy'),
      texto: T(
        'tut.app-despacho--patrimonio.1.texto',
        'Activos menos pasivos. Cuando una línea lleva tasa, este número es lo que vale HOY, no lo que valía el día que lo apuntaste — y debajo puedes ver el desglose, o volver a lo que escribiste tú.',
      ),
    },
    {
      sel: 'despacho.patr.grafica',
      titulo: T('tut.app-despacho--patrimonio.2.titulo', 'De dónde viene'),
      texto: T(
        'tut.app-despacho--patrimonio.2.texto',
        'Los últimos dos años de este grupo. Abre cualquier línea y verás de qué depende: cuánto vale, desde cuándo, y cuánto sube o baja al año. Lo que escribes no se reescribe nunca solo.',
      ),
    },
    {
      sel: 'despacho.sub.simulacion',
      titulo: T('tut.app-despacho--patrimonio.3.titulo', 'Y a dónde va'),
      texto: T(
        'tut.app-despacho--patrimonio.3.texto',
        'La tercera pestaña sigue esa misma línea hacia adelante: sólida lo que pasó, punteada lo que darían tus tasas.',
      ),
    },
    {
      sel: 'despacho.sim.grafica',
      alEntrar: async () => {
        await irA('patrimonio', 'simulacion')
      },
      titulo: T('tut.app-despacho--patrimonio.4.titulo', 'Tres líneas'),
      texto: T(
        'tut.app-despacho--patrimonio.4.texto',
        'Lo que tienes en verde, lo que debes en rojo y el neto en azul. La raya vertical es hoy: a su izquierda está lo que pasó de verdad.',
      ),
    },
    {
      sel: 'despacho.sim.controles',
      titulo: T('tut.app-despacho--patrimonio.5.titulo', 'Muévelo todo'),
      texto: T(
        'tut.app-despacho--patrimonio.5.texto',
        'Cuántos meses, cuánta inflación supones, y si sumar lo que ahorras cada mes con su propio ritmo de subida. Nada de esto toca tus datos: puedes probar sin miedo.',
      ),
    },
  ],
}

