import type { ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { tituloNodo, type NodoTema, type Temario } from './temarioVivo'

/** Un tema y, sangrados con «·», sus subtemas. */
function opciones(tema: NodoTema, prof: number): ReactNode[] {
  return [
    <option key={tema.id} value={tema.id}>
      {'· '.repeat(prof)}
      {tema.titulo}
    </option>,
    ...tema.hijos.flatMap((h) => opciones(h, prof + 1)),
  ]
}

/**
 * Opciones de un `<select>` de tema: el TEMARIO VIVO agrupado por nivel (lo de
 * fábrica ya renombrado, sin lo borrado, con tus áreas, niveles y temas propios
 * en su sitio y los subtemas sangrados). La comparten el form de tarjeta, el
 * panel ✨ y el bloque «Sin clasificar» del temario.
 */
export function OpcionesTemas({ tx }: { tx: Temario }) {
  const t = useT()
  return (
    <>
      {tx.areas.map((area) =>
        area.hijos
          .filter((nivel) => nivel.hijos.length > 0)
          .map((nivel) => (
            <optgroup
              key={nivel.id}
              label={`${nivel.nivel} · ${tituloNodo(area.id === 'temas' ? nivel : area, t)}`}
            >
              {nivel.hijos.flatMap((tema) => opciones(tema, 0))}
            </optgroup>
          )),
      )}
    </>
  )
}
