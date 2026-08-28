import { useEffect, useState } from 'react'
import { obtenerClimaReal, type ClimaActual } from '../clima'
import { musicaSistema, recursosSistema } from '../plataforma'
import {
  CLAVE_EXTRAS_FONDO,
  EXTRAS_FONDO,
  leerExtrasFondo,
  SITIOS_FONDO,
  type ExtrasFondo,
  type PanelFondo,
  type SitioFondo,
} from '../fondoExtras'
import { localeActual } from '../i18n/useT'
import { leerModoUI, LS_MODO_UI } from '../state/ajustesStore'
import type { ModoUI } from './temasUI'

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

  // La apariencia se elige en la OTRA ventana, así que llega por el mismo
  // camino que los paneles: el evento `storage` del origen compartido.
  const [modo, setModo] = useState<ModoUI>(() => leerModoUI())

  useEffect(() => {
    const alCambiar = (e: StorageEvent) => {
      if (e.key === null || e.key === CLAVE_EXTRAS_FONDO) setExtras(leerExtrasFondo())
      if (e.key === null || e.key === LS_MODO_UI) setModo(leerModoUI())
    }
    window.addEventListener('storage', alCambiar)
    return () => window.removeEventListener('storage', alCambiar)
  }, [])

  // Un grupo por sitio ocupado: los que caen en el mismo se apilan en columna,
  // en el orden de EXTRAS_FONDO, para que dos paneles vecinos no se tapen.
  const grupos = SITIOS_FONDO.map((sitio) => ({
    sitio,
    paneles: EXTRAS_FONDO.filter((cual) => extras[cual] && extras.sitios[cual] === sitio),
  })).filter((g) => g.paneles.length > 0)
  if (grupos.length === 0) return null

  return (
    <>
      {grupos.map(({ sitio, paneles }) => (
        <div
          key={sitio}
          style={VESTIDO[modo]}
          className={`pointer-events-none absolute z-10 flex select-none flex-col gap-2 ${ANCLAJE[sitio]}`}
        >
          {paneles.map((cual) => (
            <Panel key={cual} cual={cual} />
          ))}
        </div>
      ))}
    </>
  )
}

/**
 * Dónde se ancla cada sitio y hacia dónde crecen sus paneles. Los de la derecha
 * se alinean a la derecha para que al aparecer y desaparecer —el de música se
 * va cuando no suena nada— el borde común no baile.
 */
const ANCLAJE: Record<SitioFondo, string> = {
  arribaIzq: 'left-5 top-5 items-start',
  arriba: 'left-1/2 top-5 -translate-x-1/2 items-center',
  arribaDer: 'right-5 top-5 items-end',
  izq: 'left-5 top-1/2 -translate-y-1/2 items-start',
  der: 'right-5 top-1/2 -translate-y-1/2 items-end',
  abajoIzq: 'bottom-5 left-5 items-start',
  abajo: 'bottom-5 left-1/2 -translate-x-1/2 items-center',
  abajoDer: 'bottom-5 right-5 items-end',
}

function Panel({ cual }: { cual: PanelFondo }) {
  if (cual === 'hora') return <PanelHora />
  if (cual === 'clima') return <PanelClima />
  if (cual === 'musica') return <PanelMusica />
  return <PanelRecursos />
}

/**
 * El vidrio común. Los colores NO salen de las clases `white`/`black` ni de los
 * tokens del tema: estos paneles flotan sobre la escena y no sobre una
 * superficie tematizada, así que aquí `bg-white` no es blanco y en claro salían
 * ilegibles sobre el cielo. Lo que sí siguen es la APARIENCIA elegida —claro,
 * oscuro o transparente—, con una paleta propia por modo: el grupo la pone como
 * variables y cada panel la lee, así que un solo sitio decide y los cuatro
 * obedecen.
 */
const VIDRIO = 'rounded-xl border px-3.5 py-2 shadow-lg backdrop-blur-md'
const VIDRIO_ESTILO: React.CSSProperties = {
  backgroundColor: 'var(--vf-fondo)',
  borderColor: 'var(--vf-borde)',
  color: 'var(--vf-texto)',
  textShadow: 'var(--vf-sombra)',
}

/**
 * Un juego de colores por apariencia. El transparente casi no pone panel —un
 * velo y el texto con sombra—, que es lo que ese modo hace en el resto de la
 * app: dejar ver lo que hay debajo.
 */
const VESTIDO: Record<ModoUI, React.CSSProperties> = {
  oscuro: {
    '--vf-fondo': 'rgba(10, 13, 20, 0.52)',
    '--vf-borde': 'rgba(255, 255, 255, 0.14)',
    '--vf-texto': 'rgba(246, 247, 250, 0.94)',
    '--vf-sombra': 'none',
    '--vf-barra': 'rgba(255, 255, 255, 0.75)',
    '--vf-barra-fondo': 'rgba(255, 255, 255, 0.16)',
  } as React.CSSProperties,
  claro: {
    '--vf-fondo': 'rgba(249, 250, 252, 0.78)',
    '--vf-borde': 'rgba(15, 17, 21, 0.10)',
    '--vf-texto': 'rgba(17, 20, 28, 0.92)',
    '--vf-sombra': 'none',
    '--vf-barra': 'rgba(17, 20, 28, 0.65)',
    '--vf-barra-fondo': 'rgba(17, 20, 28, 0.14)',
  } as React.CSSProperties,
  transparente: {
    '--vf-fondo': 'rgba(10, 13, 20, 0.18)',
    '--vf-borde': 'rgba(255, 255, 255, 0.20)',
    '--vf-texto': 'rgba(255, 255, 255, 0.96)',
    // Sin panel que lo respalde, el texto necesita su propio contraste: sobre un
    // cielo de mediodía el blanco solo se lee gracias a esta sombra.
    '--vf-sombra': '0 1px 4px rgba(0, 0, 0, 0.55)',
    '--vf-barra': 'rgba(255, 255, 255, 0.85)',
    '--vf-barra-fondo': 'rgba(255, 255, 255, 0.22)',
  } as React.CSSProperties,
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
      <div className="mt-0.5 h-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--vf-barra-fondo)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: 'var(--vf-barra)' }}
        />
      </div>
    </div>
  )
}
