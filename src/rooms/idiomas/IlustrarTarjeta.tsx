import type { TarjetaIdioma } from '../../core/data/db'
import { tarjetasIdiomaRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { ImagenIA } from '../_shared/ImagenIA'
import { promptTarjeta } from './constantes'
import { hablar, hayTTS } from './tts'

/**
 * Ilustrar una tarjeta sin salir de donde estés. Es un modal y no un bloque en
 * la propia carta a propósito: `ImagenIA` trae dos botones, el contador de
 * créditos y un input de archivo, y eso dentro de la carta rompería el ritmo
 * del repaso. Mientras está abierto no se responde nada al SRS.
 */
export function IlustrarTarjeta({
  tarjeta,
  codigo,
  onCerrar,
}: {
  tarjeta: TarjetaIdioma
  /** BCP-47 del idioma: la imagen se acompaña de cómo suena el término. */
  codigo: string
  onCerrar: () => void
}) {
  const t = useT()

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        className="ui-panel max-h-[85vh] w-full max-w-sm space-y-3 overflow-y-auto rounded-2xl border border-white/10 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold">
            <Icono nombre="foto" /> {tarjeta.termino}
          </p>
          <button
            type="button"
            onClick={onCerrar}
            className="shrink-0 rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
            title={t('idiomas.ilustrar.cerrar', 'Cerrar')}
            aria-label={t('idiomas.ilustrar.cerrar', 'Cerrar')}
          >
            <Icono nombre="cerrar" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 text-xs text-white/45">{tarjeta.traduccion}</p>
          {hayTTS() && (
            <button
              type="button"
              onClick={() => hablar(tarjeta.termino, codigo)}
              className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-xs transition hover:bg-white/10"
              title={t('idiomas.voc.escuchar', 'Escuchar')}
              aria-label={t('idiomas.voc.escuchar', 'Escuchar')}
            >
              <Icono nombre="bocina" />
            </button>
          )}
        </div>

        <ImagenIA
          imagen={tarjeta.imagen}
          prompt={promptTarjeta(tarjeta.termino, tarjeta.traduccion)}
          aspecto="1:1"
          max={512}
          claseMarco="mx-auto aspect-square w-40"
          onCambiar={async (imagen) => {
            if (tarjeta.id != null) await tarjetasIdiomaRepo.update(tarjeta.id, { imagen })
          }}
        />

        <p className="text-center text-[10px] leading-relaxed text-white/35">
          {t('idiomas.ilustrar.nota2', 'Imagen y sonido juntos: la pista que ancla el significado cuando la tarjeta salga en los ejercicios.')}
        </p>
      </div>
    </div>
  )
}
