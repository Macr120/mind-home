import { useState } from 'react'
import type { Mascota, Medicamento } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR_AREA } from './constantes'
import { alternarMedicamento, borrarMedicamento } from './crear'
import { getEspecie } from './mascotas'
import { BotonBorrar } from './ui'

/** Fila de un tratamiento en curso, igual en la sección y en la ficha de la mascota. */
export function FilaMedicamento({
  medicina,
  mascota,
  onEditar,
}: {
  medicina: Medicamento
  /** Dueño del tratamiento cuando es de una mascota (en su ficha se omite). */
  mascota?: Mascota
  onEditar: () => void
}) {
  const t = useT()
  const [confirmando, setConfirmando] = useState(false)
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 p-3 ${medicina.activo ? '' : 'opacity-50'}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{medicina.nombre}</span>
        {medicina.dosis && <span className="text-xs text-white/50">{medicina.dosis}</span>}
        {mascota && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: `${COLOR_AREA.salud}33` }}
          >
            <Icono nombre={getEspecie(mascota.especie).icono} /> {mascota.nombre}
          </span>
        )}
        <button
          type="button"
          onClick={() => void alternarMedicamento(medicina)}
          className="ml-auto rounded-lg bg-white/5 px-2 py-1 text-[11px] font-semibold transition hover:bg-white/10"
        >
          {medicina.activo ? t('agenda.med.pausar', 'Pausar') : t('agenda.med.reanudar', 'Reanudar')}
        </button>
        {!confirmando && (
          <button
            type="button"
            onClick={onEditar}
            className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="editar" />
          </button>
        )}
        <BotonBorrar
          confirmando={confirmando}
          onPedir={() => setConfirmando(true)}
          onConfirmar={() => void borrarMedicamento(medicina)}
          onCancelar={() => setConfirmando(false)}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {medicina.horas.map((h) => (
          <span
            key={h}
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: `${COLOR_AREA.salud}33` }}
          >
            {h}
          </span>
        ))}
        {medicina.horas.length === 0 && (
          <span className="text-xs text-white/40">{t('agenda.med.sinHoras', 'Sin recordatorio')}</span>
        )}
      </div>
      {medicina.notas && <p className="mt-1 text-xs text-white/40">{medicina.notas}</p>}
    </div>
  )
}
