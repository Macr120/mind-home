/**
 * Sesión de cuenta (Supabase): usuario, plan real y uso de IA del mes.
 *
 * Es la ÚNICA pieza que escribe el espejo síncrono `mh.planReal`/`mh.planExpira`
 * que lee `edicion.ts::esPro()`. Sin backend configurado (`hayBackend()` falso)
 * el store queda inerte y la app se comporta 100% local.
 */
import { create } from 'zustand'
import type { AuthError, User } from '@supabase/supabase-js'
import { hayBackend, obtenerSupabase } from './supabase'
import { esAppNativa, esEscritorio } from '../plataforma'
import { LS_FUE_PRO, LS_PLAN_EXPIRA, LS_PLAN_REAL, LS_UNLOCK, type Plan } from '../edicion'

/**
 * Traduce los errores de auth de Supabase a mensajes propios. Nunca se pinta
 * `error.message` crudo: llega en inglés y algunos («User already registered»)
 * permiten enumerar qué correos tienen cuenta.
 */
function mensajeAuth(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos.'
    case 'email_not_confirmed':
      return 'Confirma tu correo antes de entrar (revisa tu bandeja).'
    case 'user_already_exists':
    case 'email_exists':
      return 'No se pudo crear la cuenta con ese correo. Si ya tienes una, inicia sesión.'
    case 'weak_password':
      return 'La contraseña es demasiado débil: usa al menos 8 caracteres.'
    case 'same_password':
      return 'La contraseña nueva debe ser distinta de la actual.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.'
    case 'email_address_invalid':
      return 'Ese correo no parece válido.'
    default:
      return 'No se pudo completar la operación. Intenta de nuevo.'
  }
}

export type EstadoSync = 'inactivo' | 'sincronizando' | 'error'

/** Pool único de créditos de IA del mes (chat = 1 crédito, imagen = 10). */
export interface UsoIA {
  creditos: number
  limiteCreditos: number
}

/** Ancla de precio: 1 crédito ≈ $0.005 de gasto real (espejo del SQL). */
const USD_POR_CREDITO = 0.005

/**
 * Créditos que de verdad lleva consumidos el mes. El servidor cobra la DEUDA
 * del gasto real al empezar la llamada SIGUIENTE (migración 20260820000002),
 * así que la última puede no estar reflejada todavía en `uso_ia.creditos`;
 * derivarla del USD aquí evita que el medidor enseñe menos de lo que ya se
 * gastó. Cuando el gasto real es más barato que la tarifa —el caso normal— la
 * cuenta no cambia nada.
 */
function creditosEfectivos(creditos: number, usd: number): number {
  return Math.max(creditos, Math.ceil(usd / USD_POR_CREDITO))
}

interface SesionState {
  /** true mientras se hidrata la sesión guardada al arrancar. */
  cargando: boolean
  usuario: User | null
  plan: Plan
  planExpira: string | null
  /** ¿La cuenta pagó alguna vez? (decide el copy de los avisos de plan) */
  fuePro: boolean
  /** ¿Compró el pago único de la app? (perfiles.unlock, nunca se revierte) */
  unlock: boolean
  /** Nivel de la suscripción (1, 2 o 3): multiplica el pool mensual. */
  nivel: number
  /** Saldo suelto que quede de las recargas viejas (perfiles.creditos_extra). */
  creditosExtra: number
  usoIA: UsoIA | null
  estadoSync: EstadoSync
  ultimaSync: number | null
  errorSync: string | null
  /** Devuelven el mensaje de error, o null si todo bien. */
  registrar: (email: string, contrasena: string) => Promise<string | null>
  entrar: (email: string, contrasena: string) => Promise<string | null>
  entrarConProveedor: (proveedor: 'google' | 'apple') => Promise<string | null>
  salir: () => Promise<void>
  restablecer: (email: string) => Promise<string | null>
  cambiarContrasena: (nueva: string) => Promise<string | null>
  eliminarCuenta: () => Promise<string | null>
  /** Canjea un cupón de acceso (unlock + trial); devuelve el error o null. */
  canjearCupon: (codigo: string) => Promise<string | null>
  refrescarPerfil: () => Promise<void>
  refrescarUso: () => Promise<void>
}

