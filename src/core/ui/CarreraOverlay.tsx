import { Fragment, useEffect, useState } from 'react'
import { useCarrera, carreraFrame, useRecordsDeMeta, type TipoItem } from '../state/carreraStore'
import { monturaFrame } from '../state/monturaStore'
import type { NombreIcono } from './iconos/catalogo'
import { useAsistentes } from '../state/asistentesStore'
import { vehiculoDe, VEHICULOS_JUGABLES, type TipoVehiculo } from '../house/vehiculos'
import { SliderProp } from './comun/SliderProp'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { useTopeHud } from './hudMedida'

/** Textos por defecto de los mensajes del HUD (los emojis de celebración se quedan). */
const MENSAJES: Record<string, string> = {
  record: '¡Nuevo récord de vuelta! 🎉',
  vuelta: '¡Vuelta completada!',
  corta: 'La pista es muy corta para una carrera…',
}

/** Tramos de la barra de dificultad (mismos niveles que canchas). */
const NIVELES: { v: number; clave: string; es: string }[] = [
  { v: 0, clave: 'dif.muyFacil', es: 'Muy fácil' },
  { v: 0.25, clave: 'dif.facil', es: 'Fácil' },
  { v: 0.5, clave: 'dif.normal', es: 'Normal' },
  { v: 0.75, clave: 'dif.dificil', es: 'Difícil' },
  { v: 1, clave: 'dif.experto', es: 'Experto' },
]

/**
 * Botón GRANDE de derrape (mantener presionado) en el hueco del cubo de
 * navegación (NavControls se oculta durante la carrera). Space hace lo mismo.
 */
function BotonDerrapeCarrera({ title }: { title: string }) {
  return (
    <button
      type="button"
      title={title}
      onPointerDown={() => {
        monturaFrame.driftInput = true
      }}
      onPointerUp={() => {
        monturaFrame.driftInput = false
      }}
      onPointerLeave={() => {
        monturaFrame.driftInput = false
      }}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'none' }}
      className="ui-panel-glass pointer-events-auto grid h-20 w-20 place-items-center rounded-full border-4 border-amber-400/70 shadow-xl backdrop-blur-md transition active:scale-90"
    >
      <Icono nombre="viento" className="text-4xl leading-none" />
    </button>
  )
}

/** Icono del catálogo para cada ítem del slot. */
const ICONO_ITEM: Record<TipoItem, NombreIcono> = {
  banana: 'banana',
  turbo: 'energia',
  bomba: 'bomba',
}

/** Pila inferior-derecha durante la carrera: slot de ítem encima del derrape. */
function PilaCarrera({ t }: { t: (k: string, d: string) => string }) {
  const item = useCarrera((s) => s.item)
  const refTope = useTopeHud('carrera')
  return (
    <div ref={refTope} className="pointer-events-none absolute bottom-[calc(1rem+var(--safe-bottom))] end-[calc(1rem+var(--safe-end))] z-30 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => useCarrera.getState().usarItem()}
        title={t('carrera.usarItem', 'Usar ítem (E)')}
        className={`ui-panel-glass pointer-events-auto grid h-14 w-14 place-items-center rounded-full border-2 shadow-xl backdrop-blur-md transition active:scale-90 ${
          item ? 'border-amber-400/70' : 'border-white/10 opacity-50'
        }`}
      >
        {item ? (
          <Icono nombre={ICONO_ITEM[item]} className="text-2xl leading-none" />
        ) : (
          <Icono nombre="caja" className="text-xl leading-none opacity-40" />
        )}
      </button>
      <BotonDerrapeCarrera title={t('veh.derrape', 'Derrape (Espacio)')} />
    </div>
  )
}

/** ms → "m:ss.d" para el crono y los tiempos de vuelta. */
const fmtMs = (ms: number) => {
  const t = Math.max(0, ms)
  const m = Math.floor(t / 60000)
  const s = Math.floor((t % 60000) / 1000)
  const d = Math.floor((t % 1000) / 100)
  return `${m}:${String(s).padStart(2, '0')}.${d}`
}

