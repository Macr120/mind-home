import { useEffect, useRef, useState } from 'react'
import type { MediaArchivo } from '../../core/data/db'
import { mediaArchivoRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { buscarPortada } from './portadaMedia'
import { SubirPortada } from './PortadaTarjeta'

/** Respiro entre peticiones: Wikipedia y Open Library son públicas y gratuitas. */
const PAUSA_MS = 350

/**
 * Busca de una vez las carátulas que faltan en el archivo.
 *
 * Va de una en una a propósito: son APIs públicas sin clave, y una ráfaga de
 * doscientos títulos a la vez acaba en 429. Al terminar, lo que no apareció NO se
 * queda en silencio: se lista con sus dos salidas, volver a buscar o poner tú la
 * portada, porque en esas fuentes hay obras que sencillamente no están.
 */
export function BotonPortadasLote({ items }: { items: MediaArchivo[] }) {
  const t = useT()
  const [hechos, setHechos] = useState<number | null>(null)
  const [total, setTotal] = useState(0)
  const [encontradas, setEncontradas] = useState(0)
  /** Ids que quedaron sin portada tras el último lote (null = no se ha corrido). */
  const [fallidas, setFallidas] = useState<number[] | null>(null)
  const cancelar = useRef(false)

  const sinPortada = items.filter((x) => !x.portada && !x.portadaFoto && x.id != null)
  const corriendo = hechos != null

  // Si el componente se va (cambio de pestaña) el lote se detiene solo.
  useEffect(() => () => { cancelar.current = true }, [])

  const lanzar = async (lista: MediaArchivo[]) => {
    cancelar.current = false
    setEncontradas(0)
    setTotal(lista.length)
    setHechos(0)
    let n = 0
    const sinSuerte: number[] = []
    for (const item of lista) {
      if (cancelar.current) break
      let url: string | undefined
      try {
        url = await buscarPortada(item)
      } catch {
        // Vía caída o sin red: esta obra se queda sin portada y sigue el lote.
      }
      if (url) {
        await mediaArchivoRepo.update(item.id!, { portada: url })
        setEncontradas(++n)
      } else {
        sinSuerte.push(item.id!)
      }
      setHechos((v) => (v ?? 0) + 1)
      if (!cancelar.current) await new Promise((r) => setTimeout(r, PAUSA_MS))
    }
    setHechos(null)
    setFallidas(sinSuerte)
  }

  // Las que fallaron y siguen sin portada (si ya le pusiste una, sale de la lista).
  const pendientes = fallidas
    ? items.filter((x) => x.id != null && fallidas.includes(x.id) && !x.portada && !x.portadaFoto)
    : []

  if (corriendo) {
    return (
      <div className="flex items-center gap-2 text-xs text-white/50">
        <span>{t('entre.port.lote.progreso', 'Buscando portadas… {n}/{total}', { n: hechos, total })}</span>
        <button
          type="button"
          onClick={() => { cancelar.current = true }}
          className="rounded-lg bg-white/10 px-2 py-0.5 font-semibold hover:bg-white/20"
        >
          {t('entre.port.lote.cancelar', 'Detener')}
        </button>
      </div>
    )
  }

  if (sinPortada.length === 0 && pendientes.length === 0) return null

  return (
    <div className="space-y-2">
      {sinPortada.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void lanzar(sinPortada)}
            className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20"
          >
            <Icono nombre="lupa" />{' '}
            {t('entre.port.lote.buscar', 'Buscar las {n} portadas que faltan', { n: sinPortada.length })}
          </button>
          {encontradas > 0 && (
            <span className="text-xs text-white/40">
              {t('entre.port.lote.listo', '{n} encontradas', { n: encontradas })}
            </span>
          )}
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
          <p className="text-xs font-semibold text-amber-200/90">
            <Icono nombre="alerta" />{' '}
            {pendientes.length === 1
              ? t('entre.port.falta.una', 'Una obra se quedó sin portada')
              : t('entre.port.falta.varias', '{n} obras se quedaron sin portada', { n: pendientes.length })}
          </p>
          <p className="text-[11px] leading-relaxed text-white/45">
            {t(
              'entre.port.falta.desc',
              'No aparecen en Wikipedia ni en Open Library con ese título. Puedes volver a intentarlo o poner tú la carátula correcta.',
            )}
          </p>
          <ul className="space-y-1">
            {pendientes.map((x) => (
              <li key={x.id} className="flex items-center gap-2 text-xs">
                <span className="min-w-0 flex-1 truncate text-white/70">{x.titulo}</span>
                <SubirPortada
                  item={x}
                  className="shrink-0 rounded-lg bg-white/10 px-2 py-0.5 font-semibold text-white/70 hover:bg-white/20"
                />
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void lanzar(pendientes)}
              className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20"
            >
              <Icono nombre="restaurar" /> {t('entre.port.falta.reintentar', 'Seguir buscando')}
            </button>
            <button
              type="button"
              onClick={() => setFallidas(null)}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-white/40 hover:bg-white/5"
            >
              {t('entre.port.falta.dejarlo', 'Dejarlo así')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
