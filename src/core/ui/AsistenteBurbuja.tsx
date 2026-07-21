import { useMascota } from '../state/mascotaStore'
import { useAsistentes } from '../state/asistentesStore'
import { limpiarMarkdown } from '../chat/texto'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { BotonVoz } from './BotonVoz'

/**
 * Burbuja de diálogo del asistente, anclada a su cabeza en el mundo 3D.
 * Lee la posición proyectada (screenX/Y) que calcula Asistente3D cada frame.
 * Al tocarla se abre la conversación completa con ese asistente (por si el
 * mensaje desaparece antes de alcanzar a leerlo).
 */
export function AsistenteBurbuja() {
  const t = useT()
  const mensaje = useMascota((s) => s.mensaje)
  const visible = useMascota((s) => s.visible)
  const x = useMascota((s) => s.screenX)
  const y = useMascota((s) => s.screenY)
  const mascotaId = useMascota((s) => s.mascota)
  const hablanteId = useMascota((s) => s.hablanteId)
  const abrirConversacion = useMascota((s) => s.abrirConversacion)
  const pensando = useMascota((s) => s.pensando)
  const lista = useAsistentes((s) => s.lista)

  if ((!mensaje && !pensando) || !visible) return null
  const m = lista.find((a) => a.id === (hablanteId ?? mascotaId)) ?? lista[0]
  if (!m) return null
  const texto = mensaje ? limpiarMarkdown(mensaje) : null

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <div
        className="absolute"
        // clamp: la burbuja nunca se sale del plano aunque el NPC quede en un borde.
        style={{
          left: `clamp(9rem, ${x}px, calc(100% - 9rem))`,
          top: `clamp(10rem, ${y}px, calc(100% - 2rem))`,
          transform: 'translate(-50%, calc(-100% - 10px))',
        }}
      >
        <div className="relative flex flex-col items-center">
          {/* Escuchar lo que acaba de decir (fuera del botón: no se anidan botones). */}
          {texto && (
            <BotonVoz
              texto={texto}
              asistenteId={m.id}
              className="ui-panel-glass pointer-events-auto absolute -right-2 -top-2 z-10 rounded-full border border-white/10 py-0.5 shadow-lg backdrop-blur-md"
            />
          )}
          <button
            type="button"
            onClick={() => abrirConversacion(m.id)}
            title={t('chat.verConv', 'Ver la conversación completa')}
            className="ui-panel-glass pointer-events-auto relative max-w-[16rem] cursor-pointer rounded-2xl border border-white/10 px-3.5 py-2 text-left text-sm text-white/90 shadow-xl backdrop-blur-md transition hover:border-emerald-400/40"
          >
            {texto ? (
              <>
                <span className="line-clamp-4 whitespace-pre-line">
                  <span className="mr-1"><Icono emoji={m.emoji} /></span>
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
                <span className="mr-1"><Icono emoji={m.emoji} /></span>
                <span className="animate-pulse tracking-widest"><Icono nombre="brillo" /> …</span>
              </>
            )}
          </button>
          <span
            className="ui-panel-glass -mt-px h-3 w-3 rotate-45 border-b border-r border-white/10"
            aria-hidden
          />
        </div>
      </div>
    </div>
  )
}
