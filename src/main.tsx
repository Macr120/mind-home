import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DemoGate } from './demo/DemoGate'
import { PuertaUnlock } from './core/ui/PuertaUnlock'
import { aplicarSpawnDemo } from './demo/spawn'
import { bindKeyboard } from './core/house/movement'
import { bindAtajosPersonaje } from './core/house/atajosTeclado'
import { iniciarSesion } from './core/cuenta/sesionStore'
import { esDemo } from './core/edicion'
import { conectarMotorSync } from './core/data/sync/motor'
import { abrirApp } from './core/abrirApp'
import { registrarActividad } from './core/rutinas'
// Publica las apps de código en el catálogo (`core/appContrato`) antes de que
// nada las consulte: quien lee el catálogo ya no importa el registro, así que
// esta es la importación que garantiza que se evalúe.
import './core/registry'
import { useWrappedUi } from './core/state/wrappedUiStore'
import type { TipoPeriodo } from './core/wrapped/periodo'

const esTipoWrapped = (v: string | null): v is TipoPeriodo =>
  v === 'semana' || v === 'mes' || v === 'anio'

// Una sola vez al cargar (evita desmontajes de StrictMode que sueltan las teclas).
bindKeyboard()
// Atajos del personaje: Espacio (saltar), Mayús (correr), 1/2 (manos).
bindAtajosPersonaje()

// Cuenta (Supabase): hidrata la sesión y el espejo del plan; sin backend no hace nada.
iniciarSesion()

// Motor de sincronización multi-dispositivo: arranca/para siguiendo la sesión.
// En la casa demo NUNCA: con sesión Pro haría pull de la nube real a la BD
// demo y push del contenido demo a la nube del usuario.
if (!esDemo()) conectarMotorSync()

// Casa demo: el mapa se recorta a las zonas elegidas, así que el punto fijo de
// aparición del motor caería en celdas distintas (incluso dentro de la casa).
// Se coloca ANTES del render: `Character` toma `playerPos` al montarse.
if (esDemo()) aplicarSpawnDemo()

// Pide al navegador marcar el almacenamiento como persistente: sin esto puede
// purgar IndexedDB (todos los datos del usuario) bajo presión de disco.
void navigator.storage?.persist?.()

// Un deploy nuevo invalida los chunks con hash viejo: recargar UNA sola vez
// (la marca evita el bucle si la recarga tampoco encuentra el chunk).
window.addEventListener('vite:preloadError', (e) => {
  if (sessionStorage.getItem('mh.reloadChunk')) return
  e.preventDefault()
  sessionStorage.setItem('mh.reloadChunk', '1')
  location.reload()
})
// Arranque sano: a los 10 s se libera la marca para futuros deploys.
setTimeout(() => sessionStorage.removeItem('mh.reloadChunk'), 10_000)

/**
 * Service worker: solo notificaciones, no cachea nada (ver public/sw.js). Tocar
 * una notificación llega aquí de dos formas: por `postMessage` si la ventana ya
 * existía, o por la query de la URL si el clic tuvo que abrirla. El botón
 * «Registrar» escribe el dato y se acabó; el resto abre el cuarto.
 */
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.warn('[MPH] No se pudo registrar el service worker:', err)
  })
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.tipo !== 'abrir-app') return
    if (e.data.accion === 'registrar' && e.data.rutinaId != null) {
      void registrarActividad(e.data.rutinaId)
    } else if (esTipoWrapped(e.data.wrapped)) {
      // Antes que plantillaId: el aviso del wrapped no lleva app.
      useWrappedUi.getState().abrir(e.data.wrapped)
    } else if (e.data.plantillaId) {
      abrirApp(e.data.plantillaId, e.data.seccion)
    }
  })
}

const params = new URLSearchParams(location.search)
const appPedida = params.get('app')
const rutinaPedida = params.get('rutina')
const wrappedPedido = params.get('wrapped')
if (params.get('accion') === 'registrar' && rutinaPedida) {
  // Registrar no espera a la casa: escribe en la base y ya.
  void registrarActividad(Number(rutinaPedida))
  history.replaceState(null, '', location.pathname)
} else if (esTipoWrapped(wrappedPedido)) {
  // Mismo margen que abrirApp: el overlay monta cuando la casa ya existe.
  setTimeout(() => useWrappedUi.getState().abrir(wrappedPedido), 500)
  history.replaceState(null, '', location.pathname)
} else if (appPedida) {
  // La casa tarda en montarse; sin esperar, `openRoom` se pierde en el vacío.
  setTimeout(() => abrirApp(appPedida, params.get('seccion') ?? undefined), 500)
  history.replaceState(null, '', location.pathname)
}

// Autoría del snapshot demo: window.mhExportarCasaDemo() solo en desarrollo.
if (import.meta.env.DEV) void import('./demo/exportarCasa')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* La puerta del pago único: la casa PROPIA exige el unlock ($6.99 con el
        primer mes de IA y sync incluido); la demo sigue gratis y los builds sin
        backend ni instalaciones previas no ven puerta (edicion.ts::tieneUnlock).
        Lo cobrable (créditos, sync) lo revalida además el servidor. */}
    <DemoGate>
      <PuertaUnlock>
        <App />
      </PuertaUnlock>
    </DemoGate>
  </StrictMode>,
)
