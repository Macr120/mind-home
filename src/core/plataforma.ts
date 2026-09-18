import { Capacitor } from '@capacitor/core'

/**
 * Override de PRUEBAS (solo `npm run dev`): finge la app de tienda dentro del
 * navegador para ver la puerta y los avisos como los verá Android.
 * `window.mhNativa(true)` y recargar. En producción el flag no hace nada a
 * propósito: fingirse nativo saltaría la compra en la web.
 */
const nativaForzada =
  import.meta.env.DEV &&
  typeof localStorage !== 'undefined' &&
  localStorage.getItem('mh.devNativa') === '1'

/** ¿Corriendo empaquetado como app nativa (Capacitor, Android/iOS)? Falso en cualquier navegador. */
export function esAppNativa(): boolean {
  return nativaForzada || Capacitor.isNativePlatform()
}

/** De qué tienda vino la instalación: 'android' | 'ios'; 'web' en el navegador. */
export function nombrePlataforma(): string {
  return nativaForzada ? 'android' : Capacitor.getPlatform()
}

// window.mhNativa(true) simula la app de tienda en dev; (false) vuelve a la web.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { mhNativa?: (on?: boolean) => void }).mhNativa = (on = true) => {
    localStorage.setItem('mh.devNativa', on ? '1' : '0')
    location.reload()
  }
}

/**
 * Marca que el shell de escritorio pone en su user agent (`app.userAgentFallback`
 * en Electron). Es lo que se busca, y NO la palabra «Electron» a secas: la
 * llevan también los editores que embeben un navegador —Cursor, VS Code, el
 * propio Claude Code—, y con ellos la app se creía instalada en el escritorio y
 * ofrecía pagar en la web en vez de por su caja.
 */
const MARCA_ESCRITORIO = 'MindPlannerHome'

/** ¿Corriendo dentro del shell de escritorio (Electron, Windows/macOS)? */
export function esEscritorio(): boolean {
  // Nunca dentro de la app de tienda: ahí manda la compra in-app, pase lo que
  // pase con el user agent (defensa en profundidad de la regla de más abajo).
  if (esAppNativa()) return false
  return typeof navigator !== 'undefined' && navigator.userAgent.includes(MARCA_ESCRITORIO)
}

/**
 * ¿Corriendo como fondo de pantalla (la ventana wallpaper del shell)? El shell
 * la lanza con `?fondo=1`: la app pinta SOLO la escena 3D (App.tsx) y monta el
 * puntero espacial. La ventana vive detrás de los iconos del escritorio y el
 * SO no le manda input; el shell le reenvía el mouse global (`sendInputEvent`).
 * Acotado a `esEscritorio()`: un `?fondo=1` en el navegador no debe dejar la
 * app sin UI.
 */
export function esModoFondo(): boolean {
  if (!esEscritorio()) return false
  return typeof location !== 'undefined' && new URLSearchParams(location.search).has('fondo')
}

/** Por qué caja cobra esta plataforma (ver `cuenta/paywall.ts`). */
export type CanalPago = 'web' | 'escritorio' | 'iap'

/**
 * Dónde se paga aquí. Se compra TODO —la casa, los créditos y la suscripción—
 * en las tres plataformas; lo que cambia es la caja:
 *
 * - `web`: checkout de RevenueCat dentro de la propia página. Directo, sin
 *   comisión de tienda.
 * - `escritorio`: mismo cobro directo, pero el checkout se abre en el navegador
 *   del sistema (Electron no es sitio para un formulario de pago).
 * - `iap`: compra in-app de Google Play o el App Store. Es obligatoria en las
 *   apps nativas (Apple 3.1.1 y Google Play Payments), y por eso es la única
 *   caja con comisión. En iOS, además, la app NO puede enlazar ni mencionar la
 *   compra de la web: quien vea `iap` no debe pintar enlaces de pago externos.
 *
 * El orden importa y es el que cumple las normas: **si es app nativa, `iap` y se
 * acabó**. Ninguna otra señal —user agent, dominio, flags— puede sacar a una app
 * de tienda de su caja, porque ahí es donde se incumpliría.
 */
export function canalPago(): CanalPago {
  if (esAppNativa()) return 'iap'
  return esEscritorio() ? 'escritorio' : 'web'
}

