import { useT } from '../i18n/useT'

/**
 * El rótulo de la marca, como en la web (`web/index.html`): el nombre TRADUCIDO
 * y debajo, pequeña, la sigla MPH —igual en los dieciséis idiomas: el nombre
 * largo ya está arriba y repetirlo en inglés no decía nada—. Las dos claves son
 * las mismas de la web (`web/i18n/paginas/<id>.mjs`) y sus valores se copiaron
 * de allí, para que la app y la página se llamen igual en cada idioma.
 */
export function Marca({ className }: { className?: string }) {
  const t = useT()
  return (
    <span className={className}>
      {t('marca.nombre', 'Planificador Mental-Casa')}
      <small className="block text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {t('marca.sub', 'MPH')}
      </small>
    </span>
  )
}
