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
  /** Créditos de recargas aún sin consumir (perfiles.creditos_extra). */
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
  refrescarPerfil: () => Promise<void>
  refrescarUso: () => Promise<void>
}

function espejarPlan(plan: Plan, expira: string | null, fuePro: boolean, unlock: boolean): void {
  localStorage.setItem(LS_PLAN_REAL, plan)
  if (expira) localStorage.setItem(LS_PLAN_EXPIRA, expira)
  else localStorage.removeItem(LS_PLAN_EXPIRA)
  if (fuePro) localStorage.setItem(LS_FUE_PRO, '1')
  else localStorage.removeItem(LS_FUE_PRO)
  if (unlock) localStorage.setItem(LS_UNLOCK, '1')
  else localStorage.removeItem(LS_UNLOCK)
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

  refrescarPerfil: async () => {
    const usuario = get().usuario
    const sb = usuario ? await obtenerSupabase() : null
    if (!sb || !usuario) return
    const { data } = await sb
      .from('perfiles')
      .select('plan, plan_expira, fue_pro, creditos_extra, unlock')
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
      creditosExtra: (data.creditos_extra as number | null) ?? 0,
    })
  },

  refrescarUso: async () => {
    const usuario = get().usuario
    const sb = usuario ? await obtenerSupabase() : null
    if (!sb || !usuario) return
    try {
      // Mismo criterio que el servidor: mes en UTC. El tope del medidor es el
      // del plan REAL (pro y trial comparten 700; local marca 0).
      const periodo = new Date().toISOString().slice(0, 7)
      const planActual = get().plan
      const [uso, limites] = await Promise.all([
        sb.from('uso_ia').select('creditos').eq('periodo', periodo).maybeSingle(),
        sb.from('limites_plan').select('creditos_mes').eq('plan', planActual).maybeSingle(),
      ])
      if (!limites.data) {
        set({ usoIA: null })
        return
      }
      set({
        usoIA: {
          creditos: uso.data?.creditos ?? 0,
          limiteCreditos: limites.data.creditos_mes,
        },
      })
    } catch {
      set({ usoIA: null })
    }
  },
}))

/** ¿Hay sesión iniciada ahora mismo? (síncrono, para gates tipo `iaActiva`) */
export function haySesion(): boolean {
  return useSesion.getState().usuario !== null
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
    // Sin backend no puede haber Pro fantasma heredado de otro build.
    limpiarEspejo()
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
      useSesion.setState({ usuario })
      if (evento === 'SIGNED_OUT') {
        limpiarEspejo()
        useSesion.setState({
          plan: 'local',
          planExpira: null,
          fuePro: false,
          unlock: false,
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
