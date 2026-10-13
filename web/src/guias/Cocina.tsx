import { useEffect, useState } from 'react'
import type { T } from './datos'

/**
 * Lo propio de la guía de Cocina: sus mini-herramientas y sus gráficas. Como
 * las de Ejercicio, con `demo` (su línea suena en modo grabación) se usan solas
 * para que el video las enseñe funcionando.
 */
export const HERRAMIENTAS_COCINA = new Set(['calculadoraEnergia', 'armaTuPlato', 'azucarOculta'])

export function HerramientaCocina({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  if (id === 'calculadoraEnergia') return <CalculadoraEnergia t={t} demo={demo} />
  if (id === 'armaTuPlato') return <ArmaTuPlato t={t} demo={demo} />
  if (id === 'azucarOculta') return <AzucarOculta t={t} demo={demo} />
  return null
}

/** Va aplicando `pasos` cada `ms` mientras `demo` está activo (como `useDemo` de las de Ejercicio). */
function useDemo<V>(demo: boolean, pasos: V[], ms: number, aplicar: (v: V) => void) {
  useEffect(() => {
    if (!demo) return
    let i = 0
    const id = setInterval(() => {
      if (i < pasos.length) aplicar(pasos[i++])
    }, ms)
    return () => clearInterval(id)
    // Los pasos son literales de quien llama: solo importa encender/apagar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo])
}

const ACTIVIDAD = [1.2, 1.375, 1.55, 1.725]

function CalculadoraEnergia({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`cocina.energia.${s}`)
  const [sexo, setSexo] = useState<'mujer' | 'hombre'>('mujer')
  const [edad, setEdad] = useState(30)
  const [peso, setPeso] = useState(65)
  const [estatura, setEstatura] = useState(165)
  const [act, setAct] = useState(1)
  useDemo<() => void>(
    demo,
    [() => setPeso(70), () => setEstatura(170), () => setAct(2), () => setSexo('hombre'), () => setPeso(78), () => setAct(1)],
    1500,
    (f) => f(),
  )
  // Mifflin-St Jeor: 10·kg + 6,25·cm − 5·años + 5 (hombres) o − 161 (mujeres).
  const basal = Math.round(10 * peso + 6.25 * estatura - 5 * edad + (sexo === 'hombre' ? 5 : -161))
  const total = Math.round(basal * ACTIVIDAD[act])
  const numero = (v: number, set: (n: number) => void, min: number, max: number, unidad: string, etiqueta: string) => (
    <label className="g-campo">
      <span>{etiqueta}</span>
      <input type="number" min={min} max={max} value={v} onChange={(e) => set(Math.max(min, Math.min(max, Number(e.target.value) || 0)))} />
      <span>{unidad}</span>
    </label>
  )
  return (
    <div className="g-herramienta">
      <h4>{k('titulo')}</h4>
      <div className="g-opciones">
        <label>
          <span>{k('sexo')}</span>
          <div className="g-segmentos">
            {(['mujer', 'hombre'] as const).map((s) => (
              <button key={s} type="button" className={s === sexo ? 'activo' : ''} onClick={() => setSexo(s)}>
                {k(s)}
              </button>
            ))}
          </div>
        </label>
        <div className="g-campos">
          {numero(edad, setEdad, 15, 100, k('anios'), k('edad'))}
          {numero(peso, setPeso, 30, 250, 'kg', k('peso'))}
          {numero(estatura, setEstatura, 120, 230, 'cm', k('estatura'))}
        </div>
        <label>
          <span>{k('actividad')}</span>
          <div className="g-segmentos g-segmentos-anchos">
            {ACTIVIDAD.map((_, i) => (
              <button key={i} type="button" className={i === act ? 'activo' : ''} onClick={() => setAct(i)}>
                {k(`a${i + 1}`)}
              </button>
            ))}
          </div>
        </label>
      </div>
      <dl className="g-resultados">
        <div>
          <dt>{k('basal')}</dt>
          <dd>
            {basal} <small>{k('kcal')}</small>
          </dd>
        </div>
        <div className="g-resultado-fuerte">
          <dt>{k('total')}</dt>
          <dd>
            {total} <small>{k('kcal')}</small>
          </dd>
        </div>
        <div>
          <dt>{k('bajar')}</dt>
          <dd>
            {Math.round(total * 0.85)} <small>{k('kcal')}</small>
          </dd>
        </div>
        <div>
          <dt>{k('proteina')}</dt>
          <dd>
            {Math.round(peso * 0.8)}–{Math.round(peso * 2)} <small>{k('gDia')}</small>
          </dd>
        </div>
      </dl>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

type Grupo = 'verduras' | 'cereales' | 'proteina'
const ALIMENTOS: { id: string; grupo: Grupo }[] = [
  { id: 'brocoli', grupo: 'verduras' },
  { id: 'ensalada', grupo: 'verduras' },
  { id: 'jitomate', grupo: 'verduras' },
  { id: 'manzana', grupo: 'verduras' },
  { id: 'arroz', grupo: 'cereales' },
  { id: 'tortilla', grupo: 'cereales' },
  { id: 'avena', grupo: 'cereales' },
  { id: 'pollo', grupo: 'proteina' },
  { id: 'frijoles', grupo: 'proteina' },
  { id: 'huevo', grupo: 'proteina' },
  { id: 'pescado', grupo: 'proteina' },
]
const COLOR: Record<Grupo, string> = { verduras: 'var(--verde)', cereales: 'var(--amarillo)', proteina: 'var(--marca-rojo)' }
const IDEAL: Record<Grupo, number> = { verduras: 0.5, cereales: 0.25, proteina: 0.25 }

/** Sector circular del plato (radio `r`, de la fracción `a` a la `b` de la vuelta). */
function sector(a: number, b: number, r: number) {
  if (b - a >= 0.999) return `M 100 ${100 - r} A ${r} ${r} 0 1 1 99.99 ${100 - r} Z`
  const p = (f: number) => [100 + r * Math.sin(f * 2 * Math.PI), 100 - r * Math.cos(f * 2 * Math.PI)].join(' ')
  return `M 100 100 L ${p(a)} A ${r} ${r} 0 ${b - a > 0.5 ? 1 : 0} 1 ${p(b)} Z`
}

function ArmaTuPlato({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`cocina.plato.${s}`)
  const [servido, setServido] = useState<string[]>([])
  useDemo(demo, ['pollo', 'arroz', 'brocoli', 'ensalada', 'jitomate'], 1100, (id) => setServido((s) => [...s, id]))
  const cuenta: Record<Grupo, number> = { verduras: 0, cereales: 0, proteina: 0 }
  for (const id of servido) cuenta[ALIMENTOS.find((a) => a.id === id)!.grupo]++
  const n = servido.length
  // Qué le falta respecto del plato saludable (con tolerancia de un octavo).
  const falta = (['verduras', 'cereales', 'proteina'] as Grupo[]).find((g) => n && cuenta[g] / n < IDEAL[g] - 0.125)
  const mensaje = !n ? k('vacio') : falta === 'verduras' ? k('masVerdura') : falta === 'cereales' ? k('masCereal') : falta === 'proteina' ? k('masProteina') : k('bien')
  let acc = 0
  return (
    <div className="g-herramienta">
      <h4>{k('titulo')}</h4>
      <p className="g-sub">{k('instruccion')}</p>
      <div className="g-plato">
        <svg viewBox="0 0 200 200" role="img" aria-label={k('titulo')}>
          <circle cx="100" cy="100" r="96" className="g-plato-borde" />
          <circle cx="100" cy="100" r="84" className="g-plato-fondo" />
          {(['verduras', 'cereales', 'proteina'] as Grupo[]).map((g) => {
            if (!cuenta[g]) return null
            const de = acc
            acc += cuenta[g] / n
            return <path key={g} d={sector(de, acc, 82)} fill={COLOR[g]} className="g-plato-sector" />
          })}
          {/* El plato saludable, punteado: la mitad y los dos cuartos. */}
          <path d="M 100 16 L 100 184 M 100 100 L 184 100" className="g-plato-guia" />
        </svg>
        <ul className="g-leyenda">
          {(['verduras', 'cereales', 'proteina'] as Grupo[]).map((g) => (
            <li key={g}>
              <i style={{ background: COLOR[g] }} />
              {k(g)} <b>{n ? Math.round((cuenta[g] / n) * 100) : 0} %</b>
            </li>
          ))}
        </ul>
      </div>
      <div className="g-chips">
        {ALIMENTOS.map((a) => (
          <button key={a.id} type="button" style={{ ['--c' as string]: COLOR[a.grupo], borderInlineStartWidth: 4 }} onClick={() => setServido((s) => [...s, a.id])}>
            {k(a.id)}
          </button>
        ))}
        {n > 0 && (
          <button type="button" className="g-chip-vaciar" onClick={() => setServido([])}>
            {k('vaciar')}
          </button>
        )}
      </div>
      <p className={`g-nota${n && !falta ? ' g-ok' : ''}`}>{mensaje}</p>
      <p className="g-nota">{k('ideal')}</p>
    </div>
  )
}

/** Gramos de azúcar aproximados de cada bebida (etiquetas comunes). */
const BEBIDAS = [
  { id: 'refresco', g: 39 },
  { id: 'jugo', g: 22 },
  { id: 'isotonica', g: 36 },
  { id: 'frappe', g: 52 },
  { id: 'chocolate', g: 25 },
  { id: 'agua', g: 0 },
]

function AzucarOculta({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`cocina.azucar.${s}`)
  const [sel, setSel] = useState('refresco')
  useDemo(demo, ['jugo', 'frappe', 'isotonica', 'refresco'], 1700, setSel)
  const g = BEBIDAS.find((b) => b.id === sel)!.g
  const cucharaditas = Math.round(g / 4)
  return (
    <div className="g-herramienta">
      <h4>{k('titulo')}</h4>
      <div className="g-chips">
        {BEBIDAS.map((b) => (
          <button key={b.id} type="button" className={b.id === sel ? 'activo' : ''} onClick={() => setSel(b.id)}>
            {k(b.id)}
          </button>
        ))}
      </div>
      <div className="g-azucar">
        <p>
          <b>{g}</b> {k('gramos')} · <b>{cucharaditas}</b> {k('cucharaditas')}
        </p>
        <div className="g-cubos" aria-hidden="true">
          {Array.from({ length: cucharaditas }, (_, i) => (
            <i key={`${sel}-${i}`} style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
        <div className="g-medidor">
          <span style={{ width: `${Math.min(100, (g / 25) * 100)}%` }} className={g > 25 ? 'g-pasado' : ''} />
        </div>
        <p className="g-nota">
          <b>{Math.round((g / 25) * 100)} %</b> {k('ideal')}
        </p>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

export const GRAFICAS_COCINA = new Set(['historiaCocina', 'balance', 'gasto', 'nova'])

export function GraficaCocina({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'historiaCocina') {
    const hitos: [string, string][] = [
      [k('grafica.fuego'), k('grafica.fuegoDet')],
      [k('grafica.agricultura'), k('grafica.agriculturaDet')],
      ['1747', k('grafica.lindDet')],
      ['1896', k('grafica.atwaterDet')],
      ['1912', k('grafica.funkDet')],
      ['2011', k('grafica.platoDet')],
    ]
    return (
      <figure className="g-grafica">
        <ol className="g-historia" style={{ gridTemplateColumns: `repeat(${hitos.length}, 1fr)` }}>
          {hitos.map(([cuando, que]) => (
            <li key={cuando}>
              <b>{cuando}</b>
              <span>{que}</span>
            </li>
          ))}
        </ol>
        <figcaption>{k('grafica.historia')}</figcaption>
      </figure>
    )
  }
  if (id === 'balance') {
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 170" role="img" aria-label={k('grafica.balance')}>
          <path d="M200 40 L200 150 M160 150 H240" className="g-eje" strokeWidth="4" />
          <g className="g-balanza">
            <path d="M70 40 L330 40" className="g-curva" />
            <path d="M70 40 L45 83 H95 Z" className="g-plato-entra" />
            <path d="M330 40 L305 83 H355 Z" className="g-plato-sale" />
          </g>
          <circle cx="200" cy="40" r="7" className="g-punto" />
          <text x="70" y="106" textAnchor="middle" className="g-rotulo g-fuerte">{k('grafica.entra')}</text>
          <text x="330" y="106" textAnchor="middle" className="g-rotulo g-fuerte">{k('grafica.sale')}</text>
        </svg>
        <figcaption>{k('grafica.balance')}</figcaption>
      </figure>
    )
  }
  if (id === 'gasto') {
    const seg = [
      { c: 'z1', p: 65, r: k('grafica.basal') },
      { c: 'z2', p: 25, r: k('grafica.actividad') },
      { c: 'z3', p: 10, r: k('grafica.digestion') },
    ]
    return (
      <figure className="g-grafica">
        <div className="g-barra-apilada">
          {seg.map((s) => (
            <span key={s.c} className={`g-${s.c}`} style={{ flexGrow: s.p }} />
          ))}
        </div>
        <ul className="g-leyenda">
          {seg.map((s) => (
            <li key={s.c} className={`g-${s.c}`}>
              <i />
              {s.r} <b>≈{s.p} %</b>
            </li>
          ))}
        </ul>
        <figcaption>{k('grafica.gasto')}</figcaption>
      </figure>
    )
  }
  // NOVA: los cuatro grupos, de lo fresco a lo ultraprocesado.
  return (
    <figure className="g-grafica">
      <ol className="g-nova">
        {['g1', 'g2', 'g3', 'g4'].map((g, i) => (
          <li key={g} className={`g-nova-${i + 1}`}>
            <i>{i + 1}</i>
            <div>
              <b>{k(`grafica.${g}`)}</b>
              <span>{k(`grafica.${g}Det`)}</span>
            </div>
          </li>
        ))}
      </ol>
      <figcaption>{k('grafica.nova')}</figcaption>
    </figure>
  )
}
