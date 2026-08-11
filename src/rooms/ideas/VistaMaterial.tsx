import { VACIO, ideasRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { MiniMapa } from './MiniMapa'

/**
 * Vistas previas del material que aporta Ideas, para verlo dentro de la entrada
 * de la enciclopedia que lo usa. Se registran en diferido desde `index.tsx`
 * (ver `core/materialApps.ts`): la biblioteca nunca importa este archivo.
 */

export function VistaMapa({ id }: { id: number }) {
  return <MiniMapa mapaId={id} className="h-32 w-full" />
}

export function VistaIdea({ id }: { id: number }) {
  const t = useT()
  const idea = (ideasRepo.useAll() ?? VACIO).find((i) => i.id === id)
  if (!idea) return null
  const puntos = idea.puntos ?? []
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-white/85">{idea.texto}</p>
      {puntos.length > 0 ? (
        <ul className="space-y-0.5">
          {puntos.map((p) => (
            <li key={p.puntoId} className={`text-[11px] ${p.hecho ? 'text-white/35 line-through' : 'text-white/60'}`}>
              · {p.texto}
            </li>
          ))}
        </ul>
      ) : (
        idea.detalle && <p className="text-[11px] leading-relaxed text-white/55">{idea.detalle}</p>
      )}
      {puntos.length === 0 && !idea.detalle && (
        <p className="text-[11px] text-white/35">
          <Icono nombre="foco" /> {t('ideas.vista.sinPuntos', 'Idea sin desarrollar todavía.')}
        </p>
      )}
    </div>
  )
}
