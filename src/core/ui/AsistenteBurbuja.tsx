import { useMascota } from '../state/mascotaStore'
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
