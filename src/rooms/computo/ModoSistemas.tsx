import { useMemo, useState, type ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'
import { COLOR, MAX_ECUACIONES, MIN_ECUACIONES } from './constantes'
import { CabeceraModo } from './ModoCampos'
import type { Motor } from './motor'
import { normalizarEcuacion, resolverSistema } from './resolver'
import { TecladoMath } from './TecladoMath'

/**
 * Sistemas de ecuaciones LINEALES, tantas ecuaciones como incógnitas.
 *
 * Las incógnitas no se piden: se leen de lo que escribes y se enseñan en chips,
 * porque adivinarlas mal en silencio es la peor forma de dar un resultado
 * equivocado. El método (armar la matriz evaluando cada ecuación y resolver por
 * LU) ya vive en `resolver.ts`; aquí solo está la pantalla.
 */
export function ModoSistemas({ motor, selector }: { motor: Motor | null; selector: ReactNode }) {
  const t = useT()
  const [ecuaciones, setEcuaciones] = useState<string[]>(['x + y = 10', 'x - y = 2'])
  const [foco, setFoco] = useState(0)
  const [salida, setSalida] = useState<{ incognitas: string[]; valores: number[] } | null>(null)
  const [aviso, setAviso] = useState('')

  const escribir = (i: number, v: string) => {
    setEcuaciones((es) => es.map((e, j) => (j === i ? v : e)))
    setSalida(null)
    setAviso('')
  }

  /** Los símbolos libres de todas las ecuaciones, en el orden en que aparecen. */
  const incognitas = useMemo(() => {
    if (!motor) return []
    const vistos: string[] = []
    for (const cruda of ecuaciones) {
      if (!cruda.trim()) continue
      try {
        for (const s of motor.simbolos(normalizarEcuacion(cruda))) {
          if (!vistos.includes(s)) vistos.push(s)
        }
      } catch {
        // Una ecuación a medio escribir no debe borrar los chips de las demás.
      }
    }
    return vistos
  }, [motor, ecuaciones])

  const usables = ecuaciones.filter((e) => e.trim())
  const cuadra = incognitas.length > 0 && usables.length === incognitas.length

  const resolver = () => {
    if (!motor || !cuadra) return
    const valores = resolverSistema(motor, usables, incognitas)
    if (!valores) {
      setSalida(null)
      setAviso(
        t(
          'computo.sistema.sinSolucion',
          'No tiene una solución única: o las ecuaciones se repiten, o se contradicen, o alguna no es lineal.',
        ),
      )
      return
    }
    setAviso('')
    setSalida({ incognitas, valores })
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <CabeceraModo selector={selector} />

      <div className="space-y-1.5">
        {ecuaciones.map((e, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-4 shrink-0 text-center font-mono text-[11px] text-white/30">{i + 1}</span>
            <input
              value={e}
              onFocus={() => setFoco(i)}
              onChange={(ev) => escribir(i, ev.target.value)}
              placeholder={t('computo.sistema.placeholder', '2x + 3y = 12')}
              spellCheck={false}
              aria-label={t('computo.sistema.ecuacion', 'Ecuación {n}', { n: String(i + 1) })}
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2.5 py-2 font-mono text-sm outline-none focus:border-accent"
            />
            {ecuaciones.length > MIN_ECUACIONES && (
              <button
                type="button"
                onClick={() => {
                  setEcuaciones((es) => es.filter((_, j) => j !== i))
                  setSalida(null)
                }}
                className="shrink-0 rounded-lg bg-white/5 px-2 py-2 text-white/50 transition hover:bg-white/10"
                title={t('computo.sistema.quitar', 'Quitar esta ecuación')}
                aria-label={t('computo.sistema.quitar', 'Quitar esta ecuación')}
              >
                <Icono nombre="quitar" />
              </button>
            )}
          </div>
        ))}
      </div>

      {ecuaciones.length < MAX_ECUACIONES && (
        <button
          type="button"
          onClick={() => setEcuaciones((es) => [...es, ''])}
          className="w-full rounded-lg bg-white/5 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/10"
        >
          <Icono nombre="agregar" /> {t('computo.sistema.otra', 'Otra ecuación')}
        </button>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="shrink-0 text-white/45">{t('computo.sistema.incognitas', 'Incógnitas')}</span>
        {incognitas.length === 0 ? (
          <span className="text-white/30">{t('computo.sistema.ninguna', 'ninguna todavía')}</span>
        ) : (
          incognitas.map((s) => (
            <span key={s} className="rounded-lg bg-white/10 px-2 py-0.5 font-mono font-semibold text-white/80">
              {s}
            </span>
          ))
        )}
      </div>

      {/* Escribe al final de la ecuación enfocada. El índice se acota: quitar
          una fila mientras estaba enfocada dejaría `foco` fuera de la lista. */}
      <TecladoMath
        motor={motor}
        onInsertar={(x) => {
          const i = Math.min(foco, ecuaciones.length - 1)
          escribir(i, (ecuaciones[i] ?? '') + x.replace('$0', ''))
        }}
      />

      <button
        type="button"
        onClick={resolver}
        disabled={!cuadra}
        className="ui-accent-bg w-full rounded-lg py-2 text-xs font-semibold transition disabled:opacity-40"
      >
        <Icono nombre="raiz" /> {t('computo.sistema.resolver', 'Resolver')}
      </button>

      {!cuadra && incognitas.length > 0 && (
        <p className="text-[11px] leading-relaxed text-white/40">
          {t('computo.sistema.descuadra', 'Hacen falta tantas ecuaciones como incógnitas: {e} y {i} ahora mismo.', {
            e: String(usables.length),
            i: String(incognitas.length),
          })}
        </p>
      )}

      {aviso && <p className="rounded-xl bg-black/25 px-3 py-2 text-xs text-white/55">{aviso}</p>}

      {salida && (
        <div className="space-y-1 rounded-xl bg-black/25 p-3">
          {salida.incognitas.map((s, i) => (
            <p key={s} className="flex items-baseline gap-2">
              <span className="shrink-0 font-mono text-sm text-white/55">{s} =</span>
              <span className="texto-vivo min-w-0 flex-1 truncate font-mono text-lg font-bold" style={vivo(COLOR)}>
                {motor ? motor.formatear(salida.valores[i]) : salida.valores[i]}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
