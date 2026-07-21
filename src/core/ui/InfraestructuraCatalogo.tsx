import { plantillasInfraestructura, DESCRIPCIONES } from '../registry'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { caminosRepo, cultivosRepo, animalesRepo } from '../data/repository'
import { useDiseño } from '../state/disenoStore'
import { esCancha } from '../state/canchasStore'

/**
 * Catálogo de plantillas de infraestructura: no se asignan a cuartos, se
 * construyen sobre el mapa 3D con su propio editor (Caminos, Canchas, Huerto).
 */
export function InfraestructuraCatalogo({ alConstruir }: { alConstruir: () => void }) {
  const t = useT()
  const caminos = caminosRepo.useAll() ?? []
  const cultivos = cultivosRepo.useAll() ?? []
  const animales = animalesRepo.useAll() ?? []
  const objetos = useDiseño((s) => s.objetos)
  // Piezas construidas por plantilla (tramos / canchas / parcelas / animales).
  const conteos: Record<string, number> = {
    caminos: caminos.length,
    canchas: objetos.filter((o) => esCancha(o.tipo)).length,
    huerto: cultivos.length,
    granja: animales.length,
  }
  return (
    <div className="space-y-2 px-1">
      <p className="px-1 text-[11px] leading-snug text-white/45">
        {t('infra.ayuda', 'Estas plantillas no viven en un cuarto: se construyen sobre el mapa 3D con su propio editor.')}
      </p>
      {plantillasInfraestructura().map((p) => (
        <section key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl"
              style={{ background: `${p.color}33` }}
            >
              <Icono emoji={p.icon} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-white/90">
                {t(`room.${p.id}.nombre`, p.nombre)}
              </div>
              <div className="text-[10px] text-white/40">
                {t('infra.construidas', 'Construidas')}: {conteos[p.id] ?? 0}
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-white/55">
            {t(`room.${p.id}.desc`, DESCRIPCIONES[p.id] ?? '')}
          </p>
          <button
            type="button"
            data-tut={`infra.construir.${p.id}`}
            onClick={() => {
              alConstruir()
              p.construir?.()
            }}
            className="mt-2 h-8 w-full rounded-lg text-xs font-bold text-white transition hover:brightness-110"
            style={{ background: `${p.color}cc` }}
          >
            <Icono nombre="construir" /> {t('infra.construir', 'Construir en el mapa')}
          </button>
        </section>
      ))}
    </div>
  )
}
