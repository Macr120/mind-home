import { useEffect, useMemo, useRef, useState } from 'react'
import type { PuntoRuta, SesionEjercicio, SistemaUnidades } from '../../core/data/db'
import { sesionesEjercicioRepo } from '../../core/data/repository'
import { distanciaM, fmtRitmoMin, fmtTiempo, metricasRuta } from './cardioStats'
import { EstadisticasCardio, RutaSvg } from './EstadisticasCardio'
import { hoyISO } from './fecha'
import { distanciaDesdeKm, fmtDistancia, fmtRitmo, unidadDistancia } from './unidades'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { acento } from '../_shared/acento'
import { C_CARDIO } from './constantes'

// Web Bluetooth no está en lib.dom: tipos mínimos para el servicio heart_rate.
interface CaracteristicaBT {
  startNotifications(): Promise<unknown>
  addEventListener(ev: 'characteristicvaluechanged', fn: (e: Event) => void): void
}
interface NavegadorBT extends Navigator {
  bluetooth?: {
    requestDevice(opts: { filters: { services: string[] }[] }): Promise<{
      gatt?: {
        connect(): Promise<{
          getPrimaryService(s: string): Promise<{ getCharacteristic(c: string): Promise<CaracteristicaBT> }>
        }>
        disconnect(): void
      }
    }>
  }
}

/**
 * Entrenamiento de cardio en vivo: cronómetro + ruta/velocidad por GPS y
 * pulsaciones por sensor Bluetooth (ambos opcionales). Al terminar guarda
 * la sesión con distancia, ppm y el trazo de la ruta.
 */
