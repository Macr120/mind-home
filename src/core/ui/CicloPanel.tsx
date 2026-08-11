import { useRef, useState, useEffect } from 'react'
import { useCiclo } from '../state/cicloStore'
import { estadoCielo } from '../house/cielo'
import { useRutinasUI } from '../state/rutinasUiStore'
import { useT, localeActual } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/** Degradado de las 24 h (horizontal): medianoche → amanecer → mediodía → atardecer → medianoche. */
const GRADIENTE_24H =
  'linear-gradient(to right, #0a1020 0%, #1a2540 12%, #e8915a 25%, #9cc3f0 50%, #e8915a 75%, #1a2540 88%, #0a1020 100%)'

const HORAS = [0, 6, 12, 18, 24]

/** Dos dígitos. */
const dd = (n: number) => String(n).padStart(2, '0')

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/**
 * Reloj 24 h + fecha. `compacto` reduce el tamaño y abrevia la fecha (para el widget
 * pequeño). Muestra siempre la hora real del sistema (`minutosReloj`), aunque el paso
 * del tiempo de la escena 3D esté pausado en otra hora.
 */
function RelojInfo({ compacto = false }: { compacto?: boolean }) {
  const minutos = useCiclo((s) => s.minutosReloj)
  const hh = Math.floor(minutos / 60)
  const mm = Math.floor(minutos % 60)
  const fecha = new Date().toLocaleDateString(
    localeActual(),
    compacto
      ? { weekday: 'short', day: 'numeric', month: 'short' }
      : { weekday: 'long', day: 'numeric', month: 'long' },
  )
  return (
    <div>
      <p
        className={`font-black tabular-nums tracking-tight text-white ${
          compacto ? 'text-2xl leading-none' : 'text-3xl'
        }`}
      >
        {dd(hh)}:{dd(mm)}
      </p>
      <p className="mt-0.5 text-[11px] capitalize leading-snug text-white/45">{fecha}</p>
    </div>
  )
}

/** Un dimmer horizontal (0–150 %). */
function Dimmer({
  icon,
  label,
  value,
  onChange,
  accent,
}: {
  icon: string
  label: string
  value: number
  onChange: (v: number) => void
  accent: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-medium text-white/60">
        <span>
          <Icono emoji={icon} /> {label}
        </span>
        <span className="tabular-nums text-white/40">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1.5}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`mt-0.5 w-full cursor-pointer ${accent}`}
        title={`${label}: ${Math.round(value * 100)} %`}
      />
    </div>
  )
}

/** Los dos dimmers: intensidad del sol/luna y de los focos de los cuartos. */
function Dimmers() {
  const t = useT()
  const brilloCielo = useCiclo((s) => s.brilloCielo)
  const brilloFocos = useCiclo((s) => s.brilloFocos)
  const setBrilloCielo = useCiclo((s) => s.setBrilloCielo)
  const setBrilloFocos = useCiclo((s) => s.setBrilloFocos)
  return (
    <div className="space-y-1.5">
      <Dimmer
        icon="☀️"
        label={t('ciclo.solLuna', 'Sol y luna')}
        value={brilloCielo}
        onChange={setBrilloCielo}
        accent="accent-amber-400"
      />
      <Dimmer
        icon="💡"
        label={t('ciclo.focos', 'Focos cuartos')}
        value={brilloFocos}
        onChange={setBrilloFocos}
        accent="accent-yellow-300"
      />
    </div>
  )
}

