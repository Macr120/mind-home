import { useT } from '../i18n/useT'

/**
 * El rótulo de la marca, como en la web (`web/index.html`): «MindHaOS», el mismo
 * nombre en los dieciséis idiomas. Hasta el 17 sep 2026 era el nombre largo
 * traducido («Planificador Mental-Casa»…) con la sigla MPH debajo; el nombre
 * nuevo es una marca, no se traduce y no lleva sigla. La clave es la misma de
 * la web (`web/i18n/paginas/<id>.mjs`), para que la app y la página se llamen
 * igual.
 */
export function Marca({ className }: { className?: string }) {
  const t = useT()
  return <span className={className}>{t('marca.nombre', 'MindHaOS')}</span>
}
