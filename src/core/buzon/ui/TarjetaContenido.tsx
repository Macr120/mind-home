import { useState } from 'react'
import { VistaBlob } from '../../../rooms/_shared/ImagenIA'
import { useT } from '../../i18n/useT'
import { getPlantilla } from '../../registry'
import { Icono } from '../../ui/iconos/Icono'
import { mensajeErrorBuzon } from '../api'
import { abrirContenido, importarContenido } from '../importar'
import type { MensajeBuzon } from '../tipos'

/**
 * Burbuja de un contenido de cuarto (receta, rutina, mapa…): nombre, de qué
 * app viene, su vista previa y «Guardar en <app>», que lo crea en la casa del
 * receptor y lo abre.
 */
export function TarjetaContenido({ m }: { m: MensajeBuzon }) {
  const t = useT()
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const c = m.contenido
  if (!c) return null
  const app = getPlantilla(c.app)
  const nombreApp = t(`room.${c.app}.nombre`, app?.nombre ?? c.app).split(' · ')[0]

  const guardar = async () => {
    setOcupado(true)
    setError('')
    try {
      await importarContenido(m)
    } catch (e) {
      setError(mensajeErrorBuzon(e, t))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="mb-1 w-60 max-w-full rounded-xl border border-white/10 bg-black/20 p-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">
          <Icono emoji={c.emoji ?? app?.icon ?? '📦'} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{c.nombre}</p>
          <p className="truncate text-[10px] text-white/45">
            {c.resumen ? `${c.resumen} · ` : ''}
            {t('buzon.contenido.de', 'de {app}', { app: nombreApp })}
          </p>
        </div>
      </div>
      {m.blob && (
        <div className="mt-1.5 overflow-hidden rounded-lg border border-white/10">
          <VistaBlob blob={m.blob} ampliable className="max-h-40 w-full object-cover" />
        </div>
      )}
      {!m.mio && (
        <div className="mt-1.5">
          {m.guardadoEn ? (
            <button
              type="button"
              onClick={() => abrirContenido(c.app)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-black/20 px-2.5 py-1 text-[11px] text-white/70 transition hover:border-accent/50 hover:text-white"
            >
              <Icono nombre="confirmar" /> {t('buzon.contenido.guardado', 'Guardado · Abrir')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void guardar()}
              disabled={ocupado}
              className="rounded-lg bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
            >
              {ocupado ? t('buzon.enviando', 'Enviando…') : t('buzon.contenido.guardar', 'Guardar en {app}', { app: nombreApp })}
            </button>
          )}
          {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
        </div>
      )}
    </div>
  )
}
