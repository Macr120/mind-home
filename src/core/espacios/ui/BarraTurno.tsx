import { localeActual, useT } from '../../i18n/useT'
import { Icono } from '../../ui/iconos/Icono'
import { useEspacio } from '../cache'
import { useTurno } from '../turnos'

/**
 * El turno de edición en la cabecera de un editor por turnos (audio y video):
 * quién está editando, hasta cuándo, y el botón para tomarlo o soltarlo.
 *
 * A los LECTORES no se les pinta nada: no hay turno que tomar.
 */
export function BarraTurno({
  espacioId,
  antesDeSoltar,
}: {
  espacioId: string
  /** Se vacía lo pendiente ANTES de liberar (el siguiente en editar lo verá). */
  antesDeSoltar?: () => Promise<void>
}) {
  const t = useT()
  const rol = useEspacio(espacioId)?.rol
  const { tengoTurno, bloqueo, puedoTomar, tomar, soltar, error, ocupado } = useTurno(espacioId, { antesDeSoltar })

  if (rol === 'lector') return null

  const hora = (iso: string) =>
    new Date(iso).toLocaleTimeString(localeActual(), { hour: '2-digit', minute: '2-digit' })

  const boton = (etiqueta: string, onClick: () => void, deshabilitado: boolean) => (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado || ocupado}
      className="ui-boton shrink-0 rounded-lg border border-white/15 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-white/80 transition hover:border-accent/50 hover:text-white disabled:opacity-40"
    >
      {etiqueta}
    </button>
  )

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] ${
        tengoTurno ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/5 text-white/60'
      }`}
    >
      <Icono nombre="candado" />
      {tengoTurno ? (
        <>
          <span className="min-w-0 truncate">
            {t('esp.turno.tuyo', 'Estás editando · se libera a las {h}', { h: hora(bloqueo!.hasta) })}
          </span>
          {boton(t('esp.turno.soltar', 'Soltar'), () => void soltar(), false)}
        </>
      ) : bloqueo && !puedoTomar ? (
        <>
          <span className="min-w-0 truncate">
            {t('esp.turno.editando', 'Lo está editando @{a} hasta {h}', {
              a: bloqueo.alias || '…',
              h: hora(bloqueo.hasta),
            })}
          </span>
          {boton(t('esp.turno.tomarVencido', 'Tomar el turno'), () => void tomar(), true)}
        </>
      ) : (
        <>
          <span className="min-w-0 truncate">{t('esp.turno.sinTurno', 'Toma el turno para editar')}</span>
          {boton(
            bloqueo ? t('esp.turno.tomarVencido', 'Tomar el turno') : t('esp.turno.tomar', 'Editar'),
            () => void tomar(),
            false,
          )}
        </>
      )}
      {error && <span className="min-w-0 truncate text-red-400">{error}</span>}
    </div>
  )
}
