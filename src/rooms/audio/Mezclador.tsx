import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from 'react'
import type { ProyectoAudio } from '../../core/data/db'
import { musicaImportadaRepo } from '../../core/data/repository'
import { claveLS } from '../../core/edicion'
import { localeActual, tGlobal, useT } from '../../core/i18n/useT'
import { confirmar } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonSecundario, Spinner, TARJETA, Vacio } from '../_shared/ui'
import { proyectoDeSemilla } from './Albumes'
import { SEMILLAS_CANCIONES } from './canciones'
import { COLOR, MAX_SEG_CLIP } from './constantes'
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
/** El reloj de la grabación de la mezcla (también lo mueve el rAF). */
const DOM_REC: { reloj: HTMLElement | null } = { reloj: null }

/** Tamaños de auto-loop, en tiempos. */
const TIEMPOS_LOOP = [0.5, 1, 2, 4, 8]

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/**
 * Canciones de fábrica que esperan pausadas en los platos (en memoria, sin
 * filas) hasta que el usuario cargue o quite alguna: desde ahí, en este
 * dispositivo, los platos abren vacíos.
 */
const PRECARGA: Record<LadoPlato, string> = { a: 'sem-himno-alegria', b: 'sem-cucaracha' }
const lsSinPrecarga = () => claveLS('audio.mezclar.sinPrecarga')

function hayQuePrecargar(): boolean {
  try {
    return localStorage.getItem(lsSinPrecarga()) !== '1'
  } catch {
    return false
  }
}

function dejarDePrecargar(): void {
  try {
    localStorage.setItem(lsSinPrecarga(), '1')
  } catch {
    // Sin almacenamiento, la precarga vuelve en la próxima visita.
  }
}

export function Mezclador() {
  const t = useT()
  const snap = useSyncExternalStore(mezclador.mezcladorStore.subscribe, mezclador.mezcladorStore.getSnapshot)
  const [selector, setSelector] = useState<LadoPlato | null>(null)

  // Al salir de la pestaña se suelta todo (buffers grandes incluidos), como Albumes.
  useEffect(() => () => mezclador.liberar(), [])

  useEffect(() => {
    if (!hayQuePrecargar()) return
    let vivo = true
    void (async () => {
      // Uno tras otro: el render offline de los dos a la vez se come el hilo.
      for (const lado of ['a', 'b'] as const) {
        const s = SEMILLAS_CANCIONES.find((x) => x.id === PRECARGA[lado])
        if (!vivo || !s || mezclador.mezcladorStore.getSnapshot()[lado].estado !== 'vacio') continue
        await mezclador.cargarCancion(lado, proyectoDeSemilla(s), tGlobal(`audio.cancion.${s.id.slice(4)}`, s.tituloEs))
      }
    })().catch(() => {
      // Sin audio en este dispositivo: los platos se quedan vacíos, como siempre.
    })
    return () => {
      vivo = false
    }
  }, [])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const s = mezclador.mezcladorStore.getSnapshot()
      if (s.grabandoDesde != null && DOM_REC.reloj) DOM_REC.reloj.textContent = fmt((performance.now() - s.grabandoDesde) / 1000)
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
    dejarDePrecargar()
    void mezclador.cargarCancion(lado, p, titulo).catch(avisarError)
  }

  const elegirArchivo = (lado: LadoPlato, blob: Blob, titulo: string, bpm?: number) => {
    setSelector(null)
    dejarDePrecargar()
    void mezclador.cargarArchivo(lado, blob, titulo, bpm).catch(avisarError)
  }

  // Import nuevo: se carga al plato y, con la metadata que devuelve la carga
  // (duración + BPM detectado), se guarda en la biblioteca local.
  const importar = (lado: LadoPlato, archivo: File) => {
    setSelector(null)
    dejarDePrecargar()
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
        <div className="order-4 sm:col-span-2">
          <GrabarMezcla grabandoDesde={snap.grabandoDesde} />
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
          onClick={() => {
            dejarDePrecargar()
            mezclador.quitarCancion(lado)
          }}
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

      <ControlesLoop lado={lado} plato={plato} />
    </div>
  )
}

// ─── Bucles del plato ───────────────────────────────────────────────────────

