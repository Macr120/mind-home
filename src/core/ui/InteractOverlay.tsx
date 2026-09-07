import { useEffect, useState, type ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Icono } from './iconos/Icono'
import { getCuarto } from '../state/cuartosStore'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { useDiseño, useRoomVisual, objetoPorId, esObjetoMapa } from '../state/disenoStore'
import { useNombreCuarto } from './roomDisplay'
import { useInteractUi } from '../state/interactUiStore'
import { usePendientesCasa } from '../state/pendientesStore'
import { accionCuarto } from './roomInteract'
import { abrirEnlace, hostDe, faviconDe } from '../enlaces'
import { abrirPrograma, nombreDePrograma } from '../plataforma'
import { destinoExterno } from '../abrirObjeto'
import { IconoPrograma } from './IconoPrograma'
import { useT } from '../i18n/useT'
import { BadgeMisiones } from './BadgeMisiones'

/**
 * Diálogo 2D anclado al objeto seleccionado (proyectado desde la escena 3D):
 * el mueble principal de un cuarto («Entrar» a su app) o un objeto con enlace
 * web («Visitar» la página). No usa Html de drei para no bloquear clics ni
 * raycast del mapa.
 */
export function InteractOverlay() {
  const editMode = useLayout((s) => s.editMode)
  const activeRoom = useHouse((s) => s.activeRoom)
  const openRoom = useHouse((s) => s.openRoom)
  const roomId = useInteractUi((s) => s.focusRoomId)
  const enlaceId = useInteractUi((s) => s.focusEnlaceId)
  const screenX = useInteractUi((s) => s.screenX)
  const screenY = useInteractUi((s) => s.screenY)
  const clear = useInteractUi((s) => s.clear)
  const foco = roomId ?? enlaceId

  // Cerrar la etiqueta al hacer clic en cualquier otra cosa de la pantalla.
  // Se difiere con setTimeout para asegurar que el clic que abrió la burbuja
  // ya terminó de propagarse hasta window antes de registrar el listener;
  // en React 19 el flush puede ser síncrono dentro del handler de R3F.
  useEffect(() => {
    if (foco == null) return
    const handle = () => clear()
    const timer = setTimeout(() => window.addEventListener('click', handle), 0)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('click', handle)
    }
  }, [foco, clear])

  if (editMode || activeRoom || foco == null) return null

  let burbuja: ReactNode = null
  if (enlaceId != null) {
    burbuja = <BurbujaEnlace objetoId={enlaceId} onAbierto={clear} />
  } else if (roomId) {
    const room = getCuarto(roomId)
    if (!room) return null
    burbuja = (
      <Burbuja
        roomId={roomId}
        roomColor={room.color}
        roomNombre={room.nombre}
        roomIcon={room.icon}
        onEntrar={() => openRoom(roomId)}
      />
    )
  }
  if (!burbuja) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      aria-hidden={false}
    >
      <div
        className="pointer-events-none absolute"
        style={{
          left: screenX,
          top: screenY,
          transform: 'translate(-50%, calc(-100% - 10px))',
        }}
      >
        {burbuja}
      </div>
    </div>
  )
}

function Burbuja({
  roomId,
  roomColor,
  roomNombre,
  roomIcon,
  onEntrar,
}: {
  roomId: string
  roomColor: string
  roomNombre: string
  roomIcon: string
  onEntrar: () => void
}) {
  const { color } = useRoomVisual(roomId, roomColor, roomNombre)
  // El nombre, traducido igual que en el menú lateral y la cabecera del cuarto.
  const nombreCuarto = useNombreCuarto()
  const nombre = nombreCuarto({ id: roomId, nombre: roomNombre })
  // Primera app del cuarto (como en el menú lateral): suyas son las misiones que
  // pinta el globo rojo, el mismo de la tarjeta en la pantalla de inicio.
  const appId = useDiseño((s) => s.objetos.find((o) => o.roomId === roomId && o.plantillaId)?.plantillaId)
  const pendientes = usePendientesCasa((s) => (appId ? s.porApp[appId] : undefined))
  const accion = accionCuarto(roomId)
  const titulo = nombre.split(' · ')[0]

  return (
    <div className="flex flex-col items-center select-none">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onEntrar()
        }}
        title={`${accion} — ${titulo}`}
        className="ui-panel-glass pointer-events-auto relative flex flex-col items-center gap-1 rounded-2xl border-2 px-4 py-2.5 shadow-xl backdrop-blur-md transition hover:scale-[1.04] active:scale-[0.97]"
        style={{
          borderColor: color,
          boxShadow: `0 6px 28px ${color}55, 0 0 0 1px rgba(255,255,255,0.06)`,
        }}
      >
        <span className="text-lg leading-none"><Icono emoji={roomIcon} /></span>
        <span
          className="text-sm font-black leading-tight"
          style={{ color }}
        >
          {accion}
        </span>
        <span className="max-w-[9rem] truncate text-[10px] font-medium text-white/45">
          {titulo}
        </span>
        {pendientes && <BadgeMisiones pendientes={pendientes} className="absolute -top-2 -end-2" />}
      </button>
      <span
        className="pointer-events-none -mt-px h-0 w-0 border-x-[10px] border-t-[12px] border-x-transparent"
        style={{ borderTopColor: color }}
        aria-hidden
      />
    </div>
  )
}

