/**
 * Sesión de cuenta (Supabase): usuario, plan real y uso de IA del mes.
 *
 * Es la ÚNICA pieza que escribe el espejo síncrono `mh.planReal`/`mh.planExpira`
 * que lee `edicion.ts::esPro()`. Sin backend configurado (`supabase === null`)
 * el store queda inerte y la app se comporta 100% local.
 */
import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { LS_PLAN_EXPIRA, LS_PLAN_REAL, type Plan } from '../edicion'

export type EstadoSync = 'inactivo' | 'sincronizando' | 'error'

export interface UsoIA {
  solicitudes: number
  imagenes: number
  limiteSolicitudes: number
  limiteImagenes: number
}

interface SesionState {
  /** true mientras se hidrata la sesión guardada al arrancar. */
  cargando: boolean
  usuario: User | null
  plan: Plan
  planExpira: string | null
  usoIA: UsoIA | null
  estadoSync: EstadoSync
  ultimaSync: number | null
  errorSync: string | null
  /** Devuelven el mensaje de error, o null si todo bien. */
  registrar: (email: string, contrasena: string) => Promise<string | null>
  entrar: (email: string, contrasena: string) => Promise<string | null>
  salir: () => Promise<void>
  refrescarPerfil: () => Promise<void>
  refrescarUso: () => Promise<void>
}

function espejarPlan(plan: Plan, expira: string | null): void {
  localStorage.setItem(LS_PLAN_REAL, plan)
  if (expira) localStorage.setItem(LS_PLAN_EXPIRA, expira)
  else localStorage.removeItem(LS_PLAN_EXPIRA)
}

function limpiarEspejo(): void {
  localStorage.removeItem(LS_PLAN_REAL)
  localStorage.removeItem(LS_PLAN_EXPIRA)
}

export const useSesion = create<SesionState>((set, get) => ({
  cargando: true,
  usuario: null,
  plan: 'local',
  planExpira: null,
  usoIA: null,
  estadoSync: 'inactivo',
  ultimaSync: null,
  errorSync: null,

  registrar: async (email, contrasena) => {
    if (!supabase) return 'Sin backend'
    const { error } = await supabase.auth.signUp({ email, password: contrasena })
    return error ? error.message : null
  },

  entrar: async (email, contrasena) => {
    if (!supabase) return 'Sin backend'
    const { error } = await supabase.auth.signInWithPassword({ email, password: contrasena })
    return error ? error.message : null
  },

  salir: async () => {
    // onAuthStateChange (SIGNED_OUT) limpia estado y espejo.
    await supabase?.auth.signOut()
  },

  refrescarPerfil: async () => {
    const usuario = get().usuario
    if (!supabase || !usuario) return
    const { data } = await supabase
      .from('perfiles')
      .select('plan, plan_expira')
      .eq('user_id', usuario.id)
      .maybeSingle()
    if (!data) return
    const plan: Plan = data.plan === 'pro' ? 'pro' : 'local'
    const expira = (data.plan_expira as string | null) ?? null
    espejarPlan(plan, expira)
    set({ plan, planExpira: expira })
  },

  refrescarUso: async () => {
    const usuario = get().usuario
    if (!supabase || !usuario) return
    try {
      // Mismo criterio que el servidor: mes en UTC.
      const periodo = new Date().toISOString().slice(0, 7)
      const [uso, limites] = await Promise.all([
        supabase.from('uso_ia').select('solicitudes, imagenes').eq('periodo', periodo).maybeSingle(),
        supabase.from('limites_plan').select('solicitudes_mes, imagenes_mes').eq('plan', 'pro').maybeSingle(),
      ])
      if (!limites.data) {
        set({ usoIA: null })
        return
      }
      set({
        usoIA: {
          solicitudes: uso.data?.solicitudes ?? 0,
          imagenes: uso.data?.imagenes ?? 0,
          limiteSolicitudes: limites.data.solicitudes_mes,
          limiteImagenes: limites.data.imagenes_mes,
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
      useSesion.setState({ plan: 'local', planExpira: null, usoIA: null })
    } else if (usuario && (evento === 'SIGNED_IN' || evento === 'USER_UPDATED')) {
      void useSesion.getState().refrescarPerfil()
      void useSesion.getState().refrescarUso()
    }
  })
}
