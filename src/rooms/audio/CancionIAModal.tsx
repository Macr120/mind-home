import { useState, type ReactNode } from 'react'
import { costoOperacion } from '../../core/cuenta/catalogoIA'
import { mensajeErrorIA } from '../../core/cuenta/api'
import { IDIOMAS, datosIdioma } from '../../core/i18n/idiomas'
import { idiomaActual, useT } from '../../core/i18n/useT'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario, Campo, INPUT, Modal, Spinner } from '../_shared/ui'
import type { PistaAudio } from '../../core/data/db'
import { VOZ_LYRIA, componerCancion, segundosMaximos, type CancionCompuesta, type VozCancion } from './cancionIA'
import { BPM_MIN, COLOR } from './constantes'
import { OP_CANCION, OP_VOZ_REAL } from './costosIA'
import { producirConLyria, producirVersionCantada, promptLyriaDirecto } from './lyria'

/** Tope del tempo al componer (el editor llega a 240, pero una canción a más de 180 casi no cabe en 64 compases). */
const BPM_TOPE = 180

/** Una opción por fila: el MIDI editable (4 créditos) y el audio de Lyria (16), que ya trae su propia música. */
export type SalidaMidi = '' | 'instr' | 'sinte'
export type SalidaLyria = '' | 'instr' | 'voz'

/**
 * Lo que recibe quien guarda: una sola canción. Con MIDI y Lyria, el audio de
 * Lyria entra como pista y el MIDI queda silenciado debajo para retocarlo; si
 * Lyria falla, `errorLyria` y el MIDI suena solo.
 */
