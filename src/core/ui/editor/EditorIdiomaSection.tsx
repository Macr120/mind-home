import { useAjustes } from '../../state/ajustesStore'
import { useT } from '../../i18n/useT'
import { IDIOMAS } from '../../i18n/idiomas'

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
    </div>
  )
}