/** Switch para activar/pausar el avance automático de la hora. Al pausar, fija el fondo en el color del cielo actual. */
function PasoTiempoSwitch() {
  const t = useT()
  const modo = useCiclo((s) => s.modo)
  const enVivo = useCiclo((s) => s.enVivo)
  const pausarTiempo = useCiclo((s) => s.pausarTiempo)
  const activo = modo === 'vivo'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => (activo ? pausarTiempo() : enVivo())}
      title={t('ciclo.pasoToggle', 'Activar o pausar el paso del tiempo')}
      className={`relative h-5 w-9 flex-shrink-0 rounded-full transition ${
        activo ? 'bg-emerald-500' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
          activo ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

/** Barra de 24 h horizontal: arrastra para mover el sol/hora (entra en modo manual). */
function BarraTiempo() {
  const t = useT()
  const minutos = useCiclo((s) => s.minutos)
  const setMinutos = useCiclo((s) => s.setMinutos)
  const fijarFondoEnHoraActual = useCiclo((s) => s.fijarFondoEnHoraActual)
  const trackRef = useRef<HTMLDivElement>(null)
  const arrastrando = useRef(false)
  const frac = minutos / 1440
  const cielo = estadoCielo(minutos)

  const aplicar = (clientX: number) => {
    const el = trackRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setMinutos(clamp01((clientX - r.left) / r.width) * 1440)
  }

  return (
    <div>
      <div
        ref={trackRef}
        onPointerDown={(e) => {
          arrastrando.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          aplicar(e.clientX)
        }}
        onPointerMove={(e) => arrastrando.current && aplicar(e.clientX)}
        onPointerUp={(e) => {
          arrastrando.current = false
          e.currentTarget.releasePointerCapture?.(e.pointerId)
          fijarFondoEnHoraActual()
        }}
        className="relative h-3 w-full cursor-pointer rounded-full"
        style={{ background: GRADIENTE_24H }}
        title={t('ciclo.arrastraSol', 'Arrastra para mover el sol')}
      >
        <div
          className="ui-panel absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 text-xs shadow-lg"
          style={{ left: `${frac * 100}%` }}
        >
          <Icono emoji={cielo.faseIcon} />
        </div>
      </div>
      {/* Etiquetas de horas */}
      <div className="relative mt-1 h-3 text-[9px] text-white/35">
        {HORAS.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2 tabular-nums"
            style={{ left: `${(h / 24) * 100}%` }}
          >
            {dd(h)}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Clima real con ubicación del dispositivo (Open-Meteo). */
function ClimaReal() {
  const t = useT()
  const climaActivo = useCiclo((s) => s.climaActivo)
  const clima = useCiclo((s) => s.clima)
  const climaEstado = useCiclo((s) => s.climaEstado)
  const climaError = useCiclo((s) => s.climaError)
  const setClimaActivo = useCiclo((s) => s.setClimaActivo)
  const actualizarClima = useCiclo((s) => s.actualizarClima)

  const cargando = climaActivo && climaEstado === 'cargando'

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
          {t('ciclo.clima', 'Clima real')}
        </p>
        <button
          type="button"
          onClick={() => setClimaActivo(!climaActivo)}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold transition ${
            climaActivo
              ? 'border-sky-400/50 bg-sky-500/15 text-sky-400'
              : 'border-white/15 bg-white/5 text-white/45 hover:text-white/70'
          }`}
        >
          {climaActivo ? 'ON' : 'OFF'}
        </button>
      </div>

      {!climaActivo && (
        <p className="text-[10px] leading-snug text-white/35">
          {t('ciclo.climaDesc', 'Usa la ubicación del sistema para temperatura, lluvia y condiciones actuales.')}
        </p>
      )}

      {cargando && (
        <p className="animate-pulse text-[11px] text-sky-400/80">
          {t('ciclo.cargando', 'Obteniendo clima…')}
          <span className="mt-1 block text-[9px] text-white/30">
            {t('ciclo.cargandoHint', 'Si tarda, el navegador también debe permitir ubicación (candado en la barra).')}
          </span>
        </p>
      )}

      {climaActivo && climaEstado === 'error' && (
        <div className="space-y-1.5">
          <p className="text-[11px] leading-snug text-red-400/90">{climaError}</p>
          <button
            type="button"
            onClick={() => void actualizarClima()}
            className="w-full rounded-lg border border-white/15 bg-white/5 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
          >
            {t('ciclo.reintentar', 'Reintentar')}
          </button>
        </div>
      )}

      {climaActivo && clima && climaEstado === 'ok' && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
          <div className="flex items-start gap-2">
            <span className="text-2xl leading-none">
              <Icono emoji={clima.icono} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-black tabular-nums leading-none text-white">
                {clima.temp}°C
              </p>
              <p className="mt-0.5 truncate text-[11px] text-white/75">{clima.descripcion}</p>
              <p className="truncate text-[10px] text-white/40">
                <Icono nombre="ubicacion" /> {clima.ciudad}
                {clima.aproximada && ' · aprox.'}
              </p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-white/50">
            <span><Icono nombre="lluvia" /> {t('ciclo.lluvia', 'Lluvia')} {clima.probLluvia}%</span>
            <span><Icono nombre="humedad" /> {t('ciclo.humedad', 'Humedad')} {clima.humedad}%</span>
            <span><Icono nombre="viento" /> {t('ciclo.viento', 'Viento')} {clima.viento} km/h</span>
            {clima.precipitacion > 0 && (
              <span><Icono nombre="paraguas" /> {clima.precipitacion} mm/h</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => void actualizarClima()}
            disabled={cargando}
            className="mt-2 w-full rounded-md border border-white/10 py-1 text-[10px] font-semibold text-white/55 transition hover:bg-white/10 hover:text-white/80 disabled:opacity-40"
          >
            {t('ciclo.actualizar', 'Actualizar')}
          </button>
        </div>
      )}
    </div>
  )
}

