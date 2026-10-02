import { useAjustes } from '../../state/ajustesStore'
import { useT } from '../../i18n/useT'
import { IDIOMAS } from '../../i18n/idiomas'
import { monedaAutomatica, monedasElegibles } from '../../moneda'

/**
 * El idioma de la app, en su propia sección de Configuraciones. Estaba dentro de
 * «Interfaz», pero no es lo mismo elegir en qué idioma se lee que cómo se ve:
 * son dos cosas que se buscan por separado y se tocan en momentos distintos.
 */
export function EditorIdiomaSection() {
  const t = useT()
  const idioma = useAjustes((s) => s.idioma)
  const setIdioma = useAjustes((s) => s.setIdioma)
  // Banderas: excepción deliberada, se muestran igual en ambos estilos de iconos.
  const idiomas = IDIOMAS.map((i) => ({ ...i, label: t(i.clave, i.label) }))

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        {idiomas.map((it) => {
          const activo = idioma === it.id
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setIdioma(it.id)}
              className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                activo
                  ? 'ui-accent-bg border-transparent'
                  : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <span>{it.flag}</span>
              <span>{it.label}</span>
            </button>
          )
        })}
      </div>
      <SelectorMoneda />
    </div>
  )
}

/** La moneda de los importes (Finanzas, Garage, Cocina): automática por idioma y región, o una fija. */
function SelectorMoneda() {
  const t = useT()
  const moneda = useAjustes((s) => s.moneda)
  const setMoneda = useAjustes((s) => s.setMoneda)
  useAjustes((s) => s.idioma) // la automática y los nombres cambian con el idioma
  return (
    <div className="space-y-1 pt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {t('ajustes.moneda', 'Moneda')}
      </p>
      <select
        value={moneda}
        onChange={(e) => setMoneda(e.target.value)}
        className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white/80"
      >
        <option value="auto">{t('ajustes.moneda.auto', 'Automática ({moneda})', { moneda: monedaAutomatica() })}</option>
        {monedasElegibles().map((m) => (
          <option key={m.codigo} value={m.codigo}>
            {m.nombre} ({m.codigo})
          </option>
        ))}
      </select>
      <p className="text-[11px] leading-snug text-white/45">
        {t('ajustes.moneda.nota', 'Cambiarla no convierte los importes que ya guardaste.')}
      </p>
    </div>
  )
}
