import { useMemo, useState } from 'react'
import type { Rutina } from '../../data/db'
import { rutinasRepo } from '../../data/repository'
import { useT } from '../../i18n/useT'
import { agendada, duracionMin, ponerHorario, ponerPeriodo, quitarHorario, quitarPeriodo } from '../../metas'
import { useCategoriasMeta } from '../../state/categoriasMetaStore'
import { colorDe, COLORES_RUTINA } from '../coloresRutina'
import { Icono } from '../iconos/Icono'
import { MientrasDure } from './MientrasDure'
import { PasosMeta } from './PasosMeta'
import { categoriasDisponibles } from './VistaMetas'

const CLASE_CAMPO =
  'rounded border border-white/10 bg-black/30 px-1 py-0.5 text-[10px] tabular-nums text-white/70 focus:outline-none'

/**
 * Todo lo que se le puede tocar a una meta: fechas, hora, nota, color y pasos.
 *
 * Vive aparte porque lo comparten los DOS sitios donde se abre una meta — la fila
 * del cronograma y la lista de Metas del calendario — y son exactamente las mismas
 * acciones. Duplicarlo garantizaría que un día dejaran de coincidir.
 */
export function DetalleMeta({
  meta,
  sangria = 0,
  onPlanIA,
}: {
  meta: Rutina
  /** Sangría del bloque (el árbol del cronograma lo mete un nivel más adentro). */
  sangria?: number
  /** Sin valor = la IA está apagada: el ✨ no se dibuja. */
  onPlanIA?: (r: Rutina) => void
}) {
  const t = useT()
  const [notaAbierta, setNotaAbierta] = useState(false)
  // El detalle solo se monta al desplegar UNA meta, así que leer aquí las
  // categorías sale más barato que perforar la prop por `FilaMeta` desde los tres
  // sitios que la montan.
  const todas = rutinasRepo.useAll()
  const propias = useCategoriasMeta((s) => s.propias)
  const categorias = useMemo(() => categoriasDisponibles(todas ?? [], propias), [todas, propias])

  const guardarNota = (texto: string) => {
    if (meta.id != null) void rutinasRepo.update(meta.id, { nota: texto.trim() || undefined })
  }

  return (
    <div style={{ paddingLeft: sangria }} className="space-y-1 py-1 pe-1">
      {/*
        Las fechas se ponen trazando sobre el eje; estos campos son para la
        fecha exacta que a golpe de ratón no sale (o para quitarla). El fin no
        se puede elegir sin inicio: sería un periodo que empieza en ninguna parte.
      */}
      <div className="flex flex-wrap items-center gap-1">
        <input
          type="date"
          value={meta.fechaInicio ?? ''}
          onChange={(e) => void ponerPeriodo(meta, e.target.value, meta.fechaFin ?? e.target.value)}
          title={t('cal.meta.desde', 'Empieza')}
          className={CLASE_CAMPO}
        />
        <input
          type="date"
          value={meta.fechaFin ?? meta.fechaInicio ?? ''}
          disabled={!meta.fechaInicio}
          onChange={(e) => void ponerPeriodo(meta, meta.fechaInicio ?? e.target.value, e.target.value)}
          title={t('cal.meta.hasta', 'Termina')}
          className={`${CLASE_CAMPO} disabled:opacity-30`}
        />
        {agendada(meta) && (
          <button
            type="button"
            onClick={() => void quitarPeriodo(meta)}
            title={t('cal.meta.quitarFechas', 'Quitar las fechas (vuelve a la lista)')}
            className="px-1 text-[10px] text-white/30 transition hover:text-red-400"
          >
            <Icono nombre="basura" />
          </button>
        )}
        {/* El ✨ vive junto a las fechas: aquí es donde ya se decide el "cuándo". */}
        {onPlanIA && (
          <button
            type="button"
            onClick={() => onPlanIA(meta)}
            title={t('cal.plan.ia', 'Planear con IA')}
            className="ms-auto shrink-0 rounded-full border border-violet-400/50 bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-200 transition hover:bg-violet-500/35 hover:text-violet-100"
          >
            <Icono nombre="brillo" />
          </button>
        )}
      </div>

      {/* La hora es opcional: con ella la meta ocupa su franja en Día/Semana. */}
      {agendada(meta) && (
        <div className="flex flex-wrap items-center gap-1">
          {meta.hora ? (
            <>
              <input
                type="time"
                value={meta.hora}
                onChange={(e) => meta.id != null && void ponerHorario(meta.id, e.target.value, duracionMin(meta))}
                title={t('cal.meta.hora', 'Hora')}
                className={CLASE_CAMPO}
              />
              <input
                type="number"
                min={5}
                step={5}
                value={duracionMin(meta)}
                onChange={(e) => meta.id != null && void ponerHorario(meta.id, meta.hora!, Number(e.target.value))}
                title={t('cal.meta.duracion', 'Duración en minutos')}
                className={`w-11 ${CLASE_CAMPO}`}
              />
              <span className="text-[9px] text-white/30">{t('cal.meta.min', 'min')}</span>
              <button
                type="button"
                onClick={() => meta.id != null && void quitarHorario(meta.id)}
                className="px-1 text-[9px] text-white/30 transition hover:text-white/70"
              >
                {t('cal.meta.todoElDia', 'Todo el día')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => meta.id != null && void ponerHorario(meta.id, '08:00', 60)}
              className="px-1 text-[10px] text-white/35 transition hover:text-white/80"
            >
              + {t('cal.meta.ponerHora', 'Poner hora')}
            </button>
          )}
        </div>
      )}

      {/* Con nota ya escrita se ve directo; sin ella, un botón la revela (igual
          que "+ paso"/"+ meta") en vez de ocupar sitio siempre. */}
      {meta.nota || notaAbierta ? (
        <input
          autoFocus={notaAbierta && !meta.nota}
          defaultValue={meta.nota ?? ''}
          onBlur={(e) => {
            guardarNota(e.target.value)
            setNotaAbierta(false)
          }}
          // Enter guarda por su cuenta: delegar en blur() falla si el input perdió el foco.
          onKeyDown={(e) => {
            if (e.key === 'Enter') guardarNota(e.currentTarget.value)
            else if (e.key === 'Escape') setNotaAbierta(false)
          }}
          placeholder={t('cal.notaPlaceholder', 'Nota (opcional)')}
          className="w-full rounded border border-white/15 bg-black/30 px-1.5 py-0.5 text-[10px] text-white/80 placeholder:text-white/25 focus:outline-none"
        />
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setNotaAbierta(true)}
            className="px-1 text-[10px] text-white/35 transition hover:text-white/80"
          >
            + {t('cal.meta.etiquetaNota', 'nota')}
          </button>
        </div>
      )}

      {/* A qué grupo del panel de Metas pertenece. Solo se ofrece si ya hay
          alguna categoría: sin ellas, el selector no diría nada. */}
      {categorias.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-[9px] text-white/30">{t('cal.meta.categoria', 'Categoría')}</span>
          <select
            value={meta.categoriaMeta ?? ''}
            onChange={(e) =>
              meta.id != null &&
              void rutinasRepo.update(meta.id, { categoriaMeta: e.target.value || undefined })
            }
            className={CLASE_CAMPO}
          >
            <option value="">{t('cal.metas.sinCategoria', 'Sin categoría')}</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {COLORES_RUTINA.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => meta.id != null && void rutinasRepo.update(meta.id, { color: c })}
            title={c}
            style={{ backgroundColor: c }}
            className={`h-4 w-4 shrink-0 rounded-full border-2 transition ${
              colorDe(meta) === c ? 'scale-110 border-white' : 'border-transparent hover:scale-105'
            }`}
          />
        ))}
      </div>

      <PasosMeta meta={meta} sangria={0} />

      {/* Lo que la meta le pide a cada día mientras esté viva (ver MientrasDure). */}
      <MientrasDure meta={meta} />
    </div>
  )
}
