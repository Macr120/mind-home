import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { AjustesVivo, InstrumentoAudio } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR, TONOS_BATERIA, esInstrumentoBateria } from './constantes'
import { guiaStore } from './guia'
import { clasesDeEscala } from './musica'
import { cancionStore, sonandoStore } from './sonando'
import {
  ciclarBlancas,
  coloresTeclasStore,
  octavaMaxima,
  paletaTeclas,
  siguientesBlancas,
  tecladoVistaStore,
} from './tecladoVista'

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
/** La tira lleva una octava más por cada lado de las blancas visibles: al cambiar de octava el piano se DESLIZA hasta ella. */
const MARGEN = 7

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
  // Blancas visibles (2, 3 o 1 octavas): las cicla el botón sobre la flecha ›.
  const visibles = useSyncExternalStore(tecladoVistaStore.subscribe, tecladoVistaStore.getSnapshot)
  const tira = visibles + 2 * MARGEN
  /** Desplazamiento de reposo de la tira (% de su propio ancho): oculta la octava de la izquierda. */
  const reposo = -(MARGEN / tira) * 100
  const octavaTope = octavaMaxima(visibles)
  // Con más octavas a la vista, la más alta cabe menos arriba: se recorta (la octava es del editor).
  useEffect(() => {
    if (octava > octavaTope) onOctava(octavaTope)
  }, [octava, octavaTope, onOctava])
  // La tira ya está pintada para la octava nueva: arranca desplazada donde
  // quedaba la vieja y se desliza hasta su reposo (solo en saltos de UNA octava;
  // otro salto —la práctica fija la suya al entrar— se planta sin animar).
  useLayoutEffect(() => {
    const salto = octava - octavaPrev.current
    octavaPrev.current = octava
    const el = tiraRef.current
    if (!el || Math.abs(salto) !== 12 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.style.transition = 'none'
    el.style.transform = `translateX(${reposo + (salto / 12) * (MARGEN / tira) * 100}%)`
    void el.offsetWidth
    el.style.transition = 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)'
    el.style.transform = `translateX(${reposo}%)`
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo el salto de octava anima
  }, [octava])
  // Tonos que SUENAN (acorde expandido, notas del arpegio, MIDI): ilumina esas teclas.
  const sonando = useSyncExternalStore(sonandoStore.subscribe, sonandoStore.getSnapshot)
  // Notas de la canción en la práctica «Escuchar»: se iluminan de OTRO color.
  const cancion = useSyncExternalStore(cancionStore.subscribe, cancionStore.getSnapshot)
  // Guía de práctica (vacía fuera de Aprender): esperada/acierto/fallo por tono.
  const guia = useSyncExternalStore(guiaStore.subscribe, guiaStore.getSnapshot)
  const clases = useMemo(() => (escala ? clasesDeEscala(escala) : null), [escala])
  const fuera = (tono: number) => clases != null && !clases.has(((tono % 12) + 12) % 12)
  const esTonica = (tono: number) => escala != null && ((tono % 12) + 12) % 12 === escala.tonica
  const activa = (tono: number) => pulsadas.has(tono) || sonando.has(tono)
  // Color de reposo de las teclas (claro, oscuro o personalizado): va en el
  // style; los estados (pulsada, guía de práctica) siguen siendo clases encima.
  const paleta = paletaTeclas(useSyncExternalStore(coloresTeclasStore.subscribe, coloresTeclasStore.getSnapshot))
  const claseBlanca = (tono: number) => {
    if (activa(tono)) return 'bg-amber-200'
    if (cancion.has(tono)) return 'bg-violet-300'
    const g = guia.get(tono)
    return g ? GUIA_BLANCA[g] : ''
  }
  const estiloBlanca = (tono: number) =>
    activa(tono) || cancion.has(tono) || guia.get(tono)
      ? undefined
      : { background: fuera(tono) ? `color-mix(in srgb, ${paleta.blancas} 40%, transparent)` : paleta.blancas }
  const claseNegra = (tono: number) => {
    if (activa(tono)) return 'bg-zinc-500'
    if (cancion.has(tono)) return 'bg-violet-600'
    const g = guia.get(tono)
    return g ? GUIA_NEGRA[g] : ''
  }
  const estiloNegra = (tono: number) =>
    activa(tono) || cancion.has(tono) || guia.get(tono) ? undefined : { background: paleta.negras }

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

  // La tira entera: una octava oculta a cada lado de las blancas visibles.
  const base = octava - 12
  const blancas = Array.from({ length: tira }, (_, i) => base + Math.floor(i / 7) * 12 + BLANCAS[i % 7])
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
          style={{ width: `${(tira / visibles) * 100}%`, transform: `translateX(${reposo}%)` }}
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
                style={estiloBlanca(tono)}
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
                      style={estiloNegra(tonoNegra)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="flex w-8 shrink-0 flex-col gap-1">
        {/* Un solo botón cíclico: 2 → 3 → 1 octavas; el icono anuncia si vienen más o menos teclas. */}
        <button
          type="button"
          onClick={ciclarBlancas}
          aria-label={t('audio.teclado.tamano', 'Tamaño del piano')}
          title={t('audio.teclado.tamano', 'Tamaño del piano')}
          className="ui-presion grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/10 text-white/70 transition hover:bg-white/20"
        >
          <Icono nombre={siguientesBlancas(visibles) > visibles ? 'acercar' : 'alejar'} />
        </button>
        <button
          type="button"
          onClick={() => onOctava(Math.min(octavaTope, octava + 12))}
          aria-label={t('audio.teclado.octavaMas', 'Octava arriba')}
          title={t('audio.teclado.octavaMas', 'Octava arriba')}
          className="min-h-0 flex-1 rounded-lg border border-white/10 bg-white/10 text-white/70 transition hover:bg-white/20"
        >
          <Icono nombre="siguiente" />
        </button>
      </div>
    </div>
  )
}
