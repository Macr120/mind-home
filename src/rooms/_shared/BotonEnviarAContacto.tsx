import { useState } from 'react'
import { useBuzon } from '../../core/buzon/buzonStore'
import type { Paquete } from '../../core/buzon/compartibles'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/**
 * «Enviar» en la ficha de una receta, una rutina, un mapa…: pide a la app su
 * paquete y abre el diálogo global del buzón (`EnviarAContacto`, en la raíz de
 * App), que lo manda a un contacto o lo exporta fuera de la app. No toca datos:
 * el paquete lo arma el cuarto (el diálogo abre también la hoja de compartir del sistema).
 */
export function BotonEnviarAContacto({
  empaquetar,
  pequeno,
  className = '',
}: {
  empaquetar: () => Promise<Paquete | null>
  /** Solo el icono (para barras apretadas). */
  pequeno?: boolean
  className?: string
}) {
  const t = useT()
  const [ocupado, setOcupado] = useState(false)
  // Sin backend no hay contactos, pero compartir fuera de la app sigue sirviendo.
  const etiqueta = t('esp.compartir', 'Compartir')

  const onClick = async () => {
    setOcupado(true)
    try {
      const p = await empaquetar()
      if (p) useBuzon.getState().abrirCompartir(p)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={ocupado}
      title={etiqueta}
      aria-label={etiqueta}
      aria-haspopup="dialog"
      className={`inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/10 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/15 disabled:opacity-50 ${
        pequeno ? 'px-2' : 'px-3'
      } ${className}`}
    >
      <Icono nombre="compartir" />
      {!pequeno && <span>{etiqueta}</span>}
    </button>
  )
}
