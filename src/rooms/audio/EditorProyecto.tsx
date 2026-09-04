import { useEffect, useRef, useState } from 'react'
import type { ClipAudio, NotaAudio, PistaAudio, ProyectoAudio } from '../../core/data/db'
import { leerGrabacionAudio, proyectosAudioRepo } from '../../core/data/repository'
import { descargarArchivo } from '../../core/descargarArchivo'
import { useT } from '../../core/i18n/useT'
import { confirmar } from '../../core/state/confirmarStore'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonSecundario, Campo, INPUT, Modal, Spinner } from '../_shared/ui'
import { contextoAudio } from '../../core/audio/motor'
import * as arpegiador from './arpegiador'
import {
  MAESTRO_DEFAULT,
  MAX_CLIPS_POR_PISTA,
  MAX_COMPASES,
  MAX_NOTAS_PISTA,
  MAX_PISTAS,
  PASOS_POR_COMPAS,
  esInstrumentoBateria,
  nuevaPistaId,
  nuevoClipId,
  segPorPaso,
} from './constantes'
import { OP_CONTINUAR, OP_GENERAR } from './costosIA'
import { renderizarWav } from './exportarWav'
import { crearGrabacion, fusionarNotas, type Grabacion } from './grabacion'
import { iniciarTomaAudio, type TomaAudio } from './grabadorClip'
import { generarNotas, continuarNotas } from './ia'
import { conectarMidi, haySoporteMidi, listarEntradas, suscribirNotas } from './midi'
import * as motor from './motor'
import { expandirAcorde } from './musica'
import { PanelClips } from './PanelClips'
import { PanelSinte } from './PanelSinte'
import { PianoRoll } from './PianoRoll'
import { Pistas } from './Pistas'
import * as sonando from './sonando'
import { TecladoPantalla } from './TecladoPantalla'
import { Transporte } from './Transporte'
import { VistaCascada, type EntradaPractica } from './VistaCascada'

/**
 * Teclado físico de la computadora, estilo DAW: por `e.code` (posición, no
 * letra: sirve igual en el layout español) la fila A–L pone las notas y W/E/
 * T/Y/U las negras; Z/X bajan/suben la octava. Con batería, A S D F = pads.
 */
export const SEMITONOS_FISICOS: Record<string, number> = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7,
  KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16,
}
const PADS_FISICOS: Record<string, number> = {
  KeyA: 36, KeyS: 38, KeyD: 42, KeyF: 46, KeyG: 39, KeyH: 41, KeyJ: 48, KeyK: 49,
}

/**
 * El editor de un proyecto: el borrador vive en memoria (estado React) y es la
 * MISMA referencia que toca el motor (`fijarProyecto` en cada mutación); se
 * persiste con debounce corto y flush al salir.
 */
