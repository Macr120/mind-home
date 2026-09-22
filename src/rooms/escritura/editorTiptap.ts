/**
 * Las extensiones del editor del Studio de escritura (TipTap 3). El mismo juego
 * sirve para un documento privado y para uno compartido: la única diferencia es
 * que en compartido manda Yjs (deshacer/rehacer propios de la colaboración) y
 * se pinta el cursor de los demás.
 *
 * REGLA DURA: todo lo que produzcan estos botones tiene que sobrevivir a
 * `sanitizarHtml` (p con `text-align`, h1-3, strong/em/u/s, ul/ol/li,
 * blockquote, span con `color`, br). Por eso están apagados los bloques que el
 * saneado no conoce (código, línea horizontal, enlaces): se perderían al
 * guardar y el texto en pantalla dejaría de coincidir con el guardado.
 */
import type { Extensions } from '@tiptap/core'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import type { Awareness } from 'y-protocols/awareness'
import type * as Y from 'yjs'

export interface Colaboracion {
  doc: Y.Doc
  awareness: Awareness
  usuario: { name: string; color: string }
}

/**
 * Los documentos viejos guardaron el color como `<font color="#…">` (lo que
 * producía `execCommand` con `styleWithCSS` apagado). TipTap solo mira el
 * `style`, así que hay que enseñarle a leer ese atributo; al guardar sale ya
 * como `<span style="color:…">`.
 */
const TextStyleConFont = TextStyle.extend({
  parseHTML() {
    return [
      {
        tag: 'span',
        consuming: false,
        getAttrs: (el: HTMLElement) => (el.hasAttribute('style') ? {} : false),
      },
      { tag: 'font[color]' },
    ]
  },
})

const ColorConFont = Color.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.color || el.getAttribute('color') || null,
            renderHTML: (attrs: { color?: string | null }) => (attrs.color ? { style: `color: ${attrs.color}` } : {}),
          },
        },
      },
    ]
  },
})

export function extensiones(opciones?: { colaboracion?: Colaboracion }): Extensions {
  const colaboracion = opciones?.colaboracion
  const lista: Extensions = [
    StarterKit.configure({
      code: false,
      codeBlock: false,
      horizontalRule: false,
      // El saneado quita los `<a>`: mejor no ofrecerlos que perderlos al guardar.
      link: false,
      // Un párrafo vacío automático al final se duplicaría entre los dos editores.
      trailingNode: false,
      heading: { levels: [1, 2, 3] },
      // Con Yjs el historial es el de la colaboración (deshacer solo lo MÍO).
      undoRedo: colaboracion ? false : {},
    }),
    TextStyleConFont,
    ColorConFont,
    TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right'] }),
  ]
  if (colaboracion) {
    lista.push(
      Collaboration.configure({ document: colaboracion.doc }),
      // `provider` solo se usa por su `awareness`: aquí el proveedor es el
      // propio espacio compartido (`core/espacios/yjs.ts`).
      CollaborationCaret.configure({ provider: { awareness: colaboracion.awareness }, user: colaboracion.usuario }),
    )
  }
  return lista
}
