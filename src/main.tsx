import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { bindKeyboard } from './core/house/movement'
import { iniciarSesion } from './core/cuenta/sesionStore'
import { conectarMotorSync } from './core/data/sync/motor'
import { abrirApp } from './core/abrirApp'
import { registrarActividad } from './core/rutinas'
import { useWrappedUi } from './core/state/wrappedUiStore'
import type { TipoPeriodo } from './core/wrapped/periodo'

const esTipoWrapped = (v: string | null): v is TipoPeriodo =>
  v === 'semana' || v === 'mes' || v === 'anio'

// Una sola vez al cargar (evita desmontajes de StrictMode que sueltan las teclas).
bindKeyboard()

// Cuenta (Supabase): hidrata la sesión y el espejo del plan; sin backend no hace nada.
iniciarSesion()

// Motor de sincronización multi-dispositivo: arranca/para siguiendo la sesión.
conectarMotorSync()

// Pide al navegador marcar el almacenamiento como persistente: sin esto puede
// purgar IndexedDB (todos los datos del usuario) bajo presión de disco.
void navigator.storage?.persist?.()

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