export function EditorProyecto({
  id,
  alCerrar,
  cascadaInicial,
}: {
  id: number
  alCerrar: () => void
  /** Abrir directo en la vista de práctica (desde la pestaña Aprender). */
  cascadaInicial?: boolean
}) {
  const t = useT()
  const [proyecto, setProyecto] = useState<ProyectoAudio | null>(null)
  // Tercera vista del timeline: la cascada de práctica ocupa el editor entero.
  const [vistaCascada, setVistaCascada] = useState(!!cascadaInicial)
  const [pistaActivaId, setPistaActivaId] = useState('')
  const [version, setVersion] = useState(0)
  const [posInicio, setPosInicio] = useState(0)
  const [loop, setLoop] = useState<{ inicio: number; fin: number } | null>(null)
  const [loopActivo, setLoopActivo] = useState(false)
  const [metronomo, setMetronomo] = useState(false)
  const [cuantizar, setCuantizar] = useState(true)
  const [midiNombre, setMidiNombre] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)
  const [octava, setOctava] = useState(60) // C4
  const [rollExpandido, setRollExpandido] = useState(false)
  // Velocidad de lo que se toca/pinta en la BATERÍA (chip «Fuerza»: 60/100/127).
  const [fuerza, setFuerza] = useState(100)
  const [panelIA, setPanelIA] = useState(false)
  const [iaTexto, setIaTexto] = useState('')
  const [iaCompases, setIaCompases] = useState(2)
  const [iaOcupado, setIaOcupado] = useState(false)
  const [iaError, setIaError] = useState('')
  const [iaAplicada, setIaAplicada] = useState<NotaAudio[] | null>(null)

  const grabacionRef = useRef<Grabacion | null>(null)
  // Con la vista cascada abierta, TODA la entrada (teclado, QWERTY, MIDI) se
  // desvía a la práctica en vez de tocar/grabar por la pista activa.
  const practicaRef = useRef<EntradaPractica | null>(null)
  // Toma de micrófono en curso (pista de audio); se cierra sola al parar el transporte.
  const tomaRef = useRef<TomaAudio | null>(null)
  // Picos de onda por grabación (los pinta el roll); null = sin blob en este
  // dispositivo. Map ESTABLE mutado a mano: el redibujo lo fuerza `version`.
  const [picosClips] = useState(() => new Map<number, number[] | null>())
  const limpiarMidiRef = useRef<(() => void) | null>(null)
  // Por tecla física: los tonos que abrió (acorde expandido) y sus voces.
  const vocesMidi = useRef(new Map<number, { tonos: number[]; voces: { soltar(): void }[] }>())
  // Teclas retenidas por el arpegiador (él pone las voces; aquí solo los tonos).
  const teclasArp = useRef(new Map<number, number[]>())
  const proyectoRef = useRef<ProyectoAudio | null>(null)
  const pistaActivaRef = useRef('')
  const octavaRef = useRef(60)
  const fuerzaRef = useRef(100)
  // Refs "de lo último": se sincronizan tras cada render, nunca durante (regla react-hooks/refs).
  useEffect(() => {
    proyectoRef.current = proyecto
    pistaActivaRef.current = pistaActivaId
    octavaRef.current = octava
    fuerzaRef.current = fuerza
  })

  // ─── Guardado ────────────────────────────────────────────────────────────
  const sucio = useRef(false)
  const timer = useRef(0)
  // Solo lee refs: es estable y no necesita el patrón de "última versión".
  const guardarRef = useRef(async () => {
    const p = proyectoRef.current
    if (!sucio.current || !p) return
    sucio.current = false
    await proyectosAudioRepo.update(id, {
      nombre: p.nombre,
      bpm: p.bpm,
      compases: p.compases,
      pulsos: p.pulsos,
      swing: p.swing,
      volumenMaestro: p.volumenMaestro,
      vivo: p.vivo,
      pistas: p.pistas,
      cancion: p.cancion,
      actualizadoEn: new Date().toISOString(),
    })
  })

  const mutar = (fn: (p: ProyectoAudio) => ProyectoAudio) => {
    setProyecto((prev) => {
      if (!prev) return prev
      const nuevo = fn(prev)
      proyectoRef.current = nuevo
      motor.fijarProyecto(nuevo)
      return nuevo
    })
    setVersion((v) => v + 1)
    sucio.current = true
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void guardarRef.current(), 600)
  }

  // Carga única + limpieza total al salir.
  useEffect(() => {
    let vivo = true
    const guardar = guardarRef.current // estable: se inicializa una sola vez
    void proyectosAudioRepo.list().then((filas) => {
      const p = filas.find((x) => x.id === id)
      if (!vivo || !p) return
      // Un proyecto sin pistas no es editable: nace con una.
      if (p.pistas.length === 0) {
        p.pistas = [{ pistaId: nuevaPistaId(), nombre: 'Pista 1', instrumento: 'piano', volumen: 0.8, notas: [] }]
      }
      setProyecto(p)
      setPistaActivaId(p.pistas[0].pistaId)
      motor.fijarProyecto(p)
      void motor.prepararClips() // pre-calienta el caché: el primer play no espera decodificar
    })
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') void guardar()
    }
    document.addEventListener('visibilitychange', alOcultar)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', alOcultar)
      window.clearTimeout(timer.current)
      void guardar()
      limpiarMidiRef.current?.()
      motor.liberar()
    }
  }, [id])

  const pista = proyecto?.pistas.find((p) => p.pistaId === pistaActivaId) ?? proyecto?.pistas[0] ?? null
  const colorIdx = proyecto?.pistas.findIndex((p) => p.pistaId === (pista?.pistaId ?? '')) ?? 0

  // Picos de onda de los clips: una lectura por grabación (el sello valida el id local).
  const clavePicos =
    proyecto?.pistas
      .flatMap((x) => x.clips ?? [])
      .map((c) => `${c.grabacionId}:${c.sello}`)
      .join(',') ?? ''
  useEffect(() => {
    let vivo = true
    for (const x of proyectoRef.current?.pistas ?? []) {
      for (const clip of x.clips ?? []) {
        if (picosClips.has(clip.grabacionId)) continue
        picosClips.set(clip.grabacionId, []) // marca «cargando»: no relee en paralelo
        void leerGrabacionAudio(clip.grabacionId).then((fila) => {
          if (!vivo) return
          picosClips.set(clip.grabacionId, fila && fila.creadoEn === clip.sello ? (fila.picos ?? []) : null)
          setVersion((v) => v + 1)
        })
      }
    }
    return () => {
      vivo = false
    }
  }, [clavePicos, picosClips])

  // ─── Tocar en vivo y grabar (teclado en pantalla y MIDI comparten camino) ─
  const notaEnVivo = (tono: number, vel: number, tMs: number) => {
    if (practicaRef.current) return practicaRef.current.entrada(tono, vel)
    const p = proyectoRef.current
    const pistaViva = p?.pistas.find((x) => x.pistaId === pistaActivaRef.current)
    if (!p || !pistaViva || pistaViva.tipo === 'audio') return // la pista de clips no toca notas
    // Acordes/arpegio solo en tonos melódicos; los pads de batería van directo.
    const conModos = !esInstrumentoBateria(pistaViva.instrumento)
    const tonos = conModos && p.vivo?.acorde ? expandirAcorde(tono, p.vivo.acorde, p.vivo.escala ?? null) : [tono]
    if (conModos && p.vivo?.arp) {
      teclasArp.current.set(tono, tonos)
      arpegiador.bajarTonos(tonos, vel)
      return
    }
    const voces: { soltar(): void }[] = []
    for (const tn of tonos) {
      const voz = motor.tocarEnVivo(pistaViva.pistaId, pistaViva.instrumento, tn, vel)
      if (voz) voces.push(voz)
      grabacionRef.current?.alNoteOn(tn, vel, tMs)
      sonando.encender(tn) // el teclado ilumina el acorde completo
    }
    vocesMidi.current.set(tono, { tonos, voces })
  }
  const finEnVivo = (tono: number, tMs: number) => {
    if (practicaRef.current) return practicaRef.current.fin(tono)
    const arpTonos = teclasArp.current.get(tono)
    if (arpTonos) {
      teclasArp.current.delete(tono)
      arpegiador.subirTonos(arpTonos)
      return
    }
    const tecla = vocesMidi.current.get(tono)
    if (!tecla) return
    vocesMidi.current.delete(tono)
    for (const v of tecla.voces) v.soltar()
    for (const tn of tecla.tonos) {
      grabacionRef.current?.alNoteOff(tn, tMs)
      sonando.apagar(tn)
    }
  }

  /** Suelta todo lo retenido (cambio de pista/instrumento: el contexto ya no vale). */
  const soltarTodo = () => {
    arpegiador.limpiar()
    for (const tecla of vocesMidi.current.values()) for (const v of tecla.voces) v.soltar()
    vocesMidi.current.clear()
    teclasArp.current.clear()
    sonando.apagarTodo()
  }

  // El arpegiador toca por la pista activa y graba por el mismo camino que una tecla.
  const salidaArp = useRef<arpegiador.SalidaArp>({
    tocar(tono, vel, tAudio, durSeg) {
      const pistaViva = proyectoRef.current?.pistas.find((x) => x.pistaId === pistaActivaRef.current)
      if (!pistaViva) return
      motor.tocarNotaEnPista(pistaViva.pistaId, pistaViva.instrumento, tono, vel, tAudio, durSeg)
      // La tecla destella en el teclado justo cuando la nota suena.
      const ctx = contextoAudio()
      if (ctx) sonando.destello(tono, (tAudio - ctx.currentTime) * 1000, durSeg * 1000)
    },
    grabar(tipo, tono, vel, tMs) {
      if (tipo === 'on') grabacionRef.current?.alNoteOn(tono, vel, tMs)
      else grabacionRef.current?.alNoteOff(tono, tMs)
    },
  })
  const arpAjustes = proyecto?.vivo?.arp ?? null
  const bpmProyecto = proyecto?.bpm ?? 100
  useEffect(() => {
    arpegiador.configurar(arpAjustes, bpmProyecto, salidaArp.current)
  }, [arpAjustes, bpmProyecto])
  useEffect(() => {
    return soltarTodo
  }, [pistaActivaId, pista?.instrumento])

  // ─── Teclado físico de la computadora (todo por refs: se monta UNA vez) ──
  useEffect(() => {
    const abiertas = new Map<string, number>() // code → tono que abrió (la octava puede cambiar a media pulsación)
    const enCampo = (el: EventTarget | null) =>
      el instanceof HTMLElement && el.closest('input, textarea, select, [contenteditable="true"]') != null
    const soltarTeclas = () => {
      for (const tono of abiertas.values()) finEnVivo(tono, performance.now())
      abiertas.clear()
    }
    const alBajar = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      if (enCampo(e.target) || document.querySelector('[role="dialog"]')) return
      if (e.code === 'KeyZ') return setOctava((o) => Math.max(24, o - 12))
      if (e.code === 'KeyX') return setOctava((o) => Math.min(84, o + 12))
      const instr = proyectoRef.current?.pistas.find((x) => x.pistaId === pistaActivaRef.current)?.instrumento
      // En la práctica el mapa físico siempre es melódico, aunque la activa sea batería.
      const esBateria = practicaRef.current == null && instr != null && esInstrumentoBateria(instr)
      const semitono = SEMITONOS_FISICOS[e.code]
      const tono = esBateria ? PADS_FISICOS[e.code] : semitono != null ? octavaRef.current + semitono : undefined
      if (tono == null || abiertas.has(e.code)) return
      abiertas.set(e.code, tono)
      notaEnVivo(tono, esBateria ? fuerzaRef.current : 100, performance.now())
    }
    const alSubir = (e: KeyboardEvent) => {
      const tono = abiertas.get(e.code)
      if (tono == null) return
      abiertas.delete(e.code)
      finEnVivo(tono, performance.now())
    }
    window.addEventListener('keydown', alBajar)
    window.addEventListener('keyup', alSubir)
    window.addEventListener('blur', soltarTeclas)
    return () => {
      soltarTeclas()
      window.removeEventListener('keydown', alBajar)
      window.removeEventListener('keyup', alSubir)
      window.removeEventListener('blur', soltarTeclas)
    }
  }, [])

  const conectar = async () => {
    const access = await conectarMidi()
    if (!access) {
      await confirmar({
        titulo: t('audio.midi.sinAcceso', 'No se pudo conectar el MIDI'),
        mensaje: t('audio.midi.sinAccesoMsg', 'Revisa el permiso del navegador y que el teclado esté enchufado.'),
      })
      return
    }
    limpiarMidiRef.current?.()
    const nombrar = (lista: { nombre: string }[]) =>
      setMidiNombre(lista.length === 0 ? null : lista.map((e) => e.nombre).join(' · '))
    limpiarMidiRef.current = suscribirNotas(access, 'todas', {
      onNota: notaEnVivo,
      onFin: finEnVivo,
      onCambioDispositivos: nombrar,
    })
    nombrar(listarEntradas(access))
  }

  // ─── Transporte ──────────────────────────────────────────────────────────
  const cerrarToma = () => {
    const grab = grabacionRef.current
    if (!grab) return
    grabacionRef.current = null
    const p = proyectoRef.current
    if (!p) return
    const toma = grab.terminar(Math.max(0, motor.posicion()))
    if (toma.length === 0) return
    const idPista = pistaActivaRef.current
    mutar((prev) => ({
      ...prev,
      pistas: prev.pistas.map((x) =>
        x.pistaId === idPista ? { ...x, notas: fusionarNotas(x.notas, toma, MAX_NOTAS_PISTA) } : x,
      ),
    }))
  }

  const play = async () => {
    if (!proyecto) return
    if (motor.estado() !== 'parado') {
      cerrarToma()
      setPosInicio(motor.pausar())
      return
    }
    await motor.prepararClips() // no-op con el caché caliente
    motor.alFin(() => cerrarToma())
    motor.reproducir({ desde: posInicio, loop: loopActivo ? loop : null, metronomo })
  }

  const detener = () => {
    cerrarToma()
    motor.detener()
    setPosInicio(0)
  }

  /** Regresa al compás 1: sonando, rearranca desde ahí; parado, solo mueve el marcador. */
  const regresar = () => {
    if (motor.estado() !== 'parado') {
      cerrarToma()
      motor.alFin(() => cerrarToma())
      motor.reproducir({ desde: 0, loop: loopActivo ? loop : null, metronomo })
    }
    setPosInicio(0)
  }

  const grabar = async () => {
    if (!proyecto || !pista || motor.estado() !== 'parado') return
    if (pista.tipo === 'audio') return grabarAudio(pista)
    await motor.prepararClips()
    motor.alFin(() => cerrarToma())
    motor.reproducir({ grabar: true, loop: null, metronomo: true, desde: 0 })
    const ancla = motor.anclaGrabacion()
    if (ancla) {
      grabacionRef.current = crearGrabacion(ancla, {
        cuantizar,
        totalPasos: proyecto.compases * PASOS_POR_COMPAS,
      })
    }
  }

  /** Graba una toma de micrófono en la pista de audio activa (pre-roll de un compás). */
  const grabarAudio = async (pistaAudio: PistaAudio) => {
    if ((pistaAudio.clips?.length ?? 0) >= MAX_CLIPS_POR_PISTA) {
      await confirmar({
        titulo: t('audio.grab.llena', 'La pista está llena'),
        mensaje: t('audio.grab.llenaMsg', 'Una pista de audio admite {n} tomas; quita alguna para grabar otra.', {
          n: MAX_CLIPS_POR_PISTA,
        }),
      })
      return
    }
    // El stream se pide ANTES de arrancar (gesto del usuario; el permiso de
    // Android puede tardar y la cuenta no debe correr sin micrófono listo).
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      await confirmar({
        titulo: t('audio.grab.sinMicTitulo', 'No se pudo usar el micrófono'),
        mensaje: t('chat.voz.permiso', 'El navegador bloqueó el micrófono. Actívalo en el candado junto a la dirección.'),
      })
      return
    }
    await motor.prepararClips()
    motor.reproducir({ grabar: true, loop: null, metronomo: true, desde: 0 })
    const ancla = motor.anclaGrabacion()
    if (!ancla) {
      stream.getTracks().forEach((tr) => tr.stop())
      return
    }
    const idPista = pistaAudio.pistaId
    tomaRef.current = iniciarTomaAudio(stream, ancla, {
      nombre: t('audio.grab.toma', 'Toma {n}', { n: (pistaAudio.clips?.length ?? 0) + 1 }),
      alTerminar: (res) => {
        tomaRef.current = null
        if (!res) return
        picosClips.set(res.grabacionId, res.picos)
        const clip: ClipAudio = {
          clipId: nuevoClipId(),
          grabacionId: res.grabacionId,
          sello: res.sello,
          inicio: res.inicio,
          duracionSeg: res.duracionSeg,
          recorteSeg: res.recorteSeg,
          nombre: res.nombre,
        }
        mutar((prev) => {
          const finPaso = clip.inicio + clip.duracionSeg / segPorPaso(prev.bpm)
          return {
            ...prev,
            compases: Math.max(prev.compases, Math.min(MAX_COMPASES, Math.ceil(finPaso / PASOS_POR_COMPAS))),
            pistas: prev.pistas.map((x) => (x.pistaId === idPista ? { ...x, clips: [...(x.clips ?? []), clip] } : x)),
          }
        })
      },
    })
  }

  const exportar = async () => {
    const p = proyectoRef.current
    if (!p || exportando) return
    setExportando(true)
    try {
      await guardarRef.current()
      await motor.prepararClips()
      const blob = await renderizarWav(p, motor.buffersDeClips())
      await descargarArchivo(blob, `${p.nombre || 'proyecto'}.wav`)
    } finally {
      setExportando(false)
    }
  }

  // ─── IA ──────────────────────────────────────────────────────────────────
  const correrIA = async (modo: 'generar' | 'continuar') => {
    const p = proyectoRef.current
    const pistaViva = p?.pistas.find((x) => x.pistaId === pistaActivaRef.current)
    if (!p || !pistaViva) return
    if (modo === 'generar' && pistaViva.notas.length > 0) {
      const si = await confirmar({
        titulo: t('audio.ia.reemplazar', 'Reemplazar las notas de la pista'),
        mensaje: t('audio.ia.reemplazarMsg', 'La toma nueva sustituye lo que hay en la pista activa.'),
        peligro: true,
      })
      if (!si) return
    }
    setIaError('')
    setIaOcupado(true)
    try {
      const previas = pistaViva.notas
      let notas: NotaAudio[]
      if (modo === 'generar') {
        notas = await generarNotas({
          descripcion: iaTexto.trim(),
          instrumento: pistaViva.instrumento,
          bpm: p.bpm,
          compases: iaCompases,
        })
      } else {
        const ultimo = previas.reduce((m, n) => Math.max(m, n[0] + n[1]), 0)
        const desde = Math.ceil(ultimo / PASOS_POR_COMPAS) * PASOS_POR_COMPAS
        const nuevas = await continuarNotas({
          notas: previas,
          instrumento: pistaViva.instrumento,
          bpm: p.bpm,
          desde,
          compases: iaCompases,
        })
        notas = fusionarNotas(previas, nuevas, MAX_NOTAS_PISTA)
      }
      const idPista = pistaViva.pistaId
      const compasesMin = Math.ceil(notas.reduce((m, n) => Math.max(m, n[0] + n[1]), 0) / PASOS_POR_COMPAS)
      setIaAplicada(previas)
      mutar((prev) => ({
        ...prev,
        compases: Math.max(prev.compases, compasesMin),
        pistas: prev.pistas.map((x) => (x.pistaId === idPista ? { ...x, notas } : x)),
      }))
    } catch (e) {
      setIaError(e instanceof Error ? e.message : String(e))
    } finally {
      setIaOcupado(false)
    }
  }

  const deshacerIA = () => {
    const previas = iaAplicada
    if (!previas) return
    setIaAplicada(null)
    const idPista = pistaActivaRef.current
    mutar((prev) => ({
      ...prev,
      pistas: prev.pistas.map((x) => (x.pistaId === idPista ? { ...x, notas: previas } : x)),
    }))
  }

  if (!proyecto || !pista) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner etiqueta={t('audio.editor.cargando', 'Cargando el proyecto')} />
      </div>
    )
  }

  // Tercera vista del timeline (roll → partitura → cascada): la práctica toma
  // el editor entero sobre el MISMO proyecto vivo; al volver, todo sigue igual.
  if (vistaCascada) {
    return (
      <VistaCascada
        proyecto={proyecto}
        octava={octava}
        onOctava={setOctava}
        midiNombre={midiNombre}
        onConectarMidi={() => void conectar()}
        registrar={(m) => {
          practicaRef.current = m
        }}
        alVolver={() => setVistaCascada(false)}
      />
    )
  }

  /** Cambia las notas de la pista activa; escribir más allá del final alarga la canción. */
  const cambiarNotas = (notas: NotaAudio[]) => {
    const idPista = pista.pistaId
    const fin = notas.reduce((m, n) => Math.max(m, n[0] + n[1]), 0)
    const minimos = Math.min(MAX_COMPASES, Math.ceil(fin / PASOS_POR_COMPAS))
    mutar((p) => ({
      ...p,
      compases: Math.max(p.compases, minimos),
      pistas: p.pistas.map((x) => (x.pistaId === idPista ? { ...x, notas } : x)),
    }))
  }
  /** Cambia los clips de la pista de audio activa (mover/quitar desde el roll). */
  const cambiarClips = (clips: ClipAudio[]) => {
    const idPista = pista.pistaId
    mutar((p) => ({ ...p, pistas: p.pistas.map((x) => (x.pistaId === idPista ? { ...x, clips } : x)) }))
  }
  const velToque = esInstrumentoBateria(pista.instrumento) ? fuerza : 100

  return (
    <div className="flex h-full flex-col gap-2">
      <Transporte
        nombre={proyecto.nombre}
        onCerrar={alCerrar}
        bpm={proyecto.bpm}
        compases={proyecto.compases}
        pulsos={proyecto.pulsos ?? 4}
        posInicio={posInicio}
        onBpm={(bpm) => mutar((p) => ({ ...p, bpm }))}
        onCompases={(compases) => mutar((p) => ({ ...p, compases }))}
        onPulsos={(pulsos) => mutar((p) => ({ ...p, pulsos }))}
        onRegresar={regresar}
        metronomo={metronomo}
        onMetronomo={() => {
          setMetronomo(!metronomo)
          motor.fijarMetronomo(!metronomo) // en caliente: el chip surte efecto a media reproducción
        }}
        loopActivo={loopActivo}
        onLoopActivo={() => {
          setLoopActivo((v) => {
            const activo = !v
            if (activo && !loop) setLoop({ inicio: 0, fin: Math.min(proyecto.compases, 2) * PASOS_POR_COMPAS })
            return activo
          })
        }}
        cuantizar={cuantizar}
        onCuantizar={() => setCuantizar((v) => !v)}
        midiNombre={midiNombre}
        haySoporte={haySoporteMidi()}
        onConectarMidi={() => void conectar()}
        onPlay={play}
        onDetener={detener}
        onGrabar={grabar}
        onExportar={() => void exportar()}
        exportando={exportando}
        onIA={() => {
          setIaError('')
          setPanelIA(true)
        }}
        onDeshacerIA={iaAplicada ? deshacerIA : null}
      />

      {/* El timeline integra las pistas: una sola tarjeta con la columna de pistas a la IZQUIERDA y el roll a la derecha.
          Expandido, la columna también se pliega: todo el ancho para el roll. */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-black/30">
        {!rollExpandido && (
          <Pistas
            pistas={proyecto.pistas}
            activa={pista.pistaId}
            onActiva={setPistaActivaId}
            onCambiar={(pistaId, patch) =>
              mutar((p) => ({ ...p, pistas: p.pistas.map((x) => (x.pistaId === pistaId ? { ...x, ...patch } : x)) }))
            }
            onBorrar={(pistaId) => {
              mutar((p) => ({ ...p, pistas: p.pistas.filter((x) => x.pistaId !== pistaId) }))
              if (pistaActivaId === pistaId)
                setPistaActivaId(proyecto.pistas.find((x) => x.pistaId !== pistaId)?.pistaId ?? '')
            }}
            onAgregar={() => {
              if (proyecto.pistas.length >= MAX_PISTAS) return
              const nueva: PistaAudio = {
                pistaId: nuevaPistaId(),
                nombre: `${t('audio.pistas.pista', 'Pista')} ${proyecto.pistas.length + 1}`,
                instrumento: 'piano',
                volumen: 0.8,
                notas: [],
              }
              mutar((p) => ({ ...p, pistas: [...p.pistas, nueva] }))
              setPistaActivaId(nueva.pistaId)
            }}
            onAgregarAudio={() => {
              if (proyecto.pistas.length >= MAX_PISTAS) return
              const nueva: PistaAudio = {
                pistaId: nuevaPistaId(),
                nombre: `${t('audio.grab.audio', 'Audio')} ${proyecto.pistas.filter((x) => x.tipo === 'audio').length + 1}`,
                instrumento: 'voz', // obligatorio en el tipo; en pistas de clips no suena
                volumen: 0.8,
                notas: [],
                tipo: 'audio',
                clips: [],
              }
              mutar((p) => ({ ...p, pistas: [...p.pistas, nueva] }))
              setPistaActivaId(nueva.pistaId)
            }}
          />
        )}
        <PianoRoll
          proyecto={proyecto}
          pista={pista}
          colorIdx={colorIdx}
          version={version}
          posInicio={posInicio}
          loop={loopActivo ? loop : null}
          escala={proyecto.vivo?.escala}
          expandido={rollExpandido}
          velocidadNueva={velToque}
          onExpandir={() => setRollExpandido((v) => !v)}
          onCascada={() => setVistaCascada(true)}
          onActiva={setPistaActivaId}
          onNotas={cambiarNotas}
          onClips={cambiarClips}
          picosClips={picosClips}
          onPosInicio={setPosInicio}
          onLoop={(l) => {
            setLoop(l)
            if (l) setLoopActivo(true) // arrastrar en la regla crea el bucle Y lo enciende
          }}
        />
      </div>

      {!rollExpandido && pista.tipo === 'audio' && (
        <PanelClips
          pista={pista}
          onFx={(fx) => {
            const idPista = pista.pistaId
            mutar((p) => ({ ...p, pistas: p.pistas.map((x) => (x.pistaId === idPista ? { ...x, efectos: fx } : x)) }))
          }}
        />
      )}
      {pista.tipo !== 'audio' && (
        <>
          {/* El panel del sinte va pegado ARRIBA del teclado: controla lo que se toca ahí.
              Expandido se pliega el sinte, pero el INSTRUMENTO (teclado) se queda: sigues tocando. */}
          {!rollExpandido && (
            <PanelSinte
              pista={pista}
              vivo={proyecto.vivo}
              octava={octava}
              compases={proyecto.compases}
              fuerza={fuerza}
              onFuerza={setFuerza}
              swing={proyecto.swing ?? 0}
              onSwing={(v) => mutar((p) => ({ ...p, swing: v }))}
              onNotas={cambiarNotas}
              onInstrumento={(instrumento) => {
                const idPista = pista.pistaId
                mutar((p) => ({ ...p, pistas: p.pistas.map((x) => (x.pistaId === idPista ? { ...x, instrumento } : x)) }))
              }}
              volumenMaestro={proyecto.volumenMaestro ?? MAESTRO_DEFAULT}
              onFx={(fx) => {
                const idPista = pista.pistaId
                mutar((p) => ({ ...p, pistas: p.pistas.map((x) => (x.pistaId === idPista ? { ...x, efectos: fx } : x)) }))
              }}
              onSinte={(s) => {
                const idPista = pista.pistaId
                mutar((p) => ({ ...p, pistas: p.pistas.map((x) => (x.pistaId === idPista ? { ...x, sinte: s } : x)) }))
              }}
              onVivo={(v) => mutar((p) => ({ ...p, vivo: v }))}
              onOctava={setOctava}
              onMaestro={(v) => mutar((p) => ({ ...p, volumenMaestro: v }))}
            />
          )}
          <TecladoPantalla
            instrumento={pista.instrumento}
            octava={octava}
            onOctava={setOctava}
            escala={proyecto.vivo?.escala}
            velocidad={velToque}
            onNota={(tono, vel) => notaEnVivo(tono, vel, performance.now())}
            onFin={(tono) => finEnVivo(tono, performance.now())}
          />
        </>
      )}

      {panelIA && (
        <Modal titulo={t('audio.ia.titulo', 'Componer con IA')} onCerrar={() => setPanelIA(false)}>
          <Campo etiqueta={t('audio.ia.desc', 'Qué quieres oír (en la pista activa)')}>
            <textarea
              value={iaTexto}
              onChange={(e) => setIaTexto(e.target.value)}
              rows={2}
              placeholder={t('audio.ia.descPh', 'Un bajo funk tranquilo… / una melodía triste…')}
              className={INPUT}
            />
          </Campo>
          <Campo etiqueta={t('audio.ia.compases', 'Compases a componer')}>
            <select
              value={iaCompases}
              onChange={(e) => setIaCompases(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none"
            >
              {[1, 2, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Campo>
          {iaError && <p className="text-xs text-red-400">{iaError}</p>}
          <div className="grid grid-cols-2 gap-2">
            <BotonSecundario disabled={iaOcupado || !iaTexto.trim()} onClick={() => void correrIA('generar')}>
              {iaOcupado ? <Spinner pequeno /> : <Icono nombre="brillo" />} {t('audio.ia.generar', 'Componer')}{' '}
              <Creditos op={OP_GENERAR} />
            </BotonSecundario>
            <BotonSecundario disabled={iaOcupado || pista.notas.length === 0} onClick={() => void correrIA('continuar')}>
              {iaOcupado ? <Spinner pequeno /> : <Icono nombre="siguiente" />} {t('audio.ia.continuar', 'Continuar')}{' '}
              <Creditos op={OP_CONTINUAR} />
            </BotonSecundario>
          </div>
          {iaAplicada && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
              {t('audio.ia.aplicada', 'Toma aplicada a la pista. ¿No convence?')}
              <BotonSecundario pequeno onClick={deshacerIA}>
                {t('audio.ia.deshacerCorto', 'Deshacer')}
              </BotonSecundario>
            </div>
          )}
          <p className="text-xs text-white/40">
            {t('audio.ia.nota', 'La IA compone para el instrumento de la pista activa; dale play para escucharla.')}
          </p>
        </Modal>
      )}
    </div>
  )
}
