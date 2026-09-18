import { useState } from 'react'
import { useBuzon } from '../../core/buzon/buzonStore'
import type { Paquete } from '../../core/buzon/compartibles'
import { hayBackend } from '../../core/cuenta/supabase'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/**
 * «Enviar a un contacto» en la ficha de una receta, una rutina, un mapa…: pide a
 * la app su paquete y abre el diálogo global del buzón (`EnviarAContacto`, en la
 * raíz de App). Sin backend no se ofrece. No toca datos: el paquete lo arma el cuarto.
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
  if (!hayBackend()) return null
  const etiqueta = t('buzon.enviarA', 'Enviar a un contacto')

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
      className={`inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/10 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/15 disabled:opacity-50 ${
        pequeno ? 'px-2' : 'px-3'
      } ${className}`}
    >
      <Icono nombre="buzon" />
      {!pequeno && <span>{etiqueta}</span>}
    </button>
  )
}
