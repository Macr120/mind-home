import type { EfectosPista, PistaAudio } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { FX_DEFAULT } from './constantes'
import { Knob } from './Knob'
import * as motor from './motor'

/**
 * Panel de la pista de audio (ocupa el lugar del sinte + teclado, que ahí no
 * pintan nada): el consejo de grabación y los efectos que colorean sus clips.
 */
export function PanelClips({
  pista,
  onFx,
  bloqueado,
}: {
  pista: PistaAudio
  onFx: (fx: EfectosPista) => void
  /** Compartido y sin el turno: los efectos se ven, pero no se tocan. */
  bloqueado?: boolean
}) {
  const t = useT()
  const fx = pista.efectos ?? FX_DEFAULT
  const knobFx = (clave: keyof EfectosPista, etiqueta: string) => (
    <Knob
      valor={fx[clave]}
      def={0}
      etiqueta={etiqueta}
      onCambio={(v) => motor.ajustarFxEnVivo(pista.pistaId, { ...fx, [clave]: v })}
      onCommit={(v) => onFx({ ...fx, [clave]: v })}
    />
  )
  return (
    <div
      aria-disabled={bloqueado}
      className={`flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 ${
        bloqueado ? 'pointer-events-none opacity-40' : ''
      }`}
    >
      <p className="min-w-44 flex-1 text-xs leading-relaxed text-white/60">
        <Icono nombre="microfono" />{' '}
        {t(
          'audio.grab.consejo',
          'Pulsa el botón de grabar para cantar o tocar con el micrófono mientras suenan las demás pistas (hay un compás de cuenta). Usa audífonos: sin ellos el metrónomo se cuela en la toma.',
        )}
      </p>
      <div className="flex shrink-0 items-start gap-1">
        {knobFx('reverb', t('audio.fx.reverb', 'Reverb'))}
        {knobFx('delay', t('audio.fx.delay', 'Delay'))}
        {knobFx('chorus', t('audio.fx.chorus', 'Chorus'))}
        {knobFx('dist', t('audio.fx.dist', 'Distorsión'))}
      </div>
    </div>
  )
}
