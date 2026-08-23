import { useEffect, useRef, useState } from 'react'
import { idiomaActual, useT } from '../../i18n/useT'
import { canalPago } from '../../plataforma'
import { entrarProbar } from '../../../probar/modo'
import { Icono } from '../iconos/Icono'
import { cargarTextos } from '../../../../web/i18n/paginas/index.mjs'
import { construirLaminas, type Caja, type Lamina, type Punto } from './laminas'
import { LOGOS_LOCAL, LOGOS_NUBE, LOGO_OLLAMA, type Logo } from './logos'
import { Piezas } from './piezas'

/**
 * «¿Qué es Mind Planner Home?»: el recorrido que se abre desde la puerta, antes
 * de tener cuenta. Es la web pública contada en ocho historias —mismo orden y
 * mismos textos, que llegan del catálogo traducido de `web/i18n/paginas/`— para
 * que quien acaba de instalar sepa qué está a punto de comprar.
 *
 * Mecánica de historias, la misma del Wrapped (`core/wrapped/WrappedOverlay`):
 * barras de avance, toque a la derecha para seguir y a la izquierda para volver,
 * pulsación sostenida para pausar, flechas y `Esc` con el teclado. Lo que cambia:
 * el tiempo de cada lámina depende de lo que hay que leer en ella, y lo que se
 * puede tocar (botones y preguntas plegables) no navega.
 *
 * Superficie del TEMA (`ui-app`/`ui-panel`), como el resto del arranque: una
 * instalación nueva arranca en modo claro y un fondo oscuro fijo dejaría el
 * texto ilegible.
 *
 * Default export: se monta lazy desde la puerta.
 */

/** Ritmo de lectura: un mínimo por lámina, más lo que cuesta leerla. */
const MS_BASE = 5000
const MS_POR_CARACTER = 26
const MS_TOPE = 26_000
/** Menos de esto es un tap (navega); más, una pulsación sostenida (pausa). */
const TAP_MS = 250

/**
 * Los tres colores de las «piezas» de la web (`.piezas` en `web/estilos.css`):
 * ámbar, rojo y morado. Aquí tiñen el fondo de cada lámina por turnos, para que
 * el recorrido avance también de color. Son colores de MARCA, no del tema: van
 * fijos, como en la web.
 */
const MARCA = ['#DA9425', '#C23A40', '#895AC6'] as const

function duracion(l: Lamina): number {
  const texto =
    l.tipo === 'texto'
      ? [l.titulo, l.intro, l.pie, ...l.puntos.map((p) => `${p.titulo ?? ''}${p.texto}`)].join(' ')
      : l.tipo === 'precio'
        ? l.cajas.map((c) => c.puntos.join(' ')).join(' ')
        : // Las preguntas van plegadas: se lee el enunciado, no la respuesta.
          l.preguntas.map((p) => p.q).join(' ')
  return Math.min(MS_TOPE, MS_BASE + texto.length * MS_POR_CARACTER)
}

