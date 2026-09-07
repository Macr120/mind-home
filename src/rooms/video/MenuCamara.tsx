import type { EfectoCamaraId } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { useAsistentes } from '../../core/state/asistentesStore'
import { useCam } from '../../core/state/cameraStore'
import { ES_JUGADOR } from '../../core/state/peliculaStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { Campo, Modal } from '../_shared/ui'
import { emojiActor, nombreActor } from './actores'
import { EFECTOS_CAMARA, nombreEfecto } from './pelicula/efectosCamara'
import { Chip } from './Secciones'

/** El menú «Cámara» del estudio de cine: un movimiento listo desde la cámara actual, o seguir a una marioneta. */
export function MenuCamara({
  onElegir,
  onCerrar,
}: {
  onElegir: (efecto: EfectoCamaraId, seguir?: string) => void
  onCerrar: () => void
}) {
  const t = useT()
  const vista = useCam((s) => s.vista)
  const asistentes = useAsistentes((s) => s.lista)
  const quienes = [ES_JUGADOR, ...asistentes.map((a) => a.id)]
  return (
    <Modal titulo={t('video.pelicula.movimiento', 'Movimiento de cámara')} onCerrar={onCerrar} ancho="max-w-lg">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {EFECTOS_CAMARA.filter((e) => e.id !== 'seguir').map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => onElegir(e.id)}
            className="ui-boton flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 text-[11px] transition hover:bg-white/10"
          >
            <span className="text-xl">
              <Icono nombre={e.icono} />
            </span>
            {nombreEfecto(t, e.id)}
          </button>
        ))}
      </div>
      <Campo etiqueta={nombreEfecto(t, 'seguir')}>
        <div className="flex flex-wrap gap-1.5">
          {quienes.map((id) => (
            <Chip key={id} activo={false} onClick={() => onElegir('seguir', id)}>
              <Icono emoji={emojiActor(id)} /> {nombreActor(t, id)}
            </Chip>
          ))}
        </div>
        {vista !== 'iso' && (
          <p className="mt-1 text-[11px] text-white/45">
            {t('video.pelicula.seguirSoloIso', 'Seguir solo funciona en la vista isométrica; en 1ª/3ª persona la cámara sigue a tu avatar')}
          </p>
        )}
      </Campo>
    </Modal>
  )
}
