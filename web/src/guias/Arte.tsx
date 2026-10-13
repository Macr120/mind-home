import { useEffect, useRef, useState } from 'react'
import type { T } from './datos'

/**
 * Lo propio de la guía de Arte («¿Cómo aprender a dibujar?»): sus
 * mini-herramientas y sus gráficas. Como las de las otras guías, con `demo` (su
 * línea suena en modo grabación) se usan solas para que el video las enseñe
 * funcionando.
 */
export const HERRAMIENTAS_ARTE = new Set(['mesas', 'alReves', 'ojos', 'valores', 'cronometro', 'dibujosAno'])

export function HerramientaArte({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  if (id === 'mesas') return <Mesas t={t} demo={demo} />
  if (id === 'alReves') return <AlReves t={t} demo={demo} />
  if (id === 'ojos') return <Ojos t={t} demo={demo} />
  if (id === 'valores') return <Valores t={t} demo={demo} />
  if (id === 'cronometro') return <Cronometro t={t} demo={demo} />
  if (id === 'dibujosAno') return <DibujosAno t={t} demo={demo} />
  return null
}

/** Va aplicando `pasos` cada `ms` mientras `demo` está activo (como en las otras guías). */
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

const lang = () => document.documentElement.lang || 'es'
const num = (n: number) => new Intl.NumberFormat(lang(), { maximumFractionDigits: 0 }).format(Math.round(n))

/** Los botones de una opción entre varias. */
function Segmentos<V extends string | number>({ valores, valor, set, rotulo }: { valores: V[]; valor: V; set: (v: V) => void; rotulo?: (v: V) => string }) {
  return (
    <div className="g-segmentos g-segmentos-anchos">
      {valores.map((v) => (
        <button key={v} type="button" className={v === valor ? 'activo' : ''} onClick={() => set(v)}>
          {rotulo ? rotulo(v) : v}
        </button>
      ))}
    </div>
  )
}

/** Avanza de 0 a 1 en `ms` cuando `activo` pasa a true (y vuelve a 0 al apagarse). */
function useAvance(activo: boolean, ms: number) {
  const [q, setQ] = useState(0)
  useEffect(() => {
    if (!activo) {
      setQ(0)
      return
    }
    const t0 = performance.now()
    let id = 0
    const paso = () => {
      const v = Math.min(1, (performance.now() - t0) / ms)
      setQ(v)
      if (v < 1) id = requestAnimationFrame(paso)
    }
    id = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(id)
  }, [activo, ms])
  return q
}

const suave = (q: number) => q * q * (3 - 2 * q)

/**
 * La tapa de las mesas de Shepard: el MISMO paralelogramo, girado distinto en
 * cada mesa. Vértices relativos a su centro.
 */
const TAPA: [number, number][] = [
  [-80, -24],
  [62, -24],
  [80, 24],
  [-62, 24],
]
const girar = ([x, y]: [number, number], g: number): [number, number] => {
  const r = (g * Math.PI) / 180
  return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)]
}
const MESAS = [
  { cx: 112, cy: 92, giro: -64 },
  { cx: 292, cy: 104, giro: 14 },
]

/** Una mesa: la tapa, su canto y tres patas que bajan de las esquinas de delante. */
function Mesa({ cx, cy, giro }: { cx: number; cy: number; giro: number }) {
  const v = TAPA.map((p) => girar(p, giro)).map(([x, y]) => [cx + x, cy + y] as [number, number])
  // La esquina más alta queda al fondo: de las otras tres bajan las patas.
  const fondo = v.reduce((m, p, i) => (p[1] < v[m][1] ? i : m), 0)
  const delante = v.filter((_, i) => i !== fondo)
  const grosor = 7
  return (
    <g>
      {delante.map(([x, y], i) => (
        <line key={i} x1={x} y1={y} x2={x} y2={y + 46} className="g-art-pata" />
      ))}
      <polygon points={v.map(([x, y]) => `${x},${y + grosor}`).join(' ')} className="g-art-canto" />
      <polygon points={v.map((p) => p.join(',')).join(' ')} className="g-art-tapa" />
    </g>
  )
}

