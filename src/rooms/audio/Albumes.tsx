import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { MOODS_LISTA } from '../../core/audio/temas'
import type { NotaAudio, PistaAudio, ProyectoAudio } from '../../core/data/db'
import type { MoodMusica } from '../../core/state/ajustesStore'
import { cancionesRepo, proyectosAudioRepo, VACIO } from '../../core/data/repository'
import { descargarArchivo } from '../../core/descargarArchivo'
import { useT } from '../../core/i18n/useT'
import { useArrastre, type PropsArrastre } from '../../core/ui/comun/arrastre'
import { confirmar, pedirTexto } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario, BotonSecundario, Modal, Spinner, TituloSeccion } from '../_shared/ui'
import { proyectoAmbiente } from './ambiente'
import { SEMILLAS_CANCIONES, type SemillaCancion } from './canciones'
import {
  COLOR,
  MAX_COMPASES,
  PALETA_PISTAS,
  PASOS_POR_COMPAS,
  nuevaPistaId,
  segPorPaso,
} from './constantes'
import type { CancionCompuesta } from './cancionIA'
import { CancionIAModal, type ResultadoCancion } from './CancionIAModal'
import { elegirVersionDescarga, renderizarMp3 } from './exportarWav'
import { conVersionProducida } from './lyria'
import { GrabacionesPanel } from './GrabacionesPanel'
import { analizarMidi } from './midiArchivo'
import * as motor from './motor'

/**
 * La pestaña Canciones, como un explorador plano: en la raíz están dos CARPETAS
 * FIJAS («Música ambiental»: los 21 vibes de la casa; «Canciones por aprender»:
 * el banco de semillas), los ÁLBUMES del usuario (tarjeta-collage con sus
 * portadas) y sus canciones SUELTAS (proyectos y .mid); entrar a un álbum
 * muestra sus canciones con volver/renombrar/disolver. Un vibe editado se
 * guarda como proyecto `vib-<mood>` y es el que suena en la casa (ambiente.ts);
 * «Restaurar original» lo borra.
 * Guardar una semilla prístina en un álbum la materializa; borrar una canción
 * de fábrica deja una fila-lápida (`oculto`) para que no reaparezca. Cada
 * tarjeta tiene cuatro botones: escuchar (suena AQUÍ, sin abrir el editor),
 * abrir, guardar en álbum y borrar.
 */

/** `data-album` de la tarjeta que aparece al arrastrar: soltar ahí crea un álbum. */
const NUEVO_ALBUM = '__nuevo__'

/** Canciones de fábrica: viven en sus carpetas fijas, no sueltas en la raíz. */
const esDeFabrica = (p: ProyectoAudio) => !!p.cancion && (p.cancion.startsWith('sem-') || p.cancion.startsWith('vib-'))

