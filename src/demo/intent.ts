/**
 * Ejecuta el intent pendiente al aterrizar en el demo (tour elegido desde la
 * casa real): espera a que la casa cargue, abre la app y lanza el flujo.
 */
import { abrirApp } from '../core/abrirApp'
import { esInfraestructura, getPlantilla } from '../core/registry'
import { useCuartos } from '../core/state/cuartosStore'
import { useDiseño } from '../core/state/disenoStore'
import { useLayout } from '../core/state/layoutStore'
import { construirAppDemo } from './construir'
import { tomarIntent } from './modo'

/** Espera (con tope) a que los stores de la casa terminen de hidratar. */
async function esperarCasa(timeoutMs = 8000): Promise<boolean> {
  const listo = () =>
    useCuartos.getState().cargado && useLayout.getState().cargado && useDiseño.getState().cargado
  const inicio = Date.now()
  while (!listo()) {
    if (Date.now() - inicio > timeoutMs) return false
    await new Promise((r) => setTimeout(r, 100))
  }
  return true
}

export async function ejecutarIntentDemo(): Promise<void> {
  const intent = tomarIntent()
  if (!intent) return
  if (!(await esperarCasa())) {
    // El intent ya se consumió: si esto pasa, el tour se pierde y nadie se
    // entera — que al menos quede el rastro para diagnosticarlo.
    console.warn('[demo] La casa no cargó a tiempo; el tour del intent se descarta:', intent)
    return
  }
  // Mismo margen que los deep links de main.tsx: la casa 3D tarda en montar.
  await new Promise((r) => setTimeout(r, 500))
  // Dos clases de tour no viven en un cuarto y `abrirApp` devolvería null,
  // abortando el intent: la infraestructura (su flujo navega el mapa o abre su
  // editor jugable) y los del núcleo, que no son una plantilla — el calendario
  // se abre desde el reloj, y de eso ya se encarga su `preparar`.
  const p = getPlantilla(intent.app)
  const enCuarto = !!p && !esInfraestructura(p)
  if (enCuarto && abrirApp(intent.app) == null) {
    console.warn('[demo] La app del intent no está en ningún cuarto; el tour se descarta:', intent.app)
    return
  }
  // El gate de la app ya está construyendo su año si hacía falta (al reentrar al
  // demo con otro tour, la casa ya existe pero esta app puede no tenerlo): es la
  // MISMA promesa, y sin esperarla el tour buscaría anclas todavía vacías.
  await construirAppDemo(intent.app)
  if (intent.tour) {
    // El registro resuelve el flujo y lo lanza sobre los datos de Pep@.
    const { lanzarFlujoEnDemo } = await import('../core/tutorial/registro')
    await lanzarFlujoEnDemo(intent.app, intent.tour)
  }
}
