import { useInfraNota } from '../state/infraNotaStore'
import { useMascota } from '../state/mascotaStore'
import { MASCOTAS } from '../chat/mascotas'
import { Icono } from './iconos/Icono'

/**
 * Lo que el asistente responde cuando una orden del chat abre un editor de
 * infraestructura. Va montado UNA vez en App.tsx (no en cada editor) porque el
 * ChatBox se desmonta al entrar a construir y su respuesta se perdería.
 */
export function InfraNota() {
  const nota = useInfraNota((s) => s.nota)
  const limpiar = useInfraNota((s) => s.limpiar)
  const mascotaId = useMascota((s) => s.mascota)
  if (!nota) return null
  const mascota = MASCOTAS.find((m) => m.id === mascotaId) ?? MASCOTAS[0]

  return (
    <div className="pointer-events-none absolute start-0 end-0 top-14 z-50 flex justify-center px-3">
      <button
        type="button"
        onClick={limpiar}
        className="ui-hud ui-pop pointer-events-auto flex max-w-md items-start gap-2 rounded-xl border border-violet-400/40 px-3 py-2 text-start text-xs leading-snug text-white transition hover:bg-white/10"
      >
        <span className="text-base leading-none">
          <Icono emoji={mascota.emoji} />
        </span>
        {nota}
      </button>
    </div>
  )
}
