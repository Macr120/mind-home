/**
 * Flujos de cocina: corren sobre el AÑO de Pep@ en la casa demo (solo navegan
 * y señalan; no crean datos — el guard lo impediría igual).
 *
 * Las pestañas dependen del ENFOQUE activo, así que todo salto va: clic al
 * enfoque, esperar a que aparezca la pestaña, y clic en la pestaña.
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, esperarTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

async function irA(enfoque: 'peso' | 'recetario', tab: string): Promise<void> {
  clickTut(`cocina.enfoque.${enfoque}`)
  await esperarTut(`cocina.tab.${tab}`, 3000)
  clickTut(`cocina.tab.${tab}`)
}

export const cuerpoAlimentacion: CuerpoTutorial = {
  preparar: () => {
    abrirApp('cocina')
  },
  pasos: [
    {
      sel: 'cocina.metas.objetivos',
      titulo: T('tut.app-cocina--alimentacion.1.titulo', 'Paso 1: a dónde vas'),
      texto: T(
        'tut.app-cocina--alimentacion.1.texto',
        'Con tu peso, tu altura y tu actividad, la app calcula cuánto necesitas al día y reparte los macros. Pep@ se puso 2 400 calorías y un objetivo de peso al que le falta menos de un kilo.',
      ),
      alEntrar: () => irA('peso', 'metas'),
    },
    {
      sel: 'cocina.diario.resumen',
      titulo: T('tut.app-cocina--alimentacion.2.titulo', 'Paso 2: lo que comiste hoy'),
      texto: T(
        'tut.app-cocina--alimentacion.2.texto',
        'Desayuno, comida, cena y algo suelto: cada registro suma a los anillos del día. El agua tiene su propia meta, y es la que la casa mira para dar por cumplido el día.',
      ),
      alEntrar: () => irA('peso', 'diario'),
    },
    {
      sel: 'cocina.prog.peso',
      titulo: T('tut.app-cocina--alimentacion.3.titulo', 'Paso 3: 74 kilos, 67 kilos'),
      texto: T(
        'tut.app-cocina--alimentacion.3.texto',
        'La curva del año entero, con su meseta en el mes de la lesión y el kilo que subió en Japón. Abajo te dice a qué ritmo vas y cuándo llegarías si sigues así.',
      ),
      alEntrar: () => irA('peso', 'progreso'),
    },
    {
      sel: 'cocina.prog.calendario',
      titulo: T('tut.app-cocina--alimentacion.4.titulo', 'Un año en colores'),
      texto: T(
        'tut.app-cocina--alimentacion.4.texto',
        'Verde es un día dentro del objetivo, ámbar uno que se pasó un poco y rojo uno que se fue del todo. El mes del viaje se ve a la primera. Toca cualquier día para abrirlo.',
      ),
    },
  ],
}

export const cuerpoRecetario: CuerpoTutorial = {
  preparar: () => {
    abrirApp('cocina')
  },
  pasos: [
    {
      sel: 'cocina.dietas.lista',
      titulo: T('tut.app-cocina--recetario.1.titulo', 'Dietas, no dietas de revista'),
      texto: T(
        'tut.app-cocina--recetario.1.texto',
        'Una dieta aquí es un plan con sus recetas dentro. Pep@ guardó dos suyas: la semana del maratón y la vuelta de Japón, además de las que trae la app.',
      ),
      alEntrar: () => irA('recetario', 'plan'),
    },
    {
      sel: 'cocina.recetas.lista',
      titulo: T('tut.app-cocina--recetario.2.titulo', 'El recetario'),
      texto: T(
        'tut.app-cocina--recetario.2.texto',
        'Cada receta guarda ingredientes, pasos y sus macros por porción, y se ordena en carpetas. Desde una receta puedes registrar la comida o mandar sus ingredientes al súper.',
      ),
      alEntrar: () => irA('recetario', 'recetas'),
    },
    {
      sel: 'cocina.ia.receta',
      titulo: T('tut.app-cocina--recetario.3.titulo', 'Pedirle la receta a la IA'),
      texto: T(
        'tut.app-cocina--recetario.3.texto',
        'Describe qué quieres cocinar y la IA arma la receta completa con foto del platillo. Esto lo hace la IA: se enciende en Editor › Configuraciones › Cuenta.',
      ),
      // La opción IA ahora vive DENTRO del alta: hay que abrir «Nueva» para señalarla.
      alEntrar: async () => {
        await irA('recetario', 'recetas')
        await esperarTut('cocina.rec.nueva', 3000)
        clickTut('cocina.rec.nueva')
      },
    },
    {
      sel: 'cocina.compras.sub.crear',
      titulo: T('tut.app-cocina--recetario.4.titulo', 'De receta a lista de súper'),
      texto: T(
        'tut.app-cocina--recetario.4.texto',
        'Crear lista junta lo que falta de varias recetas en una sola compra: cada ingrediente adivina su categoría (verdura, lácteo…) y se puede editar.',
      ),
      alEntrar: () => irA('recetario', 'compras'),
    },
    {
      sel: 'cocina.compras.listas',
      titulo: T('tut.app-cocina--recetario.5.titulo', 'Las listas guardadas'),
      texto: T(
        'tut.app-cocina--recetario.5.texto',
        'Cada lista se guarda con lo que falta por comprar y lo que ya está en la despensa. Si les pones precio, la cuenta se puede mandar a los gastos del Despacho.',
      ),
      alEntrar: async () => {
        await esperarTut('cocina.compras.sub.listas', 3000)
        clickTut('cocina.compras.sub.listas')
      },
    },
  ],
}

export const cuerpoCronograma: CuerpoTutorial = {
  preparar: () => {
    abrirApp('cocina')
  },
  pasos: [
    {
      // Las metas viven en el botón Metas del header: se abre su panel.
      sel: 'cal.metas.lista',
      titulo: T('tut.app-cocina--cronograma.1.titulo', 'La meta de peso, con fases'),
      texto: T(
        'tut.app-cocina--cronograma.1.texto',
        'El botón Metas del encabezado abre el mismo cronograma que usa el calendario de la casa, acotado a las metas de Cocina: crea una meta (p. ej. «Bajar 3 kilos») y pídele el plan a la IA — pregunta tu fecha objetivo y agenda sub-metas con su fecha.',
      ),
      alEntrar: async () => {
        clickTut('hoy.cabecera')
        await esperarTut('cal.metas.lista', 2000)
      },
      esperar: 'cal.metas.lista',
    },
    {
      texto: T(
        'tut.app-cocina--cronograma.2.texto',
        'Esto lo hace la IA: se enciende en Editor › Configuraciones › Cuenta. Sin ella, las metas se crean y editan igual, solo que a mano.',
      ),
    },
  ],
}

