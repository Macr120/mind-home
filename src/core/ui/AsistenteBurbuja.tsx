import { useMascota } from '../state/mascotaStore'
import { useHud } from '../state/hudStore'
import { useAsistentes } from '../state/asistentesStore'
import { limpiarMarkdown } from '../chat/texto'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { BotonVoz } from './BotonVoz'

/**
 * Nube de diálogo del asistente. La coloca `NubeAsistente` (en la escena 3D),
 * anclada sobre la cabeza del personaje que habla: la nube SALE de él, no de un
 * punto fijo de la pantalla. Al tocarla se abre la conversación completa con ese
 * asistente (por si el mensaje desaparece antes de alcanzar a leerlo).
 *
 * Solo pinta si el mensaje (o el "pensando…") es de `asistenteId`: cada
 * asistente del mapa monta la suya y únicamente habla la del hablante.
 */
export function AsistenteBurbuja({ asistenteId }: { asistenteId: string }) {
  const t = useT()
  const mensaje = useMascota((s) => s.mensaje)
  const mascotaId = useMascota((s) => s.mascota)
  const hablanteId = useMascota((s) => s.hablanteId)
  const abrirConversacion = useMascota((s) => s.abrirConversacion)
  const pensando = useMascota((s) => s.pensando)
  const lista = useAsistentes((s) => s.lista)

  if (!mensaje && !pensando) return null
  if ((hablanteId ?? mascotaId) !== asistenteId) return null
  const m = lista.find((a) => a.id === asistenteId)
  if (!m) return null
  const texto = mensaje ? limpiarMarkdown(mensaje) : null
  // Un mensaje corto se lee entero; solo se recorta lo que pasa de un párrafo.
  const largo = !!texto && (/\n\s*\n/.test(texto) || texto.length > 320)
  // Los toques en la nube no deben llegar al Canvas 3D: el DOM de `Html` cuelga
  // del div donde R3F escucha, y un clic que se cuela ahí mueve al avatar (o
  // abre un cuarto) y la nube se va a media lectura.
  const frenar = (e: { stopPropagation: () => void }) => e.stopPropagation()

  return (
    <div className="relative flex flex-col items-center" onPointerDown={frenar} onPointerUp={frenar} onClick={frenar}>
      {/* Escuchar lo que acaba de decir (fuera del botón: no se anidan botones).
          Mientras lee, la nube se queda; al terminar se despide poco después. */}
      {texto && (
        <BotonVoz
          texto={texto}
          asistenteId={m.id}
          onCambio={(hablando) => useMascota.getState().programarOcultar(hablando ? 120_000 : 1_500)}
          className="ui-panel-glass pointer-events-auto absolute -end-2 -top-2 z-10 rounded-full border border-white/10 py-0.5 shadow-lg backdrop-blur-md"
        />
      )}
      <button
        type="button"
        onClick={() => {
          // El hilo vive sobre la barra del chat: hay que desplegarla (en
          // teléfono nace plegada y la conversación no se vería).
          useHud.getState().setMenuAbierto(false)
          useHud.getState().setPlegado('chat', false)
          abrirConversacion(m.id)
        }}
        title={t('chat.verConv', 'Ver la conversación completa')}
        className="ui-panel-glass pointer-events-auto relative max-w-[20rem] cursor-pointer rounded-2xl border border-white/10 px-3.5 py-2 text-start text-sm text-white/90 shadow-xl backdrop-blur-md transition hover:border-emerald-400/40"
      >
        {texto ? (
          <>
            <span className={`whitespace-pre-line ${largo ? 'line-clamp-6' : ''}`}>
              <span className="me-1"><Icono emoji={m.emoji} /></span>
              {texto}
            </span>
            {largo && (
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
