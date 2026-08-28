import { useEffect, useState } from 'react'
import { obtenerClimaReal, type ClimaActual } from '../clima'
import { musicaSistema, recursosSistema } from '../plataforma'
import { CLAVE_EXTRAS_FONDO, leerExtrasFondo, type ExtrasFondo } from '../fondoExtras'
import { localeActual } from '../i18n/useT'

/**
 * Los paneles opcionales del fondo de pantalla: hora, clima, música y recursos.
 * Solo se monta en la ventana del fondo (`esModoFondo()`, ver App.tsx).
 *
 * Cuál se enseña lo decide Configuraciones › Interfaz desde la OTRA ventana;
 * el aviso llega por el evento `storage` del navegador, que el origen
 * compartido `app://mph` reparte solo (ver `fondoExtras.ts`).
 *
 * Todo va `pointer-events-none`: en macOS el fondo no recibe clics de todos
 * modos, y en Windows los clics que reenvía el shell son para la casa, no para
 * que un reloj se los trague.
 */
export function ExtrasFondo() {
  const [extras, setExtras] = useState<ExtrasFondo>(() => leerExtrasFondo())

  useEffect(() => {
    const alCambiar = (e: StorageEvent) => {
      if (e.key === null || e.key === CLAVE_EXTRAS_FONDO) setExtras(leerExtrasFondo())
    }
    window.addEventListener('storage', alCambiar)
    return () => window.removeEventListener('storage', alCambiar)
  }, [])

  const hayAlguno = extras.hora || extras.clima || extras.musica || extras.recursos
  if (!hayAlguno) return null

  return (
    <div className="pointer-events-none absolute left-5 top-5 z-10 flex select-none flex-col items-start gap-2">
      {extras.hora && <PanelHora />}
      {extras.clima && <PanelClima />}
      {extras.musica && <PanelMusica />}
      {extras.recursos && <PanelRecursos />}
    </div>
  )
}

/**
 * El vidrio común: legible sobre cualquier casa, de día y de noche. Los colores
 * van FIJOS y no por clases `white`/`black` a propósito: el tema de la app
 * redefine esos tokens (así invierte el modo claro), y estos paneles flotan
 * sobre la escena, no sobre una superficie tematizada — en claro salían
 * blancos con texto oscuro, ilegibles sobre el cielo. Misma excepción
 * documentada que el color del anillo en `PunteroFondo`.
 */
const VIDRIO = 'rounded-xl border px-3.5 py-2 shadow-lg backdrop-blur-md'
const VIDRIO_ESTILO: React.CSSProperties = {
  backgroundColor: 'rgba(10, 13, 20, 0.52)',
  borderColor: 'rgba(255, 255, 255, 0.14)',
  color: 'rgba(246, 247, 250, 0.94)',
}

function PanelHora() {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const locale = localeActual()
  return (
    <div className={VIDRIO} style={VIDRIO_ESTILO}>
      <p className="text-4xl font-bold leading-none tabular-nums">
        {ahora.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
      </p>
      <p className="mt-1 text-xs capitalize opacity-60">
        {ahora.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
    </div>
  )
}

function PanelClima() {
  const [clima, setClima] = useState<ClimaActual | null>(null)
  useEffect(() => {
    let vivo = true
    const pedir = () => {
      obtenerClimaReal()
        .then((c) => vivo && setClima(c))
        .catch(() => {
          /* sin red o sin permiso de ubicación: el panel se queda vacío */
        })
    }
    pedir()
    const t = setInterval(pedir, 30 * 60_000)
    return () => {
      vivo = false
      clearInterval(t)
    }
  }, [])
  if (!clima) return null
  return (
    <div className={`${VIDRIO} flex items-center gap-2.5`} style={VIDRIO_ESTILO}>
      <span className="text-2xl leading-none">{clima.icono}</span>
      <div>
        <p className="text-lg font-semibold leading-tight tabular-nums">{Math.round(clima.temp)}°</p>
        <p className="text-[11px] leading-tight opacity-60">{clima.ciudad}</p>
      </div>
    </div>
  )
}

function PanelMusica() {
  const [pista, setPista] = useState<{ artista: string; titulo: string } | null>(null)
  useEffect(() => {
    let vivo = true
    const pedir = () => void musicaSistema().then((m) => vivo && setPista(m))
    pedir()
    const t = setInterval(pedir, 5000)
    return () => {
      vivo = false
      clearInterval(t)
    }
  }, [])
  // Sin nada sonando (o en Windows, donde el shell no sabe mirarlo) no hay panel.
  if (!pista) return null
  return (
    <div className={`${VIDRIO} flex max-w-72 items-center gap-2.5`} style={VIDRIO_ESTILO}>
      <span className="text-lg leading-none">♪</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">{pista.titulo}</p>
        <p className="truncate text-[11px] leading-tight opacity-60">{pista.artista}</p>
      </div>
    </div>
  )
}

function PanelRecursos() {
  const [datos, setDatos] = useState<{ cpu: number; memUsadaGB: number; memTotalGB: number } | null>(null)
  useEffect(() => {
    let vivo = true
    const pedir = () => void recursosSistema().then((r) => vivo && setDatos(r))
    pedir()
    const t = setInterval(pedir, 3000)
    return () => {
      vivo = false
      clearInterval(t)
    }
  }, [])
  if (!datos) return null
  const memPct = Math.round((datos.memUsadaGB / datos.memTotalGB) * 100)
  return (
    <div className={`${VIDRIO} w-44 space-y-1.5`} style={VIDRIO_ESTILO}>
      <Barra etiqueta="CPU" pct={datos.cpu} texto={`${datos.cpu}%`} />
      <Barra etiqueta="RAM" pct={memPct} texto={`${datos.memUsadaGB.toFixed(1)}/${Math.round(datos.memTotalGB)} GB`} />
    </div>
  )
}

function Barra({ etiqueta, pct, texto }: { etiqueta: string; pct: number; texto: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="font-semibold opacity-70">{etiqueta}</span>
        <span className="tabular-nums opacity-60">{texto}</span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: 'rgba(255,255,255,0.75)' }}
        />
      </div>
    </div>
  )
}
