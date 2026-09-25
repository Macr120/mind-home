import { useEffect, useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { formatoBytes } from '../../core/cuenta/almacen'
import type { ArchivoNube } from '../../core/data/db'
import { BotonPeligro, BotonPrimario, BotonSecundario, Modal, Spinner } from '../_shared/ui'
import { COLOR, iconoDeMime } from './constantes'
import { mensajeDeError, urlDeVista } from './acciones'

/** Texto plano: se enseña hasta este tamaño (más, y mejor bajarlo). */
const MAX_TEXTO = 200_000

/**
 * Vista previa de un archivo de la nube. Imagen, video, audio y PDF se pintan
 * directo desde la URL firmada de R2 (el video y el audio van en streaming, sin
 * bajar el archivo entero); el texto se lee si es chico.
 */
export function Visor({
  archivo,
  onCerrar,
  onDescargar,
  onRenombrar,
  onMover,
  onBorrar,
}: {
  archivo: ArchivoNube
  onCerrar: () => void
  onDescargar: () => void
  onRenombrar: () => void
  onMover: () => void
  onBorrar: () => void
}) {
  const t = useT()
  const [url, setUrl] = useState<string | null>(null)
  const [texto, setTexto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { mime } = archivo
  const esTexto = mime.startsWith('text/') && archivo.bytes <= MAX_TEXTO

  useEffect(() => {
    let vivo = true
    urlDeVista(archivo)
      .then(async (u) => {
        if (!vivo) return
        setUrl(u)
        if (esTexto) {
          const r = await fetch(u)
          if (vivo) setTexto(await r.text())
        }
      })
      .catch((e) => vivo && setError(mensajeDeError(e)))
    return () => {
      vivo = false
    }
  }, [archivo, esTexto])

  let vista
  if (error) vista = <p className="text-sm text-red-400">{error}</p>
  else if (!url) vista = <Spinner etiqueta={t('archivos.cargando', 'Cargando…')} />
  else if (mime.startsWith('image/')) vista = <img src={url} alt={archivo.nombre} className="max-h-[60vh] w-full rounded-lg object-contain" />
  else if (mime.startsWith('video/')) vista = <video src={url} controls playsInline className="max-h-[60vh] w-full rounded-lg bg-black" />
  else if (mime.startsWith('audio/')) vista = <audio src={url} controls className="w-full" />
  else if (mime === 'application/pdf') vista = <iframe src={url} title={archivo.nombre} className="h-[60vh] w-full rounded-lg bg-white" />
  else if (esTexto && texto != null) vista = <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs">{texto}</pre>
  else if (esTexto) vista = <Spinner etiqueta={t('archivos.cargando', 'Cargando…')} />
  else
    vista = (
      <div className="space-y-2 py-6 text-center">
        <Icono nombre={iconoDeMime(mime)} className="text-5xl text-white/60" />
        <p className="text-sm text-white/50">{t('archivos.sinVista', 'Este tipo de archivo no tiene vista previa.')}</p>
      </div>
    )

  return (
    <Modal titulo={archivo.nombre} onCerrar={onCerrar} ancho="max-w-3xl">
      <div className="grid min-h-32 place-items-center">{vista}</div>
      <p className="text-xs text-white/45">
        {formatoBytes(archivo.bytes)} · {new Date(archivo.creadoEn).toLocaleString()}
      </p>
      <div className="flex flex-wrap gap-2">
        <BotonPrimario pequeno app={COLOR} onClick={onDescargar}>
          <Icono nombre="descargar" /> {t('archivos.descargar', 'Descargar')}
        </BotonPrimario>
        <BotonSecundario pequeno onClick={onRenombrar}>
          <Icono nombre="editar" /> {t('archivos.renombrar', 'Renombrar')}
        </BotonSecundario>
        <BotonSecundario pequeno onClick={onMover}>
          <Icono nombre="mover" /> {t('archivos.mover', 'Mover')}
        </BotonSecundario>
        <BotonPeligro pequeno onClick={onBorrar} className="ml-auto">
          <Icono nombre="basura" /> {t('archivos.borrar', 'Borrar')}
        </BotonPeligro>
      </div>
    </Modal>
  )
}
