import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { leerMarcadorPaintball } from '../../core/state/paintballStore'

/** Resumen 2D del Paintball: marcador de batallas y cómo se juega. */
export function Resumen() {
  const t = useT()
  const marcador = leerMarcadorPaintball()
  return (
    <div className="mx-auto flex h-full max-w-md flex-col gap-3 p-4">
      <p className="text-sm text-white/60">
        {t('paintball.resumen.ayuda', 'Este modo se juega en el mapa 3D: menú → Plantillas → Complementos → Jugar.')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div className="text-2xl">
            <Icono nombre="trofeo" />
          </div>
          <div className="mt-1 text-2xl font-black text-white/90">{marcador.victorias}</div>
          <div className="mt-0.5 text-[11px] leading-tight text-white/55">
            {t('paintball.marcador', 'Victorias')}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div className="text-2xl">
            <Icono nombre="paintball" />
          </div>
          <div className="mt-1 text-2xl font-black text-white/90">{marcador.derrotas}</div>
          <div className="mt-0.5 text-[11px] leading-tight text-white/55">
            {t('paintball.derrotas', 'Derrotas')}
          </div>
        </div>
      </div>
      <p className="text-xs text-white/40">
        {t('paintball.resumen.nota', 'Elige 1 vs 1, 2 vs 2 o batalla campal contra tus asistentes: cada quien aguanta 3 bolazos y la casa entera es el campo de batalla.')}
      </p>
    </div>
  )
}