/**
 * A dónde vuelve el navegador del sistema tras el login social fuera de la web.
 * Es un esquema propio (el applicationId, que nadie más puede reclamar) y lo
 * enruta el `intent-filter` de `MainActivity` en Android, el `CFBundleURLTypes`
 * en iOS y `app.setAsDefaultProtocolClient` en el escritorio. Tiene que estar
 * además en las Redirect URLs del panel de Supabase, o el proveedor se niega a
 * volver. Las tres plataformas comparten destino a propósito: una URL de alta
 * menos que mantener.
 */
const REDIRECT_NATIVO = 'com.macr120.mindhome://oauth'

function espejarPlan(plan: Plan, expira: string | null, fuePro: boolean, unlock: boolean): void {
  localStorage.setItem(LS_PLAN_REAL, plan)
  if (expira) localStorage.setItem(LS_PLAN_EXPIRA, expira)
  else localStorage.removeItem(LS_PLAN_EXPIRA)
  if (fuePro) localStorage.setItem(LS_FUE_PRO, '1')
  else localStorage.removeItem(LS_FUE_PRO)
  if (unlock) localStorage.setItem(LS_UNLOCK, '1')
  else localStorage.removeItem(LS_UNLOCK)
}

/**
 * Espejo síncrono de «esta instalación tiene sesión». No guarda nada del
 * usuario: solo el hecho, para que `haySesionProbable()` responda sin esperar a
 * que el SDK hidrate. Lo escribe el mismo sitio que pone `usuario` en el store.
 */
const LS_SESION = 'mh.sesion'

function espejarSesion(hay: boolean): void {
  if (hay) localStorage.setItem(LS_SESION, '1')
  else localStorage.removeItem(LS_SESION)
}

function limpiarEspejo(): void {
  localStorage.removeItem(LS_PLAN_REAL)
  localStorage.removeItem(LS_PLAN_EXPIRA)
  localStorage.removeItem(LS_FUE_PRO)
  // mh.unlock se limpia con la sesión; mh.unlockLocal (derechos adquiridos) NO:
  // es de la instalación, no de la cuenta.
  localStorage.removeItem(LS_UNLOCK)
}

