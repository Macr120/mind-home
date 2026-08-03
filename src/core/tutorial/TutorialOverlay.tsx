import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTutorial, ctxTutorial } from './tutorialStore'
import { AMBAR_FOCO, useZonaTut } from '../state/zonaTutStore'
import { elTut, esperarTut } from './dom'
import type { TextoTut } from './tipos'
import { useT } from '../i18n/useT'
import { Icono } from '../ui/iconos/Icono'
import { MASCOTAS, COLOR_FORMA } from '../chat/mascotas'

/** Rect medido del objetivo, en coordenadas de viewport. */
interface Caja {
  left: number
  top: number
  width: number
  height: number
}

const MARGEN = 8 // separación mínima de la tarjeta con los bordes del viewport
const HOLGURA = 6 // inflado del spotlight alrededor del objetivo
const SEP = 12 // separación tarjeta ↔ objetivo
const MAGO_ANCHO = 88 // hueco reservado al mago en su esquina (avatar + aire)
const MAGO_ALTO = 120

const MAGO = MASCOTAS.find((m) => m.id === 'mago')!

const igual = (a: Caja, b: Caja) =>
  a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height

/**
 * Overlay del tutorial activo: velo + spotlight sobre el objetivo del paso,
 * el mago presentando desde una esquina y la tarjeta con el texto y los
 * controles. Montado una sola vez al final de App (z-[60], sobre los diálogos).
 */
