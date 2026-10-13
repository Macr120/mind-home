import { useEffect, useState } from 'react'
import type { T } from './datos'

/**
 * Lo propio de la guía de Idiomas: sus mini-herramientas y sus gráficas. Como
 * las de las otras guías, con `demo` (su línea suena en modo grabación) se usan
 * solas para que el video las enseñe funcionando.
 */
export const HERRAMIENTAS_IDIOMAS = new Set(['nivelMcer', 'curvaOlvido', 'cobertura', 'cajasLeitner', 'minutosDia'])

export function HerramientaIdiomas({ id, t, demo }: { id: string; t: T; demo: boolean }) {
  if (id === 'nivelMcer') return <NivelMcer t={t} demo={demo} />
  if (id === 'curvaOlvido') return <CurvaOlvido t={t} demo={demo} />
  if (id === 'cobertura') return <Cobertura t={t} demo={demo} />
  if (id === 'cajasLeitner') return <CajasLeitner t={t} demo={demo} />
  if (id === 'minutosDia') return <MinutosDia t={t} demo={demo} />
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

const NIVELES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/** Ubica tu nivel: los descriptores «puedo…» del MCER; el nivel es el más alto marcado sin huecos por debajo. */
function NivelMcer({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`idiomas.nivel.${s}`)
  const [marcados, setMarcados] = useState<string[]>([])
  const alternar = (n: string) => setMarcados((m) => (m.includes(n) ? m.filter((x) => x !== n) : [...m, n]))
  // Con un hueco (C1 sin B2) el nivel no sube: hasta que se marca el B2.
  useDemo(demo, [['A1'], ['A1', 'A2'], ['A1', 'A2', 'B1'], ['A1', 'A2', 'B1', 'C1'], ['A1', 'A2', 'B1', 'C1', 'B2'], ['A1', 'A2', 'B1']], 1500, setMarcados)
  let nivel = -1
  while (nivel + 1 < NIVELES.length && marcados.includes(NIVELES[nivel + 1])) nivel++
  return (
    <div className="g-herramienta g-idi">
      <h4>{k('titulo')}</h4>
      <ul className="g-idi-puedo">
        {NIVELES.map((n) => (
          <li key={n}>
            <button type="button" className={marcados.includes(n) ? 'activo' : ''} onClick={() => alternar(n)}>
              <i>{marcados.includes(n) ? '✓' : ''}</i>
              <span>{k(n.toLowerCase())}</span>
            </button>
          </li>
        ))}
      </ul>
      <ol className="g-idi-escalera">
        {NIVELES.map((n, i) => (
          <li key={n} className={i <= nivel ? 'lleno' : ''}>
            {n}
          </li>
        ))}
      </ol>
      <p className="g-idi-veredicto">{nivel < 0 ? k('ninguno') : <>{k('vas')} <b>{NIVELES[nivel]}</b></>}</p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Los repasos, en días desde que aprendes la palabra: cada vez más separados. */
const REPASOS = [1, 3, 7, 16]
/**
 * Lo que recuerdas el día `d` con los primeros `n` repasos (modelo ilustrativo):
 * el recuerdo cae como una exponencial que se vuelve 2,5 veces más lenta tras cada repaso.
 */
function recuerdo(d: number, n: number) {
  let desde = 0
  let fuerza = 1.2
  for (const r of REPASOS.slice(0, n)) {
    if (d < r) break
    desde = r
    fuerza *= 2.5
  }
  return Math.exp(-(d - desde) / fuerza)
}

function CurvaOlvido({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`idiomas.olvido.${s}`)
  const [n, setN] = useState(0)
  useDemo(demo, [1, 2, 3, 4, 0, 4], 1500, setN)
  const DIAS = 30
  const x = (d: number) => 40 + (d / DIAS) * 340
  const y = (r: number) => 130 - r * 110
  const puntos = Array.from({ length: 301 }, (_, i) => {
    const d = (i / 300) * DIAS
    return `${x(d)},${y(recuerdo(d, n))}`
  }).join(' ')
  const fin = recuerdo(DIAS, n)
  return (
    <div className="g-herramienta g-idi">
      <h4>{k('titulo')}</h4>
      <div className="g-opciones">
        <label>
          <span>{k('repasos')}</span>
          <Segmentos valores={[0, 1, 2, 3, 4]} valor={n} set={setN} />
        </label>
      </div>
      <figure className="g-grafica">
        <svg viewBox="0 0 400 160" role="img" aria-label={k('titulo')}>
          <line x1="40" y1="130" x2="390" y2="130" className="g-eje" />
          <line x1="40" y1="20" x2="390" y2="20" className="g-eje" strokeDasharray="2 6" />
          {REPASOS.slice(0, n).map((r) => (
            <line key={r} x1={x(r)} y1="20" x2={x(r)} y2="130" className="g-eje" strokeDasharray="4 5" />
          ))}
          <polyline points={puntos} className="g-curva" />
          <text x="34" y="24" textAnchor="end" className="g-rotulo">100</text>
          <text x="34" y="134" textAnchor="end" className="g-rotulo">0</text>
          {[0, 7, 14, 21, 30].map((d) => (
            <text key={d} x={x(d)} y="148" textAnchor="middle" className="g-rotulo">
              {d}
            </text>
          ))}
          <text x="390" y="158" textAnchor="end" className="g-rotulo">{k('dias')}</text>
        </svg>
      </figure>
      <dl className="g-resultados">
        <div className={fin > 0.5 ? 'g-resultado-fuerte' : 'g-resultado-corto'}>
          <dt>{k('recuerdas')}</dt>
          <dd>≈ {num(fin * 100)} %</dd>
        </div>
        <div>
          <dt>{k('cuando')}</dt>
          <dd>{n ? REPASOS.slice(0, n).join(' · ') : '—'}</dd>
        </div>
      </dl>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Palabras más frecuentes que sabes → qué parte de un texto común en inglés reconoces (aproximado, Nation 2006). */
const COBERTURA: [number, number][] = [
  [100, 50],
  [500, 72],
  [1000, 80],
  [2000, 87],
  [3000, 91],
  [5000, 95],
  [9000, 98],
]

function Cobertura({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`idiomas.cobertura.${s}`)
  const [palabras, setPalabras] = useState(1000)
  useDemo(demo, [100, 500, 1000, 3000, 9000, 1000], 1400, setPalabras)
  const pct = COBERTURA.find(([p]) => p === palabras)![1]
  const una = Math.round(100 / (100 - pct))
  return (
    <div className="g-herramienta g-idi">
      <h4>{k('titulo')}</h4>
      <div className="g-opciones">
        <label>
          <span>{k('sabes')}</span>
          <Segmentos valores={COBERTURA.map(([p]) => p)} valor={palabras} set={setPalabras} rotulo={num} />
        </label>
      </div>
      <div className="g-idi-texto" aria-hidden="true">
        {Array.from({ length: 50 }, (_, i) => (
          <i key={i} className={(i * 37) % 50 < pct / 2 ? 'conocida' : ''} />
        ))}
      </div>
      <dl className="g-resultados">
        <div className="g-resultado-fuerte">
          <dt>{k('reconoces')}</dt>
          <dd>≈ {pct} %</dd>
        </div>
        <div>
          <dt>{k('desconocida')}</dt>
          <dd>
            1 / {una}
          </dd>
        </div>
      </dl>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Días hasta el siguiente repaso por caja (los mismos de la app de Idiomas: acierto +1, fallo −2). */
const INTERVALOS = [1, 2, 4, 8, 16, 32]

function CajasLeitner({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`idiomas.leitner.${s}`)
  const [caja, setCaja] = useState(0)
  const [volteada, setVolteada] = useState(false)
  const responder = (bien: boolean) => {
    setCaja((c) => (bien ? Math.min(INTERVALOS.length - 1, c + 1) : Math.max(0, c - 2)))
    setVolteada(false)
  }
  useDemo<() => void>(
    demo,
    [() => setVolteada(true), () => responder(true), () => setVolteada(true), () => responder(true), () => responder(true), () => responder(false), () => responder(true)],
    1300,
    (f) => f(),
  )
  return (
    <div className="g-herramienta g-idi">
      <h4>{k('titulo')}</h4>
      <div className="g-idi-leitner">
        <button type="button" className={`g-idi-tarjeta${volteada ? ' volteada' : ''}`} onClick={() => setVolteada((v) => !v)}>
          <b>{volteada ? k('reverso') : k('frente')}</b>
          <small>{volteada ? '' : k('voltea')}</small>
        </button>
        <div className="g-idi-botones">
          <button type="button" className="bien" onClick={() => responder(true)}>
            {k('acerte')}
          </button>
          <button type="button" className="mal" onClick={() => responder(false)}>
            {k('falle')}
          </button>
        </div>
      </div>
      <ol className="g-idi-cajas">
        {INTERVALOS.map((d, i) => (
          <li key={d} className={i === caja ? 'activa' : ''}>
            <b>{i + 1}</b>
            <small>
              {d} {d === 1 ? k('dia') : k('dias')}
            </small>
          </li>
        ))}
      </ol>
      <p className="g-idi-veredicto">
        {k('proximo')} <b>{INTERVALOS[caja]} {INTERVALOS[caja] === 1 ? k('dia') : k('dias')}</b>
        {caja >= 4 && <> · {k('dominada')}</>}
      </p>
      <p className="g-nota">{k('nota')}</p>
    </div>
  )
}

/** Horas de clase del FSI por grupo de dificultad (para quien habla inglés). */
const GRUPOS = [
  { id: 'g1', horas: 700 },
  { id: 'g2', horas: 900 },
  { id: 'g3', horas: 1100 },
  { id: 'g4', horas: 2200 },
]

function MinutosDia({ t, demo }: { t: T; demo: boolean }) {
  const k = (s: string) => t(`idiomas.minutos.${s}`)
  const [minutos, setMinutos] = useState(20)
  const [dias, setDias] = useState(7)
  const [grupo, setGrupo] = useState('g1')
  useDemo<() => void>(demo, [() => setMinutos(30), () => setDias(5), () => setGrupo('g4'), () => setMinutos(60), () => setGrupo('g1'), () => setDias(7)], 1400, (f) => f())
  const horasAnio = (minutos * dias * 52) / 60
  const meta = GRUPOS.find((g) => g.id === grupo)!.horas
  const anios = meta / horasAnio
  return (
    <div className="g-herramienta g-idi">
      <h4>{k('titulo')}</h4>
      <div className="g-opciones">
        <label>
          <span>{k('minutos')}</span>
          <Segmentos valores={[10, 20, 30, 60]} valor={minutos} set={setMinutos} />
        </label>
        <label>
          <span>{k('dias')}</span>
          <Segmentos valores={[3, 5, 7]} valor={dias} set={setDias} />
        </label>
        <label>
          <span>{k('idioma')}</span>
          <Segmentos valores={GRUPOS.map((g) => g.id)} valor={grupo} set={setGrupo} rotulo={(g) => t(`idiomas.grafica.${g}`)} />
        </label>
      </div>
      <dl className="g-resultados">
        <div>
          <dt>{k('alAnio')}</dt>
          <dd>
            {num(horasAnio)} <small>h</small>
          </dd>
        </div>
        <div className="g-resultado-fuerte">
          <dt>{k('llegas')}</dt>
          <dd>
            {anios < 1 ? `${num(anios * 12)} ${k('meses')}` : `${(Math.round(anios * 10) / 10).toLocaleString(lang())} ${k('anios')}`}
          </dd>
        </div>
      </dl>
      <p className="g-nota">{k('nota').replace('{h}', num(meta))}</p>
    </div>
  )
}

export const GRAFICAS_IDIOMAS = new Set(['habilidades', 'fsi', 'historiaIdiomas', 'inputComprensible', 'olvido', 'recuperar', 'temas', 'edad', 'rutina'])

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

/** Ebbinghaus (1885): lo que aún retenía de sus listas (ahorro al reaprenderlas), en horas desde que las aprendió. */
const EBBINGHAUS: [number, number][] = [
  [0, 100],
  [0.33, 58],
  [1, 44],
  [9, 36],
  [24, 34],
  [48, 28],
  [144, 25],
  [744, 21],
]

/** «196 a. C.» en el idioma: `aC` puede ser un sufijo («BC») o una plantilla con `{n}` («紀元前{n}年», que va delante). */
const antesDeCristo = (cuando: string, aC: string) => {
  if (!cuando.includes('a. C.')) return cuando
  return aC.includes('{n}') ? aC.replace('{n}', cuando.replace(' a. C.', '')) : cuando.replace('a. C.', aC)
}

export function GraficaIdiomas({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'inputComprensible' || id === 'rutina') {
    const PASOS: Record<string, [string, string][]> = {
      inputComprensible: [['facil', 'g-z1'], ['justo', 'g-z2'], ['dificil', 'g-z5']],
      rutina: [['escucha5', 'g-z1'], ['repasa5', 'g-z2'], ['habla5', 'g-z3'], ['lee5', 'g-z4']],
    }
    return <Cadena clave={id} k={k} pasos={PASOS[id].map(([c, z]) => ({ titulo: k(`grafica.${c}`), det: k(`grafica.${c}Det`), z }))} />
  }
  if (id === 'habilidades') {
    const grupos: [string, [string, string][]][] = [
      ['entender', [['escuchar', '👂'], ['leer', '📖']]],
      ['producir', [['hablar', '🗣️'], ['escribir', '✍️']]],
    ]
    return (
      <figure className="g-grafica">
        <div className="g-idi-habilidades">
          {grupos.map(([g, hs], i) => (
            <div key={g} className={i ? 'g-z3' : 'g-z1'}>
              <b>{k(`grafica.${g}`)}</b>
              <ul>
                {hs.map(([h, e]) => (
                  <li key={h}>
                    <i>{e}</i>
                    {k(`grafica.${h}`)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <figcaption>{k('grafica.habilidades')}</figcaption>
      </figure>
    )
  }
  if (id === 'fsi') {
    return (
      <figure className="g-grafica">
        <ul className="g-idi-barras">
          {GRUPOS.map((g) => (
            <li key={g.id}>
              <b>{k(`grafica.${g.id}`)}</b>
              <span>{k(`grafica.${g.id}Det`)}</span>
              <i className={g.horas > 2000 ? 'g-z5' : g.horas > 1000 ? 'g-z4' : g.horas > 800 ? 'g-z3' : 'g-z2'} style={{ width: `${(g.horas / 2200) * 100}%` }}>
                ≈ {num(g.horas)} h
              </i>
            </li>
          ))}
        </ul>
        <figcaption>{k('grafica.fsi')}</figcaption>
      </figure>
    )
  }
  if (id === 'historiaIdiomas') {
    const hitos: [string, string][] = [
      ['196 a. C.', k('grafica.rosettaDet')],
      ['1658', k('grafica.orbisDet')],
      ['1878', k('grafica.berlitzDet')],
      ['1887', k('grafica.esperantoDet')],
      ['1972', k('grafica.leitnerDet')],
    ]
    return (
      <figure className="g-grafica">
        <ol className="g-historia" style={{ gridTemplateColumns: `repeat(${hitos.length}, 1fr)` }}>
          {hitos.map(([cuando, que]) => (
            <li key={cuando}>
              <b>{antesDeCristo(cuando, k('grafica.aC'))}</b>
              <span>{que}</span>
            </li>
          ))}
        </ol>
        <figcaption>{k('grafica.historia')}</figcaption>
      </figure>
    )
  }
  if (id === 'olvido') {
    // Eje x en escala logarítmica de horas (de 20 minutos a 31 días); el 0 al inicio.
    const x = (h: number) => (h === 0 ? 40 : 70 + (Math.log10(h / 0.33) / Math.log10(744 / 0.33)) * 310)
    const y = (p: number) => 130 - (p / 100) * 110
    const ROTULOS: [number, string][] = [
      [0.33, '20 min'],
      [1, '1 h'],
      [24, k('grafica.unDia')],
      [744, k('grafica.unMes')],
    ]
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 160" role="img" aria-label={k('grafica.olvido')}>
          <line x1="40" y1="130" x2="390" y2="130" className="g-eje" />
          <line x1="40" y1="20" x2="390" y2="20" className="g-eje" strokeDasharray="2 6" />
          <polyline points={EBBINGHAUS.map(([h, p]) => `${x(h)},${y(p)}`).join(' ')} className="g-curva" />
          {EBBINGHAUS.slice(1).map(([h, p]) => (
            <circle key={h} cx={x(h)} cy={y(p)} r="4" className="g-punto" />
          ))}
          <text x={x(24)} y={y(34) - 10} textAnchor="middle" className="g-rotulo g-fuerte">
            {k('grafica.olvidoDia')}
          </text>
          <text x="34" y="24" textAnchor="end" className="g-rotulo">100</text>
          <text x="34" y="134" textAnchor="end" className="g-rotulo">0</text>
          {ROTULOS.map(([h, r]) => (
            <text key={h} x={x(h)} y="148" textAnchor="middle" className="g-rotulo">
              {r}
            </text>
          ))}
        </svg>
        <figcaption>{k('grafica.olvido')}</figcaption>
      </figure>
    )
  }
  if (id === 'recuperar') {
    // Esquema del resultado de Roediger y Karpicke (2006): sin cifras, solo el cruce.
    const pts = (a: number, b: number, c: number) => `60,${130 - a} 215,${130 - b} 370,${130 - c}`
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 160" role="img" aria-label={k('grafica.recuperar')}>
          <line x1="40" y1="130" x2="390" y2="130" className="g-eje" />
          <polyline points={pts(100, 60, 38)} className="g-curva g-fin-curva-b" />
          <polyline points={pts(90, 72, 62)} className="g-curva" />
          <text x="376" y={130 - 62 - 10} textAnchor="end" className="g-rotulo g-fuerte">
            {k('grafica.prueba')}
          </text>
          <text x="376" y={130 - 38 + 18} textAnchor="end" className="g-rotulo">
            {k('grafica.releer')}
          </text>
          {[
            [60, '5 min'],
            [215, k('grafica.dosDias')],
            [370, k('grafica.unaSemana')],
          ].map(([xx, r]) => (
            <text key={r} x={xx} y="148" textAnchor="middle" className="g-rotulo">
              {r}
            </text>
          ))}
        </svg>
        <figcaption>{k('grafica.recuperar')}</figcaption>
      </figure>
    )
  }
  if (id === 'temas') {
    const rutas: [string, string[]][] = [
      ['viajar', ['saludos', 'comida', 'transporte', 'direcciones']],
      ['trabajar', ['presentarte', 'reuniones', 'correos']],
    ]
    return (
      <figure className="g-grafica">
        <div className="g-fin-metodos g-idi-temas">
          {rutas.map(([r, temas], i) => (
            <div key={r}>
              <b>{k(`grafica.${r}`)}</b>
              <ol>
                {temas.map((tm) => (
                  <li key={tm} className={i ? 'g-z3' : 'g-z2'}>
                    <em>{k(`grafica.${tm}`)}</em>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <figcaption>{k('grafica.temas')}</figcaption>
      </figure>
    )
  }
  if (id === 'edad') {
    // Esquema de Hartshorne, Tenenbaum y Pinker (2018): alta hasta ~17 años y luego baja poco a poco.
    const x = (a: number) => 40 + (a / 70) * 340
    const f = (a: number) => (a <= 17 ? 100 : 100 - 55 * (1 - Math.exp(-(a - 17) / 14)))
    const puntos = Array.from({ length: 71 }, (_, a) => `${x(a)},${130 - (f(a) / 100) * 105}`).join(' ')
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 160" role="img" aria-label={k('grafica.edad')}>
          <line x1="40" y1="130" x2="390" y2="130" className="g-eje" />
          <rect x={x(0)} y="20" width={x(10) - x(0)} height="110" rx="6" className="g-franja" />
          <polyline points={puntos} className="g-curva" />
          <line x1={x(17)} y1="20" x2={x(17)} y2="130" className="g-eje" strokeDasharray="4 5" />
          <text x={x(17) + 6} y="122" className="g-rotulo g-fuerte">
            ≈ 17
          </text>
          <text x={x(5)} y="122" textAnchor="middle" className="g-rotulo">
            {k('grafica.nativo')}
          </text>
          <text x={x(55)} y={130 - (f(55) / 100) * 105 - 12} textAnchor="middle" className="g-rotulo">
            {k('grafica.adulto')}
          </text>
          {[0, 10, 20, 30, 40, 50, 60, 70].map((a) => (
            <text key={a} x={x(a)} y="148" textAnchor="middle" className="g-rotulo">
              {a}
            </text>
          ))}
        </svg>
        <figcaption>{k('grafica.edad')}</figcaption>
      </figure>
    )
  }
  return null
}
