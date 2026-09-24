import { useT } from '../../../core/i18n/useT'
import { Icono } from '../../../core/ui/iconos/Icono'
import type { FaltaJev } from './jev'

/** Aviso cuando Jev no contesta; con fallo de red ofrece reintentar. */
export function AvisoJev({ falta, alReintentar }: { falta: FaltaJev; alReintentar: () => void }) {
  const t = useT()
  const texto =
    falta === 'sin-sesion'
      ? t('entre.j.jev.sinSesion', 'Inicia sesión para jugar con Jev.')
      : falta === 'sin-jev'
        ? t('entre.j.jev.sinJev', 'Jev todavía no está disponible en tu cuenta.')
        : t('entre.j.jev.error', 'Jev no respondió. Inténtalo de nuevo.')
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-500/15 p-3 text-sm text-amber-300">
      <Icono nombre="alerta" />
      <span className="flex-1">{texto}</span>
      {falta === 'error' && (
        <button type="button" onClick={alReintentar} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20">
          {t('entre.j.jev.reintentar', 'Reintentar')}
        </button>
      )}
    </div>
  )
}
