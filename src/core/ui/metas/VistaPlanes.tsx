import { useMemo } from 'react'
import type { PlanMeta, Rutina } from '../../data/db'
import { planesMetaRepo } from '../../data/repository'
import { localeActual, useT } from '../../i18n/useT'
import { diasDePlan, espejoDePlan, progresoPlan, resumenPlan } from '../../planMeta'
import { confirmar } from '../../state/confirmarStore'
import { colorDe } from '../coloresRutina'
import { vivo } from '../estilos'
import { Icono } from '../iconos/Icono'
import { etiquetasDePlanes, textoEtiquetaPlan, type EtiquetaPlan } from './carpetas'
import { GeneradorPlan } from './GeneradorPlan'
import { HojaPlan } from './HojaPlan'

const COLOR_PLAN = '#a78bfa'

/**
 * El menú Planes: los cronogramas que la IA ha propuesto para estas metas, antes de
 * pasarlos al cronograma real. Tres pantallas en una — la lista, el generador y la
 * hoja del plan elegido.
 *
 * Solo se listan los planes de las metas que esta vista sostiene. Antes el selector
 * del cronograma sacaba TODOS los de la base: dentro de una app aparecían planes de
 * metas de otra, y su botón de aceptar salía gris para siempre porque la meta origen
 * no estaba en la lista.
 */
/**
 * En qué pantalla está la vista. Lo lleva `Cronograma` y no este componente: el ✨
 * de una meta y el «Abrir la hoja» del eje entran aquí ya apuntando a una pantalla
 * concreta, y sincronizar eso con estado propio pedía efectos.
 */
export type DestinoPlanes =
  | { tipo: 'lista' }
  | { tipo: 'elegirMeta' }
  | { tipo: 'generar'; meta: Rutina }
  | { tipo: 'hoja'; id: number }

