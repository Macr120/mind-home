/**
 * Sesión de cuenta (Supabase): usuario, plan real y uso de IA del mes.
 *
 * Es la ÚNICA pieza que escribe el espejo síncrono `mh.planReal`/`mh.planExpira`
 * que lee `edicion.ts::esPro()`. Sin backend configurado (`supabase === null`)
 * el store queda inerte y la app se comporta 100% local.
 */
import { create } from 'zustand'
import type { AuthError, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { LS_FUE_PRO, LS_PLAN_EXPIRA, LS_PLAN_REAL, type Plan } from '../edicion'

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
  /** Créditos de recargas aún sin consumir (perfiles.creditos_extra). */
  creditosExtra: number
  usoIA: UsoIA | null
  estadoSync: EstadoSync
  ultimaSync: number | null
  errorSync: string | null
  /** Devuelven el mensaje de error, o null si todo bien. */
  registrar: (email: string, contrasena: string) => Promise<string | null>
  entrar: (email: string, contrasena: string) => Promise<string | null>
  salir: () => Promise<void>
  restablecer: (email: string) => Promise<string | null>
  cambiarContrasena: (nueva: string) => Promise<string | null>
  eliminarCuenta: () => Promise<string | null>
  refrescarPerfil: () => Promise<void>
  refrescarUso: () => Promise<void>
}

function espejarPlan(plan: Plan, expira: string | null, fuePro: boolean): void {
  localStorage.setItem(LS_PLAN_REAL, plan)
  if (expira) localStorage.setItem(LS_PLAN_EXPIRA, expira)
  else localStorage.removeItem(LS_PLAN_EXPIRA)
  if (fuePro) localStorage.setItem(LS_FUE_PRO, '1')
  else localStorage.removeItem(LS_FUE_PRO)
}

function limpiarEspejo(): void {
  localStorage.removeItem(LS_PLAN_REAL)
  localStorage.removeItem(LS_PLAN_EXPIRA)
  localStorage.removeItem(LS_FUE_PRO)
}

export const useSesion = create<SesionState>((set, get) => ({
  cargando: true,
  usuario: null,
  plan: 'local',
  planExpira: null,
  fuePro: false,
  creditosExtra: 0,
  usoIA: null,
  estadoSync: 'inactivo',
  ultimaSync: null,
  errorSync: null,

  registrar: async (email, contrasena) => {
    if (!supabase) return 'Sin backend'
    // Espejo del mínimo configurado en el Dashboard: falla aquí, sin viaje.
    if (contrasena.length < 8) return 'La contraseña necesita al menos 8 caracteres.'
    const { error } = await supabase.auth.signUp({ email, password: contrasena })
    return error ? mensajeAuth(error) : null
  },

  entrar: async (email, contrasena) => {
    if (!supabase) return 'Sin backend'
    const { error } = await supabase.auth.signInWithPassword({ email, password: contrasena })
    return error ? mensajeAuth(error) : null
  },

  salir: async () => {
    // onAuthStateChange (SIGNED_OUT) limpia estado y espejo.
    await supabase?.auth.signOut()
  },

  restablecer: async (email) => {
    if (!supabase) return 'Sin backend'
    // El enlace del correo aterriza en la página /cuenta de la web pública.
    const base = (import.meta.env.VITE_URL_WEB as string | undefined) ?? window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${base}/cuenta`,
    })
    return error ? mensajeAuth(error) : null
  },

  cambiarContrasena: async (nueva) => {
    if (!supabase) return 'Sin backend'
    if (nueva.length < 8) return 'La contraseña necesita al menos 8 caracteres.'
    const { error } = await supabase.auth.updateUser({ password: nueva })
    return error ? mensajeAuth(error) : null
  },

  eliminarCuenta: async () => {
    if (!supabase) return 'Sin backend'
    const { error } = await supabase.functions.invoke('borrar-cuenta')
    if (error) return 'No se pudo borrar la cuenta. Intenta de nuevo.'
    // El usuario ya no existe en el servidor: basta cerrar la sesión local.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    return null
  },

  refrescarPerfil: async () => {
    const usuario = get().usuario
    if (!supabase || !usuario) return
    const { data } = await supabase
      .from('perfiles')
      .select('plan, plan_expira, fue_pro, creditos_extra')
      .eq('user_id', usuario.id)
      .maybeSingle()
    if (!data) return
    const plan: Plan = data.plan === 'pro' ? 'pro' : 'local'
    const expira = (data.plan_expira as string | null) ?? null
    const fuePro = data.fue_pro === true
    espejarPlan(plan, expira, fuePro)
    set({ plan, planExpira: expira, fuePro, creditosExtra: (data.creditos_extra as number | null) ?? 0 })
  },

  refrescarUso: async () => {
    const usuario = get().usuario
    if (!supabase || !usuario) return
    try {
      // Mismo criterio que el servidor: mes en UTC.
      const periodo = new Date().toISOString().slice(0, 7)
      const [uso, limites] = await Promise.all([
        supabase.from('uso_ia').select('creditos').eq('periodo', periodo).maybeSingle(),
        supabase.from('limites_plan').select('creditos_mes').eq('plan', 'pro').maybeSingle(),
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

  if (!supabase) {
    // Sin backend no puede haber Pro fantasma heredado de otro build.
    limpiarEspejo()
    useSesion.setState({ cargando: false })
    return
  }

  void supabase.auth.getSession().then(({ data }) => {
    const usuario = data.session?.user ?? null
    useSesion.setState({ usuario, cargando: false })
    if (usuario) {
      void useSesion.getState().refrescarPerfil()
      void useSesion.getState().refrescarUso()
    } else {
      limpiarEspejo()
    }
  })

  supabase.auth.onAuthStateChange((evento, sesion) => {
    const usuario = sesion?.user ?? null
    useSesion.setState({ usuario })
    if (evento === 'SIGNED_OUT') {
      limpiarEspejo()
      useSesion.setState({ plan: 'local', planExpira: null, fuePro: false, creditosExtra: 0, usoIA: null })
    } else if (usuario && (evento === 'SIGNED_IN' || evento === 'USER_UPDATED')) {
      void useSesion.getState().refrescarPerfil()
      void useSesion.getState().refrescarUso()
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
    void s.refrescarPerfil()
    void s.refrescarUso()
  })
}
