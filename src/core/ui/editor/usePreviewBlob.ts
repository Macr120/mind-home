import { useEffect, useState } from 'react'

/** URL temporal para previsualizar un Blob en el editor. La URL se crea y revoca
 * dentro del mismo efecto: con useMemo, el remount de StrictMode reutilizaría
 * una URL ya revocada (imagen rota en desarrollo). */
export function usePreviewBlob(blob?: Blob | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ligado al ciclo crear/revocar del object URL (ver doc del hook)
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}
