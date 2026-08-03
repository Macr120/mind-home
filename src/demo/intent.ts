/**
 * Ejecuta el intent pendiente al aterrizar en el demo (tour elegido desde la
 * casa real): espera a que la casa cargue, abre la app y lanza el flujo.
 */
import { abrirApp } from '../core/abrirApp'
import { esInfraestructura, getPlantilla } from '../core/registry'
import { useCuartos } from '../core/state/cuartosStore'
import { useDiseño } from '../core/state/disenoStore'
import { useLayout } from '../core/state/layoutStore'
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
  if (!(await esperarCasa())) return
  // Mismo margen que los deep links de main.tsx: la casa 3D tarda en montar.
  await new Promise((r) => setTimeout(r, 500))
  // La infraestructura no vive en cuartos: su flujo navega el mapa o abre su
  // editor jugable desde `preparar` — abrirApp devolvería null y abortaría.
  const p = getPlantilla(intent.app)
  const esInfra = !!p && esInfraestructura(p)
  if (!esInfra) {
    const abierto = abrirApp(intent.app)
    if (abierto == null) return
  }
  if (intent.tour) {
    // El registro resuelve el flujo y lo lanza sobre los datos de Pep@.
    const { lanzarFlujoEnDemo } = await import('../core/tutorial/registro')
    await lanzarFlujoEnDemo(intent.app, intent.tour)
  }
}
