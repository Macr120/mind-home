import { useEffect, useState } from 'react'
import { useMontura, monturaFrame } from '../state/monturaStore'
import { useCarrera } from '../state/carreraStore'
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
