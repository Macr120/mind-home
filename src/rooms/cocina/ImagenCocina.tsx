import { useRef, useState } from 'react'
import { comprimirImagen, generarImagen, imagenIaActiva } from '../../core/imagenIA'
import { Portada } from './Portada'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { Creditos } from '../../core/ui/Creditos'
import { OP_PORTADA } from './costosIA'

/**
 * Portada de una receta o dieta: se sube desde el disco o se genera con IA a
 * partir de `prompt`. El Blob se guarda tal cual en su tabla (campo `foto`) vía
 * `onCambiar`, así que el mismo componente sirve para las dos.
 */
export function ImagenCocina({
  foto,
  url,
  prompt,
  emoji,
  nombre,
  onCambiar,
}: {
  foto?: Blob
  /** Foto preguardada del repo, para los ejemplos que la traen. */
  url?: string | null
  /** Descripción para la IA; sin ella solo se puede subir a mano. */
  prompt?: string
  /** Con emoji y nombre, sin foto se pinta la portada de respaldo (la misma que en la lista). */
  emoji?: string
  nombre?: string
  onCambiar: (foto: Blob | undefined) => Promise<void>
}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')

  const subir = async (archivos: FileList | null) => {
    const archivo = archivos?.[0]
    if (!archivo) return
    setError('')
    await onCambiar(await comprimirImagen(archivo, 1024))
    if (inputRef.current) inputRef.current.value = ''
  }

  const generar = async () => {
    if (generando || !prompt) return
    setError('')
    setGenerando(true)
    try {
      await onCambiar(await generarImagen(prompt, 1024))
    } catch (e) {
      console.warn('[MPH] No se pudo generar la imagen:', e)
      setError(e instanceof Error ? e.message : t('cocina.img.error', 'No se pudo generar la imagen.'))
    } finally {
      setGenerando(false)
    }
  }

  // La clave vive en el chat: se relee en cada render por si se configuró mientras tanto.
  const puedeGenerar = !!prompt && imagenIaActiva()

  return (
    <div className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
        {generando ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/50">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
            <span className="text-xs">{t('cocina.img.generando', 'Generando imagen…')}</span>
          </div>
        ) : foto || url || emoji ? (
          <Portada
            foto={foto}
            url={url}
            emoji={emoji ?? ''}
            nombre={nombre ?? ''}
            className="h-full w-full"
            tamEmoji="text-6xl"
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-white/30 hover:bg-white/5"
          >
            <span className="text-2xl">
              <Icono nombre="foto" />
            </span>
            <span className="text-xs">{t('cocina.img.vacia', 'Sin imagen')}</span>
          </button>
        )}
      </div>

      {/* Las dos vías, siempre visibles: sin clave el botón de IA se ve deshabilitado
          y explica cómo activarlo (si se ocultara, nadie sabría que existe). */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={generar}
          disabled={!puedeGenerar || generando}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold texto-cta transition hover:brightness-110 disabled:opacity-40"
        >
          <Icono nombre="brillo" />
          {foto ? t('cocina.img.regenerar', 'Generar otra') : t('cocina.img.generar', 'Generar con IA')}
        </button>
        <Creditos op={OP_PORTADA} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={generando}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10 disabled:opacity-40"
        >
          <Icono nombre="foto" /> {foto ? t('cocina.img.cambiar', 'Cambiar foto') : t('cocina.img.subir', 'Subir foto')}
        </button>
        {foto && !generando && (
          <button
            type="button"
            onClick={() => onCambiar(undefined)}
            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
          >
            {t('cocina.img.quitar', 'Quitar')}
          </button>
        )}
      </div>
      {!puedeGenerar && !generando && (
        <p className="text-[11px] text-white/40">
          {t('cocina.img.sinIa', 'Configura la IA en el chat para generar imágenes.')}
        </p>
      )}
      {error && <p className="text-[10px] text-red-300">{error}</p>}

      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => void subir(e.target.files)} />
    </div>
  )
}