/** Las mesas de Shepard (1990): «Comprobar» lleva una copia de la tapa izquierda encima de la derecha. */
function Mesas({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`arte.mesas.${s}`)
  const [comprobar, setComprobar] = useState(false)
  useDemo(demo, [true, true, false, true], 2600, setComprobar)
  const q = suave(useAvance(comprobar, 1800))
  const [a, b] = MESAS
  const cx = a.cx + (b.cx - a.cx) * q
  const cy = a.cy + (b.cy - a.cy) * q
  const giro = a.giro + (b.giro - a.giro) * q
  const copia = TAPA.map((p) => girar(p, giro)).map(([x, y]) => `${cx + x},${cy + y}`).join(' ')
  return (
    <div className="g-herramienta g-art">
      <h4>{k('titulo')}</h4>
      <figure className="g-grafica">
        <svg viewBox="0 0 400 190" role="img" aria-label={k('titulo')}>
          {MESAS.map((m) => (
            <Mesa key={m.cx} {...m} />
          ))}
          {comprobar && <polygon points={copia} className="g-art-copia" />}
        </svg>
      </figure>
      <div className="g-art-fila">
        <button type="button" className="g-boton-accion" onClick={() => setComprobar((c) => !c)}>
          {comprobar ? k('otraVez') : k('comprobar')}
        </button>
        <p className="g-idi-veredicto">{comprobar && q === 1 ? <b>{k('identicas')}</b> : k('pregunta')}</p>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Un retrato sencillo de líneas (para copiarlo de cabeza). */
function Retrato() {
  return (
    <g className="g-art-trazo">
      <path d="M140 60 C140 20 260 20 260 60 C268 110 250 150 200 160 C150 150 132 110 140 60 Z" />
      <path d="M140 64 C150 30 190 24 214 40 C230 26 256 40 260 66" />
      <path d="M160 88 q14 -10 28 0 M212 88 q14 -10 28 0" />
      <path d="M172 92 a5 5 0 1 0 0.1 0 M226 92 a5 5 0 1 0 0.1 0" />
      <path d="M200 96 L192 122 L206 124" />
      <path d="M180 136 q20 12 40 0" />
      <path d="M176 156 L170 182 M224 156 L230 182 M170 182 C130 188 112 196 100 212 M230 182 C270 188 288 196 300 212" />
    </g>
  )
}

/** El ejercicio de Betty Edwards: el mismo dibujo, de cabeza o al derecho. */
function AlReves({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`arte.alReves.${s}`)
  const [derecho, setDerecho] = useState(false)
  useDemo(demo, [true, false, true, false], 2400, setDerecho)
  return (
    <div className="g-herramienta g-art">
      <h4>{k('titulo')}</h4>
      <figure className="g-grafica">
        <svg viewBox="0 0 400 220" role="img" aria-label={k('titulo')}>
          <g className="g-art-giro" style={{ transform: derecho ? 'rotate(0deg)' : 'rotate(180deg)' }}>
            <Retrato />
          </g>
        </svg>
      </figure>
      <div className="g-art-fila">
        <button type="button" className="g-boton-accion" onClick={() => setDerecho((d) => !d)}>
          {derecho ? k('deCabeza') : k('voltear')}
        </button>
        <p className="g-idi-veredicto">{derecho ? k('cara') : k('lineas')}</p>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** ¿Dónde van los ojos? La línea se mueve en % de la altura de la cabeza (coronilla = 0, barbilla = 100). */
function Ojos({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`arte.ojos.${s}`)
  const [pct, setPct] = useState(32)
  useDemo(demo, [36, 40, 44, 48, 50], 1400, setPct)
  const ARRIBA = 24
  const ABAJO = 196
  const y = ARRIBA + ((ABAJO - ARRIBA) * pct) / 100
  const justo = Math.abs(pct - 50) <= 2
  return (
    <div className="g-herramienta g-art">
      <h4>{k('titulo')}</h4>
      <figure className="g-grafica">
        <svg viewBox="0 0 400 220" role="img" aria-label={k('titulo')}>
          <line x1="110" y1={ARRIBA} x2="290" y2={ARRIBA} className="g-eje" strokeDasharray="3 5" />
          <line x1="110" y1={ABAJO} x2="290" y2={ABAJO} className="g-eje" strokeDasharray="3 5" />
          <line x1="96" y1={(ARRIBA + ABAJO) / 2} x2="304" y2={(ARRIBA + ABAJO) / 2} className={`g-eje g-art-mitad${justo ? ' visible' : ''}`} />
          <text x="300" y={ARRIBA + 4} className="g-rotulo">{k('coronilla')}</text>
          <text x="300" y={ABAJO + 4} className="g-rotulo">{k('barbilla')}</text>
          <ellipse cx="200" cy="110" rx="66" ry="86" className="g-art-cabeza" />
          <g style={{ transform: `translateY(${y - 110}px)` }} className="g-art-ojos">
            <ellipse cx="174" cy="110" rx="13" ry="6" />
            <ellipse cx="226" cy="110" rx="13" ry="6" />
            <circle cx="174" cy="110" r="4" />
            <circle cx="226" cy="110" r="4" />
          </g>
          <path d="M200 120 L194 146 L206 147" className="g-art-trazo" />
          <path d="M182 166 q18 9 36 0" className="g-art-trazo" />
        </svg>
      </figure>
      <div className="g-opciones">
        <label>
          <span>{k('linea')}</span>
          <input type="range" min="20" max="70" value={pct} onChange={(e) => setPct(Number(e.target.value))} />
        </label>
      </div>
      <p className="g-idi-veredicto">{justo ? <b>{k('justo')}</b> : `${k('desdeArriba')} ${num(pct)} %`}</p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Los cinco valores de una esfera iluminada desde arriba a la izquierda. */
const VALORES = ['luz', 'medio', 'sombra', 'reflejada', 'proyectada'] as const
/** Dónde se señala cada valor (centro del dibujo en 200,96). */
const MARCA: Record<(typeof VALORES)[number], [number, number]> = {
  luz: [178, 72],
  medio: [205, 98],
  sombra: [232, 124],
  reflejada: [212, 148],
  proyectada: [290, 162],
}

function Valores({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`arte.valores.${s}`)
  const [valor, setValor] = useState<(typeof VALORES)[number]>('luz')
  const [borroso, setBorroso] = useState(0)
  useDemo<() => void>(
    demo,
    [() => setValor('medio'), () => setValor('sombra'), () => setValor('reflejada'), () => setValor('proyectada'), () => setBorroso(6), () => setBorroso(0)],
    1500,
    (f) => f(),
  )
  const [mx, my] = MARCA[valor]
  return (
    <div className="g-herramienta g-art">
      <h4>{k('titulo')}</h4>
      <figure className="g-grafica">
        <svg viewBox="0 0 400 200" role="img" aria-label={k('titulo')}>
          <defs>
            <clipPath id="g-art-esfera">
              <circle cx="200" cy="96" r="64" />
            </clipPath>
          </defs>
          <g style={{ filter: borroso ? `blur(${borroso}px)` : undefined }} className="g-art-esfera">
            <ellipse cx="262" cy="164" rx="86" ry="16" fill="#1f2937" />
            <g clipPath="url(#g-art-esfera)">
              <rect x="120" y="20" width="160" height="160" fill="#475569" />
              <path d="M150 150 C190 172 250 150 262 100 C266 140 230 168 200 166 Z" fill="#7b8794" />
              <circle cx="186" cy="82" r="56" fill="#94a3b8" />
              <circle cx="178" cy="74" r="34" fill="#cbd5e1" />
              <circle cx="174" cy="70" r="12" fill="#f8fafc" />
            </g>
          </g>
          <circle cx={mx} cy={my} r="7" className="g-art-marca" />
          <text x="20" y="40" className="g-rotulo">☀</text>
        </svg>
      </figure>
      <div className="g-opciones">
        <label>
          <span>{k('valor')}</span>
          <Segmentos valores={[...VALORES]} valor={valor} set={setValor} rotulo={(v) => k(v)} />
        </label>
        <label>
          <span>{k('entrecierra')}</span>
          <input type="range" min="0" max="8" value={borroso} onChange={(e) => setBorroso(Number(e.target.value))} />
        </label>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Cronómetro de dibujos de gesto: poses de 30 s, 1 o 2 min. */
function Cronometro({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`arte.cronometro.${s}`)
  const [segundos, setSegundos] = useState(30)
  const [andando, setAndando] = useState(false)
  const [pose, setPose] = useState(1)
  const [pasado, setPasado] = useState(0)
  const inicio = useRef(0)
  useDemo<() => void>(demo, [() => setAndando(true)], 900, (f) => f())
  useEffect(() => {
    if (!andando) return
    inicio.current = performance.now() - pasado * 1000
    const id = setInterval(() => {
      const s = (performance.now() - inicio.current) / 1000
      if (s >= segundos) {
        // Pose siguiente: el reloj vuelve a empezar.
        inicio.current = performance.now()
        setPose((p) => (p % 5) + 1)
        setPasado(0)
      } else setPasado(s)
    }, 100)
    return () => clearInterval(id)
    // `pasado` solo sirve para reanudar: no reinicia el intervalo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [andando, segundos])
  const resta = Math.max(0, segundos - pasado)
  const C = 2 * Math.PI * 54
  return (
    <div className="g-herramienta g-art">
      <h4>{k('titulo')}</h4>
      <div className="g-opciones">
        <label>
          <span>{k('pose')}</span>
          <Segmentos
            valores={[30, 60, 120]}
            valor={segundos}
            set={(v) => {
              setSegundos(v)
              setPasado(0)
            }}
            rotulo={(v) => (v < 60 ? `${v} s` : `${v / 60} min`)}
          />
        </label>
      </div>
      <div className="g-art-reloj">
        <svg viewBox="0 0 140 140" aria-hidden="true">
          <circle cx="70" cy="70" r="54" className="g-art-reloj-fondo" />
          <circle cx="70" cy="70" r="54" className="g-art-reloj-avance" strokeDasharray={C} strokeDashoffset={C * (pasado / segundos)} />
        </svg>
        <div>
          <b>
            {Math.floor(resta / 60)}:{String(Math.ceil(resta % 60) === 60 ? 0 : Math.ceil(resta % 60)).padStart(2, '0')}
          </b>
          <small>
            {k('poseN')} {pose} / 5
          </small>
        </div>
      </div>
      <div className="g-art-fila">
        <button type="button" className="g-boton-accion" onClick={() => setAndando((a) => !a)}>
          {andando ? k('pausa') : k('empezar')}
        </button>
      </div>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Minutos al día → horas y dibujos al año, según lo que dura cada dibujo. */
const DURACIONES: Record<string, number> = { rapidos: 2, bocetos: 10, estudios: 30 }

function DibujosAno({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`arte.dibujos.${s}`)
  const [minutos, setMinutos] = useState(15)
  const [tipo, setTipo] = useState('bocetos')
  useDemo<() => void>(demo, [() => setMinutos(5), () => setMinutos(30), () => setTipo('rapidos'), () => setTipo('estudios'), () => setMinutos(15), () => setTipo('bocetos')], 1400, (f) => f())
  const horas = (minutos * 365) / 60
  const dibujos = Math.floor((minutos * 365) / DURACIONES[tipo])
  return (
    <div className="g-herramienta g-art">
      <h4>{k('titulo')}</h4>
      <div className="g-opciones">
        <label>
          <span>{k('minutos')}</span>
          <Segmentos valores={[5, 10, 15, 30, 60]} valor={minutos} set={setMinutos} />
        </label>
        <label>
          <span>{k('tipo')}</span>
          <Segmentos valores={Object.keys(DURACIONES)} valor={tipo} set={setTipo} rotulo={(v) => k(v)} />
        </label>
      </div>
      <dl className="g-resultados">
        <div>
          <dt>{k('horas')}</dt>
          <dd>
            {num(horas)} <small>h</small>
          </dd>
        </div>
        <div className="g-resultado-fuerte">
          <dt>{k('alAnio')}</dt>
          <dd>{num(dibujos)}</dd>
        </div>
      </dl>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

export const GRAFICAS_ARTE = new Set(['efectoDibujo', 'historiaArte', 'formas', 'tercios', 'circulo', 'rutina'])

/** Cajas unidas por flechas (como los diagramas de flujo de Finanzas). */
function Cadena({ pasos, k, clave }: { pasos: { titulo: string; det: string; z: string }[]; k: (s: string) => string; clave: string }) {
  return (
    <figure className="g-grafica">
      <ol className="g-fin-cadena">
        {pasos.map((p, i) => (
          <li key={i} className={p.z}>
            <b>{p.titulo}</b>
            <span>{p.det}</span>
          </li>
        ))}
      </ol>
      <figcaption>{k(`grafica.${clave}`)}</figcaption>
    </figure>
  )
}

/** El círculo de los colores: doce tonos y su valor (luminancia) en gris. */
const TONOS = Array.from({ length: 12 }, (_, i) => i * 30)
function grisDe(h: number) {
  // HSL(h, 85 %, 52 %) → RGB → luminancia relativa (sRGB) → gris del mismo valor.
  const s = 0.85
  const l = 0.52
  const f = (n: number) => {
    const kk = (n + h / 30) % 12
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(kk - 3, 9 - kk, 1))
  }
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const y = 0.2126 * lin(f(0)) + 0.7152 * lin(f(8)) + 0.0722 * lin(f(4))
  const v = Math.round((y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055) * 255)
  return `rgb(${v} ${v} ${v})`
}

/** Sector de anillo entre los ángulos `a0` y `a1` (grados, 0 arriba), radios `r0` y `r1`. */
function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => {
    const rad = ((a - 90) * Math.PI) / 180
    return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`
  }
  return `M${p(r1, a0)} A${r1} ${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`
}

export function GraficaArte({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'rutina') {
    const dias: [string, string][] = [
      ['lunes', 'g-z1'],
      ['martes', 'g-z2'],
      ['miercoles', 'g-z3'],
      ['jueves', 'g-z4'],
      ['viernes', 'g-z5'],
      ['finde', 'g-z1'],
    ]
    return <Cadena clave={id} k={k} pasos={dias.map(([c, z]) => ({ titulo: k(`grafica.${c}`), det: k(`grafica.${c}Det`), z }))} />
  }
  if (id === 'efectoDibujo') {
    // Esquema del resultado de Wammes, Meade y Fernandes (2016): sin cifras, solo la diferencia.
    const barras: [string, number, string][] = [
      ['escribir', 0.5, 'g-z1'],
      ['dibujar', 1, 'g-z2'],
    ]
    return (
      <figure className="g-grafica">
        <ul className="g-idi-barras g-art-barras">
          {barras.map(([b, v, z]) => (
            <li key={b}>
              <b>{k(`grafica.${b}`)}</b>
              <span>{k(`grafica.${b}Det`)}</span>
              <i className={z} style={{ width: `${v * 100}%` }} />
            </li>
          ))}
        </ul>
        <figcaption>{k('grafica.efectoDibujo')}</figcaption>
      </figure>
    )
  }
  if (id === 'historiaArte') {
    const hace = (n: number) => k('grafica.hace').replace('{n}', num(n))
    const hitos: [string, string][] = [
      [hace(51200), k('grafica.celebesDet')],
      [hace(17000), k('grafica.lascauxDet')],
      ['1415', k('grafica.perspectivaDet')],
      ['1839', k('grafica.fotografiaDet')],
      ['1917', k('grafica.duchampDet')],
      ['1963', k('grafica.sketchpadDet')],
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
  if (id === 'formas') {
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 170" role="img" aria-label={k('grafica.formas')}>
          <g className="g-art-forma">
            <path d="M30 70 l30 -16 l34 10 v52 l-34 18 l-30 -14 Z M30 70 l34 12 l30 -18 M64 82 v54" />
            <circle cx="150" cy="96" r="40" />
            <path d="M118 96 a32 10 0 0 0 64 0" strokeDasharray="4 4" />
            <path d="M212 66 v62 a30 9 0 0 0 60 0 v-62" />
            <ellipse cx="242" cy="66" rx="30" ry="9" />
            <path d="M330 54 L300 128 a30 9 0 0 0 60 0 Z" />
          </g>
          {['cubo', 'esfera', 'cilindro', 'cono'].map((f, i) => (
            <text key={f} x={[62, 150, 242, 330][i]} y="160" textAnchor="middle" className="g-rotulo g-fuerte">
              {k(`grafica.${f}`)}
            </text>
          ))}
        </svg>
        <figcaption>{k('grafica.formas')}</figcaption>
      </figure>
    )
  }
  if (id === 'tercios') {
    // La regla de los tercios: la rejilla de 3 × 3 sobre un paisaje y lo importante en una de las cruces.
    const W = 300
    const H = 180
    const x0 = 50
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 200" role="img" aria-label={k('grafica.tercios')}>
          <rect x={x0} y="10" width={W} height={H} rx="8" className="g-art-cielo" />
          <path d={`M${x0} ${10 + H * 0.7} Q${x0 + W * 0.3} ${10 + H * 0.55} ${x0 + W * 0.6} ${10 + H * 0.68} T${x0 + W} ${10 + H * 0.62} V${10 + H} H${x0} Z`} className="g-art-loma" />
          <circle cx={x0 + W / 3} cy={10 + H / 3} r="16" className="g-art-sol" />
          <path d={`M${x0 + (W * 2) / 3 - 8} ${10 + H * 0.66} l8 -${H * 0.3} l8 ${H * 0.3} Z`} className="g-art-arbol" />
          {[1, 2].map((i) => (
            <g key={i}>
              <line x1={x0 + (W * i) / 3} y1="10" x2={x0 + (W * i) / 3} y2={10 + H} className="g-art-tercio" />
              <line x1={x0} y1={10 + (H * i) / 3} x2={x0 + W} y2={10 + (H * i) / 3} className="g-art-tercio" />
            </g>
          ))}
          {[1, 2].flatMap((i) => [1, 2].map((j) => <circle key={`${i}${j}`} cx={x0 + (W * i) / 3} cy={10 + (H * j) / 3} r="5" className="g-art-cruce" />))}
        </svg>
        <figcaption>{k('grafica.tercios')}</figcaption>
      </figure>
    )
  }
  if (id === 'circulo') {
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 180" role="img" aria-label={k('grafica.circulo')}>
          {TONOS.map((h) => (
            <g key={h}>
              <path d={sector(110, 88, 34, 72, h - 14, h + 14)} fill={`hsl(${h} 85% 52%)`} />
              <path d={sector(290, 88, 34, 72, h - 14, h + 14)} fill={grisDe(h)} />
            </g>
          ))}
          <text x="110" y="176" textAnchor="middle" className="g-rotulo g-fuerte">{k('grafica.tono')}</text>
          <text x="290" y="176" textAnchor="middle" className="g-rotulo g-fuerte">{k('grafica.valor')}</text>
        </svg>
        <figcaption>{k('grafica.circulo')}</figcaption>
      </figure>
    )
  }
  return null
}
