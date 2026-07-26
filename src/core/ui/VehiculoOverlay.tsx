import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { useDiseño } from '../state/disenoStore'
import { useMontura, monturaFrame } from '../state/monturaStore'
import { useParque } from '../state/parqueStore'
import { useTren } from '../state/trenStore'
import { vehiculoDe } from '../house/vehiculos'
import { setPadVertical } from '../house/movement'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/** Botón ↑/↓ del OVNI (mantener presionado): vertical táctil, espejo de Space/Shift. */
function BotonVertical({ dir, title }: { dir: 1 | -1; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onPointerDown={() => setPadVertical(dir)}
      onPointerUp={() => setPadVertical(0)}
      onPointerLeave={() => setPadVertical(0)}
      className="ui-panel-glass pointer-events-auto grid h-11 w-11 place-items-center rounded-full border-2 border-emerald-400/60 text-lg font-black text-emerald-400 shadow-xl backdrop-blur-md transition active:scale-90"
    >
      {dir === 1 ? '▲' : '▼'}
    </button>
  )
}

/** Botón de derrape (mantener presionado): táctil, espejo de Space en terrestres. */
function BotonDerrape({ title }: { title: string }) {
  return (
    <button
      type="button"
      title={title}
      onPointerDown={() => {
        monturaFrame.driftInput = true
      }}
      onPointerUp={() => {
        monturaFrame.driftInput = false
      }}
      onPointerLeave={() => {
        monturaFrame.driftInput = false
      }}
      className="ui-panel-glass pointer-events-auto grid h-11 w-11 place-items-center rounded-full border-2 border-amber-400/60 shadow-xl backdrop-blur-md transition active:scale-90"
    >
      <Icono nombre="viento" className="text-lg leading-none" />
    </button>
  )
}

/**
 * Prompt 2D de los vehículos: "Subirte" al estar cerca de uno y "Bajarte"
 * mientras se conduce (con ↑/↓ para el vuelo del OVNI). Va en `PilaPrompts`,
 * que lo coloca por encima de los controles de las esquinas y del chat.
 */
export function VehiculoOverlay() {
  const t = useT()
  const instanciaId = useMontura((s) => s.instanciaId)
  const tipo = useMontura((s) => s.tipo)
  const cercaId = useMontura((s) => s.cercaId)
  const cercaTipo = useMontura((s) => s.cercaTipo)
  const montar = useMontura((s) => s.montar)
  const solicitarDesmontar = useMontura((s) => s.solicitarDesmontar)
  const activeRoom = useHouse((s) => s.activeRoom)
  const editMode = useLayout((s) => s.editMode)
  const usandoJuego = useParque((s) => s.instanciaId)
  const enTren = useTren((s) => s.montado)

  if (activeRoom || editMode || usandoJuego != null || enTren) return null

  // Conduciendo: bajarse (y subir/bajar en el OVNI, para táctil).
  if (instanciaId != null && tipo) {
    const def = vehiculoDe(tipo)
    return (
      <div className="pointer-events-none flex items-center justify-center gap-3">
        {tipo === 'ovni' && <BotonVertical dir={-1} title={t('veh.bajar', 'Descender (Shift)')} />}
        {tipo !== 'ovni' && <BotonDerrape title={t('veh.derrape', 'Derrape (Espacio)')} />}
        <button
          type="button"
          onClick={solicitarDesmontar}
          className="ui-panel-glass pointer-events-auto flex items-center gap-2 rounded-full border-2 border-emerald-400/60 px-5 py-2.5 text-sm font-black text-emerald-400 shadow-xl backdrop-blur-md transition hover:scale-105 active:scale-95"
        >
          <Icono emoji={def.icono} className="text-lg leading-none" />
          {t('veh.bajarte', 'Bajarte')}
        </button>
        {tipo === 'ovni' && <BotonVertical dir={1} title={t('veh.subir', 'Ascender (Espacio)')} />}
      </div>
    )
  }

  // A pie con un vehículo al alcance: subirse.
  if (cercaId == null || !cercaTipo) return null
  const def = vehiculoDe(cercaTipo)
  const subirte = () => {
    const inst = useDiseño.getState().objetos.find((o) => o.id === cercaId)
    if (inst) montar(inst)
  }
  return (
    <button
      type="button"
      onClick={subirte}
      className="ui-panel-glass pointer-events-auto flex items-center gap-2 rounded-full border-2 border-emerald-400/60 px-5 py-2.5 text-sm font-black text-emerald-400 shadow-xl backdrop-blur-md transition hover:scale-105 active:scale-95"
    >
      <Icono emoji={def.icono} className="text-lg leading-none" />
      {t('veh.subirte', 'Subirte')} · {def.nombre}
    </button>
  )
}