export const useSesion = create<SesionState>((set, get) => ({
  cargando: true,
  usuario: null,
  plan: 'local',
  planExpira: null,
  fuePro: false,
  unlock: false,
  nivel: 1,
  creditosExtra: 0,
  usoIA: null,
  estadoSync: 'inactivo',
  ultimaSync: null,
  errorSync: null,

  registrar: async (email, contrasena) => {
    const sb = await obtenerSupabase()
    if (!sb) return 'Sin backend'
    // Espejo del mínimo configurado en el Dashboard: falla aquí, sin viaje.
    if (contrasena.length < 8) return 'La contraseña necesita al menos 8 caracteres.'
    const { error } = await sb.auth.signUp({ email, password: contrasena })
    return error ? mensajeAuth(error) : null
  },

  entrar: async (email, contrasena) => {
    const sb = await obtenerSupabase()
    if (!sb) return 'Sin backend'
    const { error } = await sb.auth.signInWithPassword({ email, password: contrasena })
    return error ? mensajeAuth(error) : null
  },

  entrarConProveedor: async (proveedor) => {
    const sb = await obtenerSupabase()
    if (!sb) return 'Sin backend'
    if (esAppNativa() || esEscritorio()) {
      // Google RECHAZA el login dentro de un WebView (`disallowed_useragent`),
      // y la ventana de Electron es tan ventana empotrada como la del teléfono:
      // en las dos se abre el navegador del sistema y se vuelve por deep link.
      // `skipBrowserRedirect` deja que seamos nosotros quienes abrimos la URL.
      const { data, error } = await sb.auth.signInWithOAuth({
        provider: proveedor,
        options: { redirectTo: REDIRECT_NATIVO, skipBrowserRedirect: true },
      })
      if (error) return mensajeAuth(error)
      if (!data.url) return 'Sin backend'
      if (esAppNativa()) {
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url: data.url })
      } else {
        // El shell no deja navegar fuera de `mph://app`: deniega la ventana y
        // manda la URL al navegador del sistema (`escritorio/principal.js`).
        window.open(data.url, '_blank', 'noopener')
      }
      return null
    }
    // Redirige al proveedor y vuelve a la MISMA página (la app o /cuenta de la
    // web): al aterrizar, el SDK detecta la sesión en la URL y onAuthStateChange
    // hace el resto. Si no hay error, la página está a punto de abandonarse.
    const { error } = await sb.auth.signInWithOAuth({
      provider: proveedor,
      options: { redirectTo: window.location.origin + window.location.pathname },
    })
    return error ? mensajeAuth(error) : null
  },

  salir: async () => {
    // onAuthStateChange (SIGNED_OUT) limpia estado y espejo.
    await (await obtenerSupabase())?.auth.signOut()
  },

  restablecer: async (email) => {
    const sb = await obtenerSupabase()
    if (!sb) return 'Sin backend'
    // El enlace del correo aterriza en la página /cuenta de la web pública.
    const base = (import.meta.env.VITE_URL_WEB as string | undefined) ?? window.location.origin
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${base}/cuenta`,
    })
    return error ? mensajeAuth(error) : null
  },

  cambiarContrasena: async (nueva) => {
    const sb = await obtenerSupabase()
    if (!sb) return 'Sin backend'
    if (nueva.length < 8) return 'La contraseña necesita al menos 8 caracteres.'
    const { error } = await sb.auth.updateUser({ password: nueva })
    return error ? mensajeAuth(error) : null
  },

  eliminarCuenta: async () => {
    const sb = await obtenerSupabase()
    if (!sb) return 'Sin backend'
    const { error } = await sb.functions.invoke('borrar-cuenta')
    if (error) return 'No se pudo borrar la cuenta. Intenta de nuevo.'
    // El usuario ya no existe en el servidor: basta cerrar la sesión local.
    await sb.auth.signOut({ scope: 'local' }).catch(() => {})
    return null
  },

  canjearCupon: async (codigo) => {
    const sb = await obtenerSupabase()
    if (!sb) return 'Sin backend'
    const { data, error } = await sb.functions.invoke<{ ok: boolean; resultado: string }>(
      'canjear-cupon',
      { body: { codigo } },
    )
    if (error || !data) return 'No se pudo canjear el cupón. Intenta de nuevo.'
    if (!data.ok) {
      return data.resultado === 'ya-canjeado'
        ? 'Este cupón ya se canjeó en esta cuenta.'
        : 'Ese cupón no existe o ya no está disponible.'
    }
    // El unlock (y el trial) ya están en el perfil: al refrescar el espejo, la
    // PuertaUnlock se abre sola.
    await get().refrescarPerfil()
    void get().refrescarUso()
    return null
  },

  refrescarPerfil: async () => {
    const usuario = get().usuario
    const sb = usuario ? await obtenerSupabase() : null
    if (!sb || !usuario) return
    const { data } = await sb
      .from('perfiles')
      .select('plan, plan_expira, fue_pro, creditos_extra, unlock, nivel')
      .eq('user_id', usuario.id)
      .maybeSingle()
    if (!data) return
    const plan: Plan = data.plan === 'pro' ? 'pro' : data.plan === 'trial' ? 'trial' : 'local'
    const expira = (data.plan_expira as string | null) ?? null
    const fuePro = data.fue_pro === true
    const unlock = data.unlock === true
    espejarPlan(plan, expira, fuePro, unlock)
    set({
      plan,
      planExpira: expira,
      fuePro,
      unlock,
      nivel: (data.nivel as number | null) ?? 1,
      creditosExtra: (data.creditos_extra as number | null) ?? 0,
    })
  },

  refrescarUso: async () => {
    const usuario = get().usuario
    const sb = usuario ? await obtenerSupabase() : null
    if (!sb || !usuario) return
    try {
      // Mismo criterio que el servidor: mes en UTC. El tope del medidor es el
      // del plan REAL por su nivel, igual que `pool_mensual()` en la BD: el
      // nivel solo multiplica con 'pro' (el trial se queda en el pool base).
      const periodo = new Date().toISOString().slice(0, 7)
      // Con el plan VENCIDO el pool del servidor es 0 (`pool_mensual()` filtra
      // por `plan_expira`), así que el medidor tiene que decir 0 y no el tope
      // del plan caducado: enseñar «48/700» a quien ya no tiene pool es la
      // forma más rápida de que un corte legítimo parezca un bug.
      const expira = get().planExpira
      const vigente = !expira || Date.parse(expira) > Date.now()
      const planActual = vigente ? get().plan : 'local'
      const multiplicador = planActual === 'pro' ? get().nivel : 1
      const [uso, limites] = await Promise.all([
        sb.from('uso_ia').select('creditos, usd').eq('periodo', periodo).maybeSingle(),
        sb.from('limites_plan').select('creditos_mes').eq('plan', planActual).maybeSingle(),
      ])
      if (!limites.data) {
        set({ usoIA: null })
        return
      }
      set({
        usoIA: {
          creditos: creditosEfectivos(uso.data?.creditos ?? 0, uso.data?.usd ?? 0),
          limiteCreditos: limites.data.creditos_mes * multiplicador,
        },
      })
    } catch {
      set({ usoIA: null })
    }
  },
}))

/**
 * ¿Esta instalación tiene sesión? (síncrono, para gates tipo `iaActiva`).
 *
 * Cuenta también la sesión que el store TODAVÍA no ha hidratado: el SDK de
 * Supabase se carga bajo demanda y `getSession()` puede ir a la red, así que
 * durante esos segundos `usuario` es null aunque el usuario lleve meses con la
 * sesión abierta. Sin el espejo `mh.sesion`, todo lo que dependa de esto (la
 * vía cuenta, el panel de IA) creía que estaba sin cuenta. En cuanto `cargando`
 * termina manda el estado real, así que un cierre de sesión no queda pegado.
 */
export function haySesionProbable(): boolean {
  const { usuario, cargando } = useSesion.getState()
  if (usuario) return true
  return cargando && localStorage.getItem(LS_SESION) === '1'
}

/**
 * Resuelve cuando la sesión ya está hidratada. Lo esperan las llamadas de IA
 * antes de decidir el transporte: sin esto, pedir algo en los primeros segundos
 * salía por BYOK (y sin claves, con el modal de «sin créditos») aunque la
 * cuenta tuviera el pool entero. El tope evita colgar la UI si el backend no
 * responde: al vencer se decide con lo que haya, que es el comportamiento viejo.
 */
export function esperarSesion(msTope = 6000): Promise<void> {
  if (!useSesion.getState().cargando) return Promise.resolve()
  return new Promise((resolver) => {
    const fin = () => {
      clearTimeout(reloj)
      quitar()
      resolver()
    }
    const reloj = setTimeout(fin, msTope)
    const quitar = useSesion.subscribe((s) => {
      if (!s.cargando) fin()
    })
  })
}

let iniciada = false

/** Hidrata la sesión al arrancar y engancha los cambios de auth. Idempotente. */
export function iniciarSesion(): void {
  if (iniciada) return
  iniciada = true

  // Migración one-shot del puente temporal pre-backend: elegir «local» en la
  // bienvenida dejaba mh.devIA='0', que hoy bloquearía la IA aunque se compre Pro.
  if (localStorage.getItem('mh.plan') === 'local' && localStorage.getItem('mh.devIA') === '0') {
    localStorage.removeItem('mh.devIA')
  }

  if (!hayBackend()) {
    // Sin backend no puede haber Pro ni sesión fantasma de otro build.
    limpiarEspejo()
    espejarSesion(false)
    useSesion.setState({ cargando: false })
    return
  }

  // El SDK se carga bajo demanda: la hidratación espera a que llegue.
  void obtenerSupabase().then((sb) => {
    if (!sb) {
      limpiarEspejo()
      useSesion.setState({ cargando: false })
      return
    }

    void sb.auth.getSession().then(({ data }) => {
      const usuario = data.session?.user ?? null
      espejarSesion(!!usuario)
      useSesion.setState({ usuario, cargando: false })
      if (usuario) {
        // En orden: el uso lee limites_plan por el plan que acaba de llegar.
        void useSesion
          .getState()
          .refrescarPerfil()
          .then(() => useSesion.getState().refrescarUso())
      } else {
        limpiarEspejo()
      }
    })

    sb.auth.onAuthStateChange((evento, sesion) => {
      const usuario = sesion?.user ?? null
      espejarSesion(!!usuario)
      useSesion.setState({ usuario })
      if (evento === 'SIGNED_OUT') {
        limpiarEspejo()
        useSesion.setState({
          plan: 'local',
          planExpira: null,
          fuePro: false,
          unlock: false,
          nivel: 1,
          creditosExtra: 0,
          usoIA: null,
        })
      } else if (usuario && (evento === 'SIGNED_IN' || evento === 'USER_UPDATED')) {
        void useSesion
          .getState()
          .refrescarPerfil()
          .then(() => useSesion.getState().refrescarUso())
      }
    })

    // Compró/canceló/recargó en la web y volvió a la app: refrescar el plan al
    // recuperar visibilidad, con throttle para no golpear el backend.
    let ultimoRefresco = 0
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return
      const s = useSesion.getState()
      if (!s.usuario || Date.now() - ultimoRefresco < 60_000) return
      ultimoRefresco = Date.now()
      void s.refrescarPerfil().then(() => useSesion.getState().refrescarUso())
    })
  })
}

/**
 * Cierra el círculo del login social fuera de la web: el navegador vuelve por
 * deep link con un `code` de PKCE y aquí se canjea por sesión (ni la app de
 * tienda ni el escritorio tienen una URL de página que el SDK pueda mirar por
 * su cuenta). Se llama UNA vez al arrancar; `onAuthStateChange` hace el resto,
 * igual que en la web.
 *
 * Quien avisa cambia según dónde estemos, y es lo ÚNICO que cambia: en el
 * teléfono el plugin `App` de Capacitor, y en el escritorio un evento del DOM
 * que emite el puente del shell (`escritorio/precarga.cjs`), para que esta capa
 * no tenga que saber que Electron existe.
 */
export async function escucharDeepLinkAuth(): Promise<void> {
  if (!hayBackend()) return

  if (esEscritorio()) {
    window.addEventListener('mph:enlace-profundo', (evento) => {
      const url = (evento as CustomEvent<string>).detail
      if (typeof url === 'string') void canjearCodigoDeepLink(url)
    })
    return
  }

  if (!esAppNativa()) return
  try {
    const { App } = await import('@capacitor/app')
    await App.addListener('appUrlOpen', ({ url }) => {
      void (async () => {
        if (!(await canjearCodigoDeepLink(url))) return
        // La pestaña del navegador se queda encima si no se cierra a mano. En
        // el escritorio no hay equivalente: la abrió el navegador del sistema.
        const { Browser } = await import('@capacitor/browser')
        await Browser.close().catch(() => {})
      })()
    })
  } catch (err) {
    console.warn('[MPH] No se pudo escuchar el deep link de login:', err)
  }
}

/** Canjea por sesión el `code` que trae la vuelta; false si la URL no era nuestra. */
async function canjearCodigoDeepLink(url: string): Promise<boolean> {
  if (!url.startsWith(REDIRECT_NATIVO)) return false
  // El code se saca a mano: `new URL()` no es de fiar con esquemas propios.
  const code = /[?&]code=([^&]+)/.exec(url)?.[1]
  const sb = await obtenerSupabase()
  if (code && sb) {
    const { error } = await sb.auth.exchangeCodeForSession(decodeURIComponent(code))
    if (error) console.warn('[MPH] El login social no se pudo completar:', error.message)
  }
  return true
}
