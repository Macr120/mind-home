import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { NotaAudio, ProyectoAudio } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario, BotonSecundario, Modal } from '../_shared/ui'
import { contextoAudio } from '../../core/audio/motor'
import { Cascada } from './Cascada'
import { PartituraPractica } from './PartituraPractica'
import { COLOR, PALETA_PISTAS, esInstrumentoBateria, segPorPaso } from './constantes'
import * as guia from './guia'
import { haySoporteMidi } from './midi'
import * as motor from './motor'
import * as sonando from './sonando'
import { TecladoPantalla } from './TecladoPantalla'

/**
 * La tercera vista del editor (piano roll → partitura → CASCADA): práctica
 * sobre el proyecto VIVO. Eliges qué pistas tocas tú; el resto acompaña
 * (batería y clips de micrófono incluidos). Tres modos:
 * - Escuchar: suena todo y las teclas se iluminan (sin puntuación).
 * - Ritmo: el transporte corre a la velocidad elegida; el motor OMITE tus
 *   pistas (sin silenciarlas: tu entrada en vivo suena por su instrumento) y
 *   puntúa por ventana de tiempo.
 * - Espera: sin transporte — avanza acorde a acorde cuando tocas las teclas
 *   correctas; el acompañamiento melódico se dispara al cruzarlo.
 *
 * La entrada llega por DOS caminos: el teclado en pantalla propio y el
 * registro en el editor (`registrar`), que intercepta QWERTY y MIDI.
 */

type ModoPractica = 'escuchar' | 'ritmo' | 'espera'

/** Ventana de acierto del modo Ritmo, en segundos hacia cada lado. */
const VENTANA_S = 0.25
/** Antelación con la que una tecla se marca «esperada» en Ritmo (segundos). */
const AVISO_S = 0.5

interface Stats {
  aciertos: number
  perdidas: number
  extras: number
}

export interface EntradaPractica {
  entrada(tono: number, vel: number): void
  fin(tono: number): void
}

