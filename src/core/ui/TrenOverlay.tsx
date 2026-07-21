import { useTren } from '../state/trenStore'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { useMontura } from '../state/monturaStore'
import { useParque } from '../state/parqueStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * Prompt 2D del tren/carrito: "Montar" al estar junto a una vía y "Bajarte"
 * durante el recorrido. Mismo patrón que `VehiculoOverlay` (botón abajo-centro);
 * se apila un renglón arriba para no chocar con el de los vehículos.
 */
export function TrenOverlay() {
  const t = useT()
  const montado = useTren((s) => s.montado)
  const tipo = useTren((s) => s.tipo)
  const cerca = useTren((s) => s.cerca)
  const montar = useTren((s) => s.montar)
  const bajar = useTren((s) => s.bajar)
  const activeRoom = useHouse((s) => s.activeRoom)
  const editMode = useLayout((s) => s.editMode)
  const enVehiculo = useMontura((s) => s.instanciaId != null)
  const usandoJuego = useParque((s) => s.instanciaId)

  if (activeRoom || editMode || enVehiculo || usandoJuego != null) return null

  if (montado && tipo) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-28 z-30 flex justify-center">
        <button
          type="button"
          onClick={bajar}
          className="ui-panel-glass pointer-events-auto flex items-center gap-2 rounded-full border-2 border-amber-400/60 px-5 py-2.5 text-sm font-black text-amber-400 shadow-xl backdrop-blur-md transition hover:scale-105 active:scale-95"
        >
          <Icono nombre={tipo === 'riel' ? 'riel' : 'montana-rusa'} />
          {t('tren.bajarte', 'Bajarte')}
        </button>
      </div>
    )
  }

  if (!cerca) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-44 z-30 flex justify-center">
      <button
        type="button"
        onClick={montar}
        className="ui-panel-glass pointer-events-auto flex items-center gap-2 rounded-full border-2 border-amber-400/60 px-5 py-2.5 text-sm font-black text-amber-400 shadow-xl backdrop-blur-md transition hover:scale-105 active:scale-95"
      >
        <Icono nombre={cerca.tipo === 'riel' ? 'riel' : 'montana-rusa'} />
        {cerca.tipo === 'riel'
          ? t('tren.montarTren', 'Montar el tren')
          : t('tren.montarCarrito', 'Montar el carrito')}
      </button>
    </div>
  )
}
