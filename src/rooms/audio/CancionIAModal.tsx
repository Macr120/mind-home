import { useState, type ReactNode } from 'react'
import { mensajeErrorIA } from '../../core/cuenta/api'
import { useT } from '../../core/i18n/useT'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario, Campo, INPUT, Modal, Spinner } from '../_shared/ui'
import type { PistaAudio } from '../../core/data/db'
import { componerCancion, type CancionCompuesta, type DuracionCancion } from './cancionIA'
import { COLOR } from './constantes'
import { OP_CANCION, OP_VOZ_REAL } from './costosIA'
import { producirVersionCantada } from './lyria'

/** Chip de opción única (mismo estilo que los de `ElegirGrabacion`). */
function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`ui-boton rounded-md px-2.5 py-1 text-xs font-bold ${activo ? 'ui-accent-bg' : 'bg-white/10 hover:bg-white/15'}`}
    >
      {children}
    </button>
  )
}

/**
 * «Canción con IA»: de una descripción (y la letra, si el usuario trae la suya)
 * a un proyecto multipista completo. Quien lo abre guarda y abre el resultado.
 */
export function CancionIAModal({
  onCreada,
  onCerrar,
}: {
  /** `cantada` = la pista de Lyria; `errorVoz` si se pidió y falló (la canción MIDI se crea igual). */
  onCreada: (c: CancionCompuesta, extra: { cantada?: PistaAudio; errorVoz?: string }) => Promise<void>
  onCerrar: () => void
}) {
  const t = useT()
  const [descripcion, setDescripcion] = useState('')
  const [conVoz, setConVoz] = useState(true)
  const [letra, setLetra] = useState('')
  const [duracion, setDuracion] = useState<DuracionCancion>('media')
  const [producir, setProducir] = useState(false)
  const [ocupado, setOcupado] = useState<'' | 'midi' | 'voz'>('')
  const [error, setError] = useState('')

  const componer = async () => {
    setError('')
    setOcupado('midi')
    let c: CancionCompuesta
    try {
      c = await componerCancion({ descripcion, letra: conVoz ? letra : '', conVoz, duracion })
    } catch (e) {
      setError(mensajeErrorIA(e, t))
      setOcupado('')
      return
    }
    if (!producir) return onCreada(c, {})
    setOcupado('voz')
    try {
      const ahora = new Date().toISOString()
      const cantada = await producirVersionCantada({ ...c, creadoEn: ahora, actualizadoEn: ahora }, c.estilo, conVoz)
      await onCreada(c, { cantada })
    } catch (e) {
      await onCreada(c, { errorVoz: mensajeErrorIA(e, t) })
    }
  }

  return (
    <Modal titulo={t('audio.cancionIA.titulo', 'Canción completa con IA')} onCerrar={ocupado ? () => {} : onCerrar}>
      <Campo etiqueta={t('audio.cancionIA.desc', 'Describe la canción: estilo, ánimo y de qué trata')}>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          maxLength={600}
          placeholder={t('audio.cancionIA.descPh', 'Un reggaetón alegre sobre el verano en la playa… / una balada de piano triste…')}
          className={INPUT}
        />
      </Campo>

      <div className="flex flex-wrap items-center gap-1.5">
        <Chip activo={conVoz} onClick={() => setConVoz(true)}>
          <Icono nombre="microfono" /> {t('audio.cancionIA.conVoz', 'Con voz y letra')}
        </Chip>
        <Chip activo={!conVoz} onClick={() => setConVoz(false)}>
          <Icono nombre="piano" /> {t('audio.cancionIA.instrumental', 'Instrumental')}
        </Chip>
      </div>

      {conVoz && (
        <Campo etiqueta={t('audio.cancionIA.letra', 'Tu letra (opcional: si la dejas vacía, la escribe la IA)')}>
          <textarea
            value={letra}
            onChange={(e) => setLetra(e.target.value)}
            rows={4}
            maxLength={3000}
            className={INPUT}
          />
        </Campo>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-white/50">{t('audio.cancionIA.duracion', 'Duración')}</span>
        <Chip activo={duracion === 'corta'} onClick={() => setDuracion('corta')}>
          {t('audio.cancionIA.corta', 'Corta')}
        </Chip>
        <Chip activo={duracion === 'media'} onClick={() => setDuracion('media')}>
          {t('audio.cancionIA.media', 'Media')}
        </Chip>
        <Chip activo={duracion === 'larga'} onClick={() => setDuracion('larga')}>
          {t('audio.cancionIA.larga', 'Larga')}
        </Chip>
      </div>

      <label className="flex items-start gap-2 text-xs text-white/70">
        <input type="checkbox" checked={producir} onChange={(e) => setProducir(e.target.checked)} className="mt-0.5" />
        <span>
          {conVoz
            ? t('audio.lyria.tambienVoz', 'Producir también la versión cantada con voz real')
            : t('audio.lyria.tambienInstr', 'Producir también la versión con instrumentos reales')}{' '}
          <Creditos op={OP_VOZ_REAL} />
        </span>
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}
      <BotonPrimario
        className="w-full"
        app={COLOR}
        disabled={!!ocupado || !descripcion.trim()}
        onClick={() => void componer()}
      >
        {ocupado ? <Spinner pequeno /> : <Icono nombre="brillo" />}{' '}
        {ocupado === 'voz'
          ? t('audio.lyria.produciendo', 'Produciendo la versión con voz… (alrededor de un minuto)')
          : ocupado
            ? t('audio.cancionIA.componiendo', 'Componiendo…')
            : t('audio.cancionIA.componer', 'Componer canción')}{' '}
        {!ocupado && <Creditos op={OP_CANCION} />}
      </BotonPrimario>
      <p className="text-xs text-white/40">
        {t(
          'audio.cancionIA.nota',
          'Crea intro, versos, coros y puente con batería, bajo, acordes, melodía y coros, todo editable. La voz es un sintetizador que entona la melodía; la letra queda en el botón Letra del editor.',
        )}
      </p>
    </Modal>
  )
}
