import { useEffect, useState } from 'react'
import type { MedioVideo } from '../../core/data/db'

/**
 * Una object URL por medio con miniatura, para pintarla repetida de fondo en
 * los clips (`background-image`). Se crean y revocan por firma de ids y de si
 * hay miniatura (no cambia sin cambiar de id, salvo la toma de la app, que la
 * recibe después de entrar en la timeline); patrón `usePreviewBlob`.
 */
export function useMiniaturas(medios: MedioVideo[]): (medioId: number) => string | undefined {
  const [urls, setUrls] = useState<Map<number, string>>(() => new Map())
  const firma = medios.map((m) => (m.miniatura ? m.id : `${m.id}-`)).join(',')
  useEffect(() => {
    const mapa = new Map<number, string>()
    for (const m of medios) if (m.id != null && m.miniatura) mapa.set(m.id, URL.createObjectURL(m.miniatura))
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ligado al ciclo crear/revocar de las object URLs (ver doc del hook)
    setUrls(mapa)
    return () => {
      for (const u of mapa.values()) URL.revokeObjectURL(u)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- por firma de ids, no por identidad del arreglo
  }, [firma])
  return (medioId) => urls.get(medioId)
}
