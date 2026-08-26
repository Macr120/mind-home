import { useEffect, useState } from 'react'
import {
  usePaintball,
  paintballFrame,
  leerMarcadorPaintball,
  configAnterior,
  MAX_BOTS_ROYALE,
  VIDAS_PAINTBALL,
  type ModoPaintball,
  type JugadorPaintball,
} from '../state/paintballStore'
import { useAsistentes } from '../state/asistentesStore'
import { useCam } from '../state/cameraStore'
import { ControlesTiro } from './ControlesTiro'
import { LookPad } from './MoveControls'
import { SliderProp } from './comun/SliderProp'
import { useT, type TFunc } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { useTopeHud } from './hudMedida'
import { vivo } from './estilos'

/** Textos por defecto de los mensajes del HUD (emojis de celebración se quedan). */
const MENSAJES: Record<string, string> = {
  fuera: '¡{nombre} está fuera!',
  teDieron: '¡Te dieron! Pierdes una vida',
  nivel: 'Baja a la planta baja para jugar.',
  sinAsistentes: 'Crea un asistente para jugar contra él.',
  faltan: 'Necesitas al menos 3 asistentes para 2 vs 2.',
}

/** Tramos de la barra de dificultad (mismos niveles que canchas y carrera). */
const NIVELES: { v: number; clave: string; es: string }[] = [
  { v: 0, clave: 'dif.muyFacil', es: 'Muy fácil' },
  { v: 0.25, clave: 'dif.facil', es: 'Fácil' },
  { v: 0.5, clave: 'dif.normal', es: 'Normal' },
  { v: 0.75, clave: 'dif.dificil', es: 'Difícil' },
  { v: 1, clave: 'dif.experto', es: 'Experto' },
]

const barajar = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5)

/**
 * Pila inferior-derecha durante la batalla (ocupa el hueco de NavControls):
 * cambio de vista, apuntar y disparar. Los dos últimos son los mismos controles
 * de la marcadora suelta (`ui/ControlesTiro.tsx`), así que en PC el ratón
 * capturado hace exactamente lo mismo.
 */
function PilaPaintball({ t }: { t: TFunc }) {
  const refTope = useTopeHud('paintball')
  const vista = useCam((s) => s.vista)
  const primera = vista === 'primera'
  return (
    <div ref={refTope} className="safe-inf safe-fin pointer-events-none absolute bottom-4 end-4 z-30 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => usePaintball.getState().setVistaCombate(primera ? 'tercera' : 'primera')}
        title={t('paintball.cambiarVista', 'Cambiar entre 1ª y 3ª persona (tecla V)')}
        className="ui-panel-glass pointer-events-auto h-9 w-24 rounded-full border border-white/10 text-xs font-bold text-white/80 backdrop-blur-md transition hover:bg-white/10 active:scale-95"
      >
        {primera ? t('nav3d.vista1Corta', '1ª') : t('nav3d.vista3Corta', '3ª')}
      </button>
      {/* Joystick de vista: con el dedo, ES la mira (en PC se apunta con el ratón). */}
      <div className="pointer-events-auto">
        <LookPad />
      </div>
      <ControlesTiro />
    </div>
  )
}

