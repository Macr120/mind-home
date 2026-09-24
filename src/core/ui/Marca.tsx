import { useT } from '../i18n/useT'

/**
 * El rótulo de la marca, como en la web (`web/index.html`): «MindHaOS» siempre
 * arriba y debajo, pequeña, la traducción de cada idioma con «OS» al final
 * («Casa Mental OS», «Maison Mentale OS»…). En inglés no lleva subtítulo. Las
 * claves son las mismas de la web (`web/i18n/paginas/<id>.mjs`).
 */
export function Marca({ className }: { className?: string }) {
  const t = useT()
  const nombre = t('marca.nombre', 'MindHaOS')
  const sub = t('marca.sub', 'Casa Mental OS')
  return (
    <span className={className}>
      {nombre}
      {sub && sub !== nombre && (
        <small className="block text-[10px] font-semibold text-white/40">{sub}</small>
      )}
    </span>
  )
}
