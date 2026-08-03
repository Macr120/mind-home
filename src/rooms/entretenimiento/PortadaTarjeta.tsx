import { useState } from 'react'
import type { MediaArchivo } from '../../core/data/db'
import { mediaArchivoRepo } from '../../core/data/repository'
import { buscarPortada } from './portadaMedia'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/** Carátula de la tarjeta; sin ella se queda el emoji del tipo de obra. */
export function MiniPortada({ item, emoji }: { item: MediaArchivo; emoji: string }) {
  if (!item.portada) {
    return (
      <span className="text-2xl shrink-0">
        <Icono emoji={emoji} />
      </span>
    )
  }
  return (
    <img
      src={item.portada}
      alt={item.titulo}
      loading="lazy"
      className="h-[4.5rem] w-12 shrink-0 rounded-md border border-white/10 object-cover"
    />
  )
}

/** Botón de la fila de acciones: busca la carátula o la quita. */
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

  if (item.portada) {
    return (
      <button
        type="button"
        onClick={() => item.id && mediaArchivoRepo.update(item.id, { portada: undefined })}
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
      {sinResultado && (
        <span className="text-xs text-white/25">{t('entre.port.sinResultado', 'Sin portada')}</span>
      )}
    </>
  )
}
