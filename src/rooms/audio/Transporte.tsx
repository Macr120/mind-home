import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { useArrastre } from '../../core/ui/comun/arrastre'
import { reordenar } from '../../core/ui/editor/editorSecciones'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario, Spinner } from '../_shared/ui'
import { BPM_MAX, BPM_MIN, COLOR, MAX_COMPASES, PASOS_POR_COMPAS, segPorPaso } from './constantes'
import { alternarPreviaMetronomo, posicion, previaStore, transporteStore } from './motor'

/**
 * Barra de transporte en tres grupos plegables — «Transporte» (regresar, stop,
 * grabar, contador), «Ritmo» (bucle, cuantizar, BPM, compases, pulsos) y
 * «Extras» (deshacer/rehacer, practicar, MIDI, WAV, IA) — para que en angosto
 * la barra no se desborde. Los dos primeros arrancan con su botón principal
 * SIEMPRE a la vista (play/pausa y metrónomo) y, aparte, el chevron que los
 * despliega. Los grupos van juntos y se reordenan arrastrándolos (el gesto
 * compartido de la casa: pulsación larga con el dedo, mover con el ratón); el
 * orden se recuerda.
 */

type Grupo = 'transporte' | 'ritmo' | 'extras'
const GRUPOS: Grupo[] = ['transporte', 'ritmo', 'extras']
const LS_ORDEN = 'mh.audio.transporteOrden'

function leerOrden(): Grupo[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(LS_ORDEN) ?? '[]')
    if (Array.isArray(v) && v.length === GRUPOS.length && GRUPOS.every((g) => v.includes(g))) return v as Grupo[]
  } catch {
    // sin almacenamiento o valor roto: el orden de fábrica
  }
  return GRUPOS
}

/** Qué grupo hay bajo el puntero (el que va en la mano se soltará delante de él). */
const grupoBajo = (e: { clientX: number; clientY: number }): Grupo | null =>
  (document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-grupo]')?.getAttribute('data-grupo') ??
    null) as Grupo | null

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
  onPracticar,
  onDeshacer,
  onRehacer,
  puedeDeshacer,
  puedeRehacer,
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
  /** Abre la práctica con la partitura desplazándose (te escucha tocar la pieza). */
  onPracticar: () => void
  /** Historial del proyecto (también Ctrl+Z / Ctrl+Y). */
  onDeshacer: () => void
  onRehacer: () => void
  puedeDeshacer: boolean
  puedeRehacer: boolean
}) {
  const t = useT()
  const estado = useSyncExternalStore(transporteStore.subscribe, transporteStore.getSnapshot)
  const previa = useSyncExternalStore(previaStore.subscribe, previaStore.getSnapshot)
  const sonando = estado !== 'parado'
  const grabando = estado === 'cuenta' || estado === 'grabando'
  const [transporteAbierto, setTransporteAbierto] = useState(true)
  const [ritmoAbierto, setRitmoAbierto] = useState(true)
  const [extrasAbierto, setExtrasAbierto] = useState(true)

  // Orden de los grupos: se arrastra la caja entera y se suelta delante de otra.
  const [orden, setOrden] = useState<Grupo[]>(leerOrden)
  const { props: gesto, enMano, destino } = useArrastre<Grupo>(
    (e, mano) => {
      const g = grupoBajo(e)
      return g && g !== mano ? g : null
    },
    (mano, dest) => {
      setOrden((prev) => {
        const next = reordenar(prev, mano as Grupo, dest)
        try {
          localStorage.setItem(LS_ORDEN, JSON.stringify(next))
        } catch {
          // sin almacenamiento: el orden dura la sesión
        }
        return next
      })
    },
  )
  /** El gesto sobre la caja entera, salvo en los campos (escribir o seleccionar no arrastra). */
  const gestoDe = (id: Grupo) => {
    const p = gesto(id)
    return {
      ...p,
      onPointerDown: (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('input, select')) return
        p.onPointerDown(e)
      },
    }
  }

  /** Chevron que pliega/despliega un grupo (va junto a su botón principal). */
  const desplegar = (abierto: boolean, onClick: () => void, etiqueta: string) => (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={abierto}
      aria-label={etiqueta}
      title={etiqueta}
      className="grid h-9 w-6 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 active:scale-95"
    >
      <Icono nombre={abierto ? 'desplegado' : 'plegado'} />
    </button>
  )

  /** Cabecera de un grupo sin botón principal: icono del grupo + chevron. */
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

  const contenido: Record<Grupo, ReactNode> = {
    // El play/pausa encabeza su grupo: se acciona sin desplegarlo.
    transporte: (
      <>
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
        {desplegar(transporteAbierto, () => setTransporteAbierto((v) => !v), t('audio.transporte.grupoTransporte', 'Transporte'))}
        {transporteAbierto && (
          <>
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
                grabando
                  ? 'border-red-400/60 bg-red-500/30 text-red-300'
                  : 'border-white/10 bg-white/10 text-red-400 hover:bg-white/20'
              }`}
            >
              <Icono nombre="grabar" />
            </button>
            <Indicador bpm={bpm} posInicio={posInicio} />
          </>
        )}
      </>
    ),
    // El metrónomo encabeza el grupo «Ritmo» y SUENA al pulsarlo: parado, arranca o
    // para el clic suelto (y deja la marca para el play); en reproducción enciende o
    // apaga el clic del transporte en caliente.
    ritmo: (
      <>
        {chip(
          previa || metronomo,
          () => {
            if (sonando) return onMetronomo()
            alternarPreviaMetronomo()
            if (metronomo === previa) onMetronomo() // la marca sigue al sonido
          },
          'metronomo',
          t('audio.transporte.metronomo', 'Metrónomo'),
        )}
        {desplegar(ritmoAbierto, () => setRitmoAbierto((v) => !v), t('audio.transporte.grupoRitmo', 'Ritmo'))}
        {ritmoAbierto && (
          <>
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
      </>
    ),
    extras: (
      <>
        {grupo(extrasAbierto, () => setExtrasAbierto((v) => !v), 'ajustes', t('audio.transporte.grupoExtras', 'Extras'))}
        {extrasAbierto && (
          <>
            <button
              type="button"
              onClick={onDeshacer}
              disabled={!puedeDeshacer}
              aria-label={t('editor.hist.deshacer', 'Deshacer')}
              title={`${t('editor.hist.deshacer', 'Deshacer')} (Ctrl+Z)`}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/10 transition hover:bg-white/20 active:scale-90 disabled:opacity-40"
            >
              <Icono nombre="deshacer" />
            </button>
            <button
              type="button"
              onClick={onRehacer}
              disabled={!puedeRehacer}
              aria-label={t('editor.hist.rehacer', 'Rehacer')}
              title={`${t('editor.hist.rehacer', 'Rehacer')} (Ctrl+Y)`}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/10 transition hover:bg-white/20 active:scale-90 disabled:opacity-40"
            >
              <Icono nombre="rehacer" />
            </button>
            <button
              type="button"
              onClick={onPracticar}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-white/20"
            >
              <Icono nombre="musica" /> {t('audio.transporte.practicar', 'Practicar')}
            </button>
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
      </>
    ),
  }

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
      {orden.map((id) => (
        <div
          key={id}
          data-grupo={id}
          {...gestoDe(id)}
          className={`flex cursor-grab flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] p-0.5 transition ${
            destino === id ? 'border-s-2 border-s-accent' : ''
          } ${enMano === id ? 'opacity-40' : ''}`}
        >
          {contenido[id]}
        </div>
      ))}
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
