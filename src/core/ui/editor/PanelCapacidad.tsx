import { useCallback, useEffect, useState } from 'react'
import { useT } from '../../i18n/useT'
import { obtenerSupabase } from '../../cuenta/supabase'
import { useSesion } from '../../cuenta/sesionStore'

/** Respuesta de `capacidad_es_dueno` por uid: se pregunta una vez por sesión. */
const duenos = new Map<string, boolean>()

/** ¿La sesión es la del dueño? Decide si Configuraciones pinta «Capacidad y usuarios». */
export function useEsDueno(): boolean {
  const uid = useSesion((s) => s.usuario?.id ?? null)
  const [, setVersion] = useState(0)
  useEffect(() => {
    if (!uid || duenos.has(uid)) return
    let vivo = true
    void (async () => {
      const sb = await obtenerSupabase()
      if (!sb) return
      const { data } = await sb.rpc('capacidad_es_dueno')
      duenos.set(uid, data === true)
      if (vivo) setVersion((v) => v + 1)
    })()
    return () => {
      vivo = false
    }
  }, [uid])
  return uid ? duenos.get(uid) === true : false
}

/**
 * Panel del dueño (solo su cuenta): usuarios, base, almacenamiento y
 * servidor en semáforo, con la acción que toca en cada umbral y el estado de la
 * subida automática de compute (migración 20260928000002, función `capacidad`).
 */

type Color = 'verde' | 'amarillo' | 'rojo' | 'gris'

interface FilaSemaforo {
  metrica: string
  valor: number | null
  amarillo: number
  rojo: number
  color: Color
  accion: string
}

interface DatosPanel {
  estado: {
    plan: 'free' | 'pro'
    subida_pendiente: string | null
    subida_desde: string | null
    subida_cancelada: boolean
    ultima_subida: string | null
  }
  semaforo: FilaSemaforo[]
  series: Record<string, [string, number][]>
}

const PUNTO: Record<Color, string> = {
  verde: 'bg-emerald-400',
  amarillo: 'bg-amber-300',
  rojo: 'bg-red-400',
  gris: 'bg-white/25',
}

/** Métricas que solo informan (sin umbral). */
const INFORMATIVAS = ['cuentas', 'cuentas_pago', 'cuentas_pro', 'activos_dia', 'activos_30d', 'r2_gb', 'partidas_dia', 'mensajes_dia', 'ia_dia']

