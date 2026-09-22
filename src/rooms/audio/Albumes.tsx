import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { NotaAudio, PistaAudio, ProyectoAudio } from '../../core/data/db'
import { cancionesRepo, proyectosAudioRepo, VACIO } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { confirmar, pedirTexto } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario, BotonSecundario, Modal, TituloSeccion } from '../_shared/ui'
import { SEMILLAS_CANCIONES, type SemillaCancion } from './canciones'
import {
  COLOR,
  MAX_COMPASES,
  PALETA_PISTAS,
  PASOS_POR_COMPAS,
  nuevaPistaId,
  segPorPaso,
} from './constantes'
import { GrabacionesPanel } from './GrabacionesPanel'
import { analizarMidi } from './midiArchivo'
import * as motor from './motor'

/**
 * La pestaña Canciones, como un explorador plano: en la raíz están los ÁLBUMES
 * (carpetas del usuario, tarjeta-collage con sus portadas) y las canciones
 * SUELTAS (tus proyectos, los .mid y el banco de semillas, todas iguales);
 * entrar a un álbum muestra sus canciones con volver/renombrar/disolver.
 * Guardar una semilla prístina en un álbum la materializa; borrar una canción
 * de fábrica deja una fila-lápida (`oculto`) para que no reaparezca. Cada
 * tarjeta tiene cuatro botones: escuchar (suena AQUÍ, sin abrir el editor),
 * abrir, guardar en álbum y borrar.
 */

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
  const enLista = albumActivo == null ? visibles.filter((p) => !p.album) : (porAlbum.get(albumActivo) ?? [])
  /** Semillas sin fila (ni proyecto ni lápida): solo en la raíz. */
  const pristinas = albumActivo == null ? SEMILLAS_CANCIONES.filter((s) => !porCancion.has(s.id)) : []

  /** Las semillas materializadas se siguen mostrando con su título retraducible. */
  const tituloDe = (p: ProyectoAudio) =>
    p.cancion?.startsWith('sem-') ? t(`audio.cancion.${p.cancion.slice(4)}`, p.nombre) : p.nombre

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

  // ─── La tarjeta de canción ───────────────────────────────────────────────
  const album = (
    clave: string,
    nombre: string,
    meta: string,
    portadaDe: ProyectoAudio,
    onPlay: () => void,
    onAbrirAlbum: () => void,
    onGuardar: () => void,
    onBorrar?: () => void,
    compartido?: boolean,
  ) => {
    const sonando = sonandoClave === clave
    return (
      <li key={clave} className="min-w-0">
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
            onClick={onGuardar}
            aria-label={t('audio.lista.guardarAlbum', 'Guardar en álbum')}
            title={t('audio.lista.guardarAlbum', 'Guardar en álbum')}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20"
          >
            <Icono nombre="carpeta" />
          </button>
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
    t('audio.lista.meta', '{bpm} BPM · {pistas} pistas', { bpm: p.bpm, pistas: p.pistas.length })

  /** Tarjeta-carpeta de un álbum: collage con las portadas de sus canciones. */
  const tarjetaAlbum = (nombre: string, canciones: ProyectoAudio[]) => (
    <li key={`alb-${nombre}`} className="min-w-0">
      <button type="button" onClick={() => setAlbumActivo(nombre)} className="ui-presion block w-full text-left">
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
          {t('audio.lista.nCanciones', '{n} canciones', { n: canciones.length })}
        </span>
      </button>
    </li>
  )

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-4">
      <section className="space-y-2">
        {albumActivo == null ? (
          <TituloSeccion icono="piano" titulo={t('audio.tab.canciones', 'Canciones')}>
            <div className="flex items-center gap-1.5">
              <BotonSecundario pequeno disabled={importando} onClick={() => archivoRef.current?.click()}>
                <Icono nombre="descargar" /> {t('audio.aprender.importar', 'Importar .mid')}
              </BotonSecundario>
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
              className="ui-presion flex min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition hover:bg-white/10"
            >
              <Icono nombre="volver" /> <Icono nombre="carpeta" />{' '}
              <span className="min-w-0 truncate">{albumActivo}</span>
            </button>
            <div className="flex shrink-0 items-center gap-1.5">
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
              <BotonPrimario pequeno app={COLOR} onClick={() => void crear()}>
                <Icono nombre="agregar" /> {t('audio.lista.nuevo', 'Nuevo proyecto')}
              </BotonPrimario>
            </div>
          </div>
        )}
        {enLista.length + pristinas.length === 0 && albumActivo != null ? (
          <p className="text-xs text-white/45">
            {t('audio.lista.albumVacio', 'Este álbum está vacío: guarda canciones con el botón de la carpeta.')}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {albumActivo == null && albumes.map((a) => tarjetaAlbum(a, porAlbum.get(a) ?? []))}
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
              ),
            )}
            {pristinas.map((s) => {
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
        )}
      </section>

      <section className="space-y-2">
        <button
          type="button"
          aria-expanded={grabAbiertas}
          onClick={() => setGrabAbiertas((v) => !v)}
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
      className={`relative aspect-square overflow-hidden rounded-lg border transition ${
        sonando ? 'border-white/60' : 'border-white/10'
      }`}
      // Portada oscura a propósito (como un disco), también en modo claro.
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