const CHIP = 'ui-boton rounded-md px-2 py-1 text-[10px] font-bold tabular-nums transition disabled:opacity-35'
const CHIP_OFF = 'bg-white/10 hover:bg-white/15'

function ControlesLoop({ lado, plato }: { lado: LadoPlato; plato: SnapshotPlato }) {
  const t = useT()
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const c = plato.cancion!
  const l = plato.loop
  const largo = l?.fin != null ? l.fin - l.inicio : 0
  // Tiempos del bucle (con la base del plato: el pitch no cambia cuántos tiempos caben).
  const tiempos = Math.round(((largo * c.bpm) / 60) * 100) / 100
  const cerrado = l?.fin != null
  const fmtTiempos = (n: number) => (n === 0.5 ? '½' : n === 0.25 ? '¼' : String(n))

  const guardar = async () => {
    if (!cerrado || guardando) return
    setGuardando(true)
    try {
      const nombre = t('audio.mezclar.nombreLoop', 'Loop {n} tiempos · {cancion}', { n: fmtTiempos(tiempos), cancion: c.titulo })
      const id = await mezclador.guardarLoopComoClip(lado, nombre)
      setAviso(id == null ? '' : t('audio.mezclar.guardadoEn', 'Guardado en Grabaciones: «{nombre}»', { nombre }))
      window.setTimeout(() => setAviso(''), 4000)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-0.5 text-[10px] font-semibold text-white/50">{t('audio.mezclar.loop', 'Loop')}</span>
        {TIEMPOS_LOOP.map((n) => {
          const activo = !!l?.activo && cerrado && Math.abs(largo - (n * 60) / c.bpm) < 1e-3
          return (
            <button
              key={n}
              type="button"
              onClick={() => mezclador.autoLoop(lado, n)}
              aria-pressed={activo}
              aria-label={t('audio.mezclar.autoLoop', 'Loop de {n} tiempos', { n: fmtTiempos(n) })}
              title={t('audio.mezclar.autoLoop', 'Loop de {n} tiempos', { n: fmtTiempos(n) })}
              className={`${CHIP} min-w-7 ${activo ? 'ui-accent-bg' : CHIP_OFF}`}
            >
              {fmtTiempos(n)}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => mezclador.loopIn(lado)}
          title={t('audio.mezclar.loopIn', 'Marcar el inicio del loop')}
          className={`${CHIP} ${l && l.fin == null ? 'bg-green-500/30 text-green-300' : CHIP_OFF}`}
        >
          {t('audio.mezclar.in', 'IN')}
        </button>
        <button
          type="button"
          onClick={() => mezclador.loopOut(lado)}
          disabled={!l}
          title={t('audio.mezclar.loopOut', 'Cerrar el loop aquí')}
          className={`${CHIP} ${CHIP_OFF}`}
        >
          {t('audio.mezclar.out', 'OUT')}
        </button>
        <button
          type="button"
          onClick={() => mezclador.escalarLoop(lado, 0.5)}
          disabled={!cerrado}
          aria-label={t('audio.mezclar.loopMitad', 'Loop a la mitad')}
          title={t('audio.mezclar.loopMitad', 'Loop a la mitad')}
          className={`${CHIP} ${CHIP_OFF}`}
        >
          ÷2
        </button>
        <button
          type="button"
          onClick={() => mezclador.escalarLoop(lado, 2)}
          disabled={!cerrado}
          aria-label={t('audio.mezclar.loopDoble', 'Loop al doble')}
          title={t('audio.mezclar.loopDoble', 'Loop al doble')}
          className={`${CHIP} ${CHIP_OFF}`}
        >
          ×2
        </button>
        <button
          type="button"
          onClick={() => (l?.activo ? mezclador.salirLoop(lado) : mezclador.reloop(lado))}
          disabled={!cerrado}
          aria-pressed={!!l?.activo}
          title={l?.activo ? t('audio.mezclar.salirLoop', 'Salir del loop') : t('audio.mezclar.reloop', 'Volver al loop')}
          className={`${CHIP} flex items-center gap-1 ${l?.activo ? 'bg-green-500/30 text-green-300' : CHIP_OFF}`}
        >
          <Icono nombre="repetir" />
          {l?.activo ? t('audio.mezclar.salir', 'Salir') : t('audio.mezclar.reloopCorto', 'Reloop')}
        </button>
        <button
          type="button"
          onClick={() => mezclador.quitarLoop(lado)}
          disabled={!l}
          aria-label={t('audio.mezclar.quitarLoop', 'Quitar el loop')}
          title={t('audio.mezclar.quitarLoop', 'Quitar el loop')}
          className={`${CHIP} ${CHIP_OFF} flex items-center gap-1`}
        >
          <Icono nombre="cerrar" />
          {t('audio.mezclar.quitarCorto', 'Quitar')}
        </button>
        <button
          type="button"
          onClick={() => void guardar()}
          disabled={!cerrado || guardando || largo / plato.rate > MAX_SEG_CLIP}
          title={t('audio.mezclar.guardarLoop', 'Guardar el loop como clip (en Grabaciones)')}
          className={`${CHIP} ${CHIP_OFF} ml-auto flex items-center gap-1`}
        >
          <Icono nombre="guardar" />
          {t('audio.mezclar.clip', 'Clip')}
        </button>
      </div>
      {l && <AjusteFino lado={lado} inicio={l.inicio} fin={l.fin} />}
      {aviso && <p className="truncate text-[10px] text-green-300">{aviso}</p>}
    </div>
  )
}

/** Paso del ajuste fino de los extremos del bucle, en segundos. */
const PASO_AJUSTE = 0.01
/** m:ss.cc redondeado a centésimas (truncar daba 2.46 para un 2.4699… de coma flotante). */
const fmtFino = (s: number) => {
  const cs = Math.round(s * 100)
  return `${fmt(Math.floor(cs / 100))}.${String(cs % 100).padStart(2, '0')}`
}

/** IN y OUT a mano, de 10 en 10 ms (las asas de la onda dan el ajuste grueso). */
function AjusteFino({ lado, inicio, fin }: { lado: LadoPlato; inicio: number; fin: number | null }) {
  const t = useT()
  const extremo = (cual: 'inicio' | 'fin', valor: number, rotulo: string, antes: string, despues: string) => (
    <div className="flex items-center gap-0.5">
      <span className="w-7 text-[10px] font-bold text-white/50">{rotulo}</span>
      <button
        type="button"
        onClick={() => mezclador.ajustarLoop(lado, cual, valor - PASO_AJUSTE)}
        aria-label={antes}
        title={antes}
        className={`${CHIP} ${CHIP_OFF}`}
      >
        <Icono nombre="volver" />
      </button>
      <span className="min-w-[3.4rem] text-center text-[10px] tabular-nums text-white/70">{fmtFino(valor)}</span>
      <button
        type="button"
        onClick={() => mezclador.ajustarLoop(lado, cual, valor + PASO_AJUSTE)}
        aria-label={despues}
        title={despues}
        className={`${CHIP} ${CHIP_OFF}`}
      >
        <Icono nombre="siguiente" />
      </button>
    </div>
  )
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {extremo(
        'inicio',
        inicio,
        t('audio.mezclar.in', 'IN'),
        t('audio.mezclar.inAntes', 'Adelantar el inicio del loop'),
        t('audio.mezclar.inDespues', 'Atrasar el inicio del loop'),
      )}
      {fin != null &&
        extremo(
          'fin',
          fin,
          t('audio.mezclar.out', 'OUT'),
          t('audio.mezclar.outAntes', 'Adelantar el final del loop'),
          t('audio.mezclar.outDespues', 'Atrasar el final del loop'),
        )}
    </div>
  )
}

// ─── Grabar la mezcla ───────────────────────────────────────────────────────

function GrabarMezcla({ grabandoDesde }: { grabandoDesde: number | null }) {
  const t = useT()
  const [aviso, setAviso] = useState('')
  const grabando = grabandoDesde != null

  const alternar = () => {
    if (grabando) return mezclador.pararGrabacionMezcla()
    setAviso('')
    const fecha = new Date().toLocaleString(localeActual(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    const nombre = t('audio.mezclar.nombreMezcla', 'Mezcla {fecha}', { fecha })
    void mezclador.grabarMezcla(nombre).then((res) => {
      setAviso(
        res
          ? t('audio.mezclar.guardadoEn', 'Guardado en Grabaciones: «{nombre}»', { nombre })
          : t('audio.mezclar.grabVacia', 'La grabación salió vacía.'),
      )
    })
  }

  return (
    <div className={`${TARJETA} flex items-center gap-3 !p-3`}>
      <button
        type="button"
        onClick={alternar}
        aria-pressed={grabando}
        aria-label={grabando ? t('audio.mezclar.pararGrab', 'Parar y guardar') : t('audio.mezclar.grabar', 'Grabar la mezcla')}
        title={grabando ? t('audio.mezclar.pararGrab', 'Parar y guardar') : t('audio.mezclar.grabar', 'Grabar la mezcla')}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition active:scale-90 ${
          grabando ? 'animate-pulse border-red-400/60 bg-red-500/30 text-red-300' : 'border-white/10 bg-white/10 text-red-400 hover:bg-white/20'
        }`}
      >
        <Icono nombre={grabando ? 'detener' : 'grabar'} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">
          {grabando ? (
            <>
              {t('audio.mezclar.grabando', 'Grabando la mezcla')} ·{' '}
              <span
                className="tabular-nums text-red-300"
                ref={(el) => {
                  DOM_REC.reloj = el
                }}
              >
                0:00
              </span>{' '}
              / {fmt(MAX_SEG_CLIP)}
            </>
          ) : (
            t('audio.mezclar.grabar', 'Grabar la mezcla')
          )}
        </p>
        <p className="truncate text-[10px] text-white/45">
          {aviso || t('audio.mezclar.grabarSub', 'Lo que suena se guarda como clip en Grabaciones, listo para tus canciones.')}
        </p>
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
      {plato.loop && (
        // Región del bucle: llena si está activo, tenue si quedó para el reloop; sin OUT, solo la raya del IN.
        <div
          aria-hidden
          className={`absolute inset-y-0 border-l-2 border-green-400 ${
            plato.loop.fin == null ? '' : plato.loop.activo ? 'border-r-2 bg-green-400/25' : 'border-r-2 border-dashed bg-green-400/10'
          }`}
          style={{
            left: `${(plato.loop.inicio / c.duracionSeg) * 100}%`,
            width: plato.loop.fin == null ? 0 : `${((plato.loop.fin - plato.loop.inicio) / c.duracionSeg) * 100}%`,
          }}
        />
      )}
      {plato.loop && <AsaLoop lado={lado} extremo="inicio" seg={plato.loop.inicio} duracion={c.duracionSeg} />}
      {plato.loop?.fin != null && <AsaLoop lado={lado} extremo="fin" seg={plato.loop.fin} duracion={c.duracionSeg} />}
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

/**
 * Asa de un extremo del bucle sobre la onda: arrastrarla lo mueve. Corta el
 * `pointerdown` para que la onda no lo tome como «mover la aguja», y la captura
 * va solo en el asa.
 */
function AsaLoop({ lado, extremo, seg, duracion }: { lado: LadoPlato; extremo: 'inicio' | 'fin'; seg: number; duracion: number }) {
  const t = useT()
  const mover = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    const rect = e.currentTarget.parentElement!.getBoundingClientRect()
    mezclador.ajustarLoop(lado, extremo, ((e.clientX - rect.left) / rect.width) * duracion)
  }
  const etiqueta =
    extremo === 'inicio'
      ? t('audio.mezclar.asaIn', 'Arrastra para mover el inicio del loop')
      : t('audio.mezclar.asaOut', 'Arrastra para mover el final del loop')
  return (
    <div
      role="presentation"
      title={etiqueta}
      onPointerDown={(e) => {
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={mover}
      className="absolute inset-y-0 z-10 flex w-4 -translate-x-1/2 cursor-ew-resize touch-none justify-center"
      style={{ left: `${(seg / duracion) * 100}%` }}
    >
      <span className="my-1 w-1.5 rounded-full bg-green-400 shadow" />
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
    <div className={`${TARJETA} flex items-center gap-3 !p-3`}>
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
