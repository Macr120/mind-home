import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ProyectoAudio } from '../../core/data/db'
import { musicaImportadaRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { confirmar } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonSecundario, Spinner, TARJETA, Vacio } from '../_shared/ui'
import { COLOR } from './constantes'
import { Knob } from './Knob'
import * as mezclador from './platos'
import { EQ_DB, RATE_MAX, RATE_MIN, SEG_POR_VUELTA, type LadoPlato, type SnapshotPlato } from './platos'
import { SelectorCancion } from './SelectorCancion'

/**
 * La pestaña Mezclar: dos platos de tornamesa (disco que gira y se rasca, onda
 * con aguja, cue, pitch de vinilo, EQ y volumen) unidos por un crossfader. La
 * aguja, el giro, el reloj y los vúmetros van por un ÚNICO rAF imperativo
 * (cero setState por frame); el resto del estado vive en `mezclador.ts`.
 */

interface DomPlato {
  disco: HTMLElement | null
  aguja: HTMLElement | null
  tiempo: HTMLElement | null
  vu: HTMLElement | null
}

// Nodos que anima el rAF, a nivel de módulo (solo hay un Mezclador montado a la
// vez, como el motor); los callback refs los ponen y quitan al (des)montar.
const DOM: Record<LadoPlato, DomPlato> = {
  a: { disco: null, aguja: null, tiempo: null, vu: null },
  b: { disco: null, aguja: null, tiempo: null, vu: null },
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function Mezclador() {
  const t = useT()
  const snap = useSyncExternalStore(mezclador.mezcladorStore.subscribe, mezclador.mezcladorStore.getSnapshot)
  const [selector, setSelector] = useState<LadoPlato | null>(null)

  // Al salir de la pestaña se suelta todo (buffers grandes incluidos), como Albumes.
  useEffect(() => () => mezclador.liberar(), [])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const s = mezclador.mezcladorStore.getSnapshot()
      for (const lado of ['a', 'b'] as const) {
        const n = DOM[lado]
        const c = s[lado].cancion
        if (!c) continue
        const pos = mezclador.posicionSeg(lado)
        if (n.aguja) n.aguja.style.left = `${(pos / c.duracionSeg) * 100}%`
        if (n.disco) n.disco.style.transform = `rotate(${(pos / SEG_POR_VUELTA) * 360}deg)`
        if (n.tiempo) n.tiempo.textContent = fmt(pos)
        if (n.vu) {
          const encendidos = Math.round(Math.min(1, mezclador.nivel(lado) * 1.8) * n.vu.children.length)
          for (let i = 0; i < n.vu.children.length; i++) {
            ;(n.vu.children[i] as HTMLElement).style.opacity = i < encendidos ? '1' : '0.15'
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const avisarError = () =>
    confirmar({
      titulo: t('audio.mezclar.error', 'No se pudo cargar la canción'),
      mensaje: t('audio.mezclar.errorMsg', 'Vuelve a intentarlo.'),
    })

  const elegir = (lado: LadoPlato, p: ProyectoAudio, titulo: string) => {
    setSelector(null)
    void mezclador.cargarCancion(lado, p, titulo).catch(avisarError)
  }

  const elegirArchivo = (lado: LadoPlato, blob: Blob, titulo: string, bpm?: number) => {
    setSelector(null)
    void mezclador.cargarArchivo(lado, blob, titulo, bpm).catch(avisarError)
  }

  // Import nuevo: se carga al plato y, con la metadata que devuelve la carga
  // (duración + BPM detectado), se guarda en la biblioteca local.
  const importar = (lado: LadoPlato, archivo: File) => {
    setSelector(null)
    void (async () => {
      const nombre = archivo.name.replace(/\.[^.]+$/, '')
      const meta = await mezclador.cargarArchivo(lado, archivo, nombre)
      if (meta) {
        await musicaImportadaRepo.add({ nombre, blob: archivo, ...meta, creadoEn: new Date().toISOString() })
      }
    })().catch(avisarError)
  }

  return (
    <div className="mx-auto w-full max-w-2xl pb-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="order-1 min-w-0">
          <Plato lado="a" plato={snap.a} onCargar={() => setSelector('a')} />
        </div>
        <div className="order-3 min-w-0 sm:order-2">
          <Plato lado="b" plato={snap.b} onCargar={() => setSelector('b')} />
        </div>
        <div className="order-2 sm:order-3 sm:col-span-2">
          <Crossfader valor={snap.crossfade} />
        </div>
      </div>
      {selector != null && (
        <SelectorCancion
          onElegir={(p, titulo) => elegir(selector, p, titulo)}
          onElegirArchivo={(blob, titulo, bpm) => elegirArchivo(selector, blob, titulo, bpm)}
          onImportar={(archivo) => importar(selector, archivo)}
          onCerrar={() => setSelector(null)}
        />
      )}
    </div>
  )
}

// ─── Un plato ───────────────────────────────────────────────────────────────

function Plato({ lado, plato, onCargar }: { lado: LadoPlato; plato: SnapshotPlato; onCargar: () => void }) {
  const t = useT()
  const etiquetaPlato = lado === 'a' ? t('audio.mezclar.platoA', 'Plato A') : t('audio.mezclar.platoB', 'Plato B')

  if (plato.estado === 'vacio') {
    return (
      <Vacio
        icono="vinilo"
        titulo={`${etiquetaPlato} · ${t('audio.mezclar.vacio', 'Plato vacío')}`}
        sub={t('audio.mezclar.vacioSub', 'Carga una canción para mezclarla.')}
        cta={{ texto: t('audio.mezclar.cargar', 'Cargar canción'), onClick: onCargar }}
        className="h-full"
      />
    )
  }
  if (plato.estado === 'cargando' || !plato.cancion) {
    return (
      <div className={`${TARJETA} grid h-full min-h-40 place-items-center`}>
        <div className="space-y-2 text-center">
          <Spinner etiqueta={t('audio.mezclar.cargando', 'Preparando la canción…')} />
          <p className="text-xs text-white/45">{t('audio.mezclar.cargando', 'Preparando la canción…')}</p>
        </div>
      </div>
    )
  }

  const c = plato.cancion
  const sonando = plato.estado === 'sonando'
  return (
    <div className={`${TARJETA} space-y-3`}>
      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/60">
          {etiquetaPlato}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.titulo}</span>
        <button
          type="button"
          onClick={() => mezclador.quitarCancion(lado)}
          aria-label={t('audio.mezclar.quitar', 'Quitar del plato')}
          title={t('audio.mezclar.quitar', 'Quitar del plato')}
          className="rounded-lg px-1.5 py-0.5 text-white/40 transition hover:bg-white/10 hover:text-white/80"
        >
          <Icono nombre="cerrar" />
        </button>
      </div>

      <Onda lado={lado} plato={plato} />

      <div className="flex items-center justify-between gap-3">
        <Disco lado={lado} />
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => mezclador.alternarPlay(lado)}
            aria-label={sonando ? t('audio.mezclar.pausa', 'Pausa') : t('audio.mezclar.play', 'Reproducir')}
            title={sonando ? t('audio.mezclar.pausa', 'Pausa') : t('audio.mezclar.play', 'Reproducir')}
            className="ui-boton grid h-11 w-11 place-items-center rounded-full text-lg ui-accent-bg"
          >
            <Icono nombre={sonando ? 'pausa' : 'play'} />
          </button>
          <button
            type="button"
            onClick={() => mezclador.cue(lado)}
            className="ui-boton rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-wider hover:bg-white/15"
          >
            {t('audio.mezclar.cue', 'Cue')}
          </button>
          <p className="text-center text-[10px] tabular-nums text-white/45">
            <span
              ref={(el) => {
                DOM[lado].tiempo = el
              }}
            >
              0:00
            </span>{' '}
            / {fmt(c.duracionSeg)}
          </p>
        </div>
        <div
          ref={(el) => {
            DOM[lado].vu = el
          }}
          aria-hidden
          className="flex h-24 w-2.5 shrink-0 flex-col-reverse gap-0.5"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm ${i >= 10 ? 'bg-red-400' : i >= 8 ? 'bg-amber-300' : 'bg-green-400'}`}
              style={{ opacity: 0.15 }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-start justify-between gap-1">
        <Knob
          valor={plato.rate}
          min={RATE_MIN}
          max={RATE_MAX}
          def={1}
          etiqueta={t('audio.mezclar.pitch', 'Pitch')}
          formato={(v) => `${v >= 1 ? '+' : '−'}${Math.abs(Math.round((v - 1) * 100))} %`}
          onCambio={(v) => mezclador.ajustarRateEnVivo(lado, v)}
          onCommit={(v) => mezclador.fijarRate(lado, v)}
        />
        <Knob
          valor={plato.volumen}
          def={0.9}
          etiqueta={t('audio.mezclar.volumen', 'Volumen')}
          onCambio={(v) => mezclador.ajustarVolumenEnVivo(lado, v)}
          onCommit={(v) => mezclador.fijarVolumen(lado, v)}
        />
        <div className="flex flex-col items-center gap-1">
          <BotonSecundario pequeno onClick={() => mezclador.sincronizar(lado)}>
            {t('audio.mezclar.sync', 'SYNC')}
          </BotonSecundario>
          <span className="text-[10px] tabular-nums text-white/45">
            {t('audio.mezclar.bpm', '{bpm} BPM', { bpm: Math.round(c.bpm * plato.rate) })}
          </span>
        </div>
      </div>

      <div className="flex items-start justify-around gap-1">
        {(['grave', 'medio', 'agudo'] as const).map((banda) => (
          <Knob
            key={banda}
            valor={plato.eq[banda]}
            min={-EQ_DB}
            max={EQ_DB}
            def={0}
            etiqueta={
              banda === 'grave'
                ? t('audio.mezclar.eqGrave', 'Graves')
                : banda === 'medio'
                  ? t('audio.mezclar.eqMedio', 'Medios')
                  : t('audio.mezclar.eqAgudo', 'Agudos')
            }
            formato={(v) => `${v > 0 ? '+' : ''}${Math.round(v)} dB`}
            onCambio={(v) => mezclador.ajustarEqEnVivo(lado, banda, v)}
            onCommit={(v) => mezclador.fijarEq(lado, banda, v)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── La onda (tap = mover la aguja) ─────────────────────────────────────────

function Onda({ lado, plato }: { lado: LadoPlato; plato: SnapshotPlato }) {
  const t = useT()
  const c = plato.cancion!
  const buscarEn = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    mezclador.buscar(lado, ((clientX - rect.left) / rect.width) * c.duracionSeg)
  }
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={t('audio.mezclar.onda', 'Onda: toca para mover la aguja')}
      aria-valuemin={0}
      aria-valuemax={Math.round(c.duracionSeg)}
      aria-valuenow={Math.round(mezclador.posicionSeg(lado))}
      aria-valuetext={fmt(mezclador.posicionSeg(lado))}
      onPointerDown={(e) => buscarEn(e.clientX, e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') mezclador.buscar(lado, mezclador.posicionSeg(lado) + 2)
        else if (e.key === 'ArrowLeft') mezclador.buscar(lado, mezclador.posicionSeg(lado) - 2)
      }}
      className="relative h-10 w-full touch-none overflow-hidden rounded-lg border border-white/10 bg-black/30 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      <svg
        viewBox={`0 0 ${Math.max(1, c.picos.length)} 40`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {c.picos.map((v, i) => (
          <rect
            key={i}
            x={i + 0.15}
            width={0.7}
            y={20 - Math.max(0.6, v * 19)}
            height={Math.max(1.2, v * 38)}
            fill={COLOR}
            opacity={0.55}
          />
        ))}
      </svg>
      {plato.cueSeg > 0 && (
        <div
          className="absolute inset-y-0 w-0.5 bg-amber-300/80"
          style={{ left: `${(plato.cueSeg / c.duracionSeg) * 100}%` }}
        />
      )}
      <div
        ref={(el) => {
          DOM[lado].aguja = el
        }}
        className="absolute inset-y-0 w-0.5 bg-white/90"
        style={{ left: '0%' }}
      />
    </div>
  )
}

// ─── El disco (arrastrar = scratch) ─────────────────────────────────────────

function Disco({ lado }: { lado: LadoPlato }) {
  const t = useT()
  const angulo = useRef(0)
  const arrastrando = useRef(false)
  const anguloDe = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return (Math.atan2(e.clientY - (rect.top + rect.height / 2), e.clientX - (rect.left + rect.width / 2)) * 180) / Math.PI
  }
  return (
    <div
      aria-hidden
      title={t('audio.mezclar.disco', 'Disco: arrastra para hacer scratch')}
      onPointerDown={(e) => {
        // Capture en el propio disco: no tiene botones dentro que se rompan.
        e.currentTarget.setPointerCapture(e.pointerId)
        arrastrando.current = true
        angulo.current = anguloDe(e)
        mezclador.iniciarScratch(lado)
      }}
      onPointerMove={(e) => {
        if (!arrastrando.current) return
        const a = anguloDe(e)
        let delta = a - angulo.current
        if (delta > 180) delta -= 360
        if (delta < -180) delta += 360
        angulo.current = a
        mezclador.moverScratch(lado, (delta / 360) * SEG_POR_VUELTA)
      }}
      onPointerUp={() => {
        arrastrando.current = false
        mezclador.terminarScratch(lado)
      }}
      onPointerCancel={() => {
        arrastrando.current = false
        mezclador.terminarScratch(lado)
      }}
      className="relative h-28 w-28 shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
    >
      <div
        ref={(el) => {
          DOM[lado].disco = el
        }}
        // Vinilo oscuro a propósito (como las portadas), también en modo claro.
        className="h-full w-full rounded-full border border-white/15 shadow-lg"
        style={{ background: 'repeating-radial-gradient(circle at 50% 50%, #14161d 0 2.5px, #1d2027 2.5px 4px)' }}
      >
        <div
          className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
          style={{ background: COLOR }}
        >
          <div className="h-1.5 w-1.5 rounded-full bg-black/60" />
        </div>
        <div className="absolute left-1/2 top-1.5 h-3 w-0.5 -translate-x-1/2 rounded-full bg-white/45" />
      </div>
    </div>
  )
}

// ─── Crossfader ─────────────────────────────────────────────────────────────

function Crossfader({ valor }: { valor: number }) {
  const t = useT()
  const [arrastre, setArrastre] = useState<number | null>(null)
  const x = arrastre ?? valor
  const fracDe = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  }
  return (
    <div className={`${TARJETA} flex items-center gap-3 p-3`}>
      <span className="text-xs font-bold text-white/60" aria-hidden>
        A
      </span>
      <div
        role="slider"
        tabIndex={0}
        aria-label={t('audio.mezclar.crossfader', 'Crossfader')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(x * 100)}
        onPointerDown={(e) => {
          // Capture en la pista: tampoco tiene botones dentro.
          e.currentTarget.setPointerCapture(e.pointerId)
          const f = fracDe(e)
          setArrastre(f)
          mezclador.ajustarCrossfadeEnVivo(f)
        }}
        onPointerMove={(e) => {
          if (arrastre == null) return
          const f = fracDe(e)
          setArrastre(f)
          mezclador.ajustarCrossfadeEnVivo(f)
        }}
        onPointerUp={() => {
          if (arrastre == null) return
          mezclador.fijarCrossfade(arrastre)
          setArrastre(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') mezclador.fijarCrossfade(Math.min(1, valor + 0.1))
          else if (e.key === 'ArrowLeft') mezclador.fijarCrossfade(Math.max(0, valor - 0.1))
        }}
        className="relative h-11 flex-1 cursor-ew-resize touch-none outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full border border-white/10 bg-black/40" />
        <div className="absolute left-1/2 top-1/2 h-3.5 w-px -translate-x-1/2 -translate-y-1/2 bg-white/25" />
        <div
          className="absolute top-1/2 h-9 w-5 -translate-x-1/2 -translate-y-1/2 rounded-md border border-white/25 bg-white/20 shadow"
          style={{ left: `${x * 100}%` }}
        >
          <div className="absolute left-1/2 top-1 bottom-1 w-px -translate-x-1/2 bg-white/50" />
        </div>
      </div>
      <span className="text-xs font-bold text-white/60" aria-hidden>
        B
      </span>
    </div>
  )
}
