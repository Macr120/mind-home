import { useState } from 'react'
import type { MediaArchivo } from '../../core/data/db'
import { COLOR, getEstadoMedia, getTipoMedia } from './constantes'
import { Estrellas } from './Estrellas'
import { formatearFecha } from './fecha'
import { BloqueResumenIA } from './BloqueResumenIA'
import { BotonPortada, MiniPortada } from './PortadaTarjeta'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'
import { Foto } from '../_shared/fotos'

/**
 * Tarjeta de dos caras: el frente luce el título en grande sobre la portada y
 * al tocarla gira para mostrar la información y las acciones. Un toque sobre
 * un control interno (Editar, Ver más…) no la gira.
 */
export function TarjetaMedia({
  item,
  onEditar,
  onEliminar,
}: {
  item: MediaArchivo
  onEditar: () => void
  onEliminar: () => void
}) {
  const t = useT()
  const tipo = getTipoMedia(item.tipo)
  const estado = getEstadoMedia(item.estado)
  const [volteada, setVolteada] = useState(false)
  const conPortada = Boolean(item.portadaFoto || item.portada)

  const voltear = (e: { target: EventTarget | null }) => {
    if ((e.target as HTMLElement).closest('button, a, input')) return false
    setVolteada((v) => !v)
    return true
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={voltear}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && voltear(e)) e.preventDefault()
      }}
      className="ui-presion h-full cursor-pointer [perspective:1200px]"
    >
      <div
        className={`grid h-96 transition-transform duration-500 ease-fluida [transform-style:preserve-3d] motion-reduce:transition-none ${
          volteada ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* Frente: solo el título, en grande, sobre la portada. */}
        <div
          inert={volteada}
          className={`relative col-start-1 row-start-1 flex select-none flex-col justify-end overflow-hidden rounded-xl border border-white/10 [backface-visibility:hidden] ${
            conPortada ? 'ui-noche bg-black/30' : 'bg-white/5'
          }`}
          style={{ borderLeftColor: COLOR, borderLeftWidth: 3 }}
        >
          {item.portadaFoto ? (
            <Foto blob={item.portadaFoto} className="absolute inset-0 h-full w-full object-cover" />
          ) : item.portada ? (
            <img
              src={item.portada}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(150deg, color-mix(in srgb, ${COLOR} 22%, transparent), transparent 70%)`,
                }}
              />
              <span aria-hidden className="absolute right-3 top-3 text-5xl opacity-20">
                <Icono emoji={tipo.icon} />
              </span>
            </>
          )}
          {conPortada && (
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10"
            />
          )}
          <div className="relative p-4">
            <h3 className="line-clamp-3 text-2xl font-black leading-tight text-white/95">
              {item.titulo}
            </h3>
            {item.autor && <p className="mt-1 text-sm text-white/60">{item.autor}</p>}
            {item.calificacion > 0 && (
              <div className="pointer-events-none mt-1.5">
                <Estrellas valor={item.calificacion} soloLectura />
              </div>
            )}
          </div>
        </div>

        {/* Reverso: la información y las acciones de siempre. */}
        <div
          inert={!volteada}
          className="col-start-1 row-start-1 overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-white/5 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{ borderLeftColor: COLOR, borderLeftWidth: 3 }}
        >
          <div className="p-3.5">
            <div className="flex items-start gap-2">
              <MiniPortada item={item} emoji={tipo.icon} />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white/95 leading-snug">{item.titulo}</h3>
                {item.autor && <p className="text-xs text-white/45 mt-0.5">{item.autor}</p>}
                {item.calificacion > 0 && (
                  <div className="mt-1">
                    <Estrellas valor={item.calificacion} soloLectura />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span
                className="max-w-full truncate rounded-md px-2 py-0.5 font-semibold"
                style={{ background: `color-mix(in srgb, ${COLOR} 20%, transparent)`, color: COLOR }}
              >
                {item.genero}
              </span>
              <span className="whitespace-nowrap rounded-md bg-white/10 px-2 py-0.5 text-white/55">
                {formatearFecha(item.fecha)}
              </span>
              <span className="whitespace-nowrap rounded-md bg-white/10 px-2 py-0.5 text-white/55">
                {estado.label}
              </span>
            </div>

            {item.resena && (
              <p className="mt-3 text-sm text-white/70 leading-relaxed">{item.resena}</p>
            )}

            <BloqueResumenIA item={item} />

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={onEditar} className="text-xs font-semibold hover:underline texto-vivo" style={vivo(COLOR)}>
                {t('entre.tarjeta.editar', 'Editar')}
              </button>
              <BotonPortada item={item} />
              <button type="button" onClick={onEliminar} className="text-xs text-white/35 hover:text-red-400">
                {t('entre.tarjeta.eliminar', 'Eliminar')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
