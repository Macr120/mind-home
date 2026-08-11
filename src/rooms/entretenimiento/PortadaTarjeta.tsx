import { useRef, useState } from 'react'
import type { MediaArchivo } from '../../core/data/db'
import { mediaArchivoRepo } from '../../core/data/repository'
import { buscarPortada } from './portadaMedia'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { comprimirFoto, Foto } from '../_shared/fotos'

/**
 * Carátula de la tarjeta. La subida a mano MANDA sobre la remota: si la pusiste
 * tú es porque Wikipedia y Open Library no dieron con la buena.
 */
export function MiniPortada({ item, emoji }: { item: MediaArchivo; emoji: string }) {
  const clase = 'h-[4.5rem] w-12 shrink-0 rounded-md border border-white/10 object-cover'

  if (item.portadaFoto) return <Foto blob={item.portadaFoto} className={clase} />

  if (!item.portada) {
    return (
      <span className="text-2xl shrink-0">
        <Icono emoji={emoji} />
      </span>
    )
  }
  return <img src={item.portada} alt={item.titulo} loading="lazy" className={clase} />
}

/**
 * Botón para poner la carátula propia. Se usa suelto en la tarjeta y también en
 * la lista de las que la búsqueda no encontró.
 */
export function SubirPortada({
  item,
  etiqueta,
  className = 'text-xs text-white/35 hover:text-white/70',
}: {
  item: MediaArchivo
  etiqueta?: string
  className?: string
}) {
  const t = useT()
  const archivo = useRef<HTMLInputElement>(null)

  const elegir = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f || item.id == null) return
    await mediaArchivoRepo.update(item.id, { portadaFoto: await comprimirFoto(f) })
  }

  return (
    <>
      <button type="button" onClick={() => archivo.current?.click()} className={className}>
        {etiqueta ?? t('entre.port.subir', 'Subir portada')}
      </button>
      <input
        ref={archivo}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void elegir(e.target.files)}
      />
    </>
  )
}

/** Botón de la fila de acciones: busca la carátula, la quita o la sube a mano. */
export function BotonPortada({ item }: { item: MediaArchivo }) {
  const t = useT()
  const [buscando, setBuscando] = useState(false)
  const [sinResultado, setSinResultado] = useState(false)

  const buscar = async () => {
    if (buscando || !item.id) return
    setSinResultado(false)
    setBuscando(true)
    const url = await buscarPortada(item)
    if (url) await mediaArchivoRepo.update(item.id, { portada: url })
    else setSinResultado(true)
    setBuscando(false)
  }

  if (buscando) {
    return <span className="text-xs text-white/35">{t('entre.port.buscando', 'Buscando portada…')}</span>
  }

  if (item.portada || item.portadaFoto) {
    return (
      <button
        type="button"
        onClick={() =>
          item.id && mediaArchivoRepo.update(item.id, { portada: undefined, portadaFoto: undefined })
        }
        className="text-xs text-white/35 hover:text-white/70"
      >
        {t('entre.port.quitar', 'Quitar portada')}
      </button>
    )
  }

  return (
    <>
      <button type="button" onClick={buscar} className="text-xs text-white/35 hover:text-white/70">
        {t('entre.port.buscar', 'Buscar portada')}
      </button>
      <SubirPortada item={item} />
      {sinResultado && (
        <span className="text-xs text-white/25">{t('entre.port.sinResultado', 'Sin portada')}</span>
      )}
    </>
  )
}
