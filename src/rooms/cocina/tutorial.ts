/**
 * Flujos de cocina: corren sobre el AÑO de Pep@ en la casa demo (solo navegan
 * y señalan; no crean datos — el guard lo impediría igual).
 *
 * Las pestañas dependen del ENFOQUE activo, así que todo salto va: clic al
 * enfoque, esperar a que aparezca la pestaña, y clic en la pestaña.
 */
import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, esperarTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

async function irA(enfoque: 'peso' | 'recetario', tab: string): Promise<void> {
  clickTut(`cocina.enfoque.${enfoque}`)
  await esperarTut(`cocina.tab.${tab}`, 3000)
  clickTut(`cocina.tab.${tab}`)
}

const flujoAlimentacion: TutorialDef = {
  id: 'app-cocina--alimentacion',
  titulo: T('tut.app-cocina--alimentacion.titulo', 'Comer con un objetivo'),
  resumen: T(
    'tut.app-cocina--alimentacion.resumen',
    'El control de alimentación son tres pasos: pones tus objetivos, registras lo que comes y bebes, y el progreso te dice si vas por donde querías.',
  ),
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

const flujoRecetario: TutorialDef = {
  id: 'app-cocina--recetario',
  titulo: T('tut.app-cocina--recetario.titulo', 'Cocinar, planear y comprar'),
  resumen: T(
    'tut.app-cocina--recetario.resumen',
    'El recetario guarda tus recetas con sus macros, las agrupa en dietas y convierte lo que vas a cocinar en la lista del súper.',
  ),
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
      sel: 'cocina.compras.listas',
      titulo: T('tut.app-cocina--recetario.3.titulo', 'La lista del súper'),
      texto: T(
        'tut.app-cocina--recetario.3.texto',
        'Las listas se guardan con lo que falta por comprar y lo que ya está en la despensa. Si les pones precio, la cuenta se puede mandar a los gastos del Despacho.',
      ),
      alEntrar: async () => {
        await irA('recetario', 'compras')
        // La pestaña abre en «Crear lista»: hay que pasar a las guardadas.
        await esperarTut('cocina.compras.sub.listas', 3000)
        clickTut('cocina.compras.sub.listas')
      },
    },
  ],
}

export const flujosCocina: TutorialDef[] = [flujoAlimentacion, flujoRecetario]
