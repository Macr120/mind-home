import { useState, type ReactNode } from 'react'
import { PlanoControles } from './PlanoControles'
import { PlanoPanelProps } from './PlanoPanelProps'
import { PlanosEditor } from './PlanosEditor'
import { EditorFondoSection } from '../editor/EditorFondoSection'
import { EditorMapaSuperficieSection } from './EditorMapaSuperficieSection'
import { usePlanos } from '../../state/planosStore'
import { useT } from '../../i18n/useT'

/** Bloque fijo del panel lateral (misma estética que EditorSeccion). */
function BloqueEditor({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className="min-h-[34px] border-b border-white/10 bg-black/15 px-3 py-2">
        <span className="text-xs font-semibold text-white/80">{titulo}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

/** Panel de planos integrado en Editar mapa (controles + propiedades de selección). */
export function EditorPlanosPanel() {
  const t = useT()
  const menuPlano = usePlanos((s) => s.menuPlano)
  const setMenuPlano = usePlanos((s) => s.setMenuPlano)
  const [croquisVisible, setCroquisVisible] = useState(false)

  return (
    <div className="space-y-3">
      {/* Croquis 2D de referencia (opcional): se edita en 3D y aquí queda el plano para detalle. */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <button
          type="button"
          onClick={() => setCroquisVisible((v) => !v)}
          className="flex min-h-[34px] w-full items-center justify-between border-b border-white/10 bg-black/15 px-3 py-2 text-left"
        >
          <span className="text-xs font-semibold text-white/80">
            {t('planos.bloque.croquis', 'Croquis (2D)')}
          </span>
          <span className="text-[11px] text-white/45">
            {croquisVisible ? t('planos.ocultar', 'Ocultar') : t('planos.mostrar', 'Mostrar')}
          </span>
        </button>
        {croquisVisible && (
          <div className="relative h-64 w-full bg-stone-200">
            <PlanosEditor compacto />
          </div>
        )}
      </div>

      {menuPlano === 'cielo' && (
        <BloqueEditor titulo={t('planos.menu.cieloTitulo', 'Fondo de cielo')}>
          <p className="mb-3 text-[11px] leading-snug text-white/45">
            {t(
              'planos.menu.cieloDesc',
              'Cambia el cielo del mapa 3D y el margen del croquis.',
            )}
          </p>
          <EditorFondoSection embed />
          <button
            type="button"
            onClick={() => setMenuPlano(null)}
            className="mt-3 w-full rounded-lg border border-white/10 py-2 text-[11px] text-white/50 transition hover:bg-white/5 hover:text-white/75"
          >
            {t('planos.menu.cerrar', 'Cerrar')}
          </button>
        </BloqueEditor>
      )}

      {menuPlano === 'superficie' && (
        <BloqueEditor titulo={t('planos.superficie.titulo', 'Superficie del mapa')}>
          <EditorMapaSuperficieSection embed />
          <button
            type="button"
            onClick={() => setMenuPlano(null)}
            className="mt-3 w-full rounded-lg border border-white/10 py-2 text-[11px] text-white/50 transition hover:bg-white/5 hover:text-white/75"
          >
            {t('planos.menu.cerrar', 'Cerrar')}
          </button>
        </BloqueEditor>
      )}

      <BloqueEditor titulo={t('planos.bloque.herramientas', 'Herramientas de plano')}>
        <PlanoControles />
      </BloqueEditor>
      <BloqueEditor titulo={t('planos.bloque.seleccion', 'Selección')}>
        <PlanoPanelProps />
      </BloqueEditor>
    </div>
  )
}
