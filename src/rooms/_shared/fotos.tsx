import { useEffect, useMemo } from 'react'

async function redimensionar(archivo: Blob, ladoMax: number, calidad: number): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(archivo)
    const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? archivo), 'image/jpeg', calidad))
  } catch {
    return archivo // formato no soportado por canvas: se guarda tal cual
  }
}

/** Redimensiona una imagen a máx 1280px y la regresa como JPEG (ahorra IndexedDB). */
export function comprimirFoto(archivo: File): Promise<Blob> {
  return redimensionar(archivo, 1280, 0.85)
}

/**
 * Miniatura ~200px para rejillas: pintar el JPEG completo de 1280px en un
 * cuadro de 96px multiplica la RAM por nada. Se guarda junto a la foto.
 */
export function miniaturaFoto(foto: Blob): Promise<Blob> {
  return redimensionar(foto, 200, 0.7)
}

/** Imagen desde un Blob con su object URL bien liberado. */
export function Foto({
  blob,
  className,
  onClick,
}: {
  blob: Blob
  className?: string
  onClick?: () => void
}) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return <img src={url} alt="" className={className} onClick={onClick} />
}
