import { useMemo, useState } from 'react'
import type { PlanMeta, Rutina } from '../../data/db'
import { planesMetaRepo } from '../../data/repository'
import { localeActual, useT } from '../../i18n/useT'
import { diasDePlan, espejoDePlan, progresoPlan, resumenPlan } from '../../planMeta'
import { confirmar } from '../../state/confirmarStore'
import { colorDe } from '../coloresRutina'
import { vivo } from '../estilos'
import { Icono } from '../iconos/Icono'
import { etiquetasDePlanes, textoEtiquetaPlan, type EtiquetaPlan } from './carpetas'
import { COLOR_PLAN } from '../../../rooms/metas/constantes'
import { VERDE } from '../../../rooms/_shared/acento'
import { BotonPrimario } from '../../../rooms/_shared/ui'

/**
 * El menú Planes: la lista de los cronogramas que la IA ha propuesto para estas
 * metas, antes de pasarlos al cronograma real.
 *
 * Es SOLO la lista: la hoja de un plan y el generador los monta `Cronograma`,
 * porque también se llega a ellos desde el menú Metas y desde el eje. Aquí el
 * único estado propio es «¿para qué meta?», que no sale de esta pantalla.
 *
 * Solo se listan los planes de las metas que esta vista sostiene. Antes el selector
 * del cronograma sacaba TODOS los de la base: dentro de una app aparecían planes de
 * metas de otra, y su botón de aceptar salía gris para siempre porque la meta origen
 * no estaba en la lista.
 */
export function VistaPlanes({
  metas,
  planes,
  metaArmada,
  onAbrirPlan,
  onGenerar,
  onIrACronograma,
}: {
  metas: Rutina[]
  planes: PlanMeta[]
  metaArmada: Rutina | null
  onAbrirPlan: (planId: number) => void
  /** Pide un plan nuevo para esa meta (abre el generador ✨). */
  onGenerar: (meta: Rutina) => void
  onIrACronograma: () => void
}) {
  const t = useT()
  const [eligiendo, setEligiendo] = useState(false)

  const mios = useMemo(() => {
    const ids = new Set(metas.map((m) => m.id))
    return planes
      .filter((p) => ids.has(p.metaId))
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
  }, [planes, metas])

  // Cómo se llama cada plan («Jardín · Plan 1»): lo comparte con el selector y la
  // cabecera del cronograma, así que un plan se llama igual en las dos vistas.
  const carpetas = useMemo(() => etiquetasDePlanes(mios, metas, t), [mios, metas, t])

  // Con una sola meta no hay nada que preguntar; con varias, primero ¿para cuál?
  const nuevoPlan = () => (metas.length === 1 ? onGenerar(metas[0]) : setEligiendo(true))

  return (
    // Sin scroll ni ancho propios: los pone el riel de `Cronograma`, y el scroll
    // es el del cuarto. La cabecera deja el `border-b` de cuando esto era un panel
    // con viewport propio.
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-wider text-white/70">
          <span style={{ color: COLOR_PLAN }}>
            <Icono nombre="brillo" />
          </span>{' '}
          {t('cal.plan.menu', 'Planes')}
        </p>
        {/* Sin condicionar a la IA: el generador ofrece las dos vías y la de a mano
            funciona igual con la IA apagada. */}
        {metas.length > 0 && (
          <BotonPrimario onClick={nuevoPlan} color={COLOR_PLAN} pequeno className="shrink-0">
            + {t('cal.plan.nuevo', 'Nuevo plan')}
          </BotonPrimario>
        )}
      </div>

      <div data-tut="cal.plan.lista" className="space-y-2">
        <p className="text-2xs leading-relaxed text-white/35">
          {t(
            'cal.plan.menuDesc',
            'Un plan es el borrador de un cronograma: se palomea aquí y, cuando convence, sus fases pasan a ser sub-metas reales.',
          )}
        </p>

        {/* Paso previo cuando la vista tiene varias metas: ¿para cuál? */}
        {eligiendo && (
          <div className="space-y-1 rounded-xl border border-plan/30 bg-plan/10 p-2.5">
            <p className="text-2xs font-semibold text-plan/90">
              {t('cal.plan.paraMeta', '¿Para qué meta?')}
            </p>
            {metas.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setEligiendo(false)
                  onGenerar(m)
                }}
                className={`ui-presion flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-xs transition hover:bg-white/10 ${
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
              onClick={() => setEligiendo(false)}
              className="ui-presion w-full rounded-lg py-1 text-2xs text-white/40 transition hover:text-white/75"
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
              className="ui-presion rounded-lg border border-white/15 px-3 py-1 text-2xs font-semibold text-white/70 transition hover:bg-white/10"
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
            onAbrir={() => p.id != null && onAbrirPlan(p.id)}
          />
        ))}
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
          className="ui-presion min-w-0 flex-1 text-start"
        >
          {/* De quién es el plan, con el color de su cuarto. El título grande es la
              META: es lo que se busca al recorrer la lista, no «Plan A». */}
          <p
            className="truncate text-2xs font-bold uppercase tracking-wider texto-vivo"
            style={vivo(carpeta?.color ?? COLOR_PLAN)}
          >
            <Icono nombre="brillo" /> {textoEtiquetaPlan(carpeta, plan.nombre, t)}
          </p>
          <p className="truncate text-base font-semibold text-white/90">
            {origen?.nombre ?? plan.nombre}
          </p>
          {/* La nota de la meta, y si no tiene, el resumen con que la IA lo justificó. */}
          {(origen?.nota || plan.resumen) && (
            <p className="mt-0.5 truncate text-2xs text-white/35">{origen?.nota || plan.resumen}</p>
          )}
          <p className="mt-0.5 truncate text-2xs tabular-nums text-white/35">
            {t('cal.plan.fases', '{n} fases', { n: fases })} ·{' '}
            {dias === 0
              ? t('cal.plan.sinPlazo', 'Sin plazo')
              : `${t('cal.plan.duracion', '{n} días', { n: dias })} · ${arranque}`}
          </p>
        </button>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-2xs font-semibold ${
            aceptado ? 'bg-emerald-500/15 text-emerald-300' : 'bg-plan/15 text-plan'
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
          className="ui-presion shrink-0 px-0.5 text-white/30 transition hover:text-red-400"
        >
          <Icono nombre="basura" />
        </button>
      </div>

      <button type="button" onClick={onAbrir} className="ui-presion mt-2 flex w-full items-center gap-2">
        <div className="ui-presion h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="ui-presion h-full rounded-full"
            style={{ width: `${Math.round(avance * 100)}%`, background: aceptado ? VERDE : COLOR_PLAN }}
          />
        </div>
        <span className="shrink-0 text-2xs tabular-nums text-white/40">
          {resumen.hechos}/{resumen.total}
        </span>
      </button>
    </div>
  )
}