/** Tabla de mejores tiempos por vehículo de esta meta (previa y resultados). */
function TablaTiempos({
  vehiculo,
  t,
}: {
  vehiculo: TipoVehiculo
  t: (k: string, d: string) => string
}) {
  const records = useRecordsDeMeta(carreraFrame.metaCol, carreraFrame.metaRow)
  const porVehiculo = new Map((records ?? []).map((r) => [r.vehiculo, r]))
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/5 p-2">
      <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {t('carrera.tabla.titulo', 'Mejores tiempos')}
      </p>
      <div className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold tabular-nums">
        <span />
        <span className="text-white/40">{t('carrera.tabla.vueltaCol', 'Vuelta')}</span>
        <span className="text-white/40">{t('carrera.tabla.totalCol', 'Total')}</span>
        <span className="text-white/40">{t('carrera.tabla.vd', 'V/D')}</span>
        {VEHICULOS_JUGABLES.filter((v) => v.tipo !== 'ovni').map((v) => {
          const r = porVehiculo.get(v.tipo)
          const cls = v.tipo === vehiculo ? 'text-amber-300' : 'text-white/70'
          return (
            <Fragment key={v.tipo}>
              <span className={cls} title={v.nombre}>
                <Icono emoji={v.icono} />
              </span>
              <span className={cls}>{r?.mejorVuelta != null ? fmtMs(r.mejorVuelta) : '—'}</span>
              <span className={cls}>
                {r?.mejorTotal != null
                  ? `${fmtMs(r.mejorTotal)} · ${r.vueltasDeTotal ?? '?'}v`
                  : '—'}
              </span>
              <span className={cls}>
                {r?.victorias ?? 0}-{r?.derrotas ?? 0}
              </span>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

/**
 * HUD del modo carrera: prompt al llegar montado a la meta (vueltas, dificultad
 * y rival), semáforo 3-2-1, crono en vivo con vueltas y récord, y resultados.
 */
export function CarreraOverlay() {
  const t = useT()
  const fase = useCarrera((s) => s.fase)
  const vehiculo = useCarrera((s) => s.vehiculo)
  const montadoPropio = useCarrera((s) => s.montadoPropio)
  const vueltasTotales = useCarrera((s) => s.vueltasTotales)
  const vueltaActual = useCarrera((s) => s.vueltaActual)
  const tiempos = useCarrera((s) => s.tiempos)
  const mejorVuelta = useCarrera((s) => s.mejorVuelta)
  const dificultad = useCarrera((s) => s.dificultad)
  const rivalId = useCarrera((s) => s.rivalId)
  const rivalNombre = useCarrera((s) => s.rivalNombre)
  const rivalColor = useCarrera((s) => s.rivalColor)
  const rivalVueltas = useCarrera((s) => s.rivalVueltas)
  const resultado = useCarrera((s) => s.resultado)
  const mensaje = useCarrera((s) => s.mensaje)
  const asistentes = useAsistentes((s) => s.lista)
  const [vueltas, setVueltas] = useState(3)
  // Refresco del crono/semáforo (carreraFrame.reloj no es reactivo).
  const [, setTick] = useState(0)
  useEffect(() => {
    if (fase !== 'semaforo' && fase !== 'corriendo') return
    const id = window.setInterval(() => setTick((n) => n + 1), 100)
    return () => window.clearInterval(id)
  }, [fase])
  // Tecla E: usa el ítem del slot (patrón de la tecla V de NavControls).
  useEffect(() => {
    if (fase !== 'corriendo') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'e') return
      const el = document.activeElement as HTMLElement | null
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      )
        return
      useCarrera.getState().usarItem()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fase])

  if (!fase || !vehiculo) return null
  const c = useCarrera.getState()
  const def = vehiculoDe(vehiculo)
  const nivel = NIVELES.reduce((a, b) =>
    Math.abs(b.v - dificultad) < Math.abs(a.v - dificultad) ? b : a,
  )

  if (fase === 'previa') {
    return (
      <div className="pointer-events-none absolute start-0 end-0 top-14 z-30 flex justify-center px-3">
        <div className="ui-hud ui-pop pointer-events-auto flex w-full max-w-sm flex-col gap-2 rounded-2xl border border-white/10 p-3">
          <p className="text-center text-sm font-black text-white">
            <Icono nombre="bandera" /> {t('carrera.titulo', 'Carrera')} · {def.nombre}
          </p>
          {!montadoPropio && (
            // A pie: se elige el vehículo que se presta para la carrera.
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {VEHICULOS_JUGABLES.filter((v) => v.tipo !== 'ovni').map((v) => (
                <button
                  key={v.tipo}
                  type="button"
                  onClick={() => void c.setVehiculo(v.tipo)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-white transition active:scale-95 ${
                    vehiculo === v.tipo
                      ? 'border-amber-400/60 bg-amber-600'
                      : 'border-white/10 bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Icono emoji={v.icono} /> {v.nombre}
                </button>
              ))}
            </div>
          )}
          {mejorVuelta != null && (
            <p className="text-center text-[11px] font-semibold text-white/60">
              {t('carrera.mejor', 'Mejor vuelta')}:{' '}
              <span className="tabular-nums">{fmtMs(mejorVuelta)}</span>
            </p>
          )}
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-[11px] font-semibold text-white/60">
              {t('carrera.vueltas', 'Vueltas')}:
            </span>
            {[1, 3, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setVueltas(n)}
                className={`h-8 w-8 rounded-lg border text-xs font-bold text-white transition active:scale-95 ${
                  vueltas === n
                    ? 'border-amber-400/60 bg-amber-600'
                    : 'border-white/10 bg-white/10 hover:bg-white/20'
                }`}
              >
                {n}
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
            onChange={(v) => c.setDificultad(v)}
            onReset={() => c.setDificultad(0.5)}
          />
          <button
            type="button"
            onClick={() => c.iniciar(vueltas)}
            className="h-10 rounded-lg border border-emerald-400/50 bg-emerald-600 text-sm font-bold texto-cta transition hover:brightness-110 active:scale-95"
          >
            {t('carrera.solo', 'Correr solo (contrarreloj)')}
          </button>
          <p className="text-center text-[11px] font-semibold text-white/50">
            {t('carrera.contraIA', 'O contra un asistente:')}
          </p>
          <div className="flex max-h-32 flex-wrap items-center justify-center gap-1.5 overflow-y-auto">
            {asistentes.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => c.iniciar(vueltas, { id: a.id, nombre: a.nombre, color: a.color })}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-95"
              >
                <Icono emoji={a.emoji} /> {a.nombre}
              </button>
            ))}
          </div>
          {mensaje && (
            <p className="text-center text-[11px] font-bold text-amber-300">
              {t(`carrera.msg.${mensaje}`, MENSAJES[mensaje] ?? mensaje)}
            </p>
          )}
          <TablaTiempos vehiculo={vehiculo} t={t} />
        </div>
      </div>
    )
  }

  if (fase === 'semaforo') {
    const n = Math.max(1, Math.ceil(-carreraFrame.reloj))
    return (
      <>
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="ui-hud ui-pop flex h-28 w-28 items-center justify-center rounded-full border-4 border-red-500/70 text-6xl font-black text-red-400">
            {n}
          </div>
        </div>
        {/* El botón de derrape ya está disponible para precargar el dedo. */}
        <PilaCarrera t={t} />
      </>
    )
  }

  if (fase === 'corriendo') {
    const cronoVuelta = Math.max(0, (carreraFrame.reloj - carreraFrame.ultimoCruce) * 1000)
    return (
      <>
        {/* En vertical baja bajo la fila de botones de arriba (casa / engrane). */}
        <div className="pointer-events-none absolute start-0 end-0 top-16 z-30 flex flex-col items-center gap-2 sm:top-3">
          <div className="ui-hud pointer-events-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-white/10 px-4 py-1.5 text-sm font-black text-white">
            <Icono nombre="bandera" />
            <span className="tabular-nums text-base">{fmtMs(cronoVuelta)}</span>
            <span>
              {t('carrera.vuelta', 'Vuelta')} {vueltaActual}/{vueltasTotales}
            </span>
            {mejorVuelta != null && (
              <span className="text-[10px] font-semibold text-white/50">
                {t('carrera.mejor', 'Mejor vuelta')}{' '}
                <span className="tabular-nums">{fmtMs(mejorVuelta)}</span>
              </span>
            )}
            {rivalId && (
              <span className="text-[10px] font-semibold text-white/50">
                {rivalNombre}: {rivalVueltas}/{vueltasTotales}
              </span>
            )}
            <button
              type="button"
              onClick={() => c.cancelar()}
              className="rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/70 transition hover:bg-white/20 active:scale-95"
            >
              {t('carrera.abandonar', 'Abandonar')}
            </button>
          </div>
          {mensaje && (
            <div className="ui-hud ui-pop rounded-xl border border-amber-300/40 px-5 py-2 text-xl font-black text-amber-300">
              {t(`carrera.msg.${mensaje}`, MENSAJES[mensaje] ?? mensaje)}
            </div>
          )}
        </div>
        {carreraFrame.reloj < 0.8 && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <div className="text-6xl font-black text-emerald-400 drop-shadow-lg">
              {t('carrera.ya', '¡YA!')}
            </div>
          </div>
        )}
        {/* Posición en vivo contra el rival. */}
        {rivalId && (
          <div className="pointer-events-none absolute start-4 top-16 z-30">
            <span
              className={`text-5xl font-black drop-shadow-lg ${
                carreraFrame.posicion === 1 ? 'text-amber-300' : 'text-white/70'
              }`}
            >
              P{carreraFrame.posicion}
            </span>
          </div>
        )}
        <PilaCarrera t={t} />
      </>
    )
  }

  // Terminada: resultados y revancha.
  const total = tiempos.reduce((a, b) => a + b, 0)
  return (
    <div className="pointer-events-none absolute start-0 end-0 top-14 z-30 flex justify-center px-3">
      <div className="ui-hud ui-pop pointer-events-auto flex w-full max-w-sm flex-col gap-2 rounded-2xl border border-white/10 p-3">
        <p className="text-center text-lg font-black text-white">
          {resultado === 'ganaste'
            ? t('carrera.ganaste', '¡GANASTE LA CARRERA! 🏆')
            : resultado === 'perdiste'
              ? t('carrera.perdiste', 'El rival ganó la carrera…')
              : t('carrera.fin', '¡Carrera terminada! 🏁')}
        </p>
        <div className="flex flex-col items-center gap-0.5 text-xs font-semibold text-white/70">
          {tiempos.map((ms, i) => (
            <span key={i} className="tabular-nums">
              {t('carrera.vuelta', 'Vuelta')} {i + 1}: {fmtMs(ms)}
            </span>
          ))}
          {tiempos.length > 1 && (
            <span className="tabular-nums text-white">
              {t('carrera.total', 'Total')}: {fmtMs(total)}
            </span>
          )}
          {mejorVuelta != null && (
            <span className="tabular-nums text-amber-300">
              {t('carrera.mejor', 'Mejor vuelta')}: {fmtMs(mejorVuelta)}
            </span>
          )}
        </div>
        <TablaTiempos vehiculo={vehiculo} t={t} />
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() =>
              c.iniciar(
                vueltasTotales,
                rivalId && rivalNombre
                  ? { id: rivalId, nombre: rivalNombre, color: rivalColor ?? undefined }
                  : undefined,
              )
            }
            className="h-10 flex-1 rounded-lg border border-emerald-400/50 bg-emerald-600 text-sm font-bold texto-cta transition hover:brightness-110 active:scale-95"
          >
            {t('carrera.otraVez', 'Otra vez')}
          </button>
          <button
            type="button"
            onClick={() => c.cancelar()}
            className="h-10 flex-1 rounded-lg border border-white/10 bg-white/10 text-sm font-bold text-white transition hover:bg-white/20 active:scale-95"
          >
            {t('carrera.salir', 'Salir')}
          </button>
        </div>
      </div>
    </div>
  )
}
