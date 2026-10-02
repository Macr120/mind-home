import { useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { CaraAsistente } from '../../core/chat/carasAsistentes'
import { useNarrador, type SeccionReparto } from './reparto'
import { RepartoConfig } from './RepartoConfig'

/**
 * Esquina superior izquierda de una tarjeta del diario: la cara del asistente
 * que trae esa sección y, como su nombre, el tema. Tocarla abre el reparto por
 * asistentes. Blanco fijo sobre velo oscuro: en modo claro `text-white` se remapea.
 * El diálogo va FUERA del botón: su `backdrop-blur` encajonaría al `fixed`.
 */
export function NarradorSeccion({
  seccion,
  color,
  emoji,
  etiqueta,
}: {
  seccion: SeccionReparto
  color: string
  emoji: string
  etiqueta: string
}) {
  const t = useT()
  const narrador = useNarrador(seccion)
  const [reparto, setReparto] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setReparto(true)}
        title={t('diario.reparto.titulo', 'Reparto por asistentes')}
        className="absolute start-2 top-2 z-10 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full bg-black/60 p-0.5 pe-2.5 shadow-lg backdrop-blur-sm transition hover:bg-black/75"
        style={{ boxShadow: `inset 0 0 0 1.5px ${color}` }}
      >
        {narrador && <CaraAsistente asistente={narrador} className="h-8 w-8" textoClase="text-lg" />}
        <span className="truncate text-xs font-bold" style={{ color: '#fff' }}>
          <Icono emoji={emoji} /> {etiqueta}
        </span>
      </button>
      {reparto && <RepartoConfig onCerrar={() => setReparto(false)} />}
    </>
  )
}
