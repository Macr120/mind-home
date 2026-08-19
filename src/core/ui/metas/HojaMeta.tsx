import { useMemo, useState } from 'react'
import type { EnlaceApp, Rutina } from '../../data/db'
import { rutinasRepo } from '../../data/repository'
import { useT } from '../../i18n/useT'
import {
  borrarMetaConDescendencia,
  crearMeta,
  enlazarMeta,
  estadoMeta,
  hijasDe,
  progresoDe,
  resumenAlcance,
  toggleMeta,
  type EstadoMeta,
} from '../../metas'
import { confirmar } from '../../state/confirmarStore'
import { colorDe, colorPorProfundidad } from '../coloresRutina'
import { Icono } from '../iconos/Icono'
import { TONO_ESTADO } from './carpetas'
import { ChipApp, SelectorApp } from './ChipApp'
import { DetalleMeta } from './DetalleMeta'

/** Sangría por nivel de sub-meta, la misma que usa la hoja del plan. */
const SANGRIA = 18

/**
 * La hoja de UNA meta: todo lo que se le puede tocar, en una pantalla.
 *
 * Es la pareja de `HojaPlan` para las metas que todavía no tienen plan. El panel
 * de Metas dejó de ser editable (cada fila solo se mira: id, nombre, nota,
 * plazo, progreso y estado), así que renombrar, fechar, apuntar pasos, colgar
 * sub-metas, cerrarla o borrarla se hace aquí dentro.
 *
 * También es el ÚNICO sitio donde se marca hecha una meta suelta: el estado de
 * la lista se deriva del progreso y no se pulsa (ver `estadoMeta`).
 */
