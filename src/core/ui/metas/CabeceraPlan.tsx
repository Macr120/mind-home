import { useState } from 'react'
import type { PlanMeta } from '../../data/db'
import { planesMetaRepo } from '../../data/repository'
import { useT } from '../../i18n/useT'
import { profundidadDe, raizDe } from '../../metas'
import { aceptarPlan, diasDePlan, origenDePlan, reanclarPlan } from '../../planMeta'
import { confirmar } from '../../state/confirmarStore'
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
  etiqueta,
  onAceptado,
  onBorrado,
  onAbrirHoja,
}: {
  plan: PlanMeta
  /** «Jardín · Plan 1», como en la vista Planes; sin ella, el nombre guardado. */
  etiqueta?: string
  onAceptado: () => void
  onBorrado: () => void
  /** Lleva a la vista Planes, donde el plan se lee entero y se palomea. */
  onAbrirHoja: () => void
}) {
  const t = useT()
  const [verMaterial, setVerMaterial] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const dias = diasDePlan(plan.nodos)
  const aceptado = !!plan.aceptadoEn
  const material = plan.material ?? []

  /**
   * El origen se resuelve al pulsar y contra la BD, no contra las metas de la vista:
   * en un cronograma embebido o con el filtro del calendario puesto, la meta puede
   * no estar en la lista y el botón se quedaba gris para siempre sin decir por qué.
   */
  const aceptar = async () => {
    if (aceptado || ocupado) return
    setOcupado(true)
    try {
      const { metas, origen } = await origenDePlan(plan)
      if (!origen) {
        await confirmar({
          titulo: t('cal.plan.origenPerdido', 'La meta de este plan ya no existe.'),
          textoOk: t('ui.confirmar', 'Confirmar'),
        })
        return
      }
      const ok = await confirmar({
        titulo: t(
          'cal.plan.aceptarConfirma',
          '¿Agregar las {n} sub-metas de «{plan}» a «{meta}»? Las que ya tiene se conservan.',
          { n: plan.nodos.length, plan: etiqueta ?? plan.nombre, meta: origen.nombre },
        ),
        textoOk: t('cal.plan.aceptar', 'Mover a cronograma real'),
      })
      if (!ok) return
      const colorPrincipal = colorDe(raizDe(metas, origen))
      const base = profundidadDe(metas, origen)
      await aceptarPlan(metas, plan, origen, (p) => colorPorProfundidad(colorPrincipal, base + p + 1))
      onAceptado()
    } finally {
      setOcupado(false)
    }
  }

  const borrar = async () => {
    if (plan.id == null) return
    const ok = await confirmar({
      titulo: t('cal.plan.borrar', '¿Borrar este plan?'),
      mensaje: etiqueta ?? plan.nombre,
      textoOk: t('ui.borrar', 'Borrar'),
      peligro: true,
    })
    if (!ok) return
    await planesMetaRepo.remove(plan.id)
    onBorrado()
  }

  return (
    <div className="space-y-1 py-1 pl-1 pr-1">
      <div className="flex items-center gap-1">
        <span className="shrink-0 text-[10px] text-violet-300/80">
          <Icono nombre="brillo" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-violet-200/90">
          {etiqueta ?? plan.nombre}
          <span className="ml-1 font-normal text-white/30">
            {dias > 0 ? t('cal.plan.duracion', '{n} días', { n: dias }) : t('cal.plan.sinPlazo', 'Sin plazo')}
          </span>
        </span>
        <button
          type="button"
          onClick={() => void borrar()}
          title={t('rutinas.borrar', 'Borrar')}
          className="shrink-0 px-0.5 text-[10px] text-white/30 transition hover:text-red-400"
        >
          <Icono nombre="basura" />
        </button>
      </div>

      {/* Los días del plan son relativos: cambiar el arranque lo corre entero sin
          volver a llamar a la IA. Sin nada fechado no hay arranque que corregir —
          las fechas se dan trazando cada fase en su franja. */}
      {dias > 0 && (
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
      )}

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
        disabled={aceptado || ocupado}
        className={`flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-bold transition ${
          aceptado
            ? 'bg-white/5 text-white/35'
            : 'bg-emerald-500/90 text-black hover:bg-emerald-400 disabled:bg-white/5 disabled:text-white/25'
        }`}
      >
        <Icono nombre="hecho" />
        {aceptado ? t('cal.plan.aceptado', 'Ya lo aceptaste') : t('cal.plan.aceptar', 'Mover a cronograma real')}
      </button>

      {/* Aquí solo cabe el plan comprimido en una columna de 19 rem; la hoja es
          donde se lee entero y se palomea. */}
      <button
        type="button"
        onClick={onAbrirHoja}
        className="w-full rounded-lg py-0.5 text-[10px] font-semibold text-violet-300/70 transition hover:text-violet-200"
      >
        {t('cal.plan.abrirHoja', 'Abrir la hoja')}
      </button>
    </div>
  )
}
