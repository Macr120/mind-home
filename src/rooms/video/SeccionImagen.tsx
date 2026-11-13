import { useState } from 'react'
import type { ClipPrincipal, MovimientoClip } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonSecundario, Campo, Spinner } from '../_shared/ui'
import { velocidadDe } from './modelo'
import { Chip, Deslizador } from './Secciones'

export const MOVIMIENTOS: { id: MovimientoClip | null; clave: string; es: string }[] = [
  { id: null, clave: 'video.movimiento.quieto', es: 'Quieto' },
  { id: 'zoomIn', clave: 'video.movimiento.zoomIn', es: 'Acercar lento' },
  { id: 'zoomOut', clave: 'video.movimiento.zoomOut', es: 'Alejar lento' },
  { id: 'punch', clave: 'video.movimiento.punch', es: 'Golpe de zoom' },
  { id: 'panIzq', clave: 'video.movimiento.panIzq', es: 'Paneo a la izquierda' },
  { id: 'panDer', clave: 'video.movimiento.panDer', es: 'Paneo a la derecha' },
]
const VELOCIDADES = [0.5, 0.75, 1, 1.5, 2]

/**
 * La imagen del clip principal: movimiento de cámara dentro del clip, velocidad
 * (solo video), ajuste fino de color y reencuadre siguiendo la cara.
 */
export function SeccionImagen({
  clip,
  onCambiar,
  onVelocidad,
  onSeguirCara,
}: {
  clip: ClipPrincipal
  onCambiar: (patch: Partial<ClipPrincipal>) => void
  onVelocidad: (v: number) => void
  /** Activa (busca la cara) o quita el reencuadre. */
  onSeguirCara: () => Promise<void>
}) {
  const t = useT()
  const [buscando, setBuscando] = useState(false)
  const esVideo = clip.fuente.tipo === 'video'
  const vel = velocidadDe(clip)
  const color = clip.color ?? {}
  const cambiarColor = (campo: 'brillo' | 'contraste' | 'saturacion', v: number) => {
    const nuevo = { ...color, [campo]: Math.abs(v) < 0.02 ? undefined : v }
    const vacio = !nuevo.brillo && !nuevo.contraste && !nuevo.saturacion
    onCambiar({ color: vacio ? undefined : nuevo })
  }
  return (
    <>
      <Campo etiqueta={t('video.movimiento.titulo', 'Movimiento')}>
        <div className="flex flex-wrap gap-1.5">
          {MOVIMIENTOS.map((m) => (
            <Chip key={m.clave} activo={(clip.movimiento ?? null) === m.id} onClick={() => onCambiar({ movimiento: m.id ?? undefined })}>
              {t(m.clave, m.es)}
            </Chip>
          ))}
        </div>
      </Campo>
      {esVideo && (
        <Campo etiqueta={t('video.velocidad.titulo', 'Velocidad')}>
          <div className="flex flex-wrap gap-1.5">
            {VELOCIDADES.map((v) => (
              <Chip key={v} activo={Math.abs(vel - v) < 0.01} onClick={() => onVelocidad(v)}>
                {v}×
              </Chip>
            ))}
          </div>
        </Campo>
      )}
      <div className="flex flex-wrap gap-x-3">
        <Deslizador etiqueta={t('video.color.brillo', 'Brillo')} valor={color.brillo ?? 0} min={-1} max={1} onCambiar={(v) => cambiarColor('brillo', v)} />
        <Deslizador etiqueta={t('video.color.contraste', 'Contraste')} valor={color.contraste ?? 0} min={-1} max={1} onCambiar={(v) => cambiarColor('contraste', v)} />
        <Deslizador etiqueta={t('video.color.saturacion', 'Saturación')} valor={color.saturacion ?? 0} min={-1} max={1} onCambiar={(v) => cambiarColor('saturacion', v)} />
      </div>
      {esVideo && (clip.ajuste ?? 'cubrir') === 'cubrir' && (
        <div>
          <BotonSecundario
            pequeno
            disabled={buscando}
            onClick={async () => {
              setBuscando(true)
              try {
                await onSeguirCara()
              } finally {
                setBuscando(false)
              }
            }}
          >
            {buscando ? <Spinner pequeno /> : <Icono nombre={clip.seguir ? 'cerrar' : 'persona'} />}{' '}
            {buscando
              ? t('video.reencuadre.buscando', 'Buscando la cara…')
              : clip.seguir
                ? t('video.reencuadre.quitar', 'Quitar el seguimiento de la cara')
                : t('video.reencuadre.seguir', 'Seguir la cara')}
          </BotonSecundario>
          <p className="mt-1 text-[11px] text-white/45">
            {t('video.reencuadre.nota', 'El encuadre sigue a quien sale en cuadro: ideal para pasar un video horizontal a vertical. Gratis, sin IA.')}
          </p>
        </div>
      )}
    </>
  )
}
