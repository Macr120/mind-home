import { useMemo, useState, useSyncExternalStore } from 'react'
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

export function TecladoPantalla({
  instrumento,
  octava,
  onOctava,
  escala,
  velocidad = 100,
  onNota,
  onFin,
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
}) {
  const t = useT()
  const [pulsadas, setPulsadas] = useState<Set<number>>(new Set)
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
      <div className="grid shrink-0 grid-cols-4 gap-2" style={{ touchAction: 'none' }}>
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
    )
  }

  const blancas = [...BLANCAS.map((s) => octava + s), ...BLANCAS.map((s) => octava + 12 + s), octava + 24]
  return (
    <div className="flex shrink-0 items-stretch gap-1.5" style={{ touchAction: 'none' }}>
      <button
        type="button"
        onClick={() => onOctava(Math.max(24, octava - 12))}
        aria-label={t('audio.teclado.octavaMenos', 'Octava abajo')}
        title={t('audio.teclado.octavaMenos', 'Octava abajo')}
        className="w-8 rounded-lg border border-white/10 bg-white/10 text-white/70 transition hover:bg-white/20"
      >
        <Icono nombre="volver" />
      </button>
      <div className="relative h-24 min-w-0 flex-1">
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
