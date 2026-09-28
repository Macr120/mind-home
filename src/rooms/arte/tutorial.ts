/**
 * ESENCIAL de Arte: corre en la casa real y no crea datos. Recorre la galería
 * y entra al editor por un dibujo que ya exista —abrirlo no escribe nada hasta
 * que se pinta—, de fábrica si queda alguno. Sin dibujos, los pasos del editor
 * se leen junto al mago, sin spotlight.
 */
import { dibujosRepo } from '../../core/data/repository'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, elTut, esperarTut } from '../../core/tutorial/dom'
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/**
 * El dibujo por el que entra el tour: uno de fábrica (uid `seed-dibujos-…`,
 * ver `seed.ts`) si queda, y si no el primero propio. Nunca uno compartido, que
 * conectaría con su espacio.
 */
async function dibujoParaAbrir(): Promise<number | null> {
  const dibujos = (await dibujosRepo.list()).filter((d) => d.id != null && !d.espacioId)
  return (dibujos.find((d) => d.uid?.startsWith('seed-dibujos-')) ?? dibujos[0])?.id ?? null
}

/** A la galería: el tour puede lanzarse con un dibujo abierto (el «?» de la app) o volver con «Atrás». */
const aLaGaleria = async () => {
  if (clickTut('arte.volver')) await esperarTut('arte.galeria', 3000)
}

/** Al editor. Idempotente: con la barra ya a la vista no hace nada; sin dibujos, se queda en la galería. */
const alEditor = async () => {
  if (elTut('arte.barra')) return
  const id = await dibujoParaAbrir()
  if (id == null) return
  const tarjeta = `arte.dibujo.${id}`
  if (!(await esperarTut(tarjeta, 3000))) return
  clickTut(tarjeta)
  await esperarTut('arte.barra', 4000)
}

/**
 * Despliega el panel de un botón de la barra que alterna (capas, filtros). Se
 * mira su `aria-pressed` y no el panel, que tarda en salir mientras carga el
 * lienzo: así volver con «Atrás» no lo cierra.
 */
const desplegar = async (herr: 'capas' | 'filtros', panel: string) => {
  await alEditor()
  const boton = elTut(`arte.herr.${herr}`)
  if (!boton) return
  if (boton.getAttribute('aria-pressed') !== 'true') clickTut(`arte.herr.${herr}`)
  await esperarTut(panel, 3000)
}

export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('arte')
  },
  pasos: [
    {
      titulo: T('tut.app-arte--esencial.1.titulo', 'Tu estudio de arte'),
      texto: T(
        'tut.app-arte--esencial.1.texto',
        'Aquí pintas desde cero, retocas una foto o dejas que la IA imagine contigo. Todo empieza en la galería, y cada dibujo se abre en un lienzo por capas que se guarda solo.',
      ),
    },
    {
      sel: 'arte.galeria',
      titulo: T('tut.app-arte--esencial.2.titulo', 'La galería'),
      texto: T(
        'tut.app-arte--esencial.2.texto',
        'Cada dibujo se abre con un toque, y desde su tarjeta se comparte, se renombra o se borra. «Nuevo dibujo» empieza en blanco, con el tamaño que elijas, o desde una foto. «Tarde en el valle» y «Bodegón de frutas» vienen de fábrica: el pie los borra y, si ya no están, los restaura.',
      ),
      alEntrar: aLaGaleria,
    },
    {
      sel: 'arte.barra',
      titulo: T('tut.app-arte--esencial.3.titulo', 'La barra por grupos'),
      texto: T(
        'tut.app-arte--esencial.3.texto',
        'Dentro de un dibujo, las herramientas van por grupos: Pintar, Formas, Objetos, Lienzo, Trazo y color e Historial. Cada grupo se pliega desde su icono, y grupos y botones se arrastran para ordenarlos; si la cambias, «Restablecer la barra» la deja como venía.',
      ),
      alEntrar: alEditor,
    },
    {
      sel: 'arte.capas',
      titulo: T('tut.app-arte--esencial.4.titulo', 'Capas'),
      texto: T(
        'tut.app-arte--esencial.4.texto',
        'Se pinta en la capa activa, y caben hasta seis con «Añadir capa». Cada una se oculta, cambia de opacidad, se duplica, cambia de orden, se fusiona con la de abajo o se borra.',
      ),
      alEntrar: () => desplegar('capas', 'arte.capas'),
    },
    {
      sel: 'arte.filtros',
      titulo: T('tut.app-arte--esencial.5.titulo', 'Filtros y ayudas'),
      texto: T(
        'tut.app-arte--esencial.5.texto',
        'Brillo, contraste, escala de grises y desenfoque se aplican a la capa activa mientras ves el lienzo, y cada filtro se puede deshacer. En la misma barra están las ayudas de dibujo: regla, rejilla con imán y espejo.',
      ),
      alEntrar: () => desplegar('filtros', 'arte.filtros'),
    },
    {
      sel: 'arte.herr.png',
      titulo: T('tut.app-arte--esencial.6.titulo', 'Exportar y compartir'),
      texto: T(
        'tut.app-arte--esencial.6.texto',
        'El dibujo se guarda solo, y el botón PNG descarga la imagen con las capas visibles unidas sobre fondo blanco. Para pintarlo entre varios, «Compartir», arriba, lo abre por enlace.',
      ),
      alEntrar: alEditor,
    },
    {
      sel: 'arte.ia',
      titulo: T('tut.app-arte--esencial.7.titulo', 'Pintar con IA'),
      texto: T(
        'tut.app-arte--esencial.7.texto',
        'Describe lo que quieres ver y la IA lo pinta en la capa activa, o reinterpreta tu lienzo tomándolo como referencia. Cada opción muestra antes cuántos créditos cuesta, y el resultado se puede deshacer.',
      ),
      alEntrar: alEditor,
    },
  ],
}
