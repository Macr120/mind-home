import type { DestinoChat } from '../data/db'
import { abrirApp } from '../abrirApp'
import { useHud } from '../state/hudStore'
import { useLayout } from '../state/layoutStore'
import { useEditorUi } from '../state/editorUiStore'
import { useRutinasUI } from '../state/rutinasUiStore'
import { irAPestanaMenu } from '../tutorial/menus'
import { clickTut, esperarTut } from '../tutorial/dom'

/**
 * Chips "abrir X" de los mensajes del asistente: cuando el chat guarda o cambia
 * algo, el mensaje lleva un `DestinoChat` al menú donde vive el resultado y el
 * chip navega ahí. Los paneles se acomodan solos: abrir un cuarto o el editor
 * desmonta el chat, y abrir el side menu lo pliega.
 */

/** Lleva al usuario al lugar donde quedó lo que el chat guardó o cambió. */
export function navegarDestino(d: DestinoChat): void {
  switch (d.tipo) {
    case 'app':
      // null (app sin cuarto asignado) = no navega; mismo trato que los chips del calendario.
      abrirApp(d.appId, d.seccion, d.dato)
      return
    case 'menu':
      useHud.getState().setMenuAbierto(true)
      // Las pestañas del side menu son estado local: se pulsan por su anclaje data-tut.
      void irAPestanaMenu(`menu.tab.${d.tab}`).then(async () => {
        if (d.tab !== 'inventario') return
        await esperarTut('menu.inv.sub.objetos', 2000)
        clickTut('menu.inv.sub.objetos') // el usuario pudo dejar la sub-pestaña en Especiales
      })
      return
    case 'editor':
      useLayout.getState().setEditMode(true)
      useEditorUi.getState().setTab(d.tab)
      if (d.grupo) useEditorUi.getState().abrirConfigGrupo(d.grupo)
      return
    case 'rutinas':
      useRutinasUI.getState().abrirPanel()
      return
  }
}

/**
 * Menú donde vive el resultado de cada tool del chat; las acciones cuyo efecto
 * se ve directo en el mundo 3D (pintar, mover, infra…) no llevan chip. Los
 * grupos de Configuraciones son los de GRUPOS_CONFIG (editorAcciones).
 */
const DESTINO_POR_TOOL: Record<string, DestinoChat> = {
  crear_modelo_3d: { tipo: 'menu', tab: 'inventario' },
  crear_rutina: { tipo: 'rutinas' },
  editor_crear_cuarto: { tipo: 'menu', tab: 'cuartos' },
  editor_renombrar_cuarto: { tipo: 'menu', tab: 'cuartos' },
  editor_icono_cuarto: { tipo: 'menu', tab: 'cuartos' },
  editor_categoria_cuarto: { tipo: 'menu', tab: 'cuartos' },
  editor_avatar_color: { tipo: 'editor', tab: 'personajes' },
  editor_avatar_tamano: { tipo: 'editor', tab: 'personajes' },
  editor_avatar_prenda: { tipo: 'editor', tab: 'personajes' },
  editor_idioma: { tipo: 'editor', tab: 'config', grupo: 'interfaz' },
  editor_tema_interfaz: { tipo: 'editor', tab: 'config', grupo: 'interfaz' },
  editor_tipografia: { tipo: 'editor', tab: 'config', grupo: 'interfaz' },
  editor_apariencia: { tipo: 'editor', tab: 'config', grupo: 'interfaz' },
  editor_estilo_mapa: { tipo: 'editor', tab: 'config', grupo: 'estilo' },
  editor_notificaciones: { tipo: 'editor', tab: 'config', grupo: 'notificaciones' },
  editor_respaldo: { tipo: 'editor', tab: 'config', grupo: 'respaldo' },
}

/** Destino del chip según la tool ejecutada; undefined = sin chip. */
export function destinoDeTool(name: string): DestinoChat | undefined {
  return DESTINO_POR_TOOL[name]
}