export default function QueEsOverlay({ alCerrar }: { alCerrar: () => void }) {
  const t = useT()
  const [laminas, setLaminas] = useState<Lamina[] | null>(null)
  const [indice, setIndice] = useState(0)
  // Hacia dónde fue el último salto: decide de qué lado entra la lámina nueva.
  const [atras, setAtras] = useState(false)
  const [pausado, setPausado] = useState(false)
  const holdRef = useRef<{ inicio: number; timer: number } | null>(null)
  const cuerpoRef = useRef<HTMLDivElement>(null)

  // El catálogo del idioma elegido en la puerta, una vez por apertura.
  useEffect(() => {
    let vivo = true
    void cargarTextos(idiomaActual()).then((textos) => {
      if (vivo) setLaminas(construirLaminas(textos, canalPago()))
    })
    return () => {
      vivo = false
    }
  }, [])

  const total = laminas?.length ?? 0
  const lamina = laminas?.[Math.min(indice, Math.max(total - 1, 0))]

  /** Único camino para cambiar de lámina: fija también de dónde entra. */
  const ir = (delta: number) => {
    setAtras(delta < 0)
    setIndice((i) => Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0)))
  }

  // Auto-avance estilo stories; la última se queda quieta.
  useEffect(() => {
    if (pausado || total === 0 || indice >= total - 1 || !lamina) return
    const id = window.setTimeout(() => {
      setAtras(false)
      setIndice((i) => i + 1)
    }, duracion(lamina))
    return () => window.clearTimeout(id)
  }, [indice, pausado, total, lamina])

  // Cada lámina se lee desde arriba.
  useEffect(() => {
    cuerpoRef.current?.scrollTo({ top: 0 })
  }, [indice])

  // Teclado en captura: no llega al movimiento del personaje de la casa.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar()
      else if (e.key === 'ArrowRight') ir(1)
      else if (e.key === 'ArrowLeft') ir(-1)
      else if (e.key === ' ') setPausado((p) => !p)
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // `ir` se rehace en cada render y solo depende de `total`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, alCerrar])

  // Zonas de toque: izquierda 30 % atrás, resto adelante; sostener pausa (y deja
  // desplazar las láminas largas sin que el dedo cambie de lámina al soltar).
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
    ir(e.clientX < ancho * 0.3 ? -1 : 1)
  }
  const cancelarHold = () => {
    if (holdRef.current) window.clearTimeout(holdRef.current.timer)
    holdRef.current = null
    setPausado(false)
  }

  return (
    <div
      className="ui-app ui-arranque fixed inset-0 z-[90] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={t('queEs.titulo', '¿Qué es {n}?', { n: t('marca.nombre', 'Planificador Mental-Casa') })}
    >
      {/* Barras de avance (una por lámina). */}
      <div className="flex gap-1 px-3 pt-3">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
            {i < indice ? (
              <div className="h-full w-full bg-white/85" />
            ) : i === indice ? (
              <div
                className={`h-full bg-white/85 ${i < total - 1 ? 'wrapped-avance' : 'w-full'}`}
                style={
                  i < total - 1 && lamina
                    ? {
                        animationDuration: `${duracion(lamina)}ms`,
                        animationPlayState: pausado ? 'paused' : 'running',
                      }
                    : undefined
                }
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={alCerrar}
          className="ui-presion flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-white/70 transition hover:bg-white/10"
        >
          <Icono nombre="atras" />
          {t('puerta.volver', 'Volver')}
        </button>
        <Piezas className="h-3 w-11" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-white/35">
          {t('marca.nombre', 'Planificador Mental-Casa')}
        </span>
      </div>

      {/* El lienzo de la lámina: toda la zona navega al toque. */}
      <div
        className="relative flex-1 select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={cancelarHold}
        onPointerLeave={cancelarHold}
      >
        {/* Tinte de la lámina: cambia de color al avanzar y funde entre los dos. */}
        <div
          className="pointer-events-none absolute inset-0 transition-[background] duration-500"
          style={{
            background: `radial-gradient(ellipse at 50% -10%, color-mix(in srgb, ${
              MARCA[indice % MARCA.length]
            } 22%, transparent), transparent 65%)`,
          }}
        />
        <div
          ref={cuerpoRef}
          className="relative h-full overflow-y-auto px-4 pb-6"
          // La perspectiva del giro de la lámina; sin ella el rotateY no se ve.
          style={{ perspective: '1200px' }}
        >
          <div
            // La `key` remonta el contenido en cada salto: es lo que dispara la
            // animación de entrada, por el lado hacia el que se navegó.
            key={lamina?.id ?? 'cargando'}
            className={`mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-3 py-4 ${
              atras ? 'queEs-lamina-inicio' : 'queEs-lamina-fin'
            }`}
          >
            {!laminas ? (
              <p className="text-center text-sm text-white/45">{t('cuenta.cargando', 'Cargando…')}</p>
            ) : lamina ? (
              <Contenido lamina={lamina} alCerrar={alCerrar} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Escalonado de los bloques de una lámina: entran detrás del título. */
const retardo = (i: number): React.CSSProperties => ({ animationDelay: `${140 + i * 80}ms` })

/** ¿El sistema pide menos movimiento? Entonces los números no se cuentan. */
const sinMovimiento = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Cuenta de 0 al número, frenando al final. Solo lo usan las cifras de la
 * portada: son cinco y ver subir el «17» es medio argumento de venta.
 */
function useConteo(objetivo: number, ms = 900): number {
  const [valor, setValor] = useState(() => (sinMovimiento() ? objetivo : 0))
  useEffect(() => {
    if (sinMovimiento()) return
    let raf = 0
    let inicio = 0
    const paso = (t: number) => {
      if (!inicio) inicio = t
      const p = Math.min(1, (t - inicio) / ms)
      setValor(Math.round(objetivo * (1 - (1 - p) ** 3)))
      if (p < 1) raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [objetivo, ms])
  return valor
}

function Cifra({ n, etiqueta, i }: { n: string; etiqueta: string; i: number }) {
  const numero = Number(n)
  const contado = useConteo(Number.isFinite(numero) ? numero : 0)
  return (
    <li className="ui-cascada text-xs text-white/55" style={retardo(i + 2)}>
      <b className="text-base font-black text-accent">{Number.isFinite(numero) ? contado : n}</b>{' '}
      {etiqueta}
    </li>
  )
}

/** Lo que se puede tocar no navega: el tap de la lámina se queda aquí. */
const sinNavegar = { onPointerUp: (e: React.PointerEvent) => e.stopPropagation() }

function Contenido({ lamina, alCerrar }: { lamina: Lamina; alCerrar: () => void }) {
  if (lamina.tipo === 'precio') {
    return (
      <>
        <h2 className="queEs-titulo text-center text-lg font-black leading-tight text-white/90">
          {lamina.titulo}
        </h2>
        <Piezas />
        {lamina.cajas.map((caja, i) => (
          <CajaPrecio key={caja.nombre} caja={caja} alCerrar={alCerrar} orden={i} />
        ))}
        {lamina.extra && (
          <div
            className="ui-cascada rounded-xl border border-white/10 px-3 py-2"
            style={retardo(lamina.cajas.length)}
          >
            <h3 className="text-xs font-bold text-white/70">{lamina.extra.titulo}</h3>
            {lamina.extra.precios && (
              <p className="mt-0.5 text-xs font-bold text-accent">{lamina.extra.precios}</p>
            )}
            <p className="mt-0.5 text-[11px] leading-snug text-white/50">{lamina.extra.texto}</p>
          </div>
        )}
      </>
    )
  }

  if (lamina.tipo === 'faq') {
    return (
      <>
        <h2 className="queEs-titulo text-center text-lg font-black leading-tight text-white/90">
          {lamina.titulo}
        </h2>
        <Piezas />
        {/* Plegadas, como en la web: las ocho caben en una pantalla y se abre
            la que interese. Tocar una no debe pasar de lámina. */}
        <div className="space-y-1.5" {...sinNavegar}>
          {lamina.preguntas.map((p, i) => (
            <details
              key={p.q}
              style={retardo(i)}
              className="ui-cascada ui-panel rounded-xl border border-white/10 px-3 py-2"
            >
              <summary className="flex cursor-pointer list-none items-start gap-2 text-xs font-bold text-white/85">
                <Icono emoji="❓" className="shrink-0" />
                <span className="min-w-0 flex-1">{p.q}</span>
                <span className="shrink-0 text-white/35">+</span>
              </summary>
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/60">{p.a}</p>
            </details>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      {/* La portada se abre con el emblema de la marca —las tres piezas, como
          en la web— flotando sobre su aura. */}
      {lamina.id === 'hero' && (
        <div className="relative mx-auto w-48 py-3">
          <div
            className="queEs-aura absolute inset-0 rounded-full blur-2xl"
            style={{ background: 'var(--ui-accent)' }}
          />
          <div className="queEs-flota relative">
            <Piezas className="mx-auto h-10 w-44" />
          </div>
        </div>
      )}
      {lamina.titulo && (
        <h2 className="queEs-titulo whitespace-pre-line text-center text-xl font-black leading-tight text-white/90">
          {lamina.titulo}
        </h2>
      )}
      {/* Bajo el título, salvo en la portada: allí el emblema ya está arriba. */}
      {lamina.titulo && lamina.id !== 'hero' && <Piezas />}
      {lamina.intro && (
        <p className="ui-cascada text-center text-sm leading-snug text-white/60" style={retardo(0)}>
          {lamina.intro}
        </p>
      )}
      {lamina.cifras && (
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {lamina.cifras.map((c, i) => (
            <Cifra key={c.etiqueta} n={c.n} etiqueta={c.etiqueta} i={i} />
          ))}
        </ul>
      )}
      {lamina.puntos.map((p, i) => (
        <PuntoTarjeta key={i} punto={p} compacto={lamina.compacto} orden={i + 1} />
      ))}
      {lamina.pie && (
        <p
          className="ui-cascada text-center text-[11px] leading-snug text-white/40"
          style={retardo(lamina.puntos.length + 1)}
        >
          {lamina.pie}
        </p>
      )}
    </>
  )
}

function PuntoTarjeta({
  punto,
  compacto,
  orden = 0,
}: {
  punto: Punto
  compacto?: boolean
  orden?: number
}) {
  return (
    <div
      style={retardo(orden)}
      className={`ui-cascada ui-panel rounded-xl border border-white/10 transition-colors hover:bg-white/5 ${
        compacto ? 'px-3 py-2' : 'p-3'
      }`}
    >
      {punto.titulo && (
        <h3 className="flex items-start gap-2 text-sm font-bold text-white/85">
          {punto.emoji && <Icono emoji={punto.emoji} className="shrink-0 text-accent" />}
          <span className="min-w-0">{punto.titulo}</span>
        </h3>
      )}
      {punto.texto && (
        <p
          className={`leading-relaxed text-white/60 ${compacto ? 'text-[11px]' : 'text-xs'} ${
            punto.titulo ? 'mt-1' : ''
          }`}
        >
          {punto.texto}
        </p>
      )}
      {punto.logos && <TiraLogos cuales={punto.logos} />}
      {punto.nota && <p className="mt-1.5 text-[10px] leading-snug text-white/35">{punto.nota}</p>}
    </div>
  )
}

/** Los logos de marca de la web: proveedores de nube o modelos locales. */
function TiraLogos({ cuales }: { cuales: 'nube' | 'local' }) {
  const logos: Logo[] = cuales === 'nube' ? LOGOS_NUBE : LOGOS_LOCAL
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {cuales === 'local' && (
        <li className="flex items-center rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-white/60">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
            <path d={LOGO_OLLAMA} />
          </svg>
        </li>
      )}
      {logos.map((l, i) => (
        <li
          key={l.nombre}
          // Los logos entran en cascada rápida, detrás de su tarjeta.
          style={{ animationDelay: `${300 + i * 55}ms` }}
          className="ui-cascada flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-[10px] font-semibold text-white/60"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 fill-current" aria-hidden>
            <path d={l.d} />
          </svg>
          {l.nombre}
        </li>
      ))}
    </ul>
  )
}

/**
 * Las dos cajas de la sección de precios. Sus botones son los que cierran el
 * recorrido: «Comprar la casa» devuelve al inicio de sesión (la compra se abona
 * a la cuenta, así que el correo va primero) y el de la demo entra a la casa de
 * Pep@, que recarga la app.
 */
function CajaPrecio({
  caja,
  alCerrar,
  orden = 0,
}: {
  caja: Caja
  alCerrar: () => void
  orden?: number
}) {
  const destacada = caja.accion === 'cuenta'
  return (
    <div
      style={retardo(orden)}
      className={`ui-cascada ui-panel space-y-2 rounded-xl border p-3 ${
        destacada ? 'border-accent/40' : 'border-white/10'
      }`}
    >
      <div className="flex items-baseline gap-2">
        <h3 className="flex-1 text-sm font-bold text-white/85">{caja.nombre}</h3>
        {caja.cifra && (
          <span className="text-base font-black text-white/90">
            {caja.cifra}
            {caja.nota && <small className="ml-1 text-[10px] font-semibold text-white/45">{caja.nota}</small>}
          </span>
        )}
      </div>
      <ul className="space-y-1">
        {caja.puntos.filter(Boolean).map((p) => (
          <li key={p} className="flex gap-1.5 text-xs leading-snug text-white/60">
            <span className="text-accent">·</span>
            <span className="min-w-0">{p}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        {...sinNavegar}
        onClick={() => (caja.accion === 'probar' ? entrarProbar() : alCerrar())}
        className={
          destacada
            ? 'ui-accent-bg ui-presion w-full rounded-md px-3 py-2 text-sm font-bold'
            : 'ui-presion w-full rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/85 transition hover:bg-white/15'
        }
      >
        {caja.cta}
      </button>
      {caja.pie && <p className="text-[10px] leading-snug text-white/40">{caja.pie}</p>}
    </div>
  )
}