const REF = new URL((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://x.supabase.co').hostname.split('.')[0]

function Linea({ puntos }: { puntos?: [string, number][] }) {
  if (!puntos || puntos.length < 2) return null
  const vals = puntos.map((p) => Number(p[1]))
  const max = Math.max(...vals) || 1
  const d = vals.map((v, i) => `${(i / (vals.length - 1)) * 60},${16 - (v / max) * 14}`).join(' ')
  return (
    <svg viewBox="0 0 60 17" className="h-4 w-14 shrink-0" aria-hidden>
      <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.2" className="text-accent" />
    </svg>
  )
}

export function PanelCapacidad() {
  const t = useT()
  const [datos, setDatos] = useState<DatosPanel | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const sb = await obtenerSupabase()
    if (!sb) return
    const { data, error: e } = await sb.rpc('capacidad_panel')
    if (e) setError(e.message)
    else setDatos(data as DatosPanel)
  }, [])

  useEffect(() => {
    let vivo = true
    void (async () => {
      const sb = await obtenerSupabase()
      if (!sb || !vivo) return
      const { data, error: e } = await sb.rpc('capacidad_panel')
      if (!vivo) return
      if (e) setError(e.message)
      else setDatos(data as DatosPanel)
    })()
    return () => {
      vivo = false
    }
  }, [])

  const llamar = async (rpc: string, args?: Record<string, unknown>) => {
    const sb = await obtenerSupabase()
    if (!sb) return
    const { error: e } = await sb.rpc(rpc, args)
    if (e) setError(e.message)
    await cargar()
  }

  const NOMBRES: Record<string, string> = {
    activos_hora_max: t('cap.m.activosHora', 'Activos a la vez (hora pico)'),
    bd_mb: t('cap.m.bd', 'Base de datos (MB)'),
    storage_mb: t('cap.m.storage', 'Storage de Supabase (MB)'),
    cpu_pct: t('cap.m.cpu', 'CPU (% hora más cargada)'),
    ram_pct: t('cap.m.ram', 'RAM (% máxima)'),
    cuentas: t('cap.m.cuentas', 'Cuentas'),
    cuentas_pago: t('cap.m.cuentasPago', 'Con compra'),
    cuentas_pro: t('cap.m.cuentasPro', 'Pro'),
    activos_dia: t('cap.m.activosDia', 'Activos hoy'),
    activos_30d: t('cap.m.activos30', 'Activos 30 días'),
    r2_gb: t('cap.m.r2', 'Nube R2 (GB)'),
    partidas_dia: t('cap.m.partidas', 'Partidas hoy'),
    mensajes_dia: t('cap.m.mensajes', 'Mensajes hoy'),
    ia_dia: t('cap.m.ia', 'Llamadas IA hoy'),
  }
  const ACCIONES: Record<string, string> = {
    'contratar-pro': t('cap.accion.pro', 'Contrata Supabase Pro ($25/mes) y cambia este panel a «Pro».'),
    'realtime-extra': t('cap.accion.realtime', 'Pasar de 500 conexiones se cobra solo (≈$10 por cada 1.000 extra).'),
    retencion: t('cap.accion.retencion', 'Revisa la retención de datos antes de llegar a 8 GB.'),
    'medios-r2': t('cap.accion.r2', 'Adelanta la mudanza de los medios del buzón y los espacios a R2.'),
    'subir-compute': t('cap.accion.compute', 'Sube el compute un escalón (se hace solo si se sostiene 3 días).'),
  }
  const nombre = (m: string) => NOMBRES[m] ?? m
  const ultimo = (m: string) => {
    const s = datos?.series[m]
    return s?.length ? Number(s[s.length - 1][1]) : null
  }

  return (
    <div className="space-y-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('cap.titulo', 'Capacidad (solo tú la ves)')}
        </p>
        {datos && (
          <div className="flex overflow-hidden rounded-full border border-white/10 text-[10px]">
            {(['free', 'pro'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => void llamar('capacidad_fijar_plan', { p_plan: p })}
                className={`px-2 py-0.5 font-semibold ${datos.estado.plan === p ? 'ui-accent-bg' : 'text-white/50 hover:bg-white/10'}`}
              >
                {p === 'free' ? 'Free' : 'Pro'}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-[10px] text-red-400/90">{error}</p>}
      {!datos && !error && <p className="text-[11px] text-white/40">{t('cap.cargando', 'Midiendo…')}</p>}

      {datos && (
        <>
          <ul className="space-y-1">
            {datos.semaforo.map((s) => (
              <li key={s.metrica} className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${PUNTO[s.color]}`} />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-white/70">{nombre(s.metrica)}</span>
                  <Linea puntos={datos.series[s.metrica]} />
                  <span className="w-20 shrink-0 text-right text-[10px] tabular-nums text-white/45">
                    {s.valor ?? '—'} / {s.rojo}
                  </span>
                </div>
                {(s.color === 'amarillo' || s.color === 'rojo') && (
                  <p className="pl-4 text-[10px] leading-snug text-amber-300/85">{ACCIONES[s.accion] ?? s.accion}</p>
                )}
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-3 gap-1">
            {INFORMATIVAS.map((m) => (
              <div key={m} className="rounded bg-white/5 px-1.5 py-1">
                <p className="text-[12px] font-semibold tabular-nums text-white/80">{ultimo(m) ?? '—'}</p>
                <p className="truncate text-[9px] text-white/40">{nombre(m)}</p>
              </div>
            ))}
          </div>

          {datos.estado.plan === 'pro' && (
            <div className="space-y-1 text-[10px] leading-snug text-white/50">
              {datos.estado.subida_pendiente ? (
                <>
                  <p className="text-amber-300/90">
                    {t('cap.subida.pendiente', 'Subida de compute programada a {v} (en 24 h, entre 09 y 10 UTC).', {
                      v: datos.estado.subida_pendiente,
                    })}
                  </p>
                  {!datos.estado.subida_cancelada && (
                    <button
                      type="button"
                      onClick={() => void llamar('capacidad_cancelar_subida')}
                      className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10"
                    >
                      {t('cap.subida.cancelar', 'Cancelar la subida')}
                    </button>
                  )}
                </>
              ) : (
                <p>
                  {datos.estado.ultima_subida
                    ? t('cap.subida.ultima', 'Última subida automática: {f}.', {
                        f: new Date(datos.estado.ultima_subida).toLocaleDateString(),
                      })
                    : t('cap.subida.nunca', 'Subida automática de compute activa: solo actúa con CPU o RAM en rojo 3 días.')}
                </p>
              )}
            </div>
          )}

          <p className="text-[10px] leading-snug text-white/35">
            {t('cap.fuera', 'Mensajes Realtime y tráfico de salida no se ven desde la base:')}{' '}
            <a
              href={`https://supabase.com/dashboard/project/${REF}/usage`}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-white/60"
            >
              Supabase
            </a>
            {' · '}
            <a href="https://dash.cloudflare.com/" target="_blank" rel="noreferrer" className="underline hover:text-white/60">
              {t('cap.web', 'visitas de la web (Cloudflare)')}
            </a>
          </p>
        </>
      )}
    </div>
  )
}
