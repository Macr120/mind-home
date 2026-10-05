import { useState } from 'react'
import type { GrabacionAudio } from '../../core/data/db'
import { grabacionesAudioRepo, VACIO } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { Modal } from '../_shared/ui'
import { MAX_CLIPS_POR_PISTA } from './constantes'

const duracionCorta = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/**
 * Modal del editor: meter en la pista de audio una grabación que ya existe
 * (tomas, mezclas y loops del mezclador), las veces seguidas que se pida.
 */
export function ElegirGrabacion({
  libres,
  onElegir,
  onCerrar,
}: {
  /** Huecos que le quedan a la pista (tope de clips): acota las repeticiones. */
  libres: number
  onElegir: (g: GrabacionAudio, veces: number) => void
  onCerrar: () => void
}) {
  const t = useT()
  const grabaciones = grabacionesAudioRepo.useAll() ?? VACIO
  const [veces, setVeces] = useState(1)
  const opciones = [1, 2, 4, 8].filter((n) => n <= libres)

  return (
    <Modal titulo={t('audio.grab.agregarExistente', 'Añadir una grabación')} onCerrar={onCerrar}>
      {libres <= 0 ? (
        <p className="text-xs text-white/60">
          {t('audio.grab.llenaMsg', 'Una pista de audio admite {n} tomas; quita alguna para grabar otra.', {
            n: MAX_CLIPS_POR_PISTA,
          })}
        </p>
      ) : grabaciones.length === 0 ? (
        <p className="text-xs text-white/45">
          {t('audio.grab.sinGrabaciones', 'Aún no hay grabaciones: graba una toma aquí o una mezcla o un loop en Mezclar.')}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-white/50">{t('audio.grab.repetir', 'Repetir')}</span>
            {opciones.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setVeces(n)}
                aria-pressed={veces === n}
                className={`ui-boton rounded-md px-2.5 py-1 text-xs font-bold tabular-nums ${
                  veces === n ? 'ui-accent-bg' : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                {t('audio.grab.veces', '×{n}', { n })}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/45">
            {t('audio.grab.agregarHint', 'Entra donde está el marcador de inicio; las repeticiones van pegadas, ideal para loops.')}
          </p>
          <ul className="space-y-1">
            {grabaciones.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onElegir(g, Math.min(veces, libres))}
                  className="flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition hover:bg-white/10 active:bg-white/10"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10">
                    <Icono nombre="microfono" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{g.nombre}</span>
                    <span className="block text-xs text-white/45">{duracionCorta(g.duracionSeg)}</span>
                  </span>
                  <Icono nombre="agregar" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  )
}
