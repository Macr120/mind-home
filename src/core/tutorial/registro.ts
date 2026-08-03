import type { TutorialDef } from './tipos'
import { TUTORIALES_MENU } from './menus'
import { tutorialAppGenerica } from './appGenerica'
import { esInfraestructura, getPlantilla } from '../registry'
import { abrirApp } from '../abrirApp'
import { esDemo } from '../edicion'
import { entrarDemo } from '../../demo/modo'
import { useTutorial } from './tutorialStore'

/** ¿La app es infraestructura? (sus flujos navegan el mapa, no abren cuartos). */
const esAppInfra = (plantillaId: string): boolean => {
  const p = getPlantilla(plantillaId)
  return !!p && esInfraestructura(p)
}

/** Tutorial de una app por id de plantilla (el genérico si no tiene propio). */
export function tutorialDeApp(plantillaId: string): TutorialDef | null {
  const p = getPlantilla(plantillaId)
  if (!p) return null
  return flujosDeApp(plantillaId)[0] ?? null
}

/**
 * Flujos de tutorial de una app: su menú `flujos` si lo tiene; si no, el tour
 * clásico (o el genérico, ya preparado para abrir la app). Migración gradual:
 * las apps sin flujos siguen igual.
 */
export function flujosDeApp(plantillaId: string): TutorialDef[] {
  const p = getPlantilla(plantillaId)
  if (!p) return []
  if (p.flujos) return p.flujos
  if (p.tutorial) return [p.tutorial]
  return [
    {
      ...tutorialAppGenerica,
      preparar: () => {
        abrirApp(plantillaId)
      },
    },
  ]
}

/**
 * Lanza un flujo de app. Los flujos NUEVOS (`flujos`) corren sobre el año de
 * Pep@: desde la casa real saltan a la casa demo con el tour como intent; los
 * tours clásicos (`tutorial`/genérico) siguen corriendo donde estás.
 * `montada`: la app ya está en pantalla — el tour no vuelve a abrir su cuarto.
 */
export function lanzarFlujo(
  plantillaId: string,
  def: TutorialDef,
  opts?: { montada?: boolean },
): void {
  const esFlujoNuevo = !!getPlantilla(plantillaId)?.flujos?.some((f) => f.id === def.id)
  if (esFlujoNuevo && !esDemo()) {
    entrarDemo({ app: plantillaId, tour: def.id })
    return
  }
  void useTutorial.getState().iniciar(opts?.montada ? { ...def, preparar: undefined } : def)
}

/** Corre el flujo del intent al aterrizar en el demo (la app ya está abierta). */
export async function lanzarFlujoEnDemo(plantillaId: string, tourId: string): Promise<void> {
  const def = flujosDeApp(plantillaId).find((f) => f.id === tourId)
  if (!def) return
  await useTutorial.getState().iniciar({
    ...def,
    // Las apps de cuarto ya están abiertas por el intent; la INFRA conserva su
    // `preparar` (no abre cuartos: navega el mapa o abre su editor jugable).
    ...(esAppInfra(plantillaId) ? {} : { preparar: undefined }),
    // El visitante vino desde su casa SOLO a este tour: al salir (complete o
    // no) se le ofrece volver. Import dinámico: src/demo no entra a este árbol.
    alTerminar: () => {
      void import('../../demo/VolverDemoDialog').then(({ useVolverDemo }) =>
        useVolverDemo.getState().abrir(),
      )
    },
  })
}

/** Tutorial de menú/HUD por id ('casa', 'editor-mapa', 'chat', …). */
export function tutorialMenuPorId(id: string): TutorialDef | undefined {
  return TUTORIALES_MENU.find((t) => t.id === id)
}
