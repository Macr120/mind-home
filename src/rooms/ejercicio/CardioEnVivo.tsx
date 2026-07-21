import { useEffect, useRef, useState } from 'react'
import { sesionesEjercicioRepo } from '../../core/data/repository'
import { hoyISO } from './fecha'
import { ritmoMinKm } from './stats'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

export interface PuntoRuta {
  lat: number
  lng: number
}

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

/** Distancia en metros entre dos coordenadas (haversine). */
function distanciaM(a: PuntoRuta, b: PuntoRuta) {
  const R = 6371000
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Croquis SVG de la ruta (sin mapa): trazo normalizado con inicio y fin marcados. */
export function RutaSvg({
  puntos,
  color,
  className = '',
}: {
  puntos: PuntoRuta[]
  color: string
  className?: string
}) {
  if (puntos.length < 2) return null
  const W = 100
  const H = 60
  const PAD = 5
  // Corrige la deformación longitud/latitud según la latitud media
  const k = Math.cos(((puntos[0].lat + puntos[puntos.length - 1].lat) / 2) * (Math.PI / 180))
  const xs = puntos.map((p) => p.lng * k)
  const ys = puntos.map((p) => p.lat)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const escala = Math.min(
    (W - PAD * 2) / Math.max(maxX - minX, 1e-6),
    (H - PAD * 2) / Math.max(maxY - minY, 1e-6),
  )
  const ox = (W - escala * (maxX - minX)) / 2
  const oy = (H - escala * (maxY - minY)) / 2
  const px = (i: number) => ox + (xs[i] - minX) * escala
  const py = (i: number) => oy + (maxY - ys[i]) * escala
  const linea = puntos.map((_, i) => `${px(i)},${py(i)}`).join(' ')
  const fin = puntos.length - 1
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className}>
      <polyline
        points={linea}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle cx={px(0)} cy={py(0)} r="2.5" fill="#4ade80" />
      <circle cx={px(fin)} cy={py(fin)} r="2.5" fill="#f87171" />
    </svg>
  )
}

const fmtTiempo = (seg: number) => {
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  const s = seg % 60
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return h > 0 ? `${h}:${mmss}` : mmss
}

/**
 * Entrenamiento de cardio en vivo: cronómetro + ruta/velocidad por GPS y
 * pulsaciones por sensor Bluetooth (ambos opcionales). Al terminar guarda
 * la sesión con distancia, ppm y el trazo de la ruta.
 */
export function CardioEnVivo({ actividad }: { actividad: string }) {
  const t = useT()
  const [abierto, setAbierto] = useState(false)
  const [estado, setEstado] = useState<'inactivo' | 'grabando' | 'pausado'>('inactivo')
  const [segundos, setSegundos] = useState(0)
  const [metros, setMetros] = useState(0)
  const [puntos, setPuntos] = useState<PuntoRuta[]>([])
  const [gpsEstado, setGpsEstado] = useState<'apagado' | 'activo' | 'error'>('apagado')
  const [ppm, setPpm] = useState<number | null>(null)
  const [btEstado, setBtEstado] = useState<'desconectado' | 'conectado' | 'noDisponible'>(
    'desconectado',
  )

  const grabandoRef = useRef(false)
  useEffect(() => {
    grabandoRef.current = estado === 'grabando'
  }, [estado])
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
        setPuntos((ps) => [...ps, { lat: +p.lat.toFixed(5), lng: +p.lng.toFixed(5) }])
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
    const km = metros / 1000
    const st = ppmStats.current
    await sesionesEjercicioRepo.add({
      fecha: hoyISO(),
      tipo: 'resistencia',
      titulo: actividad,
      duracionMin: Math.max(1, Math.round(segundos / 60)),
      distanciaKm: km >= 0.05 ? +km.toFixed(2) : undefined,
      ppmProm: st.n ? Math.round(st.suma / st.n) : undefined,
      ppmMax: st.max || undefined,
      ruta: puntos.length > 1 ? puntos : undefined,
    })
    limpiar()
    setAbierto(false)
  }

  const km = metros / 1000
  const velocidad = segundos > 0 ? km / (segundos / 3600) : 0

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
        <Dato label={t('ejercicio.vivo.dist', 'Distancia')} valor={`${km.toFixed(2)} km`} />
        <Dato
          label={t('ejercicio.vivo.ritmo', 'Ritmo')}
          valor={km > 0 ? `${ritmoMinKm(segundos / 60, km)} /km` : '—'}
        />
        <Dato
          label={t('ejercicio.vivo.vel', 'Velocidad')}
          valor={km > 0 ? `${velocidad.toFixed(1)} km/h` : '—'}
        />
        <Dato
          label={t('ejercicio.vivo.ppm', 'Pulso (ppm)')}
          valor={ppm !== null ? String(ppm) : '—'}
          resaltar={ppm !== null}
        />
      </div>

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
        <RutaSvg puntos={puntos} color="#38bdf8" className="h-24 w-full rounded-lg bg-black/20" />
      )}

      <div className="flex gap-2">
        {estado === 'inactivo' && (
          <button
            type="button"
            onClick={iniciar}
            className="flex-1 rounded-xl bg-sky-600 py-2.5 font-bold texto-cta"
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
            className="flex-1 rounded-xl bg-sky-600 py-2.5 font-bold texto-cta"
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
