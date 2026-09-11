import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { AjustesVivo, InstrumentoAudio } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR, TONOS_BATERIA, esInstrumentoBateria } from './constantes'
import { guiaStore } from './guia'
import { clasesDeEscala } from './musica'
import { sonandoStore } from './sonando'

// Colores de la guía de práctica (Aprender): esperada / acierto / fallo.
const GUIA_BLANCA = { esperada: 'bg-sky-300', acierto: 'bg-emerald-300', fallo: 'bg-red-300' } as const
const GUIA_NEGRA = { esperada: 'bg-sky-600', acierto: 'bg-emerald-600', fallo: 'bg-red-600' } as const

/**
 * Teclado táctil de 2 octavas (o 4 pads con la batería): el fallback sin
 * hardware y el camino de prueba del MISMO flujo que el MIDI — alimenta
 * `tocarEnVivo` y la grabación con `performance.now()`.
 */

/** Blancas de una octava (semitonos sobre C) y la negra que cuelga de cada una. */
const BLANCAS = [0, 2, 4, 5, 7, 9, 11]
const NEGRA_TRAS: Record<number, number | undefined> = { 0: 1, 2: 3, 5: 6, 7: 8, 9: 10 }
/** Blancas en pantalla: dos octavas y la tónica siguiente (`Cascada` replica esta geometría). */
const VISIBLES = 15
/** La tira lleva una octava más por cada lado: al cambiar de octava el piano se DESLIZA hasta ella. */
const MARGEN = 7
const TIRA = VISIBLES + 2 * MARGEN
/** Desplazamiento de reposo de la tira (% de su propio ancho): oculta la octava de la izquierda. */
const REPOSO = -(MARGEN / TIRA) * 100

