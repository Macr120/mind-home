import { useEffect, useRef } from 'react'
import type { DireccionTransicion, TipoTransicion, Transicion } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Campo } from '../_shared/ui'
import { DURACIONES_TRANSICION, DUR_FUNDIDO, DUR_TRANSICION } from './constantes'
import { pintarTransicion } from './render'
import { Chip } from './Secciones'

const TIPOS: TipoTransicion[] = ['corte', 'fundido', 'disolver', 'deslizar', 'barrido', 'zoom', 'desenfoque']
const DIRECCIONES: DireccionTransicion[] = ['izq', 'der', 'arriba', 'abajo']

/** Dos tarjetas de color plano (una vez por módulo) entre las que se previsualiza cada transición. */
let fuentes: [HTMLCanvasElement, HTMLCanvasElement] | null = null
function fuentesMuestra(): [HTMLCanvasElement, HTMLCanvasElement] {
  if (fuentes) return fuentes
  const crear = (color: string) => {
    const c = document.createElement('canvas')
    c.width = 48
    c.height = 27
    const ctx = c.getContext('2d')
    if (ctx) {
      ctx.fillStyle = color
      ctx.fillRect(0, 0, 48, 27)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillRect(8, 8, 32, 11)
    }
    return c
  }
  fuentes = [crear('#f87171'), crear('#38bdf8')]
  return fuentes
}

/** Mini-canvas que reproduce la transición al pasar el ratón o tocar (0.7 s); quieto, enseña el punto medio. */
function TransicionMuestra({ tipo, dir }: { tipo: TipoTransicion; dir: DireccionTransicion }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (ctx) {
      const [a, b] = fuentesMuestra()
      pintarTransicion(ctx, tipo, tipo === 'corte' ? 1 : 0.5, a, b, dir)
    }
    return () => cancelAnimationFrame(raf.current)
  }, [tipo, dir])
  const reproducir = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    cancelAnimationFrame(raf.current)
    const t0 = performance.now()
    const paso = (ahora: number) => {
      const ctx = ref.current?.getContext('2d')
      if (!ctx) return
      const p = Math.min(1, (ahora - t0) / 700)
      const [a, b] = fuentesMuestra()
      pintarTransicion(ctx, tipo, p, a, b, dir)
      if (p < 1) raf.current = requestAnimationFrame(paso)
    }
    raf.current = requestAnimationFrame(paso)
  }
  return (
    <canvas
      ref={ref}
      width={48}
      height={27}
      aria-hidden
      onPointerEnter={reproducir}
      onPointerDown={reproducir}
      className="h-[27px] w-12 rounded bg-black"
    />
  )
}

/** La biblioteca básica de transiciones de entrada del clip principal. */
export function RejillaTransiciones({
  valor,
  esPrimero,
  onCambiar,
}: {
  valor: Transicion | undefined
  /** El primer clip solo admite corte o fundido desde negro. */
  esPrimero: boolean
  onCambiar: (tr: Transicion | undefined) => void
}) {
  const t = useT()
  const nombre: Record<TipoTransicion, string> = {
    corte: t('video.escena.corte', 'Corte'),
    fundido: t('video.escena.fundido', 'Fundido'),
    disolver: t('video.transicion.disolver', 'Disolver'),
    deslizar: t('video.transicion.deslizar', 'Deslizar'),
    barrido: t('video.transicion.barrido', 'Barrido'),
    zoom: t('video.transicion.zoom', 'Zoom'),
    desenfoque: t('video.transicion.desenfoque', 'Desenfoque'),
  }
  const nombreDir: Record<DireccionTransicion, string> = {
    izq: t('video.direccion.izq', 'Izquierda'),
    der: t('video.direccion.der', 'Derecha'),
    arriba: t('video.escena.arriba', 'Arriba'),
    abajo: t('video.escena.abajo', 'Abajo'),
  }
  const tipo = valor?.tipo ?? 'corte'
  const dir = valor?.direccion ?? 'izq'
  const conDireccion = tipo === 'deslizar' || tipo === 'barrido'
  return (
    <Campo etiqueta={t('video.escena.transicion', 'Transición de entrada')}>
      <div className="grid grid-cols-4 gap-1.5">
        {TIPOS.map((tp) => (
          <button
            key={tp}
            type="button"
            aria-pressed={tipo === tp}
            disabled={esPrimero && tp !== 'corte' && tp !== 'fundido'}
            onClick={() => onCambiar(tp === 'corte' ? undefined : { ...valor, tipo: tp })}
            className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 text-[10px] transition disabled:opacity-30 ${
              tipo === tp ? 'border-white/60 bg-white/20' : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <TransicionMuestra tipo={tp} dir={dir} />
            {nombre[tp]}
          </button>
        ))}
      </div>
      {tipo !== 'corte' && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {conDireccion &&
            DIRECCIONES.map((d) => (
              <Chip key={d} activo={dir === d} onClick={() => onCambiar({ ...valor, tipo, direccion: d })}>
                {nombreDir[d]}
              </Chip>
            ))}
          {conDireccion && <span className="mx-1 h-4 w-px bg-white/10" />}
          {DURACIONES_TRANSICION.map((d) => (
            <Chip
              key={d}
              activo={(valor?.duracion ?? (tipo === 'fundido' ? DUR_FUNDIDO : DUR_TRANSICION)) === d}
              onClick={() => onCambiar({ ...valor, tipo, duracion: d })}
            >
              {d}s
            </Chip>
          ))}
        </div>
      )}
    </Campo>
  )
}
