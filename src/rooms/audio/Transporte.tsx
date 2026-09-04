import { useEffect, useState, useSyncExternalStore } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario, Spinner } from '../_shared/ui'
import { BPM_MAX, BPM_MIN, COLOR, MAX_COMPASES, PASOS_POR_COMPAS, segPorPaso } from './constantes'
import { alternarPreviaMetronomo, posicion, previaStore, transporteStore } from './motor'

/**
 * Barra de transporte: play/stop/grabar siempre a la vista y el resto en dos
 * grupos plegables — «Ritmo» (metrónomo, bucle, cuantizar, BPM, compases) y
 * «Extras» (MIDI, WAV, IA) — para que en angosto la barra no se desborde.
 */
export function Transporte({
  nombre,
  onCerrar,
  bpm,
  compases,
  pulsos,
  posInicio,
  onBpm,
  onCompases,
  onPulsos,
  onRegresar,
  metronomo,
  onMetronomo,
  loopActivo,
  onLoopActivo,
  cuantizar,
  onCuantizar,
  midiNombre,
  haySoporte,
  onConectarMidi,
  onPlay,
  onDetener,
  onGrabar,
  onExportar,
  exportando,
  onIA,
  onDeshacerIA,
}: {
  /** Nombre del proyecto: es el botón de volver a la lista (ahorra el encabezado). */
  nombre: string
  onCerrar: () => void
  bpm: number
  compases: number
  /** Pulsaciones del metrónomo por compás (2 | 4 | 8 | 16). */
  pulsos: number
  /** Paso donde arrancará el play (el contador lo muestra estando parado). */
  posInicio: number
  onBpm: (v: number) => void
  onCompases: (v: number) => void
  onPulsos: (v: number) => void
  /** Regresar el transporte al compás 1. */
  onRegresar: () => void
  metronomo: boolean
  onMetronomo: () => void
  loopActivo: boolean
  onLoopActivo: () => void
  cuantizar: boolean
  onCuantizar: () => void
  midiNombre: string | null
  haySoporte: boolean
  onConectarMidi: () => void
  onPlay: () => void
  onDetener: () => void
  onGrabar: () => void
  onExportar: () => void
  exportando: boolean
  onIA: () => void
  /** Presente solo con una toma IA aplicada pendiente de deshacer. */
  onDeshacerIA?: (() => void) | null
}) {
  const t = useT()
  const estado = useSyncExternalStore(transporteStore.subscribe, transporteStore.getSnapshot)
  const previa = useSyncExternalStore(previaStore.subscribe, previaStore.getSnapshot)
  const sonando = estado !== 'parado'
  const grabando = estado === 'cuenta' || estado === 'grabando'
  const [ritmoAbierto, setRitmoAbierto] = useState(true)
  const [extrasAbierto, setExtrasAbierto] = useState(true)

  /** Cabecera de un grupo plegable: icono del grupo + chevron. */
  const grupo = (abierto: boolean, onClick: () => void, icono: Parameters<typeof Icono>[0]['nombre'], etiqueta: string) => (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={abierto}
      aria-label={etiqueta}
      title={etiqueta}
      className="flex h-9 shrink-0 items-center gap-0.5 rounded-lg px-1.5 text-white/60 transition hover:bg-white/10 active:scale-95"
    >
      <Icono nombre={icono} />
      <Icono nombre={abierto ? 'desplegado' : 'plegado'} />
    </button>
  )

  const chip = (activo: boolean, onClick: () => void, icono: Parameters<typeof Icono>[0]['nombre'], etiqueta: string) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      aria-pressed={activo}
      className={`grid h-9 w-9 place-items-center rounded-lg border transition active:scale-90 ${
        activo ? 'border-white/50 bg-white/20' : 'border-white/10 bg-white/10 hover:bg-white/20'
      }`}
    >
      <Icono nombre={icono} />
    </button>
  )

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
      <button
        type="button"
        onClick={onCerrar}
        aria-label={t('audio.editor.volver', 'Volver a los proyectos')}
        title={t('audio.editor.volver', 'Volver a los proyectos')}
        className="flex h-9 max-w-36 items-center gap-0.5 rounded-lg border border-white/10 bg-white/10 px-2 transition hover:bg-white/20 active:scale-95"
      >
        <Icono nombre="volver" />
        <span className="truncate text-xs font-semibold">{nombre}</span>
      </button>
      <button
        type="button"
        onClick={onRegresar}
        aria-label={t('audio.transporte.regresar', 'Regresar al inicio')}
        title={t('audio.transporte.regresar', 'Regresar al inicio')}
        className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/10 transition hover:bg-white/20 active:scale-90"
      >
        <Icono nombre="regresarInicio" />
      </button>
      <button
        type="button"
        onClick={onPlay}
        aria-label={sonando ? t('audio.transporte.pausa', 'Pausar') : t('audio.transporte.play', 'Reproducir')}
        title={sonando ? t('audio.transporte.pausa', 'Pausar') : t('audio.transporte.play', 'Reproducir')}
        className="grid h-9 w-9 place-items-center rounded-lg text-black transition active:scale-90"
        style={{ background: COLOR }}
      >
        <Icono nombre={sonando ? 'pausa' : 'play'} />
      </button>
      <button
        type="button"
        onClick={onDetener}
        aria-label={t('audio.transporte.stop', 'Detener')}
        title={t('audio.transporte.stop', 'Detener')}
        className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/10 transition hover:bg-white/20 active:scale-90"
      >
        <Icono nombre="detener" />
      </button>
      <button
        type="button"
        onClick={onGrabar}
        aria-label={t('audio.transporte.grabar', 'Grabar (con un compás de cuenta)')}
        title={t('audio.transporte.grabar', 'Grabar (con un compás de cuenta)')}
        aria-pressed={grabando}
        className={`grid h-9 w-9 place-items-center rounded-lg border transition active:scale-90 ${
          grabando ? 'border-red-400/60 bg-red-500/30 text-red-300' : 'border-white/10 bg-white/10 text-red-400 hover:bg-white/20'
        }`}
      >
        <Icono nombre="grabar" />
      </button>
      <Indicador bpm={bpm} posInicio={posInicio} />
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
        {grupo(ritmoAbierto, () => setRitmoAbierto((v) => !v), 'metronomo', t('audio.transporte.grupoRitmo', 'Ritmo'))}
        {ritmoAbierto && (
          <>
            {chip(
              previa,
              alternarPreviaMetronomo,
              previa ? 'detener' : 'play',
              t('audio.transporte.previa', 'Escuchar el ritmo (solo el metrónomo)'),
            )}
            {chip(metronomo, onMetronomo, 'metronomo', t('audio.transporte.metronomo', 'Metrónomo'))}
            {chip(loopActivo, onLoopActivo, 'repetir', t('audio.transporte.loop', 'Bucle (arrástralo en la regla)'))}
            {chip(
              cuantizar,
              onCuantizar,
              'confirmar',
              t('audio.transporte.cuantizar', 'Cuantizar la grabación (las notas caen exactas en la rejilla)'),
            )}
            <label className="flex items-center gap-1 text-xs text-white/50">
              {t('audio.transporte.bpm', 'BPM')}
              <input
                type="number"
                min={BPM_MIN}
                max={BPM_MAX}
                value={bpm}
                onChange={(e) => onBpm(Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(Number(e.target.value) || bpm))))}
                className="w-16 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm text-white outline-none"
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-white/50">
              {t('audio.transporte.compases', 'Compases')}
              <input
                type="number"
                min={1}
                max={MAX_COMPASES}
                value={compases}
                onChange={(e) =>
                  onCompases(Math.max(1, Math.min(MAX_COMPASES, Math.round(Number(e.target.value) || compases))))
                }
                className="w-14 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm text-white outline-none"
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-white/50">
              {t('audio.transporte.pulsos', 'Pulsos')}
              <select
                value={pulsos}
                aria-label={t('audio.transporte.pulsosLargo', 'Pulsaciones por compás')}
                title={t('audio.transporte.pulsosLargo', 'Pulsaciones por compás')}
                onChange={(e) => onPulsos(Number(e.target.value))}
                className="rounded-lg border border-white/10 bg-black/30 px-1.5 py-1 text-sm text-white outline-none"
              >
                {[2, 4, 8, 16].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            {/* El compás en notación tradicional: N pulsos de 1/N en un compás entero. */}
            <span
              title={t('audio.transporte.compasTradicional', 'Compás en notación tradicional')}
              aria-label={t('audio.transporte.compasTradicional', 'Compás en notación tradicional')}
              className="flex flex-col items-center px-0.5 font-mono text-[10px] leading-tight text-white/70"
            >
              <span>{pulsos}</span>
              <span className="border-t border-white/50 px-0.5">{pulsos}</span>
            </span>
          </>
        )}
      </div>
      <span className="flex-1" />
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
        {grupo(extrasAbierto, () => setExtrasAbierto((v) => !v), 'ajustes', t('audio.transporte.grupoExtras', 'Extras'))}
        {extrasAbierto && (
          <>
            {haySoporte && (
              <button
                type="button"
                onClick={onConectarMidi}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                  midiNombre
                    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                    : 'border-white/10 bg-white/10 text-white/60 hover:bg-white/15'
                }`}
              >
                <Icono nombre="piano" />
                {midiNombre ?? t('audio.midi.conectar', 'Conectar MIDI')}
              </button>
            )}
            <button
              type="button"
              onClick={onExportar}
              disabled={exportando}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-white/20 disabled:opacity-40"
            >
              {exportando ? <Spinner pequeno /> : <Icono nombre="descargar" />} {t('audio.export.wav', 'WAV')}
            </button>
            <BotonPrimario type="button" pequeno app={COLOR} onClick={onIA}>
              <Icono nombre="brillo" /> {t('audio.ia.boton', 'IA')}
            </BotonPrimario>
            {onDeshacerIA && (
              <button
                type="button"
                onClick={onDeshacerIA}
                className="flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
              >
                <Icono nombre="deshacer" /> {t('audio.ia.deshacerCorto', 'Deshacer')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Contador de posición y tiempo (`compás.pulso · m:ss.d`), aislado: su tick de
 * 100 ms mientras suena solo re-renderiza este span, no la barra entera.
 */
function Indicador({ bpm, posInicio }: { bpm: number; posInicio: number }) {
  const t = useT()
  const estado = useSyncExternalStore(transporteStore.subscribe, transporteStore.getSnapshot)
  const [, setTic] = useState(0)
  useEffect(() => {
    if (estado === 'parado') return
    const id = window.setInterval(() => setTic((v) => v + 1), 100)
    return () => window.clearInterval(id)
  }, [estado])
  const paso = estado === 'parado' ? posInicio : Math.max(0, posicion())
  const compas = Math.floor(paso / PASOS_POR_COMPAS) + 1
  const beat = Math.floor((paso % PASOS_POR_COMPAS) / 4) + 1
  const seg = paso * segPorPaso(bpm)
  const reloj = `${Math.floor(seg / 60)}:${String(Math.floor(seg % 60)).padStart(2, '0')}.${Math.floor((seg * 10) % 10)}`
  return (
    <span
      title={t('audio.transporte.tiempo', 'Compás.pulso · tiempo')}
      className="min-w-24 text-center font-mono text-xs tabular-nums text-white/60"
    >
      {compas}.{beat} · {reloj}
    </span>
  )
}