export function VistaPlanes({
  metas,
  planes,
  metaArmada,
  destino,
  onDestino,
  onVerEnCronograma,
  onIrACronograma,
  onVerMeta,
}: {
  metas: Rutina[]
  planes: PlanMeta[]
  metaArmada: Rutina | null
  destino: DestinoPlanes
  onDestino: (d: DestinoPlanes) => void
  onVerEnCronograma: (planId: number) => void
  onIrACronograma: () => void
  /** Abre la hoja de la meta del plan (fechas, nota, color, sub-metas sueltas). */
  onVerMeta: (r: Rutina) => void
}) {
  const t = useT()

  const mios = useMemo(() => {
    const ids = new Set(metas.map((m) => m.id))
    return planes
      .filter((p) => ids.has(p.metaId))
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
  }, [planes, metas])

  // Cómo se llama cada plan («Jardín · Plan 1»): lo comparte con el selector y la
  // cabecera del cronograma, así que un plan se llama igual en las dos vistas.
  const carpetas = useMemo(() => etiquetasDePlanes(mios, metas, t), [mios, metas, t])

  // Se resuelve contra la lista viva: si el plan se borra, la vista vuelve sola a la
  // lista sin un efecto que lo vigile.
  const hoja = destino.tipo === 'hoja' ? mios.find((p) => p.id === destino.id) : undefined

  if (hoja) {
    const suya = hoja.id != null ? carpetas.get(hoja.id) : undefined
    return (
      <HojaPlan
        plan={hoja}
        metas={metas}
        onVolver={() => onDestino({ tipo: 'lista' })}
        onVerEnCronograma={() => hoja.id != null && onVerEnCronograma(hoja.id)}
        onVerMeta={onVerMeta}
        etiqueta={suya ? textoEtiquetaPlan(suya, hoja.nombre, t) : undefined}
      />
    )
  }

  if (destino.tipo === 'generar')
    return (
      <GeneradorPlan
        meta={destino.meta}
        planes={planes}
        onCancelar={() => onDestino({ tipo: 'lista' })}
        onGuardado={(id) => onDestino({ tipo: 'hoja', id })}
      />
    )

  const nuevoPlan = () =>
    onDestino(metas.length === 1 ? { tipo: 'generar', meta: metas[0] } : { tipo: 'elegirMeta' })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-wider text-white/70">
          <span className="text-violet-300/80">
            <Icono nombre="brillo" />
          </span>{' '}
          {t('cal.plan.menu', 'Planes')}
        </p>
        {/* Sin condicionar a la IA: el generador ofrece las dos vías y la de a mano
            funciona igual con la IA apagada. */}
        {metas.length > 0 && (
          <button
            type="button"
            onClick={nuevoPlan}
            className="shrink-0 rounded-lg border border-violet-400/50 bg-violet-500/20 px-2.5 py-1 text-[11px] font-semibold text-violet-200 transition hover:bg-violet-500/35 hover:text-violet-100"
          >
            + {t('cal.plan.nuevo', 'Nuevo plan')}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div data-tut="cal.plan.lista" className="mx-auto max-w-2xl space-y-2">
          <p className="text-[11px] leading-relaxed text-white/35">
            {t(
              'cal.plan.menuDesc',
              'Un plan es el borrador de un cronograma: se palomea aquí y, cuando convence, sus fases pasan a ser sub-metas reales.',
            )}
          </p>

          {/* Paso previo cuando la vista tiene varias metas: ¿para cuál? */}
          {destino.tipo === 'elegirMeta' && (
            <div className="space-y-1 rounded-xl border border-violet-400/30 bg-violet-500/10 p-2.5">
              <p className="text-[11px] font-semibold text-violet-200/90">
                {t('cal.plan.paraMeta', '¿Para qué meta?')}
              </p>
              {metas.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onDestino({ tipo: 'generar', meta: m })}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-white/10 ${
                    metaArmada?.id === m.id ? 'bg-white/10' : ''
                  }`}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorDe(m) }} />
                  <span className="min-w-0 flex-1 truncate text-white/85">
                    <Icono emoji={m.emoji} /> {m.nombre}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => onDestino({ tipo: 'lista' })}
                className="w-full rounded-lg py-1 text-[11px] text-white/40 transition hover:text-white/75"
              >
                {t('ui.cancelar', 'Cancelar')}
              </button>
            </div>
          )}

          {metas.length === 0 && (
            <div className="space-y-2 py-6 text-center">
              <p className="text-xs text-white/35">
                {t('cal.plan.sinMetas', 'Crea una meta en el Cronograma para poder planearla.')}
              </p>
              <button
                type="button"
                onClick={onIrACronograma}
                className="rounded-lg border border-white/15 px-3 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
              >
                {t('cal.cronograma', 'Cronograma')}
              </button>
            </div>
          )}

          {metas.length > 0 && mios.length === 0 && (
            <p className="py-6 text-center text-xs text-white/30">
              {t('cal.plan.vacio', 'Todavía no hay planes guardados.')}
            </p>
          )}

          {mios.map((p) => (
            <TarjetaPlan
              key={p.id}
              plan={p}
              metas={metas}
              carpeta={carpetas.get(p.id ?? -1)}
              onAbrir={() => p.id != null && onDestino({ tipo: 'hoja', id: p.id })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Un plan en la lista: de qué meta es, cómo va y en qué punto está. */
function TarjetaPlan({
  plan,
  metas,
  carpeta,
  onAbrir,
}: {
  plan: PlanMeta
  metas: Rutina[]
  /** Su carpeta y su número dentro de ella; sin ella se cae al nombre guardado. */
  carpeta?: EtiquetaPlan
  onAbrir: () => void
}) {
  const t = useT()
  const espejo = useMemo(() => espejoDePlan(plan, metas), [plan, metas])
  const origen = metas.find((m) => m.id === plan.metaId)
  const avance = progresoPlan(plan, espejo, metas)
  const resumen = resumenPlan(plan, espejo, metas)
  const aceptado = !!plan.aceptadoEn
  const fases = plan.nodos.filter((n) => n.padre === undefined).length
  const dias = diasDePlan(plan.nodos)

  const borrar = async () => {
    if (plan.id == null) return
    const ok = await confirmar({
      titulo: t('cal.plan.borrar', '¿Borrar este plan?'),
      mensaje: plan.nombre,
      textoOk: t('ui.borrar', 'Borrar'),
      peligro: true,
    })
    if (ok) await planesMetaRepo.remove(plan.id)
  }

  const arranque = new Date(plan.inicioISO + 'T12:00').toLocaleDateString(localeActual(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-white/20">
      <div className="flex items-center gap-2">
        {/* Discriminado por estado: el tour necesita abrir una propuesta o el ya
            aceptado sin depender del orden de la lista. */}
        <button
          type="button"
          data-tut={`cal.plan.tarjeta.${aceptado ? 'aceptado' : 'propuesta'}`}
          onClick={onAbrir}
          className="min-w-0 flex-1 text-left"
        >
          {/* De quién es el plan, con el color de su cuarto. El título grande es la
              META: es lo que se busca al recorrer la lista, no «Plan A». */}
          <p
            className="truncate text-[10px] font-bold uppercase tracking-wider texto-vivo"
            style={vivo(carpeta?.color ?? COLOR_PLAN)}
          >
            <Icono nombre="brillo" /> {textoEtiquetaPlan(carpeta, plan.nombre, t)}
          </p>
          <p className="truncate text-base font-semibold text-white/90">
            {origen?.nombre ?? plan.nombre}
          </p>
          {/* La nota de la meta, y si no tiene, el resumen con que la IA lo justificó. */}
          {(origen?.nota || plan.resumen) && (
            <p className="mt-0.5 truncate text-[11px] text-white/35">{origen?.nota || plan.resumen}</p>
          )}
          <p className="mt-0.5 truncate text-[10px] tabular-nums text-white/35">
            {t('cal.plan.fases', '{n} fases', { n: fases })} ·{' '}
            {dias === 0
              ? t('cal.plan.sinPlazo', 'Sin plazo')
              : `${t('cal.plan.duracion', '{n} días', { n: dias })} · ${arranque}`}
          </p>
        </button>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            aceptado ? 'bg-emerald-500/15 text-emerald-300' : 'bg-violet-500/15 text-violet-200'
          }`}
        >
          {aceptado
            ? t('cal.plan.estado.aceptado', 'En tu cronograma')
            : t('cal.plan.estado.propuesta', 'Propuesta')}
        </span>
        <button
          type="button"
          onClick={() => void borrar()}
          title={t('rutinas.borrar', 'Borrar')}
          className="shrink-0 px-0.5 text-white/30 transition hover:text-red-400"
        >
          <Icono nombre="basura" />
        </button>
      </div>

      <button type="button" onClick={onAbrir} className="mt-2 flex w-full items-center gap-2">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.round(avance * 100)}%`, background: aceptado ? '#10b981' : COLOR_PLAN }}
          />
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-white/40">
          {resumen.hechos}/{resumen.total}
        </span>
      </button>
    </div>
  )
}
