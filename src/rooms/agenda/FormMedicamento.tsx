import { useState, type FormEvent } from 'react'
import type { Medicamento } from '../../core/data/db'
import { VACIO, mascotasRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR_AREA } from './constantes'
import { guardarMedicamento } from './crear'
import { ordenarHoras } from './horas'
import { Campo, INPUT, Modal } from './ui'

/** Semana empezando en lunes; el valor es el `getDay()` de JS (0 = domingo). */
const DIAS = [
  { dia: 1, es: 'L' },
  { dia: 2, es: 'M' },
  { dia: 3, es: 'X' },
  { dia: 4, es: 'J' },
  { dia: 5, es: 'V' },
  { dia: 6, es: 'S' },
  { dia: 0, es: 'D' },
]

export function FormMedicamento({
  inicial,
  mascotaInicial,
  onCerrar,
}: {
  inicial?: Medicamento | null
  /** Mascota ya elegida (alta desde su ficha). */
  mascotaInicial?: string
  onCerrar: () => void
}) {
  const t = useT()
  const mascotas = mascotasRepo.useAll() ?? VACIO
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [dosis, setDosis] = useState(inicial?.dosis ?? '')
  const [mascotaId, setMascotaId] = useState(inicial?.mascotaId ?? mascotaInicial ?? '')
  const [horas, setHoras] = useState<string[]>(inicial?.horas ?? ['08:00'])
  const [dias, setDias] = useState<number[]>(inicial?.dias ?? [])
  const [inicio, setInicio] = useState(inicial?.fechaInicio ?? fechaLocalISO())
  const [fin, setFin] = useState(inicial?.fechaFin ?? '')
  const [notas, setNotas] = useState(inicial?.notas ?? '')

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    await guardarMedicamento(inicial ?? null, {
      nombre: nombre.trim(),
      dosis: dosis.trim() || undefined,
      mascotaId: mascotaId || undefined,
      horas: ordenarHoras(horas.filter(Boolean)),
      dias,
      fechaInicio: inicio,
      fechaFin: fin || undefined,
      notas: notas.trim() || undefined,
      activo: inicial?.activo ?? true,
    })
    onCerrar()
  }

  return (
    <Modal
      titulo={inicial ? t('agenda.editarMedicamento', 'Editar tratamiento') : t('agenda.salud.nuevoMedicamento', 'Nuevo medicamento')}
      onCerrar={onCerrar}
    >
      <form onSubmit={guardar} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta={t('agenda.form.nombre', 'Nombre')}>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus className={INPUT} />
          </Campo>
          <Campo etiqueta={t('agenda.med.dosis', 'Dosis')}>
            <input
              value={dosis}
              onChange={(e) => setDosis(e.target.value)}
              placeholder="500 mg"
              className={INPUT}
            />
          </Campo>
        </div>

        {mascotas.length > 0 && (
          <Campo etiqueta={t('agenda.form.paraQuien', '¿Para quién es?')}>
            <select value={mascotaId} onChange={(e) => setMascotaId(e.target.value)} className={INPUT}>
              <option value="">{t('agenda.form.paraMi', '— Para mí —')}</option>
              {mascotas.map((m) => (
                <option key={m.mascId} value={m.mascId}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}

        <div>
          <p className="text-xs text-white/50">{t('agenda.med.horas', 'Horas de toma')}</p>
          <div className="mt-1 space-y-1.5">
            {horas.map((h, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="time"
                  value={h}
                  onChange={(e) => setHoras(horas.map((x, j) => (j === i ? e.target.value : x)))}
                  className={INPUT}
                />
                <button
                  type="button"
                  onClick={() => setHoras(horas.filter((_, j) => j !== i))}
                  className="rounded-lg bg-white/5 px-3 text-white/50 transition hover:bg-white/10 hover:text-red-400"
                >
                  <Icono nombre="quitar" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setHoras([...horas, '20:00'])}
            className="mt-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10"
          >
            <Icono nombre="agregar" /> {t('agenda.med.agregarToma', 'Agregar toma')}
          </button>
        </div>

        <div>
          <p className="text-xs text-white/50">{t('agenda.med.dias', 'Días')}</p>
          <div className="mt-1 flex gap-1">
            {DIAS.map((d) => {
              const activo = dias.includes(d.dia)
              return (
                <button
                  key={d.dia}
                  type="button"
                  onClick={() => setDias(activo ? dias.filter((x) => x !== d.dia) : [...dias, d.dia])}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                    activo ? 'texto-cta' : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                  style={activo ? { background: COLOR_AREA.salud } : undefined}
                >
                  {t(`agenda.dia.${d.dia}`, d.es)}
                </button>
              )
            })}
          </div>
          {dias.length === 0 && (
            <p className="mt-1 text-xs text-white/40">{t('agenda.med.todosDias', 'Sin marcar ninguno: todos los días.')}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta={t('agenda.med.desde', 'Desde')}>
            <input type="date" value={inicio} required onChange={(e) => setInicio(e.target.value)} className={INPUT} />
          </Campo>
          <Campo etiqueta={t('agenda.med.hasta', 'Hasta (opcional)')}>
            <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className={INPUT} />
          </Campo>
        </div>

        <Campo etiqueta={t('agenda.form.notas', 'Notas')}>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className={INPUT} />
        </Campo>

        <button
          type="submit"
          className="w-full rounded-lg py-2.5 text-sm font-bold texto-cta transition hover:brightness-110"
          style={{ background: COLOR_AREA.salud }}
        >
          {t('agenda.guardar', 'Guardar')}
        </button>
      </form>
    </Modal>
  )
}
