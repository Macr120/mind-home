import { useEffect, useState } from 'react'
import type { Rutina } from '../data/db'
import {
  marcarMetaDiaria,
  sincronizarAgendaDeMeta,
  useMetaDiaria,
  volverAutomatico,
} from '../metaDiaria'
import { getPlantilla } from '../registry'
import { hoyISO } from '../rutinas'
import { EditorRutina, rutinaNueva } from './RutinasPanel'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * El pulso de hoy de una app, bajo el header de su cuarto: cuánto llevas de tu
 * meta diaria y si está cumplida. Se palomea sola con la actividad real; la
 * palomita de la derecha la fuerza a mano ("lo hice pero no lo registré") y manda
 * sobre el automático hasta medianoche.
 *
 * La cifra que se enseña es SIEMPRE la real: el override toca la palomita, no el
 * número — si no, la barra mentiría sobre lo que hay registrado.
 */
export function MetaDiariaBarra({ plantillaId, color }: { plantillaId: string; color: string }) {
  const t = useT()
  const estado = useMetaDiaria(plantillaId)
  const [agendando, setAgendando] = useState<Rutina | null>(null)
  const fecha = hoyISO()
  const cumplida = estado?.cumplida

  // Lo agendado de esta app sigue a su meta: cumplirla palomea la ocurrencia de
  // hoy en el calendario. Aquí, porque es donde el usuario registra y el hook ya
  // combina lo automático con lo manual.
  useEffect(() => {
    if (cumplida === undefined) return
    void sincronizarAgendaDeMeta(plantillaId, fecha, cumplida)
  }, [plantillaId, fecha, cumplida])

  if (!estado) return null

  const { meta, avance, manual } = estado
  const apagada = avance.objetivo <= 0
  // Meta booleana (hacerlo o no): "1 / 1" no le dice nada a nadie.
  const booleana = !meta.unidad && avance.objetivo === 1
  const frac = apagada ? 0 : Math.min(1, avance.hecho / avance.objetivo)

  const texto = apagada
    ? t('meta.apagada', 'Sin objetivo')
    : avance.detalle ??
      (booleana
        ? cumplida
          ? t('meta.cumplida', '¡Cumplida!')
          : t('meta.pendiente', 'Pendiente')
        : `${avance.hecho} / ${avance.objetivo}${meta.unidad ? ` ${meta.unidad}` : ''}`)

  const agendar = () => {
    const p = getPlantilla(plantillaId)
    setAgendando(
      rutinaNueva({
        plantillaId,
        nombre: t(meta.clave, meta.etiquetaEs),
        emoji: p?.icon ?? '⏰',
        color: p?.color,
      }),
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2">
        <span className="shrink-0 text-xs font-semibold text-white/70">
          {t(meta.clave, meta.etiquetaEs)}
        </span>

        {!booleana && !apagada && (
          <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-white/10 sm:w-40">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.round(frac * 100)}%`, background: color }}
            />
          </div>
        )}

        <span className={`min-w-0 truncate text-xs ${cumplida ? 'text-white/80' : 'text-white/45'}`}>
          {texto}
        </span>

        {manual && (
          <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
            {t('meta.aMano', 'a mano')}
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={agendar}
            title={t('meta.agendar', 'Agendar en el calendario')}
            className="rounded-lg px-2 py-1 text-xs text-white/50 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="calendario" />
          </button>
          {manual && (
            <button
              type="button"
              onClick={() => void volverAutomatico(plantillaId, fecha)}
              title={t('meta.auto', 'Volver a automático')}
              className="rounded-lg px-2 py-1 text-xs text-white/50 transition hover:bg-white/10 hover:text-white/80"
            >
              <Icono nombre="restaurar" />
            </button>
          )}
          <button
            type="button"
            onClick={() => void marcarMetaDiaria(plantillaId, fecha, !cumplida)}
            title={
              cumplida
                ? t('meta.desmarcar', 'Marcar como no cumplida')
                : t('meta.marcar', 'Marcar como cumplida')
            }
            className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
              cumplida
                ? 'bg-emerald-400/20 text-emerald-300 hover:bg-emerald-400/30'
                : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80'
            }`}
          >
            <Icono nombre="confirmar" />
          </button>
        </div>
      </div>

      {/* Mismo editor que el calendario: agendar desde la app crea la misma fila. */}
      {agendando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="ui-panel-glass ui-pop max-h-[85vh] w-[min(92vw,26rem)] overflow-auto rounded-2xl border border-white/10 p-3 shadow-2xl backdrop-blur-md">
            <EditorRutina rutina={agendando} onCerrar={() => setAgendando(null)} />
          </div>
        </div>
      )}
    </>
  )
}
