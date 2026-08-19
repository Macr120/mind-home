/**
 * Flujos de la sala de cómputo: corren sobre el año de Pep@ en la casa demo.
 * Los pasos navegan con clicks sobre las anclas `data-tut` y no crean datos.
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, elTut, esperarTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/**
 * Los pasos se plantan en un modo con `clickTut('computo.modo.<id>')`, que es
 * idempotente por construcción: pulsar el modo en el que ya estás no cambia
 * nada. Eso importa porque `alEntrar` corre también al volver con «Atrás».
 *
 * Funciona aunque el menú de modos esté cerrado: `SelectorModo` renderiza su
 * lista siempre y la esconde con `hidden`, así que los botones existen.
 */

/**
 * El formulario NO es un modo sino un menú plegable, y su cabecera sí alterna:
 * un `clickTut` pelado lo cerraría al volver con «Atrás». Se mira si el
 * contenido ya está en el DOM y solo se pulsa cuando hace falta.
 */
const menuFormulario = (abrir: boolean) => {
  if (!!elTut('computo.form.arbol') !== abrir) clickTut('computo.menu.formulario')
}

export const cuerpoFormulario: CuerpoTutorial = {
  preparar: () => {
    abrirApp('computo', 'formulario')
  },
  pasos: [
    {
      sel: 'computo.menu.formulario',
      titulo: T('tut.app-computo--formulario.1.titulo', 'Cuelga de la calculadora'),
      texto: T(
        'tut.app-computo--formulario.1.texto',
        'El formulario entero vive en este menú, a un toque de donde calculas. Matemáticas, Física y Química vienen cargadas y agrupadas por temas, en carpetas que puedes anidar como quieras. Pep@ además tiene Física II con sus parciales, las cuentas de la cafetería y las de correr.',
      ),
      alEntrar: () => {
        clickTut('computo.tab.calculadora')
        menuFormulario(true)
      },
    },
    {
      sel: 'computo.form.arbol',
      titulo: T('tut.app-computo--formulario.2.titulo', 'Todo es tuyo'),
      texto: T(
        'tut.app-computo--formulario.2.texto',
        'No hay «de fábrica» ni «mías»: cualquier fórmula se abre, se edita y se borra igual. El buscador de arriba busca en todas.',
      ),
    },
    {
      sel: 'computo.form.ficha',
      titulo: T('tut.app-computo--formulario.3.titulo', 'Cambiarla a tu gusto'),
      texto: T(
        'tut.app-computo--formulario.3.texto',
        'Editar una fórmula te deja cambiarle la expresión, renombrar sus variables o fijarle un valor que siempre usas.',
      ),
    },
    {
      texto: T(
        'tut.app-computo--formulario.4.texto',
        'La curva sale entre la fórmula y las variables, y arrastrar la barra de cualquiera la mueve al momento. «Ver en grande» la manda al modo Gráfica, y el botón de imprimir saca la carpeta entera en PDF con las fórmulas bien compuestas.',
      ),
    },
  ],
}

