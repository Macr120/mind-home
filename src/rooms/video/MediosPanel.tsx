import { useRef, useState } from 'react'
import type { MedioVideo } from '../../core/data/db'
import { mediosVideoRepo, VACIO } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { VistaBlob } from '../_shared/ImagenIA'
import { BotonBorrar, BotonPrimario, BotonSecundario, TARJETA, Vacio } from '../_shared/ui'
import type { MedioConId } from './clipsNuevos'
import { COLOR } from './constantes'
import { GrabarMedioModal, type TipoGrabacion } from './GrabarMedio'
import type { PropsArrastreItem } from './useArrastreMedio'

const seg = (n?: number) => (n && n > 0 ? `${Math.round(n)}s` : '')

/**
 * La biblioteca de medios (videos, imágenes y audios importados o generados).
 * Solo local: los binarios no sincronizan. Con `onElegir` funciona como
 * selector (modal desde el editor), filtrado por `tipos`.
 */
export function MediosPanel({
  onElegir,
  tipos,
  compacto = false,
  propsArrastre,
}: {
  onElegir?: (medio: MedioVideo) => void
  tipos?: MedioVideo['tipo'][]
  /** Dos columnas fijas y sin ancho máximo: la versión del panel lateral del editor. */
  compacto?: boolean
  /** Gesto de arrastre a la timeline (panel lateral); el toque sigue siendo `onElegir`. */
  propsArrastre?: (m: MedioConId) => PropsArrastreItem
}) {
  const t = useT()
  const todos = mediosVideoRepo.useAll() ?? VACIO
  // Los efectos importados a la carpeta «Sonidos» viven allí, no aquí.
  const medios = (tipos ? todos.filter((m) => tipos.includes(m.tipo)) : todos).filter((m) => !m.sonido)
  const [borrando, setBorrando] = useState<number | null>(null)
  const [importando, setImportando] = useState(false)
  const [grabando, setGrabando] = useState<TipoGrabacion | null>(null)
  const archivoRef = useRef<HTMLInputElement>(null)
  // Grabar con la cámara o el micrófono, según lo que admita este selector.
  const conDispositivos = typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
  const conCamara = conDispositivos && (!tipos || tipos.includes('video'))
  const conMicrofono = conDispositivos && (!tipos || tipos.includes('audio'))

  const acepta = (tipos ?? ['video', 'imagen', 'audio'])
    .map((x) => (x === 'imagen' ? 'image/*' : x === 'audio' ? 'audio/*' : 'video/*'))
    .join(',')

  const importar = async (archivo: File) => {
    setImportando(true)
    try {
      const { importarMedio } = await import('./importar')
      await importarMedio(archivo)
    } finally {
      setImportando(false)
    }
  }

  const borrar = async (medio: MedioVideo) => {
    setBorrando(null)
    const { borrarMedio } = await import('./importar')
    await borrarMedio(medio)
  }

  const botones = (
    <div className={compacto ? 'flex flex-wrap gap-1.5' : 'flex flex-wrap justify-end gap-2'}>
      <BotonPrimario
        type="button"
        pequeno
        app={COLOR}
        disabled={importando}
        onClick={() => archivoRef.current?.click()}
        className={compacto ? 'w-full' : undefined}
      >
        <Icono nombre="agregar" /> {t('video.medios.importar', 'Importar')}
      </BotonPrimario>
      {conCamara && (
        <BotonSecundario pequeno onClick={() => setGrabando('camara')} className={compacto ? 'flex-1' : undefined}>
          <Icono nombre="foto" /> {t('video.medios.camaraBoton', 'Cámara')}
        </BotonSecundario>
      )}
      {conMicrofono && (
        <BotonSecundario pequeno onClick={() => setGrabando('microfono')} className={compacto ? 'flex-1' : undefined}>
          <Icono nombre="microfono" /> {t('video.medios.microfonoBoton', 'Micrófono')}
        </BotonSecundario>
      )}
    </div>
  )

  return (
    <div className={compacto ? 'space-y-3' : 'mx-auto w-full max-w-3xl space-y-3'}>
      {botones}
      {medios.length === 0 ? (
        <Vacio
          icono="pelicula"
          titulo={t('video.medios.vacio', 'Aún no hay medios')}
          sub={t('video.medios.vacioSub', 'Importa videos, imágenes y audios de tu dispositivo, o graba con la cámara o el micrófono (se guardan solo aquí).')}
        />
      ) : (
        <>
          <ul className={`grid grid-cols-2 gap-3 ${compacto ? '' : 'sm:grid-cols-3'}`}>
            {medios.map((m) => (
              <li
                key={m.id}
                className={`${TARJETA} space-y-1.5 p-2${propsArrastre ? ' select-none [-webkit-touch-callout:none]' : ''}`}
                {...(propsArrastre && m.id != null ? propsArrastre(m as MedioConId) : undefined)}
              >
                <button
                  type="button"
                  onClick={() => onElegir?.(m)}
                  disabled={!onElegir}
                  aria-label={compacto ? t('video.medios.anadirCursor', 'Añadir «{n}» en el cursor', { n: m.nombre }) : undefined}
                  title={compacto ? m.nombre : undefined}
                  className={`block w-full overflow-hidden rounded-lg bg-black/40 ${onElegir ? 'transition hover:brightness-110' : 'cursor-default'}`}
                >
                  {m.miniatura ? (
                    <VistaBlob blob={m.miniatura} className="aspect-video w-full" />
                  ) : (
                    <span className="grid aspect-video w-full place-items-center text-2xl text-white/40">
                      <Icono nombre={m.tipo === 'audio' ? 'musica' : m.tipo === 'video' ? 'pelicula' : 'imagen'} />
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-1 px-1">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{m.nombre}</p>
                    <p className="text-[10px] text-white/40">
                      {m.tipo === 'video'
                        ? t('video.medios.video', 'Video')
                        : m.tipo === 'audio'
                          ? t('video.medios.audio', 'Audio')
                          : t('video.medios.imagen', 'Imagen')}{' '}
                      {seg(m.duracion)}
                    </p>
                  </div>
                  <span data-no-arrastre className="contents">
                    <BotonBorrar
                      confirmando={borrando === m.id}
                      onPedir={() => setBorrando(m.id ?? null)}
                      onConfirmar={() => void borrar(m)}
                      onCancelar={() => setBorrando(null)}
                    />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <input
        ref={archivoRef}
        type="file"
        accept={acepta}
        hidden
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) void importar(archivo)
          e.target.value = ''
        }}
      />
      {grabando && <GrabarMedioModal tipo={grabando} onCerrar={() => setGrabando(null)} />}
    </div>
  )
}