const duracionCorta = (bpm: number, compases: number) => {
  const s = compases * PASOS_POR_COMPAS * segPorPaso(bpm)
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

/** Recorta las notas al tope de compases del editor (los .mid pueden rebasarlo). */
const recortarNotas = (notas: NotaAudio[]): NotaAudio[] => {
  const tope = MAX_COMPASES * PASOS_POR_COMPAS
  return notas.filter((n) => n[0] < tope).map((n) => [n[0], Math.min(n[1], tope - n[0]), n[2], n[3]] as NotaAudio)
}

/** Las pistas estándar de una canción a dos manos (piano); `nombres` ya traducidos o defaults en español. */
const pistasDeManos = (
  der: NotaAudio[],
  izq: NotaAudio[],
  nombres?: { melodia: string; derecha: string; izquierda: string },
): PistaAudio[] => {
  const pistas: PistaAudio[] = [
    {
      pistaId: nuevaPistaId(),
      nombre: izq.length > 0 ? (nombres?.derecha ?? 'Derecha') : (nombres?.melodia ?? 'Melodía'),
      instrumento: 'piano',
      volumen: 0.9,
      notas: der,
    },
  ]
  if (izq.length > 0) {
    pistas.push({
      pistaId: nuevaPistaId(),
      nombre: nombres?.izquierda ?? 'Izquierda',
      instrumento: 'piano',
      volumen: 0.75,
      notas: izq,
    })
  }
  return pistas
}

/** Proyecto en memoria (sin fila) desde una semilla: para sonar sin materializarla. */
export const proyectoDeSemilla = (
  s: SemillaCancion,
  nombres?: { melodia: string; derecha: string; izquierda: string },
): ProyectoAudio => ({
  nombre: s.tituloEs,
  bpm: s.bpm,
  compases: s.compases,
  pistas: pistasDeManos(s.manoDer, s.manoIzq, nombres),
  creadoEn: '',
  actualizadoEn: '',
})

export function Albumes({ onAbrir }: { onAbrir: (id: number) => void }) {
  const t = useT()
  const proyectos = proyectosAudioRepo.useAll() ?? VACIO
  const [importando, setImportando] = useState(false)
  // La biblioteca de tomas de micrófono vive aquí como sección de apoyo (plegada).
  const [grabAbiertas, setGrabAbiertas] = useState(false)
  /** Álbum (carpeta) abierto; null = la raíz (álbumes + canciones sueltas). */
  const [albumActivo, setAlbumActivo] = useState<string | null>(null)
  /** Canción esperando destino en el modal «Guardar en álbum». */
  const [guardandoEn, setGuardandoEn] = useState<{ p?: ProyectoAudio; s?: SemillaCancion } | null>(null)
  const [cancionIA, setCancionIA] = useState(false)
  /** Carpeta fija abierta (los álbumes del usuario van por `albumActivo`). */
  const [especial, setEspecial] = useState<'ambiente' | 'aprender' | null>(null)
  const archivoRef = useRef<HTMLInputElement>(null)
  const estado = useSyncExternalStore(motor.transporteStore.subscribe, motor.transporteStore.getSnapshot)
  /** Clave del álbum que suena ('p-<id>' o el id de la semilla). */
  const [sonandoClave, setSonandoClave] = useState<string | null>(null)
  // El transporte manda: si paró (fin natural o stop), ningún álbum suena
  // (ajuste de estado EN el render, derivado del store del motor).
  if (estado === 'parado' && sonandoClave != null) setSonandoClave(null)
  // Al salir de la lista (cambiar de pestaña o abrir el editor) se suelta todo;
  // el editor arma su propia cadena al montar.
  useEffect(() => () => motor.liberar(), [])

  const nombresPistas = () => ({
    melodia: t('audio.aprender.melodia', 'Melodía'),
    derecha: t('audio.practica.derecha', 'Derecha'),
    izquierda: t('audio.practica.izquierda', 'Izquierda'),
  })
  const pistasDe = (der: NotaAudio[], izq: NotaAudio[]): PistaAudio[] => pistasDeManos(der, izq, nombresPistas())

  // Migración silenciosa: las canciones de la tabla vieja (importadas antes de
  // que fueran proyectos) se convierten en proyectos y la fila se retira.
  useEffect(() => {
    let vivo = true
    void (async () => {
      for (const c of await cancionesRepo.list()) {
        if (!vivo || c.id == null) break
        await proyectosAudioRepo.add({
          nombre: c.titulo,
          bpm: c.bpm,
          compases: Math.max(1, Math.min(MAX_COMPASES, c.compases)),
          cancion: `mid-${c.creadoEn}`,
          pistas: pistasDe(recortarNotas(c.manoDer), recortarNotas(c.manoIzq)),
          creadoEn: c.creadoEn,
          actualizadoEn: new Date().toISOString(),
        })
        await cancionesRepo.remove(c.id)
      }
    })()
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- migración de una sola pasada
  }, [])

  const porCancion = new Map(proyectos.filter((p) => p.cancion).map((p) => [p.cancion!, p]))
  /** Las lápidas de semillas borradas no se listan (pero sí bloquean su prístina). */
  const visibles = proyectos.filter((p) => !p.oculto)
  /** Los álbumes existen mientras alguna canción los lleve. */
  const albumes = [...new Set(visibles.map((p) => p.album).filter((a): a is string => !!a))].sort((a, b) =>
    a.localeCompare(b),
  )
  const porAlbum = new Map(albumes.map((a) => [a, visibles.filter((p) => p.album === a)]))
  /** Raíz: solo las sueltas (las guardadas en un álbum viven en su carpeta). */
  const enLista =
    albumActivo == null ? visibles.filter((p) => !p.album && !esDeFabrica(p)) : (porAlbum.get(albumActivo) ?? [])
  /**
   * «Canciones por aprender»: cada semilla con TODAS sus copias guardadas (una
   * compartida puede tener dos) fuera de álbumes; sin ninguna fila, la prístina.
   */
  const aprender = SEMILLAS_CANCIONES.flatMap((s): { s: SemillaCancion; fila?: ProyectoAudio }[] => {
    const filas = proyectos.filter((p) => p.cancion === s.id)
    if (!filas.length) return [{ s, fila: undefined }]
    return filas.filter((p) => !p.oculto && !p.album).map((fila) => ({ s, fila }))
  })
  /** «Música ambiental»: los 21 vibes; con fila = la versión editada que suena en la casa. */
  const ambiente = MOODS_LISTA.map((m) => ({ m, fila: porCancion.get(`vib-${m.id}`) }))
  const etiquetaVibe = (id: MoodMusica) => t(`ajustes.musica.mood.${id}`, MOODS_LISTA.find((m) => m.id === id)?.defecto ?? id)

  /** Las semillas materializadas se siguen mostrando con su título retraducible. */
  const tituloDe = (p: ProyectoAudio) =>
    p.cancion?.startsWith('sem-')
      ? t(`audio.cancion.${p.cancion.slice(4)}`, p.nombre)
      : p.cancion?.startsWith('vib-')
        ? etiquetaVibe(p.cancion.slice(4) as MoodMusica)
        : p.nombre

  // ─── Escuchar sin abrir el editor ────────────────────────────────────────
  const alternarPlay = async (clave: string, p: ProyectoAudio) => {
    if (sonandoClave === clave) {
      motor.detener()
      return
    }
    motor.detener()
    motor.fijarProyecto(p)
    await motor.prepararClips() // los álbumes con tomas de mic también suenan completos
    motor.reproducir({})
    setSonandoClave(clave)
  }

  /** Descarga la canción como MP3 (la misma mezcla que el botón WAV del editor, con las tomas de audio). */
  const [descargando, setDescargando] = useState<string | null>(null)
  const descargar = async (clave: string, p: ProyectoAudio) => {
    if (descargando) return
    const version = await elegirVersionDescarga(p)
    if (!version) return
    setDescargando(clave)
    try {
      motor.detener()
      motor.fijarProyecto(p)
      await motor.prepararClips()
      const blob = await renderizarMp3(version, motor.buffersDeClips())
      await descargarArchivo(blob, `${p.nombre || t('archivo.nombre.proyecto', 'proyecto')}.mp3`)
    } finally {
      setDescargando(null)
    }
  }

  const proyectoEfimero = (s: SemillaCancion): ProyectoAudio => proyectoDeSemilla(s, nombresPistas())

  // ─── Abrir / crear / borrar ──────────────────────────────────────────────
  const abrir = (id: number) => {
    motor.detener()
    onAbrir(id)
  }

  const crear = async () => {
    const nombre = await pedirTexto({
      titulo: t('audio.lista.nuevo', 'Nuevo proyecto'),
      mensaje: t('audio.lista.nuevoMsg', 'Nombre del proyecto'),
    })
    if (!nombre) return
    const ahora = new Date().toISOString()
    const id = await proyectosAudioRepo.add({
      nombre,
      bpm: 100,
      compases: 4,
      album: albumActivo ?? undefined, // crear dentro de un álbum lo guarda ahí
      pistas: [
        { pistaId: nuevaPistaId(), nombre: `${t('audio.pistas.pista', 'Pista')} 1`, instrumento: 'piano', volumen: 0.8, notas: [] },
      ],
      creadoEn: ahora,
      actualizadoEn: ahora,
    })
    abrir(id)
  }

  /**
   * La canción de la IA nace como UN proyecto (en el álbum abierto) y se abre:
   * el MIDI editable, el audio de Lyria, o los dos (el MIDI silenciado debajo).
   */
  const crearDeIA = async (c: CancionCompuesta, r: ResultadoCancion) => {
    const ahora = new Date().toISOString()
    const conVoz = r.midi === 'sinte' || r.lyria === 'voz'
    const base: ProyectoAudio = {
      nombre: c.nombre,
      bpm: c.bpm,
      compases: c.compases,
      ...(c.swing ? { swing: c.swing } : {}),
      ...(conVoz && c.letra ? { letra: c.letra } : {}),
      ...(c.estilo ? { estilo: conVoz ? c.estilo : c.estiloInstrumental } : {}),
      album: albumActivo ?? undefined,
      pistas: r.midi === 'instr' ? c.pistasInstrumental : r.midi === 'sinte' ? c.pistas : [],
      creadoEn: ahora,
      actualizadoEn: ahora,
    }
    const id = await proyectosAudioRepo.add(r.pistaLyria ? conVersionProducida(base, r.pistaLyria) : base)
    setCancionIA(false)
    if (r.errorLyria) {
      await confirmar({
        titulo: t('audio.lyria.falloTitulo', 'La versión cantada no salió'),
        mensaje: t('audio.lyria.falloMsg', 'La canción editable sí se creó. Puedes reintentar la voz desde el botón IA del editor. ({motivo})', {
          motivo: r.errorLyria,
        }),
      })
    }
    abrir(id)
  }

  const materializarSemilla = async (s: SemillaCancion, album?: string) => {
    const ahora = new Date().toISOString()
    return proyectosAudioRepo.add({
      nombre: t(`audio.cancion.${s.id.slice(4)}`, s.tituloEs),
      bpm: s.bpm,
      compases: s.compases,
      cancion: s.id,
      album,
      pistas: pistasDe(s.manoDer, s.manoIzq),
      creadoEn: ahora,
      actualizadoEn: ahora,
    })
  }

  const abrirSemilla = async (s: SemillaCancion) => {
    const existente = porCancion.get(s.id)
    abrir(existente?.id ?? (await materializarSemilla(s)))
  }

  /** Abrir un vibe: la primera vez se guarda como proyecto `vib-<mood>` (desde ahí suena el tuyo en la casa). */
  const abrirVibe = async (mood: MoodMusica) => {
    const existente = porCancion.get(`vib-${mood}`)
    if (existente?.id != null) return abrir(existente.id)
    const base = proyectoAmbiente(mood)
    const ahora = new Date().toISOString()
    const id = await proyectosAudioRepo.add({
      nombre: etiquetaVibe(mood),
      bpm: base.bpm,
      compases: base.compases,
      ...(base.swing ? { swing: base.swing } : {}),
      cancion: `vib-${mood}`,
      pistas: base.pistas,
      creadoEn: ahora,
      actualizadoEn: ahora,
    })
    abrir(id)
  }

  const restaurarVibe = async (p: ProyectoAudio) => {
    const si = await confirmar({
      titulo: t('audio.lista.restaurar', 'Restaurar original'),
      mensaje: t('audio.lista.restaurarMsg', 'Se borran tus cambios y en la casa vuelve a sonar la versión original.'),
      peligro: true,
    })
    if (!si || p.id == null) return
    if (sonandoClave === `p-${p.id}`) motor.detener()
    await proyectosAudioRepo.remove(p.id)
  }

  const borrar = async (p: ProyectoAudio) => {
    const si = await confirmar({
      titulo: t('audio.lista.borrar', 'Borrar el proyecto'),
      mensaje: t('audio.lista.borrarMsg', 'Se pierden sus pistas y sus notas; las tomas de micrófono siguen en Grabaciones.'),
      peligro: true,
    })
    if (!si || p.id == null) return
    if (sonandoClave === `p-${p.id}` || sonandoClave === p.cancion) motor.detener()
    // Una canción de fábrica no se elimina: queda como lápida para no renacer prístina.
    if (p.cancion?.startsWith('sem-')) {
      await proyectosAudioRepo.update(p.id, {
        oculto: true,
        pistas: [],
        album: undefined,
        actualizadoEn: new Date().toISOString(),
      })
    } else {
      await proyectosAudioRepo.remove(p.id)
    }
  }

  /** Borrar una semilla que nunca se tocó: nace directamente como lápida. */
  const borrarSemilla = async (s: SemillaCancion) => {
    const si = await confirmar({
      titulo: t('audio.lista.borrar', 'Borrar el proyecto'),
      mensaje: t('audio.lista.borrarFabricaMsg', 'La canción de fábrica se quita de la lista.'),
      peligro: true,
    })
    if (!si) return
    if (sonandoClave === s.id) motor.detener()
    const ahora = new Date().toISOString()
    await proyectosAudioRepo.add({
      nombre: s.tituloEs,
      bpm: s.bpm,
      compases: s.compases,
      cancion: s.id,
      oculto: true,
      pistas: [],
      creadoEn: ahora,
      actualizadoEn: ahora,
    })
  }

  const importar = async (archivo: File) => {
    setImportando(true)
    try {
      const res = analizarMidi(await archivo.arrayBuffer())
      const der = recortarNotas(res.manoDer)
      const izq = recortarNotas(res.manoIzq)
      if (der.length + izq.length === 0) throw new Error('vacio')
      if (res.compases > MAX_COMPASES) {
        await confirmar({
          titulo: t('audio.aprender.recortadaTitulo', 'Canción recortada'),
          mensaje: t('audio.aprender.recortada', 'Supera el tope del editor: se importaron los primeros {n} compases.', {
            n: MAX_COMPASES,
          }),
        })
      }
      const ahora = new Date().toISOString()
      const id = await proyectosAudioRepo.add({
        nombre: archivo.name.replace(/\.[^.]+$/, ''),
        bpm: res.bpm,
        compases: Math.max(1, Math.min(MAX_COMPASES, res.compases)),
        cancion: `mid-${Date.now().toString(36)}`,
        pistas: pistasDe(der, izq),
        creadoEn: ahora,
        actualizadoEn: ahora,
      })
      abrir(id)
    } catch (e) {
      const codigo = e instanceof Error ? e.message : ''
      await confirmar({
        titulo: t('audio.aprender.errorMidi', 'No se pudo importar el archivo'),
        mensaje:
          codigo === 'smpte'
            ? t('audio.aprender.errorSmpte', 'Ese MIDI usa tiempo SMPTE; exporta con división musical (ticks por negra).')
            : codigo === 'vacio'
              ? t('audio.aprender.errorVacio', 'El archivo no trae notas melódicas.')
              : t('audio.aprender.errorFormato', 'No parece un archivo MIDI válido (.mid de formato 0 o 1).'),
      })
    } finally {
      setImportando(false)
    }
  }

  // ─── Álbumes (carpetas) ──────────────────────────────────────────────────
  const crearAlbum = async () => {
    const nombre = (
      await pedirTexto({
        titulo: t('audio.lista.nuevoAlbum', 'Nuevo álbum'),
        mensaje: t('audio.lista.nuevoAlbumMsg', 'Nombre del álbum'),
      })
    )?.trim()
    return nombre || null
  }

  const guardarEn = async (destino: string | null) => {
    const g = guardandoEn
    setGuardandoEn(null)
    if (!g) return
    if (g.p?.id != null) {
      await proyectosAudioRepo.update(g.p.id, { album: destino ?? undefined, actualizadoEn: new Date().toISOString() })
    } else if (g.s) {
      await materializarSemilla(g.s, destino ?? undefined)
    }
  }

  const renombrarAlbum = async () => {
    const viejo = albumActivo
    if (!viejo) return
    const nuevo = (await pedirTexto({ titulo: t('audio.lista.renombrarAlbum', 'Renombrar álbum'), valor: viejo }))?.trim()
    if (!nuevo || nuevo === viejo) return
    const ahora = new Date().toISOString()
    for (const p of proyectos.filter((x) => x.album === viejo)) {
      if (p.id != null) await proyectosAudioRepo.update(p.id, { album: nuevo, actualizadoEn: ahora })
    }
    setAlbumActivo(nuevo)
  }

  const disolverAlbum = async () => {
    const viejo = albumActivo
    if (!viejo) return
    const si = await confirmar({
      titulo: t('audio.lista.disolverAlbum', 'Disolver el álbum'),
      mensaje: t('audio.lista.disolverAlbumMsg', 'Las canciones no se borran: vuelven a Todas.'),
      peligro: true,
    })
    if (!si) return
    const ahora = new Date().toISOString()
    for (const p of proyectos.filter((x) => x.album === viejo)) {
      if (p.id != null) await proyectosAudioRepo.update(p.id, { album: undefined, actualizadoEn: ahora })
    }
    setAlbumActivo(null)
  }

  // ─── Arrastrar canciones a un álbum ──────────────────────────────────────
  // Una canción propia se suelta sobre la carpeta de un álbum, o sobre «volver»
  // (dentro de un álbum) para sacarla a la raíz. `data-album` marca el destino.
  const { props: arrastrar, enMano, destino } = useArrastre<string>(
    (e) => {
      const d = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-album]')?.getAttribute('data-album')
      return d != null && d !== (albumActivo ?? '') ? d : null
    },
    (clave, d) => {
      const id = Number(clave.slice(2))
      void (async () => {
        const album = d === NUEVO_ALBUM ? await crearAlbum() : d || undefined
        if (album === null) return
        await proyectosAudioRepo.update(id, { album, actualizadoEn: new Date().toISOString() })
      })()
    },
  )
  const marcaDestino = (d: string) => (destino === d ? 'rounded-lg ring-2 ring-accent' : '')

  // ─── La tarjeta de canción ───────────────────────────────────────────────
  const album = (
    clave: string,
    nombre: string,
    meta: string,
    portadaDe: ProyectoAudio,
    onPlay: () => void,
    onAbrirAlbum: () => void,
    onGuardar?: () => void,
    onBorrar?: () => void,
    compartido?: boolean,
    onRestaurar?: () => void,
    arrastre?: PropsArrastre,
  ) => {
    const sonando = sonandoClave === clave
    return (
      <li key={clave} className={`min-w-0 ${enMano === clave ? 'opacity-40' : ''}`} {...arrastre}>
        <button type="button" onClick={onAbrirAlbum} className="ui-presion block w-full text-left">
          <Portada proyecto={portadaDe} sonando={sonando} />
          <span className="mt-1.5 flex items-center gap-1 text-sm font-semibold">
            {compartido && (
              <span className="shrink-0 text-white/60" title={t('esp.audio.compartido', 'Compartido')}>
                <Icono nombre="companeros" />
              </span>
            )}
            <span className="min-w-0 truncate">{nombre}</span>
          </span>
          <span className="block truncate text-xs text-white/45">{meta}</span>
        </button>
        <div className="mt-1.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPlay}
            aria-label={sonando ? t('audio.lista.parar', 'Parar') : t('audio.lista.escuchar', 'Escuchar')}
            title={sonando ? t('audio.lista.parar', 'Parar') : t('audio.lista.escuchar', 'Escuchar')}
            className={`grid h-8 w-8 place-items-center rounded-full transition ${
              sonando ? 'bg-white/25 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <Icono nombre={sonando ? 'detener' : 'play'} />
          </button>
          <button
            type="button"
            onClick={onAbrirAlbum}
            aria-label={t('audio.lista.abrirEditor', 'Abrir en el editor')}
            title={t('audio.lista.abrirEditor', 'Abrir en el editor')}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20"
          >
            <Icono nombre="editar" />
          </button>
          <button
            type="button"
            onClick={() => void descargar(clave, portadaDe)}
            disabled={descargando != null}
            aria-label={t('audio.grab.descargar', 'Descargar')}
            title={t('audio.grab.descargar', 'Descargar')}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 disabled:opacity-40"
          >
            {descargando === clave ? <Spinner pequeno /> : <Icono nombre="descargar" />}
          </button>
          {onGuardar && (
            <button
              type="button"
              onClick={onGuardar}
              aria-label={t('audio.lista.guardarAlbum', 'Guardar en álbum')}
              title={t('audio.lista.guardarAlbum', 'Guardar en álbum')}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20"
            >
              <Icono nombre="carpeta" />
            </button>
          )}
          {onRestaurar && (
            <button
              type="button"
              onClick={onRestaurar}
              aria-label={t('audio.lista.restaurar', 'Restaurar original')}
              title={t('audio.lista.restaurar', 'Restaurar original')}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20"
            >
              <Icono nombre="deshacer" />
            </button>
          )}
          {onBorrar && (
            <button
              type="button"
              onClick={onBorrar}
              aria-label={t('audio.lista.borrar', 'Borrar el proyecto')}
              title={t('audio.lista.borrar', 'Borrar el proyecto')}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-red-400"
            >
              <Icono nombre="basura" />
            </button>
          )}
        </div>
      </li>
    )
  }

  const metaProyecto = (p: ProyectoAudio) =>
    `${t('audio.lista.meta', '{bpm} BPM · {pistas} pistas', { bpm: p.bpm, pistas: p.pistas.length })} · ${duracionCorta(p.bpm, p.compases)}`

  /** Tarjeta-carpeta de un álbum: collage con las portadas de sus canciones. */
  const tarjetaAlbum = (nombre: string, canciones: ProyectoAudio[]) =>
    tarjetaCarpeta(`alb-${nombre}`, nombre, canciones, () => setAlbumActivo(nombre), canciones.length, nombre)

  const tarjetaCarpeta = (
    clave: string,
    nombre: string,
    canciones: ProyectoAudio[],
    onAbrir: () => void,
    total = canciones.length,
    /** Álbum que recibe canciones arrastradas (las carpetas fijas no reciben). */
    albumDestino?: string,
  ) => (
    <li key={clave} className={`min-w-0 ${albumDestino != null ? marcaDestino(albumDestino) : ''}`} data-album={albumDestino}>
      <button type="button" onClick={onAbrir} className="ui-presion block w-full text-left">
        <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-lg border border-white/10 bg-black/30 p-0.5">
          {Array.from({ length: 4 }, (_, i) => {
            const p = canciones[i]
            return p ? (
              <Portada key={i} proyecto={p} sonando={false} />
            ) : (
              <div key={i} className="rounded-lg bg-white/5" />
            )
          })}
        </div>
        <span className="mt-1.5 flex items-center gap-1 text-sm font-semibold">
          <Icono nombre="carpeta" /> <span className="min-w-0 truncate">{nombre}</span>
        </span>
        <span className="block truncate text-xs text-white/45">
          {t('audio.lista.nCanciones', '{n} canciones', { n: total })}
        </span>
      </button>
    </li>
  )

  return (
    <div className="ui-ancho mx-auto w-full max-w-2xl space-y-4 pb-4">
      <section className="space-y-2">
        {especial != null ? (
          <button
            type="button"
            onClick={() => setEspecial(null)}
            className="ui-presion flex min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition hover:bg-white/10"
          >
            <Icono nombre="volver" /> <Icono nombre="carpeta" />{' '}
            <span className="min-w-0 truncate">
              {especial === 'ambiente'
                ? t('audio.lista.carpetaAmbiente', 'Música ambiental')
                : t('audio.lista.carpetaAprender', 'Canciones por aprender')}
            </span>
          </button>
        ) : albumActivo == null ? (
          <TituloSeccion icono="piano" titulo={t('audio.tab.canciones', 'Canciones')}>
            <div className="flex flex-wrap items-center justify-end gap-1.5" data-tut="audio.canciones.crear">
              <BotonSecundario pequeno disabled={importando} onClick={() => archivoRef.current?.click()}>
                <Icono nombre="descargar" /> {t('audio.aprender.importar', 'Importar .mid')}
              </BotonSecundario>
              <BotonPrimario pequeno app={COLOR} onClick={() => setCancionIA(true)}>
                <Icono nombre="brillo" /> {t('audio.cancionIA.boton', 'Canción con IA')}
              </BotonPrimario>
              <BotonPrimario pequeno app={COLOR} onClick={() => void crear()}>
                <Icono nombre="agregar" /> {t('audio.lista.nuevo', 'Nuevo proyecto')}
              </BotonPrimario>
            </div>
          </TituloSeccion>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setAlbumActivo(null)}
              data-tut="audio.album.volver"
              data-album=""
              className={`ui-presion flex min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition hover:bg-white/10 ${marcaDestino('')}`}
            >
              <Icono nombre="volver" /> <Icono nombre="carpeta" />{' '}
              <span className="min-w-0 truncate">{albumActivo}</span>
            </button>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => void renombrarAlbum()}
                aria-label={t('audio.lista.renombrarAlbum', 'Renombrar álbum')}
                title={t('audio.lista.renombrarAlbum', 'Renombrar álbum')}
                className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
              >
                <Icono nombre="editar" />
              </button>
              <button
                type="button"
                onClick={() => void disolverAlbum()}
                aria-label={t('audio.lista.disolverAlbum', 'Disolver el álbum')}
                title={t('audio.lista.disolverAlbum', 'Disolver el álbum')}
                className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-red-400"
              >
                <Icono nombre="basura" />
              </button>
              <BotonPrimario pequeno app={COLOR} onClick={() => setCancionIA(true)}>
                <Icono nombre="brillo" /> {t('audio.cancionIA.boton', 'Canción con IA')}
              </BotonPrimario>
              <BotonPrimario pequeno app={COLOR} onClick={() => void crear()}>
                <Icono nombre="agregar" /> {t('audio.lista.nuevo', 'Nuevo proyecto')}
              </BotonPrimario>
            </div>
          </div>
        )}
        {especial === 'ambiente' ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 ultra:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]">
            {ambiente.map(({ m, fila }) => {
              const p = fila ?? proyectoAmbiente(m.id)
              const clave = fila ? `p-${fila.id}` : `vib-${m.id}`
              return album(
                clave,
                etiquetaVibe(m.id),
                fila
                  ? `${t('audio.lista.tuVersion', 'Tu versión')} · ${duracionCorta(p.bpm, p.compases)}`
                  : `${p.bpm} BPM · ${duracionCorta(p.bpm, p.compases)}`,
                p,
                () => void alternarPlay(clave, p),
                () => void abrirVibe(m.id),
                undefined,
                undefined,
                false,
                fila ? () => void restaurarVibe(fila) : undefined,
              )
            })}
          </ul>
        ) : especial === 'aprender' ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 ultra:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]">
            {aprender.map(({ s, fila }) => {
              if (fila) {
                return album(
                  `p-${fila.id}`,
                  tituloDe(fila),
                  metaProyecto(fila),
                  fila,
                  () => void alternarPlay(`p-${fila.id}`, fila),
                  () => fila.id != null && abrir(fila.id),
                  () => setGuardandoEn({ p: fila }),
                  () => void borrar(fila),
                  !!fila.espacioId,
                )
              }
              const compositor =
                s.compositor === 'Tradicional' ? t('audio.aprender.tradicional', 'Tradicional') : s.compositor
              return album(
                s.id,
                t(`audio.cancion.${s.id.slice(4)}`, s.tituloEs),
                `${compositor} · ${duracionCorta(s.bpm, s.compases)}`,
                proyectoEfimero(s),
                () => void alternarPlay(s.id, proyectoEfimero(s)),
                () => void abrirSemilla(s),
                () => setGuardandoEn({ s }),
                () => void borrarSemilla(s),
              )
            })}
          </ul>
        ) : enLista.length === 0 && albumActivo != null ? (
          <p className="text-xs text-white/45">
            {t('audio.lista.albumVacio', 'Este álbum está vacío: guarda canciones con el botón de la carpeta.')}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 ultra:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]">
            {albumActivo == null &&
              tarjetaCarpeta(
                'fija-ambiente',
                t('audio.lista.carpetaAmbiente', 'Música ambiental'),
                MOODS_LISTA.slice(0, 4).map((m) => porCancion.get(`vib-${m.id}`) ?? proyectoAmbiente(m.id)),
                () => setEspecial('ambiente'),
                MOODS_LISTA.length,
              )}
            {albumActivo == null &&
              tarjetaCarpeta(
                'fija-aprender',
                t('audio.lista.carpetaAprender', 'Canciones por aprender'),
                aprender.slice(0, 4).map(({ s, fila }) => fila ?? proyectoEfimero(s)),
                () => setEspecial('aprender'),
                aprender.length,
              )}
            {albumActivo == null && albumes.map((a) => tarjetaAlbum(a, porAlbum.get(a) ?? []))}
            {albumActivo == null && enMano && (
              <li key="nuevo-album" data-album={NUEVO_ALBUM} className="min-w-0">
                <div
                  className={`grid aspect-square place-items-center rounded-lg border-2 border-dashed p-3 text-center text-xs font-semibold transition ${
                    destino === NUEVO_ALBUM ? 'border-accent bg-white/10' : 'border-white/25 text-white/60'
                  }`}
                >
                  <span className="flex flex-col items-center gap-1.5">
                    <Icono nombre="carpeta" /> {t('audio.lista.soltarNuevoAlbum', 'Suelta aquí para crear un álbum')}
                  </span>
                </div>
              </li>
            )}
            {enLista.map((p) =>
              album(
                `p-${p.id}`,
                tituloDe(p),
                metaProyecto(p),
                p,
                () => void alternarPlay(`p-${p.id}`, p),
                () => p.id != null && abrir(p.id),
                () => setGuardandoEn({ p }),
                () => void borrar(p),
                !!p.espacioId,
                undefined,
                p.id != null ? arrastrar(`p-${p.id}`) : undefined,
              ),
            )}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <button
          type="button"
          aria-expanded={grabAbiertas}
          onClick={() => setGrabAbiertas((v) => !v)}
          data-tut="audio.grabaciones"
          className="flex w-full items-center gap-1.5 text-sm font-semibold text-white/85"
        >
          <Icono nombre="microfono" /> {t('audio.lista.grabaciones', 'Grabaciones')}
          <Icono nombre={grabAbiertas ? 'desplegado' : 'plegado'} />
        </button>
        {grabAbiertas && <GrabacionesPanel />}
      </section>

      <input
        ref={archivoRef}
        type="file"
        accept=".mid,.midi,audio/midi"
        hidden
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) void importar(archivo)
          e.target.value = ''
        }}
      />

      {cancionIA && <CancionIAModal onCreada={crearDeIA} onCerrar={() => setCancionIA(false)} />}

      {guardandoEn != null && (
        <Modal titulo={t('audio.lista.guardarAlbum', 'Guardar en álbum')} onCerrar={() => setGuardandoEn(null)}>
          <div className="space-y-2">
            <BotonSecundario
              className="w-full"
              onClick={() =>
                void crearAlbum().then((nombre) => {
                  if (nombre) void guardarEn(nombre)
                })
              }
            >
              <Icono nombre="agregar" /> {t('audio.lista.nuevoAlbum', 'Nuevo álbum')}
            </BotonSecundario>
            {albumes.map((a) => (
              <BotonSecundario
                key={a}
                className="w-full"
                disabled={guardandoEn.p?.album === a}
                onClick={() => void guardarEn(a)}
              >
                <Icono nombre="carpeta" /> {a}
              </BotonSecundario>
            ))}
            {guardandoEn.p?.album != null && (
              <BotonSecundario className="w-full" onClick={() => void guardarEn(null)}>
                {t('audio.lista.quitarAlbum', 'Quitar del álbum')}
              </BotonSecundario>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

/**
 * La portada del álbum: gradiente estable por el nombre + el minimapa de sus
 * notas (un color por pista, como los carriles del roll). Sin notas, el piano.
 */
export function Portada({ proyecto, sonando }: { proyecto: ProyectoAudio; sonando: boolean }) {
  const totalPasos = Math.max(1, proyecto.compases * PASOS_POR_COMPAS)
  const carriles = proyecto.pistas
    .map((p, i) => ({ notas: p.notas, color: PALETA_PISTAS[i % PALETA_PISTAS.length] }))
    .filter((c) => c.notas.length > 0)
  let hash = 0
  for (const ch of proyecto.nombre) hash = (hash * 31 + ch.charCodeAt(0)) % 9973
  const cA = PALETA_PISTAS[hash % PALETA_PISTAS.length]
  const cB = PALETA_PISTAS[(hash * 5 + 3) % PALETA_PISTAS.length]
  return (
    <div
      className={`ui-noche relative aspect-square overflow-hidden rounded-lg border transition ${
        sonando ? 'border-white/60' : 'border-white/10'
      }`}
      // Portada oscura a propósito (como un disco), también en modo claro: `ui-noche`
      // le devuelve la tinta blanca (el piano de la portada vacía salía oscuro sobre negro).
      style={{ background: `linear-gradient(135deg, ${cA}2e, ${cB}44), #14161d` }}
    >
      {carriles.length === 0 ? (
        <span className="absolute inset-0 grid place-items-center text-3xl text-white/25">
          <Icono nombre="piano" />
        </span>
      ) : (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
          {carriles.map((c, ci) =>
            c.notas.slice(0, 90).map((n, i) => (
              <rect
                key={`${ci}-${i}`}
                x={(n[0] / totalPasos) * 94 + 3}
                width={Math.max(1.4, (n[1] / totalPasos) * 94)}
                y={92 - ((Math.max(36, Math.min(96, n[2])) - 36) / 60) * 82}
                height={3.2}
                rx={1.2}
                fill={c.color}
                opacity={0.9}
              />
            )),
          )}
        </svg>
      )}
    </div>
  )
}
