import { useEffect, useRef } from 'react'
import { useMascota } from '../state/mascotaStore'
import { useAsistentes } from '../state/asistentesStore'
import { useMensajesAsistente, limpiarConversacion } from '../data/repository'
import { useT } from '../i18n/useT'
import { Icono } from '../ui/iconos/Icono'
import { BotonVoz, ToggleVozAuto } from '../ui/BotonVoz'
import { nombreAsistente } from './mascotas'
import { useSugerenciaMapa } from './sugerirMapa'
import { TIPOS_MAPA } from '../../rooms/ideas/tiposMapa'
import { MiniMapa } from '../../rooms/ideas/MiniMapa'
import { VistaBlob } from '../../rooms/_shared/ImagenIA'
import { abrirApp } from '../abrirApp'
import { navegarDestino } from './destinoChat'
import { getPlantilla } from '../registry'
import type { DestinoChat } from '../data/db'

/**
 * Conversación tipo chat (estilo WhatsApp) con un asistente: burbujas del
 * usuario a la derecha y del asistente a la izquierda, separadas por día.
 * Vive SIEMPRE encima de la barra del chat (con el asistente activo mientras no
 * elijas otro hilo), y la sustituyen la bitácora, el manual o la configuración
 * cuando se abren. Se responde desde la barra de abajo (llega en vivo).
 */
