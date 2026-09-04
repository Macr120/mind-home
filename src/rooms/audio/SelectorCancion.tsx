import { useRef, useState } from 'react'
import type { MusicaImportada, ProyectoAudio } from '../../core/data/db'
import { musicaImportadaRepo, proyectosAudioRepo, VACIO } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { confirmar } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonSecundario, Modal, Spinner } from '../_shared/ui'
import { Portada, proyectoDeSemilla } from './Albumes'
import { SEMILLAS_CANCIONES } from './canciones'
import { buscarItunes, descargarPreview, type ResultadoItunes } from './itunes'

const duracionCorta = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

const FILA = 'flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition hover:bg-white/10 active:bg-white/10'

/**
 * Modal del mezclador: elegir qué cargar en un plato — tu música importada
 * (mp3/m4a/wav…, biblioteca local), una preview de 30 s de iTunes, o una
 * canción del estudio (proyectos y semillas).
 */
export function SelectorCancion({
  onElegir,
  onElegirArchivo,
  onImportar,
  onCerrar,
}: {
  onElegir: (p: ProyectoAudio, titulo: string) => void
  /** Canción de la biblioteca o preview ya descargada (bpm si se conoce). */
  onElegirArchivo: (blob: Blob, titulo: string, bpm?: number) => void
  /** Archivo recién elegido del dispositivo (se detecta BPM y se guarda). */
  onImportar: (archivo: File) => void
  onCerrar: () => void
}) {
  const t = useT()
  const proyectos = proyectosAudioRepo.useAll() ?? VACIO
  const musica = musicaImportadaRepo.useAll() ?? VACIO
  const archivoRef = useRef<HTMLInputElement>(null)
  // Las lápidas de canciones de fábrica borradas no se ofrecen (pero bloquean su semilla).
  const visibles = proyectos.filter((p) => !p.oculto)
  const porCancion = new Map(proyectos.filter((p) => p.cancion).map((p) => [p.cancion!, p]))

  const borrarImportada = async (m: MusicaImportada) => {
    const si = await confirmar({
      titulo: t('audio.mezclar.borrarPista', 'Borrar de tu música'),
      mensaje: t('audio.mezclar.borrarPistaMsg', 'El archivo se elimina de este dispositivo.'),
      peligro: true,
    })
    if (si && m.id != null) await musicaImportadaRepo.remove(m.id)
  }

  const filaProyecto = (clave: string, p: ProyectoAudio, titulo: string) => (
    <li key={clave}>
      <button type="button" onClick={() => onElegir(p, titulo)} className={FILA}>
        <span className="w-12 shrink-0">
          <Portada proyecto={p} sonando={false} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{titulo}</span>
          <span className="block text-xs text-white/45">{t('audio.mezclar.bpm', '{bpm} BPM', { bpm: p.bpm })}</span>
        </span>
      </button>
    </li>
  )

  return (
    <Modal titulo={t('audio.mezclar.elegir', 'Elige una canción')} onCerrar={onCerrar}>
      <section className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-white/50">{t('audio.mezclar.tuMusica', 'Tu música')}</p>
          <BotonSecundario pequeno onClick={() => archivoRef.current?.click()}>
            <Icono nombre="descargar" /> {t('audio.mezclar.importar', 'Importar audio')}
          </BotonSecundario>
        </div>
        {musica.length === 0 ? (
          <p className="text-xs text-white/45">
            {t('audio.mezclar.sinMusica', 'Importa canciones de tu dispositivo (mp3, m4a, wav…) para mezclarlas.')}
          </p>
        ) : (
          <ul className="space-y-1">
            {musica.map((m) => (
              <li key={m.id} className="flex items-center gap-1">
                <button type="button" onClick={() => onElegirArchivo(m.blob, m.nombre, m.bpm)} className={FILA}>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white/10 text-lg text-white/60">
                    <Icono nombre="musica" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{m.nombre}</span>
                    <span className="block text-xs text-white/45">
                      {duracionCorta(m.duracionSeg)} · {t('audio.mezclar.bpm', '{bpm} BPM', { bpm: m.bpm })}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void borrarImportada(m)}
                  aria-label={t('audio.mezclar.borrarPista', 'Borrar de tu música')}
                  title={t('audio.mezclar.borrarPista', 'Borrar de tu música')}
                  className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-red-400"
                >
                  <Icono nombre="basura" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BuscadorItunes onElegirArchivo={onElegirArchivo} />

      <section className="space-y-1">
        <p className="text-xs font-semibold text-white/50">{t('audio.mezclar.delEstudio', 'Canciones del estudio')}</p>
        <ul className="space-y-1">
          {visibles.map((p) =>
            filaProyecto(
              `p-${p.id}`,
              p,
              p.cancion?.startsWith('sem-') ? t(`audio.cancion.${p.cancion.slice(4)}`, p.nombre) : p.nombre,
            ),
          )}
          {SEMILLAS_CANCIONES.filter((s) => !porCancion.has(s.id)).map((s) =>
            filaProyecto(s.id, proyectoDeSemilla(s), t(`audio.cancion.${s.id.slice(4)}`, s.tituloEs)),
          )}
        </ul>
      </section>

      <input
        ref={archivoRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac"
        hidden
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) onImportar(archivo)
          e.target.value = ''
        }}
      />
    </Modal>
  )
}

/** Buscador de previews de 30 s (proxy `itunes` del backend). */
function BuscadorItunes({ onElegirArchivo }: { onElegirArchivo: (blob: Blob, titulo: string, bpm?: number) => void }) {
  const t = useT()
  const [termino, setTermino] = useState('')
  const [resultados, setResultados] = useState<ResultadoItunes[] | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [bajando, setBajando] = useState<number | null>(null)

  const buscar = async () => {
    if (!termino.trim() || buscando) return
    setBuscando(true)
    try {
      setResultados(await buscarItunes(termino))
    } catch {
      await confirmar({
        titulo: t('audio.mezclar.errorBuscar', 'No se pudo buscar'),
        mensaje: t('audio.mezclar.errorMsg', 'Vuelve a intentarlo.'),
      })
    } finally {
      setBuscando(false)
    }
  }

  const elegir = async (r: ResultadoItunes) => {
    if (bajando != null) return
    setBajando(r.id)
    try {
      onElegirArchivo(await descargarPreview(r.previewUrl), `${r.nombre} — ${r.artista}`)
    } catch {
      setBajando(null)
      await confirmar({
        titulo: t('audio.mezclar.error', 'No se pudo cargar la canción'),
        mensaje: t('audio.mezclar.errorMsg', 'Vuelve a intentarlo.'),
      })
    }
  }

  return (
    <section className="space-y-1">
      <p className="text-xs font-semibold text-white/50">{t('audio.mezclar.buscarItunes', 'Buscar en iTunes')}</p>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void buscar()
        }}
      >
        <input
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder={t('audio.mezclar.buscarPh', 'Canción o artista…')}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm outline-none transition focus:border-accent/60"
        />
        <BotonSecundario pequeno type="submit" disabled={buscando || !termino.trim()}>
          {buscando ? <Spinner pequeno /> : t('audio.mezclar.buscar', 'Buscar')}
        </BotonSecundario>
      </form>
      <p className="text-[10px] text-white/35">
        {t('audio.mezclar.previews30', 'Muestras de 30 segundos del catálogo de Apple.')}
      </p>
      {resultados != null &&
        (resultados.length === 0 ? (
          <p className="text-xs text-white/45">{t('audio.mezclar.sinResultados', 'Sin resultados.')}</p>
        ) : (
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {resultados.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => void elegir(r)} className={FILA} disabled={bajando != null}>
                  {r.artworkUrl ? (
                    <img src={r.artworkUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg" />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white/10 text-lg text-white/60">
                      <Icono nombre="musica" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.nombre}</span>
                    <span className="block truncate text-xs text-white/45">{r.artista}</span>
                  </span>
                  {bajando === r.id && <Spinner pequeno />}
                </button>
              </li>
            ))}
          </ul>
        ))}
    </section>
  )
}
