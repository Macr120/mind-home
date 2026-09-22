import { useState } from 'react'
import { sonar } from '../../audio/sfx'
import { useT } from '../../i18n/useT'
import { Icono } from '../../ui/iconos/Icono'
import { useContactoDeHilo } from '../../buzon/cache'
import type { MensajeBuzon } from '../../buzon/tipos'
import { estado as estadoEspacio, mensajeErrorEspacio } from '../api'
import { refrescarEspacios } from '../conectar'
import { aterrizar, nombreTipo } from '../enlaces'
import { ICONO_TIPO, type RolEspacio, type TipoEspacio } from '../tipos'

/**
 * Burbuja de «te compartí esto» (`contenido.app === 'espacio'`): el botón que
 * abre el calendario o el documento compartido. Calco de `TarjetaJuego`, pero
 * aquí no hay enlace web que abrir en otra pestaña —el acceso ya está
 * concedido: el servidor metió a esta persona como miembro al invitarla—, así
 * que basta con leer el estado y aterrizar en su app.
 */

const TIPOS = new Set<TipoEspacio>(['calendario', 'documento', 'dibujo', 'audio', 'video'])
const ROLES = new Set<RolEspacio>(['dueno', 'editor', 'lector'])

/** Lo que viaja en `contenido.datos`, validado: viene de otra persona. */
export function leerDatosEspacio(
  datos: unknown,
): { espacioId: string; tipo: TipoEspacio; titulo: string; rol: RolEspacio } | null {
  if (typeof datos !== 'object' || datos === null) return null
  const d = datos as { espacioId?: unknown; tipo?: unknown; titulo?: unknown; rol?: unknown }
  if (typeof d.espacioId !== 'string' || !d.espacioId || d.espacioId.length > 64) return null
  if (typeof d.tipo !== 'string' || !TIPOS.has(d.tipo as TipoEspacio)) return null
  return {
    espacioId: d.espacioId,
    tipo: d.tipo as TipoEspacio,
    titulo: typeof d.titulo === 'string' ? d.titulo.slice(0, 80) : '',
    rol: typeof d.rol === 'string' && ROLES.has(d.rol as RolEspacio) ? (d.rol as RolEspacio) : 'lector',
  }
}

export function TarjetaEspacio({ m }: { m: MensajeBuzon }) {
  const t = useT()
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const contacto = useContactoDeHilo(m.hiloId)
  const c = m.contenido
  const datos = leerDatosEspacio(c?.datos)
  if (!c) return null

  const titulo = datos?.titulo || c.nombre || t('esp.sinTitulo', 'Sin título')

  const abrir = async () => {
    if (!datos) return
    setOcupado(true)
    setError('')
    try {
      const r = await estadoEspacio(datos.espacioId)
      sonar('tick')
      await refrescarEspacios()
      await aterrizar(r.espacio)
    } catch (e) {
      setError(mensajeErrorEspacio(e, t))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="mb-1 w-60 max-w-full rounded-xl border border-white/10 bg-black/20 p-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">
          <Icono nombre={datos ? ICONO_TIPO[datos.tipo] : 'compartir'} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{titulo}</p>
          <p className="truncate text-[10px] text-white/45">
            {m.mio
              ? t('esp.tarjeta.enviada', 'Compartido')
              : contacto
                ? t('esp.tarjeta.de', '{k} de @{a}', {
                    k: datos ? nombreTipo(datos.tipo) : '',
                    a: contacto.alias,
                  })
                : t('esp.tarjeta.recibida', 'Te lo compartieron')}
          </p>
        </div>
      </div>
      {datos && !m.mio && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => void abrir()}
            disabled={ocupado}
            className="rounded-lg bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
          >
            {t('esp.tarjeta.abrir', 'Abrir')}
          </button>
          {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
        </div>
      )}
    </div>
  )
}
