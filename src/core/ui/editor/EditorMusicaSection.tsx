import { useEffect, useRef, useState } from 'react'
import type { PistaMusica } from '../../data/db'
import { pistasMusicaRepo } from '../../data/repository'
import { useAjustes, type FuenteMusica } from '../../state/ajustesStore'
import { MOODS_LISTA } from '../../audio/temas'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { VisualizadorMusica } from '../VisualizadorMusica'
import { desbloquearAudio } from '../../audio/motor'
import { detenerPista, iniciarPista } from '../../audio/pistas'
import {
  alCambiarSistema,
  analizadorSistema,
  conectarSistema,
  desconectarSistema,
  sistemaConectado,
} from '../../audio/sistema'

const MAX_MB = 25

/**
 * Sección de Configuraciones: la música de la casa y del Wrapped. Ambiental
 * encendible, fuente (generada con Web Audio o pistas propias), mood, volumen
 * maestro y la biblioteca de pistas subidas (Blob en la base local).
 */
export function EditorMusicaSection({
  embed,
  sinTitulo,
}: { embed?: boolean; sinTitulo?: boolean } = {}) {
  const t = useT()
  const musicaAmbiental = useAjustes((s) => s.musicaAmbiental)
  const setMusicaAmbiental = useAjustes((s) => s.setMusicaAmbiental)
  const musicaFuente = useAjustes((s) => s.musicaFuente)
  const setMusicaFuente = useAjustes((s) => s.setMusicaFuente)
  const musicaMood = useAjustes((s) => s.musicaMood)
  const setMusicaMood = useAjustes((s) => s.setMusicaMood)
  const musicaVolumen = useAjustes((s) => s.musicaVolumen)
  const setMusicaVolumen = useAjustes((s) => s.setMusicaVolumen)
  const musicaPistaId = useAjustes((s) => s.musicaPistaId)
  const setMusicaPistaId = useAjustes((s) => s.setMusicaPistaId)
  const sfxVolumen = useAjustes((s) => s.sfxVolumen)
  const setSfxVolumen = useAjustes((s) => s.setSfxVolumen)
  const hudMusica = useAjustes((s) => s.hudMusica)
  const setHudMusica = useAjustes((s) => s.setHudMusica)
  const pistas = pistasMusicaRepo.useAll()
  const inputRef = useRef<HTMLInputElement>(null)
  const [sonando, setSonando] = useState<number | null>(null)
  const [editando, setEditando] = useState<{ id: number; texto: string } | null>(null)
  const [aviso, setAviso] = useState('')
  const [avisoSistema, setAvisoSistema] = useState('')
  // Re-render al conectar/desconectar la captura del sistema (estado de módulo).
  const [, setTicSistema] = useState(0)
  useEffect(() => alCambiarSistema(() => setTicSistema((n) => n + 1)), [])

  const moods = MOODS_LISTA.map((m) => ({
    id: m.id,
    label: t(`ajustes.musica.mood.${m.id}`, m.defecto),
  }))
  const fuentes: { id: FuenteMusica; label: string }[] = [
    { id: 'generada', label: t('ajustes.musica.fuente.generada', 'Generada') },
    { id: 'pistas', label: t('ajustes.musica.fuente.pistas', 'Mis pistas') },
    { id: 'sistema', label: t('ajustes.musica.fuente.sistema', 'Sistema') },
  ]

  const conectar = async () => {
    desbloquearAudio()
    const r = await conectarSistema()
    setAvisoSistema(
      r === 'sin-audio'
        ? t(
            'ajustes.musica.sistema.sinAudio',
            'Se compartió sin audio: marca la casilla «Compartir audio» al elegir la pantalla o pestaña.',
          )
        : '',
    )
  }

  const subir = async (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      setAviso(t('ajustes.musica.grande', 'Archivo muy grande (máx. {n} MB).', { n: MAX_MB }))
      return
    }
    setAviso('')
    await pistasMusicaRepo.add({
      nombre: file.name.replace(/\.[^.]+$/, ''),
      blob: file,
      creadoEn: new Date().toISOString(),
    })
  }

  const preview = (p: PistaMusica) => {
    desbloquearAudio()
    if (sonando === p.id) {
      detenerPista()
      setSonando(null)
    } else {
      void iniciarPista(p)
      setSonando(p.id ?? null)
    }
  }

  const guardarNombre = async () => {
    if (editando && editando.texto.trim())
      await pistasMusicaRepo.update(editando.id, { nombre: editando.texto.trim() })
    setEditando(null)
  }

  const borrar = async (p: PistaMusica) => {
    if (p.id == null) return
    if (!window.confirm(t('ajustes.musica.borrarConfirma', '¿Borrar esta pista?'))) return
    if (sonando === p.id) {
      detenerPista()
      setSonando(null)
    }
    if (musicaPistaId === p.id) setMusicaPistaId(null)
    await pistasMusicaRepo.remove(p.id)
  }

  return (
    <div
      className={embed ? 'space-y-4' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-4'}
    >
      {!sinTitulo && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          <Icono nombre="musica" /> {t('ajustes.musica', 'Música')}
        </p>
      )}

      {/* Interruptor de la música ambiental */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setMusicaAmbiental(!musicaAmbiental)}
          className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs font-semibold transition ${
            musicaAmbiental
              ? 'ui-accent-bg border-transparent'
              : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
          }`}
        >
          <span className="shrink-0 text-[11px]">{musicaAmbiental ? '✓' : '○'}</span>
          <span className="min-w-0 flex-1 truncate">
            {t('ajustes.musica.ambiental', 'Música ambiental en la casa')}
          </span>
        </button>
        <p className="text-[11px] leading-snug text-white/45">
          {t(
            'ajustes.musica.ambientalDesc',
            'Suena mientras paseas por la casa; por el navegador, arranca con tu primer clic.',
          )}
        </p>
      </div>

      {/* Botón de música del HUD: apagado, la música se maneja solo desde aquí */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setHudMusica(!hudMusica)}
          className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs font-semibold transition ${
            hudMusica
              ? 'ui-accent-bg border-transparent'
              : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
          }`}
        >
          <span className="shrink-0 text-[11px]">{hudMusica ? '✓' : '○'}</span>
          <span className="min-w-0 flex-1 truncate">
            {t('ajustes.musica.hud', 'Mostrar en la pantalla principal')}
          </span>
        </button>
        <p className="text-[11px] leading-snug text-white/45">
          {t(
            'ajustes.musica.hudDesc',
            'Apagado, la casa queda más limpia: la música se ajusta desde aquí.',
          )}
        </p>
      </div>

      {/* Fuente */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.musica.fuente', 'Fuente')}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {fuentes.map((f) => {
            const activo = musicaFuente === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setMusicaFuente(f.id)}
                className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                  activo
                    ? 'ui-accent-bg border-transparent'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Audio del sistema: captura con getDisplayMedia + visualizador en vivo. */}
      {musicaFuente === 'sistema' && (
        <div className="space-y-1.5">
          {sistemaConectado() ? (
            <>
              <div className="rounded-md border border-white/10 bg-white/5 p-2">
                <VisualizadorMusica analizador={analizadorSistema()} />
              </div>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 text-[11px] leading-snug text-white/60">
                  <Icono nombre="musica" />{' '}
                  {t('ajustes.musica.sistema.activo', 'Escuchando el audio del sistema.')}
                </p>
                <button
                  type="button"
                  onClick={desconectarSistema}
                  className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
                >
                  {t('ajustes.musica.sistema.desconectar', 'Dejar de escuchar')}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void conectar()}
                className="ui-accent-bg w-full rounded-md px-2 py-1.5 text-xs font-semibold transition hover:brightness-110"
              >
                {t('ajustes.musica.sistema.conectar', 'Detectar audio del sistema')}
              </button>
              <p className="text-[11px] leading-snug text-white/45">
                {t(
                  'ajustes.musica.sistema.desc',
                  'El navegador pedirá compartir tu pantalla o una pestaña: marca «Compartir audio» y tu música (Spotify, YouTube…) aparecerá aquí en vivo. No puede leer el título de la canción, solo la señal.',
                )}
              </p>
            </>
          )}
          {avisoSistema && (
            <p className="text-[11px] leading-snug text-amber-300/80">{avisoSistema}</p>
          )}
        </div>
      )}

      {/* Mood de la música generada */}
      {musicaFuente === 'generada' && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
            {t('ajustes.musica.mood', 'Ambiente')}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {moods.map((m) => {
              const activo = musicaMood === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMusicaMood(m.id)}
                  className={`truncate rounded-md border px-1.5 py-1.5 text-[11px] font-semibold transition ${
                    activo
                      ? 'ui-accent-bg border-transparent'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] leading-snug text-white/45">
            {t(
              'ajustes.musica.moodCuartos',
              'Es el ambiente general. Cada cuarto puede tener su propio tema: cámbialo con el botón de música dentro del cuarto.',
            )}
          </p>
        </div>
      )}

      {/* Volumen maestro */}
      <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="flex-1 truncate text-xs text-white/75">
            {t('ajustes.musica.volumen', 'Volumen')}
          </span>
          <span className="text-[10px] tabular-nums text-white/40">
            {Math.round(musicaVolumen * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={musicaVolumen}
          onChange={(e) => setMusicaVolumen(parseFloat(e.target.value))}
          className="mt-1.5 w-full"
          style={{ accentColor: 'var(--ui-accent)' }}
        />
      </div>

      {/* Sonidos de acciones (blaster, portales, juegos…), aparte de la música */}
      <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="flex-1 truncate text-xs text-white/75">
            {t('ajustes.musica.sfx', 'Sonidos de acciones')}
          </span>
          <span className="text-[10px] tabular-nums text-white/40">
            {sfxVolumen === 0 ? t('ajustes.musica.sfxOff', 'Apagados') : `${Math.round(sfxVolumen * 100)}%`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={sfxVolumen}
          onChange={(e) => setSfxVolumen(parseFloat(e.target.value))}
          className="mt-1.5 w-full"
          style={{ accentColor: 'var(--ui-accent)' }}
        />
        <p className="mt-1 text-[11px] leading-snug text-white/45">
          {t(
            'ajustes.musica.sfxDesc',
            'Blaster, portales, fuegos, juegos y vehículos. Independiente del volumen de la música.',
          )}
        </p>
      </div>

      {/* Biblioteca de pistas del usuario */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
            {t('ajustes.musica.pistas', 'Mis pistas')}
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
          >
            + {t('ajustes.musica.subir', 'Subir pista')}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void subir(file)
              e.target.value = ''
            }}
          />
        </div>
        {aviso && <p className="text-[11px] leading-snug text-amber-300/80">{aviso}</p>}
        {(pistas ?? []).length === 0 ? (
          <p className="text-[11px] leading-snug text-white/45">
            {t('ajustes.musica.sinPistas', 'Aún no hay pistas. Sube tu propia música (mp3, ogg…).')}
          </p>
        ) : (
          <>
            {(pistas ?? []).map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5"
              >
                <button
                  type="button"
                  onClick={() => preview(p)}
                  title={
                    sonando === p.id
                      ? t('ajustes.musica.parar', 'Parar')
                      : t('ajustes.musica.reproducir', 'Reproducir')
                  }
                  className="shrink-0 rounded px-1 text-sm transition hover:bg-white/10"
                >
                  <Icono emoji={sonando === p.id ? '⏹️' : '▶️'} />
                </button>
                {editando && editando.id === p.id ? (
                  <input
                    autoFocus
                    value={editando.texto}
                    onChange={(e) => setEditando({ id: p.id!, texto: e.target.value })}
                    onBlur={() => void guardarNombre()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void guardarNombre()
                      if (e.key === 'Escape') setEditando(null)
                    }}
                    className="min-w-0 flex-1 rounded border border-white/15 bg-black/25 px-1.5 py-0.5 text-xs text-white/90 focus:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditando({ id: p.id!, texto: p.nombre })}
                    title={t('ajustes.musica.renombrar', 'Renombrar')}
                    className="min-w-0 flex-1 truncate text-left text-xs text-white/85"
                  >
                    {p.nombre}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMusicaPistaId(musicaPistaId === p.id ? null : (p.id ?? null))}
                  title={t('ajustes.musica.usar', 'Usar esta pista')}
                  className={`shrink-0 rounded px-1.5 text-sm transition hover:bg-white/10 ${
                    musicaPistaId === p.id ? 'text-accent' : 'text-white/35'
                  }`}
                >
                  {musicaPistaId === p.id ? '●' : '○'}
                </button>
                <button
                  type="button"
                  onClick={() => void borrar(p)}
                  title={t('ajustes.musica.borrar', 'Borrar')}
                  className="shrink-0 rounded px-1 text-xs text-white/40 transition hover:bg-white/10 hover:text-white/80"
                >
                  ✕
                </button>
              </div>
            ))}
            <p className="text-[11px] leading-snug text-white/45">
              {t('ajustes.musica.todas', 'Sin pista elegida (●), suenan todas en aleatorio.')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
