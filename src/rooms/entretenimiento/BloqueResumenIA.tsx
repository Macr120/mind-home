import { useState } from 'react'
import type { MediaArchivo } from '../../core/data/db'
import { mediaArchivoRepo } from '../../core/data/repository'
import { iaActiva } from '../../core/chat/ia'
import { COLOR } from './constantes'
import { buscarPortada } from './portadaMedia'
import { generarResumenMedia } from './resumenIA'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'
import { Creditos } from '../../core/ui/Creditos'
import { OP_RESUMEN } from './costosIA'

/**
 * Bloque de resumen con IA dentro de la tarjeta del archivo. Se guarda en la
 * propia entrada (`resumen`), así que solo se paga una vez por obra.
 */
export function BloqueResumenIA({ item }: { item: MediaArchivo }) {
  const t = useT()
  const [generando, setGenerando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')
  const resumen = item.resumen

  const generar = async () => {
    if (generando || !item.id) return
    setError('')
    setGenerando(true)
    try {
      const nuevo = await generarResumenMedia(item)
      await mediaArchivoRepo.update(item.id, { resumen: nuevo })
      setAbierto(true)
      // La IA devuelve el artículo de Wikipedia: se aprovecha para la carátula.
      if (!item.portada) {
        const portada = await buscarPortada({ ...item, resumen: nuevo })
        if (portada) await mediaArchivoRepo.update(item.id, { portada })
      }
    } catch (e) {
      console.warn('[MPH] No se pudo resumir la obra:', e)
      setError(e instanceof Error ? e.message : t('entre.res.error', 'No se pudo generar el resumen.'))
    } finally {
      setGenerando(false)
    }
  }

  const quitar = () => item.id && mediaArchivoRepo.update(item.id, { resumen: undefined })

  // Sin resumen y sin IA configurada no se anuncia nada: la tarjeta se queda limpia.
  if (!resumen && !iaActiva()) return null

  if (generando) {
    return (
      <p className="mt-3 flex items-center gap-2 text-xs text-white/50">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
        {t('entre.res.generando', 'Resumiendo la obra…')}
      </p>
    )
  }

  if (!resumen) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={generar}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10"
        >
          <Icono nombre="brillo" /> {t('entre.res.generar', 'Resumen con IA')}
          <Creditos op={OP_RESUMEN} />
        </button>
        {error && <p className="mt-1 text-[10px] text-red-300">{error}</p>}
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide texto-vivo" style={vivo(COLOR)}>
          <Icono nombre="brillo" /> {t('entre.res.titulo', 'Resumen IA')}
        </p>
        {resumen.sinSpoilers && (
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/55">
            {t('entre.res.sinSpoilers', 'sin spoilers')}
          </span>
        )}
      </div>

      {resumen.ficha && <p className="mt-1 text-[11px] text-white/45">{resumen.ficha}</p>}

      <p className={`mt-1.5 text-sm text-white/70 leading-relaxed ${abierto ? '' : 'line-clamp-3'}`}>
        {resumen.sinopsis}
      </p>

      {abierto && resumen.claves.length > 0 && (
        <ul className="mt-2 space-y-1">
          {resumen.claves.map((clave) => (
            <li key={clave} className="flex gap-1.5 text-xs text-white/60">
              <span className="texto-vivo" style={vivo(COLOR)}>
                •
              </span>
              {clave}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="text-xs font-semibold texto-vivo hover:underline"
          style={vivo(COLOR)}
        >
          {abierto ? t('entre.res.verMenos', 'Ver menos') : t('entre.res.verMas', 'Ver más')}
        </button>
        <button type="button" onClick={generar} className="text-xs text-white/35 hover:text-white/70">
          {t('entre.res.rehacer', 'Rehacer')}
        </button>
        <button type="button" onClick={quitar} className="text-xs text-white/35 hover:text-red-400">
          {t('entre.res.quitar', 'Quitar')}
        </button>
      </div>

      {error && <p className="mt-1 text-[10px] text-red-300">{error}</p>}
    </div>
  )
}
