import { useEffect, useRef, useState } from 'react'
import { useWrappedUi } from '../state/wrappedUiStore'
import { localeActual, useT } from '../i18n/useT'
import { fechaLocalISO } from '../fechaLocal'
import { desbloquearAudio } from '../audio/motor'
import { detenerMusica, iniciarMusica } from '../audio/musicaGenerada'
import { detenerPista, iniciarPista, reproducirLista } from '../audio/pistas'
import { db } from '../data/db'
import { useAjustes } from '../state/ajustesStore'
import { Icono } from '../ui/iconos/Icono'
import { compartirTexto } from '../compartir'
import {
  esEnCurso,
  etiquetaPeriodo,
  periodoAnterior,
  periodoDe,
  periodoSiguiente,
  type TipoPeriodo,
} from './periodo'
import { resumenPeriodo, type ResumenWrapped } from './resumen'
import { construirSlides } from './slides'

/**
 * Overlay del Wrapped: el resumen del periodo como historias (slides con
 * auto-avance, tap para navegar, mantener pulsado para pausar). `.ui-noche`
 * conserva el look nocturno también en modo claro, como los lightbox de fotos.
 * Default export para cargarlo lazy desde App.
 */

const SLIDE_MS = 6000
/** Menos de esto es un tap (navega); más, una pulsación sostenida (pausa). */
const TAP_MS = 250

/** Tinte decorativo de fondo por tipo de periodo. */
const TINTE: Record<TipoPeriodo, string> = {
  semana: 'rgba(139, 92, 246, 0.25)',
  mes: 'rgba(34, 211, 238, 0.2)',
  anio: 'rgba(245, 158, 11, 0.2)',
}

