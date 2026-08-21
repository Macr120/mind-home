import { useT } from '../../core/i18n/useT'
import { useRef, useState } from 'react'
import type { ImagenEjercicio } from '../../core/data/db'
import { Icono } from '../../core/ui/iconos/Icono'
import {
  comprimirImagen,
  generarImagenEjercicio,
  guardarImagenEjercicio,
  imagenIaActiva,
  useUrlImagen,
} from './imagenIA'
import { urlImagenPreset } from './imagenesPreset'
import { descEjercicio, nombreEjercicio } from './nombres'
import { Creditos } from '../../core/ui/Creditos'
import { OP_IMAGEN_EJERCICIO } from './costosIA'
import { acento } from '../_shared/acento'
import { C_FLEX } from './constantes'

/**
 * Miniatura (imagen) de un ejercicio del catálogo. Al tocarla se abre un diálogo
 * que muestra el preview (si ya hay imagen) y deja elegir entre subir una foto o
 * generarla con IA. La imagen se guarda en IndexedDB por nombre normalizado, así
 * que el mismo ejercicio comparte imagen entre fuerza y flex. El `registro` lo
 * provee el catálogo (que se suscribe una sola vez).
 *
 * Sin registro propio se cae a la ilustración que la app trae de fábrica
 * (`imagenesPreset`); la del usuario siempre manda sobre ella.
 */
export function MiniaturaEjercicio({
  nombre,
  descripcion,
  registro,
  hoverBorde,
  tamano = 'md',
}: {
  nombre: string
  descripcion?: string
  registro?: ImagenEjercicio
  /** Clase de borde al pasar el cursor, para acompañar el acento del catálogo. */
  hoverBorde: string
  /** 'md' (48px, catálogo) o 'sm' (32px, listas compactas: rutinas y registro de sesión). */
  tamano?: 'sm' | 'md'
}) {
  const t = useT()
  const [abierto, setAbierto] = useState(false)
  const urlPropia = useUrlImagen(registro)
  const url = registro ? urlPropia : urlImagenPreset(nombre)

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title={url ? t('ejercicio.img.ver', 'Ver imagen') : t('ejercicio.img.anadir', 'Añadir imagen')}
        className={`flex items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/30 text-white/30 transition ${tamano === 'sm' ? 'h-8 w-8' : 'h-12 w-12'} ${hoverBorde}`}
      >
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icono nombre="foto" />
        )}
      </button>
      {abierto && (
        <DialogoImagen
          nombre={nombre}
          descripcion={descripcion}
          registro={registro}
          url={url}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </div>
  )
}

/**
 * Preview + las dos formas de poner imagen. No se cierra al terminar: así se ve
 * el resultado y se puede reintentar («generar otra») sin volver a abrirlo.
 */
function DialogoImagen({
  nombre,
  descripcion,
  registro,
  url,
  onCerrar,
}: {
  nombre: string
  descripcion?: string
  registro?: ImagenEjercicio
  url: string | null
  onCerrar: () => void
}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // La clave vive en el chat: se relee al abrir por si se configuró mientras tanto.
  const puedeGenerar = imagenIaActiva()

  const subir = async (archivos: FileList | null) => {
    const archivo = archivos?.[0]
    if (!archivo) return
    setError(null)
    await guardarImagenEjercicio(nombre, registro, await comprimirImagen(archivo))
    if (inputRef.current) inputRef.current.value = ''
  }

  const generar = async () => {
    if (generando) return
    setError(null)
    setGenerando(true)
    try {
      await guardarImagenEjercicio(nombre, registro, await generarImagenEjercicio(nombre, descripcion))
    } catch (e) {
      console.warn('[MPH] No se pudo generar la imagen:', e)
      setError(e instanceof Error ? e.message : 'Error al generar')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className="ui-panel ui-pop w-full max-w-md rounded-2xl border border-white/10 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-black">{nombreEjercicio(t, nombre)}</p>
            {descripcion && (
              <p className="truncate text-[11px] text-white/45">{descEjercicio(t, nombre, descripcion)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="ms-auto rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="cerrar" />
          </button>
        </header>

        <div className="mb-3 flex min-h-40 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30">
          {generando ? (
            <span className="flex flex-col items-center gap-2 py-8 text-xs text-white/45">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
              {t('ejercicio.img.generando', 'Generando…')}
            </span>
          ) : url ? (
            <img src={url} alt={nombreEjercicio(t, nombre)} className="max-h-[45vh] w-full object-contain" />
          ) : (
            <span className="py-10 text-3xl text-white/20">
              <Icono nombre="foto" />
            </span>
          )}
        </div>

        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        {!puedeGenerar && (
          <p className="mb-2 text-[11px] text-white/40">
            {t('ejercicio.img.sinIa', 'Configura la IA en el chat para generar imágenes.')}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={generar}
            disabled={!puedeGenerar || generando}
            className="ui-accent-bg flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold transition hover:brightness-110 disabled:opacity-40"
            style={acento(C_FLEX)}
          >
            <Icono nombre="brillo" />
            {url
              ? t('ejercicio.img.generarOtra', 'Generar otra')
              : t('ejercicio.img.generarUna', 'Generar con IA')}
          </button>
          <Creditos op={OP_IMAGEN_EJERCICIO} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={generando}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold transition hover:bg-white/10 disabled:opacity-40"
          >
            <Icono nombre="foto" />
            {t('ejercicio.img.subir', 'Subir foto')}
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void subir(e.target.files)}
        />
      </div>
    </div>
  )
}
