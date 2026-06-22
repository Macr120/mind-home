import type { Noticia } from '../../core/data/db'
import { noticiasRepo } from '../../core/data/repository'
import { COLOR, getCategoria } from './constantes'
import { useT } from '../../core/i18n/useT'

export function TarjetaNoticia({
  item,
  onEditar,
  onEliminar,
}: {
  item: Noticia
  onEditar: () => void
  onEliminar: () => void
}) {
  const t = useT()
  const cat = getCategoria(item.categoria)

  const toggleLeido = () => {
    if (item.id) void noticiasRepo.update(item.id, { leido: !item.leido })
  }

  return (
    <article
      className={`rounded-xl border p-3.5 transition ${
        item.leido ? 'bg-white/[0.03] border-white/10 opacity-75' : 'bg-white/5 border-white/15'
      }`}
      style={item.destacada ? { borderLeftColor: COLOR, borderLeftWidth: 3 } : undefined}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={toggleLeido}
          className={`shrink-0 w-5 h-5 rounded border mt-0.5 flex items-center justify-center text-[10px] ${
            item.leido ? 'bg-pink-500/40 border-pink-400' : 'border-white/30'
          }`}
          title={item.leido ? t('diario.tarjeta.noLeida', 'Marcar no leída') : t('diario.tarjeta.leida', 'Marcar leída')}
        >
          {item.leido ? '✓' : ''}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 items-center mb-1">
            <span
              className="text-[10px] font-bold rounded-md px-2 py-0.5"
              style={{ background: `${COLOR}33`, color: COLOR }}
            >
              {cat.icon} {cat.label}
            </span>
            {item.destacada && (
              <span className="text-[10px] text-amber-300 font-semibold">{t('diario.tarjeta.destacada', '★ Destacada')}</span>
            )}
            {item.fuente && <span className="text-[10px] text-white/40">{item.fuente}</span>}
          </div>
          <h3 className={`font-bold text-sm leading-snug ${item.leido ? 'text-white/60' : 'text-white/95'}`}>
            {item.titulo}
          </h3>
          <p className="mt-1.5 text-sm text-white/65 leading-relaxed line-clamp-4">{item.resumen}</p>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs font-semibold hover:underline"
              style={{ color: COLOR }}
            >
              {t('diario.tarjeta.leer', 'Leer enlace →')}
            </a>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-3 ml-7">
        <button type="button" onClick={onEditar} className="text-xs font-semibold hover:underline" style={{ color: COLOR }}>
          {t('diario.tarjeta.editar', 'Editar')}
        </button>
        <button type="button" onClick={onEliminar} className="text-xs text-white/35 hover:text-red-400">
          {t('diario.tarjeta.eliminar', 'Eliminar')}
        </button>
      </div>
    </article>
  )
}
