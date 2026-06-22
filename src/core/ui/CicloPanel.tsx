import { useRef, useState, useEffect } from 'react'
import { useCiclo } from '../state/cicloStore'
import { estadoCielo } from '../house/cielo'
import { useRutinasUI } from '../state/rutinasUiStore'
import { usePendientesHoy } from '../rutinas'
import { useT } from '../i18n/useT'

/** Degradado de las 24 h (horizontal): medianoche → amanecer → mediodía → atardecer → medianoche. */
const GRADIENTE_24H =
  'linear-gradient(to right, #0a1020 0%, #1a2540 12%, #e8915a 25%, #9cc3f0 50%, #e8915a 75%, #1a2540 88%, #0a1020 100%)'

const HORAS = [0, 6, 12, 18, 24]

/** Dos dígitos. */
const dd = (n: number) => String(n).padStart(2, '0')

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/**
 * Reloj 24 h + fecha. `compacto` reduce el tamaño y abrevia la fecha
 * (para el widget pequeño). Lee la hora del ciclo (real o simulada).
 */
export function RelojInfo({ compacto = false }: { compacto?: boolean }) {
  const minutos = useCiclo((s) => s.minutos)
  const hh = Math.floor(minutos / 60)
  const mm = Math.floor(minutos % 60)
  const fecha = new Date().toLocaleDateString(
    'es',
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
          {icon} {label}
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

/** Barra de 24 h horizontal: arrastra para mover el sol/hora (entra en modo manual). */
function BarraTiempo() {
  const minutos = useCiclo((s) => s.minutos)
  const setMinutos = useCiclo((s) => s.setMinutos)
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
        }}
        className="relative h-3 w-full cursor-pointer rounded-full"
        style={{ background: GRADIENTE_24H }}
        title="Arrastra para mover el sol"
      >
        <div
          className="absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-[#12151c] text-xs shadow-lg"
          style={{ left: `${frac * 100}%` }}
        >
          {cielo.faseIcon}
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
              ? 'border-sky-400/50 bg-sky-500/15 text-sky-200'
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
        <p className="animate-pulse text-[11px] text-sky-200/80">
          {t('ciclo.cargando', 'Obteniendo clima…')}
          <span className="mt-1 block text-[9px] text-white/30">
            {t('ciclo.cargandoHint', 'Si tarda, el navegador también debe permitir ubicación (icono 🔒 en la barra).')}
          </span>
        </p>
      )}

      {climaActivo && climaEstado === 'error' && (
        <div className="space-y-1.5">
          <p className="text-[11px] leading-snug text-red-300/90">{climaError}</p>
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
            <span className="text-2xl leading-none">{clima.icono}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-black tabular-nums leading-none text-white">
                {clima.temp}°C
              </p>
              <p className="mt-0.5 truncate text-[11px] text-white/75">{clima.descripcion}</p>
              <p className="truncate text-[10px] text-white/40">
                📍 {clima.ciudad}
                {clima.aproximada && ' · aprox.'}
              </p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-white/50">
            <span>🌧️ Lluvia {clima.probLluvia}%</span>
            <span>💧 Humedad {clima.humedad}%</span>
            <span>💨 Viento {clima.viento} km/h</span>
            {clima.precipitacion > 0 && (
              <span>☔ {clima.precipitacion} mm/h</span>
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
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
          {t('ciclo.paso', 'Paso del tiempo')}
        </p>
        <BarraTiempo />
        <p className="mt-1.5 text-[9px] uppercase tracking-wide text-white/30">
          {t('ciclo.sol', 'Sol: Este → Oeste')}
        </p>
      </div>
      <div className="border-t border-white/10 pt-2">
        <Dimmers />
      </div>
      <button
        type="button"
        onClick={enVivo}
        className={`flex w-full items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[11px] font-semibold transition ${
          modo === 'vivo'
            ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
            : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
        }`}
        title="Volver a la hora real del sistema"
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
  const togglePanel = useRutinasUI((s) => s.togglePanel)
  const pendientes = usePendientesHoy()
  return (
    <div className="pointer-events-auto relative select-none">
      <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-black/55 px-2 py-1 backdrop-blur-sm">
        <button
          type="button"
          onClick={abrirCalendario}
          title={t('ciclo.abrirCal', 'Abrir calendario de rutinas')}
          className="rounded-lg px-1.5 py-0.5 text-left transition hover:bg-white/10"
        >
          <RelojInfo compacto />
        </button>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          title={cielo.faseLabel}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg leading-none transition ${
            abierto ? 'bg-white/15 text-white' : 'text-white/55 hover:bg-white/10 hover:text-white'
          }`}
        >
          {cielo.faseIcon}
        </button>
        <button
          type="button"
          onClick={togglePanel}
          title={t('ciclo.rutinasHoy', 'Rutinas de hoy')}
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base leading-none transition text-white/55 hover:bg-white/10 hover:text-white"
        >
          📒
          {pendientes > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-amber-500 px-0.5 text-[9px] font-bold text-black">
              {pendientes}
            </span>
          )}
        </button>
      </div>

      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-white/10 bg-[#12151c]/95 p-3 shadow-xl backdrop-blur-sm">
            <MenuCiclo />
          </div>
        </>
      )}
    </div>
  )
}
