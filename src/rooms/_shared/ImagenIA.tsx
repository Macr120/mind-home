import { useEffect, useRef, useState } from 'react'
import { comprimirImagen, generarImagen, imagenIaActiva, type AspectoImagen } from '../../core/imagenIA'
import { opImagen, CREDITOS } from '../../core/cuenta/costos'
import { Creditos } from '../../core/ui/Creditos'
import { useAjustes } from '../../core/state/ajustesStore'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { VisorImagen } from '../../core/ui/VisorImagen'

/** Imagen desde un Blob. La URL nace y muere en el mismo efecto: así sobrevive
 * al doble montaje de StrictMode (un useMemo la reutilizaría ya revocada).
 * Con `ampliable` se abre a pantalla completa (y se puede descargar) al tocarla. */
export function VistaBlob({
  blob,
  className = '',
  ampliable = false,
}: {
  blob: Blob
  className?: string
  ampliable?: boolean
}) {
  const t = useT()
  const [url, setUrl] = useState<string>()
  const [ampliada, setAmpliada] = useState(false)
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la URL debe nacer en el efecto para sobrevivir el remount de StrictMode
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  if (!url) return null
  const img = <img src={url} alt="" className={`object-cover ${className}`} />
  if (!ampliable) return img
  return (
    <>
      <button
        type="button"
        onClick={() => setAmpliada(true)}
        aria-label={t('visor.ampliar', 'Ver la imagen en grande')}
        className="block w-full cursor-zoom-in transition hover:brightness-110"
      >
        {img}
      </button>
      {ampliada && <VisorImagen url={url} tipo={blob.type} onCerrar={() => setAmpliada(false)} />}
    </>
  )
}

/**
 * Bloque de imagen con IA compartido entre cuartos: vista previa desde un Blob,
 * generar con IA (enseña el costo en créditos), subir del disco y quitar. El
 * guardado lo decide el dueño vía `onCambiar` (repo o estado local del form).
 */
export function ImagenIA({
  imagen,
  prompt,
  aspecto = '16:9',
  max = 1024,
  claseMarco = 'aspect-video w-full',
  onCambiar,
}: {
  imagen?: Blob
  /** Descripción para la IA; sin ella solo se puede subir a mano. */
  prompt?: string
  aspecto?: AspectoImagen
  /** px del lado mayor al comprimir. */
  max?: number
  /** Clase del marco de la vista previa (proporción/tamaño). */
  claseMarco?: string
  onCambiar: (imagen: Blob | undefined) => void | Promise<void>
}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')
  // El precio depende de la calidad elegida en Configuraciones.
  const calidadImagen = useAjustes((s) => s.calidadImagen)

  const subir = async (archivos: FileList | null) => {
    const archivo = archivos?.[0]
    if (!archivo) return
    setError('')
    await onCambiar(await comprimirImagen(archivo, max))
    if (inputRef.current) inputRef.current.value = ''
  }

  const generar = async () => {
    if (generando || !prompt) return
    setError('')
    setGenerando(true)
    try {
      await onCambiar(await generarImagen(prompt, max, undefined, aspecto))
    } catch (e) {
      console.warn('[MPH] No se pudo generar la imagen:', e)
      setError(e instanceof Error ? e.message : t('imagenIA.error', 'No se pudo generar la imagen.'))
    } finally {
      setGenerando(false)
    }
  }

  // La clave vive en el chat: se relee en cada render por si se configuró mientras tanto.
  const puedeGenerar = !!prompt && imagenIaActiva()

  return (
    <div className="space-y-2">
      {(imagen || generando) && (
        <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-black/30 ${claseMarco}`}>
          {generando ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/50">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
              <span className="text-xs">{t('imagenIA.generando', 'Generando imagen…')}</span>
            </div>
          ) : (
            imagen && <VistaBlob blob={imagen} ampliable className="h-full w-full" />
          )}
        </div>
      )}

      {/* Las dos vías, siempre visibles: sin IA el botón se ve deshabilitado y se
          explica cómo activarla (si se ocultara, nadie sabría que existe). */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void generar()}
          disabled={!puedeGenerar || generando}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/15 disabled:opacity-40"
        >
          <Icono nombre="brillo" />
          {imagen ? t('imagenIA.regenerar', 'Generar otra') : t('imagenIA.generar', 'Ilustrar con IA')}
        </button>
        <Creditos n={CREDITOS[opImagen(calidadImagen)]} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={generando}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10 disabled:opacity-40"
        >
          <Icono nombre="foto" />
          {imagen ? t('imagenIA.cambiar', 'Cambiar') : t('imagenIA.subir', 'Subir')}
        </button>
        {imagen && !generando && (
          <button
            type="button"
            onClick={() => void onCambiar(undefined)}
            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
          >
            {t('imagenIA.quitar', 'Quitar')}
          </button>
        )}
      </div>
      {!puedeGenerar && !generando && (
        <p className="text-[11px] text-white/40">
          {t('imagenIA.sinIa', 'Configura la IA en el chat para generar imágenes.')}
        </p>
      )}
      {error && <p className="text-[10px] text-red-300">{error}</p>}

      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => void subir(e.target.files)} />
    </div>
  )
}
