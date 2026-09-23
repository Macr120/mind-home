import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { haySesionProbable, useSesion } from '../../cuenta/sesionStore'
import { hayBackend } from '../../cuenta/supabase'
import { esDemo } from '../../edicion'
import { useT, type TFunc } from '../../i18n/useT'
import { mensajeErrorPartida } from '../../partida/api'
import { usePartida } from '../../partida/partidaStore'
import { invitarAContacto } from '../../partida/sala'
import { PanelSala } from '../../partida/ui/PanelSala'
import { PermisosVisita } from '../../partida/ui/PermisosVisita'
import { invitarACasa } from '../../visita/anfitrion'
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
  const sala = usePartida((s) => s.sala)
  const [panelSala, setPanelSala] = useState(false)
  const [invitando, setInvitando] = useState('')
  const [errorSala, setErrorSala] = useState('')
  /** Contacto al que se va a invitar mientras se eligen los permisos ('' = cerrado). */
  const [permisosPara, setPermisosPara] = useState('')
  // Casa demo: dos amigos de mentira para enseñar la vista sin cuenta.
  const demo = esDemo()
  useEffect(() => {
    if (demo) void import('../../../demo/amigosDemo').then((m) => m.sembrarAmigosDemo())
  }, [demo])

  if (!hayBackend() && !demo) return null
  const conSesion = demo || !!usuario || haySesionProbable()

  const invitar = async (contactoId: string) => {
    setInvitando(contactoId)
    setErrorSala('')
    try {
      await invitarAContacto(contactoId)
    } catch (e) {
      setErrorSala(mensajeErrorPartida(e, t))
    } finally {
      setInvitando('')
    }
  }

  // Sala nueva → plano publicado → timbre, en ese orden (ver `visita/anfitrion`).
  const invitarConPermisos = async (contactoId: string, apps: string[]) => {
    setPermisosPara('')
    setInvitando(contactoId)
    setErrorSala('')
    try {
      await invitarACasa(contactoId, apps)
    } catch (e) {
      setErrorSala(mensajeErrorPartida(e, t))
    } finally {
      setInvitando('')
    }
  }

  // Con MI sala ya abierta se invita directo: las apps se fijaron al crearla y
  // volver a preguntarlas no cambiaría nada (`partidas.apps` es un snapshot).
  // Sin sala, primero hay que decidir qué se abre de la casa.
  const pedirInvitar = (contactoId: string) => {
    if (sala?.soyAnfitrion) void invitar(contactoId)
    else setPermisosPara(contactoId)
  }

  if (!conSesion) {
    return <p className="px-2 py-3 text-center text-xs text-white/35">{t('buzon.sinSesion', 'Inicia sesión para escribir a tus contactos')}</p>
  }

  return (
    <>
      {sala && (
        <button
          type="button"
          onClick={() => setPanelSala(true)}
          className="flex w-full items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-2 py-1.5 text-start text-xs font-semibold transition hover:bg-accent/20"
        >
          <Icono nombre="companeros" /> {t('partida.sala.abrir', 'Tu sala · {n}', { n: sala.jugadores.length })}
        </button>
      )}
      {errorSala && <p className="px-2 py-1 text-[11px] leading-snug text-red-400/90">{errorSala}</p>}
      {(contactos ?? []).map((c) => {
        const u = c.hiloId ? ultimos?.[c.hiloId] : undefined
        const n = c.hiloId ? (noLeidos[c.hiloId] ?? 0) : 0
        return (
          // La fila es DOS botones (chat e invitar): un `<button>` dentro de
          // otro es HTML inválido, así que van hermanos dentro de esta fila.
          <div key={c.contactoId} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => c.hiloId && onAbrir(c.hiloId)}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-2 text-start transition hover:bg-white/5"
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
            {/* Invitar pide una sala real en el servidor: no en el demo. */}
            {!demo && (
            <button
              type="button"
              onClick={() => pedirInvitar(c.contactoId)}
              disabled={invitando !== ''}
              title={t('partida.invitar', 'Invitar a mi casa')}
              aria-label={t('partida.invitar', 'Invitar a mi casa')}
              className="shrink-0 rounded-lg px-2 py-2 text-white/40 transition hover:bg-white/10 hover:text-white/80 disabled:opacity-40"
            >
              <Icono nombre="casa" />
            </button>
            )}
          </div>
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
      {/* Por PORTAL: el panel del chat lleva `backdrop-filter`, que crearía el
          bloque contenedor del `position: fixed` del modal y lo recortaría. */}
      {panelSala && createPortal(<PanelSala onCerrar={() => setPanelSala(false)} />, document.body)}
      {permisosPara !== '' &&
        createPortal(
          <PermisosVisita
            onCerrar={() => setPermisosPara('')}
            onConfirmar={(apps) => void invitarConPermisos(permisosPara, apps)}
          />,
          document.body,
        )}
    </>
  )
}
