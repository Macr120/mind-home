/**
 * ESENCIAL del editor de video: corre en la casa real y recorre las dos
 * pestañas sin crear datos. Para enseñar el editor abre el anuncio de fábrica
 * (`promo.ts`), que abrir no modifica; sin él (lo borraron o aún se descarga)
 * esos pasos van sin spotlight, con la lista a la vista.
 */
import type { CuerpoTutorial, TextoTut, TutorialCtx } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, elTut, esperarTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Sale del editor si hay uno abierto (tapa las pestañas) y pulsa la pestaña. */
const aPestana = async (tab: string) => {
  clickTut('video.editor.volver')
  await esperarTut(tab, 4000)
  clickTut(tab)
}

/**
 * Deja el editor abierto: si no lo está, abre el anuncio desde la lista. Corre
 * en cada paso del editor (también al volver con «Atrás» desde Animación 3D) y
 * anota en `ctx` si lo consiguió, que es lo que leen los `sel`.
 */
const abrirAnuncio = async (ctx: TutorialCtx) => {
  let abierto = !!elTut('video.editor.cabecera')
  if (!abierto) {
    await aPestana('video.tab.videos')
    if (await esperarTut('video.lista.anuncio', 3000)) {
      clickTut('video.lista.anuncio')
      abierto = !!(await esperarTut('video.editor.cabecera', 6000))
    }
  }
  ctx.datos.set('editor', abierto)
}

/** El ancla si el editor quedó abierto; si no, '' (tarjeta sin spotlight, sin esperar). */
const enEditor = (sel: string) => (ctx: TutorialCtx) => (ctx.datos.get('editor') ? sel : '')

export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('video')
  },
  pasos: [
    {
      titulo: T('tut.app-video--esencial.1.titulo', 'El editor de video'),
      texto: T(
        'tut.app-video--esencial.1.texto',
        'Aquí se montan videos con clips, textos, narración y música sobre una línea de tiempo. Son dos menús: Videos, con tus proyectos, y Animación 3D, para rodar escenas en el mapa.',
      ),
    },
    {
      sel: 'video.tab.videos',
      titulo: T('tut.app-video--esencial.2.titulo', 'Videos'),
      texto: T(
        'tut.app-video--esencial.2.texto',
        'Tus videos, cada uno con su portada, formato y duración; «Nuevo video» empieza uno desde cero. De fábrica viene un anuncio de la app montado con este editor, que se abre, se edita o se borra como cualquier otro.',
      ),
      alEntrar: () => aPestana('video.tab.videos'),
    },
    {
      sel: enEditor('video.editor.cabecera'),
      titulo: T('tut.app-video--esencial.3.titulo', 'La cabecera del editor'),
      texto: T(
        'tut.app-video--esencial.3.texto',
        'Al abrir un video, el editor ocupa el cuarto. «Grabar dentro de la app» filma lo que haces en tu MindHaOS y lo trae como clip; «Exportar» descarga el video o lo publica en tus redes, e «IA» escribe el guion a partir de una idea.',
      ),
      alEntrar: abrirAnuncio,
    },
    {
      sel: enEditor('video.editor.visor'),
      titulo: T('tut.app-video--esencial.4.titulo', 'El visor'),
      texto: T(
        'tut.app-video--esencial.4.texto',
        'Reproduce el video tal como saldrá, y sus botones de las esquinas abren los paneles laterales. A la izquierda, Medios: tus videos, imágenes y audios, los sonidos y lo que hiciste en las otras apps del Studio; a la derecha, el editor del clip seleccionado.',
      ),
      alEntrar: abrirAnuncio,
    },
    {
      sel: enEditor('video.editor.timeline'),
      titulo: T('tut.app-video--esencial.5.titulo', 'La línea de tiempo'),
      texto: T(
        'tut.app-video--esencial.5.texto',
        'Cada pista guarda un tipo de clip: la principal, los videos e imágenes, y las de texto, narración, música o sonidos aparecen en cuanto llevan algo. Un clip se selecciona con un toque, se mueve arrastrándolo y se recorta desde sus bordes.',
      ),
      alEntrar: abrirAnuncio,
    },
    {
      sel: enEditor('video.editor.anadir'),
      titulo: T('tut.app-video--esencial.6.titulo', 'Añadir'),
      texto: T(
        'tut.app-video--esencial.6.texto',
        'Pone en el cursor lo que haga falta, cada cosa en su pista: clips o imágenes, texto, narración, música, sonidos, tu avatar, un Personaje AR o una máscara AR, y tomas de la cámara o del micrófono. Desde ahí también se abren el guion y las transiciones.',
      ),
      alEntrar: abrirAnuncio,
    },
    {
      sel: 'video.tab.animacion3d',
      titulo: T('tut.app-video--esencial.7.titulo', 'Animación 3D'),
      texto: T(
        'tut.app-video--esencial.7.texto',
        'Escenas rodadas en el mapa de tu MindHaOS: tu avatar y tus asistentes actúan por planos, con diálogos y movimientos de cámara. Se exportan, se guardan en Medios o se llevan como clip a un video.',
      ),
      alEntrar: () => aPestana('video.tab.animacion3d'),
    },
  ],
}
