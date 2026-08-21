import { useState } from 'react'
import { permisoNotificaciones, pedirPermiso } from '../../notificaciones'
import { esAppNativa } from '../../plataforma'
import { plantillasAgendables } from '../../registry'
import { useAjustes } from '../../state/ajustesStore'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

/** Interruptor de una línea (el patrón de toggle de esta pestaña). */
function Fila({
  label,
  activo,
  onToggle,
  children,
}: {
  label: string
  activo: boolean
  onToggle: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-md border px-2 py-1.5 text-start text-xs font-semibold transition ${
          activo
            ? 'ui-accent-bg border-transparent'
            : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
        }`}
      >
        <span className="shrink-0 text-[11px]">{activo ? '✓' : '○'}</span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </button>
      {children}
    </div>
  )
}

/**
 * Sección de Configuraciones: qué avisa y qué no. El interruptor general es el
 * que pide permiso al navegador — tiene que salir de un clic del usuario, porque
 * `requestPermission()` disparado desde un timer se ignora.
 */
export function EditorNotificacionesSection({
  embed,
  sinTitulo,
}: { embed?: boolean; sinTitulo?: boolean } = {}) {
  const t = useT()
  const notif = useAjustes((s) => s.notif)
  const setNotif = useAjustes((s) => s.setNotif)
  const notifRutinas = useAjustes((s) => s.notifRutinas)
  const setNotifRutinas = useAjustes((s) => s.setNotifRutinas)
  const notifMetas = useAjustes((s) => s.notifMetas)
  const setNotifMetas = useAjustes((s) => s.setNotifMetas)
  const horaMetas = useAjustes((s) => s.notifHoraMetas)
  const setHoraMetas = useAjustes((s) => s.setNotifHoraMetas)
  const notifApps = useAjustes((s) => s.notifApps)
  const setNotifApp = useAjustes((s) => s.setNotifApp)
  const notifWrapped = useAjustes((s) => s.notifWrapped)
  const setNotifWrapped = useAjustes((s) => s.setNotifWrapped)
  const [permiso, setPermiso] = useState(permisoNotificaciones)

  const encender = async () => {
    if (notif) {
      setNotif(false)
      return
    }
    const ok = await pedirPermiso()
    setPermiso(permisoNotificaciones())
    // Sin permiso los avisos siguen llegando por la mascota, así que se encienden igual.
    setNotif(true)
    if (!ok) return
  }

  return (
    <div className={embed ? 'space-y-4' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-4'}>
      {!sinTitulo && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('notif.titulo', 'Notificaciones')}
        </p>
      )}

      <div className="space-y-1.5">
        <Fila
          label={t('notif.general', 'Avisarme')}
          activo={notif}
          onToggle={() => void encender()}
        />
        {notif && permiso === 'denied' && (
          <p className="text-[10px] leading-snug text-amber-300/80">
            {esAppNativa()
              ? t(
                  'notif.denegadoApp',
                  'Los avisos están bloqueados para la app: enciéndelos en los ajustes de notificaciones de tu teléfono. Mientras tanto, te llegan por tu asistente.',
                )
              : t(
                  'notif.denegado',
                  'El navegador tiene bloqueadas las notificaciones de este sitio: solo puedes desbloquearlas desde su candado. Mientras tanto, los avisos te llegan por tu asistente.',
                )}
          </p>
        )}
        {notif && permiso === 'no-soportado' && (
          <p className="text-[10px] leading-snug text-white/40">
            {t('notif.noSoportado', 'Este navegador no tiene notificaciones; los avisos te llegan por tu asistente.')}
          </p>
        )}
      </div>

      {notif && (
        <>
          <div className="space-y-1.5">
            <Fila
              label={t('notif.rutinas', 'Eventos y rutinas con hora')}
              activo={notifRutinas}
              onToggle={() => setNotifRutinas(!notifRutinas)}
            />
            <Fila
              label={t('notif.metas', 'Metas del día sin cumplir')}
              activo={notifMetas}
              onToggle={() => setNotifMetas(!notifMetas)}
            >
              <input
                type="time"
                step={900}
                value={horaMetas}
                disabled={!notifMetas}
                onChange={(e) => setHoraMetas(e.target.value)}
                className="w-24 shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 focus:outline-none disabled:opacity-30"
              />
            </Fila>
            <Fila
              label={t('notif.wrapped', 'Resumen del periodo (Wrapped)')}
              activo={notifWrapped}
              onToggle={() => setNotifWrapped(!notifWrapped)}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
              {t('notif.porApp', 'Por app')}
            </p>
            {plantillasAgendables().map((p) => (
              <Fila
                key={p.id}
                label={t(`room.${p.id}.nombre`, p.nombre).split(' · ')[0]}
                activo={notifApps[p.id] !== false}
                onToggle={() => setNotifApp(p.id, notifApps[p.id] === false)}
              >
                <span className="w-6 shrink-0 text-center text-sm">
                  <Icono emoji={p.icon} />
                </span>
              </Fila>
            ))}
          </div>

          <p className="text-[10px] leading-snug text-white/35">
            {t(
              'notif.ayudaCerrada',
              'Los avisos llegan con la app abierta, aunque esté en segundo plano. Con la pestaña cerrada el navegador no puede despertarla: para eso hace falta la app instalada en el móvil.',
            )}
          </p>
        </>
      )}
    </div>
  )
}
