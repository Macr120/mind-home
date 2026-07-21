import type { TutorialDef } from './tipos'
import { TUTORIALES_MENU } from './menus'
import { tutorialAppGenerica } from './appGenerica'
import { getPlantilla } from '../registry'

/** Tutorial de una app por id de plantilla (el genérico si no tiene propio). */
export function tutorialDeApp(plantillaId: string): TutorialDef | null {
  const p = getPlantilla(plantillaId)
  if (!p) return null
  return p.tutorial ?? tutorialAppGenerica
}

/** Tutorial de menú/HUD por id ('casa', 'editor-mapa', 'chat', …). */
export function tutorialMenuPorId(id: string): TutorialDef | undefined {
  return TUTORIALES_MENU.find((t) => t.id === id)
}