/** Chip de un jugador en el marcador: color de pintura, nombre y vidas. */
function ChipJugador({ j, t }: { j: JugadorPaintball; t: TFunc }) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 ${
        j.fuera ? 'opacity-40' : ''
      }`}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: j.color }} />
      <span className={`max-w-24 truncate text-[11px] font-bold ${j.fuera ? 'line-through' : ''}`}>
        {j.id === 'yo' ? t('paintball.tu', 'Tú') : j.nombre}
      </span>
      <span className="texto-vivo text-[9px] leading-none tracking-tight" style={vivo(j.color)}>
        {Array.from({ length: VIDAS_PAINTBALL }).map((_, i) => (
          <span key={i} className={i < j.vidas ? '' : 'opacity-20'}>
            ●
          </span>
        ))}
      </span>
    </span>
  )
}

/**
 * HUD del modo paintball: menú de batalla (modo, rivales y dificultad), cuenta
 * atrás, marcador en vivo con vidas por jugador y pantalla de resultados.
 */
export function PaintballOverlay() {
  const t = useT()
  const fase = usePaintball((s) => s.fase)
  const modoSel = usePaintball((s) => s.modo)
  const jugadores = usePaintball((s) => s.jugadores)
  const resultado = usePaintball((s) => s.resultado)
  const mensaje = usePaintball((s) => s.mensaje)
  const dificultad = usePaintball((s) => s.dificultad)
  const vistaCombate = usePaintball((s) => s.vistaCombate)
  const asistentes = useAsistentes((s) => s.lista)
  // Refresco del semáforo (paintballFrame.reloj no es reactivo).
  const [, setTick] = useState(0)
  useEffect(() => {
    if (fase !== 'cuenta' && fase !== 'jugando') return
    const id = window.setInterval(() => setTick((n) => n + 1), 100)
    return () => window.clearInterval(id)
  }, [fase])

  if (!fase) return null
  const p = usePaintball.getState()
  const nivel = NIVELES.reduce((a, b) =>
    Math.abs(b.v - dificultad) < Math.abs(a.v - dificultad) ? b : a,
  )
  const marcador = leerMarcadorPaintball()

  const textoMensaje = (m: NonNullable<typeof mensaje>) =>
    t(`paintball.msg.${m.clave}`, MENSAJES[m.clave] ?? m.clave, { nombre: m.nombre ?? '' })

  if (fase === 'config') {
    const modos: { id: ModoPaintball; etiqueta: string }[] = [
      { id: '1v1', etiqueta: t('paintball.m1v1', '1 vs 1') },
      { id: '2v2', etiqueta: t('paintball.m2v2', '2 vs 2') },
      { id: 'royale', etiqueta: t('paintball.mRoyale', 'Batalla campal') },
    ]
    return (
      <div className="pointer-events-none absolute start-0 end-0 top-14 z-30 flex justify-center px-3">
        <div className="ui-hud ui-pop pointer-events-auto flex w-full max-w-sm flex-col gap-2 rounded-2xl border border-white/10 p-3">
          <p className="text-center text-sm font-black text-white">
            <Icono nombre="paintball" /> {t('paintball.titulo', 'Paintball')}
          </p>
          <p className="text-center text-[11px] font-semibold text-white/50">
            {t('paintball.marcador', 'Victorias')}: {marcador.victorias} ·{' '}
            {t('paintball.derrotas', 'Derrotas')}: {marcador.derrotas}
          </p>
          <div className="flex items-center justify-center gap-1.5">
            {modos.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => p.setModo(m.id)}
                className={`h-9 flex-1 rounded-lg border text-xs font-bold text-white transition active:scale-95 ${
                  modoSel === m.id
                    ? 'border-sky-400/60 bg-sky-600'
                    : 'border-white/10 bg-white/10 hover:bg-white/20'
                }`}
              >
                {m.etiqueta}
              </button>
            ))}
          </div>
          {/* Vista del combate: se juega en 1ª o en 3ª persona (se recuerda). */}
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-[11px] font-semibold text-white/60">
              {t('paintball.vista', 'Vista')}:
            </span>
            {([
              { id: 'primera' as const, etiqueta: t('paintball.vista1', '1ª persona') },
              { id: 'tercera' as const, etiqueta: t('paintball.vista3', '3ª persona') },
            ]).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => p.setVistaCombate(v.id)}
                className={`h-8 flex-1 rounded-lg border text-xs font-bold text-white transition active:scale-95 ${
                  vistaCombate === v.id
                    ? 'border-sky-400/60 bg-sky-600'
                    : 'border-white/10 bg-white/10 hover:bg-white/20'
                }`}
              >
                {v.etiqueta}
              </button>
            ))}
          </div>
          <SliderProp
            label={t('juego.dificultad', 'Dificultad')}
            value={dificultad}
            min={0}
            max={1}
            step={0.25}
            fmt={() => t(nivel.clave, nivel.es)}
            onChange={(v) => p.setDificultad(v)}
            onReset={() => p.setDificultad(0.5)}
          />
          {modoSel === '1v1' && (
            <>
              <p className="text-center text-[11px] font-semibold text-white/50">
                {t('paintball.eligeRival', 'Elige a tu rival:')}
              </p>
              <div className="flex max-h-32 flex-wrap items-center justify-center gap-1.5 overflow-y-auto">
                {asistentes.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => p.empezar('1v1', [a.id])}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-95"
                  >
                    <Icono emoji={a.emoji} /> {a.nombre}
                  </button>
                ))}
              </div>
            </>
          )}
          {modoSel === '2v2' &&
            (asistentes.length < 3 ? (
              <p className="text-center text-[11px] font-bold text-amber-300">
                {t('paintball.msg.faltan', MENSAJES.faltan)}
              </p>
            ) : (
              <>
                <p className="text-center text-[11px] font-semibold text-white/50">
                  {t('paintball.eligeCompanero', 'Elige a tu compañero (los rivales salen al azar):')}
                </p>
                <div className="flex max-h-32 flex-wrap items-center justify-center gap-1.5 overflow-y-auto">
                  {asistentes.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        const rivales = barajar(asistentes.filter((x) => x.id !== a.id)).slice(0, 2)
                        p.empezar('2v2', [a.id, ...rivales.map((r) => r.id)])
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-95"
                    >
                      <Icono emoji={a.emoji} /> {a.nombre}
                    </button>
                  ))}
                </div>
              </>
            ))}
          {modoSel === 'royale' && (
            <>
              <p className="text-center text-[11px] font-semibold text-white/50">
                {t('paintball.royaleDesc', 'Todos contra todos: tú contra tus asistentes por toda la casa.')}
              </p>
              <button
                type="button"
                onClick={() => p.empezar('royale', barajar(asistentes).slice(0, MAX_BOTS_ROYALE).map((a) => a.id))}
                className="h-10 rounded-lg border border-emerald-400/50 bg-emerald-600 text-sm font-bold texto-cta transition hover:brightness-110 active:scale-95"
              >
                {t('paintball.empezar', 'Empezar la batalla')}
              </button>
            </>
          )}
          <p className="text-center text-[10px] leading-snug text-white/40">
            {t('paintball.reglas', 'Cada quien aguanta 3 bolazos. Gana el último equipo en pie. La casa es el campo de batalla.')}
          </p>
          {mensaje && (
            <p className="text-center text-[11px] font-bold text-amber-300">{textoMensaje(mensaje)}</p>
          )}
          <button
            type="button"
            onClick={() => p.cancelar()}
            className="h-9 rounded-lg border border-white/10 bg-white/10 text-xs font-bold text-white transition hover:bg-white/20 active:scale-95"
          >
            {t('paintball.salir', 'Salir')}
          </button>
        </div>
      </div>
    )
  }

  if (fase === 'cuenta') {
    const n = Math.max(1, Math.ceil(-paintballFrame.reloj))
    return (
      <>
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-3">
          <div className="ui-hud ui-pop flex h-28 w-28 items-center justify-center rounded-full border-4 border-sky-400/70 text-6xl font-black text-sky-300">
            {n}
          </div>
          <p className="ui-hud rounded-full border border-white/10 px-4 py-1 text-xs font-bold text-white/80">
            {t('paintball.posicionate', '¡Busca cobertura!')}
          </p>
        </div>
        <PilaPaintball t={t} />
      </>
    )
  }

  if (fase === 'jugando') {
    const equipo0 = jugadores.filter((j) => j.equipo === 0)
    const rivales = jugadores.filter((j) => j.equipo !== 0)
    return (
      <>
        {/* En vertical baja bajo la fila de botones de arriba (casa / engrane). */}
        <div className="pointer-events-none absolute start-0 end-0 top-16 z-30 flex flex-col items-center gap-2 sm:top-3">
          <div className="ui-hud pointer-events-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-white/10 px-3 py-1.5 text-white">
            {equipo0.map((j) => (
              <ChipJugador key={j.id} j={j} t={t} />
            ))}
            <span className="text-[10px] font-black text-white/40">VS</span>
            {rivales.map((j) => (
              <ChipJugador key={j.id} j={j} t={t} />
            ))}
            <button
              type="button"
              onClick={() => p.cancelar()}
              className="rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/70 transition hover:bg-white/20 active:scale-95"
            >
              {t('paintball.abandonar', 'Abandonar')}
            </button>
          </div>
          {mensaje && (
            <div className="ui-hud ui-pop rounded-xl border border-amber-300/40 px-5 py-2 text-xl font-black text-amber-300">
              {textoMensaje(mensaje)}
            </div>
          )}
        </div>
        {paintballFrame.reloj < 0.8 && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <div className="text-6xl font-black text-emerald-400 drop-shadow-lg">
              {t('paintball.ya', '¡YA!')}
            </div>
          </div>
        )}
        <PilaPaintball t={t} />
      </>
    )
  }

  // Terminada: resultados y revancha.
  const cfg = configAnterior()
  return (
    <div className="pointer-events-none absolute start-0 end-0 top-14 z-30 flex justify-center px-3">
      <div className="ui-hud ui-pop pointer-events-auto flex w-full max-w-sm flex-col gap-2 rounded-2xl border border-white/10 p-3">
        <p className="text-center text-lg font-black text-white">
          {resultado === 'ganaste'
            ? t('paintball.ganaste', '¡GANASTE LA BATALLA! 🏆')
            : t('paintball.perdiste', 'Te llenaron de pintura… 🎨')}
        </p>
        <div className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/5 p-2">
          {jugadores.map((j) => (
            <div key={j.id} className="flex items-center gap-2 text-xs font-semibold text-white/80">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: j.color }} />
              <span className={`flex-1 truncate ${j.fuera ? 'text-white/45 line-through' : ''}`}>
                {j.id === 'yo' ? t('paintball.tu', 'Tú') : j.nombre}
              </span>
              <span className="tabular-nums text-white/60">
                {t('paintball.impactos', 'Impactos')}: {j.impactos}
              </span>
              <span className={j.fuera ? 'text-red-300/80' : 'text-emerald-300/90'}>
                {j.fuera ? t('paintball.fuera', 'Fuera') : t('paintball.enPie', 'En pie')}
              </span>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] font-semibold text-white/50">
          {t('paintball.marcador', 'Victorias')}: {marcador.victorias} ·{' '}
          {t('paintball.derrotas', 'Derrotas')}: {marcador.derrotas}
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => cfg && p.empezar(cfg.modo, cfg.rivales)}
            className="h-10 flex-1 rounded-lg border border-emerald-400/50 bg-emerald-600 text-sm font-bold texto-cta transition hover:brightness-110 active:scale-95"
          >
            {t('paintball.otraVez', 'Otra vez')}
          </button>
          <button
            type="button"
            onClick={() => p.cancelar()}
            className="h-10 flex-1 rounded-lg border border-white/10 bg-white/10 text-sm font-bold text-white transition hover:bg-white/20 active:scale-95"
          >
            {t('paintball.salir', 'Salir')}
          </button>
        </div>
      </div>
    </div>
  )
}
