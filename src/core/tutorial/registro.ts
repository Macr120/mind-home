import type { TutorialDef } from './tipos'
import { TUTORIALES_MENU } from './menus'
import { FLUJOS_CALENDARIO } from './calendario'
import { FLUJOS_NUCLEO_NUEVOS } from './nucleo'
import { tutorialAppGenerica } from './appGenerica'
import { esInfraestructura, getPlantilla } from '../registry'
import { abrirApp } from '../abrirApp'
import { esDemo } from '../edicion'
import { entrarDemo } from '../../demo/modo'
import { useTutorial } from './tutorialStore'

/**
 * Tours del NÚCLEO: no son de ninguna app, pero corren sobre el año de Pep@ como
 * los de las apps (por eso no viven en `TUTORIALES_MENU`, que se lanza sobre la
 * casa real). La clave es la misma que usa su builder en `BUILDERS_DEMO`, así
 * que el salto a la casa demo con intent funciona sin nada especial.
 */
export const FLUJOS_NUCLEO: Record<string, TutorialDef[]> = {
  calendario: FLUJOS_CALENDARIO,
  ...FLUJOS_NUCLEO_NUEVOS,
}

/** ¿La app es infraestructura? (sus flujos navegan el mapa, no abren cuartos). */
const esAppInfra = (plantillaId: string): boolean => {
  const p = getPlantilla(plantillaId)
  return !!p && esInfraestructura(p)
}

/** Tutorial de una app por id de plantilla (el primero de sus flujos). */
export function tutorialDeApp(plantillaId: string): TutorialDef | null {
  const p = getPlantilla(plantillaId)
  if (!p && !FLUJOS_NUCLEO[plantillaId]) return null
  return flujosDeApp(plantillaId)[0] ?? null
}

/**
 * Flujos de tutorial de una app: su menú `flujos` si lo tiene; si no, el
 * genérico, ya preparado para abrir la app (es el caso de las plantillas
 * personalizadas, que no traen tours propios). Los tours del núcleo (el
 * calendario) responden por su clave aunque no sean una plantilla.
 */
export function flujosDeApp(plantillaId: string): TutorialDef[] {
  const p = getPlantilla(plantillaId)
  if (!p) return FLUJOS_NUCLEO[plantillaId] ?? []
  if (p.flujos) return p.flujos
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
 * Lanza un flujo de app. Los flujos declarados (`flujos`) corren sobre el año
 * de Pep@: desde la casa real saltan a la casa demo con el tour como intent; el
 * tutorial genérico sigue corriendo donde estás.
 * `montada`: la app ya está en pantalla — el tour no vuelve a abrir su cuarto.
 */
export function lanzarFlujo(
  plantillaId: string,
  def: TutorialDef,
  opts?: { montada?: boolean },
): void {
  const esFlujoNuevo =
    !!getPlantilla(plantillaId)?.flujos?.some((f) => f.id === def.id) ||
    !!FLUJOS_NUCLEO[plantillaId]?.some((f) => f.id === def.id)
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
    // `preparar` (no abre cuartos: navega el mapa o abre su editor jugable), y
    // los del núcleo también (nadie abre el calendario del reloj por ellos).
    ...(esAppInfra(plantillaId) || !getPlantilla(plantillaId) ? {} : { preparar: undefined }),
    // El visitante vino desde su casa SOLO a este tour: al salir (complete o
    // no) se le ofrece volver. Import dinámico: src/demo no entra a este árbol.
    alTerminar: () => {
      void import('../../demo/VolverDemoDialog').then(({ useVolverDemo }) =>
        useVolverDemo.getState().abrir(),
      )
    },
  })
}

/**
 * Tutorial de menú/HUD por id ('casa', 'editor-mapa', 'chat', …). Incluye los
 * del núcleo ('calendario', 'metas'): el chat y las zonas del selector los
 * buscan por id igual que a los demás.
 */
export function tutorialMenuPorId(id: string): TutorialDef | undefined {
  return (
    TUTORIALES_MENU.find((t) => t.id === id) ??
    Object.values(FLUJOS_NUCLEO)
      .flat()
      .find((t) => t.id === id)
  )
}

/** La clave de núcleo a la que pertenece un tour ('metas' → 'calendario'). */
export function claveNucleoDe(tourId: string): string | undefined {
  return Object.keys(FLUJOS_NUCLEO).find((k) => FLUJOS_NUCLEO[k].some((f) => f.id === tourId))
}
