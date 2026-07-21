import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'
import { CheckInAnimo } from './CheckInAnimo'
import { ANIMOS, COLOR } from './constantes'

/** Cierre de sesión: celebra los minutos sumados y pide el check-in de salida. */
export function FinSesion({
  minReales,
  animoAntes,
  onCerrar,
}: {
  minReales: number
  animoAntes?: number
  onCerrar: (animoDespues?: number) => void
}) {
  const t = useT()
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-6 space-y-5 text-center">
      <div>
        <p className="text-3xl"><Icono nombre="semilla" /></p>
        <p className="text-lg font-bold mt-1">{t('jardin.ses.completa', 'Sesión completa')}</p>
        <p className="text-sm font-semibold texto-vivo" style={vivo(COLOR)}>
          {t('jardin.ses.sumaste', `Sumaste ${minReales} min de calma`, { n: String(minReales) })}
        </p>
        {animoAntes && (
          <p className="text-xs text-white/45 mt-2">
            {t('jardin.ses.llegaste', 'Llegaste')} <Icono emoji={ANIMOS[animoAntes - 1]} />
          </p>
        )}
      </div>
      <CheckInAnimo pregunta={t('jardin.chk.despues', '¿Cómo te vas?')} onElegir={onCerrar} />
    </div>
  )
}
