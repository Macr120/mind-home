import { useState } from 'react'
import { getProveedor, iaActiva } from '../../chat/ia'
import { usarViaCuenta } from '../../cuenta/api'
import { useT } from '../../i18n/useT'
import { PanelIA } from '../PanelIA'

/**
 * Activar la IA.
 *
 * Esto ya existía, pero escondido dentro del panel del chat: quien abría
 * Configuraciones buscando cómo encender la IA encontraba una tabla de precios y
 * se quedaba ahí. El panel en sí (`PanelIA`) es el MISMO componente que abre el
 * botón del chat: transporte créditos/BYOK + proveedor, cerebro, voz e imagen.
 */
export function ActivarIASection() {
  const t = useT()
  // El panel guarda en localStorage; este tick refresca el banner de estado.
  const [, setTick] = useState(0)

  const porCuenta = usarViaCuenta()
  const activa = iaActiva()

  return (
    <div data-tut="ia.activar" className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
        {t('ia.activar.titulo', 'Activar la IA')}
      </p>

      <p
        className={`rounded-md border px-2 py-1.5 text-[11px] leading-snug ${
          activa ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/25 bg-amber-400/10 text-amber-100'
        }`}
      >
        {porCuenta
          ? t('ia.activar.porCuenta', 'Activa con tu cuenta: cada cosa que pidas gasta créditos.')
          : activa
            ? t('ia.activar.porClave', 'Activa con tu clave de {prov}. No gasta créditos: te lo cobra {prov}.', {
                prov: getProveedor().nombre,
              })
            : t(
                'ia.activar.sinActivar',
                'La IA está apagada. Inicia sesión para usar créditos, o pega abajo la clave de un proveedor.',
              )}
      </p>

      <PanelIA variante="editor" onCambio={() => setTick((n) => n + 1)} />
    </div>
  )
}
