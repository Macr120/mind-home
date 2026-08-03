import { useEffect, useState } from 'react'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { useDiseño } from '../state/disenoStore'
import { useMontura, monturaFrame } from '../state/monturaStore'
import { useCarrera } from '../state/carreraStore'
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

/**
 * Botón de derrape: INTERRUPTOR, no "mantener presionado". Con un solo puntero
 * (ratón o un dedo) mantenerlo obligaba a soltar el joystick, y el derrape exige
 * ir acelerando: nunca llegaba a activarse. Encendido, cada giro con velocidad
 * derrapa; se apaga solo al bajarte. Espacio sigue funcionando en paralelo.
 */
function BotonDerrape({ title }: { title: string }) {
  const [activo, setActivo] = useState(monturaFrame.driftInput)
  useEffect(
    () => () => {
      monturaFrame.driftInput = false
    },
    [],
  )
  return (
    <button
      type="button"
      title={title}
      aria-pressed={activo}
      onClick={() => {
        monturaFrame.driftInput = !monturaFrame.driftInput
        setActivo(monturaFrame.driftInput)
      }}
      className={`ui-panel-glass pointer-events-auto grid h-11 w-11 place-items-center rounded-full border-2 shadow-xl backdrop-blur-md transition active:scale-90 ${
        activo ? 'border-amber-400 bg-amber-400/30 text-amber-300' : 'border-amber-400/60'
      }`}
    >
      <Icono nombre="viento" className="text-lg leading-none" />
    </button>
  )
}

/**
 * Controles de conducción táctiles (derrape en los terrestres, ↑/↓ en el OVNI).
 * Van a la derecha del botón de herramientas (los monta `MenuHerramientas`), no
 * en la pila de prompts: son controles sostenidos, no acciones de un toque.
 */
export function ControlesConduccion() {
  const t = useT()
  const tipo = useMontura((s) => s.tipo)
  const montado = useMontura((s) => s.instanciaId != null || s.prestado)
  const faseCarrera = useCarrera((s) => s.fase)

  // En plena carrera el derrape lo pone la pila de CarreraOverlay (abajo a la derecha).
  if (!montado || !tipo || faseCarrera === 'semaforo' || faseCarrera === 'corriendo') return null
  if (tipo === 'ovni') {
    return (
      <div className="flex items-center gap-2">
        <BotonVertical dir={1} title={t('veh.subir', 'Ascender (Espacio)')} />
        <BotonVertical dir={-1} title={t('veh.bajar', 'Descender (Shift)')} />
      </div>
    )
  }
  return <BotonDerrape title={t('veh.derrape', 'Derrape (Espacio)')} />
}

/**
 * Prompt 2D de los vehículos: "Subirte" al estar cerca de uno. Va en
 * `PilaPrompts`, que lo coloca por encima de los controles de las esquinas y del
 * chat. Conduciendo no hay prompt: bajarse vive en el panel del vehículo
 * (`ControlHerramienta`) y el derrape junto al joystick (`ControlesConduccion`).
 */
export function VehiculoOverlay() {
  const t = useT()
  const instanciaId = useMontura((s) => s.instanciaId)
  const cercaId = useMontura((s) => s.cercaId)
  const cercaTipo = useMontura((s) => s.cercaTipo)
  const montar = useMontura((s) => s.montar)
  const activeRoom = useHouse((s) => s.activeRoom)
  const editMode = useLayout((s) => s.editMode)
  const usandoJuego = useParque((s) => s.instanciaId)
  const enTren = useTren((s) => s.montado)

  if (activeRoom || editMode || usandoJuego != null || enTren) return null

  // A pie con un vehículo al alcance: subirse.
  if (instanciaId != null || cercaId == null || !cercaTipo) return null
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
