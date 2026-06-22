import { useMascota } from '../state/mascotaStore'
import { useAsistentes } from '../state/asistentesStore'
import { useT } from '../i18n/useT'

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
  const abrirConversacion = useMascota((s) => s.abrirConversacion)
  const pensando = useMascota((s) => s.pensando)
  const lista = useAsistentes((s) => s.lista)

  if ((!mensaje && !pensando) || !visible) return null
  const m = lista.find((a) => a.id === mascotaId) ?? lista[0]
  if (!m) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <div
        className="absolute"
        style={{ left: x, top: y, transform: 'translate(-50%, calc(-100% - 10px))' }}
      >
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => abrirConversacion(m.id)}
            title={t('chat.verConv', 'Ver la conversación completa')}
            className="pointer-events-auto relative max-w-[16rem] cursor-pointer rounded-2xl border border-white/10 bg-[#1a1f2b]/95 px-3.5 py-2 text-left text-sm text-white/90 shadow-xl backdrop-blur-md transition hover:border-emerald-400/40"
          >
            <span className="mr-1">{m.emoji}</span>
            {mensaje ?? <span className="animate-pulse tracking-widest">✨ …</span>}
          </button>
          <span
            className="-mt-px h-3 w-3 rotate-45 border-b border-r border-white/10 bg-[#1a1f2b]/95"
            aria-hidden
          />
        </div>
      </div>
    </div>
  )
}