export default function WrappedOverlay() {
  const t = useT()
  const tipo = useWrappedUi((s) => s.tipo)
  const ancla = useWrappedUi((s) => s.ancla)

  const [datos, setDatos] = useState<{ resumen: ResumenWrapped; previo: ResumenWrapped } | null>(
    null,
  )
  const [indice, setIndice] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [silencio, setSilencio] = useState(false)
  const holdRef = useRef<{ inicio: number; timer: number } | null>(null)
  const slideRef = useRef<HTMLDivElement>(null)
  const [compartido, setCompartido] = useState(false)
  const [textoManual, setTextoManual] = useState<string | null>(null)

  // Música mientras el wrapped está abierto: festiva generada o la pista del
  // usuario, según el ajuste. El clic de apertura ya desbloqueó el audio; si se
  // llegó por notificación (sin gesto válido) el contexto queda suspendido y el
  // primer tap sobre el overlay lo reanuda — lo agendado arranca solo.
  const musicaFuente = useAjustes((s) => s.musicaFuente)
  const musicaPistaId = useAjustes((s) => s.musicaPistaId)
  useEffect(() => {
    if (musicaFuente === 'sistema') {
      // Suena tu propio audio del sistema: el wrapped no lo pisa ni añade nada.
      detenerMusica()
      detenerPista()
      return
    }
    if (silencio) {
      detenerMusica()
      detenerPista()
      return
    }
    desbloquearAudio()
    let vivo = true
    if (musicaFuente === 'pistas') {
      detenerMusica()
      void db.pistasMusica.toArray().then((pistas) => {
        if (!vivo) return
        if (pistas.length === 0) {
          // Sin pistas subidas: cae a la música generada festiva.
          iniciarMusica('festivo')
          return
        }
        const elegida =
          musicaPistaId != null ? pistas.find((p) => p.id === musicaPistaId) : undefined
        if (elegida) void iniciarPista(elegida, { loop: true })
        else reproducirLista(pistas, true)
      })
    } else {
      detenerPista()
      iniciarMusica('festivo')
    }
    return () => {
      vivo = false
      detenerMusica()
      detenerPista()
    }
  }, [silencio, musicaFuente, musicaPistaId])

  // Foto del periodo + el anterior (para la comparativa), una vez por apertura/navegación.
  useEffect(() => {
    let vivo = true
    // Cambiar de periodo vuelve al primer slide y muestra la carga mientras
    // llegan los resúmenes (si no, se verían los datos del periodo anterior).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDatos(null)
    setIndice(0)
    const p = periodoDe(tipo, ancla)
    void Promise.all([
      resumenPeriodo(tipo, ancla),
      resumenPeriodo(tipo, periodoAnterior(p).desde),
    ]).then(([resumen, previo]) => {
      if (vivo) setDatos({ resumen, previo })
    })
    return () => {
      vivo = false
    }
  }, [tipo, ancla])

  const slides = datos ? construirSlides(datos.resumen, datos.previo) : []
  const slide = slides[Math.min(indice, Math.max(slides.length - 1, 0))]

  // Auto-avance estilo stories (el último slide se queda quieto).
  useEffect(() => {
    if (pausado || slides.length === 0 || indice >= slides.length - 1) return
    const id = window.setTimeout(() => setIndice((i) => i + 1), SLIDE_MS)
    return () => window.clearTimeout(id)
  }, [indice, pausado, slides.length])

  // Teclado en captura (como TutorialOverlay): no llega al movimiento del personaje.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useWrappedUi.getState().cerrar()
      else if (e.key === 'ArrowRight')
        setIndice((i) => Math.min(i + 1, Math.max(slides.length - 1, 0)))
      else if (e.key === 'ArrowLeft') setIndice((i) => Math.max(i - 1, 0))
      else if (e.key === ' ') setPausado((p) => !p)
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [slides.length])

  // Tap zones: izquierda 30% atrás, resto adelante; sostener pausa.
  const onPointerDown = () => {
    holdRef.current = {
      inicio: performance.now(),
      timer: window.setTimeout(() => setPausado(true), TAP_MS),
    }
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const h = holdRef.current
    holdRef.current = null
    if (!h) return
    window.clearTimeout(h.timer)
    setPausado(false)
    if (performance.now() - h.inicio >= TAP_MS) return
    const ancho = e.currentTarget.getBoundingClientRect().width
    if (e.clientX < ancho * 0.3) setIndice((i) => Math.max(i - 1, 0))
    else setIndice((i) => Math.min(i + 1, Math.max(slides.length - 1, 0)))
  }
  const cancelarHold = () => {
    if (holdRef.current) window.clearTimeout(holdRef.current.timer)
    holdRef.current = null
    setPausado(false)
  }

  const p = periodoDe(tipo, ancla)
  const haySiguiente = periodoSiguiente(p).desde <= fechaLocalISO()
  const etiqueta = etiquetaPeriodo(p, localeActual())

  // Comparte la lámina actual como texto: toma lo que el slide ya muestra en
  // pantalla (siempre en sincro con su contenido, sin duplicar el formateo).
  const compartirLamina = async () => {
    const crudo = slideRef.current?.innerText ?? ''
    const texto = crudo
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join('\n')
    if (!texto) return
    const titulo = t('wrapped.compartir.titulo', 'Mi resumen de Mind Planner Home · {periodo}', { periodo: etiqueta })
    const r = await compartirTexto(titulo, `${titulo}\n\n${texto}`)
    if (r.tipo === 'copiado') {
      setCompartido(true)
      setTimeout(() => setCompartido(false), 2000)
    } else if (r.tipo === 'manual') {
      setTextoManual(r.texto)
    }
  }

  return (
    <div
      data-tut="wrapped.overlay"
      className="ui-noche fixed inset-0 z-[55] flex flex-col overflow-hidden bg-black/90 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label={t('wrapped.titulo', 'Tu resumen')}
      onPointerDown={() => {
        if (!silencio) desbloquearAudio()
      }}
    >
      {/* Tinte decorativo según el periodo. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 50% -10%, ${TINTE[tipo]}, transparent 60%)` }}
      />

      {/* Barras de avance (una por slide). */}
      <div className="relative flex gap-1 px-3 pt-3">
        {slides.map((s, i) => (
          <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
            {i < indice ? (
              <div className="h-full w-full bg-white/85" />
            ) : i === indice ? (
              <div
                className={`h-full bg-white/85 ${i < slides.length - 1 ? 'wrapped-avance' : 'w-full'}`}
                style={
                  i < slides.length - 1
                    ? {
                        animationDuration: `${SLIDE_MS}ms`,
                        animationPlayState: pausado ? 'paused' : 'running',
                      }
                    : undefined
                }
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* Controles: cerrar · navegación de periodos · selector semana/mes/año. */}
      <div className="relative flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => useWrappedUi.getState().cerrar()}
          title={t('wrapped.cerrar', 'Cerrar')}
          className="rounded-lg px-2 py-1 text-sm text-white/60 transition hover:bg-white/10 hover:text-white/90"
        >
          ✕
        </button>
        <div data-tut="wrapped.periodo" className="flex min-w-0 flex-1 items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => useWrappedUi.getState().irAnterior()}
            title={t('wrapped.anterior', 'Periodo anterior')}
            className="rounded-lg px-2 py-0.5 text-white/70 transition hover:bg-white/10"
          >
            ‹
          </button>
          <span className="min-w-0 truncate text-center text-sm font-semibold capitalize text-white/85">
            {etiqueta}
            {esEnCurso(p) && (
              <span className="ms-1 text-[11px] font-normal text-white/45">
                {t('wrapped.enCurso', '(en curso)')}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => useWrappedUi.getState().irSiguiente()}
            disabled={!haySiguiente}
            title={t('wrapped.siguiente', 'Periodo siguiente')}
            className="rounded-lg px-2 py-0.5 text-white/70 transition hover:bg-white/10 disabled:opacity-25"
          >
            ›
          </button>
        </div>
        {/* Con el audio del sistema no hay nada nuestro que silenciar. */}
        {musicaFuente !== 'sistema' && (
          <button
            type="button"
            onClick={() => setSilencio((s) => !s)}
            title={t('wrapped.mute', 'Silenciar música')}
            className={`rounded-lg px-2 py-1 transition hover:bg-white/10 ${silencio ? 'opacity-40' : ''}`}
          >
            <Icono nombre="bocina" />
          </button>
        )}
        {datos && slide && (
          <button
            type="button"
            data-tut="wrapped.compartir"
            onClick={() => void compartirLamina()}
            title={t('wrapped.compartir', 'Compartir esta lámina')}
            className="rounded-lg px-2 py-1 text-white/70 transition hover:bg-white/10"
          >
            {compartido ? <Icono nombre="confirmar" /> : <Icono nombre="compartir" />}
          </button>
        )}
        <div data-tut="wrapped.tipo" className="flex overflow-hidden rounded-lg border border-white/15">
          {(['semana', 'mes', 'anio'] as const).map((tp) => (
            <button
              key={tp}
              type="button"
              onClick={() => useWrappedUi.getState().setTipo(tp)}
              className={`px-2.5 py-1 text-[11px] font-semibold transition ${
                tipo === tp ? 'bg-white/20 text-white' : 'text-white/50 hover:bg-white/10'
              }`}
            >
              {tp === 'semana'
                ? t('wrapped.tipo.semana', 'Semana')
                : tp === 'mes'
                  ? t('wrapped.tipo.mes', 'Mes')
                  : t('wrapped.tipo.anio', 'Año')}
            </button>
          ))}
        </div>
      </div>

      {/* Cuerpo: el slide activo, re-montado para re-animar. */}
      <div
        data-tut="wrapped.laminas"
        className="relative min-h-0 flex-1 select-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={cancelarHold}
        onPointerLeave={cancelarHold}
      >
        {!datos ? (
          <div className="grid h-full place-items-center text-sm text-white/55">
            {t('wrapped.cargando', 'Preparando tu resumen…')}
          </div>
        ) : (
          slide && (
            <div key={`${slide.id}-${indice}`} ref={slideRef} className="ui-pop h-full">
              <slide.Comp resumen={datos.resumen} previo={datos.previo} />
            </div>
          )
        )}
      </div>

      {/* Respaldo manual si Web Share y el portapapeles fallan (mismo patrón que BotonCompartir). */}
      {textoManual && (
        <div className="absolute inset-x-3 bottom-3 z-10 space-y-1.5 rounded-lg border border-white/10 bg-black/70 p-2.5 backdrop-blur">
          <p className="text-[11px] text-white/60">
            {t('wrapped.compartir.copiarManual', 'No se pudo copiar solo. Selecciona el texto y cópialo (Ctrl+C):')}
          </p>
          <textarea
            readOnly
            value={textoManual}
            rows={4}
            onFocus={(e) => e.currentTarget.select()}
            ref={(el) => el?.focus()}
            className="w-full resize-none rounded-lg border border-white/10 bg-black/40 p-2 text-[11px] text-white/85 outline-none"
          />
          <button
            type="button"
            onClick={() => setTextoManual(null)}
            className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white/70 transition hover:bg-white/20"
          >
            {t('wrapped.compartir.cerrarManual', 'Cerrar')}
          </button>
        </div>
      )}
    </div>
  )
}
