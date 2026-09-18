import { haySesionProbable, useSesion } from '../../cuenta/sesionStore'
import { hayBackend } from '../../cuenta/supabase'
import { useT, type TFunc } from '../../i18n/useT'
import { Icono } from '../../ui/iconos/Icono'
import { useBuzon } from '../buzonStore'
import { useContactosAceptados, useUltimosMensajesBuzon } from '../cache'
import type { MensajeBuzon } from '../tipos'
import { Retrato } from './Retrato'

/** Resumen de un mensaje para la lista de chats. */
export function resumenMensaje(m: MensajeBuzon, t: TFunc): string {
  const cuerpo =
    m.tipo === 'imagen'
      ? t('buzon.adjunto.imagen', 'Imagen')
      : m.tipo === 'pdf'
        ? t('buzon.adjunto.pdf', 'PDF')
        : m.tipo === 'contenido'
          ? (m.contenido?.nombre ?? '')
          : m.texto
  return m.mio ? `${t('buzon.tu', 'Tú')}: ${cuerpo}` : cuerpo
}

/**
 * La vista «Amigos» del panel del chat: cada contacto aceptado con el busto de
 * su personaje, su último mensaje y los no leídos. Sin sesión solo invita a
 * entrar; sin contactos, lleva al panel de Contactos.
 */
export function ListaAmigos({ onAbrir, onContactos }: { onAbrir: (hiloId: string) => void; onContactos: () => void }) {
  const t = useT()
  const usuario = useSesion((s) => s.usuario)
  const contactos = useContactosAceptados()
  const ultimos = useUltimosMensajesBuzon()
  const noLeidos = useBuzon((s) => s.noLeidos)
  if (!hayBackend()) return null
  const conSesion = !!usuario || haySesionProbable()

  if (!conSesion) {
    return <p className="px-2 py-3 text-center text-xs text-white/35">{t('buzon.sinSesion', 'Inicia sesión para escribir a tus contactos')}</p>
  }

  return (
    <>
      {(contactos ?? []).map((c) => {
        const u = c.hiloId ? ultimos?.[c.hiloId] : undefined
        const n = c.hiloId ? (noLeidos[c.hiloId] ?? 0) : 0
        return (
          <button
            key={c.contactoId}
            type="button"
            onClick={() => c.hiloId && onAbrir(c.hiloId)}
            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start transition hover:bg-white/5"
          >
            <Retrato retrato={c.retrato} emoji={c.emoji} />
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold text-white/85">{c.nombre || `@${c.alias}`}</span>
                {u && (
                  <span className="shrink-0 text-[10px] text-white/35">
                    {new Date(u.creadoEn).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </p>
              <p className="flex items-center gap-2">
                <span className={`min-w-0 flex-1 truncate text-xs ${n > 0 ? 'font-semibold text-white/75' : 'text-white/45'}`}>
                  {u ? resumenMensaje(u, t) : `@${c.alias}`}
                </span>
                {n > 0 && (
                  <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black tabular-nums text-white">
                    {n}
                  </span>
                )}
              </p>
            </div>
          </button>
        )
      })}
      {contactos && contactos.length === 0 && (
        <div className="px-2 py-3 text-center">
          <p className="text-xs text-white/35">{t('buzon.sinContactos', 'Aún no tienes contactos. Agrega uno por su alias.')}</p>
          <button
            type="button"
            onClick={onContactos}
            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink transition hover:brightness-110"
          >
            <Icono nombre="companeros" /> {t('buzon.contactos', 'Contactos')}
          </button>
        </div>
      )}
    </>
  )
}
