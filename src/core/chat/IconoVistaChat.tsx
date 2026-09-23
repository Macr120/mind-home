import { useLiveQuery } from 'dexie-react-hooks'
import { useBuzon } from '../buzon/buzonStore'
import { useContactoDeHilo } from '../buzon/cache'
import { Retrato } from '../buzon/ui/Retrato'
import { db } from '../data/db'
import { VACIO, categoriasLugarRepo } from '../data/repository'
import { sitioDe } from '../navegador/dominio'
import { useNavegador } from '../state/navegadorStore'
import { EMOJIS, type NombreIcono } from '../ui/iconos/catalogo'
import { Icono } from '../ui/iconos/Icono'
import { usePrefsNavegacion } from '../../rooms/sala/navegacion/preferencias'
import type { VistaMenu } from './ordenesMenu'

/**
 * Lo que pinta el botón que abre el menú del chat según la vista elegida: el
 * asistente con el que hablas, el último amigo, el pin de la última categoría
 * de lugares o el favicon de la última página. Cada vista es su componente:
 * solo corre la consulta de la que está elegida.
 */
export function IconoVistaChat({ vista, emojiAsistente }: { vista: VistaMenu; emojiAsistente: string }) {
  if (vista === 'amigos') return <IconoAmigo />
  if (vista === 'lugares') return <IconoLugar />
  if (vista === 'navegador') return <IconoPagina />
  return <Icono emoji={emojiAsistente} />
}

/** El amigo del hilo abierto o, sin hilo abierto, el del último mensaje del buzón. */
function IconoAmigo() {
  const abierto = useBuzon((s) => s.hiloAbierto)
  const ultimo = useLiveQuery(async () => (await db._buzonMensajes.toCollection().last())?.hiloId ?? null, [])
  const contacto = useContactoDeHilo(abierto ?? ultimo ?? null)
  if (!contacto) return <Icono nombre="companeros" />
  return <Retrato retrato={contacto.retrato} emoji={contacto.emoji} className="h-8 w-8" />
}

function IconoLugar() {
  const id = usePrefsNavegacion((s) => s.categoria)
  const categorias = categoriasLugarRepo.useAll() ?? VACIO
  const c = id != null ? categorias.find((x) => x.id === id) : undefined
  if (!c) return <Icono nombre="navegar" />
  return (
    <span style={{ color: c.color }}>
      <Icono nombre={c.icono in EMOJIS ? (c.icono as NombreIcono) : 'pin'} />
    </span>
  )
}

/** La pestaña activa del navegador embebido o, si no hay, la última página del historial. */
function IconoPagina() {
  const activa = useNavegador((s) => s.pestanas.find((p) => p.id === s.activaId)?.url ?? null)
  const favicon = useLiveQuery(async () => {
    const url = activa ?? (await db.historialWeb.orderBy('visto').last())?.url
    return url ? ((await db.sitiosWeb.where('host').equals(sitioDe(url)).first())?.favicon ?? null) : null
  }, [activa])
  // Los favicons los baja el shell de escritorio: en la web y el teléfono queda el globo.
  if (!favicon) return <Icono nombre="mundo" />
  return <img src={favicon} alt="" aria-hidden draggable={false} className="h-6 w-6 rounded" />
}
