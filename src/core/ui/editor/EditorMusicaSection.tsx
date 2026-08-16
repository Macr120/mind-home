import { useEffect, useRef, useState } from 'react'
import type { PistaMusica } from '../../data/db'
import { borrarCarpetaPista, carpetasPistaRepo, pistasMusicaRepo } from '../../data/repository'
import { useAjustes, type FuenteMusica } from '../../state/ajustesStore'
import { confirmar, pedirTexto } from '../../state/confirmarStore'
import { MOODS_LISTA } from '../../audio/temas'
import { useT } from '../../i18n/useT'
import { useArrastre } from '../comun/arrastre'
import { Carpeta } from '../comun/Carpeta'
import { Icono } from '../iconos/Icono'
import { VisualizadorMusica } from '../VisualizadorMusica'
import { desbloquearAudio } from '../../audio/motor'
import { detenerPista, iniciarPista } from '../../audio/pistas'
import {
  alCambiarSistema,
  analizadorSistema,
  conectarSistema,
  desconectarSistema,
  origenSistema,
  sistemaConectado,
  type OrigenSistema,
} from '../../audio/sistema'
import {
  alCambiarCancion,
  hayMediaSesion,
  leerCancionSistema,
  pedirPermisoMediaSesion,
  permisoMediaSesion,
  type CancionSistema,
} from '../../audio/mediaSesion'

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
  const musicaCarpetaId = useAjustes((s) => s.musicaCarpetaId)
  const setMusicaCarpetaId = useAjustes((s) => s.setMusicaCarpetaId)
  const sfxVolumen = useAjustes((s) => s.sfxVolumen)
  const setSfxVolumen = useAjustes((s) => s.setSfxVolumen)
  const hudMusica = useAjustes((s) => s.hudMusica)
  const setHudMusica = useAjustes((s) => s.setHudMusica)
  const pistas = pistasMusicaRepo.useAll()
  const carpetas = carpetasPistaRepo.useAll()
  const inputRef = useRef<HTMLInputElement>(null)
  const [sonando, setSonando] = useState<number | null>(null)
  const [editando, setEditando] = useState<{ id: number; texto: string } | null>(null)
  const [renombrando, setRenombrando] = useState<{ carpetaId: string; texto: string } | null>(null)
  const [plegadas, setPlegadas] = useState<Set<string>>(new Set())
  const [aviso, setAviso] = useState('')
  const [avisoSistema, setAvisoSistema] = useState('')
  // Re-render al conectar/desconectar la captura del sistema (estado de módulo).
  const [, setTicSistema] = useState(0)
  useEffect(() => alCambiarSistema(() => setTicSistema((n) => n + 1)), [])
  const origen = origenSistema()

  // Canción que suena en el teléfono (solo Android, y solo con permiso).
  const [cancion, setCancion] = useState<CancionSistema | null>(null)
  const [permisoCancion, setPermisoCancion] = useState(false)
  useEffect(() => {
    if (musicaFuente !== 'sistema' || !hayMediaSesion()) return
    let vivo = true
    void permisoMediaSesion().then(async (ok) => {
      if (!vivo) return
      setPermisoCancion(ok)
      if (ok) setCancion(await leerCancionSistema())
    })
    const baja = alCambiarCancion((c) => vivo && setCancion(c))
    return () => {
      vivo = false
      baja()
    }
  }, [musicaFuente])

  const moods = MOODS_LISTA.map((m) => ({
    id: m.id,
    label: t(`ajustes.musica.mood.${m.id}`, m.defecto),
  }))
  const fuentes: { id: FuenteMusica; label: string }[] = [
    { id: 'generada', label: t('ajustes.musica.fuente.generada', 'Generada') },
    { id: 'pistas', label: t('ajustes.musica.fuente.pistas', 'Mis pistas') },
    { id: 'sistema', label: t('ajustes.musica.fuente.sistema', 'Sistema') },
  ]

  /** Qué compartió el usuario, en palabras. */
  const etiquetaSuperficie = (s: OrigenSistema['superficie']) =>
    s === 'browser'
      ? t('ajustes.musica.sistema.pestana', 'Pestaña')
      : s === 'window'
        ? t('ajustes.musica.sistema.ventana', 'Ventana')
        : s === 'monitor'
          ? t('ajustes.musica.sistema.pantalla', 'Pantalla completa')
          : t('ajustes.musica.sistema.activo', 'Escuchando el audio del sistema.')

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
    const ok = await confirmar({
      titulo: t('ajustes.musica.borrar', 'Borrar'),
      mensaje: t('ajustes.musica.borrarConfirma', '¿Borrar «{n}»?', { n: p.nombre }),
      textoOk: t('ajustes.musica.borrar', 'Borrar'),
      peligro: true,
    })
    if (!ok) return
    if (sonando === p.id) {
      detenerPista()
      setSonando(null)
    }
    if (musicaPistaId === p.id) setMusicaPistaId(null)
    await pistasMusicaRepo.remove(p.id)
  }

  // ----- Carpetas -----

  /** Carpetas por su `orden`, con la bandeja «Sin carpeta» siempre al final. */
  const listaCarpetas = [...(carpetas ?? [])].sort((a, b) => a.orden - b.orden)
  const pistasDe = (carpetaId: string | null) =>
    (pistas ?? []).filter((p) => (p.carpetaId ?? null) === carpetaId)
  const sueltas = pistasDe(null)

  const crearCarpeta = async () => {
    const nombre = await pedirTexto({
      titulo: t('ajustes.musica.carpetaNueva', 'Carpeta nueva'),
      mensaje: t('ajustes.musica.carpetaNombre', '¿Cómo se llama?'),
      valor: '',
    })
    if (!nombre?.trim()) return
    await carpetasPistaRepo.add({
      carpetaId: `cpi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      nombre: nombre.trim(),
      orden: listaCarpetas.length,
      creadoEn: new Date().toISOString(),
    })
  }

  const guardarNombreCarpeta = async () => {
    const r = renombrando
    setRenombrando(null)
    if (!r?.texto.trim()) return
    const fila = listaCarpetas.find((c) => c.carpetaId === r.carpetaId)
    if (fila?.id != null) await carpetasPistaRepo.update(fila.id, { nombre: r.texto.trim() })
  }

  const borrarCarpeta = async (carpetaId: string, nombre: string) => {
    const ok = await confirmar({
      titulo: t('ajustes.musica.carpetaBorrar', 'Borrar carpeta'),
      mensaje: t(
        'ajustes.musica.carpetaBorrarConfirma',
        '¿Borrar «{n}»? Sus pistas no se borran: quedan sueltas.',
        { n: nombre },
      ),
      textoOk: t('ajustes.musica.borrar', 'Borrar'),
      peligro: true,
    })
    if (!ok) return
    if (musicaCarpetaId === carpetaId) setMusicaCarpetaId(null)
    await borrarCarpetaPista(carpetaId)
  }

  /**
   * El gesto compartido de la casa: una pista en mano se suelta dentro de una
   * carpeta (la cadena vacía es la bandeja «Sin carpeta»). Soltarla donde ya
   * está no es destino: no cambia nada.
   */
  const arr = useArrastre<string>(
    (e, mano) => {
      const destino = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest('[data-carpeta-pista]')
        ?.getAttribute('data-carpeta-pista')
      if (destino == null) return null
      const p = (pistas ?? []).find((x) => String(x.id) === mano)
      return (p?.carpetaId ?? '') === destino ? null : destino
    },
    (mano, carpetaId) => void pistasMusicaRepo.update(Number(mano), { carpetaId: carpetaId || undefined }),
  )

  const alternarPlegada = (k: string) =>
    setPlegadas((prev) => {
      const n = new Set(prev)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  /** Una pista: reproducir, renombrar, marcarla como la única y borrarla. Se
      agarra la fila entera para llevarla a otra carpeta. */
  const filaPista = (p: PistaMusica) => (
    <div
      key={p.id}
      {...arr.props(String(p.id))}
      className={`flex cursor-grab items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 ${
        arr.enMano === String(p.id) ? 'opacity-40' : ''
      }`}
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
          className="min-w-0 flex-1 truncate text-start text-xs text-white/85"
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
  )

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
          className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-start text-xs font-semibold transition ${
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
          className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-start text-xs font-semibold transition ${
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
          {/* Qué suena. En Android lo dice el plugin nativo (artista y canción de
              verdad, y cambia sola); en el navegador, lo que se pueda sacar de
              la captura: qué compartiste y su título en ese momento. */}
          {cancion ? (
            <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-white/85">
                <Icono nombre="musica" />
                <span className="min-w-0 flex-1 truncate">{cancion.titulo}</span>
                {!cancion.sonando && (
                  <span className="shrink-0 text-[10px] font-normal text-white/40">
                    {t('ajustes.musica.sistema.pausa', 'en pausa')}
                  </span>
                )}
              </p>
              <p className="truncate text-[11px] text-white/45">
                {[cancion.artista, cancion.album].filter(Boolean).join(' · ') || cancion.app}
              </p>
              <p className="text-[10px] text-white/30">{cancion.app}</p>
            </div>
          ) : hayMediaSesion() && !permisoCancion ? (
            <>
              <button
                type="button"
                onClick={() => void pedirPermisoMediaSesion()}
                className="ui-accent-bg w-full rounded-md px-2 py-1.5 text-xs font-semibold transition hover:brightness-110"
              >
                {t('ajustes.musica.sistema.permiso', 'Permitir leer lo que suena')}
              </button>
              <p className="text-[11px] leading-snug text-white/45">
                {t(
                  'ajustes.musica.sistema.permisoDesc',
                  'Se abrirán los ajustes de Android: activa Mind Planner Home en «Acceso a notificaciones» y aquí aparecerá el artista y la canción que estés escuchando. No leemos ninguna notificación: Android exige ese permiso para dejar ver la reproducción.',
                )}
              </p>
            </>
          ) : null}

          {sistemaConectado() ? (
            <>
              <div className="rounded-md border border-white/10 bg-white/5 p-2">
                <VisualizadorMusica analizador={analizadorSistema()} />
              </div>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[11px] leading-snug text-white/60">
                  <Icono nombre="musica" />{' '}
                  {origen?.etiqueta
                    ? `${etiquetaSuperficie(origen.superficie)} · ${origen.etiqueta}`
                    : origen?.superficie
                      ? etiquetaSuperficie(origen.superficie)
                      : t('ajustes.musica.sistema.activo', 'Escuchando el audio del sistema.')}
                </p>
                <button
                  type="button"
                  onClick={desconectarSistema}
                  className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
                >
                  {t('ajustes.musica.sistema.desconectar', 'Dejar de escuchar')}
                </button>
              </div>
              {origen?.etiqueta && !cancion && (
                <p className="text-[11px] leading-snug text-white/35">
                  {t(
                    'ajustes.musica.sistema.tituloFijo',
                    'Es el nombre de lo que compartiste: no cambia al saltar de canción.',
                  )}
                </p>
              )}
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
                  'El navegador pedirá compartir tu pantalla o una pestaña: marca «Compartir audio» y tu música (Spotify, YouTube…) aparecerá aquí en vivo. Del título solo puede leer el nombre de lo que compartas.',
                )}
              </p>
            </>
          )}
          {avisoSistema && (
            <p className="text-[11px] leading-snug text-amber-300/80">{avisoSistema}</p>
          )}
        </div>
      )}

      {/* Biblioteca de pistas del usuario, en carpetas. Vive aquí —en el hueco
          contextual de la fuente, como Sistema y Generada— para que elegir
          «Mis pistas» enseñe justo eso: tus pistas. */}
      {musicaFuente === 'pistas' && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <p className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
              {t('ajustes.musica.pistas', 'Mis pistas')}
            </p>
            <button
              type="button"
              onClick={() => void crearCarpeta()}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
            >
              <Icono nombre="carpeta" /> {t('ajustes.musica.carpetaNueva', 'Carpeta nueva')}
            </button>
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
              {listaCarpetas.map((c) => (
                <div
                  key={c.carpetaId}
                  data-carpeta-pista={c.carpetaId}
                  className={arr.destino === c.carpetaId ? 'rounded-lg ring-1 ring-accent/70' : ''}
                >
                  <Carpeta
                    nivel={0}
                    titulo={c.nombre}
                    conteo={pistasDe(c.carpetaId).length}
                    abierta={!plegadas.has(c.carpetaId)}
                    onAlternar={() => alternarPlegada(c.carpetaId)}
                    insignia={
                      <span className="flex items-center gap-1">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation()
                            setMusicaCarpetaId(musicaCarpetaId === c.carpetaId ? null : c.carpetaId)
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && setMusicaCarpetaId(c.carpetaId)}
                          title={t('ajustes.musica.usarCarpeta', 'Sonar solo esta carpeta')}
                          className={`cursor-pointer rounded px-1 ${
                            musicaCarpetaId === c.carpetaId ? 'text-accent' : 'text-white/30'
                          }`}
                        >
                          {musicaCarpetaId === c.carpetaId ? '●' : '○'}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation()
                            setRenombrando({ carpetaId: c.carpetaId, texto: c.nombre })
                          }}
                          onKeyDown={(e) =>
                            e.key === 'Enter' && setRenombrando({ carpetaId: c.carpetaId, texto: c.nombre })
                          }
                          title={t('ajustes.musica.carpetaRenombrar', 'Renombrar carpeta')}
                          className="cursor-pointer rounded px-1 text-white/30 hover:text-white/70"
                        >
                          <Icono nombre="editar" />
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation()
                            void borrarCarpeta(c.carpetaId, c.nombre)
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && void borrarCarpeta(c.carpetaId, c.nombre)}
                          title={t('ajustes.musica.carpetaBorrar', 'Borrar carpeta')}
                          className="cursor-pointer rounded px-1 text-white/30 hover:text-red-300"
                        >
                          <Icono nombre="basura" />
                        </span>
                      </span>
                    }
                  >
                    {renombrando?.carpetaId === c.carpetaId ? (
                      <input
                        autoFocus
                        value={renombrando.texto}
                        onChange={(e) => setRenombrando({ carpetaId: c.carpetaId, texto: e.target.value })}
                        onBlur={() => void guardarNombreCarpeta()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void guardarNombreCarpeta()
                          if (e.key === 'Escape') setRenombrando(null)
                        }}
                        className="w-full rounded border border-white/15 bg-black/25 px-1.5 py-0.5 text-xs text-white/90 focus:outline-none"
                      />
                    ) : pistasDe(c.carpetaId).length === 0 ? (
                      <p className="px-1 py-1 text-[11px] text-white/35">
                        {t('ajustes.musica.carpetaVacia', 'Vacía: arrastra pistas aquí.')}
                      </p>
                    ) : (
                      pistasDe(c.carpetaId).map(filaPista)
                    )}
                  </Carpeta>
                </div>
              ))}

              {/* Pistas sin carpeta: también aceptan que sueltes una encima */}
              <div
                data-carpeta-pista=""
                className={`space-y-1.5 ${arr.destino === '' ? 'rounded-lg ring-1 ring-accent/70' : ''}`}
              >
                {listaCarpetas.length > 0 && sueltas.length > 0 && (
                  <p className="px-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-white/25">
                    {t('ajustes.musica.sinCarpeta', 'Sin carpeta')}
                  </p>
                )}
                {sueltas.map(filaPista)}
              </div>

              <p className="text-[11px] leading-snug text-white/45">
                {musicaCarpetaId
                  ? t('ajustes.musica.soloCarpeta', 'Suena solo la carpeta marcada (●), en aleatorio.')
                  : t('ajustes.musica.todas', 'Sin pista elegida (●), suenan todas en aleatorio.')}
              </p>
            </>
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

    </div>
  )
}