export interface ResultadoCancion {
  midi: SalidaMidi
  lyria: SalidaLyria
  pistaLyria?: PistaAudio
  errorLyria?: string
}

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
  onCreada: (c: CancionCompuesta, r: ResultadoCancion) => Promise<void>
  onCerrar: () => void
}) {
  const t = useT()
  const [descripcion, setDescripcion] = useState('')
  const [midi, setMidi] = useState<SalidaMidi>('sinte')
  const [lyria, setLyria] = useState<SalidaLyria>('')
  const conVoz = midi === 'sinte' || lyria === 'voz'
  const [letra, setLetra] = useState('')
  const [segundos, setSegundos] = useState(120)
  /** Lo que se teclea; vacío o fuera de rango = el tempo lo elige la IA según el estilo. */
  const [bpmTexto, setBpmTexto] = useState('')
  const bpmTecleado = Math.round(Number(bpmTexto))
  const bpm = bpmTexto && bpmTecleado >= BPM_MIN && bpmTecleado <= BPM_TOPE ? bpmTecleado : null
  const [idioma, setIdioma] = useState(idiomaActual())
  const [quien, setQuien] = useState<VozCancion>('mujer')
  /** Con el tempo fijado, la duración pedida puede no caber en los 64 compases del editor (solo importa con MIDI). */
  const tope = bpm && midi ? segundosMaximos(bpm) : null
  const [ocupado, setOcupado] = useState<'' | 'midi' | 'voz'>('')
  const [error, setError] = useState('')

  const componer = async () => {
    setError('')
    const estiloVoz = [descripcion.trim(), conVoz ? VOZ_LYRIA[quien] : ''].filter(Boolean).join('. ')
    // Solo Lyria: sin composición; Lyria escribe la letra si no hay del usuario.
    if (!midi) {
      setOcupado('voz')
      try {
        const nombre = descripcion.trim().split('\n')[0].slice(0, 40)
        const pistaLyria = await producirConLyria(
          promptLyriaDirecto({
            estilo: lyria === 'voz' ? estiloVoz : descripcion,
            letra: lyria === 'voz' ? letra : '',
            conVoz: lyria === 'voz',
            segundos,
            bpm: bpm ?? undefined,
            idioma: datosIdioma(idioma).endonimo,
          }),
          nombre,
          lyria === 'voz',
        )
        const c: CancionCompuesta = {
          nombre,
          estilo: estiloVoz,
          estiloInstrumental: descripcion.trim(),
          bpm: bpm ?? 120,
          compases: 1,
          swing: 0,
          letra: lyria === 'voz' ? letra.trim() : '',
          pistas: [],
          pistasInstrumental: [],
        }
        await onCreada(c, { midi, lyria, pistaLyria })
      } catch (e) {
        setError(mensajeErrorIA(e, t))
        setOcupado('')
      }
      return
    }
    setOcupado('midi')
    let c: CancionCompuesta
    try {
      c = await componerCancion({
        descripcion,
        letra: conVoz ? letra : '',
        conVoz,
        segundos: tope ? Math.min(segundos, tope) : segundos,
        bpm: bpm ?? undefined,
        idioma: datosIdioma(idioma).nombreIA,
        voz: quien,
      })
    } catch (e) {
      setError(mensajeErrorIA(e, t))
      setOcupado('')
      return
    }
    if (!lyria) return onCreada(c, { midi, lyria })
    setOcupado('voz')
    try {
      const ahora = new Date().toISOString()
      const pistaLyria =
        lyria === 'voz'
          ? await producirVersionCantada({ ...c, creadoEn: ahora, actualizadoEn: ahora }, c.estilo, true)
          : await producirVersionCantada(
              { ...c, pistas: c.pistasInstrumental, creadoEn: ahora, actualizadoEn: ahora },
              c.estiloInstrumental,
              false,
            )
      await onCreada(c, { midi, lyria, pistaLyria })
    } catch (e) {
      await onCreada(c, { midi, lyria, errorLyria: mensajeErrorIA(e, t) })
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

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-full text-xs text-white/50 sm:w-40">{t('audio.cancionIA.grupoMidi', 'MIDI editable (compone la IA)')} <Creditos n={costoOperacion(OP_CANCION)} /></span>
          <Chip activo={midi === 'instr'} onClick={() => setMidi((v) => (v === 'instr' ? '' : 'instr'))}>
            <Icono nombre="piano" /> {t('audio.cancionIA.vozInstrumental', 'Instrumental')}
          </Chip>
          <Chip activo={midi === 'sinte'} onClick={() => setMidi((v) => (v === 'sinte' ? '' : 'sinte'))}>
            <Icono nombre="sintetizador" /> {t('audio.cancionIA.vozSinte', 'Voz sintetizada')}
          </Chip>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-full text-xs text-white/50 sm:w-40">{t('audio.cancionIA.grupoLyria', 'Audio producido (Google Lyria)')} <Creditos n={costoOperacion(OP_VOZ_REAL)} /></span>
          <Chip activo={lyria === 'instr'} onClick={() => setLyria((v) => (v === 'instr' ? '' : 'instr'))}>
            <Icono nombre="musica" /> {t('audio.cancionIA.vozInstrumental', 'Instrumental')}
          </Chip>
          <Chip activo={lyria === 'voz'} onClick={() => setLyria((v) => (v === 'voz' ? '' : 'voz'))}>
            <Icono nombre="microfono" /> {t('audio.cancionIA.vozReal', 'Voz real')}
          </Chip>
        </div>
        <p className="text-[11px] text-white/45">
          {t('audio.cancionIA.salidasNota', 'Una de cada fila como máximo. Lyria ya trae su música; si eliges las dos, el MIDI queda silenciado debajo para retocarlo. Lyria tarda alrededor de un minuto.')}
        </p>
      </div>

      {conVoz && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip activo={quien === 'mujer'} onClick={() => setQuien('mujer')}>
            {t('audio.cancionIA.mujer', 'Mujer')}
          </Chip>
          <Chip activo={quien === 'hombre'} onClick={() => setQuien('hombre')}>
            {t('audio.cancionIA.hombre', 'Hombre')}
          </Chip>
          <Chip activo={quien === 'dueto'} onClick={() => setQuien('dueto')}>
            {t('audio.cancionIA.dueto', 'Dueto')}
          </Chip>
          <select
            value={idioma}
            onChange={(e) => setIdioma(e.target.value as typeof idioma)}
            aria-label={t('audio.cancionIA.idioma', 'Idioma de la letra')}
            title={t('audio.cancionIA.idioma', 'Idioma de la letra')}
            className="ms-auto rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs outline-none"
          >
            {IDIOMAS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.endonimo}
              </option>
            ))}
          </select>
        </div>
      )}

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
        {[60, 120, 180].map((seg) => (
          <Chip key={seg} activo={segundos === seg} onClick={() => setSegundos(seg)}>
            {t('audio.cancionIA.minutos', '{n} min', { n: seg / 60 })}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-white/50">{t('audio.cancionIA.tempo', 'Tempo')}</span>
        <Chip activo={bpm == null} onClick={() => setBpmTexto('')}>
          {t('audio.cancionIA.tempoAuto', 'Auto')}
        </Chip>
        <input
          type="number"
          min={BPM_MIN}
          max={BPM_TOPE}
          step={1}
          value={bpmTexto}
          placeholder={t('audio.cancionIA.bpm', 'BPM')}
          aria-label={t('audio.cancionIA.bpm', 'BPM')}
          onChange={(e) => setBpmTexto(e.target.value)}
          // Al salir se ajusta al rango (mientras se teclea «8» camino de «84» no se toca).
          onBlur={() =>
            setBpmTexto((v) => (v && Number.isFinite(Number(v)) ? String(Math.max(BPM_MIN, Math.min(BPM_TOPE, Math.round(Number(v))))) : ''))
          }
          className="w-20 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs tabular-nums outline-none"
        />
        {tope != null && segundos > tope && (
          <span className="text-[11px] text-amber-300">
            {t('audio.cancionIA.tope', 'A {bpm} BPM caben {m}:{s} como máximo.', {
              bpm: bpm!,
              m: Math.floor(tope / 60),
              s: String(tope % 60).padStart(2, '0'),
            })}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <BotonPrimario
        className="w-full"
        app={COLOR}
        disabled={!!ocupado || !descripcion.trim() || (!midi && !lyria)}
        onClick={() => void componer()}
      >
        {ocupado ? <Spinner pequeno /> : <Icono nombre="brillo" />}{' '}
        {ocupado === 'voz'
          ? t('audio.cancionIA.produciendoLyria', 'Produciendo con Lyria… (alrededor de un minuto)')
          : ocupado
            ? t('audio.cancionIA.componiendo', 'Componiendo…')
            : t('audio.cancionIA.componer', 'Componer canción')}{' '}
        {!ocupado && (
          <Creditos n={(midi ? costoOperacion(OP_CANCION) : 0) + (lyria ? costoOperacion(OP_VOZ_REAL) : 0)} />
        )}
      </BotonPrimario>
      <p className="text-xs text-white/40">
        {t(
          'audio.cancionIA.nota',
          'Crea intro, versos, coros y puente con batería, bajo, acordes, melodía y coros, todo editable. La letra queda en el botón Letra del editor.',
        )}
      </p>
    </Modal>
  )
}
