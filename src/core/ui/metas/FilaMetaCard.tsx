import { useState } from 'react'
import type { Rutina } from '../../data/db'
import { rutinasRepo } from '../../data/repository'
import { useT } from '../../i18n/useT'
import { agendada, estadoMeta, progresoDe, resumenAlcance, vencida, type EstadoMeta } from '../../metas'
import { fechaLocalISO } from '../../fechaLocal'
import type { PropsArrastre } from '../comun/arrastre'
import { Icono } from '../iconos/Icono'
import { vivo } from '../estilos'
import { PildoraCuenta } from './CuentaRegresiva'

/** Cómo se pinta cada estado. El texto lo pone quien renderiza (necesita `t`). */
const TONO_ESTADO: Record<EstadoMeta, string> = {
  porHacer: 'border-white/15 bg-white/5 text-white/45',
  enCurso: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  hecho: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
}

/**
 * Una meta en el panel de Metas, leída como una fila de tablero:
 *
 *   [3]  Entregar el proyecto semestral      16 d  ▓▓▓░ 2/3  ( En curso )
 *        la nota, si la tiene
 *
 * Antes esta fila llevaba siete controles y desplegaba su árbol de sub-metas
 * debajo; con un plan aceptado (doce sub-metas) la carpeta dejaba de leerse. Lo
 * editable se fue a la hoja que abre el clic — aquí solo queda lo que se mira.
 *
 * El número NO es el id de la base: es la posición dentro de su carpeta, que es
 * lo que se usa para referirse a una meta de un vistazo («la 3 de Cocina»).
 *
 * Ojo con el anidamiento de botones: la fila entera es un botón, así que la nota
 * y su input van FUERA de él (hermanos en la misma tarjeta), no dentro.
 */
