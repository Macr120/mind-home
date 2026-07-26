import type { TemaIdioma } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { AREAS } from './temario'

/**
 * Opciones de un `<select>` de tema: las tres áreas del temario agrupadas por
 * nivel más los nodos dinámicos del idioma. La comparten el form de tarjeta y
 * el panel ✨.
 */
export function OpcionesTemas({ nodos }: { nodos: TemaIdioma[] }) {
  const t = useT()
  return (
    <>
      {AREAS.map((area) =>
        area.catalogo.map((nivel) => (
          <optgroup
            key={`${area.id}-${nivel.nivel}`}
            label={`${nivel.nivel} · ${
              area.id === 'temas' ? nivel.titulo : t(`idiomas.area.${area.id}`, area.labelEs)
            }`}
          >
            {nivel.temas.map((tema) => (
              <option key={tema.id} value={tema.id}>
                {tema.titulo}
              </option>
            ))}
          </optgroup>
        )),
      )}
      {nodos.length > 0 && (
        <optgroup label={t('idiomas.form.temasDesbloq', 'Desbloqueados')}>
          {nodos.map((n) => (
            <option key={n.temaId} value={n.temaId}>
              {n.titulo}
            </option>
          ))}
        </optgroup>
      )}
    </>
  )
}