export function HojaMeta({
  meta,
  metas,
  onVolver,
  onPlanIA,
  onVerCronograma,
}: {
  meta: Rutina
  /** El árbol entero (o el de la app): de aquí salen sus sub-metas y su avance. */
  metas: Rutina[]
  onVolver: () => void
  /** Sin valor = la IA está apagada: el ✨ no se dibuja. */
  onPlanIA?: (r: Rutina) => void
  /** Abre el eje acotado a esta meta: su subárbol sobre el tiempo. */
  onVerCronograma?: () => void
}) {
  const t = useT()
  const [renombrando, setRenombrando] = useState(false)
  const [nombreTmp, setNombreTmp] = useState(meta.nombre)
  const [agregando, setAgregando] = useState(false)
  const [nombreHija, setNombreHija] = useState('')
  const [enlazando, setEnlazando] = useState(false)

  const estado = estadoMeta(metas, meta)
  const resumen = resumenAlcance(metas, meta)
  const avance = progresoDe(metas, meta)
  const color = colorDe(meta)

  // Las sub-metas, aplanadas con su profundidad: aquí sí se ve el árbol entero.
  const rama = useMemo(() => {
    const salida: { meta: Rutina; profundidad: number }[] = []
    const bajar = (madre: Rutina, profundidad: number) => {
      for (const hija of hijasDe(metas, madre.id)) {
        salida.push({ meta: hija, profundidad })
        bajar(hija, profundidad + 1)
      }
    }
    bajar(meta, 0)
    return salida
  }, [metas, meta])

  const ETIQUETA: Record<EstadoMeta, string> = {
    porHacer: t('cal.meta.estado.porHacer', 'Por hacer'),
    enCurso: t('cal.meta.estado.enCurso', 'En curso'),
    hecho: t('cal.meta.estado.hecho', 'Hecho'),
  }

  const confirmarRenombre = () => {
    const n = nombreTmp.trim()
    if (n && meta.id != null) void rutinasRepo.update(meta.id, { nombre: n })
    setRenombrando(false)
  }

  const confirmarHija = () => {
    if (!nombreHija.trim()) return
    void crearMeta(metas, nombreHija, meta, colorPorProfundidad(color, 1))
    setNombreHija('')
  }

  const ponerEnlace = (e: EnlaceApp | undefined) => {
    void enlazarMeta(meta, e)
    setEnlazando(false)
  }

  const borrar = async () => {
    if (meta.id == null) return
    const hijas = hijasDe(metas, meta.id)
    const ok = await confirmar({
      titulo: hijas.length
        ? t('cal.meta.borrarConHijas', '¿Borrar esta meta y todas sus sub-metas?')
        : t('cal.meta.borrar', '¿Borrar esta meta?'),
      mensaje: meta.nombre,
      textoOk: t('ui.borrar', 'Borrar'),
      peligro: true,
    })
    if (!ok) return
    await borrarMetaConDescendencia(meta.id)
    onVolver()
  }

  return (
    <div className="space-y-3">
      {/* Cabecera: de qué meta es, cómo va y el botón que la cierra. */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onVolver}
            className="ui-presion shrink-0 rounded-lg px-1.5 py-0.5 text-2xs font-semibold text-white/45 transition hover:bg-white/10 hover:text-white/85"
          >
            ‹ {t('cal.meta.volverMetas', 'Volver a las metas')}
          </button>
          {renombrando ? (
            <input
              autoFocus
              value={nombreTmp}
              onChange={(e) => setNombreTmp(e.target.value)}
              onBlur={confirmarRenombre}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmarRenombre()
                else if (e.key === 'Escape') setRenombrando(false)
              }}
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-1.5 py-0.5 text-sm text-white/90 focus:border-accent/60 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setNombreTmp(meta.nombre)
                setRenombrando(true)
              }}
              title={t('cal.meta.renombrar', 'Renombrar')}
              className="ui-presion min-w-0 flex-1 truncate text-start text-sm font-semibold text-white/90"
            >
              <span className="me-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: color }} />
              <Icono emoji={meta.emoji} /> {meta.nombre}
            </button>
          )}
          {/* La salida al eje de ESTA meta: su lista sobre el tiempo. */}
          {onVerCronograma && (
            <button
              type="button"
              data-tut="cal.meta.hoja.verCronograma"
              onClick={onVerCronograma}
              className="ui-presion shrink-0 rounded-lg px-1.5 py-0.5 text-2xs font-semibold text-white/45 transition hover:bg-white/10 hover:text-white/85"
            >
              <Icono nombre="calendario" /> {t('cal.meta.verEnCronograma', 'Ver en el Cronograma')}
            </button>
          )}
          <button
            type="button"
            onClick={() => void toggleMeta(meta)}
            title={t('cal.meta.marcarHecha', 'Marcar la meta como hecha')}
            className={`ui-presion shrink-0 rounded-full border px-2 py-0.5 text-2xs font-semibold hover:brightness-125 ${TONO_ESTADO[estado]}`}
          >
            {ETIQUETA[estado]}
          </button>
        </div>

        {resumen.total > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${Math.round(avance * 100)}%`, background: color }}
              />
            </div>
            <span className="shrink-0 text-2xs font-semibold tabular-nums text-white/60">
              {Math.round(avance * 100)}%
            </span>
            <span className="shrink-0 text-2xs tabular-nums text-white/35">
              {resumen.hechos}/{resumen.total}
            </span>
          </div>
        )}

        {/* Dónde se registra lo que pide la meta: el mismo chip que llevan sus
            pasos en la hoja del plan, aquí para la meta entera. */}
        <div className="flex flex-wrap items-center gap-1.5">
          {meta.enlaceApp && <ChipApp enlace={meta.enlaceApp} onQuitar={() => ponerEnlace(undefined)} />}
          <button
            type="button"
            data-tut="cal.enlace.boton"
            onClick={() => setEnlazando((v) => !v)}
            title={t('cal.enlace.poner', 'Enlazar con la app donde se registra')}
            className={`ui-presion rounded-lg px-1 text-2xs font-semibold transition hover:text-white/85 ${
              enlazando ? 'text-accent' : 'text-white/35'
            }`}
          >
            <Icono nombre="vincular" />{' '}
            {meta.enlaceApp ? t('cal.enlace.cambiar', 'Cambiar app') : t('cal.enlace.boton', 'Enlazar app')}
          </button>
        </div>
        {enlazando && <SelectorApp onElegir={ponerEnlace} onCerrar={() => setEnlazando(false)} />}
      </div>

      {/* Cuerpo: fechas, nota, color, pasos… y las sub-metas. */}
      <div className="space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1">
          <DetalleMeta meta={meta} onPlanIA={onPlanIA} />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
          <p className="mb-1 px-1 text-2xs uppercase tracking-wide text-white/35">
            {t('cal.meta.submetas', 'Sub-metas')}
          </p>
          {rama.length === 0 && (
            <p className="px-1 py-1 text-2xs text-white/25">
              {t('cal.meta.sinSubmetas', 'Todavía no tiene sub-metas.')}
            </p>
          )}
          {rama.map((f) => (
            <SubMeta key={f.meta.id} metas={metas} meta={f.meta} profundidad={f.profundidad} />
          ))}
          {agregando ? (
            <input
              autoFocus
              value={nombreHija}
              onChange={(e) => setNombreHija(e.target.value)}
              onBlur={() => {
                confirmarHija()
                setAgregando(false)
              }}
              // Enter deja la caja abierta: así se encadenan varias de un tirón.
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmarHija()
                else if (e.key === 'Escape') setAgregando(false)
              }}
              placeholder={t('cal.meta.nuevaHija', 'Sub-meta…')}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-1.5 py-0.5 text-xs text-white/90 placeholder:text-white/25 focus:border-accent/60 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setAgregando(true)}
              className="mt-1 rounded-lg px-1.5 py-0.5 ui-presion text-2xs font-bold leading-none text-accent hover:bg-white/10"
            >
              + {t('cal.meta.etiquetaSubmeta', 'sub-meta')}
            </button>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void borrar()}
            className="ui-presion rounded-lg border border-white/10 px-2.5 py-1 text-2xs font-semibold text-white/40 transition hover:border-red-400/40 hover:text-red-400"
          >
            <Icono nombre="basura" /> {t('cal.meta.borrarMeta', 'Borrar la meta')}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Una sub-meta dentro de la hoja: se palomea, se ve su avance y se dice en qué app
 * se registra. El chip es lo que hereda de su nodo del plan (`aceptarPlan`) y lo
 * que la deja seguir siendo accionable ya en el cronograma real.
 */
function SubMeta({ metas, meta, profundidad }: { metas: Rutina[]; meta: Rutina; profundidad: number }) {
  const t = useT()
  const [enlazando, setEnlazando] = useState(false)
  const resumen = resumenAlcance(metas, meta)
  const hecha = progresoDe(metas, meta) >= 1

  const ponerEnlace = (e: EnlaceApp | undefined) => {
    void enlazarMeta(meta, e)
    setEnlazando(false)
  }

  return (
    <div style={{ paddingLeft: profundidad * SANGRIA }}>
      <div className="group flex items-center gap-2 rounded-lg px-1 py-0.5 transition hover:bg-white/5">
        <button
          type="button"
          onClick={() => void toggleMeta(meta)}
          title={t('cal.marcarHecho', 'Marcar como hecho')}
          className={`ui-presion grid h-4 w-4 shrink-0 place-items-center rounded-lg border text-2xs transition ${
            hecha ? 'border-emerald-400 bg-emerald-500/30 text-emerald-400' : 'border-white/25 hover:border-white/50'
          }`}
        >
          {hecha ? '✓' : ''}
        </button>
        <span className={`min-w-0 flex-1 truncate text-xs text-white/80 ${hecha ? 'line-through opacity-50' : ''}`}>
          {meta.nombre}
        </span>
        {meta.enlaceApp && <ChipApp enlace={meta.enlaceApp} onQuitar={() => ponerEnlace(undefined)} />}
        <button
          type="button"
          onClick={() => setEnlazando((v) => !v)}
          title={t('cal.enlace.poner', 'Enlazar con la app donde se registra')}
          className={`ui-presion hidden shrink-0 px-0.5 text-2xs transition hover:text-white/80 group-hover:block ${
            enlazando ? 'text-accent' : 'text-white/30'
          }`}
        >
          <Icono nombre="vincular" />
        </button>
        {resumen.total > 0 && (
          <span className="shrink-0 text-2xs tabular-nums text-white/35">
            {resumen.hechos}/{resumen.total}
          </span>
        )}
      </div>
      {enlazando && (
        <div className="mb-1 mt-1">
          <SelectorApp onElegir={ponerEnlace} onCerrar={() => setEnlazando(false)} />
        </div>
      )}
    </div>
  )
}
