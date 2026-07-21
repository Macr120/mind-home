import { useEffect, useRef } from 'react'
import { useMascota } from '../state/mascotaStore'
import { useAsistentes } from '../state/asistentesStore'
import { useMensajesAsistente, limpiarConversacion } from '../data/repository'
import { useT } from '../i18n/useT'
import { Icono } from '../ui/iconos/Icono'
import { BotonVoz, ToggleVozAuto } from '../ui/BotonVoz'
import { nombreAsistente } from './mascotas'

/**
 * Conversación tipo chat (estilo WhatsApp) con un asistente: burbujas del
 * usuario a la derecha y del asistente a la izquierda, separadas por día.
 * Se abre al tocar la burbuja 3D del asistente, al volver a tocar el asistente
 * activo en la fila del historial o al tocar un registro de la bitácora.
 * Se responde desde la barra de entrada de abajo (los mensajes llegan en vivo).
 */
export function ChatConversacion() {
  const t = useT()
  const conversacion = useMascota((s) => s.conversacion)
  const cerrar = useMascota((s) => s.cerrarConversacion)
  const mascotaId = useMascota((s) => s.mascota)
  const pensando = useMascota((s) => s.pensando)
  const lista = useAsistentes((s) => s.lista)
  const mensajes = useMensajesAsistente(conversacion)
  const refLista = useRef<HTMLDivElement>(null)
  const escribiendo = pensando && conversacion === mascotaId

  // Siempre pegado al último mensaje (como un chat real).
  useEffect(() => {
    const el = refLista.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensajes?.length, conversacion, escribiendo])

  const asistente = lista.find((a) => a.id === conversacion)
  if (!conversacion || !asistente) return null

  return (
    <div className="ui-panel-glass mb-2 flex max-h-[55vh] flex-col rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
      {/* Cabecera del chat */}
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xl">
          <Icono emoji={asistente.emoji} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white/90">{nombreAsistente(t, asistente)}</p>
          <p className="text-[10px] text-white/40">{t('chat.conversacion', 'Conversación')}</p>
        </div>
        <ToggleVozAuto asistenteId={conversacion} />
        <button
          type="button"
          onClick={() => limpiarConversacion(conversacion)}
          className="rounded px-1.5 py-1 text-sm text-white/25 transition hover:bg-white/10 hover:text-white/70"
          title={t('chat.conv.limpiar', 'Vaciar conversación')}
        >
          <Icono nombre="basura" />
        </button>
        <button
          type="button"
          onClick={cerrar}
          className="rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          title={t('chat.conv.cerrar', 'Cerrar')}
        >
          ✕
        </button>
      </div>

      {/* Mensajes */}
      <div ref={refLista} className="min-h-[8rem] flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {(!mensajes || mensajes.length === 0) && (
          <p className="px-2 py-8 text-center text-xs text-white/35">
            {t('chat.conv.vacia', 'Aún no hay mensajes con {pet}. Escríbele desde la barra de abajo', {
              pet: nombreAsistente(t, asistente),
            })}{' '}
            <Icono nombre="abajo" />
          </p>
        )}
        {mensajes?.map((m, i) => {
          const dia = m.creado.slice(0, 10)
          const diaPrevio = i > 0 ? mensajes[i - 1].creado.slice(0, 10) : null
          const esUsuario = m.rol === 'usuario'
          return (
            <div key={m.id}>
              {dia !== diaPrevio && (
                <div className="my-2 flex justify-center">
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] text-white/45">
                    {new Date(m.creado).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              )}
              <div className={`flex ${esUsuario ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${
                    esUsuario
                      ? 'rounded-br-sm bg-emerald-500/25 text-white/95'
                      : 'rounded-bl-sm bg-white/10 text-white/85'
                  }`}
                >
                  <p className="whitespace-pre-line break-words">{m.texto}</p>
                  <div className="mt-0.5 flex items-center justify-end gap-1">
                    {/* Escuchar lo que contestó, aunque la lectura automática esté apagada. */}
                    {!esUsuario && <BotonVoz texto={m.texto} asistenteId={conversacion} />}
                    <p className={`text-[9px] ${esUsuario ? 'text-emerald-400/50' : 'text-white/30'}`}>
                      {new Date(m.creado).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {/* La IA está preparando la respuesta */}
        {escribiendo && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-white/10 px-3 py-1.5 text-sm text-white/60">
              <span className="animate-pulse tracking-widest"><Icono emoji={asistente.emoji} /> …</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