export function TecladoPantalla({
  instrumento,
  octava,
  onOctava,
  escala,
  velocidad = 100,
  onNota,
  onFin,
  esquina,
}: {
  instrumento: InstrumentoAudio
  /** Tono MIDI de la primera tecla (lo posee el editor: sincroniza panel y ‹ ›). */
  octava: number
  onOctava: (v: number) => void
  escala?: AjustesVivo['escala']
  /** Velocidad de la pulsación (la fija el chip «Fuerza» de la batería). */
  velocidad?: number
  onNota: (tono: number, vel: number) => void
  onFin: (tono: number) => void
  /** Control que se cuela sobre la flecha izquierda (el botón de los ajustes plegados). */
  esquina?: React.ReactNode
}) {
  const t = useT()
  const [pulsadas, setPulsadas] = useState<Set<number>>(new Set)
  const tiraRef = useRef<HTMLDivElement>(null)
  const octavaPrev = useRef(octava)
  // La tira ya está pintada para la octava nueva: arranca desplazada donde
  // quedaba la vieja y se desliza hasta su reposo (solo en saltos de UNA octava;
  // otro salto —la práctica fija la suya al entrar— se planta sin animar).
  useLayoutEffect(() => {
    const salto = octava - octavaPrev.current
    octavaPrev.current = octava
    const tira = tiraRef.current
    if (!tira || Math.abs(salto) !== 12 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    tira.style.transition = 'none'
    tira.style.transform = `translateX(${REPOSO + (salto / 12) * (MARGEN / TIRA) * 100}%)`
    void tira.offsetWidth
    tira.style.transition = 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)'
    tira.style.transform = `translateX(${REPOSO}%)`
  }, [octava])
  // Tonos que SUENAN (acorde expandido, notas del arpegio): ilumina esas teclas.
  const sonando = useSyncExternalStore(sonandoStore.subscribe, sonandoStore.getSnapshot)
  // Guía de práctica (vacía fuera de Aprender): esperada/acierto/fallo por tono.
  const guia = useSyncExternalStore(guiaStore.subscribe, guiaStore.getSnapshot)
  const clases = useMemo(() => (escala ? clasesDeEscala(escala) : null), [escala])
  const fuera = (tono: number) => clases != null && !clases.has(((tono % 12) + 12) % 12)
  const esTonica = (tono: number) => escala != null && ((tono % 12) + 12) % 12 === escala.tonica
  const activa = (tono: number) => pulsadas.has(tono) || sonando.has(tono)
  const claseBlanca = (tono: number) => {
    if (activa(tono)) return 'bg-amber-200'
    const g = guia.get(tono)
    if (g) return GUIA_BLANCA[g]
    return fuera(tono) ? 'bg-white/40' : 'bg-white'
  }
  const claseNegra = (tono: number) => {
    if (activa(tono)) return 'bg-zinc-500'
    const g = guia.get(tono)
    return g ? GUIA_NEGRA[g] : 'bg-zinc-900'
  }

  const bajar = (tono: number) => (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setPulsadas((s) => new Set(s).add(tono))
    onNota(tono, velocidad)
  }
  const soltar = (tono: number) => () => {
    setPulsadas((s) => {
      const n = new Set(s)
      n.delete(tono)
      return n
    })
    onFin(tono)
  }

  if (esInstrumentoBateria(instrumento)) {
    const nombres: Record<number, string> = {
      36: t('audio.teclado.bombo', 'Bombo'),
      38: t('audio.teclado.caja', 'Caja'),
      42: t('audio.teclado.hat', 'Hi-hat'),
      46: t('audio.teclado.hatAbierto', 'Hat abierto'),
      39: t('audio.teclado.palmada', 'Palmada'),
      41: t('audio.teclado.tomGrave', 'Tom grave'),
      48: t('audio.teclado.tomAgudo', 'Tom agudo'),
      49: t('audio.teclado.platillo', 'Platillo'),
    }
    return (
      <div className="flex shrink-0 gap-1.5" style={{ touchAction: 'none' }}>
        {esquina && <div className="flex w-8 shrink-0 flex-col">{esquina}</div>}
        <div className="grid min-w-0 flex-1 grid-cols-4 gap-2">
          {TONOS_BATERIA.map((tono) => (
            <button
              key={tono}
              type="button"
              onPointerDown={bajar(tono)}
              onPointerUp={soltar(tono)}
              onPointerCancel={soltar(tono)}
              className={`h-16 rounded-xl border text-xs font-semibold transition ${
                pulsadas.has(tono) ? 'border-white/60 bg-white/25' : 'border-white/10 bg-white/10 hover:bg-white/15'
              }`}
            >
              {nombres[tono]}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // La tira entera: una octava oculta a cada lado de las 15 blancas visibles.
  const base = octava - 12
  const blancas = [...Array.from({ length: 4 }, (_, o) => BLANCAS.map((s) => base + o * 12 + s)).flat(), base + 48]
  return (
    <div className="flex shrink-0 items-stretch gap-1.5" style={{ touchAction: 'none' }}>
      <div className="flex w-8 shrink-0 flex-col gap-1">
        {esquina}
        <button
          type="button"
          onClick={() => onOctava(Math.max(24, octava - 12))}
          aria-label={t('audio.teclado.octavaMenos', 'Octava abajo')}
          title={t('audio.teclado.octavaMenos', 'Octava abajo')}
          className="min-h-0 flex-1 rounded-lg border border-white/10 bg-white/10 text-white/70 transition hover:bg-white/20"
        >
          <Icono nombre="volver" />
        </button>
      </div>
      <div className="relative h-24 min-w-0 flex-1 overflow-hidden">
        <div
          ref={tiraRef}
          className="absolute inset-y-0 left-0 will-change-transform"
          style={{ width: `${(TIRA / VISIBLES) * 100}%`, transform: `translateX(${REPOSO}%)` }}
        >
          <div className="flex h-full gap-px">
            {blancas.map((tono) => (
              <button
                key={tono}
                type="button"
                aria-label={t('audio.teclado.tecla', 'Tecla')}
                onPointerDown={bajar(tono)}
                onPointerUp={soltar(tono)}
                onPointerCancel={soltar(tono)}
                className={`relative min-w-0 flex-1 rounded-b-md border border-black/40 transition ${claseBlanca(tono)}`}
              >
                {esTonica(tono) && (
                  <span
                    className="pointer-events-none absolute inset-x-0 bottom-1 mx-auto h-1.5 w-1.5 rounded-full"
                    style={{ background: COLOR }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[58%] gap-px">
            {blancas.map((tono, i) => {
              const semitono = ((tono % 12) + 12) % 12
              const negra = NEGRA_TRAS[semitono]
              const tonoNegra = negra != null ? tono - semitono + negra : null
              return (
                <div key={tono} className="relative min-w-0 flex-1">
                  {tonoNegra != null && i < blancas.length - 1 && (
                    <button
                      type="button"
                      aria-label={t('audio.teclado.negra', 'Tecla negra')}
                      onPointerDown={bajar(tonoNegra)}
                      onPointerUp={soltar(tonoNegra)}
                      onPointerCancel={soltar(tonoNegra)}
                      className={`pointer-events-auto absolute -right-[30%] top-0 z-10 h-full w-[60%] rounded-b-md border border-black/60 transition ${claseNegra(tonoNegra)} ${fuera(tonoNegra) ? 'opacity-40' : ''}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onOctava(Math.min(84, octava + 12))}
        aria-label={t('audio.teclado.octavaMas', 'Octava arriba')}
        title={t('audio.teclado.octavaMas', 'Octava arriba')}
        className="w-8 rounded-lg border border-white/10 bg-white/10 text-white/70 transition hover:bg-white/20"
      >
        <Icono nombre="siguiente" />
      </button>
    </div>
  )
}