export function ChatConversacion({ onCerrar }: { onCerrar: () => void }) {
  const t = useT()
  // Sin hilo elegido, el de siempre es el del asistente activo.
  const hiloId = useMascota((s) => s.conversacion ?? s.mascota)
  const pensando = useMascota((s) => s.pensando)
  const hablanteId = useMascota((s) => s.hablanteId)
  const lista = useAsistentes((s) => s.lista)
  const mensajes = useMensajesAsistente(hiloId)
  const refLista = useRef<HTMLDivElement>(null)
  const escribiendo = pensando && hablanteId === hiloId
  // Mapa conceptual ofrecido por ESTE asistente tras una explicación suya.
  const sugerencia = useSugerenciaMapa((s) =>
    s.sugerencia?.asistenteId === hiloId ? s.sugerencia : null,
  )
  const dibujando = useSugerenciaMapa((s) => s.dibujando)
  const defMapa = sugerencia
    ? (TIPOS_MAPA.find((d) => d.id === sugerencia.tipo) ?? TIPOS_MAPA[0])
    : null

  // Siempre pegado al último mensaje (como un chat real).
  useEffect(() => {
    const el = refLista.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensajes?.length, hiloId, escribiendo, sugerencia, dibujando])

  const asistente = lista.find((a) => a.id === hiloId)
  if (!asistente) return null

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
        <ToggleVozAuto asistenteId={hiloId} />
        <button
          type="button"
          onClick={() => limpiarConversacion(hiloId)}
          className="rounded px-1.5 py-1 text-sm text-white/25 transition hover:bg-white/10 hover:text-white/70"
          title={t('chat.conv.limpiar', 'Vaciar conversación')}
        >
          <Icono nombre="basura" />
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
                      ? 'rounded-ee-sm bg-emerald-500/25 text-white/95'
                      : 'rounded-es-sm bg-white/10 text-white/85'
                  }`}
                >
                  <p className="whitespace-pre-line break-words">{m.texto}</p>
                  {/* Imagen generada con IA en ese turno */}
                  {m.imagen && (
                    <div className="mt-1.5 overflow-hidden rounded-xl border border-white/10">
                      <VistaBlob blob={m.imagen} className="max-h-64 w-full object-contain" />
                    </div>
                  )}
                  {/* Mapa dibujado en ese turno: se ve aquí y vive en la app Ideas */}
                  {m.mapaId != null && (
                    <button
                      type="button"
                      onClick={() => abrirApp('ideas', 'mapas', String(m.mapaId))}
                      className="mt-1.5 block w-full rounded-xl border border-white/10 bg-black/20 p-1.5 transition hover:border-accent/50"
                      title={t('chat.mapa.abrir', 'Ver el mapa en Ideas')}
                    >
                      <MiniMapa mapaId={m.mapaId} className="h-24 w-full" />
                      <span className="mt-1 block text-[10px] text-white/45">
                        <Icono nombre="nodos" /> {t('chat.mapa.abrir', 'Ver el mapa en Ideas')}
                      </span>
                    </button>
                  )}
                  {/* Chips de navegación: uno por cada app donde el turno guardó algo.
                      `destino` (singular) es el formato viejo de los mensajes ya en el hilo. */}
                  <ChipsDestino destinos={m.destinos ?? (m.destino ? [m.destino] : [])} />
                  <div className="mt-0.5 flex items-center justify-end gap-1">
                    {/* Escuchar lo que contestó, aunque la lectura automática esté apagada. */}
                    {!esUsuario && <BotonVoz texto={m.texto} asistenteId={hiloId} />}
                    <p className={`text-[9px] ${esUsuario ? 'text-emerald-400/80' : 'text-white/30'}`}>
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
        {/* Oferta de dibujar la explicación como mapa (solo gasta IA si acepta) */}
        {sugerencia && defMapa && !dibujando && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-es-sm border border-accent/30 bg-accent/10 px-3 py-2">
              <p className="text-[12px] leading-snug text-white/80">
                <span className="text-accent">
                  <Icono nombre={defMapa.icono} />
                </span>{' '}
                {t('chat.mapa.ofrecer', '¿Te lo dibujo como {tipo} de «{tema}»?', {
                  tipo: t(`ideas.tipo.${defMapa.id}`, defMapa.nombreEs).toLowerCase(),
                  tema: sugerencia.tema,
                })}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void useSugerenciaMapa.getState().dibujar()}
                  className="rounded-lg bg-accent px-2 py-1 text-[11px] font-semibold text-accent-ink transition hover:brightness-110"
                >
                  {t('chat.mapa.dibujar', 'Dibujarlo')}
                </button>
                <button
                  type="button"
                  onClick={() => useSugerenciaMapa.getState().descartar()}
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold text-white/40 transition hover:bg-white/10 hover:text-white/80"
                >
                  {t('chat.mapa.descartar', 'Ahora no')}
                </button>
              </div>
            </div>
          </div>
        )}
        {dibujando && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-es-sm bg-white/10 px-3 py-1.5 text-sm text-white/60">
              <span className="animate-pulse">
                <Icono nombre="brillo" /> {t('chat.mapa.dibujando', 'Dibujando el mapa…')}
              </span>
            </div>
          </div>
        )}

        {/* La IA está preparando la respuesta */}
        {escribiendo && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-es-sm bg-white/10 px-3 py-1.5 text-sm text-white/60">
              <span className="animate-pulse tracking-widest"><Icono emoji={asistente.emoji} /> …</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Fila de chips bajo un mensaje: un mismo turno puede haber guardado en varias apps. */
function ChipsDestino({ destinos }: { destinos: DestinoChat[] }) {
  if (destinos.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {destinos.map((d, i) => (
        <ChipDestino key={i} destino={d} />
      ))}
    </div>
  )
}

/** Chip bajo un mensaje del asistente: navega al menú donde quedó lo guardado. */
function ChipDestino({ destino }: { destino: DestinoChat }) {
  const t = useT()
  const etiqueta = () => {
    switch (destino.tipo) {
      case 'app': {
        const corto = (getPlantilla(destino.appId)?.nombre ?? destino.appId).split(' · ')[0]
        return t('chat.destino.abrir', 'Abrir {app}', {
          app: t(`room.${destino.appId}.nombre`, corto).split(' · ')[0],
        })
      }
      case 'menu':
        return destino.tab === 'inventario'
          ? t('chat.destino.inventario', 'Ver en el inventario')
          : destino.tab === 'cuartos'
            ? t('chat.destino.menu.cuartos', 'Ver mis cuartos')
            : t('chat.destino.menu.plantillas', 'Ver las plantillas')
      case 'editor':
        return destino.tab === 'personajes'
          ? t('chat.destino.editor.personajes', 'Abrir editor · Personajes')
          : destino.tab === 'objetos'
            ? t('chat.destino.editor.objetos', 'Abrir editor · Objetos')
            : destino.tab === 'config'
              ? t('chat.destino.editor.config', 'Abrir Configuraciones')
              : t('chat.destino.editor.mapa', 'Abrir el editor del mapa')
      case 'rutinas':
        return t('chat.destino.rutinas', 'Ver mis rutinas')
    }
  }
  const icono = () => {
    switch (destino.tipo) {
      case 'app':
        return <Icono emoji={getPlantilla(destino.appId)?.icon ?? '📦'} />
      case 'menu':
        return <Icono nombre={destino.tab === 'inventario' ? 'inventario' : destino.tab === 'cuartos' ? 'cuartos' : 'casa'} />
      case 'editor':
        return (
          <Icono
            nombre={
              destino.tab === 'personajes'
                ? 'persona'
                : destino.tab === 'config'
                  ? 'ajustes'
                  : destino.tab === 'mapa'
                    ? 'mapa'
                    : 'pincel'
            }
          />
        )
      case 'rutinas':
        return <Icono nombre="calendario" />
    }
  }
  return (
    <button
      type="button"
      onClick={() => navegarDestino(destino)}
      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[11px] text-white/70 transition hover:border-accent/50 hover:text-white"
    >
      {icono()} {etiqueta()}
    </button>
  )
}