export function FilaMetaCard({
  metas,
  meta,
  indice,
  color,
  conPlan,
  onAbrir,
  gesto,
  grupoClave,
  enMano,
  encima,
}: {
  /** El grupo entero: el progreso de una meta cuenta el de sus sub-metas. */
  metas: Rutina[]
  meta: Rutina
  /** Su posición en la carpeta, ya en base 1. */
  indice: number
  /** Color de la carpeta (el de la app o el de la categoría). */
  color: string
  /** Ya tiene un plan guardado: se marca, porque el clic abrirá su hoja. */
  conPlan?: boolean
  onAbrir: (r: Rutina) => void
  /** Se arrastra la fila entera, sin asa (el gesto compartido de la casa). */
  gesto?: PropsArrastre
  /** La carpeta a la que pertenece, para que el gesto resuelva el destino. */
  grupoClave?: string
  /** Esta fila va en la mano: se atenúa como hueco. */
  enMano?: boolean
  /** Lo arrastrado caería JUSTO ANTES de esta fila. */
  encima?: boolean
}) {
  const t = useT()
  const [editandoNota, setEditandoNota] = useState(false)

  const estado = estadoMeta(metas, meta)
  const resumen = resumenAlcance(metas, meta)
  const avance = progresoDe(metas, meta)
  const tarde = vencida(meta, fechaLocalISO(), metas)
  const hecho = estado === 'hecho'

  const ETIQUETA: Record<EstadoMeta, string> = {
    porHacer: t('cal.meta.estado.porHacer', 'Por hacer'),
    enCurso: t('cal.meta.estado.enCurso', 'En curso'),
    hecho: t('cal.meta.estado.hecho', 'Hecho'),
  }

  const guardarNota = (texto: string) => {
    setEditandoNota(false)
    const limpio = texto.trim()
    if (meta.id == null || limpio === (meta.nota ?? '')) return
    void rutinasRepo.update(meta.id, { nota: limpio || undefined })
  }

  return (
    <div
      data-tut="cal.metas.fila"
      // Mientras se escribe la nota el gesto se suelta: teclear no debe arrastrar.
      {...(gesto && !editandoNota ? gesto : {})}
      data-meta-fila={meta.id != null ? String(meta.id) : undefined}
      data-grupo={grupoClave}
      className={`group rounded-lg border bg-white/[0.02] px-1.5 py-1 transition hover:border-white/15 hover:bg-white/5 ${
        gesto ? 'cursor-grab' : ''
      } ${encima ? 'border-t-2 border-t-accent' : 'border-white/5'} ${enMano ? 'opacity-40' : ''}`}
    >
      <button type="button" onClick={() => onAbrir(meta)} className="flex w-full items-center gap-2 text-start">
        {/* El número de la meta dentro de su carpeta: sustituye al check. */}
        <span
          className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-bold tabular-nums texto-vivo"
          style={{ ...vivo(color), backgroundColor: `${color}26`, border: `1px solid ${color}59` }}
          title={t('cal.meta.numero', 'Meta {n} de esta carpeta', { n: indice })}
        >
          {indice}
        </span>

        <span className={`min-w-0 flex-1 truncate text-sm text-white/85 ${hecho ? 'line-through opacity-50' : ''}`}>
          <Icono emoji={meta.emoji} /> {meta.nombre}
        </span>

        {/* Duración: lo que falta para su plazo, o que no tiene ninguno. Una meta
            ya cumplida no lleva cuenta atrás — su plazo dejó de importar el día
            que se cerró, y el número se leería como si aún corriera. */}
        {!hecho &&
          (agendada(meta) ? (
            <PildoraCuenta meta={meta} />
          ) : (
            <span className="shrink-0 text-[9px] text-white/25">{t('cal.meta.sinFecha', 'sin fecha')}</span>
          ))}
        {tarde && !hecho && (
          <span className="shrink-0 text-[9px] text-red-400/80">{t('cal.meta.tarde', 'vencida')}</span>
        )}

        {/* Progreso: solo si hay algo dentro que contar. */}
        {resumen.total > 0 && (
          <span className="hidden shrink-0 items-center gap-1.5 sm:flex" title={t('cal.meta.alcance', 'Pasos y sub-metas completados')}>
            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.round(avance * 100)}%`, background: color }}
              />
            </span>
            <span className="text-[10px] tabular-nums text-white/40">
              {resumen.hechos}/{resumen.total}
            </span>
          </span>
        )}

        {/* Tiene plan: no es un botón (la fila entera ya lleva a su hoja), solo
            avisa de que ahí dentro hay un cronograma escrito. */}
        {conPlan && (
          <span className="shrink-0 text-[10px] text-violet-300/80" title={t('cal.meta.tienePlan', 'Tiene un plan')}>
            <Icono nombre="brillo" />
          </span>
        )}

        <span
          className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${TONO_ESTADO[estado]}`}
        >
          {ETIQUETA[estado]}
        </span>
      </button>

      {/* La nota, debajo del título y en pequeño. Sin nota se ofrece escribirla;
          nunca abre la hoja, por eso vive fuera del botón de arriba. */}
      {editandoNota ? (
        <input
          autoFocus
          defaultValue={meta.nota ?? ''}
          onBlur={(e) => guardarNota(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') guardarNota(e.currentTarget.value)
            else if (e.key === 'Escape') setEditandoNota(false)
          }}
          placeholder={t('cal.notaPlaceholder', 'Nota (opcional)')}
          className="ms-7 mt-0.5 w-[calc(100%-1.75rem)] rounded border border-white/15 bg-black/30 px-1.5 py-0.5 text-[11px] text-white/80 placeholder:text-white/25 focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditandoNota(true)}
          // Sin nota, la invitación solo se ve al pasar por encima, pero su línea
          // se reserva igual: si apareciera y desapareciera, la lista daría saltos
          // cada vez que el ratón cruza una fila.
          className={`ms-7 block max-w-[calc(100%-1.75rem)] truncate text-start text-[11px] transition ${
            meta.nota
              ? 'text-white/40 hover:text-white/70'
              : 'text-white/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}
        >
          {meta.nota || t('cal.meta.nota.agregar', 'Añadir nota')}
        </button>
      )}
    </div>
  )
}
