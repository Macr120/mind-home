import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DemoGate } from './demo/DemoGate'
import { PuertaIdioma } from './core/ui/PuertaIdioma'
import { PuertaUnlock } from './core/ui/PuertaUnlock'
import { aplicarSpawnDemo } from './demo/spawn'
import { bindKeyboard } from './core/house/movement'
import { bindAtajosPersonaje } from './core/house/atajosTeclado'
import { escucharDeepLinkAuth, iniciarSesion } from './core/cuenta/sesionStore'
import { esDemo, esProbar, limpiarDerechosViejos } from './core/edicion'
import { conectarMotorSync } from './core/data/sync/motor'
import { abrirApp } from './core/abrirApp'
import { registrarActividad } from './core/rutinas'
import { iniciarAvisosNativos, type DestinoAviso } from './core/notificaciones'
// Publica las apps de código en el catálogo (`core/appContrato`) antes de que
// nada las consulte: quien lee el catálogo ya no importa el registro, así que
// esta es la importación que garantiza que se evalúe.
import './core/registry'
import { useWrappedUi } from './core/state/wrappedUiStore'
import { useMascaraUi } from './core/state/mascaraUiStore'
import type { TipoPeriodo } from './core/wrapped/periodo'

const esTipoWrapped = (v: string | null | undefined): v is TipoPeriodo =>
  v === 'semana' || v === 'mes' || v === 'anio'

// Una sola vez al cargar (evita desmontajes de StrictMode que sueltan las teclas).
bindKeyboard()
// Atajos del personaje: Espacio (saltar), Mayús (correr), 1/2 (manos).
bindAtajosPersonaje()

// Fuera el unlock de dispositivo que sellaban las versiones anteriores: la casa
// se abre con la compra (o un cupón) de la CUENTA, y nada más. Antes de
// `iniciarSesion()` y del render, porque la puerta lo mira en su primer pintado.
limpiarDerechosViejos()

// Cuenta (Supabase): hidrata la sesión y el espejo del plan; sin backend no hace nada.
iniciarSesion()

// Motor de sincronización multi-dispositivo: arranca/para siguiendo la sesión.
// En las casas demo y probar NUNCA: con sesión Pro haría pull de la nube real a
// la BD paralela y push de su contenido a la nube del usuario.
if (!esDemo() && !esProbar()) conectarMotorSync()

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
/** A dónde lleva tocar un aviso. Lo comparten el service worker y Android. */
function seguirAviso(d: DestinoAviso): void {
  if (d.accion === 'registrar' && d.rutinaId != null) {
    void registrarActividad(d.rutinaId)
  } else if (esTipoWrapped(d.wrapped)) {
    // Antes que plantillaId: el aviso del wrapped no lleva app.
    useWrappedUi.getState().abrir(d.wrapped)
  } else if (d.plantillaId) {
    // La casa tarda en montarse; sin esperar, `openRoom` se pierde en el vacío.
    setTimeout(() => abrirApp(d.plantillaId!, d.seccion), 500)
  }
}

if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.warn('[MPH] No se pudo registrar el service worker:', err)
  })
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.tipo !== 'abrir-app') return
    // El SW ya tiene la ventana delante: abre sin el margen de arranque.
    if (e.data.plantillaId && e.data.accion !== 'registrar' && !esTipoWrapped(e.data.wrapped)) {
      abrirApp(e.data.plantillaId, e.data.seccion)
      return
    }
    seguirAviso(e.data as DestinoAviso)
  })
}

// Android: el toque en la notificación del sistema entra por el plugin.
void iniciarAvisosNativos(seguirAviso)
// Y la vuelta del navegador tras el login con Google/Apple.
void escucharDeepLinkAuth()

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
} else if (params.get('mascara')) {
  // El QR del control remoto de la máscara: abre la Máscara AR conectándose
  // como controlador con ese código. Se limpia de la URL para que un reload
  // no reconecte a una sesión ya muerta.
  const codigo = params.get('mascara')!
  setTimeout(() => useMascaraUi.getState().abrir(codigo), 500)
  history.replaceState(null, '', location.pathname)
}

// Autoría del snapshot demo: window.mhExportarCasaDemo() solo en desarrollo.
if (import.meta.env.DEV) void import('./demo/exportarCasa')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* La puerta de la casa PROPIA, en dos pasos y en este orden: cuenta
        (siempre) y compra, que desde ago 2026 se hace DENTRO de la app en las
        tres plataformas, cada una por su caja. La demo sigue gratis y los
        builds sin backend ni las instalaciones previas no ven puerta. Lo
        cobrable (créditos, sync) lo revalida además el servidor. */}
    <DemoGate>
      {/* El idioma va ANTES que la puerta: lo primero que se pregunta, para que
          hasta la pantalla de cuenta se lea en el idioma del usuario. */}
      <PuertaIdioma>
        <PuertaUnlock>
          <App />
        </PuertaUnlock>
      </PuertaIdioma>
    </DemoGate>
  </StrictMode>,
)