export const cuerpoCalculadora: CuerpoTutorial = {
  preparar: () => {
    abrirApp('computo', 'calculadora')
  },
  pasos: [
    {
      sel: 'computo.calc.entrada',
      titulo: T('tut.app-computo--calculadora.1.titulo', 'Escribe la operación'),
      texto: T(
        'tut.app-computo--calculadora.1.texto',
        'El resultado se calcula mientras escribes. El teclado de abajo evita el del teléfono, y lo científico ya no vive ahí: está en las notaciones.',
      ),
      alEntrar: () => {
        clickTut('computo.tab.calculadora')
        // La entrada y las notaciones solo existen en el modo Normal, y se
        // puede llegar aquí desde cualquier otro.
        clickTut('computo.modo.normal')
        menuFormulario(false)
      },
    },
    {
      sel: 'computo.notaciones',
      alEntrar: () => {
        clickTut('computo.modo.normal')
      },
      titulo: T('tut.app-computo--calculadora.2.titulo', 'Las notaciones'),
      texto: T(
        'tut.app-computo--calculadora.2.texto',
        'Aquí está todo lo científico y bastante más: eliges el grupo —básicas, cálculo, matrices, trigonometría, símbolos— y los botones cambian. Se escriben donde tengas el cursor y el hueco queda listo para teclear.',
      ),
    },
    {
      sel: 'computo.calc.modos',
      titulo: T('tut.app-computo--calculadora.3.titulo', 'Modos especiales'),
      texto: T(
        'tut.app-computo--calculadora.3.texto',
        'La calculadora cambia de vista entera: la gráfica, las bases del 2 al 16, matrices, sistemas de ecuaciones, conversión de unidades, la cuenta con propina y la regla de tres. El historial se queda abajo en todos.',
      ),
    },
    {
      sel: 'computo.calc.bases',
      titulo: T('tut.app-computo--calculadora.3b.titulo', 'Bases'),
      texto: T(
        'tut.app-computo--calculadora.3b.texto',
        'Lo que escribas se lee en la base elegida y se muestra en las quince a la vez, del 2 al 16, en vivo. Trae operaciones bit a bit, y con los prefijos 0b, 0o y 0x se mezclan bases en una misma cuenta.',
      ),
      alEntrar: () => {
        clickTut('computo.modo.bases')
      },
    },
    {
      sel: 'computo.calc.matrices',
      titulo: T('tut.app-computo--calculadora.3c.titulo', 'Matrices y sistemas'),
      texto: T(
        'tut.app-computo--calculadora.3c.texto',
        'Matrices opera con A y B hasta 6×6: suma, producto, determinante, inversa, transpuesta y traza. Su vecino Sistemas resuelve ecuaciones lineales leyendo las incógnitas de lo que escribas, hasta seis ecuaciones.',
      ),
      alEntrar: () => {
        clickTut('computo.modo.matrices')
      },
    },
    {
      sel: 'computo.calc.unidades',
      titulo: T('tut.app-computo--calculadora.3d.titulo', 'Unidades'),
      texto: T(
        'tut.app-computo--calculadora.3d.texto',
        'Ocho categorías —de longitud a datos— que convierten mientras escribes; cada una recuerda su último par y «Al revés» invierte la conversión. La temperatura sale bien: 100 °C son 212 °F.',
      ),
      alEntrar: () => {
        clickTut('computo.modo.unidades')
      },
    },
    {
      sel: 'computo.calc.propina',
      titulo: T('tut.app-computo--calculadora.3e.titulo', 'Propina y regla de tres'),
      texto: T(
        'tut.app-computo--calculadora.3e.texto',
        'Las dos de cabeza rápida: Propina calcula sobre la cuenta —no sobre el total— y divide entre cuantos sean; Regla de 3, directa o inversa, llena la x sola.',
      ),
      alEntrar: () => {
        clickTut('computo.modo.propina')
      },
    },
    {
      sel: 'computo.menu.formulario',
      titulo: T('tut.app-computo--calculadora.4.titulo', 'El formulario, a mano'),
      texto: T(
        'tut.app-computo--calculadora.4.texto',
        'Tus fórmulas cuelgan de este menú, con sus variables listas para llenar: es lo que hace que guardarlas sirva de algo.',
      ),
      alEntrar: () => {
        menuFormulario(true)
      },
    },
    {
      sel: 'computo.calc.grafica',
      titulo: T('tut.app-computo--calculadora.5.titulo', 'Graficar'),
      texto: T(
        'tut.app-computo--calculadora.5.texto',
        'Por aquí pasa todo lo que se dibuja, con la gráfica arriba y el teclado abajo para escribir las funciones. Arrastra para mover, pellizca para acercarte y toca para leer un punto.',
      ),
      alEntrar: () => {
        clickTut('computo.modo.grafica')
      },
    },
    {
      sel: 'computo.graf.tipos',
      titulo: T('tut.app-computo--calculadora.6.titulo', 'Cuatro formas de dibujar'),
      texto: T(
        'tut.app-computo--calculadora.6.texto',
        'Funciones de x, curvas polares como esta rosa (r en función del ángulo), paramétricas donde x e y dependen de un mismo parámetro, y superficies de dos variables que se giran con el dedo.',
      ),
      alEntrar: () => {
        clickTut('computo.modo.grafica')
        clickTut('computo.graf.tipo.polar')
        menuFormulario(false)
      },
    },
    {
      sel: 'computo.calc.resolver',
      titulo: T('tut.app-computo--calculadora.7.titulo', 'Resolver ecuaciones'),
      texto: T(
        'tut.app-computo--calculadora.7.texto',
        'Escribe la ecuación con su igual. Si es un polinomio te da las raíces exactas; si no, las busca dentro del intervalo que estés viendo y te dice cuál fue.',
      ),
      alEntrar: () => {
        clickTut('computo.modo.normal')
      },
    },
  ],
}

