import { useState } from 'react'
import { IDIOMAS, prefijo } from '../i18n/idiomas.mjs'
import { IDIOMA, t } from './i18n'

/**
 * Los dos controles de la barra —idioma y luz— también en /cuenta. En las
 * páginas estáticas los escribe el generador (`scripts/web-i18n.mjs`); aquí,
 * que es React, hay que ponerlos a mano, pero comparten clases con ellos
 * (`.idiomas`, `.tema` de web/estilos.css) para que se vean idénticos.
 */

const LS_TEMA = 'mph.tema'

/** Cambiar de idioma es NAVEGAR: cada uno es una URL de verdad (/en/cuenta). */
export function SelectorIdioma() {
  const actual = IDIOMAS.find((i) => i.id === IDIOMA) ?? IDIOMAS[0]
  return (
    <details className="idiomas">
      <summary title="Language">
        <span>{actual.flag}</span>
        <span className="endonimo">{actual.endonimo}</span>
      </summary>
      <nav>
        {IDIOMAS.map((i) => (
          <a
            key={i.id}
            lang={i.id}
            href={`${prefijo(i.id)}/cuenta`}
            aria-current={i.id === IDIOMA ? true : undefined}
          >
            <span>{i.flag}</span>
            {i.endonimo}
          </a>
        ))}
      </nav>
    </details>
  )
}

/**
 * Claro ⇄ oscuro. El tema guardado ya lo aplicó el script en línea de
 * `cuenta.html` antes de pintar; aquí solo se alterna y se recuerda.
 */
export function BotonTema() {
  const [oscuro, setOscuro] = useState(
    () => document.documentElement.dataset.tema === 'oscuro',
  )

  const alternar = () => {
    const nuevo = !oscuro
    if (nuevo) document.documentElement.dataset.tema = 'oscuro'
    else delete document.documentElement.dataset.tema
    try {
      localStorage.setItem(LS_TEMA, nuevo ? 'oscuro' : 'claro')
    } catch {
      /* localStorage bloqueado: el tema vale para esta carga y ya */
    }
    setOscuro(nuevo)
  }

  const etiqueta = t('tema.boton', 'Modo claro u oscuro')
  return (
    <button type="button" className="tema ui-boton" onClick={alternar} title={etiqueta} aria-label={etiqueta}>
      {oscuro ? '☀️' : '🌙'}
    </button>
  )
}
