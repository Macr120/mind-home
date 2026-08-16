import { useMascota } from '../state/mascotaStore'
import { useAsistentes } from '../state/asistentesStore'
import { limpiarMarkdown } from '../chat/texto'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { BotonVoz } from './BotonVoz'

/**
 * Burbuja de diálogo del asistente. La coloca `PilaPrompts` (en `App.tsx`),
 * SIEMPRE encima del chat y de los prompts contextuales — nunca anclada a su
 * posición 3D, para no quedar tapada por el HUD ni saltar por el mapa según
 * dónde esté parado el personaje. Al tocarla se abre la conversación completa
 * con ese asistente (por si el mensaje desaparece antes de alcanzar a leerlo).
 *
 * Se calla si el panel de conversación (siempre visible sobre el chat,
 * `ChatConversacion`) ya está mostrando el hilo de quien habla: no hace falta
 * decir lo mismo dos veces en el mismo lugar de la pantalla.
 */
export function AsistenteBurbuja() {
  const t = useT()
  const mensaje = useMascota((s) => s.mensaje)
  const mensajePersistido = useMascota((s) => s.mensajePersistido)
  const mascotaId = useMascota((s) => s.mascota)
  const hablanteId = useMascota((s) => s.hablanteId)
  const panelHiloId = useMascota((s) => s.panelHiloId)
  const abrirConversacion = useMascota((s) => s.abrirConversacion)
  const pensando = useMascota((s) => s.pensando)
  const lista = useAsistentes((s) => s.lista)

  if (!mensaje && !pensando) return null
  const quienHabla = hablanteId ?? mascotaId
  // El panel ya cuenta lo mismo: "escribiendo…" mientras piensa, el mensaje
  // una vez llega (si quedó en el hilo). Las frases espontáneas (sin persistir,
  // p. ej. el corazón) no viven en ningún hilo: su burbuja nunca se calla.
  if (panelHiloId === quienHabla && (pensando || mensajePersistido)) return null
  const m = lista.find((a) => a.id === quienHabla) ?? lista[0]
  if (!m) return null
  const texto = mensaje ? limpiarMarkdown(mensaje) : null

  return (
    <div className="relative flex flex-col items-center">
      {/* Escuchar lo que acaba de decir (fuera del botón: no se anidan botones). */}
      {texto && (
        <BotonVoz
          texto={texto}
          asistenteId={m.id}
          className="ui-panel-glass pointer-events-auto absolute -end-2 -top-2 z-10 rounded-full border border-white/10 py-0.5 shadow-lg backdrop-blur-md"
        />
      )}
      <button
        type="button"
        onClick={() => abrirConversacion(m.id)}
        title={t('chat.verConv', 'Ver la conversación completa')}
        className="ui-panel-glass pointer-events-auto relative max-w-[16rem] cursor-pointer rounded-2xl border border-white/10 px-3.5 py-2 text-start text-sm text-white/90 shadow-xl backdrop-blur-md transition hover:border-emerald-400/40"
      >
        {texto ? (
          <>
            <span className="line-clamp-4 whitespace-pre-line">
              <span className="me-1"><Icono emoji={m.emoji} /></span>
              {texto}
            </span>
            {texto.length > 150 && (
              <span className="mt-0.5 block text-[10px] text-white/40">
                {t('chat.burbuja.ver', 'Toca para leer todo')}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="me-1"><Icono emoji={m.emoji} /></span>
            <span className="animate-pulse tracking-widest"><Icono nombre="brillo" /> …</span>
          </>
        )}
      </button>
      <span
        className="ui-panel-glass -mt-px h-3 w-3 rotate-45 border-b border-e border-white/10"
        aria-hidden
      />
    </div>
  )
}
