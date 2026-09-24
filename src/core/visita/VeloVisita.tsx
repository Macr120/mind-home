import { useT } from '../i18n/useT'
import { Icono } from '../ui/iconos/Icono'
import { useVisita } from './visitaStore'

/**
 * Lo que se ve mientras baja y se vuelca el plano del anfitrión.
 *
 * Sustituye a la casa (no se superpone) a propósito: el `<Canvas>` montado antes
 * del volcado dejaría al invitado dentro de una casa vacía y con el personaje en
 * el punto de arranque del motor, en vez de en la entrada de la casa ajena. En
 * móvil son 3-5 s de recarga: sin esto sería una pantalla negra.
 */
export function VeloVisita() {
  const t = useT()
  const fase = useVisita((s) => s.fase)

  return (
    <div className="ui-app grid h-full w-full place-items-center px-6 text-center">
      <div className="space-y-3">
        <p className="animate-pulse text-5xl">
          <Icono nombre="casa" />
        </p>
        <p className="text-base font-semibold">{t('visita.velo.titulo', 'Entrando en la MindHaOS de tu contacto…')}</p>
        <p className="text-[11px] leading-relaxed text-white/40">
          {fase === 'aplicando'
            ? t('visita.velo.aplicando', 'Levantando la MindHaOS')
            : t('visita.velo.bajando', 'Bajando el plano de la casa')}
        </p>
      </div>
    </div>
  )
}
