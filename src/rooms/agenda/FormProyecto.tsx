import { useState, type FormEvent } from 'react'
import type { ProyectoAgenda } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { COLOR_AREA } from './constantes'
import { guardarProyecto } from './crear'
import { Campo, INPUT, Modal } from './ui'

const COLORES = ['#6366f1', '#22d3ee', '#34d399', '#fbbf24', '#f87171', '#e879f9']

export function FormProyecto({ inicial, onCerrar }: { inicial?: ProyectoAgenda | null; onCerrar: () => void }) {
  const t = useT()
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [color, setColor] = useState(inicial?.color ?? COLORES[0])

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    await guardarProyecto(inicial ?? null, { nombre: nombre.trim(), color, activo: inicial?.activo ?? true })
    onCerrar()
  }

  return (
    <Modal
      titulo={inicial ? t('agenda.editarProyecto', 'Editar proyecto') : t('agenda.trabajo.nuevoProyecto', 'Nuevo proyecto')}
      onCerrar={onCerrar}
    >
      <form onSubmit={guardar} className="space-y-3">
        <Campo etiqueta={t('agenda.form.nombre', 'Nombre')}>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus className={INPUT} />
        </Campo>
        <Campo etiqueta={t('agenda.form.color', 'Color')}>
          <div className="flex gap-2">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className={`h-7 w-7 rounded-full transition ${color === c ? 'ring-2 ring-white/70' : 'opacity-70'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </Campo>
        <button
          type="submit"
          className="w-full rounded-lg py-2.5 text-sm font-bold texto-cta transition hover:brightness-110"
          style={{ background: COLOR_AREA.trabajo }}
        >
          {t('agenda.guardar', 'Guardar')}
        </button>
      </form>
    </Modal>
  )
}
