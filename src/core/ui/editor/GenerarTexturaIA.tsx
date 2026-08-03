import { useRef, useState } from 'react'
import { imagenIaActiva } from '../../imagenIA'
import { generarTextura, type SuperficieTextura } from '../../texturaIA'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { Creditos } from '../Creditos'
import { OP_FONDO, OP_TEXTURA } from '../../cuenta/catalogoNucleo'
import { usePreviewBlob } from '../comun/usePreviewBlob'

/** Ideas de textura por superficie, para llenar el campo de un toque. */
const SUGERENCIAS: Record<SuperficieTextura, { clave: string; es: string }[]> = {
  piso: [
    { clave: 'maderaClara', es: 'madera clara' },
    { clave: 'marmol', es: 'mármol blanco' },
    { clave: 'azulejo', es: 'azulejo hidráulico' },
    { clave: 'pastoSeco', es: 'pasto seco' },
  ],
  muro: [
    { clave: 'ladrillo', es: 'ladrillo rojo' },
    { clave: 'concreto', es: 'concreto pulido' },
    { clave: 'tapiz', es: 'papel tapiz floral' },
    { clave: 'piedra', es: 'muro de piedra' },
  ],
  techo: [
    { clave: 'teja', es: 'teja de barro' },
    { clave: 'lamina', es: 'lámina metálica' },
    { clave: 'paja', es: 'techo de paja' },
    { clave: 'tablones', es: 'tablones de madera' },
  ],
  fondo: [
    { clave: 'atardecer', es: 'atardecer en la playa' },
    { clave: 'montanas', es: 'montañas nevadas' },
    { clave: 'ciudad', es: 'ciudad de noche' },
    { clave: 'campo', es: 'campo con nubes' },
  ],
}

/**
 * Bloque compartido del editor: describe la textura (y opcionalmente sube una
 * foto de referencia) y la IA la genera. El Blob resultante se entrega a la
 * superficie de turno, que lo guarda como si se hubiera subido a mano.
 */
export function GenerarTexturaIA({
  superficie,
  onGenerada,
}: {
  superficie: SuperficieTextura
  onGenerada: (blob: Blob) => void | Promise<void>
}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [abierto, setAbierto] = useState(false)
  const [descripcion, setDescripcion] = useState('')
  const [referencia, setReferencia] = useState<Blob | undefined>()
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')
  const refUrl = usePreviewBlob(referencia)

  // La clave vive en el chat: se relee en cada render por si se configuró mientras tanto.
  const hayIa = imagenIaActiva()
  const puedeGenerar = hayIa && !generando && (descripcion.trim().length > 0 || !!referencia)

  const generar = async () => {
    if (!puedeGenerar) return
    setError('')
    setGenerando(true)
    try {
      await onGenerada(await generarTextura(superficie, descripcion, referencia))
    } catch (e) {
      console.warn('[MPH] No se pudo generar la textura:', e)
      setError(
        e instanceof Error ? e.message : t('editor.texturaIA.error', 'No se pudo generar la textura.'),
      )
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="rounded-lg border border-violet-400/25 bg-violet-400/[0.06] p-2.5">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-400/80 transition hover:text-violet-400"
      >
        <Icono nombre="brillo" />
        <span className="flex-1 text-left">{t('editor.texturaIA.titulo', 'Crear con IA')}</span>
        <Creditos op={superficie === 'fondo' ? OP_FONDO : OP_TEXTURA} />
        <span className="text-[11px]">{abierto ? '▾' : '▸'}</span>
      </button>

      {abierto && (
        <div className="mt-2 space-y-2">
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={t('editor.texturaIA.placeholder', 'Describe la textura…')}
            className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-white/85 outline-none placeholder:text-white/25 focus:border-violet-400/50"
          />

          <div className="flex flex-wrap gap-1">
            {SUGERENCIAS[superficie].map((s) => (
              <button
                key={s.clave}
                type="button"
                onClick={() => setDescripcion(t(`editor.texturaIA.sug.${s.clave}`, s.es))}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/55 transition hover:bg-white/10 hover:text-white/80"
              >
                {t(`editor.texturaIA.sug.${s.clave}`, s.es)}
              </button>
            ))}
          </div>

          {/* Foto de referencia: la IA la convierte en textura en vez de partir de cero. */}
          {refUrl ? (
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 p-1.5">
              <img src={refUrl} alt="" className="h-10 w-10 rounded object-cover" draggable={false} />
              <span className="flex-1 text-[10px] leading-snug text-white/50">
                {t('editor.texturaIA.conFoto', 'La textura se creará a partir de esta foto.')}
              </span>
              <button
                type="button"
                onClick={() => setReferencia(undefined)}
                className="rounded-md border border-red-400/30 bg-red-400/10 px-2 py-1 text-[11px] font-bold text-red-400/80 transition hover:bg-red-400/20"
                title={t('editor.texturaIA.quitarFoto', 'Quitar la foto')}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-white/20 bg-white/5 py-2 text-[10px] text-white/50 transition hover:border-white/40 hover:text-white/70"
            >
              <Icono nombre="foto" />
              {t('editor.texturaIA.subirFoto', 'Usar una foto como base')}
            </button>
          )}

          <button
            type="button"
            onClick={() => void generar()}
            disabled={!puedeGenerar}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-violet-600 py-1.5 text-[11px] font-bold texto-cta transition hover:brightness-110 disabled:opacity-40"
          >
            {generando ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white/90" />
                {t('editor.texturaIA.generando', 'Generando…')}
              </>
            ) : (
              <>
                <Icono nombre="brillo" />
                {t('editor.texturaIA.generar', 'Generar textura')}
              </>
            )}
          </button>

          {!hayIa && (
            <p className="text-[10px] leading-snug text-white/40">
              {t('editor.texturaIA.sinIa', 'Configura la IA en el chat para generar texturas.')}
            </p>
          )}
          {error && <p className="text-[10px] leading-snug text-red-300">{error}</p>}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f?.type.startsWith('image/')) setReferencia(f)
              e.target.value = ''
            }}
          />
        </div>
      )}
    </div>
  )
}
