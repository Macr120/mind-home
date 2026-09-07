import type { MedioVideo } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { TARJETA } from '../_shared/ui'
import { clipsDe, fin, type ProyectoAbierto } from './modelo'
import { etiquetaEfecto } from './pelicula/efectosCamara'

/**
 * El guion: una tarjeta por clip de la pista principal, con lo que solapa
 * (textos y narraciones) y los botones subir/bajar/duplicar/borrar — el
 * reordenar por botones es la alternativa táctil al arrastre.
 */
export function Guion({
  proyecto,
  medios,
  seleccion,
  onSeleccion,
  onMover,
  onDuplicar,
  onBorrar,
}: {
  proyecto: ProyectoAbierto
  medios: MedioVideo[]
  seleccion: string | null
  onSeleccion: (id: string) => void
  onMover: (id: string, delta: number) => void
  onDuplicar: (id: string) => void
  onBorrar: (id: string) => void
}) {
  const t = useT()
  const porId = new Map(medios.filter((m) => m.id != null).map((m) => [m.id!, m]))
  const principales = clipsDe(proyecto.clips, 'video')
  if (principales.length === 0) {
    return <p className="px-2 py-4 text-center text-xs text-white/35">{t('video.guion.vacio', 'El guion está vacío')}</p>
  }
  return (
    <div className="space-y-1.5">
      {principales.map((c, i) => {
        const fuente =
          c.fuente.tipo === 'color'
            ? t('video.guion.color', 'Color')
            : c.fuente.tipo === 'escena3d'
              ? [t('video.pelicula.planoN', 'Plano {n}', { n: i + 1 }), etiquetaEfecto(t, c.fuente)].filter(Boolean).join(' · ')
              : (porId.get(c.fuente.medioId)?.nombre ?? t('video.medios.noDisponible', 'Medio no disponible en este dispositivo'))
        const solapa = proyecto.clips.filter((k) => k.inicio < fin(c) && fin(k) > c.inicio)
        const texto = solapa.find((k) => k.pista === 'texto')
        const voz = solapa.some((k) => k.pista === 'voz' || k.pista === 'avatar')
        const resumen = [
          `${Math.round(c.duracion * 10) / 10}s`,
          fuente,
          texto?.pista === 'texto' && texto.texto.contenido ? `«${texto.texto.contenido.slice(0, 26)}»` : '',
          c.transicion && c.transicion.tipo !== 'corte' ? t('video.escena.transicion', 'Transición de entrada') : '',
          voz ? t('video.escena.narracion', 'Narración') : '',
        ]
          .filter(Boolean)
          .join(' · ')
        return (
          <div key={c.id} className={`${TARJETA} flex items-center gap-2 p-2 ${c.id === seleccion ? 'border-white/40' : ''}`}>
            <button type="button" onClick={() => onSeleccion(c.id)} className="min-w-0 flex-1 text-left">
              <p className="text-[11px] font-semibold text-white/80">
                {i + 1}. {resumen}
              </p>
            </button>
            <button
              type="button"
              onClick={() => onMover(c.id, -1)}
              disabled={i === 0}
              aria-label={t('video.guion.subir', 'Subir')}
              title={t('video.guion.subir', 'Subir')}
              className="rounded px-1 text-white/40 transition hover:bg-white/10 disabled:opacity-30"
            >
              <Icono nombre="subir" />
            </button>
            <button
              type="button"
              onClick={() => onMover(c.id, 1)}
              disabled={i === principales.length - 1}
              aria-label={t('video.guion.bajar', 'Bajar')}
              title={t('video.guion.bajar', 'Bajar')}
              className="rounded px-1 text-white/40 transition hover:bg-white/10 disabled:opacity-30"
            >
              <Icono nombre="bajar" />
            </button>
            <button
              type="button"
              onClick={() => onDuplicar(c.id)}
              aria-label={t('video.guion.duplicar', 'Duplicar')}
              title={t('video.guion.duplicar', 'Duplicar')}
              className="rounded px-1 text-white/40 transition hover:bg-white/10"
            >
              <Icono nombre="duplicar" />
            </button>
            <button
              type="button"
              onClick={() => onBorrar(c.id)}
              aria-label={t('video.escena.borrar', 'Borrar la escena')}
              title={t('video.escena.borrar', 'Borrar la escena')}
              className="rounded px-1 text-white/40 transition hover:bg-white/10 hover:text-red-400"
            >
              <Icono nombre="basura" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
