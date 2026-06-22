import { useEffect, useMemo, useState } from 'react'

/** Mapa de URLs temporales para blobs de pisos exteriores (clave col,row). */
export function useBlobUrlMap(
  items: { key: string; blob?: Blob; activa?: boolean }[],
): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(new Map())

  const firma = useMemo(
    () =>
      items
        .filter((i) => i.activa && i.blob)
        .map((i) => `${i.key}:${i.blob!.size}:${i.blob!.type}`)
        .join('|'),
    [items],
  )

  useEffect(() => {
    const next = new Map<string, string>()
    for (const i of items) {
      if (i.activa && i.blob) {
        next.set(i.key, URL.createObjectURL(i.blob))
      }
    }
    setUrls(next)
    return () => {
      next.forEach((u) => URL.revokeObjectURL(u))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- firma resume blobs activos
  }, [firma])

  return urls
}
