/**
 * Lo que la app Y la web de cuenta saben de la nube, sin traducciones ni
 * stores: formatos, GB por nivel, la fecha de purga y la lectura del medidor.
 * Hoja a propósito: `almacen.ts` arrastra `useT` (todos los diccionarios), que
 * la web ligera (`web/src/cuenta.tsx`) no puede cargar.
 */
import { obtenerSupabase } from './supabase'

/** GB de nube por nivel de Pro (igual que `cuota_almacen()` en SQL). El anual y el trial van como ×1. */
export const GB_POR_NIVEL: Record<number, number> = { 1: 10, 2: 30, 3: 100 }

/** Días de solo lectura antes de que `almacen-purga` borre la nube de quien se quedó sin plan. */
export const DIAS_PURGA = 90

export interface UsoAlmacen {
  usados: number
  /** Bytes; null = sin tope (cuenta ilimitada). */
  cuota: number | null
}

/** «1.2 GB», «350 MB»… */
export function formatoBytes(n: number): string {
  if (n < 1024) return `${n} B`
  const u = ['KB', 'MB', 'GB', 'TB']
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024
    i++
  }
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${u[i]}`
}

/** «1.3/10 GB» (misma unidad) o «350 MB/10 GB»: el medidor corto. */
export function formatoUso(usados: number, cuota: number): string {
  const [u, uu] = formatoBytes(usados).split(' ')
  const [c, cu] = formatoBytes(cuota).split(' ')
  return uu === cu ? `${u}/${c} ${cu}` : `${u} ${uu}/${c} ${cu}`
}

/**
 * Cuándo se borra la nube de una cuenta sin plan, o null si no aplica. El
 * trial vencido no pasa por el webhook: cuenta su `plan_expira`.
 */
export function fechaPurga(p: { plan: string; planExpira: string | null; sinPlanDesde: string | null }): Date | null {
  const desde = p.sinPlanDesde ?? (p.plan === 'trial' ? p.planExpira : null)
  if (!desde) return null
  const t = Date.parse(desde)
  return Number.isFinite(t) ? new Date(t + DIAS_PURGA * 86_400_000) : null
}

/** Lee `{usados, cuota}` de la Edge Function `almacen`; null sin sesión o sin red. */
export async function pedirUsoAlmacen(): Promise<UsoAlmacen | null> {
  const sb = await obtenerSupabase()
  if (!sb) return null
  const { data, error } = await sb.functions.invoke('almacen', { body: { accion: 'uso' } })
  if (error || !data?.ok) return null
  return { usados: Number(data.usados) || 0, cuota: data.cuota == null ? null : Number(data.cuota) }
}
