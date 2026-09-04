import { useT } from '../../../core/i18n/useT'
import { Icono } from '../../../core/ui/iconos/Icono'
import { acento } from '../../_shared/acento'
import { useMiniaturas } from './miniaturasStore'

/**
 * Conmutador Imagen | Animación de la esquina de los catálogos: decide qué
 * enseñan las miniaturas de toda la app de Ejercicio (`useMiniaturas`).
 */
export function SelectorMiniaturas({ color }: { color: string }) {
  const t = useT()
  const modo = useMiniaturas((s) => s.modo)
  const setModo = useMiniaturas((s) => s.setModo)
  return (
    <div
      className="ms-auto flex shrink-0 gap-0.5 rounded-lg bg-black/20 p-0.5"
      title={t('ejercicio.anim.modo', 'Qué muestran las miniaturas')}
    >
      {(['imagen', 'animacion'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setModo(m)}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition ${
            modo === m ? 'ui-accent-bg' : 'text-white/55 hover:bg-white/10'
          }`}
          style={modo === m ? acento(color) : undefined}
        >
          <Icono nombre={m === 'imagen' ? 'imagen' : 'persona'} />
          {m === 'imagen' ? t('ejercicio.anim.imagen', 'Imagen') : t('ejercicio.anim.pestana', 'Animación')}
        </button>
      ))}
    </div>
  )
}
