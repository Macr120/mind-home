import { Icono } from '../../core/ui/iconos/Icono'
import { useState } from 'react'
import type { Titular } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { getCategoria } from './constantes'
import { ImagenNoticia } from './ImagenNoticia'
import { vivo } from '../../core/ui/estilos'

/** Tarjeta estilo feed: imagen arriba (con respaldo si falla) y texto abajo. */
export function TarjetaTitular({ titular }: { titular: Titular }) {
  const t = useT()
  const cat = getCategoria(titular.categoria)
  const [sinImagen, setSinImagen] = useState(!titular.imagen)

  return (
    <article className="overflow-hidden rounded-2xl border border-white/15 bg-white/5">
      {sinImagen ? (
        <div
          className="flex aspect-video items-center justify-center text-5xl"
          style={{ background: `linear-gradient(135deg, ${cat.color}30, ${cat.color}0d)` }}
        >
          <Icono emoji={cat.emoji} />
        </div>
      ) : (
        <ImagenNoticia
          src={titular.imagen!}
          color={cat.color}
          onError={() => setSinImagen(true)}
        />
      )}
      <div className="space-y-2 p-3.5">
        <div className="flex items-center gap-2">
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-bold"
            style={{ background: `${cat.color}33`, color: cat.color }}
          >
            <Icono emoji={cat.emoji} /> {t(`diario.cat.${cat.id}`, cat.label)}
          </span>
          <span className="text-[10px] text-white/35">{titular.fuente}</span>
        </div>
        <h3 className="text-sm font-bold leading-snug">{titular.titulo}</h3>
        {titular.resumen && (
          <p className="line-clamp-3 text-xs leading-relaxed text-white/55">{titular.resumen}</p>
        )}
        <a
          href={titular.url}
          target="_blank"
          rel="noreferrer"
          className="texto-vivo inline-block text-xs font-semibold hover:underline"
          style={vivo(cat.color)}
        >
          {t('diario.tarjeta.leer', 'Leer completa →')}
        </a>
      </div>
    </article>
  )
}
