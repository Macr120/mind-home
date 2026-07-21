import { clickTut, esperarTut } from './dom'
import { useLayout } from '../state/layoutStore'

/**
 * Deja abierto el editor de una infraestructura antes de que el tour mida su
 * primer paso. Absorbe los tres estados desde los que se puede lanzar el tour:
 * menú lateral abierto, modo Editar activo (con él `iniciar()` se cancela en
 * silencio y App.tsx ni siquiera monta el overlay) y editor ya abierto.
 *
 * `iniciar()` es síncrono, pero React monta el overlay en el render siguiente:
 * de ahí la espera al anclaje. Se llama desde `preparar`, que el motor espera
 * (`await def.preparar?.()`) antes de correr el paso 0.
 */
export async function abrirEditorInfra(iniciar: () => void, ancla: string): Promise<void> {
  clickTut('menu.retraer') // no-op si el menú ya está cerrado
  useLayout.getState().setEditMode(false)
  iniciar() // además limpia `editingRoomId`, antes de que corran los efectos de App
  await esperarTut(ancla, 3000)
}