/** Contenido del menú de ciclo: paso del tiempo + dimmers + volver a hora real. */
function MenuCiclo() {
  const t = useT()
  const modo = useCiclo((s) => s.modo)
  const enVivo = useCiclo((s) => s.enVivo)
  const climaActivo = useCiclo((s) => s.climaActivo)
  const climaEstado = useCiclo((s) => s.climaEstado)
  const actualizarClima = useCiclo((s) => s.actualizarClima)

  // Al abrir el menú: consulta si está ON y no hay carga en curso.
  useEffect(() => {
    if (climaActivo && climaEstado !== 'cargando') void actualizarClima()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2.5">
      <ClimaReal />
      <div className="border-t border-white/10 pt-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
            {t('ciclo.paso', 'Paso del tiempo')}
          </p>
          <PasoTiempoSwitch />
        </div>
        <BarraTiempo />
        {modo !== 'vivo' ? (
          <p className="mt-1.5 text-[9px] leading-snug text-white/30">
            {t('ciclo.pasoPausadoDesc', 'En pausa. Elige el color de fondo en Configuraciones → Fondo.')}
          </p>
        ) : (
          <p className="mt-1.5 text-[9px] uppercase tracking-wide text-white/30">
            {t('ciclo.sol', 'Sol: Este → Oeste')}
          </p>
        )}
      </div>
      <div className="border-t border-white/10 pt-2">
        <Dimmers />
      </div>
      <button
        type="button"
        onClick={enVivo}
        className={`flex w-full items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[11px] font-semibold transition ${
          modo === 'vivo'
            ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400'
            : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
        }`}
        title={t('ciclo.volverHoraReal', 'Volver a la hora real del sistema')}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${modo === 'vivo' ? 'bg-emerald-400' : 'bg-white/40'}`} />
        {modo === 'vivo' ? t('ciclo.enVivo', 'En vivo') : t('ciclo.volverVivo', 'Volver a en vivo')}
      </button>
    </div>
  )
}

/**
 * Widget pequeño con hora/fecha, fase del cielo (menú ciclo) y rutinas.
 * La hora/fecha abre el calendario; la luna/sol abre paso del tiempo y dimmers; ⏰ el panel del día.
 */
export function RelojWidget() {
  const t = useT()
  const [abierto, setAbierto] = useState(false)
  const minutos = useCiclo((s) => s.minutos)
  const cielo = estadoCielo(minutos)
  const abrirCalendario = useRutinasUI((s) => s.abrirCalendario)
  return (
    <div data-tut="reloj.widget" data-tut-zona="calendario" className="pointer-events-auto relative select-none">
      <div className="ui-hud flex items-center gap-0.5 rounded-xl border border-white/10 px-2 py-1">
        <button
          type="button"
          onClick={() => abrirCalendario()}
          title={t('ciclo.abrirCal', 'Abrir calendario de rutinas')}
          className="rounded-lg px-1.5 py-0.5 text-left transition hover:bg-white/10"
        >
          <RelojInfo compacto />
        </button>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          title={t(`ciclo.fase.${cielo.fase}`, cielo.faseLabel)}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg leading-none transition ${
            abierto ? 'bg-white/15 text-white' : 'text-white/55 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Icono emoji={cielo.faseIcon} />
        </button>
      </div>

      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div className="ui-panel-glass ui-pop absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-white/10 p-3 shadow-xl backdrop-blur-md">
            <MenuCiclo />
          </div>
        </>
      )}
    </div>
  )
}