export function VistaCascada({
  proyecto,
  octava,
  onOctava,
  midiNombre,
  onConectarMidi,
  registrar,
  alVolver,
}: {
  proyecto: ProyectoAudio
  octava: number
  onOctava: (v: number) => void
  midiNombre: string | null
  onConectarMidi: () => void
  /** Engancha la práctica al editor: QWERTY y MIDI entran por aquí. */
  registrar: (m: EntradaPractica | null) => void
  alVolver: () => void
}) {
  const t = useT()
  const [modo, setModo] = useState<ModoPractica>('escuchar')
  /** La práctica también se lee en partitura (misma lógica, otro lienzo). */
  const [conPartitura, setConPartitura] = useState(false)
  /** % de velocidad (deslizador con topes cada 25). */
  const [velocidad, setVelocidad] = useState(100)
  const [fase, setFase] = useState<'listo' | 'sonando' | 'resumen'>('listo')
  const [resumen, setResumen] = useState<Stats | null>(null)
  const estado = useSyncExternalStore(motor.transporteStore.subscribe, motor.transporteStore.getSnapshot)

  const spbEf = segPorPaso(proyecto.bpm) / (velocidad / 100)

  /** Pistas practicables: melódicas con notas (ni batería, ni clips de audio). */
  const melodicas = useMemo(
    () => proyecto.pistas.filter((p) => p.tipo !== 'audio' && !esInstrumentoBateria(p.instrumento) && p.notas.length > 0),
    [proyecto],
  )
  const [tocadas, setTocadas] = useState<Set<string>>(() => new Set(melodicas[0] ? [melodicas[0].pistaId] : []))
  const alternarTocada = (pistaId: string) => {
    setTocadas((prev) => {
      const n = new Set(prev)
      if (n.has(pistaId)) {
        if (n.size === 1) return prev // siempre queda al menos una
        n.delete(pistaId)
      } else {
        n.add(pistaId)
      }
      return n
    })
  }
  // Si una pista tocada desapareció del proyecto (sync), cae a la primera
  // melódica (ajuste de estado EN el render, como el teclado con la octava).
  const idsMelodicas = melodicas.map((p) => p.pistaId).join(',')
  const [idsPrevios, setIdsPrevios] = useState(idsMelodicas)
  if (idsPrevios !== idsMelodicas) {
    setIdsPrevios(idsMelodicas)
    setTocadas((prev) => {
      const vivas = new Set(melodicas.map((p) => p.pistaId))
      const filtradas = [...prev].filter((id) => vivas.has(id))
      if (filtradas.length === prev.size && filtradas.length > 0) return prev
      return new Set(filtradas.length > 0 ? filtradas : melodicas[0] ? [melodicas[0].pistaId] : [])
    })
  }

  /** Notas que TÚ tocas (ordenadas por inicio). */
  const notasTuya = useMemo(() => {
    const lista = melodicas.filter((p) => tocadas.has(p.pistaId)).flatMap((p) => p.notas)
    return [...lista].sort((a, b) => a[0] - b[0] || a[2] - b[2])
  }, [melodicas, tocadas])
  /** El acompañamiento melódico (para el disparo cruzado de Espera). */
  const acomp = useMemo(
    () =>
      melodicas
        .filter((p) => !tocadas.has(p.pistaId))
        .flatMap((p) => p.notas.map((nota) => ({ nota, pistaId: p.pistaId, instrumento: p.instrumento })))
        .sort((a, b) => a.nota[0] - b.nota[0]),
    [melodicas, tocadas],
  )

  // Octava: la del EDITOR (Z/X del QWERTY ya la mueven); al entrar o cambiar
  // de pistas se centra en la mediana de lo que tocas.
  const octavaInicial = useMemo(() => {
    const tonos = (notasTuya.length ? notasTuya : melodicas[0]?.notas ?? []).map((n) => n[2]).sort((a, b) => a - b)
    const mediana = tonos[Math.floor(tonos.length / 2)] ?? 60
    return Math.max(24, Math.min(84, Math.round((mediana - 12) / 12) * 12))
  }, [notasTuya, melodicas])
  useEffect(() => {
    onOctava(octavaInicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo re-centra al cambiar la selección
  }, [octavaInicial])

  // ─── Estado imperativo de la sesión (fuera de React: lo consume el rAF) ──
  const statsRef = useRef<Stats>({ aciertos: 0, perdidas: 0, extras: 0 })
  const consumidasRef = useRef(new Set<number>())
  const anclaRef = useRef<motor.AnclaGrabacion | null>(null)
  const destelloRef = useRef(0) // puntero sobre TODAS las notas (modo Escuchar)
  const todasRef = useRef<NotaAudio[]>([])
  const esperaRef = useRef<{
    acordes: { inicio: number; tonos: number[] }[]
    i: number
    pendientes: Set<number>
    iAcomp: number
  } | null>(null)
  const posVirtualRef = useRef(0)
  const vocesRef = useRef(new Map<number, { soltar(): void }>())
  const modoRef = useRef(modo)
  const faseRef = useRef(fase)
  useEffect(() => {
    modoRef.current = modo
    faseRef.current = fase
  })

  const detenerTodo = () => {
    motor.detener()
    motor.fijarPistasOmitidas(new Set())
    guia.limpiarGuia()
    for (const voz of vocesRef.current.values()) voz.soltar()
    vocesRef.current.clear()
  }

  const terminar = (conResumen: boolean) => {
    detenerTodo()
    if (conResumen) setResumen({ ...statsRef.current })
    setFase(conResumen ? 'resumen' : 'listo')
  }

  // Al salir de la vista, el editor recupera su transporte intacto (velocidad
  // a 1 y sin pistas omitidas); NO se llama a liberar: el editor sigue vivo.
  useEffect(
    () => () => {
      motor.detener()
      motor.fijarPistasOmitidas(new Set())
      motor.fijarVelocidad(1)
      guia.limpiarGuia()
      sonando.apagarTodo()
      for (const voz of vocesRef.current.values()) voz.soltar()
      vocesRef.current.clear()
    },
    [],
  )

  // Cualquier camino que pare el transporte (fin natural, stop, pestaña oculta)
  // cierra la sesión de Escuchar/Ritmo; Espera no usa el transporte.
  useEffect(() => {
    if (fase === 'sonando' && modo !== 'espera' && estado === 'parado') {
      terminar(modo === 'ritmo')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacciona solo al transporte
  }, [estado])

  // Cambiar de modo o de pistas a media sesión la corta (el contexto ya no vale).
  useEffect(() => {
    if (faseRef.current === 'sonando') {
      detenerTodo()
      esperaRef.current = null
      setFase('listo')
    }
  }, [modo, tocadas])

  const arrancar = () => {
    detenerTodo()
    statsRef.current = { aciertos: 0, perdidas: 0, extras: 0 }
    consumidasRef.current = new Set()
    destelloRef.current = 0
    setResumen(null)
    motor.fijarVelocidad(velocidad / 100)
    if (modo === 'espera') {
      // Acordes = notas tuyas agrupadas por inicio (tolerancia de 1/100 de paso).
      const acordes: { inicio: number; tonos: number[] }[] = []
      for (const nota of notasTuya) {
        const ultimo = acordes[acordes.length - 1]
        if (ultimo && Math.abs(ultimo.inicio - nota[0]) < 0.01) {
          if (!ultimo.tonos.includes(nota[2])) ultimo.tonos.push(nota[2])
        } else {
          acordes.push({ inicio: nota[0], tonos: [nota[2]] })
        }
      }
      if (acordes.length === 0) return
      esperaRef.current = { acordes, i: -1, pendientes: new Set(), iAcomp: 0 }
      setFase('sonando')
      avanzarEspera()
      return
    }
    // En Ritmo el motor OMITE tus pistas (no las silencia: tu vivo debe sonar).
    motor.fijarPistasOmitidas(modo === 'ritmo' ? tocadas : new Set())
    motor.reproducir({ metronomo: modo === 'ritmo' })
    anclaRef.current = motor.anclaGrabacion()
    todasRef.current = melodicas.flatMap((p) => p.notas).sort((a, b) => a[0] - b[0])
    setFase('sonando')
  }

  /** Espera: entra al siguiente acorde disparando el acompañamiento cruzado. */
  const avanzarEspera = () => {
    const e = esperaRef.current
    if (!e) return
    e.i++
    if (e.i >= e.acordes.length) {
      esperaRef.current = null
      terminar(true)
      return
    }
    const acorde = e.acordes[e.i]
    const ctx = contextoAudio()
    while (e.iAcomp < acomp.length && acomp[e.iAcomp].nota[0] <= acorde.inicio) {
      const { nota, pistaId, instrumento } = acomp[e.iAcomp]
      if (ctx) motor.tocarNotaEnPista(pistaId, instrumento, nota[2], nota[3], ctx.currentTime, Math.max(0.1, nota[1] * spbEf))
      e.iAcomp++
    }
    e.pendientes = new Set(acorde.tonos)
    posVirtualRef.current = acorde.inicio
    guia.fijarEsperadas(e.pendientes)
  }

  // Empezar pasa por una cuenta regresiva de 3 s (tiempo de poner las manos);
  // Parar durante la cuenta la cancela sin arrancar nada.
  const [cuenta, setCuenta] = useState<number | null>(null)
  const empezar = () => {
    if (cuenta == null) setCuenta(3)
  }
  useEffect(() => {
    if (cuenta == null) return
    // El último tic arranca directo (la cuenta nunca muestra 0).
    const id = window.setTimeout(() => {
      if (cuenta > 1) {
        setCuenta(cuenta - 1)
      } else {
        setCuenta(null)
        arrancar()
      }
    }, 1000)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo el tick de la cuenta
  }, [cuenta])

  // ─── Entrada del usuario (teclado en pantalla + QWERTY/MIDI del editor) ──
  const entrada = (tono: number, vel: number) => {
    // Suena por la primera pista que tocas tú (su instrumento).
    const pistaSonido = melodicas.find((p) => tocadas.has(p.pistaId)) ?? melodicas[0]
    if (pistaSonido) {
      const voz = motor.tocarEnVivo(pistaSonido.pistaId, pistaSonido.instrumento, tono, vel)
      if (voz) {
        vocesRef.current.get(tono)?.soltar()
        vocesRef.current.set(tono, voz)
      }
    }
    if (faseRef.current !== 'sonando') return
    const m = modoRef.current
    if (m === 'espera') {
      const e = esperaRef.current
      if (!e) return
      if (e.pendientes.has(tono)) {
        e.pendientes.delete(tono)
        statsRef.current.aciertos++
        guia.marcarGuiaTemporal(tono, 'acierto', 250)
        guia.fijarEsperadas(e.pendientes)
        if (e.pendientes.size === 0) avanzarEspera()
      } else {
        statsRef.current.extras++
        guia.marcarGuiaTemporal(tono, 'fallo', 250)
      }
      return
    }
    if (m === 'ritmo') {
      const ancla = anclaRef.current
      if (!ancla) return
      const paso = ancla.anclaPaso + (ancla.ctxRef + (performance.now() - ancla.perfRef) / 1000 - ancla.anclaT) / ancla.spb
      const ventana = VENTANA_S / spbEf
      let mejor = -1
      let mejorDist = Infinity
      for (let i = 0; i < notasTuya.length; i++) {
        if (consumidasRef.current.has(i) || notasTuya[i][2] !== tono) continue
        const dist = Math.abs(notasTuya[i][0] - paso)
        if (dist <= ventana && dist < mejorDist) {
          mejor = i
          mejorDist = dist
        }
        if (notasTuya[i][0] > paso + ventana) break
      }
      if (mejor >= 0) {
        consumidasRef.current.add(mejor)
        statsRef.current.aciertos++
        guia.marcarGuiaTemporal(tono, 'acierto', 250)
      } else {
        statsRef.current.extras++
        guia.marcarGuiaTemporal(tono, 'fallo', 250)
      }
    }
  }
  const finEntrada = (tono: number) => {
    vocesRef.current.get(tono)?.soltar()
    vocesRef.current.delete(tono)
  }
  const entradaRef = useRef(entrada)
  const finEntradaRef = useRef(finEntrada)
  useEffect(() => {
    entradaRef.current = entrada
    finEntradaRef.current = finEntrada
  })

  // El editor nos manda su QWERTY y su MIDI mientras esta vista viva.
  useEffect(() => {
    registrar({ entrada: (tono, vel) => entradaRef.current(tono, vel), fin: (tono) => finEntradaRef.current(tono) })
    return () => registrar(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registro único
  }, [])

  // rAF de la sesión: destellos de Escuchar, esperadas/perdidas de Ritmo.
  useEffect(() => {
    if (fase !== 'sonando' || modo === 'espera') return
    let id = 0
    const tick = () => {
      id = window.requestAnimationFrame(tick)
      const pos = motor.posicion()
      if (modo === 'escuchar') {
        const ctx = contextoAudio()
        const todas = todasRef.current
        const margen = 0.35 / spbEf // agenda el destello un pelín antes de sonar
        while (destelloRef.current < todas.length && todas[destelloRef.current][0] <= pos + margen) {
          const [inicio, dur, tono] = todas[destelloRef.current]
          if (ctx) sonando.destello(tono, Math.max(0, (inicio - pos) * spbEf * 1000), Math.max(120, dur * spbEf * 1000))
          destelloRef.current++
        }
        return
      }
      // Ritmo: marca las teclas que vienen y cuenta las notas que pasaron de largo.
      const esperadas = new Set<number>()
      const ventana = VENTANA_S / spbEf
      const aviso = AVISO_S / spbEf
      for (let i = 0; i < notasTuya.length; i++) {
        const nota = notasTuya[i]
        if (nota[0] > pos + aviso) break
        if (consumidasRef.current.has(i)) continue
        if (nota[0] + ventana < pos) {
          consumidasRef.current.add(i)
          statsRef.current.perdidas++
          guia.marcarGuiaTemporal(nota[2], 'fallo', 300)
        } else if (nota[0] >= pos - ventana) {
          esperadas.add(nota[2])
        }
      }
      guia.fijarEsperadas(esperadas)
    }
    id = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(id)
  }, [fase, modo, notasTuya, spbEf])

  const chip = (activo: boolean, onClick: () => void, contenido: ReactNode, titulo?: string) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      title={titulo}
      className={`ui-presion rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
        activo ? 'border-white/50 bg-white/20 text-white' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
      }`}
    >
      {contenido}
    </button>
  )

  const sonandoAhora = fase === 'sonando'
  const precision = (s: Stats) => Math.round((100 * s.aciertos) / Math.max(1, s.aciertos + s.perdidas + s.extras))

  if (melodicas.length === 0) {
    return (
      <div className="grid h-full place-items-center">
        <div className="space-y-3 text-center">
          <p className="text-sm text-white/60">
            {t('audio.practica.sinNotas', 'Este proyecto aún no tiene notas melódicas que practicar.')}
          </p>
          <BotonSecundario pequeno onClick={alVolver}>
            <Icono nombre="volver" /> {t('audio.practica.volver', 'Al estudio')}
          </BotonSecundario>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={alVolver}
          aria-label={t('audio.practica.volver', 'Al estudio')}
          title={t('audio.practica.volver', 'Al estudio')}
          className="ui-presion flex min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition hover:bg-white/10"
        >
          <Icono nombre="volver" /> <span className="truncate">{proyecto.nombre}</span>
        </button>
        <span className="flex-1" />
        {haySoporteMidi() && (
          <BotonSecundario pequeno onClick={onConectarMidi} className={midiNombre ? 'text-emerald-300' : ''}>
            <Icono nombre="piano" /> {midiNombre ?? t('audio.practica.midi', 'MIDI')}
          </BotonSecundario>
        )}
        {sonandoAhora || cuenta != null ? (
          <BotonPrimario
            pequeno
            app={COLOR}
            onClick={() => (cuenta != null ? setCuenta(null) : modo === 'espera' ? terminar(true) : motor.detener())}
          >
            <Icono nombre="detener" /> {t('audio.practica.parar', 'Parar')}
          </BotonPrimario>
        ) : (
          <BotonPrimario pequeno app={COLOR} onClick={empezar}>
            <Icono nombre="play" /> {t('audio.practica.empezar', 'Empezar')}
          </BotonPrimario>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex items-center gap-1">
          {chip(modo === 'escuchar', () => setModo('escuchar'), t('audio.practica.escuchar', 'Escuchar'))}
          {chip(modo === 'ritmo', () => setModo('ritmo'), t('audio.practica.ritmo', 'Ritmo'))}
          {chip(modo === 'espera', () => setModo('espera'), t('audio.practica.espera', 'Espera'))}
        </div>
        {melodicas.length > 1 && modo !== 'escuchar' && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-white/50">{t('audio.practica.tocas', 'Tocas tú')}</span>
            {melodicas.map((p) => {
              const idx = proyecto.pistas.findIndex((x) => x.pistaId === p.pistaId)
              return (
                <span key={p.pistaId}>
                  {chip(
                    tocadas.has(p.pistaId),
                    () => alternarTocada(p.pistaId),
                    <>
                      <span
                        className="me-1 inline-block h-2 w-2 rounded-full align-middle"
                        style={{ background: PALETA_PISTAS[idx % PALETA_PISTAS.length] }}
                      />
                      {p.nombre}
                    </>,
                  )}
                </span>
              )
            })}
          </div>
        )}
        {/* Velocidad: deslizador con topes cada 25 % (25..150). */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">{t('audio.practica.velocidad', 'Velocidad')}</span>
          <input
            type="range"
            min={25}
            max={150}
            step={25}
            value={velocidad}
            aria-label={t('audio.practica.velocidad', 'Velocidad')}
            onChange={(e) => {
              const v = Number(e.target.value)
              setVelocidad(v)
              motor.fijarVelocidad(v / 100) // en caliente: también a media reproducción
            }}
            className="w-28"
          />
          <span className="w-9 text-xs font-semibold tabular-nums">{velocidad}%</span>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {(() => {
          const carriles = melodicas.map((p) => {
            const idx = proyecto.pistas.findIndex((x) => x.pistaId === p.pistaId)
            return {
              notas: p.notas,
              color: PALETA_PISTAS[idx % PALETA_PISTAS.length],
              tuya: modo === 'escuchar' || tocadas.has(p.pistaId),
            }
          })
          const reloj = () => (modoRef.current === 'espera' ? posVirtualRef.current : motor.posicion())
          return conPartitura ? (
            <PartituraPractica carriles={carriles} spb={spbEf} pos={reloj} />
          ) : (
            <Cascada carriles={carriles} octava={octava} spb={spbEf} pos={reloj} />
          )
        })()}
        {cuenta != null && cuenta > 0 && (
          <div role="status" className="pointer-events-none absolute inset-0 grid place-items-center">
            <span key={cuenta} className="ui-pop text-8xl font-black tabular-nums" style={{ color: COLOR }}>
              {cuenta}
            </span>
          </div>
        )}
        {/* La pila de vistas sigue en su esquina: volver al roll, o alternar cascada ⇄ partitura. */}
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={alVolver}
            aria-label={t('audio.roll.verRoll', 'Ver el piano roll')}
            title={t('audio.roll.verRoll', 'Ver el piano roll')}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/50 text-white/70 transition hover:bg-black/70"
          >
            <Icono nombre="piano" />
          </button>
          <button
            type="button"
            onClick={() => setConPartitura((v) => !v)}
            aria-label={
              conPartitura ? t('audio.practica.verCascada', 'Ver la cascada') : t('audio.roll.verPartitura', 'Ver la partitura')
            }
            title={
              conPartitura ? t('audio.practica.verCascada', 'Ver la cascada') : t('audio.roll.verPartitura', 'Ver la partitura')
            }
            className={`grid h-8 w-8 place-items-center rounded-lg border transition ${
              conPartitura
                ? 'border-white/50 bg-white/25 text-white'
                : 'border-white/10 bg-black/50 text-white/70 hover:bg-black/70'
            }`}
          >
            <Icono nombre={conPartitura ? 'bajar' : 'metronomo'} />
          </button>
        </div>
      </div>
      <TecladoPantalla
        instrumento={melodicas.find((p) => tocadas.has(p.pistaId))?.instrumento ?? 'piano'}
        octava={octava}
        onOctava={onOctava}
        onNota={(tono, vel) => entrada(tono, vel)}
        onFin={finEntrada}
      />

      {fase === 'resumen' && resumen && (
        <Modal titulo={t('audio.practica.resumen', 'Resumen de la práctica')} onCerrar={() => setFase('listo')}>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-white/5 p-2">
              <p className="text-2xl font-bold text-emerald-300">{resumen.aciertos}</p>
              <p className="text-xs text-white/60">{t('audio.practica.aciertos', 'Aciertos')}</p>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <p className="text-2xl font-bold" style={{ color: COLOR }}>
                {precision(resumen)}%
              </p>
              <p className="text-xs text-white/60">{t('audio.practica.precision', 'Precisión')}</p>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <p className="text-2xl font-bold text-red-300">{resumen.perdidas}</p>
              <p className="text-xs text-white/60">{t('audio.practica.perdidas', 'Notas perdidas')}</p>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <p className="text-2xl font-bold text-amber-300">{resumen.extras}</p>
              <p className="text-xs text-white/60">{t('audio.practica.extras', 'Notas de más')}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <BotonSecundario pequeno onClick={() => setFase('listo')}>
              {t('audio.practica.cerrar', 'Cerrar')}
            </BotonSecundario>
            <BotonPrimario pequeno app={COLOR} onClick={empezar}>
              <Icono nombre="play" /> {t('audio.practica.repetir', 'Repetir')}
            </BotonPrimario>
          </div>
        </Modal>
      )}
    </div>
  )
}
