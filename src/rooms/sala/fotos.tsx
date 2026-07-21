import { useEffect, useState } from 'react'

/** Redimensiona una imagen a máx 1280px y la regresa como JPEG (ahorra IndexedDB). */
export async function comprimirFoto(archivo: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(archivo)
    const escala = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return await new Promise((res) =>
      canvas.toBlob((b) => res(b ?? archivo), 'image/jpeg', 0.85),
    )
  } catch {
    return archivo // formato no soportado por canvas: se guarda tal cual
  }
}

/** Imagen desde un Blob con su object URL bien liberado. La URL se crea y
 * revoca dentro del mismo efecto: así sobrevive al doble montaje de StrictMode. */
export function Foto({ blob, className, onClick }: { blob: Blob; className?: string; onClick?: () => void }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la URL debe nacer en el efecto para sobrevivir el remount de StrictMode (ver doc del componente)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  if (!url) return null
  return <img src={url} alt="" className={className} onClick={onClick} />
}
