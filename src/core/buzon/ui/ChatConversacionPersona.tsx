import { memo, useEffect, useRef, useState } from 'react'
import { VistaBlob } from '../../../rooms/_shared/ImagenIA'
import { descargarArchivo } from '../../descargarArchivo'
import { useT } from '../../i18n/useT'
import { useMascota } from '../../state/mascotaStore'
import { Icono } from '../../ui/iconos/Icono'
import { mensajeErrorBuzon } from '../api'
import { useBuzon } from '../buzonStore'
import { useContactoDeHilo, useMensajesHilo } from '../cache'
import { descargarBlobDe, marcarLeido, reintentar } from '../motor'
import type { MensajeBuzon } from '../tipos'
import { Retrato } from './Retrato'
import { TarjetaContenido } from './TarjetaContenido'

/**
 * El hilo con una persona del buzón: misma forma que la conversación con un
 * asistente (burbujas propias a la derecha), pero los datos vienen de la caché
 * del buzón y se responde desde la barra de abajo, que en este estado envía a
 * la persona en vez de al modelo.
 */
function ChatConversacionPersonaInterno({ hiloId, onCerrar }: { hiloId: string; onCerrar: () => void }) {
  const t = useT()
  const contacto = useContactoDeHilo(hiloId)
  const mensajes = useMensajesHilo(hiloId)
  const refLista = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = refLista.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensajes?.length, hiloId])

  // Leído: al abrir el hilo y con cada mensaje nuevo, si la pestaña está a la vista.
  useEffect(() => {
    if (document.visibilityState === 'visible') void marcarLeido(hiloId)
  }, [hiloId, mensajes?.length])

  if (!contacto) return null
  const bloqueado = contacto.estado === 'bloqueado'

  return (
    <div className="ui-panel-glass mb-2 flex max-h-[55vh] flex-col rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <Retrato retrato={contacto.retrato} emoji={contacto.emoji} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white/90">{contacto.nombre || `@${contacto.alias}`}</p>
          <p className="truncate text-[10px] text-white/40">
            @{contacto.alias}
            {bloqueado && ` · ${t('buzon.bloqueado', 'Bloqueado')}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => useBuzon.getState().abrirContactos()}
          className="rounded px-1.5 py-1 text-sm text-white/25 transition hover:bg-white/10 hover:text-white/70"
          title={t('buzon.contactos', 'Contactos')}
        >
          <Icono nombre="companeros" />
        </button>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          title={t('chat.conv.cerrar', 'Cerrar')}
        >
          ✕
        </button>
      </div>

      <div ref={refLista} className="min-h-[8rem] flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {(!mensajes || mensajes.length === 0) && (
          <p className="px-2 py-8 text-center text-xs text-white/35">
            {t('buzon.conv.vacia', 'Aún no hay mensajes con {n}. Escríbele desde la barra de abajo', {
              n: contacto.nombre || `@${contacto.alias}`,
            })}{' '}
            <Icono nombre="abajo" />
          </p>
        )}
        {mensajes?.map((m, i) => {
          const dia = m.creadoEn.slice(0, 10)
          const diaPrevio = i > 0 ? mensajes[i - 1].creadoEn.slice(0, 10) : null
          return (
            <div key={m.uid}>
              {dia !== diaPrevio && (
                <div className="my-2 flex justify-center">
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] text-white/45">
                    {new Date(m.creadoEn).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              )}
              <Burbuja m={m} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Burbuja({ m }: { m: MensajeBuzon }) {
  const t = useT()
  const [ocupado, setOcupado] = useState(false)
  const hablar = useMascota((s) => s.decir)
  const fallo = (e: unknown) => hablar(mensajeErrorBuzon(e, t), { persistir: false })

  const descargar = async () => {
    setOcupado(true)
    try {
      const blob = m.blob ?? (await descargarBlobDe(m))
      if (blob && m.tipo === 'pdf') await descargarArchivo(blob, m.adjunto?.nombre || 'documento.pdf')
    } catch (e) {
      fallo(e)
    } finally {
      setOcupado(false)
    }
  }

  const volverAEnviar = async () => {
    setOcupado(true)
    try {
      await reintentar(m.uid)
    } catch (e) {
      fallo(e)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className={`flex ${m.mio ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${
          m.mio ? 'rounded-ee-sm bg-emerald-500/25 text-white/95' : 'rounded-es-sm bg-white/10 text-white/85'
        } ${m.estado === 'enviando' ? 'opacity-60' : ''}`}
      >
        {m.tipo === 'imagen' &&
          (m.blob ? (
            <div className="mb-1 overflow-hidden rounded-xl border border-white/10">
              <VistaBlob blob={m.blob} ampliable className="max-h-64 w-full object-contain" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void descargar()}
              disabled={ocupado}
              className="mb-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70 transition hover:border-accent/50"
            >
              <Icono nombre="imagen" /> {t('buzon.adjunto.descargar', 'Descargar')}
            </button>
          ))}
        {m.tipo === 'pdf' && (
          <button
            type="button"
            onClick={() => void descargar()}
            disabled={ocupado}
            className="mb-1 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2.5 py-2 text-start transition hover:border-accent/50"
          >
            <span className="text-xl">
              <Icono nombre="pdf" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{m.adjunto?.nombre || 'PDF'}</span>
              <span className="block text-[10px] text-white/45">
                {m.adjunto ? `${Math.max(1, Math.round(m.adjunto.size / 1024))} KB · ` : ''}
                {t('buzon.adjunto.descargar', 'Descargar')}
              </span>
            </span>
          </button>
        )}
        {m.tipo === 'contenido' && m.contenido && <TarjetaContenido m={m} />}
        {m.texto && <p className="whitespace-pre-line break-words">{m.texto}</p>}
        <div className="mt-0.5 flex items-center justify-end gap-1.5">
          {m.estado === 'error' && (
            <button
              type="button"
              onClick={() => void volverAEnviar()}
              disabled={ocupado}
              className="text-[10px] font-semibold text-red-400 hover:underline"
            >
              {t('buzon.error.envio', 'No se pudo enviar')} · {t('buzon.reintentar', 'Reintentar')}
            </button>
          )}
          {m.estado === 'enviando' && <span className="text-[9px] text-white/40">{t('buzon.enviando', 'Enviando…')}</span>}
          {m.mio && !m.estado && m.leidoEn && (
            <span className="text-[9px] text-emerald-300/80" title={t('buzon.leido', 'Leído')}>
              <Icono nombre="confirmar" />
            </span>
          )}
          <p className={`text-[9px] ${m.mio ? 'text-emerald-400/80' : 'text-white/30'}`}>
            {new Date(m.creadoEn).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Memoizado: ChatBox se re-renderiza en cada tecla del textarea; los datos
 * llegan por hooks propios, así que solo `hiloId` y `onCerrar` deciden el repintado.
 */
export const ChatConversacionPersona = memo(ChatConversacionPersonaInterno)
