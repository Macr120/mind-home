import { useAjustes, type Realismo } from '../../state/ajustesStore'
import { esGamaBaja } from '../../gamaDispositivo'
import { useT } from '../../i18n/useT'

const OPCIONES: { id: keyof Realismo; clave: string; es: string; descClave: string; descEs: string }[] = [
  {
    id: 'pbrMuros',
    clave: 'ajustes.realismo.pbrMuros',
    es: 'Texturas realistas en muros',
    descClave: 'ajustes.realismo.pbrMuros.desc',
    descEs: 'Yeso, ladrillo, madera y piedra con relieve.',
  },
  {
    id: 'pbrMuebles',
    clave: 'ajustes.realismo.pbrMuebles',
    es: 'Texturas realistas en muebles',
    descClave: 'ajustes.realismo.pbrMuebles.desc',
    descEs: 'Madera, metal, tela y cuero en los muebles.',
  },
  {
    id: 'hdri',
    clave: 'ajustes.realismo.hdri',
    es: 'Iluminación de entorno real (HDRI)',
    descClave: 'ajustes.realismo.hdri.desc',
    descEs: 'Reflejos y luz ambiente fotográficos.',
  },
]

/**
 * Mejoras opcionales del motor 3D. Van por dispositivo (dependen de la tarjeta
 * gráfica) y nacen apagadas; en equipos de gama baja no se pueden encender.
 */
export function EditorRealismo() {
  const t = useT()
  const realismo = useAjustes((s) => s.realismo)
  const setRealismo = useAjustes((s) => s.setRealismo)
  const gamaBaja = esGamaBaja()

  return (
    <div className={`space-y-2 ${gamaBaja ? 'pointer-events-none opacity-40' : ''}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
        {t('ajustes.realismo', 'Realismo (opcional)')}
      </p>
      {OPCIONES.map((o) => {
        const on = realismo[o.id] && !gamaBaja
        return (
          <div key={o.id} className="flex items-start gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={t(o.clave, o.es)}
              onClick={() => setRealismo({ [o.id]: !realismo[o.id] })}
              className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition ${
                on ? 'ui-accent-bg justify-end' : 'justify-start bg-white/15'
              }`}
            >
              <span className="h-4 w-4 rounded-full bg-white shadow" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/75">{t(o.clave, o.es)}</p>
              <p className="text-[10px] leading-snug text-white/40">{t(o.descClave, o.descEs)}</p>
            </div>
          </div>
        )
      })}
      <p className="text-[11px] leading-snug text-white/45">
        {gamaBaja
          ? t('ajustes.realismo.gamaBaja', 'Este equipo no tiene potencia gráfica suficiente para estas mejoras.')
          : t('ajustes.realismo.desc', 'Solo en este dispositivo. Descargan texturas extra y piden más a la tarjeta gráfica.')}
      </p>
    </div>
  )
}