export const cuerpoHojas: CuerpoTutorial = {
  preparar: () => {
    abrirApp('computo', 'hojas')
  },
  pasos: [
    {
      sel: 'computo.hojas.lista',
      titulo: T('tut.app-computo--hojas.1.titulo', 'Tus hojas'),
      texto: T(
        'tut.app-computo--hojas.1.texto',
        'Cada hoja es un documento suelto. Pep@ tiene el presupuesto de Japón, el plan de las 18 semanas del maratón y las notas de Física II.',
      ),
      alEntrar: () => {
        clickTut('computo.tab.hojas')
      },
    },
    {
      sel: 'computo.hojas.lista',
      titulo: T('tut.app-computo--hojas.2.titulo', 'Empezar con algo'),
      texto: T(
        'tut.app-computo--hojas.2.texto',
        'La app trae tres hojas ya armadas con sus fórmulas —presupuesto, promedio ponderado y registro de mediciones— para no empezar en blanco. Son tuyas: cámbialas o bórralas.',
      ),
    },
    {
      sel: 'computo.hojas.barra',
      titulo: T('tut.app-computo--hojas.3.titulo', 'La barra de fórmula'),
      texto: T(
        'tut.app-computo--hojas.3.texto',
        'La celda se edita aquí arriba, no en la rejilla: en el teléfono es la única forma de escribir sin pelearse. Mientras escribes una fórmula, tocar una celda inserta su referencia.',
      ),
    },
    {
      sel: 'computo.hojas.acciones',
      titulo: T('tut.app-computo--hojas.4.titulo', 'Graficar lo que seleccionas'),
      texto: T(
        'tut.app-computo--hojas.4.texto',
        'Marca un rango y pulsa el botón de la gráfica: barras, líneas, área, pastel o dispersión. La gráfica guarda el RANGO, así que se mueve sola al cambiar un número.',
      ),
    },
    {
      sel: 'computo.hojas.exportar',
      titulo: T('tut.app-computo--hojas.5.titulo', 'Exportar'),
      texto: T(
        'tut.app-computo--hojas.5.texto',
        'A Excel sale un .xlsx de verdad, con las fórmulas vivas y las gráficas como gráficas de Excel. A PDF sale por la impresora del navegador.',
      ),
    },
  ],
}

/**
 * ESENCIAL: corre en la casa real y recorre los menús principales uno por uno.
 * Sin datos de por medio: sus anclas son las dos pestañas, el menú de modos y la
 * cabecera del formulario, que existen con la BD vacía.
 *
 * `alEntrar` solo pulsa pestañas: `clickTut` sobre la pestaña ACTIVA no la
 * pliega (`PestanasCarpeta` solo pliega con clicks reales), así que re-entrar
 * con «Atrás» no cambia nada.
 */
export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('computo')
  },
  pasos: [
    {
      titulo: T('tut.app-computo--esencial.1.titulo', 'La sala de cómputo'),
      texto: T(
        'tut.app-computo--esencial.1.texto',
        'Aquí se resuelve lo que hay que calcular, en dos menús: la Calculadora, con sus modos y tu formulario de fórmulas, y las Hojas de cálculo para todo lo que va en tablas.',
      ),
    },
    {
      sel: 'computo.tab.calculadora',
      titulo: T('tut.app-computo--esencial.2.titulo', 'Calculadora'),
      texto: T(
        'tut.app-computo--esencial.2.texto',
        'Una calculadora científica que da el resultado mientras escribes y guarda lo calculado en el historial. El teclado de abajo evita el del teléfono, y las notaciones escriben lo científico donde tengas el cursor.',
      ),
      alEntrar: async () => {
        await esperarTut('computo.tab.calculadora', 4000)
        clickTut('computo.tab.calculadora')
      },
    },
    {
      sel: 'computo.calc.modos',
      titulo: T('tut.app-computo--esencial.3.titulo', 'Los modos'),
      texto: T(
        'tut.app-computo--esencial.3.texto',
        'Este menú cambia la vista entera de la calculadora: gráfica, bases numéricas, matrices, sistemas de ecuaciones, conversión de unidades, propina y regla de tres. El historial se queda abajo en todos.',
      ),
      alEntrar: () => {
        clickTut('computo.tab.calculadora')
      },
    },
    {
      sel: 'computo.menu.formulario',
      titulo: T('tut.app-computo--esencial.4.titulo', 'El formulario'),
      texto: T(
        'tut.app-computo--esencial.4.texto',
        'Tu libro de fórmulas, plegado sobre la calculadora. Vienen puestas las de Matemáticas, Física y Química, en carpetas que puedes anidar. Cualquiera se abre para llenar sus variables, se edita o se borra.',
      ),
      alEntrar: () => {
        clickTut('computo.tab.calculadora')
      },
    },
    {
      sel: 'computo.tab.hojas',
      titulo: T('tut.app-computo--esencial.5.titulo', 'Hojas de cálculo'),
      texto: T(
        'tut.app-computo--esencial.5.texto',
        'Hojas con referencias de celda y fórmulas en español, y gráficas sobre el rango que marques. Se exportan a Excel conservando las fórmulas, o a PDF.',
      ),
      alEntrar: () => {
        clickTut('computo.tab.hojas')
      },
    },
  ],
}

