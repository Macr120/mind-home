/**
 * Flujos de la sala de cómputo: corren sobre el año de Pep@ en la casa demo.
 * Los pasos navegan con clicks sobre las anclas `data-tut` y no crean datos.
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, elTut } from '../../core/tutorial/dom'

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
        'La calculadora cambia de vista entera: la gráfica, binario y hexadecimal, matrices, sistemas de ecuaciones, conversión de unidades, la cuenta con propina y la regla de tres. El historial se queda abajo en todos.',
      ),
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