/**
 * La burbuja de un objeto con enlace web («Visitar»: favicon, verbo y dominio)
 * o con un programa del equipo («Abrir»: su icono y el nombre del ejecutable).
 */
function BurbujaEnlace({ objetoId, onAbierto }: { objetoId: number; onAbierto: () => void }) {
  const t = useT()
  const datos = useDiseño(
    useShallow((s) => {
      const o = objetoPorId(s.objetos, objetoId)
      if (!o || destinoExterno(o) == null) return null
      return {
        url: o.enlaceUrl,
        programa: o.programa,
        nombre: o.nombre,
        roomId: o.roomId,
        colorObjeto: o.color,
        esMapa: esObjetoMapa(o),
      }
    }),
  )
  if (!datos) return null

  // El color del cuarto viste su burbuja; un objeto libre usa su propio color.
  const color = (datos.esMapa ? undefined : getCuarto(datos.roomId)?.color) ?? datos.colorObjeto
  const esPrograma = !datos.url && Boolean(datos.programa)
  // Siempre el destino real (dominio o ejecutable): el usuario ve a dónde va, lleve el nombre que lleve.
  const host = esPrograma ? nombreDePrograma(datos.programa!) : hostDe(datos.url!)
  const titulo = datos.nombre || host
  const verbo = esPrograma ? t('enlace.abrir', 'Abrir') : t('enlace.visitar', 'Visitar')

  return (
    <div className="flex flex-col items-center select-none">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (esPrograma) void abrirPrograma(datos.programa!)
          else void abrirEnlace(datos.url!, datos.nombre)
          onAbierto()
        }}
        title={`${verbo} — ${titulo}`}
        className="ui-panel-glass pointer-events-auto relative flex flex-col items-center gap-1 rounded-2xl border-2 px-4 py-2.5 shadow-xl backdrop-blur-md transition hover:scale-[1.04] active:scale-[0.97]"
        style={{
          borderColor: color,
          boxShadow: `0 6px 28px ${color}55, 0 0 0 1px rgba(255,255,255,0.06)`,
        }}
      >
        {esPrograma ? <IconoPrograma ruta={datos.programa!} /> : <FaviconEnlace key={datos.url} url={datos.url!} />}
        <span className="text-sm font-black leading-tight" style={{ color }}>
          {verbo}
        </span>
        <span className="max-w-[9rem] truncate text-[10px] font-medium text-white/45">
          {datos.nombre ? `${datos.nombre} · ${host}` : host}
        </span>
      </button>
      <span
        className="pointer-events-none -mt-px h-0 w-0 border-x-[10px] border-t-[12px] border-x-transparent"
        style={{ borderTopColor: color }}
        aria-hidden
      />
    </div>
  )
}

/** Favicon del dominio, con el icono genérico de enlace si no carga (o sin red). */
function FaviconEnlace({ url }: { url: string }) {
  const [fallo, setFallo] = useState(false)
  const src = faviconDe(url)
  if (!src || fallo) {
    return (
      <span className="text-lg leading-none">
        <Icono nombre="vincular" />
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      className="h-5 w-5 rounded"
      onError={() => setFallo(true)}
    />
  )
}
