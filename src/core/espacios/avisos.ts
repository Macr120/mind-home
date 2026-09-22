import { tGlobal } from '../i18n/useT'
import { notificar } from '../notificaciones'
import { refrescarEspacios } from './conectar'
import { nombreTipo } from './enlaces'
import type { TipoEspacio } from './tipos'

/**
 * El timbre «te compartí esto» viaja por el canal del buzón (`buzon:<uid>`,
 * evento `espacio`) porque es el único canal que un usuario tiene siempre
 * abierto. Viene de la BD, pero pasa por el mismo WebSocket que todo lo demás:
 * se lee igual de defensivo que el protocolo de partida.
 */

const TIPOS = new Set<TipoEspacio>(['calendario', 'documento', 'dibujo', 'audio', 'video'])

interface AvisoEspacio {
  espacioId: string
  tipo: TipoEspacio
  titulo: string
  alias: string
}

function leerAviso(bruto: unknown): AvisoEspacio | null {
  if (typeof bruto !== 'object' || bruto === null) return null
  const o = bruto as Record<string, unknown>
  const id = o.espacio_id
  if (typeof id !== 'string' || !id || id.length > 64) return null
  if (typeof o.tipo !== 'string' || !TIPOS.has(o.tipo as TipoEspacio)) return null
  return {
    espacioId: id,
    tipo: o.tipo as TipoEspacio,
    titulo: typeof o.titulo === 'string' ? o.titulo.slice(0, 80) : '',
    alias: typeof o.alias === 'string' ? o.alias.slice(0, 20) : '',
  }
}

export function recibirAvisoEspacio(bruto: unknown): void {
  const a = leerAviso(bruto)
  if (!a) return
  void refrescarEspacios()
  void notificar({
    clave: `espacio:${a.espacioId}`,
    titulo: tGlobal('esp.aviso.compartio', '@{a} te compartió «{t}»', {
      a: a.alias,
      t: a.titulo || tGlobal('esp.sinTitulo', 'Sin título'),
    }),
    cuerpo: nombreTipo(a.tipo),
    efimero: true,
  })
}