/**
 * El puente que expone el shell de escritorio (`electron/precarga.cjs`). Se tipa
 * aquí y se envuelve en funciones para que la UI no tenga que saber que Electron
 * existe: en el navegador y en el teléfono, `window.mph` simplemente no está.
 */
interface PuenteEscritorio {
  escritorio: true
  version: string | null
  clicsEnFondo?: boolean
  ponerDeFondo?: (pantalla?: string) => Promise<boolean>
  pantallas?: () => Promise<PantallaEscritorio[]>
  abrirEn?: (donde: string) => Promise<boolean>
  vistaFondo?: () => Promise<string | null>
  moverFondo?: (d: { fx?: number; fy?: number; zoom?: number }) => Promise<boolean>
  recursosSistema?: () => Promise<{ cpu: number; memUsadaGB: number; memTotalGB: number } | null>
  musicaSistema?: () => Promise<{ artista: string; titulo: string } | null>
  /** La voz del sistema como WAV en base64 (narración gratis del Studio de video); null si no pudo. */
  vozAArchivo?: (texto: string, voz: string, lang: string) => Promise<string | null>
  /** Navegador embebido de los enlaces web (fase 2); la barra la pinta la app. */
  navegador?: {
    /** Abre `url` en una pestaña nueva (o en `pestanaId`); resuelve el id de la pestaña (0 = no abrió). */
    abrir: (url: string, bounds: BoundsNavegador, opts?: { pestanaId?: number; fondo?: boolean }) => Promise<number>
    activar: (id: number) => Promise<boolean>
    cerrarPestana: (id: number) => Promise<void>
    /** Esconde o muestra la página activa sin cerrarla (un panel del chat encima). */
    visible: (v: boolean) => Promise<void>
    bounds: (b: BoundsNavegador) => Promise<void>
    atras: () => Promise<void>
    adelante: () => Promise<void>
    recargar: () => Promise<void>
    cerrar: () => Promise<void>
    configurar: (c: { inactivoSeg: number }) => Promise<void>
    /** Modo foco: sitios bloqueados hasta `hasta` (ms) y la página que se muestra en su lugar. */
    foco?: (d: { hosts: string[]; hasta: number | null; html: string }) => Promise<void>
    /** Cierra las sesiones de los sitios (cookies, almacenamiento y caché). */
    limpiarSesion?: () => Promise<void>
  }
  /** Programas del equipo asignados a objetos (solo el shell de Windows los expone). */
  programas?: {
    elegir: () => Promise<{ ruta: string; nombre: string } | null>
    abrir: (ruta: string) => Promise<boolean>
    icono: (ruta: string) => Promise<string | null>
  }
}

/** Rectángulo (px CSS de la ventana) donde el shell coloca la vista del navegador. */
export interface BoundsNavegador {
  x: number
  y: number
  width: number
  height: number
}

/**
 * ¿Este shell trae el navegador embebido con pestañas? (Nunca en el modo fondo
 * de pantalla.) Un shell anterior a la v2 (sin `activar`) se trata como si no
 * lo trajera: la app abre los enlaces en el navegador del sistema.
 */
export function hayNavegadorEscritorio(): boolean {
  return (
    esEscritorio() &&
    !esModoFondo() &&
    typeof window !== 'undefined' &&
    typeof window.mph?.navegador?.abrir === 'function' &&
    typeof window.mph?.navegador?.activar === 'function'
  )
}

/**
 * ¿Este shell sabe abrir programas del equipo? También en el modo fondo de
 * pantalla —al revés que el navegador embebido—: el fondo es justo quien los lanza.
 */
export function hayProgramasEscritorio(): boolean {
  return esEscritorio() && typeof window !== 'undefined' && typeof window.mph?.programas?.abrir === 'function'
}

/** El diálogo del sistema para elegir un programa; null si se canceló o no hay shell. */
export async function elegirPrograma(): Promise<{ ruta: string; nombre: string } | null> {
  try {
    return (await window.mph?.programas?.elegir()) ?? null
  } catch {
    return null
  }
}

/** Lanza el programa asignado a un objeto; false si el shell no pudo (o no existe). */
export async function abrirPrograma(ruta: string): Promise<boolean> {
  try {
    return (await window.mph?.programas?.abrir(ruta)) ?? false
  } catch {
    return false
  }
}

