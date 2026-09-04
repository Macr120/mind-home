import { useEffect, useRef, useState } from 'react'
import type { GrabacionAudio } from '../../core/data/db'
import { grabacionesAudioRepo, proyectosAudioRepo, VACIO } from '../../core/data/repository'
import { descargarArchivo } from '../../core/descargarArchivo'
import { localeActual, useT } from '../../core/i18n/useT'
import { confirmar, pedirTexto } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { FILA_INTERACTIVA, TARJETA, Vacio } from '../_shared/ui'

const duracionCorta = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Biblioteca de tomas de micrófono: reproducir, renombrar, descargar y borrar. */
export function GrabacionesPanel() {
  const t = useT()
  const grabaciones = grabacionesAudioRepo.useAll() ?? VACIO
  const [sonando, setSonando] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef('')

  const parar = () => {
    audioRef.current?.pause()
    audioRef.current = null
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = ''
    setSonando(null)
  }
  useEffect(
    () => () => {
      audioRef.current?.pause()
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  const reproducir = (g: GrabacionAudio) => {
    if (sonando === g.id) return parar()
    parar()
    const url = URL.createObjectURL(g.blob)
    urlRef.current = url
    const el = new Audio(url)
    audioRef.current = el
    el.onended = parar
    void el.play()
    setSonando(g.id ?? null)
  }

  const renombrar = async (g: GrabacionAudio) => {
    const nombre = await pedirTexto({ titulo: t('audio.grab.renombrar', 'Renombrar grabación'), valor: g.nombre })
    if (nombre && g.id != null) await grabacionesAudioRepo.update(g.id, { nombre })
  }

  const descargar = async (g: GrabacionAudio) => {
    const ext = g.blob.type.includes('mp4') ? '.m4a' : g.blob.type.includes('ogg') ? '.ogg' : '.webm'
    await descargarArchivo(g.blob, `${g.nombre || 'toma'}${ext}`)
  }

  const borrar = async (g: GrabacionAudio) => {
    if (g.id == null) return
    // El clip embebido en un proyecto referencia esta fila: avisa cuántos quedarían mudos.
    const proyectos = await proyectosAudioRepo.list()
    const usos = proyectos.filter((p) =>
      p.pistas.some((x) => (x.clips ?? []).some((c) => c.grabacionId === g.id && c.sello === g.creadoEn)),
    ).length
    const si = await confirmar({
      titulo: t('audio.grab.borrar', 'Borrar la grabación'),
      mensaje:
        usos > 0
          ? t('audio.grab.borrarEnUso', 'Se usa en {n} proyecto(s): esos clips quedarán en silencio.', { n: usos })
          : t('audio.grab.borrarMsg', 'La toma se elimina de este dispositivo.'),
      peligro: true,
    })
    if (!si) return
    if (sonando === g.id) parar()
    await grabacionesAudioRepo.remove(g.id)
  }

  if (grabaciones.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Vacio
          icono="microfono"
          titulo={t('audio.grab.vacio', 'Aún no hay grabaciones')}
          sub={t('audio.grab.vacioSub', 'Crea una pista de audio en un proyecto y graba tu voz o tu instrumento encima de las demás pistas.')}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ul className="space-y-2">
        {grabaciones.map((g) => (
          <li key={g.id} className={`${TARJETA} ${FILA_INTERACTIVA} flex items-center gap-2 p-3`}>
            <button
              type="button"
              onClick={() => reproducir(g)}
              aria-label={sonando === g.id ? t('audio.grab.pausar', 'Pausar') : t('audio.grab.escuchar', 'Escuchar')}
              title={sonando === g.id ? t('audio.grab.pausar', 'Pausar') : t('audio.grab.escuchar', 'Escuchar')}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
            >
              <Icono nombre={sonando === g.id ? 'pausa' : 'play'} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{g.nombre}</p>
              <p className="text-xs text-white/45">
                {duracionCorta(g.duracionSeg)} ·{' '}
                {new Date(g.creadoEn).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void renombrar(g)}
              aria-label={t('audio.grab.renombrar', 'Renombrar grabación')}
              title={t('audio.grab.renombrar', 'Renombrar grabación')}
              className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
            >
              <Icono nombre="editar" />
            </button>
            <button
              type="button"
              onClick={() => void descargar(g)}
              aria-label={t('audio.grab.descargar', 'Descargar')}
              title={t('audio.grab.descargar', 'Descargar')}
              className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
            >
              <Icono nombre="descargar" />
            </button>
            <button
              type="button"
              onClick={() => void borrar(g)}
              aria-label={t('audio.grab.borrar', 'Borrar la grabación')}
              title={t('audio.grab.borrar', 'Borrar la grabación')}
              className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-red-400"
            >
              <Icono nombre="basura" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
