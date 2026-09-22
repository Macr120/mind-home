import { useT } from '../../i18n/useT'
import { Retrato } from '../../buzon/ui/Retrato'
import { Icono } from '../../ui/iconos/Icono'
import { useEspaciosStore } from '../espaciosStore'
import { espacioAbierto } from '../motor'

/**
 * Quién está mirando ESTO ahora mismo: los retratos de los miembros que han
 * dado señales de vida hace menos de dos minutos y medio. Se pinta junto al
 * título del editor de cada app compartida.
 */
export function ChipMiembros({ espacioId, onClick }: { espacioId: string; onClick?: () => void }) {
  const t = useT()
  const vivo = useEspaciosStore((s) => s.vivos[espacioId])
  const presentes = vivo?.presentes ?? []
  const miembros = espacioAbierto(espacioId)?.miembros() ?? []
  const aqui = miembros.filter((m) => !m.yo && presentes.includes(m.miembroId))

  return (
    <button
      type="button"
      onClick={onClick}
      title={t('esp.miembros.aqui', '{n} aquí ahora', { n: aqui.length })}
      className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 transition hover:border-accent/50 hover:text-white"
    >
      {aqui.length === 0 ? (
        <>
          <Icono nombre="companeros" />
          <span>{t('esp.miembros.solo', 'Solo tú')}</span>
        </>
      ) : (
        <>
          {aqui.slice(0, 3).map((m) => (
            <Retrato key={m.miembroId} retrato={m.retrato} emoji={m.emoji} className="h-5 w-5" textoClase="text-[11px]" />
          ))}
          {aqui.length > 3 && <span className="tabular-nums">+{aqui.length - 3}</span>}
        </>
      )}
    </button>
  )
}
