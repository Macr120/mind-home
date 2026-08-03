import { useState } from 'react'
import type { PlanMeta, Rutina } from '../../data/db'
import { planesMetaRepo } from '../../data/repository'
import { useT } from '../../i18n/useT'
import { profundidadDe, raizDe } from '../../metas'
import { aceptarPlan, diasDePlan, reanclarPlan } from '../../planMeta'
import { colorDe, colorPorProfundidad } from '../coloresRutina'
import { Icono } from '../iconos/Icono'

/**
 * La fila que encabeza un plan superpuesto: qué plan es, cuándo arranca y los dos
 * botones que deciden su destino (pasarlo al cronograma real, o tirarlo).
 *
 * Aceptar no borra el plan, lo marca: comparar "lo que planeé" contra "cómo va"
 * sigue siendo útil después, y `aceptadoEn` es además lo que impide que un segundo
 * clic duplique todas las sub-metas.
 *
 * "Mover a cronograma real" va en su propia fila, grande y sola: antes compartía
 * renglón con la fecha de arranque y el borrar, tan apretada que costaba
 * encontrarla — es la acción principal del bloque, así que se pinta como tal.
 */
export function CabeceraPlan({
  plan,
  metas,
  onAceptado,
  onBorrado,
}: {
  plan: PlanMeta
  metas: Rutina[]
  onAceptado: () => void
  onBorrado: () => void
}) {
  const t = useT()
  const [verMaterial, setVerMaterial] = useState(false)
  const origen = metas.find((m) => m.id === plan.metaId)
  const dias = diasDePlan(plan.nodos)
  const aceptado = !!plan.aceptadoEn
  const material = plan.material ?? []

  const aceptar = async () => {
    if (!origen || aceptado) return
    const msg = t(
      'cal.plan.aceptarConfirma',
      '¿Agregar las {n} sub-metas de «{plan}» a «{meta}»? Las que ya tiene se conservan.',
      { n: plan.nodos.length, plan: plan.nombre, meta: origen.nombre },
    )
    if (!window.confirm(msg)) return
    const colorPrincipal = colorDe(raizDe(metas, origen))
    const base = profundidadDe(metas, origen)
    await aceptarPlan(metas, plan, origen, (p) => colorPorProfundidad(colorPrincipal, base + p + 1))
    onAceptado()
  }

  const borrar = () => {
    if (plan.id == null) return
    if (!window.confirm(t('cal.plan.borrar', '¿Borrar este plan?'))) return
    void planesMetaRepo.remove(plan.id)
    onBorrado()
  }

  return (
    <div className="space-y-1 py-1 pl-1 pr-1">
      <div className="flex items-center gap-1">
        <span className="shrink-0 text-[10px] text-violet-300/80">
          <Icono nombre="brillo" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-violet-200/90">
          {plan.nombre}
          <span className="ml-1 font-normal text-white/30">{t('cal.plan.duracion', '{n} días', { n: dias })}</span>
        </span>
        <button
          type="button"
          onClick={borrar}
          title={t('rutinas.borrar', 'Borrar')}
          className="shrink-0 px-0.5 text-[10px] text-white/30 transition hover:text-red-400"
        >
          <Icono nombre="basura" />
        </button>
      </div>

      {/* Los días del plan son relativos: cambiar el arranque lo corre entero sin
          volver a llamar a la IA. */}
      <div className="flex items-center gap-1">
        <span className="shrink-0 text-[9px] text-white/30">{t('cal.plan.arranque', 'Arranca')}</span>
        <input
          type="date"
          value={plan.inicioISO}
          onChange={(e) => void reanclarPlan(plan, e.target.value)}
          title={t('cal.plan.reanclar', 'Cambia el arranque: el plan entero se corre, sin volver a llamar a la IA')}
          className="w-[86px] shrink-0 rounded border border-white/10 bg-black/30 px-1 py-0.5 text-[9px] tabular-nums text-white/60 focus:outline-none"
        />
      </div>

      {/* El material del plan (recetas y su porqué) sigue consultable aquí, incluso
          después de aceptarlo: el plan no se borra, se marca. */}
      {material.length > 0 && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setVerMaterial((v) => !v)}
            className="w-full text-left text-[9px] text-white/40 transition hover:text-white/70"
          >
            {verMaterial ? '▾' : '▸'} {t('cal.plan.material.n', 'Material del plan ({n})', { n: material.length })}
          </button>
          {verMaterial &&
            material.map((m) => (
              <div key={m.nombre} className="rounded bg-black/20 px-1.5 py-1">
                <div className="flex items-baseline gap-1">
                  <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-white/80">{m.nombre}</span>
                  {m.rutina && <span className="shrink-0 text-[9px] text-white/35">{m.rutina}</span>}
                </div>
                {m.motivo && <p className="text-[9px] leading-snug text-white/40">{m.motivo}</p>}
              </div>
            ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => void aceptar()}
        disabled={aceptado || !origen}
        className={`flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-bold transition ${
          aceptado
            ? 'bg-white/5 text-white/35'
            : 'bg-emerald-500/90 text-black hover:bg-emerald-400 disabled:bg-white/5 disabled:text-white/25'
        }`}
      >
        <Icono nombre="hecho" />
        {aceptado ? t('cal.plan.aceptado', 'Ya lo aceptaste') : t('cal.plan.aceptar', 'Mover a cronograma real')}
      </button>
    </div>
  )
}
