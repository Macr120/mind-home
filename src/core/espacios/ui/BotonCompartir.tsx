import { useState } from 'react'
import { useT } from '../../i18n/useT'
import { useMascota } from '../../state/mascotaStore'
import { Icono } from '../../ui/iconos/Icono'
import { mensajeErrorEspacio } from '../api'
import { useEspaciosStore } from '../espaciosStore'

/**
 * El botón «Compartir» de cada app del Studio y del calendario. Sin espacio aún
 * pide crearlo (`onCompartir`, que cada app implementa porque solo ella sabe
 * qué snapshot inicial subir); con espacio abre el panel.
 */
export function BotonCompartir({
  espacioId,
  onCompartir,
  pequeno,
}: {
  espacioId?: string
  onCompartir: () => Promise<void>
  pequeno?: boolean
}) {
  const t = useT()
  const [ocupado, setOcupado] = useState(false)
  const hablar = useMascota((s) => s.decir)

  const pulsar = async () => {
    if (espacioId) {
      useEspaciosStore.getState().abrirCompartir(espacioId)
      return
    }
    setOcupado(true)
    try {
      await onCompartir()
    } catch (e) {
      hablar(mensajeErrorEspacio(e, t), { persistir: false })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void pulsar()}
      disabled={ocupado}
      className={`ui-boton rounded-lg border border-white/15 bg-black/20 font-semibold text-white/70 transition hover:border-accent/50 hover:text-white disabled:opacity-40 ${
        pequeno ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
    >
      <Icono nombre={espacioId ? 'companeros' : 'compartir'} />{' '}
      {espacioId ? t('esp.compartido', 'Compartido') : t('esp.compartir', 'Compartir')}
    </button>
  )
}