export function TutorialOverlay() {
  const t = useT()
  const def = useTutorial((s) => s.def)
  const paso = useTutorial((s) => s.paso)
  const ocupado = useTutorial((s) => s.ocupado)
  const [caja, setCaja] = useState<Caja | null>(null)
  const [posTarjeta, setPosTarjeta] = useState<{ left: number; top: number } | null>(null)
  const [magoDer, setMagoDer] = useState(false)
  const tarjetaRef = useRef<HTMLDivElement>(null)
  // Resalte del MAPA 3D (pasos con `zona`/`foco`), que proyecta ZonaTutProjector.
  // El objetivo DOM manda: un paso puede volar la cámara y resaltar un botón.
  const zonaMapa = useZonaTut((s) => s.proyeccion)
  const colorMapa = useZonaTut((s) => (s.foco ?? s.zona)?.color)
  // Con objetivo DOM se ignora la silueta: manda el rectángulo del elemento.
  const siluetaMapa = caja ? null : (zonaMapa?.poligono ?? null)
  const cajaFinal = caja ?? zonaMapa?.caja ?? null
  const colorResalte = colorMapa ?? AMBAR_FOCO

  const p = def?.pasos[paso]

  // Localiza el objetivo del paso y lo sigue (scroll, resize, re-renders).
  useEffect(() => {
    // Cada paso vuelve a medir: se borra el recuadro anterior para no dejar el
    // spotlight sobre el objetivo del paso que acaba de pasar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCaja(null)
    if (!def || !p) return
    const ctx = ctxTutorial()
    const sel = typeof p.sel === 'function' ? (ctx ? p.sel(ctx) : null) : p.sel ?? null
    if (!sel) return

    let vivo = true
    let interval: number | undefined
    const medir = () => {
      const el = elTut(sel)
      if (!el) {
        setCaja(null)
        return
      }
      const r = el.getBoundingClientRect()
      const nueva = {
        left: Math.round(r.left),
        top: Math.round(r.top),
        width: Math.round(r.width),
        height: Math.round(r.height),
      }
      setCaja((prev) => (prev && igual(prev, nueva) ? prev : nueva))
    }

    void esperarTut(p.esperar ?? sel, 4000).then((el) => {
      if (!vivo || !el) return // sin objetivo: la tarjeta acompaña al mago
      ;(el as HTMLElement).scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
      medir()
      interval = window.setInterval(medir, 200)
    })
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      vivo = false
      if (interval) clearInterval(interval)
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [def, paso]) // eslint-disable-line react-hooks/exhaustive-deps -- p deriva de def+paso

  // Teclado: Escape sale; ←/→ navegan.
  useEffect(() => {
    if (!def) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void useTutorial.getState().salir()
      else if (e.key === 'ArrowRight') void useTutorial.getState().siguiente()
      else if (e.key === 'ArrowLeft') void useTutorial.getState().atras()
      else return
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [def])

  // Seguro: si el overlay se desmonta con un tour activo (HMR), la limpieza corre.
  useEffect(() => () => void useTutorial.getState().salir(), [])

  // Coloca la tarjeta (junto al objetivo o junto al mago) y decide la esquina del mago.
  useLayoutEffect(() => {
    const el = tarjetaRef.current
    if (!def || !el) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cw = el.offsetWidth
    const ch = el.offsetHeight
    const clampX = (x: number) => Math.min(Math.max(x, MARGEN), vw - cw - MARGEN)
    const clampY = (y: number) => Math.min(Math.max(y, MARGEN), vh - ch - MARGEN)

    let pos: { left: number; top: number }
    let der = false
    if (cajaFinal) {
      const caja = cajaFinal
      const centroX = clampX(caja.left + caja.width / 2 - cw / 2)
      const centroY = clampY(caja.top + caja.height / 2 - ch / 2)
      const lados: Record<string, { left: number; top: number; cabe: boolean }> = {
        abajo: { left: centroX, top: caja.top + caja.height + SEP, cabe: caja.top + caja.height + SEP + ch < vh - MARGEN },
        arriba: { left: centroX, top: caja.top - SEP - ch, cabe: caja.top - SEP - ch > MARGEN },
        derecha: { left: caja.left + caja.width + SEP, top: centroY, cabe: caja.left + caja.width + SEP + cw < vw - MARGEN },
        izquierda: { left: caja.left - SEP - cw, top: centroY, cabe: caja.left - SEP - cw > MARGEN },
      }
      const orden =
        p?.colocacion && p.colocacion !== 'auto'
          ? [p.colocacion, 'abajo', 'arriba', 'derecha', 'izquierda']
          : ['abajo', 'arriba', 'derecha', 'izquierda']
      const lado = orden.map((l) => lados[l]).find((l) => l.cabe) ?? lados.abajo
      pos = { left: clampX(lado.left), top: clampY(lado.top) }

      // El mago cede su esquina si el objetivo o la tarjeta la ocupan.
      const chocaIzq = (b: Caja) => b.left < MAGO_ANCHO + 160 && b.top + b.height > vh - MAGO_ALTO - 40
      der = chocaIzq(caja) || chocaIzq({ ...pos, width: cw, height: ch })
      // Un recuadro del mapa que abarque toda la pantalla dejaría al mago
      // dentro del hueco: ahí no cede nada, se queda en su esquina.
      if (caja.width > vw * 0.9 && caja.height > vh * 0.9) der = false
    } else {
      // Sin objetivo: bocadillo junto al mago (en su esquina por defecto).
      pos = { left: clampX(MARGEN + MAGO_ANCHO + 10), top: clampY(vh - ch - 24) }
    }
    setPosTarjeta((prev) => (prev && prev.left === pos.left && prev.top === pos.top ? prev : pos))
    setMagoDer(der)
  }, [def, paso, cajaFinal]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!def || !p) return null

  const tt = (x: TextoTut) => t(x.clave, x.es)
  const titulo = p.titulo ? tt(p.titulo) : tt(def.titulo)
  const ultimo = paso >= def.pasos.length - 1

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden" role="dialog" aria-modal="true">
      {/* Velo. Con una zona del mapa el hueco lleva SU forma (en isométrica un
          área del terreno es un rombo, y un rectángulo taparía terreno ajeno);
          con un objetivo DOM, el recuadro de siempre. */}
      {siluetaMapa ? (
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {/* El rectángulo exterior desbordado evita medir el viewport: el SVG
              y el `overflow-hidden` del contenedor ya recortan. */}
          <path
            fillRule="evenodd"
            fill="rgba(0,0,0,0.62)"
            d={`M-9999 -9999H9999V9999H-9999Z M${siluetaMapa.map((p) => p.join(' ')).join('L')}Z`}
          />
          {/* El aro va del color de lo resaltado (ámbar si es un objeto), y por
              `style`: en un atributo de presentación SVG `var()` no se resuelve
              y el trazo se quedaba invisible. */}
          <polygon
            points={siluetaMapa.map((p) => p.join(',')).join(' ')}
            fill="none"
            style={{ stroke: colorResalte }}
            strokeWidth={2}
          />


        </svg>
      ) : cajaFinal ? (
        <div
          className="pointer-events-none absolute rounded-xl transition-all duration-200"
          style={{
            left: cajaFinal.left - HOLGURA,
            top: cajaFinal.top - HOLGURA,
            width: cajaFinal.width + HOLGURA * 2,
            height: cajaFinal.height + HOLGURA * 2,
            boxShadow: '0 0 0 100vmax rgba(0,0,0,0.62), 0 0 0 2px var(--ui-accent)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}

      {/* El mago presentador, en su esquina (cede el lado si el paso la ocupa). */}
      <div
        className={`pointer-events-none absolute bottom-4 flex flex-col items-center gap-1.5 transition-all duration-300 ${
          magoDer ? 'right-4' : 'left-4'
        }`}
      >
        <div
          className="tut-flote grid h-16 w-16 place-items-center rounded-full text-4xl shadow-2xl"
          style={{
            background: 'var(--ui-panel-solido, var(--ui-panel))',
            boxShadow: `0 0 0 3px ${COLOR_FORMA.mago}`,
          }}
        >
          <Icono emoji={MAGO.emoji} />
        </div>
        <span
          className="texto-cta rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-lg"
          style={{ background: COLOR_FORMA.mago }}
        >
          {t('mascota.mago.nombre', 'Mago')}
        </span>
      </div>

      {/* Tarjeta del paso (re-montada por paso para re-animar y re-medir). */}
      <div
        key={`${def.id}-${paso}`}
        ref={tarjetaRef}
        className="ui-panel-legible ui-pop pointer-events-auto absolute w-80 max-w-[calc(100vw-16px)] rounded-2xl border border-white/10 p-4 shadow-2xl"
        style={posTarjeta ? { left: posTarjeta.left, top: posTarjeta.top } : { left: -9999, top: 0 }}
      >
        {/* Pico del bocadillo cuando la tarjeta habla desde el mago. */}
        {!cajaFinal && !magoDer && (
          <div
            className="absolute -left-1.5 bottom-6 h-3 w-3 rotate-45"
            style={{ background: 'var(--ui-panel-solido, var(--ui-panel))' }}
          />
        )}
        <p className="text-accent mb-1 text-sm font-bold">{titulo}</p>
        <p className="text-sm leading-relaxed text-white/85">{tt(p.texto)}</p>
        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-[11px] text-white/40">
            {t('tut.paso', 'Paso {i} de {n}', { i: paso + 1, n: def.pasos.length })}
          </span>
          <button
            type="button"
            onClick={() => void useTutorial.getState().salir()}
            className="ml-auto rounded-lg px-2 py-1 text-xs font-semibold text-white/45 transition hover:bg-white/10 hover:text-white/80"
          >
            {t('tut.salir', 'Salir')}
          </button>
          <button
            type="button"
            onClick={() => void useTutorial.getState().atras()}
            disabled={paso === 0 || ocupado}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-30"
          >
            {t('tut.atras', 'Atrás')}
          </button>
          <button
            type="button"
            onClick={() => void useTutorial.getState().siguiente()}
            disabled={ocupado}
            className="ui-accent-bg rounded-lg px-3 py-1 text-xs font-bold transition hover:brightness-110 disabled:opacity-50"
          >
            {ultimo ? t('tut.terminar', 'Terminar') : t('tut.siguiente', 'Siguiente')}
          </button>
        </div>
      </div>
    </div>
  )
}