export function CardioEnVivo({
  actividad,
  unidades,
}: {
  actividad: string
  unidades?: SistemaUnidades
}) {
  const t = useT()
  const [abierto, setAbierto] = useState(false)
  const [estado, setEstado] = useState<'inactivo' | 'grabando' | 'pausado'>('inactivo')
  const [segundos, setSegundos] = useState(0)
  const [metros, setMetros] = useState(0)
  const [puntos, setPuntos] = useState<PuntoRuta[]>([])
  const [gpsEstado, setGpsEstado] = useState<'apagado' | 'activo' | 'error'>('apagado')
  const [ppm, setPpm] = useState<number | null>(null)
  const [ppmMax, setPpmMax] = useState(0)
  const [btEstado, setBtEstado] = useState<'desconectado' | 'conectado' | 'noDisponible'>(
    'desconectado',
  )
  // Al terminar se muestra la ficha de estadísticas de lo que se acaba de guardar.
  const [resumen, setResumen] = useState<SesionEjercicio | null>(null)

  const grabandoRef = useRef(false)
  useEffect(() => {
    grabandoRef.current = estado === 'grabando'
  }, [estado])
  // El GPS llega por callback: sin refs vería el cronómetro y el pulso congelados.
  const segundosRef = useRef(0)
  useEffect(() => {
    segundosRef.current = segundos
  }, [segundos])
  const ppmRef = useRef<number | null>(null)
  useEffect(() => {
    ppmRef.current = ppm
  }, [ppm])
  const ultimo = useRef<PuntoRuta | null>(null)
  const watchId = useRef<number | null>(null)
  const ppmStats = useRef({ suma: 0, n: 0, max: 0 })
  const btDesconectar = useRef<(() => void) | null>(null)
  const wakeLock = useRef<WakeLockSentinel | null>(null)

  // Cronómetro
  useEffect(() => {
    if (estado !== 'grabando') return
    const id = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [estado])

  // Limpieza al desmontar (cerrar el cuarto con la grabación abierta)
  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current)
      btDesconectar.current?.()
      void wakeLock.current?.release().catch(() => {})
    }
  }, [])

  const detenerGps = () => {
    if (watchId.current !== null) {
      navigator.geolocation?.clearWatch(watchId.current)
      watchId.current = null
    }
    setGpsEstado('apagado')
  }

  const iniciarGps = () => {
    if (!navigator.geolocation) {
      setGpsEstado('error')
      return
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsEstado('activo')
        if (!grabandoRef.current) return
        if (pos.coords.accuracy > 50) return // lectura demasiado imprecisa
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        const prev = ultimo.current
        if (prev) {
          const d = distanciaM(prev, p)
          if (d < 1) return // sin movimiento real
          if (d > 200) {
            // salto de GPS: no sumar distancia fantasma
            ultimo.current = p
            return
          }
          setMetros((m) => m + d)
        }
        ultimo.current = p
        setPuntos((ps) => [
          ...ps,
          {
            lat: +p.lat.toFixed(5),
            lng: +p.lng.toFixed(5),
            t: segundosRef.current,
            alt: pos.coords.altitude != null ? Math.round(pos.coords.altitude) : undefined,
            ppm: ppmRef.current ?? undefined,
          },
        ])
      },
      () => setGpsEstado('error'),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    )
  }

  const conectarSensor = async () => {
    const bt = (navigator as NavegadorBT).bluetooth
    if (!bt) {
      setBtEstado('noDisponible')
      return
    }
    try {
      const dispositivo = await bt.requestDevice({ filters: [{ services: ['heart_rate'] }] })
      const gatt = await dispositivo.gatt!.connect()
      const servicio = await gatt.getPrimaryService('heart_rate')
      const caracteristica = await servicio.getCharacteristic('heart_rate_measurement')
      await caracteristica.startNotifications()
      caracteristica.addEventListener('characteristicvaluechanged', (e) => {
        const dv = (e.target as unknown as { value: DataView }).value
        const flags = dv.getUint8(0)
        const valor = flags & 0x1 ? dv.getUint16(1, true) : dv.getUint8(1)
        setPpm(valor)
        if (grabandoRef.current) {
          const st = ppmStats.current
          st.suma += valor
          st.n++
          st.max = Math.max(st.max, valor)
          setPpmMax((m) => Math.max(m, valor))
        }
      })
      btDesconectar.current = () => dispositivo.gatt?.disconnect()
      setBtEstado('conectado')
    } catch {
      // El usuario canceló el diálogo de emparejamiento
    }
  }

  const iniciar = () => {
    setSegundos(0)
    setMetros(0)
    setPuntos([])
    ultimo.current = null
    ppmStats.current = { suma: 0, n: 0, max: 0 }
    setPpmMax(0)
    setEstado('grabando')
    iniciarGps()
    navigator.wakeLock
      ?.request('screen')
      .then((wl) => {
        wakeLock.current = wl
      })
      .catch(() => {})
  }

  const reanudar = () => {
    ultimo.current = null // evita sumar el tramo saltado durante la pausa
    setEstado('grabando')
  }

  const limpiar = () => {
    detenerGps()
    void wakeLock.current?.release().catch(() => {})
    wakeLock.current = null
    setEstado('inactivo')
    setSegundos(0)
    setMetros(0)
    setPuntos([])
  }

  const terminar = async () => {
    const recorrido = metros / 1000
    const st = ppmStats.current
    const sesion = {
      fecha: hoyISO(),
      tipo: 'resistencia' as const,
      titulo: actividad,
      duracionMin: Math.max(1, Math.round(segundos / 60)),
      distanciaKm: recorrido >= 0.05 ? +recorrido.toFixed(2) : undefined,
      ppmProm: st.n ? Math.round(st.suma / st.n) : undefined,
      ppmMax: st.max || undefined,
      ruta: puntos.length > 1 ? puntos : undefined,
    }
    const id = await sesionesEjercicioRepo.add(sesion)
    limpiar()
    // La ficha se arma con lo guardado: el cronómetro ya se reinició.
    setResumen({ ...sesion, id })
  }

  const km = metros / 1000
  const velocidad = segundos > 0 ? km / (segundos / 3600) : 0
  // Ritmo, velocidad máxima, desnivel y parciales del trazo que llevas.
  const metricas = useMemo(() => metricasRuta(puntos, unidades), [puntos, unidades])
  const parciales = metricas?.parciales ?? []

  if (resumen) {
    return (
      <div className="rounded-xl bg-sky-500/10 border border-sky-500/25 p-4 space-y-3">
        <p className="text-base font-bold">
          <Icono nombre="trofeo" /> {t('ejercicio.vivo.guardado', 'Entreno guardado')} · {resumen.titulo}
        </p>
        <EstadisticasCardio sesion={resumen} unidades={unidades} />
        <button
          type="button"
          onClick={() => {
            setResumen(null)
            setAbierto(false)
          }}
          className="ui-accent-bg w-full rounded-xl py-2.5 font-bold"
          style={acento(C_CARDIO)}
        >
          {t('ejercicio.vivo.listo', 'Listo')}
        </button>
      </div>
    )
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="w-full rounded-xl border border-dashed border-sky-500/40 bg-sky-500/5 py-2.5 text-base font-bold text-sky-400 hover:bg-sky-500/15"
      >
        <Icono nombre="play" /> {t('ejercicio.vivo.abrir', 'Entrenar en vivo · GPS y pulsómetro')}
      </button>
    )
  }

  return (
    <div className="rounded-xl bg-sky-500/10 border border-sky-500/25 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-base font-bold">
          <Icono nombre="cronometro" /> {t('ejercicio.vivo.titulo', 'Entrenamiento en vivo')} · {actividad}
        </p>
        {estado === 'inactivo' && (
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="text-white/30 hover:text-white/70"
          >
            ×
          </button>
        )}
      </div>

      <p className="text-center text-5xl font-black tabular-nums text-sky-400">
        {fmtTiempo(segundos)}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Dato label={t('ejercicio.vivo.dist', 'Distancia')} valor={fmtDistancia(km, unidades, 2)} />
        <Dato
          label={t('ejercicio.vivo.ritmo', 'Ritmo')}
          valor={km > 0 ? fmtRitmo(segundos / 60, km, unidades) : '—'}
        />
        <Dato
          label={t('ejercicio.vivo.vel', 'Velocidad')}
          valor={
            km > 0
              ? `${distanciaDesdeKm(velocidad, unidades).toFixed(1)} ${unidadDistancia(unidades)}/h`
              : '—'
          }
        />
        <Dato
          label={t('ejercicio.vivo.ppm', 'Pulso (ppm)')}
          valor={ppm !== null ? String(ppm) : '—'}
          resaltar={ppm !== null}
        />
      </div>

      {metricas?.conTiempo && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Dato
            label={t('ejercicio.det.velMax', 'Velocidad máxima')}
            valor={
              metricas.velMax > 0
                ? `${metricas.velMax.toFixed(1)} ${unidadDistancia(unidades)}/h`
                : '—'
            }
          />
          <Dato
            label={t('ejercicio.vivo.ultimoParcial', 'Último parcial')}
            valor={parciales.length ? fmtTiempo(parciales[parciales.length - 1].segundos) : '—'}
          />
          <Dato
            label={t('ejercicio.det.desnivel', 'Desnivel')}
            valor={metricas.conAltitud ? `+${metricas.subidaM} · −${metricas.bajadaM} m` : '—'}
          />
          <Dato
            label={t('ejercicio.det.fcMax', 'FC máxima')}
            valor={ppmMax ? `${ppmMax} ppm` : '—'}
          />
        </div>
      )}

      {parciales.length > 0 && (
        <div className="rounded-lg bg-black/20 p-2">
          <p className="mb-1 text-[9px] uppercase tracking-wide text-white/40">
            {t('ejercicio.det.parciales', 'Parciales')} ({unidadDistancia(unidades)})
          </p>
          <div className="flex gap-1.5 overflow-x-auto">
            {parciales.map((p) => (
              <div
                key={p.n}
                className="shrink-0 rounded-md bg-white/5 px-2 py-1 text-center tabular-nums"
              >
                <p className="text-[9px] text-white/40">
                  {p.dist > 0.95 ? p.n : p.dist.toFixed(2)}
                </p>
                <p className="text-xs font-bold text-white/90">{fmtRitmoMin(p.ritmo)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/40">
        <span>
          <Icono nombre="ubicacion" />{' '}
          {gpsEstado === 'activo' && t('ejercicio.vivo.gpsActivo', 'GPS activo')}
          {gpsEstado === 'error' && t('ejercicio.vivo.gpsError', 'GPS no disponible (revisa permisos)')}
          {gpsEstado === 'apagado' && t('ejercicio.vivo.gpsApagado', 'GPS apagado')}
        </span>
        {btEstado !== 'conectado' && (
          <button
            type="button"
            onClick={conectarSensor}
            className="rounded-md bg-white/10 px-2 py-0.5 font-semibold text-white/70 hover:bg-white/20"
          >
            <Icono nombre="reloj-pulsera" /> {t('ejercicio.vivo.conectar', 'Conectar pulsómetro')}
          </button>
        )}
        {btEstado === 'conectado' && <span><Icono nombre="reloj-pulsera" /> {t('ejercicio.vivo.sensorOk', 'Sensor conectado')}</span>}
        {btEstado === 'noDisponible' && (
          <span>{t('ejercicio.vivo.btNo', 'Bluetooth no disponible en este navegador')}</span>
        )}
      </div>

      {puntos.length > 1 && (
        <RutaSvg
          puntos={puntos}
          color="#38bdf8"
          className="h-24 w-full rounded-lg bg-black/20"
          marcas={parciales.map((p) => p.indice)}
        />
      )}

      <div className="flex gap-2">
        {estado === 'inactivo' && (
          <button
            type="button"
            onClick={iniciar}
            className="ui-accent-bg flex-1 rounded-xl py-2.5 font-bold"
            style={acento(C_CARDIO)}
          >
            <><Icono nombre="play" /> {t('ejercicio.vivo.iniciar', 'Iniciar')}</>
          </button>
        )}
        {estado === 'grabando' && (
          <button
            type="button"
            onClick={() => setEstado('pausado')}
            className="flex-1 rounded-xl bg-white/10 py-2.5 font-bold text-white/80"
          >
            <><Icono nombre="pausa" /> {t('ejercicio.vivo.pausa', 'Pausa')}</>
          </button>
        )}
        {estado === 'pausado' && (
          <button
            type="button"
            onClick={reanudar}
            className="ui-accent-bg flex-1 rounded-xl py-2.5 font-bold"
            style={acento(C_CARDIO)}
          >
            <><Icono nombre="play" /> {t('ejercicio.vivo.reanudar', 'Reanudar')}</>
          </button>
        )}
        {estado !== 'inactivo' && (
          <>
            <button
              type="button"
              onClick={terminar}
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 font-bold texto-cta"
            >
              <Icono nombre="detener" /> {t('ejercicio.vivo.terminar', 'Terminar y guardar')}
            </button>
            <button
              type="button"
              onClick={limpiar}
              title={t('ejercicio.vivo.descartar', 'Descartar')}
              className="rounded-xl bg-white/10 px-3 py-2.5 font-bold text-white/60 hover:text-red-400"
            >
              ×
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Dato({ label, valor, resaltar }: { label: string; valor: string; resaltar?: boolean }) {
  return (
    <div className="rounded-lg bg-black/20 px-2 py-1.5 text-center">
      <p className="text-[9px] uppercase tracking-wide text-white/40">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${resaltar ? 'text-red-400' : 'text-white/90'}`}>
        {valor}
      </p>
    </div>
  )
}
