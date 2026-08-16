import { useState } from 'react'
import type { Rutina } from '../../data/db'
import { crearMeta, esMeta, ponerHorario, ponerPeriodo, raices } from '../../metas'
import { useT } from '../../i18n/useT'
import { COLORES_RUTINA } from '../coloresRutina'
import { Icono } from '../iconos/Icono'

/**
 * Alta rápida de una meta desde el propio panel de Metas del calendario, sin
 * pasar por el Cronograma. Nace con fecha (el día donde se está agregando) y
 * pregunta si además lleva una hora fija, como cualquier evento del calendario.
 */
export function NuevaMeta({
  rutinas,
  ancla,
  onCreada,
}: {
  /** Para calcular hermanas/color como hace el Cronograma. */
  rutinas: Rutina[]
  /** Fecha ISO a la que nace agendada. */
  ancla: string
  /** Se llama con la meta recién creada, para abrir su detalle si se quiere. */
  onCreada: (r: Rutina) => void
}) {
  const t = useT()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [preguntando, setPreguntando] = useState(false)

  const cerrar = () => {
    setAbierto(false)
    setPreguntando(false)
    setNombre('')
  }

  const confirmarNombre = () => {
    if (nombre.trim()) setPreguntando(true)
    else cerrar()
  }

  const crear = async (conHorario: boolean) => {
    const metas = rutinas.filter(esMeta)
    const nueva = await crearMeta(metas, nombre, undefined, COLORES_RUTINA[raices(metas).length % COLORES_RUTINA.length])
    if (nueva?.id != null) {
      await ponerPeriodo(nueva, ancla, ancla)
      if (conHorario) await ponerHorario(nueva.id, '09:00', 60)
      onCreada({ ...nueva, fechaInicio: ancla, hora: conHorario ? '09:00' : undefined })
    }
    cerrar()
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="ms-auto flex shrink-0 items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
      >
        <Icono nombre="agregar" /> {t('cal.meta.nueva', 'Meta')}
      </button>
    )
  }

  if (preguntando) {
    return (
      <div className="ms-auto flex shrink-0 items-center gap-1 text-[11px]">
        <span className="text-white/45">{t('cal.meta.conHorario', '¿Con horario fijo?')}</span>
        <button
          type="button"
          onClick={() => void crear(false)}
          className="rounded-lg border border-white/15 px-2 py-1 font-semibold text-white/70 transition hover:bg-white/10"
        >
          {t('cal.meta.sinHorario', 'Sin horario')}
        </button>
        <button
          type="button"
          onClick={() => void crear(true)}
          className="rounded-lg bg-emerald-600 px-2 py-1 font-semibold texto-cta transition hover:bg-emerald-600"
        >
          {t('cal.meta.conHorarioBoton', 'Con horario')}
        </button>
      </div>
    )
  }

  return (
    <input
      autoFocus
      value={nombre}
      onChange={(e) => setNombre(e.target.value)}
      onBlur={confirmarNombre}
      onKeyDown={(e) => {
        if (e.key === 'Enter') confirmarNombre()
        else if (e.key === 'Escape') cerrar()
      }}
      placeholder={t('cal.meta.nuevaMetaPlaceholder', 'Nueva meta…')}
      className="ms-auto w-32 shrink-0 rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-[11px] text-white/90 placeholder:text-white/30 focus:outline-none"
    />
  )
}