/** Icono del programa como data URL, o null. */
export async function iconoPrograma(ruta: string): Promise<string | null> {
  try {
    return (await window.mph?.programas?.icono(ruta)) ?? null
  } catch {
    return null
  }
}

/** Nombre legible de la ruta de un programa («notepad» de C:\…\notepad.exe). */
export function nombreDePrograma(ruta: string): string {
  return (ruta.split(/[\\/]/).pop() ?? ruta).replace(/\.[^.]+$/, '')
}

declare global {
  interface Window {
    mph?: PuenteEscritorio
  }
}

/** Un monitor del sistema. `id` es lo que espera `alternarFondoEscritorio`. */
export interface PantallaEscritorio {
  id: string
  nombre: string
  principal: boolean
  ancho: number
  alto: number
}

/** ¿Este shell sabe poner la casa de fondo de pantalla? */
export function hayFondoEscritorio(): boolean {
  return esEscritorio() && typeof window !== 'undefined' && typeof window.mph?.ponerDeFondo === 'function'
}

/**
 * Enciende o apaga el fondo de pantalla; devuelve si queda encendido.
 * `pantalla` es el id de un monitor, o 'todas' para que ocupe el escritorio
 * entero. El shell la recuerda, así que al arrancar en modo fondo sin decirle
 * nada vuelve a la última elegida.
 */
export async function alternarFondoEscritorio(pantalla?: string): Promise<boolean> {
  try {
    return (await window.mph?.ponerDeFondo?.(pantalla)) ?? false
  } catch {
    return false
  }
}

/**
 * Pide al shell que abra la ventana normal en un sitio de la app. Lo usan los
 * paneles del fondo de pantalla, que se pulsan pero no son la app: la ventana
 * puede estar cerrada, minimizada o detrás de todo.
 */
export async function abrirVentanaEn(donde: string): Promise<void> {
  try {
    await window.mph?.abrirEn?.(donde)
  } catch {
    /* sin shell no hay ventana que abrir */
  }
}

/** Los monitores conectados; lista vacía fuera del escritorio. */
export async function pantallasEscritorio(): Promise<PantallaEscritorio[]> {
  try {
    return (await window.mph?.pantallas?.()) ?? []
  } catch {
    return []
  }
}

/**
 * Foto de cómo se ve el fondo AHORA, para la vista previa. Es una captura de la
 * ventana real, no una simulación: lo que se ve aquí es lo que hay detrás.
 * Devuelve null si el fondo no está puesto.
 */
export async function vistaFondoEscritorio(): Promise<string | null> {
  try {
    return (await window.mph?.vistaFondo?.()) ?? null
  } catch {
    return null
  }
}

/** Mueve el encuadre del fondo: arrastre en fracción de pantalla (−1..1), o zoom. */
export async function moverFondoEscritorio(d: { fx?: number; fy?: number; zoom?: number }): Promise<void> {
  try {
    await window.mph?.moverFondo?.(d)
  } catch {
    /* el fondo no está puesto: no hay nada que mover */
  }
}

/**
 * En el fondo de pantalla, ¿el personaje debe SEGUIR al cursor en vez de
 * esperar un clic? Sí donde el shell no puede reenviar clics —macOS, donde la
 * ventana vive por debajo del escritorio—: sin esto el fondo se quedaría quieto
 * y el puntero sería un adorno. En Windows manda el clic, como en la app.
 */
export function elFondoSigueAlCursor(): boolean {
  return esModoFondo() && window.mph?.clicsEnFondo === false
}

/** CPU y memoria del sistema (los mide el shell); null fuera del escritorio. */
export async function recursosSistema(): Promise<{ cpu: number; memUsadaGB: number; memTotalGB: number } | null> {
  try {
    return (await window.mph?.recursosSistema?.()) ?? null
  } catch {
    return null
  }
}

/** Qué suena en el sistema (SMTC en Windows, Música o Spotify en macOS); null si nada. */
export async function musicaSistema(): Promise<{ artista: string; titulo: string } | null> {
  try {
    return (await window.mph?.musicaSistema?.()) ?? null
  } catch {
    return null
  }
}
